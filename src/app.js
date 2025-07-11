// src/app.js

// --- API Endpoints ---
const API = {
  STOP_LIST: 'https://data.etabus.gov.hk/v1/transport/kmb/stop/',
  STOP_ETA: id =>
    `https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${id}`,
  ETA: (stopId, route, serviceType) =>
    `https://data.etabus.gov.hk/v1/transport/kmb/eta/` +
    `${stopId}/${route}/${serviceType}`
};

// --- Internationalization strings ---
const LANGS = {
  en: {
    stopNameLabel: 'Stop Name (partial)',
    stopNamePlaceholder: 'e.g. Kai Yip Estate',
    routeNumbersLabel: 'Route Numbers (comma-sep, optional)',
    routeNumbersPlaceholder:
      'e.g. 14, 62P, 62X, 259D, X42C',
    searchButton: 'Search ETAs',
    noEtas: 'No ETAs available',
    tableHeaders: {
      Route: 'Route',
      Destination: 'Destination',
      Platform: 'Platform',
      StopCode: 'StopCode',
      ETA1: 'ETA1',
      ETA2: 'ETA2',
      ETA3: 'ETA3',
      Remarks: 'Remarks'
    },
    destField: 'dest_en'
  },
  tc: {
    stopNameLabel: '巴士站名稱 (部分字串)',
    stopNamePlaceholder: '例如：啟業邨',
    routeNumbersLabel:
      '路線號碼 (以逗號分隔，非必須)',
    routeNumbersPlaceholder:
      '例如：14, 62P, 62X, 259D, X42C',
    searchButton: '查詢到站時間',
    noEtas: '沒有到站時間',
    tableHeaders: {
      Route: '路線',
      Destination: '目的地',
      Platform: '月台',
      StopCode: '站號',
      ETA1: '到站1',
      ETA2: '到站2',
      ETA3: '到站3',
      Remarks: '備註'
    },
    destField: 'dest_tc'
  },
  sc: {
    stopNameLabel: '巴士站名称 (部分字串)',
    stopNamePlaceholder: '例如：启业邨',
    routeNumbersLabel:
      '路线号码 (以逗号分隔，非必须)',
    routeNumbersPlaceholder:
      '例如：14, 62P, 62X, 259D, X42C',
    searchButton: '查询到站时间',
    noEtas: '没有到站时间',
    tableHeaders: {
      Route: '路线',
      Destination: '目的地',
      Platform: '站台',
      StopCode: '站号',
      ETA1: '到站1',
      ETA2: '到站2',
      ETA3: '到站3',
      Remarks: '备注'
    },
    destField: 'dest_sc'
  }
};
const SUFFIX = { en: 'en', tc: 'tc', sc: 'sc' };

// --- debounce helper ---
function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

// --- Global State ---
let stopListCache = null;
let rowsData = [];
let refreshTimer = null;
let hasBuilt = false;

// --- Helpers ---

async function getStops() {
  if (!stopListCache) {
    const res = await fetch(API.STOP_LIST);
    const json = await res.json();
    stopListCache = json.data || [];
  }
  return stopListCache;
}

async function getETAs(id) {
  const res = await fetch(API.STOP_ETA(id));
  const json = await res.json();
  return json.data || [];
}

// NEW: fetch ETA for a single route & serviceType
async function getRouteEtas(stopId, route, serviceType) {
  const res = await fetch(API.ETA(stopId, route, serviceType));
  const json = await res.json();
  return json.data || [];
}

function parseStopInfo(name) {
  let title = name,
      platform = '',
      stopCode = '';
  const regex = /[\(（]([^\)）]*)[\)）]/g;
  let m;
  while ((m = regex.exec(name)) !== null) {
    const raw = m[0],
          inner = m[1].trim(),
          up = inner.toUpperCase();
    if (!platform && /^[A-Z]\d{1,2}$/.test(up)) {
      platform = up;
      title = title.replace(raw, '');
    } else if (!stopCode && /^[A-Z]{2}\d{3}$/.test(up)) {
      stopCode = up;
      title = title.replace(raw, '');
    }
  }
  return { title: title.trim(), platform, stopCode };
}

function formatTimeOnly(iso) {
  return iso
    ? new Date(iso).toLocaleTimeString('en-GB', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    : '';
}

function parseRouteStr(r) {
  const m = r.match(/^([A-Za-z]*)(\d+)([A-Za-z]*)$/);
  return m
    ? { prefix: m[1], num: +m[2], suffix: m[3] }
    : { prefix: r, num: 0, suffix: '' };
}

function compareRoute(a, b) {
  const x = parseRouteStr(a.route),
        y = parseRouteStr(b.route);
  if (x.prefix !== y.prefix)
    return x.prefix.localeCompare(y.prefix);
  if (x.num !== y.num)
    return x.num - y.num;
  return x.suffix.localeCompare(y.suffix);
}

function routeTagClass(r) {
  const up = r.toUpperCase(),
        { prefix, num } = parseRouteStr(up);
  if (prefix === 'A')    return 'route-A';
  if (/^[ES]/.test(prefix)) return 'route-ES';
  if (prefix === 'HK')   return 'route-HK';
  if (prefix === 'N')    return 'route-N';
  if (num >= 100 && num < 200) return 'route-1XX';
  if (num >= 300 && num < 400) return 'route-3XX';
  if (num >= 600 && num < 700) return 'route-6XX';
  if (num >= 900 && num < 1000)
    return prefix === 'P' ? 'route-P9XX' : 'route-9XX';
  return 'route-normal';
}

function updateUIText() {
  const lang = document.getElementById('langSelect').value,
        L = LANGS[lang];
  document.getElementById('labelStopName').textContent =
    L.stopNameLabel;
  document.getElementById('stopName').placeholder =
    L.stopNamePlaceholder;
  document.getElementById('labelRouteNumbers').textContent =
    L.routeNumbersLabel;
  document.getElementById('routeNumbers').placeholder =
    L.routeNumbersPlaceholder;
  document.querySelector('.controls button').textContent =
    L.searchButton;
}

function isMobile() {
  return window.innerWidth <= 576;
}

// --- Core Render Logic ---

async function initialBuild() {
  if (refreshTimer) clearInterval(refreshTimer);
  rowsData = [];

  const lang = document.getElementById('langSelect').value,
        suffix = SUFFIX[lang],
        L = LANGS[lang],
        stopIn = document.getElementById('stopName').value
          .trim().toLowerCase(),
        rawR = document.getElementById('routeNumbers').value
          .trim().toUpperCase(),
        filter = rawR
          .split(',')
          .map(r => r.trim())
          .filter(Boolean);

  const allStops = await getStops();
  const matches = allStops.filter(
    s =>
      s.name_en.toLowerCase().includes(stopIn) ||
      s.name_tc.toLowerCase().includes(stopIn) ||
      s.name_sc.toLowerCase().includes(stopIn)
  );

  const results = document.getElementById('results');
  results.innerHTML = '';
  if (!matches.length) {
    results.textContent = L.noEtas;
    return;
  }

  // group stops by cleaned title
  const groups = {};
  matches.forEach(s => {
    const full = s[`name_${lang}`],
          info = parseStopInfo(full);
    if (!info.stopCode) {
      info.stopCode = parseStopInfo(s.name_en).stopCode;
    }
    (groups[info.title] = groups[info.title] || []).push({
      stopId: s.stop,
      platform: info.platform,
      stopCode: info.stopCode
    });
  });

  for (const [title, infos] of Object.entries(groups)) {
    // fetch all STOP_ETA in parallel
    const etasArr = await Promise.all(
      infos.map(i => getETAs(i.stopId))
    );

    // build flat rows
    const rows = [];
    infos.forEach((info, idx) => {
      let data = etasArr[idx];
      if (filter.length) {
        data = data.filter(e =>
          filter.includes(e.route.toUpperCase())
        );
      }
      const byKey = {};
      data.forEach(e => {
        const key = `${e.route}|${e.dest_en}`;
        (byKey[key] = byKey[key] || []).push(e);
      });
      Object.values(byKey).forEach(ent => {
        ent.sort((a, b) => a.eta_seq - b.eta_seq);
        const svcOrder = ['1','2','3'];
        let chosen = [];
        for (const svc of svcOrder) {
          const tmp = ent.filter(
            x => String(x.service_type) === svc && x.eta
          );
          if (tmp.length) { chosen = tmp; break; }
        }
        if (!chosen.length) chosen = ent.filter(x => x.eta);
        const source = chosen.length ? chosen : ent;
        const sliced = [
          source[0] || {}, source[1] || {}, source[2] || {}
        ];
        const base = source[0] || ent[0] || {};

        const numberedRemarks = sliced
          .filter(
            x => x.eta &&
                 x.rmk_en !== 'Scheduled Bus' &&
                 x[`rmk_${suffix}`]
          )
          .map(
            x => `ETA${x.eta_seq}: ${x[`rmk_${suffix}`]}`
          );
        const noetaRemarks = ent
          .filter(
            x => x.rmk_en !== 'Scheduled Bus' &&
                 x[`rmk_${suffix}`]
          )
          .map(x => x[`rmk_${suffix}`]);

        rows.push({
          stopId: info.stopId,
          route: base.route,
          dest: base[`dest_${suffix}`],
          platform: info.platform,
          stopCode: info.stopCode,
          etas: sliced,
          numberedRemarks,
          noetaRemarks,
          serviceType: base.service_type
        });
      });
    });

    // sort rows: live first, then route
    rows.sort((a, b) => {
      const aL = a.etas.some(e => e.eta),
            bL = b.etas.some(e => e.eta);
      if (aL !== bL) return aL ? -1 : 1;
      return compareRoute(a, b);
    });

    // render group heading
    const h3 = document.createElement('h3');
    h3.textContent = title;
    results.appendChild(h3);

    if (isMobile()) {
      // --- MOBILE CARDS ---
      rows.forEach(r => {
        const card = document.createElement('div');
        card.className = 'mobile-card fade-in';

        // route tag
        const c1 = document.createElement('div'),
              tag = document.createElement('span');
        c1.className = 'mobile-route';
        tag.className = 'route-tag ' + routeTagClass(r.route);
        tag.textContent = r.route;
        c1.appendChild(tag);

        // destination
        const c2 = document.createElement('div');
        c2.className =
          'mobile-dest' +
          (r.etas.every(e => !e.eta)
            ? ' mobile-noeta-text'
            : '');
        c2.textContent = r.dest;

        // times container
        const c3 = document.createElement('div');
        c3.className = 'mobile-times';
        if (r.etas.some(e => e.eta)) {
          r.etas.filter(e => e.eta)
            .forEach((e, i) => {
              const d = document.createElement('div');
              d.className =
                'eta-time' + (i === 0 ? ' eta-first' : '');
              if (i > 0 && e.rmk_en === 'Scheduled Bus')
                d.classList.add('scheduled-eta');
              d.textContent = formatTimeOnly(e.eta);
              c3.appendChild(d);
            });
        }
        // no collapsed remark when no ETAs

        card.append(c1, c2, c3);

        // toggle button (info or warning)
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'mobile-toggle-btn';
        if (!r.etas.some(e => e.eta)) {
          toggleBtn.classList.add('warning');
        }
        toggleBtn.setAttribute('aria-label', 'Toggle details');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.innerHTML = r.etas.some(e => e.eta)
          ? '&#9432;'
          : '&#9888;';

        toggleBtn.addEventListener('click', e => {
          e.stopPropagation();
          const existing = card.querySelector('.mobile-details');
          if (existing) {
            existing.remove();
            toggleBtn.setAttribute('aria-expanded', 'false');
            card.classList.remove('expanded');
          } else {
            const md = document.createElement('div');
            md.className = 'mobile-details';
            md.innerHTML =
              `<div><strong>Stop Code:</strong> ${
                r.stopCode || 'N/A'
              }</div>` +
              `<div><strong>Platform:</strong> ${
                r.platform || 'N/A'
              }</div>` +
              `<div><strong>Remarks:</strong> ${
                r.etas.some(e => e.eta)
                  ? r.numberedRemarks.join('; ') || '(none)'
                  : r.noetaRemarks[0] || L.noEtas
              }</div>`;
            card.appendChild(md);
            toggleBtn.setAttribute('aria-expanded', 'true');
            card.classList.add('expanded');
          }
        });

        card.append(toggleBtn);
        results.appendChild(card);

        rowsData.push({
          stopId: r.stopId,
          route: r.route,
          serviceType: r.serviceType,
          mobileContainer: c3
        });
      });
    } else {
      // --- DESKTOP TABLE (unchanged) ---
      const wrap = document.createElement('div');
      wrap.className = 'eta-table-container';
      const table = document.createElement('table');
      table.className = 'eta-results';

      const showPlat = rows.some(r => r.platform);
      const hdrs = [
        LANGS[lang].tableHeaders.Route,
        LANGS[lang].tableHeaders.Destination,
        ...(showPlat
          ? [LANGS[lang].tableHeaders.Platform]
          : []),
        LANGS[lang].tableHeaders.StopCode,
        LANGS[lang].tableHeaders.ETA1,
        LANGS[lang].tableHeaders.ETA2,
        LANGS[lang].tableHeaders.ETA3,
        LANGS[lang].tableHeaders.Remarks
      ];
      table.innerHTML = `<thead><tr>${hdrs
        .map(h => `<th>${h}</th>`)
        .join('')}</tr></thead>`;

      const tbody = document.createElement('tbody');
      rows.forEach(r => {
        const noEta = !r.etas.some(e => e.eta);
        const tr = document.createElement('tr');
        tr.className = noEta
          ? 'no-eta-row eta-data-row'
          : 'eta-data-row';

        // route cell
        const tdRt = document.createElement('td');
        tdRt.className = 'eta-route-cell';
        const sp = document.createElement('span');
        sp.className = 'route-tag ' + routeTagClass(r.route);
        sp.textContent = r.route;
        tdRt.appendChild(sp);
        tr.appendChild(tdRt);

        // destination
        const tdD = document.createElement('td');
        tdD.textContent = r.dest;
        if (noEta) tdD.classList.add('no-eta-text');
        tr.appendChild(tdD);

        // platform
        if (showPlat) {
          const tdP = document.createElement('td');
          tdP.textContent = r.platform;
          if (noEta) tdP.classList.add('no-eta-text');
          tr.appendChild(tdP);
        }

        // stop code
        const tdC = document.createElement('td');
        tdC.textContent = r.stopCode;
        if (noEta) tdC.classList.add('no-eta-text');
        tr.appendChild(tdC);

        if (noEta) {
          const tdR = document.createElement('td');
          tdR.colSpan = 4 + (showPlat ? 1 : 0);
          tdR.className = 'remark-only-cell';
          tdR.textContent = r.noetaRemarks[0] || L.noEtas;
          tr.appendChild(tdR);
        } else {
          const etaCells = [];
          r.etas.forEach((e, i) => {
            const td = document.createElement('td');
            td.className =
              'desktop-eta-cell' + (i === 0 ? ' eta-first' : '');
            td.textContent = formatTimeOnly(e.eta);
            if (i > 0 && e.rmk_en === 'Scheduled Bus')
              td.classList.add('scheduled-eta');
            tr.appendChild(td);
            etaCells.push(td);
          });
          const tdR = document.createElement('td');
          tdR.textContent = r.numberedRemarks.join('; ');
          tr.appendChild(tdR);

          rowsData.push({
            stopId: r.stopId,
            route: r.route,
            serviceType: r.serviceType,
            etaCells,
            remCell: tdR
          });
        }
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      wrap.appendChild(table);
      results.appendChild(wrap);
    }
  }

  // start auto-refresh
  refreshTimer = setInterval(refreshEtas, 30000);
}

// --- Refresh only ETAs & remarks ---
async function refreshEtas() {
  for (const rd of rowsData) {
    // fetch only this route+serviceType
    const data = await getRouteEtas(
      rd.stopId, rd.route, rd.serviceType
    );
    const sorted = data.sort((a, b) => a.eta_seq - b.eta_seq);
    const newEtas = [
      sorted[0] || {}, sorted[1] || {}, sorted[2] || {}
    ];

    if (rd.mobileContainer) {
      rd.mobileContainer.innerHTML = '';
      if (newEtas.some(e => e.eta)) {
        newEtas.filter(e => e.eta).forEach((e, i) => {
          const d = document.createElement('div');
          d.className =
            'eta-time' + (i === 0 ? ' eta-first' : '');
          if (i > 0 && e.rmk_en === 'Scheduled Bus')
            d.classList.add('scheduled-eta');
          d.textContent = formatTimeOnly(e.eta);
          rd.mobileContainer.appendChild(d);
        });
      }
    } else {
      // desktop update...
      newEtas.forEach((e, i) => {
        const td = rd.etaCells[i],
              txt = formatTimeOnly(e.eta);
        if (td.textContent !== txt) {
          td.textContent = txt;
          td.classList.add('eta-updated');
          setTimeout(() => td.classList.remove('eta-updated'), 1000);
        }
        if (i > 0 && e.rmk_en === 'Scheduled Bus')
          td.classList.add('scheduled-eta');
        else td.classList.remove('scheduled-eta');
      });

      const lang = document.getElementById('langSelect').value,
            suffix = SUFFIX[lang],
            Lno = LANGS[lang].noEtas;
      const hasLive = newEtas.some(e => e.eta);
      const numbered = newEtas
        .filter(
          e => e.eta &&
               e.rmk_en !== 'Scheduled Bus' &&
               e[`rmk_${suffix}`]
        )
        .map(
          e => `ETA${e.eta_seq}: ${e[`rmk_${suffix}`]}`
        );

      let remarkText;
      if (numbered.length) {
        remarkText = numbered.join('; ');
      } else if (!hasLive) {
        remarkText = (await getETAs(rd.stopId))
          .filter(
            x =>
              x.rmk_en !== 'Scheduled Bus' &&
              x[`rmk_${suffix}`]
          )
          .map(x => x[`rmk_${suffix}`])[0] || Lno;
      } else {
        remarkText = '';
      }

      if (rd.remCell.textContent !== remarkText) {
        rd.remCell.textContent = remarkText;
        rd.remCell.classList.add('eta-updated');
        setTimeout(() => rd.remCell.classList.remove('eta-updated'), 1000);
      }
    }
  }
}

// --- Ripple effect ---
document.addEventListener('click', e => {
  const btn = e.target.closest('.ripple');
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  btn.style.setProperty('--ripple-x', `${e.clientX - r.left}px`);
  btn.style.setProperty('--ripple-y', `${e.clientY - r.top}px`);
  btn.classList.remove('animate');
  void btn.offsetWidth;
  btn.classList.add('animate');
});

// --- Theme toggle ---
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  themeToggle.checked = document.documentElement
    .classList.contains('dark-mode');
  themeToggle.addEventListener('change', e => {
    document.documentElement.classList.toggle(
      'dark-mode', e.target.checked
    );
    localStorage.setItem(
      'theme', e.target.checked ? 'dark' : 'light'
    );
  });
}

// --- Index page hooks only ---
const searchForm = document.getElementById('searchForm');
if (searchForm) {
  // populate <datalist> for stop name type-ahead
  getStops().then(stops => {
    const dl = document.getElementById('stopsList');
    stops.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.name_en;
      dl.appendChild(opt);
    });
  });

  // rebuild on breakpoint change (debounced)
  let prevMob = isMobile();
  window.addEventListener(
    'resize',
    debounce(() => {
      const now = isMobile();
      if (now !== prevMob && hasBuilt) {
        prevMob = now;
        initialBuild();
      }
    }, 200)
  );

  // search form
  searchForm.addEventListener('submit', ev => {
    ev.preventDefault();
    updateUIText();
    localStorage.setItem(
      'lastSearch',
      JSON.stringify({
        lang: document.getElementById('langSelect').value,
        stopName: document.getElementById('stopName').value.trim(),
        routeNumbers: document.getElementById('routeNumbers')
          .value.trim()
      })
    );
    hasBuilt = true;
    initialBuild();
  });

  // language switch
  document.getElementById('langSelect')
    .addEventListener('change', () => {
      updateUIText();
      if (hasBuilt) initialBuild();
    });

  // initial UI text & last search
  updateUIText();
  const last = localStorage.getItem('lastSearch');
  if (last) {
    const { lang, stopName, routeNumbers } =
      JSON.parse(last);
    document.getElementById('langSelect').value = lang;
    document.getElementById('stopName').value = stopName;
    document.getElementById('routeNumbers').value = routeNumbers;
    updateUIText();
    hasBuilt = true;
    initialBuild();
  }
}

// ——— SCROLL-PROGRESS & REVEAL SETUP ———
;(function(){
  // Progress bar
  const bar = document.querySelector('.progress-bar');
  window.addEventListener('scroll', () => {
    const pct = window.scrollY /
      (document.body.scrollHeight - window.innerHeight);
    bar.style.width = `${pct*100}%`;
  });

  // Optional: scroll-reveal for any .reveal elements
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal')
    .forEach(el => obs.observe(el));
})();