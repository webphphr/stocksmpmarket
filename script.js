const DATA_SOURCE = "./prices.json"; 

let marketData = {};
let currentItem = "";
let chart;
let lastPriceHash = ""; 

document.addEventListener('DOMContentLoaded', async () => {
    initChart();
    await fetchData();
    setupCalculator();
    
    // Check for updates from the JSON file every 5 seconds
    setInterval(fetchData, 5000); 
    
    // Run the RANDOM PRICE ALGO every 5 minutes
    setInterval(simulateMarketMovement, 30000); 
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
        console.error("Error loading prices.json", e);
    }
}

function processMarketData(data) {
    // We only want to initialize marketData once from the JSON, 
    // then let the Algo take over unless the JSON file actually changes.
    for (const [name, info] of Object.entries(data)) {
        const history = info.History || [0];
        const currentPrice = history[history.length - 1];
        
        marketData[name] = {
            price: currentPrice,
            original: parseFloat(info.Original) || currentPrice,
            category: info.Category || "Main",
            min: info.Min || 0,
            max: info.Max || 999999,
            volatility: info.Volatility || 1,
            history: [...history],
            candles: formatCandles(history)
        };
    }

    if (!currentItem) currentItem = Object.keys(marketData)[0];
    updateUI();
}

function simulateMarketMovement() {
    Object.keys(marketData).forEach(name => {
        const item = marketData[name];
        
        // The Algo: Random wiggle based on volatility
        const change = (Math.random() * (item.volatility * 2)) - item.volatility;
        let newPrice = item.price + change;

        // Force price to stay between your set Min and Max
        if (newPrice < item.min) newPrice = item.min;
        if (newPrice > item.max) newPrice = item.max;

        item.price = newPrice;
        item.history.push(newPrice);
        
        // Keep the chart from getting too laggy (keep last 50 points)
        if (item.history.length > 50) item.history.shift();
        
        item.candles = formatCandles(item.history);
    });
    updateUI();
}

function formatCandles(historyArray) {
    return historyArray.map((price, index) => {
        const prevPrice = index > 0 ? historyArray[index - 1] : price;
        return {
            x: new Date(Date.now() - (historyArray.length - index) * 3600000),
            y: [prevPrice, Math.max(prevPrice, price) * 1.02, Math.min(prevPrice, price) * 0.98, price]
        };
    });
}

function updateUI() {
    const item = marketData[currentItem];
    if (!item || !chart) return;

    // Update Header
    document.getElementById('active-item-name').innerText = currentItem;
    document.getElementById('active-item-price').innerText = item.price.toFixed(2);
    
    // Calculate Trend
    const diff = item.price - item.original;
    const percent = ((diff / item.original) * 100).toFixed(2);
    const colorClass = diff >= 0 ? "text-green-500" : "text-red-500";
    
    const trendEl = document.getElementById('active-item-trend');
    trendEl.innerText = `${diff >= 0 ? '▲' : '▼'} ${Math.abs(percent)}%`;
    trendEl.className = `text-sm font-mono mt-1 ${colorClass}`;

    // IMPORTANT: This pushes the data to the chart library
    chart.updateSeries([{ data: item.candles }], true);
    
    renderWatchlist();
    renderTicker();
    updateCalculator();
}

function renderWatchlist() {
    const list = document.getElementById('watchlist');
    if (!list) return;
    list.innerHTML = "";

    const categories = ["Main", "Trending", "Penny Index"];

    categories.forEach(cat => {
        const header = document.createElement('div');
        header.className = "p-2 bg-[#1e222d] text-[10px] font-bold text-blue-400 uppercase sticky top-0 border-y border-[#2a2e39] z-10";
        header.innerText = cat;
        list.appendChild(header);

        Object.keys(marketData).forEach(name => {
            const item = marketData[name];
            if (item.category === cat) {
                const diff = item.price - item.original;
                const color = diff >= 0 ? "text-green-500" : "text-red-500";
                
                const div = document.createElement('div');
                div.className = `watchlist-item p-4 flex justify-between cursor-pointer border-b border-[#1e222d] ${name === currentItem ? 'bg-[#1e222d] border-l-4 border-l-blue-500' : ''}`;
                div.onclick = () => { currentItem = name; updateUI(); };
                div.innerHTML = `
                    <div class="flex flex-col">
                        <span class="font-bold text-white text-xs uppercase">${name}</span>
                        <span class="text-[9px] font-mono ${color}">${(diff >= 0 ? '+' : '') + ((diff/item.original)*100).toFixed(2)}%</span>
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
            animations: { enabled: false } // Disabled for smoother manual updates
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
    const content = Object.keys(marketData).map(k => {
        const diff = marketData[k].price - marketData[k].original;
        const color = diff >= 0 ? "text-green-500" : "text-red-500";
        return `<span class="mx-4">${k} <span class="${color}">${marketData[k].price.toFixed(2)}</span></span>`;
    }).join("");
    ticker.innerHTML = `<div class="ticker-content">${content} ${content}</div>`;
}

function updateCalculator() {
    const qty = document.getElementById('calc-qty').value || 0;
    const price = marketData[currentItem]?.price || 0;
    document.getElementById('calc-total').innerText = (qty * price).toFixed(2);
}

function setupCalculator() {
    const calcInput = document.getElementById('calc-qty');
    if(calcInput) calcInput.addEventListener('input', updateCalculator);
}
