const DATA_SOURCE = "prices.json"; 

let marketData = {};
let currentItem = "";
let chart;
let lastPriceHash = ""; 
let searchTerm = "";

document.addEventListener('DOMContentLoaded', async () => {
    initChart();
    await fetchData();
    setupCalculator();
    
    // Search Filter Logic
    const searchInput = document.getElementById('watchlist-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase();
            renderWatchlist();
        });
    }

    setInterval(fetchData, 5000); 
});

async function fetchData() {
    try {
        const response = await fetch(`${DATA_SOURCE}?t=${Date.now()}`);
        if (!response.ok) throw new Error("File not found");
        
        const rawText = await response.text();
        if (rawText === lastPriceHash) return;
        lastPriceHash = rawText;

        processMarketData(JSON.parse(rawText));
    } catch (e) {
        console.error("GitHub Fetch Error:", e);
        const status = document.getElementById('market-status');
        if (status) status.innerText = "● OFFLINE";
    }
}

function processMarketData(data) {
    marketData = {};
    for (const [name, info] of Object.entries(data)) {
        const history = info.History || [0];
        const currentPrice = history[history.length - 1];
        
        // 10-Candle Trend Calculation
        const lookbackIndex = Math.max(0, history.length - 11); 
        const pastPrice = history[lookbackIndex];
        const diff = currentPrice - pastPrice;
        const percent = pastPrice !== 0 ? ((diff / pastPrice) * 100).toFixed(2) : 0;

        marketData[name] = {
            price: currentPrice,
            trend: `${diff >= 0 ? '▲' : '▼'} ${Math.abs(percent)}%`,
            color: diff >= 0 ? "text-green-500" : "text-red-500",
            category: info.Category || "Main",
            candles: formatCandles(history)
        };
    }
    if (!currentItem) currentItem = Object.keys(marketData)[0];
    updateUI();
}

function updateUI() {
    const item = marketData[currentItem];
    if (!item) return;

    document.getElementById('active-item-name').innerText = currentItem;
    document.getElementById('active-item-price').innerText = item.price.toFixed(2);
    document.getElementById('active-item-trend').innerText = item.trend + " (Last 10)";
    document.getElementById('active-item-trend').className = `text-sm font-mono mt-1 ${item.color}`;

    if (chart) {
        chart.updateSeries([{ data: item.candles }]);
        window.dispatchEvent(new Event('resize'));
    }
    renderWatchlist();
    renderTicker();
    updateCalculator();
}

function renderWatchlist() {
    const list = document.getElementById('watchlist');
    if (!list) return;
    list.innerHTML = "";

    const categories = ["Trending", "Main", "Penny Index", "MEME COINS"];
    categories.forEach(cat => {
        const filtered = Object.keys(marketData).filter(name => 
            marketData[name].category === cat && name.toLowerCase().includes(searchTerm)
        );

        if (filtered.length > 0) {
            const header = document.createElement('div');
            header.className = "p-2 bg-[#1e222d] text-[10px] font-bold text-blue-400 uppercase tracking-widest sticky top-0 border-y border-[#2a2e39] z-10";
            header.innerText = cat;
            list.appendChild(header);

            filtered.forEach(name => {
                const item = marketData[name];
                const div = document.createElement('div');
                div.className = `watchlist-item p-4 flex justify-between cursor-pointer ${name === currentItem ? 'active' : ''}`;
                div.onclick = () => { currentItem = name; updateUI(); };
                div.innerHTML = `
                    <div class="flex flex-col">
                        <span class="font-bold text-white text-xs uppercase">${name}</span>
                        <span class="text-[9px] font-mono ${item.color}">${item.trend}</span>
                    </div>
                    <span class="font-mono text-sm text-white">${item.price.toFixed(2)}</span>
                `;
                list.appendChild(div);
            });
        }
    });
}

function initChart() {
    const options = {
        series: [{ data: [] }],
        chart: { 
            type: 'candlestick', height: '100%', toolbar: { show: false }, 
            background: 'transparent', foreColor: '#676d7c'
        },
        xaxis: { type: 'datetime' },
        plotOptions: { candlestick: { colors: { upward: '#089981', downward: '#f23645' } } },
        grid: { borderColor: '#1e222d' }
    };
    chart = new ApexCharts(document.querySelector("#main-chart"), options);
    chart.render();
}

function formatCandles(history) {
    return history.map((price, i) => ({
        x: new Date(Date.now() - (history.length - i) * 3600000),
        y: [i > 0 ? history[i-1] : price, price * 1.01, price * 0.99, price]
    }));
}

function renderTicker() {
    const ticker = document.getElementById('ticker');
    if (!ticker) return;
    const content = Object.keys(marketData).map(k => `
        <span class="mx-4">${k} <span class="${marketData[k].color}">${marketData[k].price.toFixed(2)}</span></span>
    `).join("");
    ticker.innerHTML = `<div class="ticker-content">${content} ${content}</div>`;
}

function setupCalculator() {
    const input = document.getElementById('calc-qty');
    if (input) input.addEventListener('input', updateCalculator);
}

function updateCalculator() {
    const qty = document.getElementById('calc-qty').value || 0;
    const price = marketData[currentItem]?.price || 0;
    document.getElementById('calc-total').innerText = (qty * price).toFixed(2);
}

function copyText(text) {
    navigator.clipboard.writeText(text);
    alert("Copied: " + text);
}
