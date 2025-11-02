document.addEventListener("DOMContentLoaded", function () {
  const apiUrlBase =
    "https://api.gateio.ws/api/v4/futures/usdt/tickers?contract=";
  let previousPrices = {};
  let priceUpdateInterval; // 用于存储 setInterval 的 ID，方便后续清除和重设

  // DOM Elements for settings - 统一获取DOM元素
  const elements = {
    settingsButton: document.getElementById('settings-button'),
    settingsModal: document.getElementById('settings-modal'),
    closeSettingsModalButton: document.getElementById('close-settings-modal'),
    displayCountSelect: document.getElementById('display-count'),
    coinSettingsContainer: document.getElementById('coin-settings-container'),
    addCoinButton: document.getElementById('add-coin-button'),
    refreshIntervalInput: document.getElementById('refresh-interval'),
    saveSettingsButton: document.getElementById('save-settings-button'),
    resetSettingsButton: document.getElementById('reset-settings-button'),
    tradingMottoSelect: document.getElementById('trading-motto-select'),
    tradingMottoCustomInput: document.getElementById('trading-motto-custom'),
    profitElement: document.getElementById('profit'),
    priceFontSizeInput: document.getElementById('price-font-size'),
    bigModeFontSizeInput: document.getElementById('big-mode-font-size'),
    bigModeButton: document.getElementById('big-mode-button'),
    exitBigModeButton: document.getElementById('exit-big-mode-button')
  };

  const defaultSettings = {
    displayCount: 4,
    coins: [
      { order: 1, name: "BTC", precision: 0, dataSource: "gate" },
      { order: 2, name: "ETH", precision: 2, dataSource: "gate" },
      { order: 3, name: "SOL", precision: 2, dataSource: "gate" },
      { order: 4, name: "BNB", precision: 2, dataSource: "gate" },
    ],
    refreshInterval: 5000,
    tradingMotto: "",
    priceFontSize: 130,
    bigModePriceFontSize: 222,
  };

  let currentSettings = JSON.parse(JSON.stringify(defaultSettings)); // 深拷贝

  // --- Settings Modal Logic ---
  function openSettingsModal() {
    if (elements.settingsModal) elements.settingsModal.style.display = 'block';
    loadSettingsToUI(); // 打开时加载当前配置到UI
  }

  function closeSettingsModal() {
    if (elements.settingsModal) elements.settingsModal.style.display = 'none';
  }

  if (elements.settingsButton) elements.settingsButton.addEventListener('click', openSettingsModal);
  if (elements.closeSettingsModalButton) elements.closeSettingsModalButton.addEventListener('click', closeSettingsModal);

  // --- Coin Settings Management ---
  function createCoinSettingItem(coin = { name: '', precision: 2, dataSource: 'gate' }, order = 1) {
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('coin-setting-item');

    const orderDisplay = document.createElement('span');
    orderDisplay.classList.add('coin-order-display');
    orderDisplay.textContent = order;

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.classList.add('coin-name', 'form-control');
    nameInput.placeholder = '名称 (例如 BTC)';
    nameInput.value = coin.name;

    const precisionInput = document.createElement('input');
    precisionInput.type = 'number';
    precisionInput.classList.add('coin-precision', 'form-control');
    precisionInput.placeholder = '精度';
    precisionInput.value = coin.precision;
    precisionInput.min = 0;

    const dataSourceSelect = document.createElement('select');
    dataSourceSelect.classList.add('coin-data-source', 'form-control');
    
    const gateOption = document.createElement('option');
    gateOption.value = 'gate';
    gateOption.textContent = 'Gate.io';
    if (coin.dataSource === 'gate' || !coin.dataSource) {
      gateOption.selected = true;
    }
    
    const bybitOption = document.createElement('option');
    bybitOption.value = 'bybit';
    bybitOption.textContent = 'Bybit';
    if (coin.dataSource === 'bybit') {
      bybitOption.selected = true;
    }
    
    dataSourceSelect.appendChild(gateOption);
    dataSourceSelect.appendChild(bybitOption);
    
    const removeButton = document.createElement('button');
    removeButton.classList.add('remove-coin-button');
    removeButton.textContent = '移除';
    removeButton.addEventListener('click', function() {
      itemDiv.remove();
      updateCoinOrders();
    });

    itemDiv.appendChild(orderDisplay);
    itemDiv.appendChild(nameInput);
    itemDiv.appendChild(precisionInput);
    itemDiv.appendChild(dataSourceSelect);
    itemDiv.appendChild(removeButton);
    return itemDiv;
  }

  function addCoinSetting(coin) {
    const itemCount = elements.coinSettingsContainer.children.length;
    const newItem = createCoinSettingItem(coin, itemCount + 1);
    elements.coinSettingsContainer.appendChild(newItem);
  }

  function updateCoinOrders() {
    const items = elements.coinSettingsContainer.querySelectorAll('.coin-setting-item');
    items.forEach((item, index) => {
      const orderDisplay = item.querySelector('.coin-order-display');
      if (orderDisplay) orderDisplay.textContent = index + 1;
    });
  }

  if (elements.addCoinButton) {
    elements.addCoinButton.addEventListener('click', () => addCoinSetting());
  }
  
  // --- Trading Motto Logic ---
  if (elements.tradingMottoSelect) {
    elements.tradingMottoSelect.addEventListener('change', function() {
      if (this.value === 'custom') {
        elements.tradingMottoCustomInput.style.display = 'block';
        elements.tradingMottoCustomInput.focus();
      } else {
        elements.tradingMottoCustomInput.style.display = 'none';
      }
    });
  }

  // --- Settings Persistence (Load/Save/Reset) ---
  function adjustCoinSettingsToDisplayCount(targetCount) {
    const currentItemCount = elements.coinSettingsContainer.children.length;
    if (currentItemCount > targetCount) {
      for (let i = currentItemCount; i > targetCount; i--) {
        elements.coinSettingsContainer.lastChild.remove();
      }
    } else if (currentItemCount < targetCount) {
      for (let i = currentItemCount; i < targetCount; i++) {
        // Create a new empty coin object or with defaults for adding
        const defaultCoinForNewRow = { name: '', precision: 2, dataSource: 'gate' }; 
        addCoinSetting(defaultCoinForNewRow);
      }
    }
    updateCoinOrders(); // Re-number the order inputs
  }

  if (elements.displayCountSelect) {
    elements.displayCountSelect.addEventListener('change', function() {
      const selectedCount = parseInt(this.value, 10);
      // Ensure that the display count change also potentially adjusts the number of coin setting rows.
      adjustCoinSettingsToDisplayCount(selectedCount);
    });
  }

  // Function to apply font sizes to price elements
  function applyCurrentFontSizes() {
    const priceElements = document.querySelectorAll('.box h1[id$="-price"]');
    let fontSizeToApply;

    if (document.body.classList.contains('big-mode')) {
      fontSizeToApply = currentSettings.bigModePriceFontSize || defaultSettings.bigModePriceFontSize;
    } else {
      fontSizeToApply = currentSettings.priceFontSize || defaultSettings.priceFontSize;
    }

    priceElements.forEach(el => {
      el.style.fontSize = `${fontSizeToApply}px`;
    });
  }

  function loadSettingsToUI() {
    elements.displayCountSelect.value = currentSettings.displayCount;
    // 如果刷新间隔是毫秒，转换为秒；如果已经是秒，直接使用
    const intervalInSeconds = currentSettings.refreshInterval >= 1000 
      ? (currentSettings.refreshInterval / 1000).toFixed(1) 
      : currentSettings.refreshInterval;
    elements.refreshIntervalInput.value = intervalInSeconds;
    elements.priceFontSizeInput.value = currentSettings.priceFontSize || defaultSettings.priceFontSize;
    elements.bigModeFontSizeInput.value = currentSettings.bigModePriceFontSize || defaultSettings.bigModePriceFontSize;

    // Load Trading Motto
    if (elements.tradingMottoSelect) {
      const motto = currentSettings.tradingMotto || defaultSettings.tradingMotto;
      // Check if the motto is one of the predefined options
      let isPredefined = false;
      for (let i = 0; i < elements.tradingMottoSelect.options.length; i++) {
        if (elements.tradingMottoSelect.options[i].value === motto) {
          isPredefined = true;
          break;
        }
      }
      if (isPredefined && motto !== 'custom') {
        elements.tradingMottoSelect.value = motto;
        elements.tradingMottoCustomInput.style.display = 'none';
        elements.tradingMottoCustomInput.value = '';
      } else if (motto === '') { // Handle empty string for "留空"
        elements.tradingMottoSelect.value = '';
        elements.tradingMottoCustomInput.style.display = 'none';
        elements.tradingMottoCustomInput.value = '';
      }else {
        elements.tradingMottoSelect.value = 'custom';
        elements.tradingMottoCustomInput.style.display = 'block';
        elements.tradingMottoCustomInput.value = motto;
      }
    }
    
    elements.coinSettingsContainer.innerHTML = ''; 
    let coinsToLoad = [...currentSettings.coins];
    coinsToLoad.sort((a, b) => a.order - b.order).forEach(coin => {
      addCoinSetting(coin);
    });

    adjustCoinSettingsToDisplayCount(parseInt(elements.displayCountSelect.value, 10));
    updateCoinOrders(); 
  }

  function saveSettingsFromUI() {
    const newDisplayCount = parseInt(elements.displayCountSelect.value, 10);
    // 如果输入的值小于1000，认为是秒，需要转换为毫秒；否则认为是毫秒
    const inputValue = parseFloat(elements.refreshIntervalInput.value);
    const newRefreshInterval = inputValue < 1000 ? inputValue * 1000 : inputValue;
    const newPriceFontSize = parseInt(elements.priceFontSizeInput.value, 10) || defaultSettings.priceFontSize;
    const newBigModePriceFontSize = parseInt(elements.bigModeFontSizeInput.value, 10) || defaultSettings.bigModePriceFontSize;

    let newTradingMotto = '';
    if (elements.tradingMottoSelect) {
      if (elements.tradingMottoSelect.value === 'custom') {
        newTradingMotto = elements.tradingMottoCustomInput.value.trim();
      } else {
        newTradingMotto = elements.tradingMottoSelect.value;
      }
    }

    const coinItems = elements.coinSettingsContainer.querySelectorAll('.coin-setting-item');
    const newCoins = [];
    coinItems.forEach((item, index) => {
      const order = index + 1;
      const name = item.querySelector('.coin-name').value.trim().toUpperCase();
      const precision = parseInt(item.querySelector('.coin-precision').value, 10);
      const dataSourceSelect = item.querySelector('.coin-data-source');
      const dataSource = dataSourceSelect ? dataSourceSelect.value : 'gate';
      if (name) { 
        newCoins.push({ order, name, precision, dataSource });
      }
    });

    currentSettings = {
      displayCount: newDisplayCount,
      coins: newCoins,
      refreshInterval: newRefreshInterval >= 500 ? newRefreshInterval : 500, // 保持毫秒验证
      tradingMotto: newTradingMotto,
      priceFontSize: newPriceFontSize,
      bigModePriceFontSize: newBigModePriceFontSize,
    };
    localStorage.setItem('cryptoMonitorSettings', JSON.stringify(currentSettings));
    alert('配置已保存！部分更改可能需要刷新页面才能完全生效。');
    applySettings(); 
    closeSettingsModal();
  }
  
  function resetToDefaults() {
    if (confirm('确定要恢复默认配置吗？所有自定义设置将会丢失。')) {
      currentSettings = JSON.parse(JSON.stringify(defaultSettings)); 
      localStorage.removeItem('cryptoMonitorSettings');
      alert('已恢复默认配置。');
      applySettings(); 
      if (elements.settingsModal && elements.settingsModal.style.display === 'block') {
        loadSettingsToUI(); 
      }
    }
  }

  if (elements.saveSettingsButton) elements.saveSettingsButton.addEventListener('click', saveSettingsFromUI);
  if (elements.resetSettingsButton) elements.resetSettingsButton.addEventListener('click', resetToDefaults);

  function loadInitialSettings() {
    const savedSettings = localStorage.getItem('cryptoMonitorSettings');
    if (savedSettings) {
      currentSettings = JSON.parse(savedSettings);
      currentSettings.displayCount = currentSettings.displayCount || defaultSettings.displayCount;
      currentSettings.coins = currentSettings.coins && currentSettings.coins.length > 0 ? currentSettings.coins : defaultSettings.coins;
      currentSettings.refreshInterval = currentSettings.refreshInterval || defaultSettings.refreshInterval;
      currentSettings.tradingMotto = currentSettings.tradingMotto !== undefined ? currentSettings.tradingMotto : defaultSettings.tradingMotto;
      currentSettings.priceFontSize = currentSettings.priceFontSize || defaultSettings.priceFontSize;
      currentSettings.bigModePriceFontSize = currentSettings.bigModePriceFontSize || defaultSettings.bigModePriceFontSize;
      // 确保每个币种都有数据源字段
      currentSettings.coins.forEach(coin => {
        if (!coin.dataSource) {
          coin.dataSource = 'gate';
        }
      });
      currentSettings.coins.sort((a, b) => a.order - b.order);
      // Ensure display count from settings doesn't exceed new max of 4
      if (currentSettings.displayCount > 4) {
        currentSettings.displayCount = 4;
      }
    } else {
      currentSettings = JSON.parse(JSON.stringify(defaultSettings)); 
    }
  }
  
  // --- Apply Settings and Update Display ---
  function applySettings() {
    if (elements.profitElement) {
      elements.profitElement.textContent = currentSettings.tradingMotto !== undefined ? currentSettings.tradingMotto : defaultSettings.tradingMotto;
    }

    updateDisplayBoxes();
    applyCurrentFontSizes();

    previousPrices = {};
    currentSettings.coins.forEach(coin => {
      previousPrices[coin.name] = null;
    });

    if (priceUpdateInterval) {
      clearInterval(priceUpdateInterval);
    }
    updatePrices();
    priceUpdateInterval = setInterval(updatePrices, currentSettings.refreshInterval);

    if (elements.settingsModal && elements.settingsModal.style.display === 'block') {
        loadSettingsToUI();
    }
  }

  function updateDisplayBoxes() {
    const container = document.querySelector('.container');
    const count = parseInt(currentSettings.displayCount, 10); 
    
    container.innerHTML = '';
    
    const coinsToDisplay = currentSettings.coins.slice(0, count);

    coinsToDisplay.forEach(coin => {
      const boxDiv = document.createElement('div');
      boxDiv.classList.add('box');
      boxDiv.id = coin.name.toLowerCase();

      const h1 = document.createElement('h1');
      h1.id = `${coin.name.toLowerCase()}-price`;
      h1.textContent = 'Loading...';

      const h2 = document.createElement('h2');
      h2.textContent = coin.name;

      boxDiv.appendChild(h1);
      boxDiv.appendChild(h2);
      container.appendChild(boxDiv);
    });

    if (count === 1) {
        container.style.gridTemplateColumns = '1fr';
    } else if (count === 4) {
        container.style.gridTemplateColumns = 'repeat(2, 1fr)';
    } else if (count === 9) {
        container.style.gridTemplateColumns = 'repeat(3, 1fr)';
    } else { 
        container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(150px, 1fr))';
    }
    applyCurrentFontSizes();
  }

  function updateDateTime() {
    try {
      const now = new Date();
      const dateString = now.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const timeString = now.toLocaleTimeString("zh-CN", {
        hour12: false,
      });

      const dateElement = document.getElementById("current-date");
      const timeElement = document.getElementById("current-time");

      if (dateElement) dateElement.textContent = dateString;
      if (timeElement) timeElement.textContent = timeString;
    } catch (error) {
      console.error("Error updating date/time:", error);
    }
  }

  setInterval(updateDateTime, 1000);
  updateDateTime();

  async function fetchPrice(symbol, dataSource = 'gate') {
    try {
      let url, price;
      
      if (dataSource === 'bybit') {
        // Bybit API: https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}USDT
        url = `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}USDT`;
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`Error fetching price for ${symbol} from Bybit: ${response.status} ${response.statusText}`);
          return null;
        }
        const data = await response.json();
        
        if (data.retCode === 0 && data.result && data.result.list && data.result.list.length > 0) {
          const ticker = data.result.list[0];
          price = parseFloat(ticker.lastPrice);
          if (isNaN(price)) {
            console.warn(`Invalid price data for ${symbol} from Bybit:`, ticker);
            return null;
          }
          return price;
        } else {
          console.warn(`No price data found for ${symbol} in Bybit API response:`, data);
          return null;
        }
      } else {
        // Gate.io API (默认)
        url = `${apiUrlBase}${symbol}_USDT`;
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`Error fetching price for ${symbol} from Gate.io: ${response.status} ${response.statusText}`);
          return null;
        }
        const data = await response.json();
        
        // Gate.io API 返回数组格式，检查是否有数据
        if (!Array.isArray(data) || data.length === 0) {
          console.warn(`No price data found for ${symbol} in Gate.io API response:`, data);
          return null;
        }
        
        const tickerData = data[0];
        if (!tickerData || tickerData.last === undefined) {
          console.warn(`Price data not found for ${symbol} in Gate.io API response:`, tickerData);
          return null;
        }
        
        return parseFloat(tickerData.last);
      }
    } catch (error) {
      console.error(`Error fetching price for ${symbol} from ${dataSource}:`, error);
      return null;
    }
  }

  function getPriceClass(symbol, currentPrice) {
    const previousPrice = previousPrices[symbol.toUpperCase()];
    if (previousPrice === null || previousPrice === undefined) return "";
    if (currentPrice > previousPrice) return "positive";
    if (currentPrice < previousPrice) return "negative";
    return "";
  }

  async function updatePrices() {
    try {
      const activeCoins = currentSettings.coins.slice(0, currentSettings.displayCount);
      if (activeCoins.length === 0) {
        document.title = "Crypto Monitor";
        return;
      }

      const pricePromises = activeCoins.map(coin => fetchPrice(coin.name, coin.dataSource || 'gate'));
      const prices = await Promise.all(pricePromises);

      let titlePrices = [];

      activeCoins.forEach((coin, index) => {
        const price = prices[index];
        const priceElement = document.getElementById(`${coin.name.toLowerCase()}-price`);
        
        if (priceElement) {
          if (price !== null) {
            const formattedPrice = price.toFixed(coin.precision);
            priceElement.textContent = formattedPrice;
            titlePrices.push(formattedPrice);

            const priceClass = getPriceClass(coin.name, price);
            priceElement.className = "";
            if (priceClass) priceElement.classList.add(priceClass);
            
            previousPrices[coin.name.toUpperCase()] = price;
          } else {
            priceElement.textContent = "Error";
            previousPrices[coin.name.toUpperCase()] = null;
          }
        }
      });

      if (titlePrices.length > 0) {
        document.title = titlePrices.join(' ');
      } else if (activeCoins.length > 0 && titlePrices.length === 0) {
        document.title = "Error fetching prices";
      } else {
        document.title = "Crypto Monitor";
      }

    } catch (error) {
      console.error("Error updating prices:", error);
      document.title = "Update Error";
    }
  }

  loadInitialSettings();
  applySettings();

  if (elements.bigModeButton && elements.exitBigModeButton) {
    elements.bigModeButton.addEventListener('click', function() {
      document.body.classList.add('big-mode');
      elements.bigModeButton.style.display = 'none';
      elements.exitBigModeButton.style.display = 'inline-block';
      applyCurrentFontSizes();
    });

    elements.exitBigModeButton.addEventListener('click', function() {
      document.body.classList.remove('big-mode');
      elements.exitBigModeButton.style.display = 'none';
      elements.bigModeButton.style.display = 'inline-block';
      applyCurrentFontSizes();
    });
  }
}); 
