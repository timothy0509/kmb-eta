// src/app.js
;(function(){
  // Centralized language data for all modes
  window.ALL_LANGS_DATA = {
    kmb: {
      en: {
        stopNameLabel: 'Stop Name (partial)',
        stopNamePlaceholder: 'e.g. Kai Yip Estate',
        routeNumbersLabel: 'Route Numbers (comma-sep, optional)',
        routeNumbersPlaceholder: 'e.g. 14, 62P, 62X, 259D, X42C',
        searchButton: 'Search ETAs',
        noEtas: 'No ETAs available', // Keep common noEtas here for messages
        tableHeaders: { // Desktop table headers for KMB
          Route: 'Route',
          Destination: 'Destination',
          Platform: 'Platform',
          StopCode: 'StopCode',
          ETA1: 'ETA1',
          ETA2: 'ETA2',
          ETA3: 'ETA3',
          Remarks: 'Remarks'
        }
      },
      tc: {
        stopNameLabel: '巴士站名稱 (部分字串)',
        stopNamePlaceholder: '例如：啟業邨',
        routeNumbersLabel: '路線號碼 (以逗號分隔，非必須)',
        routeNumbersPlaceholder: '例如：14, 62P, 62X, 259D, X42C',
        searchButton: '查詢到站時間',
        noEtas: '沒有到站時間',
        tableHeaders: { // Desktop table headers for KMB
          Route: '路線',
          Destination: '目的地',
          Platform: '月台',
          StopCode: '站號',
          ETA1: '到站1',
          ETA2: '到站2',
          ETA3: '到站3',
          Remarks: '備註'
        }
      },
      sc: {
        stopNameLabel: '巴士站名稱 (部分字串)',
        stopNamePlaceholder: '例如：啟業邨',
        routeNumbersLabel: '路线号码 (以逗号分隔，非必须)',
        routeNumbersPlaceholder: '例如：14, 62P, 62X, 259D, X42C',
        searchButton: '查询到站时间',
        noEtas: '没有到站时间',
        tableHeaders: { // Desktop table headers for KMB
          Route: '路线',
          Destination: '目的地',
          Platform: '站台',
          StopCode: '站号',
          ETA1: '到站1',
          ETA2: '到站2',
          ETA3: '到站3',
          Remarks: '备注'
        }
      }
    },
    mtr: {
      en: {
        inputLabel: 'Station Code / Name',
        inputPlaceholder: 'e.g. TIK  Tiu Keng Leng',
        searchButton: 'Search Trains',
        noData: 'No train data available', // Common noData for messages
        tableHeaders: { // Desktop table headers for MTR
          Destination: 'Destination',
          Platform: 'Platform',
          Time: 'Time'
        }
      },
      tc: {
        inputLabel: '站點代號 / 名稱',
        inputPlaceholder: '例如：TIK  調景嶺',
        searchButton: '查詢列車',
        noData: '沒有列車資料',
        tableHeaders: { // Desktop table headers for MTR
          Destination: '目的地',
          Platform: '月台',
          Time: '時間'
        }
      },
      sc: {
        inputLabel: '站点编号 / 名称',
        inputPlaceholder: '例如：TIK  调景岭',
        searchButton: '查询列车',
        noData: '没有列车资料',
        tableHeaders: { // Desktop table headers for MTR
          Destination: '目的地',
          Platform: '站台',
          Time: '时间'
        }
      }
    },
    lr: {
      en: {
        inputLabel: 'Light Rail Stop Name',
        inputPlaceholder: 'e.g. Butterfly',
        searchButton: 'Search Trains',
        noData: 'No train data available', // Common noData for messages
        tableHeaders: { // Desktop table headers for Light Rail
          Route: 'Route',
          Destination: 'Destination',
          Time: 'Time'
        }
      },
      tc: {
        inputLabel: '輕鐵站名',
        inputPlaceholder: '例如：蝶翠苑',
        searchButton: '查詢列車',
        noData: '沒有列車資料',
        tableHeaders: { // Desktop table headers for Light Rail
          Route: '路線',
          Destination: '目的地',
          Time: '時間'
        }
      },
      sc: {
        inputLabel: '轻铁站名',
        inputPlaceholder: '例如：蝶翠苑',
        searchButton: '查询列车',
        noData: '没有列车资料',
        tableHeaders: { // Desktop table headers for Light Rail
          Route: '路线',
          Destination: '目的地',
          Time: '时间'
        }
      }
    }
  };


  // Return active language code
  window.getLang = function(){
    return document.querySelector('.lang-switch button.active')
      .dataset.value;
  };

  // Return active mode code
  window.getMode = function(){
    return document.querySelector('.mode-switch button.active')
      .dataset.value;
  };

  // Immediately apply saved theme and set toggle
  (function(){
    const t = localStorage.getItem('theme');
    if (t === 'dark') document.documentElement.classList.add('dark-mode');
    const chk = document.getElementById('themeToggle');
    if (chk) chk.checked = (t === 'dark');
  })();

  // Theme toggle listener
  document.addEventListener('DOMContentLoaded', function(){
    const chk = document.getElementById('themeToggle');
    chk.addEventListener('change', function(){
      if (this.checked){
        document.documentElement.classList.add('dark-mode');
        localStorage.setItem('theme','dark');
      } else {
        document.documentElement.classList.remove('dark-mode');
        localStorage.setItem('theme','light');
      }
    });
  });

  // Main function to update all dynamic UI text and input attributes
  window.updateUITextAndInputs = function() {
    const currentMode = window.getMode();
    const currentLang = window.getLang();
    // Access data via the global ALL_LANGS_DATA
    const modeSpecificLangData = window.ALL_LANGS_DATA[currentMode][currentLang];

    // Get common elements
    const labelStopName = document.getElementById('labelStopName');
    const stopNameInput = document.getElementById('stopName');
    const labelRouteNumbers = document.getElementById('labelRouteNumbers');
    const routeNumbersInput = document.getElementById('routeNumbers');
    const routeNumbersDiv = routeNumbersInput.parentElement; // Parent div contains both label and input
    const searchButton = document.querySelector('.controls button');

    // Update common text fields using mode-specific language data
    labelStopName.textContent = modeSpecificLangData.inputLabel || modeSpecificLangData.stopNameLabel;
    stopNameInput.placeholder = modeSpecificLangData.inputPlaceholder || modeSpecificLangData.stopNamePlaceholder;
    searchButton.textContent = modeSpecificLangData.searchButton;

    // KMB specific fields and datalist handling
    if (currentMode === 'kmb') {
      routeNumbersDiv.style.display = ''; // Show route numbers section
      labelRouteNumbers.textContent = modeSpecificLangData.routeNumbersLabel;
      routeNumbersInput.placeholder = modeSpecificLangData.routeNumbersPlaceholder;
      stopNameInput.setAttribute('list', 'stopsList'); // Enable datalist for KMB
    } else {
      routeNumbersDiv.style.display = 'none'; // Hide route numbers section
      stopNameInput.removeAttribute('list'); // Disable datalist for other modes
    }
  };

  // Mode & language segmented controls
  document.addEventListener('DOMContentLoaded', function(){
    // Mode switch
    document.querySelectorAll('.mode-switch button')
      .forEach(btn=>{
        btn.addEventListener('click', ()=>{
          document.querySelectorAll('.mode-switch button')
            .forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');

          document.getElementById('results').innerHTML = ''; // Clear results
          window.updateUITextAndInputs(); // Update all UI text and inputs
        });
      });

    // Language switch
    document.querySelectorAll('.lang-switch button')
      .forEach(btn=>{
        btn.addEventListener('click', ()=>{
          document.querySelectorAll('.lang-switch button')
            .forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');

          window.updateUITextAndInputs(); // Update all UI text based on new language
        });
      });

    // Initial UI update on load
    window.updateUITextAndInputs();
  });


  // Search form handler
  document.addEventListener('DOMContentLoaded', function(){
    document.getElementById('searchForm')
      .addEventListener('submit', function(e){
        e.preventDefault();
        const results = document.getElementById('results');
        results.innerHTML = '';
        const mode = window.getMode();
        if (mode==='kmb') window.buildKMB();
        else if (mode==='mtr') window.buildMTR();
        else if (mode==='lr')  window.buildLR();
      });
  });

  // Ripple effect
  document.addEventListener('click', function(e){
    const el = e.target.closest('.ripple');
    if (!el) return;
    el.classList.remove('animate');
    void el.offsetWidth;
    el.classList.add('animate');
  });

  // Scroll-progress bar
  window.addEventListener('scroll', function(){
    const doc = document.documentElement;
    const pct = (doc.scrollTop) /
      (doc.scrollHeight - doc.clientHeight) * 100;
    document.querySelector('.progress-bar')
      .style.width = pct + '%';
  });

  // Scroll-reveal
  function onReveal(){
    document.querySelectorAll('.reveal').forEach(el=>{
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.9) {
        el.classList.add('in-view');
      }
    });
  }
  document.addEventListener('scroll', onReveal);
  window.addEventListener('resize', onReveal);
  document.addEventListener('DOMContentLoaded', onReveal);

  // Populate KMB stops datalist (only when getStops is available globally)
  document.addEventListener('DOMContentLoaded', async function(){
    // Check if getStops is defined before trying to use it
    if (typeof window.getStops === 'function') {
      try {
        const stops = await window.getStops();
        const dl = document.getElementById('stopsList');
        // Clear existing options in case it's repopulated
        dl.innerHTML = '';
        stops.forEach(s=>{
          const opt = document.createElement('option');
          opt.value = s.name_en; // Assuming English names for datalist for consistency
          dl.appendChild(opt);
        });
      } catch (e) {
        console.error("Failed to populate KMB datalist:", e);
      }
    }
  });

  // Measure widest route, platform, and times/button columns for fluid alignment
  window.alignMobileColumns = function(){
    const currentMode = window.getMode();
    const rootStyle = document.documentElement.style; // Cache for performance

    // ROUTE: Measure only for non-MTR cards (MTR hides it)
    const routeEls = document.querySelectorAll(
      '.mobile-card:not(.mobile-mtr) .mobile-route'
    );
    let maxRouteW = 0;
    // Temporarily reset --max-route-col-width to auto to get true content width
    rootStyle.setProperty('--max-route-col-width', 'auto');
    routeEls.forEach(el=>{
      const w = el.getBoundingClientRect().width;
      if (w > maxRouteW) maxRouteW = w;
    });
    rootStyle.setProperty(
      '--max-route-col-width',
      maxRouteW + 'px'
    );

    // PLATFORM: Measure only if it has actual content (the circle)
    const platEls = document.querySelectorAll(
      '.mobile-card .mobile-platform'
    );
    let maxPlatW = 0;
    // Temporarily reset --max-platform-col-width to auto
    rootStyle.setProperty('--max-platform-col-width', 'auto');
    platEls.forEach(el=>{
      // Only consider the width if it contains a visible circle (children.length > 0)
      if (el.children.length > 0) {
        const w = el.offsetWidth; // Use offsetWidth for actual rendered width
        if (w > maxPlatW) maxPlatW = w;
      }
    });
    rootStyle.setProperty(
      '--max-platform-col-width',
      maxPlatW + 'px'
    );

    // TIMES/BUTTON: Measure the widest element in the last column
    const timesButtonEls = document.querySelectorAll(
      '.mobile-card .mobile-times, .mobile-card .mobile-toggle-btn'
    );
    let maxTimesW = 0;

    // Determine extra padding based on mode
    let EXTRA_ETA_PADDING = 0; // Default for KMB
    if (currentMode === 'mtr' || currentMode === 'lr') {
      EXTRA_ETA_PADDING = 15;
    }

    // Temporarily reset --max-times-col-width to auto
    rootStyle.setProperty('--max-times-col-width', 'auto');
    timesButtonEls.forEach(el=>{
      const w = el.offsetWidth; // Use offsetWidth for actual rendered width
      if (w > maxTimesW) maxTimesW = w;
    });
    rootStyle.setProperty(
      '--max-times-col-width',
      (maxTimesW + EXTRA_ETA_PADDING) + 'px' // Add the extra padding here
    );
  };
})();