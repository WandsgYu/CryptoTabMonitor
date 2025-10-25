document.addEventListener("DOMContentLoaded", function () {
  const apiUrlBase =
    "https://api.bitget.com/api/v2/mix/market/ticker?productType=USDT-FUTURES&symbol=";
  let previousPrices = {};
  let priceUpdateInterval; // 用于存储 setInterval 的 ID，方便后续清除和重设

  // DOM Elements for settings
  const settingsButton = document.getElementById("settings-button");
  const settingsModal = document.getElementById("settings-modal");
  const closeSettingsModalButton = document.getElementById(
    "close-settings-modal"
  );
  const displayCountSelect = document.getElementById("display-count");
  const coinSettingsContainer = document.getElementById(
    "coin-settings-container"
  );
  const addCoinButton = document.getElementById("add-coin-button");
  const refreshIntervalInput = document.getElementById("refresh-interval");
  const saveSettingsButton = document.getElementById("save-settings-button");
  const resetSettingsButton = document.getElementById("reset-settings-button");
  const tradingMottoSelect = document.getElementById("trading-motto-select");
  const tradingMottoCustomInput = document.getElementById(
    "trading-motto-custom"
  );
  const profitElement = document.getElementById("profit");
  const priceFontSizeInput = document.getElementById("price-font-size");
  const bigModeFontSizeInput = document.getElementById("big-mode-font-size");
  const refreshIntervalTabs = document.getElementById("refresh-interval-tabs");
  const bigModeClock = document.getElementById("big-mode-clock");

  const defaultSettings = {
    displayCount: 4,
    coins: [
      { order: 1, name: "BTC", precision: 0 },
      { order: 2, name: "ETH", precision: 2 },
      { order: 3, name: "SOL", precision: 2 },
      { order: 4, name: "BNB", precision: 2 },
    ],
    refreshInterval: 60000, // 默认60秒（单位：毫秒）
    tradingMotto: "",
    priceFontSize: 130,
    bigModePriceFontSize: 222,
  };

  let currentSettings = JSON.parse(JSON.stringify(defaultSettings)); // 深拷贝

  // --- Settings Modal Logic ---
  function openSettingsModal() {
    if (settingsModal) settingsModal.style.display = "block";
    loadSettingsToUI(); // 打开时加载当前配置到UI
  }

  function closeSettingsModal() {
    if (settingsModal) settingsModal.style.display = "none";
  }

  if (settingsButton)
    settingsButton.addEventListener("click", openSettingsModal);
  if (closeSettingsModalButton)
    closeSettingsModalButton.addEventListener("click", closeSettingsModal);

  // --- Coin Settings Management ---
  function createCoinSettingItem(coin = { name: "", precision: 2 }, order = 1) {
    const itemDiv = document.createElement("div");
    itemDiv.classList.add("coin-setting-item");
    itemDiv.style.display = "flex";
    itemDiv.style.alignItems = "center";
    itemDiv.style.marginBottom = "10px";

    const orderDisplay = document.createElement("span");
    orderDisplay.classList.add("coin-order-display");
    orderDisplay.textContent = order;
    orderDisplay.style.cssText =
      "width: 30px; margin-right: 10px; text-align: center; font-weight: bold;";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.classList.add("coin-name");
    nameInput.placeholder = "名称 (例如 BTC)";
    nameInput.value = coin.name;
    nameInput.style.cssText =
      "flex-grow: 1; margin-right: 5px; padding: 8px; border-radius: 4px; border: 1px solid #ccc;";

    const precisionInput = document.createElement("input");
    precisionInput.type = "number";
    precisionInput.classList.add("coin-precision");
    precisionInput.placeholder = "精度";
    precisionInput.value = coin.precision;
    precisionInput.min = 0;
    precisionInput.style.cssText =
      "width: 60px; margin-right: 5px; padding: 8px; border-radius: 4px; border: 1px solid #ccc;";

    const removeButton = document.createElement("button");
    removeButton.classList.add("remove-coin-button");
    removeButton.textContent = "移除";
    removeButton.style.cssText =
      "padding: 8px 10px; background-color: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;";
    removeButton.addEventListener("click", function () {
      itemDiv.remove();
      updateCoinOrders();
    });

    itemDiv.appendChild(orderDisplay);
    itemDiv.appendChild(nameInput);
    itemDiv.appendChild(precisionInput);
    itemDiv.appendChild(removeButton);
    return itemDiv;
  }

  function addCoinSetting(coin) {
    const itemCount = coinSettingsContainer.children.length;
    const newItem = createCoinSettingItem(coin, itemCount + 1);
    coinSettingsContainer.appendChild(newItem);
  }

  function updateCoinOrders() {
    const items = coinSettingsContainer.querySelectorAll(".coin-setting-item");
    items.forEach((item, index) => {
      const orderDisplay = item.querySelector(".coin-order-display");
      if (orderDisplay) orderDisplay.textContent = index + 1;
    });
  }

  if (addCoinButton) {
    addCoinButton.addEventListener("click", () => addCoinSetting());
  }

  // --- Trading Motto Logic ---
  if (tradingMottoSelect) {
    tradingMottoSelect.addEventListener("change", function () {
      if (this.value === "custom") {
        tradingMottoCustomInput.style.display = "block";
        tradingMottoCustomInput.focus();
      } else {
        tradingMottoCustomInput.style.display = "none";
      }
    });
  }

  // --- Settings Persistence (Load/Save/Reset) ---
  function adjustCoinSettingsToDisplayCount(targetCount) {
    const currentItemCount = coinSettingsContainer.children.length;
    if (currentItemCount > targetCount) {
      for (let i = currentItemCount; i > targetCount; i--) {
        coinSettingsContainer.lastChild.remove();
      }
    } else if (currentItemCount < targetCount) {
      for (let i = currentItemCount; i < targetCount; i++) {
        // Create a new empty coin object or with defaults for adding
        const defaultCoinForNewRow = { name: "", precision: 2 };
        addCoinSetting(defaultCoinForNewRow);
      }
    }
    updateCoinOrders(); // Re-number the order inputs
  }

  if (displayCountSelect) {
    displayCountSelect.addEventListener("change", function () {
      const selectedCount = parseInt(this.value, 10);
      // Ensure that the display count change also potentially adjusts the number of coin setting rows.
      adjustCoinSettingsToDisplayCount(selectedCount);
    });
  }

  // Function to apply font sizes to price elements
  function applyCurrentFontSizes() {
    const priceElements = document.querySelectorAll('.box h1[id$="-price"]');
    let fontSizeToApply;

    if (document.body.classList.contains("big-mode")) {
      fontSizeToApply =
        currentSettings.bigModePriceFontSize ||
        defaultSettings.bigModePriceFontSize;
    } else {
      fontSizeToApply =
        currentSettings.priceFontSize || defaultSettings.priceFontSize;
    }

    priceElements.forEach((el) => {
      el.style.fontSize = `${fontSizeToApply}px`;
    });
  }

  function loadSettingsToUI() {
    displayCountSelect.value = currentSettings.displayCount;
    refreshIntervalInput.value = Math.round(
      (currentSettings.refreshInterval || defaultSettings.refreshInterval) /
        1000
    );
    priceFontSizeInput.value =
      currentSettings.priceFontSize || defaultSettings.priceFontSize;
    bigModeFontSizeInput.value =
      currentSettings.bigModePriceFontSize ||
      defaultSettings.bigModePriceFontSize;

    // Load Trading Motto
    if (tradingMottoSelect) {
      const motto =
        currentSettings.tradingMotto || defaultSettings.tradingMotto;
      // Check if the motto is one of the predefined options
      let isPredefined = false;
      for (let i = 0; i < tradingMottoSelect.options.length; i++) {
        if (tradingMottoSelect.options[i].value === motto) {
          isPredefined = true;
          break;
        }
      }
      if (isPredefined && motto !== "custom") {
        tradingMottoSelect.value = motto;
        tradingMottoCustomInput.style.display = "none";
        tradingMottoCustomInput.value = "";
      } else if (motto === "") {
        // Handle empty string for "留空"
        tradingMottoSelect.value = "";
        tradingMottoCustomInput.style.display = "none";
        tradingMottoCustomInput.value = "";
      } else {
        tradingMottoSelect.value = "custom";
        tradingMottoCustomInput.style.display = "block";
        tradingMottoCustomInput.value = motto;
      }
    }

    coinSettingsContainer.innerHTML = "";
    let coinsToLoad = [...currentSettings.coins];
    coinsToLoad
      .sort((a, b) => a.order - b.order)
      .forEach((coin) => {
        addCoinSetting(coin);
      });

    adjustCoinSettingsToDisplayCount(parseInt(displayCountSelect.value, 10));
    updateCoinOrders();
  }

  function saveSettingsFromUI() {
    const newDisplayCount = parseInt(displayCountSelect.value, 10);
    const newRefreshInterval = parseInt(refreshIntervalInput.value, 10) * 1000;
    const newPriceFontSize =
      parseInt(priceFontSizeInput.value, 10) || defaultSettings.priceFontSize;
    const newBigModePriceFontSize =
      parseInt(bigModeFontSizeInput.value, 10) ||
      defaultSettings.bigModePriceFontSize;

    let newTradingMotto = "";
    if (tradingMottoSelect) {
      if (tradingMottoSelect.value === "custom") {
        newTradingMotto = tradingMottoCustomInput.value.trim();
      } else {
        newTradingMotto = tradingMottoSelect.value;
      }
    }

    const coinItems =
      coinSettingsContainer.querySelectorAll(".coin-setting-item");
    const newCoins = [];
    coinItems.forEach((item, index) => {
      const order = index + 1;
      const name = item.querySelector(".coin-name").value.trim().toUpperCase();
      const precision = parseInt(
        item.querySelector(".coin-precision").value,
        10
      );
      if (name) {
        newCoins.push({ order, name, precision });
      }
    });

    currentSettings = {
      displayCount: newDisplayCount,
      coins: newCoins,
      refreshInterval: newRefreshInterval >= 1000 ? newRefreshInterval : 1000,
      tradingMotto: newTradingMotto,
      priceFontSize: newPriceFontSize,
      bigModePriceFontSize: newBigModePriceFontSize,
    };
    localStorage.setItem(
      "cryptoMonitorSettings",
      JSON.stringify(currentSettings)
    );
    alert("配置已保存！部分更改可能需要刷新页面才能完全生效。");
    applySettings();
    closeSettingsModal();
  }

  function resetToDefaults() {
    if (confirm("确定要恢复默认配置吗？所有自定义设置将会丢失。")) {
      currentSettings = JSON.parse(JSON.stringify(defaultSettings));
      localStorage.removeItem("cryptoMonitorSettings");
      alert("已恢复默认配置。");
      applySettings();
      if (settingsModal && settingsModal.style.display === "block") {
        loadSettingsToUI();
      }
    }
  }

  if (saveSettingsButton)
    saveSettingsButton.addEventListener("click", saveSettingsFromUI);
  if (resetSettingsButton)
    resetSettingsButton.addEventListener("click", resetToDefaults);

  function loadInitialSettings() {
    const savedSettings = localStorage.getItem("cryptoMonitorSettings");
    if (savedSettings) {
      currentSettings = JSON.parse(savedSettings);
      currentSettings.displayCount =
        currentSettings.displayCount || defaultSettings.displayCount;
      currentSettings.coins =
        currentSettings.coins && currentSettings.coins.length > 0
          ? currentSettings.coins
          : defaultSettings.coins;
      currentSettings.refreshInterval =
        currentSettings.refreshInterval || defaultSettings.refreshInterval;
      currentSettings.tradingMotto =
        currentSettings.tradingMotto !== undefined
          ? currentSettings.tradingMotto
          : defaultSettings.tradingMotto;
      currentSettings.priceFontSize =
        currentSettings.priceFontSize || defaultSettings.priceFontSize;
      currentSettings.bigModePriceFontSize =
        currentSettings.bigModePriceFontSize ||
        defaultSettings.bigModePriceFontSize;
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
    if (profitElement) {
      profitElement.textContent =
        currentSettings.tradingMotto !== undefined
          ? currentSettings.tradingMotto
          : defaultSettings.tradingMotto;
    }

    updateDisplayBoxes();
    applyCurrentFontSizes();

    previousPrices = {};
    currentSettings.coins.forEach((coin) => {
      previousPrices[coin.name] = null;
    });

    if (priceUpdateInterval) {
      clearInterval(priceUpdateInterval);
    }
    updatePrices();
    priceUpdateInterval = setInterval(
      updatePrices,
      currentSettings.refreshInterval
    );

    if (settingsModal && settingsModal.style.display === "block") {
      loadSettingsToUI();
    }
  }

  function updateDisplayBoxes() {
    const container = document.querySelector(".container");
    const count = parseInt(currentSettings.displayCount, 10);

    container.innerHTML = "";

    const coinsToDisplay = currentSettings.coins.slice(0, count);

    coinsToDisplay.forEach((coin) => {
      const boxDiv = document.createElement("div");
      boxDiv.classList.add("box");
      boxDiv.id = coin.name.toLowerCase();

      const h1 = document.createElement("h1");
      h1.id = `${coin.name.toLowerCase()}-price`;
      h1.textContent = "Loading...";

      const h2 = document.createElement("h2");
      h2.textContent = coin.name;

      boxDiv.appendChild(h1);
      boxDiv.appendChild(h2);
      container.appendChild(boxDiv);
    });

    if (count === 1) {
      container.style.gridTemplateColumns = "1fr";
    } else if (count === 4) {
      container.style.gridTemplateColumns = "repeat(2, 1fr)";
    } else if (count === 9) {
      container.style.gridTemplateColumns = "repeat(3, 1fr)";
    } else {
      container.style.gridTemplateColumns =
        "repeat(auto-fit, minmax(150px, 1fr))";
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

  async function fetchPrice(symbol) {
    try {
      const response = await fetch(`${apiUrlBase}${symbol}USDT_UMCBL`);
      if (!response.ok) {
        console.error(
          `Error fetching price for ${symbol}: ${response.status} ${response.statusText}`
        );
        return null;
      }
      const data = await response.json();
      if (data.code !== "00000") {
        console.warn(
          `API error for ${symbol}: ${data.msg} (code: ${data.code})`
        );
        return null;
      }
      if (!data.data || data.data.last === undefined) {
        console.warn(
          `Price data not found for ${symbol} in API response:`,
          data
        );
        return null;
      }
      return parseFloat(data.data.last);
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
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
      const activeCoins = currentSettings.coins.slice(
        0,
        currentSettings.displayCount
      );
      if (activeCoins.length === 0) {
        document.title = "Crypto Monitor";
        return;
      }

      const pricePromises = activeCoins.map((coin) => fetchPrice(coin.name));
      const prices = await Promise.all(pricePromises);

      let titlePrices = [];

      activeCoins.forEach((coin, index) => {
        const price = prices[index];
        const priceElement = document.getElementById(
          `${coin.name.toLowerCase()}-price`
        );

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
        document.title = titlePrices.join(" ");
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

  const bigModeButton = document.getElementById("big-mode-button");
  const exitBigModeButton = document.getElementById("exit-big-mode-button");

  if (bigModeButton && exitBigModeButton) {
    bigModeButton.addEventListener("click", function () {
      document.body.classList.add("big-mode");
      bigModeButton.style.display = "none";
      exitBigModeButton.style.display = "inline-block";
      applyCurrentFontSizes();
      updateBigModeClock(); // 进入Big Mode时立即刷新一次
    });

    exitBigModeButton.addEventListener("click", function () {
      document.body.classList.remove("big-mode");
      exitBigModeButton.style.display = "none";
      bigModeButton.style.display = "inline-block";
      applyCurrentFontSizes();
      updateBigModeClock(); // 退出Big Mode时立即隐藏
    });
  }

  if (refreshIntervalTabs) {
    refreshIntervalTabs.addEventListener("click", function (e) {
      if (e.target.classList.contains("refresh-interval-tab")) {
        refreshIntervalInput.value = e.target.getAttribute("data-value");
      }
    });
  }
});
