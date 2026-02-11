const DATA_SOURCE = "./prices.json"; 
let marketData = {};
let currentItem = "";
let chart;
let searchTerm = "";

document.addEventListener('DOMContentLoaded', async () => {
    initChart();
    await fetchData();
    setupCalculator();
    
    // Setup Search
    document.getElementById('watchlist-search').addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        renderWatchlist();
    });

    setInterval(fetchData, 5000); 
});

async function fetchData() {
    try {
        const response = await fetch(`${DATA_SOURCE}?t=${new Date().getTime()}`);
        const data = await response.json();
        processMarketData(data);
    } catch (e) { console.error("Could not load prices.json", e); }
}

function processMarketData(data) {
    marketData = {};
    for (const [name, info] of Object.entries(data)) {
        const history = info.History || [0];
        const currentPrice = history[history.length - 1];
        const original = parseFloat(info.Original) || currentPrice;
        const diff = currentPrice - original;

        marketData[name] = {
            price: currentPrice,
            trend: `${diff >= 0 ? '▲' : '▼'} ${Math.abs(((diff / (original || 1)) * 100)).toFixed(2)}%`,
            color: diff >= 0 ? "text-green-500" : "text-red-500",
            category: info.Category || "Main",
            candles: formatCandles(history)
        };
    }
    if (!currentItem) currentItem = Object.keys(marketData)[0];
    updateUI();
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
                    <span class="font-mono text-sm text-white">${item.price.toFixed(2)}</span>`;
                list.appendChild(div);
            });
        }
    });
}

function updateUI() {
    const item = marketData[currentItem];
    if (!item) return;

    document.getElementById('active-item-name').innerText = currentItem;
    document.getElementById('active-item-price').innerText = item.price.toFixed(2);
    document.getElementById('active-item-trend').innerText = item.trend;
    document.getElementById('active-item-trend').className = `text-sm font-mono mt-1 ${item.color}`;

    if (chart) chart.updateSeries([{ data: item.candles }]);
    renderWatchlist();
    renderTicker();
    updateCalculator();
}

function initChart() {
    const options = {
        series: [{ data: [] }],
        chart: { type: 'candlestick', height: '100%', toolbar: { show: false }, background: 'transparent', foreColor: '#676d7c' },
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
        y: [i > 0 ? history[i-1] : price, price * 1.02, price * 0.98, price]
    }));
}

function renderTicker() {
    const ticker = document.getElementById('ticker');
    const content = Object.keys(marketData).map(k => `
        <span class="mx-4">${k} <span class="${marketData[k].color}">${marketData[k].price.toFixed(2)}</span></span>
    `).join("");
    ticker.innerHTML = `<div class="ticker-content">${content} ${content}</div>`;
}

function setupCalculator() {
    document.getElementById('calc-qty').addEventListener('input', updateCalculator);
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
