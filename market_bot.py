import json
import random

# 1. Load the data
with open('prices.json', 'r') as f:
    data = json.load(f)

# 2. Update every item
for name, info in data.items():
    history = info.get("History", [])
    current_price = history[-1] if history else 10
    
    vol = info.get("Volatility", 1)
    p_min = info.get("Min", 1)
    p_max = info.get("Max", 99999)
    
    # Calculate new price
    change = (random.random() * (vol * 2)) - vol
    new_price = round(current_price + change, 2)
    
    # Keep within boundaries
    if new_price < p_min: new_price = p_min
    if new_price > p_max: new_price = p_max
    
    history.append(new_price)
    if len(history) > 50: history.pop(0)
    data[name]["History"] = history

# 3. Save back to file
with open('prices.json', 'w') as f:
    json.dump(data, f, indent=2)
