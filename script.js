const DATA_SOURCE = "./prices.json"; 

let marketData = {};
let currentItem = "";
let chart;
let lastPriceHash = ""; 

document.addEventListener('DOMContentLoaded', async () => {
    initChart();
    await fetchData();
    setupCalculator();
    setInterval(fetchData, 5000); 
});

async function fetchData() {
    try {
        const response = await fetch(`${DATA_SOURCE}?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error("File not found");
        
        const rawText = await response.text();
        
        if (rawText === lastPriceHash) return;
        lastPriceHash = rawText;

        const data = JSON.parse(rawText);
        processMarketData(data);
    } catch (e) {
        console.error("Error loading prices.json. Check for typos/commas!", e);
    }
}

function processMarketData(data) {
    marketData = {};

    for (const [name, info] of Object.entries(data)) {
        const history = info.History || [0];
        const currentPrice = history[history.length - 1];
        const original = parseFloat(info.Original) || currentPrice;
        
        const diff = currentPrice - original;
        const percent = original !== 0 ? ((diff / original) * 100).toFixed(2) : 0;

        marketData[name] = {
            price: currentPrice,
            trend: `${diff >= 0 ? '▲' : '▼'} ${Math.abs(percent)}%`,
            color: diff >= 0 ? "text-green-500" : "text-red-500",
            category: info.Category || "Main", // Store category
            candles: formatCandles(history)
        };
    }

    if (!currentItem) currentItem = Object.keys(marketData)[0];
    updateUI();
}

function formatCandles(historyArray) {
    return historyArray.map((price, index) => {
        const prevPrice = index > 0 ? historyArray[index - 1] : price;
        return {
            x: new Date(Date.now() - (historyArray.length - index) * 3600000),
            y: [prevPrice, Math.max(prevPrice, price) + (price * 0.05), Math.min(prevPrice, price) - (price * 0.05), price]
        };
    });
}

function updateUI() {
    const item = marketData[currentItem];
    if (!item) return;

    document.getElementById('active-item-name').innerText = currentItem;
    document.getElementById('active-item-price').innerText = item.price.toFixed(2);
    document.getElementById('active-item-trend').innerText = item.trend;
    document.getElementById('active-item-trend').className = `text-sm font-mono mt-1 ${item.color}`;

    if (chart) {
        chart.updateSeries([{ data: item.candles }]);
    }
    
    renderWatchlist();
    renderTicker();
    updateCalculator();
}

function renderWatchlist() {
    const list = document.getElementById('watchlist');
    if (!list) return;
    list.innerHTML = "";

    // Categories in display order
    const categories = ["Main", "Penny Index"];

    categories.forEach(cat => {
        // Add Sticky Category Header
        const header = document.createElement('div');
        header.className = "p-2 bg-[#1e222d] text-[10px] font-bold text-blue-400 uppercase tracking-widest sticky top-0 border-y border-[#2a2e39] z-10";
        header.innerText = cat;
        list.appendChild(header);

        Object.keys(marketData).forEach(name => {
            const item = marketData[name];
            if (item.category === cat) {
                const div = document.createElement('div');
                div.className = `watchlist-item p-4 flex justify-between cursor-pointer border-b border-[#1e222d] ${name === currentItem ? 'active bg-[#1e222d] border-l-4 border-l-blue-500' : ''}`;
                div.onclick = () => { 
                    currentItem = name; 
                    updateUI(); 
                };
                div.innerHTML = `
                    <div class="flex flex-col">
                        <span class="font-bold text-white text-xs uppercase">${name}</span>
                        <span class="text-[9px] font-mono ${item.color}">${item.trend}</span>
                    </div>
                    <span class="font-mono text-sm text-white">${item.price.toFixed(2)}</span>
                `;
                list.appendChild(div);
            }
        });
    });
}

function initChart() {
    const options = {
        series: [{ data: [] }],
        chart: { 
            type: 'candlestick', 
            height: '100%', 
            toolbar: { show: false }, 
            background: 'transparent', 
            foreColor: '#676d7c',
            animations: { enabled: true, easing: 'easeinout', speed: 800 }
        },
        xaxis: { type: 'datetime' },
        plotOptions: { candlestick: { colors: { upward: '#089981', downward: '#f23645' } } },
        grid: { borderColor: '#1e222d' }
    };
    chart = new ApexCharts(document.querySelector("#main-chart"), options);
    chart.render();
}

function renderTicker() {
    const ticker = document.getElementById('ticker');
    if (!ticker) return;
    const content = Object.keys(marketData).map(k => `
        <span class="mx-4">${k} <span class="${marketData[k].color}">${marketData[k].price.toFixed(2)}</span></span>
    `).join("");
    ticker.innerHTML = `<div class="ticker-content">${content} ${content}</div>`;
}

function updateCalculator() {
    const qty = document.getElementById('calc-qty').value || 0;
    const price = marketData[currentItem]?.price || 0;
    document.getElementById('calc-total').innerText = (qty * price).toFixed(2);
}

function setupCalculator() {
    document.getElementById('calc-qty').addEventListener('input', updateCalculator);
}