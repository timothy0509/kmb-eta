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
        searchButton: 'Search ETAs'
      },
      tc: {
        stopNameLabel: '巴士站名稱 (部分字串)',
        stopNamePlaceholder: '例如：啟業邨',
        routeNumbersLabel: '路線號碼 (以逗號分隔，非必須)',
        routeNumbersPlaceholder: '例如：14, 62P, 62X, 259D, X42C',
        searchButton: '查詢到站時間'
      },
      sc: {
        stopNameLabel: '巴士站名稱 (部分字串)',
        stopNamePlaceholder: '例如：啟業邨',
        routeNumbersLabel: '路线号码 (以逗号分隔，非必须)',
        routeNumbersPlaceholder: '例如：14, 62P, 62X, 259D, X42C',
        searchButton: '查询到站时间'
      }
    },
    mtr: {
      en: {
        inputLabel: 'Station Code / Name',
        inputPlaceholder: 'e.g. TIK  Tiu Keng Leng',
        searchButton: 'Search Trains'
      },
      tc: {
        inputLabel: '站點代號 / 名稱',
        inputPlaceholder: '例如：TIK  調景嶺',
        searchButton: '查詢列車'
      },
      sc: {
        inputLabel: '站点编号 / 名称',
        inputPlaceholder: '例如：TIK  调景岭',
        searchButton: '查询列车'
      }
    },
    lr: {
      en: {
        inputLabel: 'Light Rail Stop Name',
        inputPlaceholder: 'e.g. Butterfly',
        searchButton: 'Search Trains'
      },
      tc: {
        inputLabel: '輕鐵站名',
        inputPlaceholder: '例如：蝶翠苑',
        searchButton: '查詢列車'
      },
      sc: {
        inputLabel: '轻铁站名',
        inputPlaceholder: '例如：蝶翠苑',
        searchButton: '查询列车'
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
    const modeData = window.ALL_LANGS_DATA[currentMode][currentLang];

    // Get common elements
    const labelStopName = document.getElementById('labelStopName');
    const stopNameInput = document.getElementById('stopName');
    const labelRouteNumbers = document.getElementById('labelRouteNumbers');
    const routeNumbersInput = document.getElementById('routeNumbers');
    const routeNumbersDiv = routeNumbersInput.parentElement; // Parent div contains both label and input
    const searchButton = document.querySelector('.controls button');

    // Update common text fields
    labelStopName.textContent = modeData.inputLabel || modeData.stopNameLabel;
    stopNameInput.placeholder = modeData.inputPlaceholder || modeData.stopNamePlaceholder;
    searchButton.textContent = modeData.searchButton;

    // KMB specific fields and datalist
    if (currentMode === 'kmb') {
      routeNumbersDiv.style.display = ''; // Show route numbers section
      labelRouteNumbers.textContent = modeData.routeNumbersLabel;
      routeNumbersInput.placeholder = modeData.routeNumbersPlaceholder;
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

  // Populate KMB stops datalist
  document.addEventListener('DOMContentLoaded', async function(){
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
    } catch {}
  });

  // Measure widest route & platform columns for fluid alignment
  window.alignMobileColumns = function(){
    // ROUTE: Measure only for non-MTR cards as MTR hides it
    const routeEls = document.querySelectorAll(
      '.mobile-card:not(.mobile-mtr) .mobile-route'
    );
    let maxRouteW = 0;
    routeEls.forEach(el=>{
      // Use clientWidth which includes padding but not margin/border
      const w = el.clientWidth; 
      if (w > maxRouteW) maxRouteW = w;
    });
    document.documentElement.style.setProperty(
      '--max-route-col-width',
      maxRouteW + 'px'
    );

    // PLATFORM: Measure only if it has actual content (the circle)
    const platEls = document.querySelectorAll(
      '.mobile-card .mobile-platform'
    );
    let maxPlatW = 0;
    platEls.forEach(el=>{
      // Only consider the width if it contains a visible circle (children.length > 0)
      if (el.children.length > 0) {
        // Use clientWidth for the actual circle itself if it's the target, or el.clientWidth
        const w = el.clientWidth; 
        if (w > maxPlatW) maxPlatW = w;
      }
    });
    document.documentElement.style.setProperty(
      '--max-platform-col-width',
      maxPlatW + 'px'
    );
  };
})();