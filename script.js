const DATA_SOURCE = "./prices.json"; 
let marketData = {};
let currentItem = "";
let chart;

document.addEventListener('DOMContentLoaded', async () => {
    initChart();
    await fetchData(); // Initial load
    
    // Check GitHub for "Real" updates every 10 seconds
    // It will only move if the GitHub Bot has saved a new file
    setInterval(fetchData, 10000); 
});

async function fetchData() {
    try {
        // The ?t= timestamp forces the browser to ignore the cache
        const response = await fetch(`${DATA_SOURCE}?t=${Date.now()}`);
        const data = await response.json();
        processMarketData(data);
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

function processMarketData(data) {
    for (const [name, info] of Object.entries(data)) {
        const history = info.History || [0];
        marketData[name] = {
            price: history[history.length - 1],
            original: parseFloat(info.Original) || history[0],
            history: history,
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
            x: new Date(Date.now() - (historyArray.length - index) * 300000), // 5m intervals
            y: [prevPrice, Math.max(prevPrice, price) * 1.01, Math.min(prevPrice, price) * 0.99, price]
        };
    });
}

function updateUI() {
    const item = marketData[currentItem];
    if (!item || !chart) return;

    document.getElementById('active-item-name').innerText = currentItem;
    document.getElementById('active-item-price').innerText = item.price.toFixed(2);
    
    chart.updateSeries([{ data: item.candles }], true);
}

function initChart() {
    const options = {
        series: [{ data: [] }],
        chart: { type: 'candlestick', height: '100%', toolbar: { show: false }, background: 'transparent' },
        xaxis: { type: 'datetime' },
        plotOptions: { candlestick: { colors: { upward: '#089981', downward: '#f23645' } } }
    };
    chart = new ApexCharts(document.querySelector("#main-chart"), options);
    chart.render();
}


