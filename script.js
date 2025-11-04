document.addEventListener("DOMContentLoaded", function () {
  // 统一价格API服务
  const API_BASE_URL = "http://165.154.199.12:3000";
  const API_ENDPOINT = "/api/price";
  
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
    refreshIntervalCustomInput: document.getElementById('refresh-interval-custom'),
    saveSettingsButton: document.getElementById('save-settings-button'),
    resetSettingsButton: document.getElementById('reset-settings-button'),
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
    refreshInterval: 20000, // 20秒，单位毫秒
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

    const binanceOption = document.createElement('option');
    binanceOption.value = 'binance';
    binanceOption.textContent = 'Binance';
    if (coin.dataSource === 'binance') {
      binanceOption.selected = true;
    }
    
    const bitgetOption = document.createElement('option');
    bitgetOption.value = 'bitget';
    bitgetOption.textContent = 'Bitget';
    if (coin.dataSource === 'bitget') {
      bitgetOption.selected = true;
    }
    
    dataSourceSelect.appendChild(gateOption);
    dataSourceSelect.appendChild(bybitOption);
    dataSourceSelect.appendChild(binanceOption);
    dataSourceSelect.appendChild(bitgetOption);
    
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

  // 处理刷新间隔下拉框变化，显示/隐藏自定义输入框
  if (elements.refreshIntervalInput) {
    elements.refreshIntervalInput.addEventListener('change', function() {
      if (this.value === 'custom') {
        if (elements.refreshIntervalCustomInput) {
          elements.refreshIntervalCustomInput.style.display = 'block';
          elements.refreshIntervalCustomInput.focus();
        }
      } else {
        if (elements.refreshIntervalCustomInput) {
          elements.refreshIntervalCustomInput.style.display = 'none';
        }
      }
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
      ? (currentSettings.refreshInterval / 1000) 
      : currentSettings.refreshInterval;
    // 转换为整数并匹配下拉选项
    const intervalValue = Math.round(intervalInSeconds);
    if (intervalValue === 5 || intervalValue === 20 || intervalValue === 60) {
      elements.refreshIntervalInput.value = intervalValue;
      if (elements.refreshIntervalCustomInput) {
        elements.refreshIntervalCustomInput.style.display = 'none';
      }
    } else {
      // 如果不在选项中，使用自定义
      elements.refreshIntervalInput.value = 'custom';
      if (elements.refreshIntervalCustomInput) {
        elements.refreshIntervalCustomInput.value = intervalValue;
        elements.refreshIntervalCustomInput.style.display = 'block';
      }
    }
    elements.priceFontSizeInput.value = currentSettings.priceFontSize || defaultSettings.priceFontSize;
    elements.bigModeFontSizeInput.value = currentSettings.bigModePriceFontSize || defaultSettings.bigModePriceFontSize;
    
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
    // 下拉框的值，如果是自定义则从自定义输入框获取，否则从下拉框获取
    let intervalInSeconds;
    if (elements.refreshIntervalInput.value === 'custom') {
      intervalInSeconds = parseInt(elements.refreshIntervalCustomInput.value, 10);
      if (isNaN(intervalInSeconds) || intervalInSeconds < 1) {
        alert('自定义刷新间隔必须大于等于1秒');
        return;
      }
    } else {
      intervalInSeconds = parseInt(elements.refreshIntervalInput.value, 10);
    }
    const newRefreshInterval = intervalInSeconds * 1000;
    const newPriceFontSize = parseInt(elements.priceFontSizeInput.value, 10) || defaultSettings.priceFontSize;
    const newBigModePriceFontSize = parseInt(elements.bigModeFontSizeInput.value, 10) || defaultSettings.bigModePriceFontSize;

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
      refreshInterval: newRefreshInterval >= 1000 ? newRefreshInterval : 1000, // 最低1秒
      priceFontSize: newPriceFontSize,
      bigModePriceFontSize: newBigModePriceFontSize,
    };
    localStorage.setItem('cryptoMonitorSettings', JSON.stringify(currentSettings));
    // 静默保存并立即刷新页面
    window.location.reload();
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

  /**
   * 将内部数据源名称映射为API支持的交易所名称
   * @param {string} dataSource - 内部数据源名称 (gate, bybit, binance, bitget)
   * @returns {string} - API交易所名称 (gateio, bybit, binance, bitget)
   */
  function mapDataSourceToExchange(dataSource) {
    const mapping = {
      'gate': 'gateio',
      'bybit': 'bybit',
      'binance': 'binance',
      'bitget': 'bitget'
    };
    return mapping[dataSource] || 'gateio'; // 默认使用 gateio
  }

  /**
   * 从统一价格API获取价格
   * @param {string} symbol - 币种符号 (如 btc, eth)
   * @param {string} dataSource - 数据源名称 (gate, bybit, binance, bitget)
   * @returns {Promise<number|null>} - 价格数值，失败返回 null
   */
  async function fetchPrice(symbol, dataSource = 'gate') {
    try {
      // 映射数据源名称
      const exchange = mapDataSourceToExchange(dataSource);
      
      // 构建请求URL
      const url = `${API_BASE_URL}${API_ENDPOINT}?exchange=${exchange}&symbol=${symbol.toLowerCase()}`;
      
      // 发送请求
      const response = await fetch(url);
      
      // 处理HTTP错误状态
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status} ${response.statusText}`;
        
        if (response.status === 400) {
          console.error(`Bad Request for ${symbol} from ${exchange}:`, errorMessage);
        } else if (response.status === 500) {
          console.error(`Server Error for ${symbol} from ${exchange}:`, errorMessage);
        } else {
          console.error(`Error fetching price for ${symbol} from ${exchange}:`, errorMessage);
        }
        return null;
      }
      
      // 解析响应数据
      const data = await response.json();
      
      // 验证响应格式
      if (!data || typeof data.price !== 'number') {
        console.warn(`Invalid price data for ${symbol} from ${exchange}:`, data);
        return null;
      }
      
      // 验证价格有效性
      const price = parseFloat(data.price);
      if (isNaN(price) || price <= 0) {
        console.warn(`Invalid price value for ${symbol} from ${exchange}:`, price);
        return null;
      }
      
      return price;
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
