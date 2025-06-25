// src/app.js

const API = {
  STOP_LIST: 'https://data.etabus.gov.hk/v1/transport/kmb/stop/',
  STOP_ETA: id =>
    `https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${id}`
};

const LANGS = {
  en: {
    stopNameLabel: 'Stop Name (partial)',
    stopNamePlaceholder: 'e.g. Kai Yip Estate',
    routeNumbersLabel: 'Route Numbers (comma-sep, optional)',
    routeNumbersPlaceholder: 'e.g. 14, 62P, 62X, 259D, X42C',
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
    routeNumbersLabel: '路線號碼 (以逗號分隔，非必須)',
    routeNumbersPlaceholder: '例如：14, 62P, 62X, 259D, X42C',
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
    routeNumbersLabel: '路线号码 (以逗号分隔，非必须)',
    routeNumbersPlaceholder: '例如：14, 62P, 62X, 259D, X42C',
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

let stopListCache = null,
    rowsData = [],
    refreshTimer = null,
    hasBuilt = false;

// Fetch and cache all stops
async function getStops() {
  if (!stopListCache) {
    const res = await fetch(API.STOP_LIST),
          json = await res.json();
    stopListCache = json.data || [];
  }
  return stopListCache;
}

// Fetch ETAs for one stop
async function getETAs(id) {
  const res = await fetch(API.STOP_ETA(id)),
        json = await res.json();
  return json.data || [];
}

// Parse stop name to extract title, platform, stopCode
function parseStopInfo(name) {
  let title = name,
      platform = '',
      stopCode = '';
  const toks = [...name.matchAll(/[\(（][^\)）]*[\)）]/g)].map(m => m[0]);
  toks.slice(-2).forEach(t => {
    const v = t.slice(1, -1).trim().toUpperCase();
    if (/^[A-Z]\d{1,2}$/.test(v)) {
      platform = v;
      title = title.replace(t, '');
    } else if (/^[A-Z]{2}\d{3}$/.test(v)) {
      stopCode = v;
      title = title.replace(t, '');
    }
  });
  return { title: title.trim(), platform, stopCode };
}

// Format ISO timestamp to HH:MM:SS (24h)
function formatTimeOnly(iso) {
  return iso
    ? new Date(iso).toLocaleTimeString('en-GB',{
        hour12: false,
        hour:    '2-digit',
        minute:  '2-digit',
        second:  '2-digit'
      })
    : '';
}

// Break route into prefix/number/suffix for sorting
function parseRouteStr(rt) {
  const m = rt.match(/^([A-Za-z]*)(\d+)([A-Za-z]*)$/);
  return m
    ? { prefix: m[1], num: +m[2], suffix: m[3] }
    : { prefix: rt, num: 0, suffix: '' };
}

// Compare two route strings logically
function compareRoute(a,b) {
  const x = parseRouteStr(a.route),
        y = parseRouteStr(b.route);
  if (x.prefix !== y.prefix) return x.prefix.localeCompare(y.prefix);
  if (x.num !== y.num)       return x.num - y.num;
  return x.suffix.localeCompare(y.suffix);
}

// Determine CSS class for route badge color
function routeTagClass(r) {
  const up = r.toUpperCase(),
        { prefix, num } = parseRouteStr(up);
  if (prefix==='A')        return 'route-A';
  if (/^[ES]/.test(prefix))return 'route-ES';
  if (prefix==='HK')       return 'route-HK';
  if (prefix==='N')        return 'route-N';
  if (num>=100&&num<200)   return 'route-1XX';
  if (num>=600&&num<700)   return 'route-6XX';
  if (num>=900&&num<1000)  return (prefix==='P')?'route-P9XX':'route-9XX';
  return 'route-normal';
}

// Update all labels/placeholders/button text based on selected language
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

// Mobile breakpoint check
function isMobile() {
  return window.innerWidth <= 576;
}

// Main build function (called on search, lang change, resize)
async function initialBuild() {
  if (refreshTimer) clearInterval(refreshTimer);
  rowsData = [];

  const lang   = document.getElementById('langSelect').value,
        suffix = SUFFIX[lang],
        L      = LANGS[lang],
        stopIn = document.getElementById('stopName')
                  .value.trim().toLowerCase(),
        rawR   = document.getElementById('routeNumbers')
                  .value.trim().toUpperCase(),
        filter = rawR.split(',').map(r=>r.trim()).filter(Boolean);

  const allStops = await getStops();
  const matches  = allStops.filter(s =>
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

  // Group stops by cleaned title
  const groups = {};
  matches.forEach(s => {
    const full = s[`name_${lang}`];
    const { title, platform, stopCode } = parseStopInfo(full);
    (groups[title] = groups[title]||[]).push({
      stopId: s.stop,
      platform,
      stopCode
    });
  });

  // For each group, fetch ETAs and render
  for (const [title, infos] of Object.entries(groups)) {
    let rows = [];

    // collect rowsData
    for (const info of infos) {
      const data = await getETAs(info.stopId);
      const list = filter.length
        ? data.filter(e => filter.includes(e.route.toUpperCase()))
        : data;

      // group by route+dest
      const byKey = {};
      list.forEach(e => {
        const k = `${e.route}|${e.dest_en}`;
        (byKey[k] = byKey[k]||[]).push(e);
      });

      Object.values(byKey).forEach(ent => {
        // sort by sequence
        ent.sort((a,b) => a.eta_seq - b.eta_seq);

        // ---- Service-type filtering ----
        // Try service types 1→2→3
        const svcOrder = ['1','2','3'];
        let chosen = [];
        for (const svc of svcOrder) {
          const tmp = ent.filter(e=>
            String(e.service_type)===svc && e.eta
          );
          if (tmp.length) {
            chosen = tmp;
            break;
          }
        }
        // if no live ETAs in 1–3, fall back to all live ETAs
        if (!chosen.length) {
          chosen = ent.filter(e=>e.eta);
        }
        // source array for slicing (live of one svc, or any live, or all)
        const source = chosen.length ? chosen : ent;
        // take first 3 entries
        const sliced = [
          source[0]||{},
          source[1]||{},
          source[2]||{}
        ];
        // base entry for route/dest fallback
        const base = source[0]||ent[0]||{};

        rows.push({
          stopId: info.stopId,
          route:  base.route,
          dest:   base[`dest_${suffix}`],
          platform: info.platform,
          stopCode: info.stopCode,
          etas:   sliced,
          remarks: sliced
            .filter(e =>
              e.eta &&
              e.rmk_en!=='Scheduled Bus' &&
              e[`rmk_${suffix}`]
            )
            .map(e =>
              `ETA${e.eta_seq}: ${e[`rmk_${suffix}`]}`
            )
        });
      });
    }

    // sort rows: live first, then route
    rows.sort((a,b) => {
      const aL = a.etas.some(e=>e.eta),
            bL = b.etas.some(e=>e.eta);
      if (aL !== bL) return aL ? -1 : 1;
      return compareRoute(a,b);
    });

    // render group title
    const h3 = document.createElement('h3');
    h3.textContent = title;
    results.appendChild(h3);

    // mobile vs desktop
    if (isMobile()) {
      rows.forEach(r => {
        const card = document.createElement('div');
        card.className = 'mobile-card fade-in';

        // route
        const c1 = document.createElement('div');
        c1.className = 'mobile-route';
        const tag = document.createElement('span');
        tag.className = 'route-tag '+routeTagClass(r.route);
        tag.textContent = r.route;
        c1.appendChild(tag);

        // destination
        const c2 = document.createElement('div');
        c2.className = 'mobile-dest' +
          (r.etas.every(e=>!e.eta)?' mobile-noeta-text':'');
        c2.textContent = r.dest;

        // times
        const c3 = document.createElement('div');
        c3.className = 'mobile-times';
        if (r.etas.some(e=>e.eta)) {
          r.etas.filter(e=>e.eta).forEach((e,i) => {
            const d = document.createElement('div');
            d.className = 'eta-time'+(i===0?' eta-first':'');
            if (i>0 && e.rmk_en==='Scheduled Bus')
              d.classList.add('scheduled-eta');
            d.textContent = formatTimeOnly(e.eta);
            c3.appendChild(d);
          });
        }

        card.append(c1, c2, c3);
        results.appendChild(card);

        rowsData.push({
          stopId: r.stopId,
          route:  r.route,
          mobileContainer: c3
        });
      });
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'eta-table-container';
      const table = document.createElement('table');
      table.className = 'eta-results';

      const showPlat = rows.some(r=>r.platform);
      const ths = [
        LANGS[lang].tableHeaders.Route,
        LANGS[lang].tableHeaders.Destination,
        ...(showPlat?[LANGS[lang].tableHeaders.Platform]:[]),
        LANGS[lang].tableHeaders.StopCode,
        LANGS[lang].tableHeaders.ETA1,
        LANGS[lang].tableHeaders.ETA2,
        LANGS[lang].tableHeaders.ETA3,
        LANGS[lang].tableHeaders.Remarks
      ].map(h=>`<th>${h}</th>`).join('');

      table.innerHTML = `<thead><tr>${ths}</tr></thead>`;
      const tbody = document.createElement('tbody');

      rows.forEach(r => {
        const noEta = !r.etas.some(e=>e.eta);
        const tr = document.createElement('tr');
        tr.className = noEta
          ? 'no-eta-row eta-data-row'
          : 'eta-data-row';

        // route cell
        const tdRt = document.createElement('td');
        tdRt.className = 'eta-route-cell';
        const sp = document.createElement('span');
        sp.className = 'route-tag '+routeTagClass(r.route);
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
          tdR.colSpan = 4 + (showPlat?1:0);
          tdR.className = 'remark-only-cell';
          tdR.textContent = r.remarks[0]||L.noEtas;
          tr.appendChild(tdR);
        } else {
          // ETA cells
          const etaCells = [];
          r.etas.forEach((e,i) => {
            const td = document.createElement('td');
            td.className =
              'desktop-eta-cell'+(i===0?' eta-first':'');
            td.textContent = formatTimeOnly(e.eta);
            if (i>0 && e.rmk_en==='Scheduled Bus')
              td.classList.add('scheduled-eta');
            tr.appendChild(td);
            etaCells.push(td);
          });

          // remarks
          const tdR = document.createElement('td');
          tdR.textContent = r.remarks.join('; ');
          tr.appendChild(tdR);

          rowsData.push({
            stopId: r.stopId,
            route:  r.route,
            etaCells,
            remCell: tdR
          });
        }

        tbody.appendChild(tr);
        tr.classList.add('fade-in');
      });

      table.appendChild(tbody);
      wrap.appendChild(table);
      results.appendChild(wrap);
    }
  }

  refreshTimer = setInterval(refreshEtas, 30000);
}

// Auto-refresh only updates ETA cells & remarks
async function refreshEtas() {
  for (const rd of rowsData) {
    const raw = await getETAs(rd.stopId);
    let ent = raw
      .filter(e => e.route === rd.route)
      .sort((a,b)=>a.eta_seq-b.eta_seq);

    // service-type filtering
    const svcOrder = ['1','2','3'];
    let chosen = [];
    for (const svc of svcOrder) {
      const tmp = ent.filter(e=>
        String(e.service_type)===svc && e.eta
      );
      if (tmp.length) { chosen = tmp; break; }
    }
    if (!chosen.length) {
      chosen = ent.filter(e=>e.eta);
    }
    const source = chosen.length ? chosen : ent;
    const newEtas = [
      source[0]||{},
      source[1]||{},
      source[2]||{}
    ];

    if (rd.mobileContainer) {
      rd.mobileContainer.innerHTML = '';
      if (newEtas.some(e=>e.eta)) {
        newEtas.filter(e=>e.eta).forEach((e,i) => {
          const d = document.createElement('div');
          d.className = 'eta-time'+(i===0?' eta-first':'');
          if (i>0&&e.rmk_en==='Scheduled Bus')
            d.classList.add('scheduled-eta');
          d.textContent = formatTimeOnly(e.eta);
          rd.mobileContainer.appendChild(d);
        });
      }
    } else {
      // update ETA cells
      newEtas.forEach((e,i) => {
        const td = rd.etaCells[i],
              txt = formatTimeOnly(e.eta);
        if (td.textContent !== txt) {
          td.textContent = txt;
          td.classList.add('eta-updated');
          setTimeout(()=>td.classList.remove('eta-updated'),1000);
        }
        if (i>0 && e.rmk_en==='Scheduled Bus')
          td.classList.add('scheduled-eta');
        else td.classList.remove('scheduled-eta');
      });

      // update remarks
      const lang = document.getElementById('langSelect').value,
            suffix = SUFFIX[lang];
      const remarksArr = newEtas
        .filter(e =>
          e.eta &&
          e.rmk_en!=='Scheduled Bus' &&
          e[`rmk_${suffix}`]
        )
        .map(e => `ETA${e.eta_seq}: ${e[`rmk_${suffix}`]}`);
      const remarkText = remarksArr.length
        ? remarksArr.join('; ')
        : '';
      if (rd.remCell.textContent !== remarkText) {
        rd.remCell.textContent = remarkText;
        rd.remCell.classList.add('eta-updated');
        setTimeout(()=>rd.remCell.classList.remove('eta-updated'),1000);
      }
    }
  }
}

// Ripple effect on buttons
document.addEventListener('click', e => {
  const btn = e.target.closest('.ripple');
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  btn.style.setProperty(
    '--ripple-x',
    `${e.clientX - r.left}px`
  );
  btn.style.setProperty(
    '--ripple-y',
    `${e.clientY - r.top}px`
  );
  btn.classList.remove('animate');
  void btn.offsetWidth;
  btn.classList.add('animate');
});

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
themeToggle.checked =
  document.documentElement.classList.contains('dark-mode');
themeToggle.addEventListener('change', e => {
  document.documentElement.classList.toggle(
    'dark-mode',
    e.target.checked
  );
  localStorage.setItem(
    'theme',
    e.target.checked ? 'dark' : 'light'
  );
});

// Search form submission
document.getElementById('searchForm')
  .addEventListener('submit', ev => {
    ev.preventDefault();
    updateUIText();
    hasBuilt = true;
    initialBuild();
  });

// Language selector
document.getElementById('langSelect')
  .addEventListener('change', () => {
    updateUIText();
    if (hasBuilt) initialBuild();
  });

// Rebuild on resize (if already built)
window.addEventListener('resize', () => {
  if (hasBuilt) initialBuild();
});

// Initialize UI text and, if present, auto-run last search
updateUIText();
const last = localStorage.getItem('lastSearch');
if (last) {
  const { lang, stopName, routeNumbers } = JSON.parse(last);
  document.getElementById('langSelect').value = lang;
  document.getElementById('stopName').value = stopName;
  document.getElementById('routeNumbers').value = routeNumbers;
  updateUIText();
  hasBuilt = true;
  initialBuild();
}