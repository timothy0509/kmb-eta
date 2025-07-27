// src/mtr.js
;(function(){
  // Removed LANGS block, now managed globally in app.js

  const API = (line,sta,lang='en') =>
    `https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php`+
    `?line=${encodeURIComponent(line)}`+
    `&sta=${encodeURIComponent(sta)}`+
    `&lang=${encodeURIComponent(lang)}`;

  const STATIONS    = window.MTR_STATIONS;
  const NAME_TO_CODE= window.MTR_NAME_TO_CODE;

  const LINE_COLOR = {
    AEL:'#2a888a',EAL:'#53b7e8',KTL:'#26ab4e',TWL:'#ed1c24',
    ISL:'#347dc5',TCL:'#f7943e',TKL:'#7e459b',TML:'#923011',
    DRL:'#f173ac',SIL:'#b5bd01'
  };
  function contrastColor(hex){
    const r=parseInt(hex.substr(1,2),16),
          g=parseInt(hex.substr(3,2),16),
          b=parseInt(hex.substr(5,2),16);
    return (0.299*r+0.587*g+0.114*b)>186?'#000':'#fff';
  }

  function getLang(){ return document.querySelector('.lang-switch button.active').dataset.value; }
  function isMobile(){ return window.innerWidth<=576; }

  // Removed updateMTRText, now managed globally in app.js

  window.buildMTR = async function(){
    const currentLang=getLang(); // Get current lang from app.js global
    const L=window.ALL_LANGS_DATA.mtr[currentLang]; // Access centralized lang data

    const inp=document.getElementById('stopName').value.trim();
    const results=document.getElementById('results');
    results.innerHTML='';

    if(!inp){ results.textContent=L.noData; return; } // L.noData from specific lang
    const low=inp.toLowerCase();
    let sta=null,lines=[];
    const up=inp.toUpperCase();
    if(/^[A-Za-z]{3}$/.test(up) && STATIONS[up]?.lines){
      sta=up; lines=STATIONS[up].lines.slice();
    }
    if(!sta && window.MTR_NAME_TO_CODE[low]){
      sta=window.MTR_NAME_TO_CODE[low];
      lines=STATIONS[sta].lines.slice();
    }
    if(!sta){ results.textContent=L.noData; return; }

    let any=false;
    for(const line of lines){
      try{
        const res=await fetch(API(line,sta,currentLang)), j=await res.json(); // Pass currentLang to API
        const key=`${line}-${sta}`;
        if(j.status===1 && j.data?.[key]){
          any=true; renderBlock(j.data[key], line);
        }
      }catch(e){ console.warn(e); }
    }
    if(!any) results.textContent=L.noData;

    if(isMobile()) window.alignMobileColumns(); // Align columns after all cards are in DOM
  };

  function renderBlock(block,line){
    const currentLang=getLang(); // Get current lang from app.js global
    const L=window.ALL_LANGS_DATA.mtr[currentLang]; // Access centralized lang data

    const results=document.getElementById('results');
    const bg=LINE_COLOR[line]||'#000', fg=contrastColor(bg);
    const lineName=STATIONS[line].name;

    ['UP','DOWN'].forEach(dir=>{
      const arr=block[dir]||[];
      if(!arr.length) return;
      const dests=Array.from(new Set(arr.map(e=>e.dest)))
        .map(d=>STATIONS[d]?.name||d).join(' / ');

      const h3=document.createElement('h3');
      const spanName=document.createElement('span');
      spanName.textContent=lineName;
      spanName.className='line-tag';
      spanName.style.backgroundColor=bg;
      spanName.style.color=fg;
      spanName.style.padding='0.2em 0.5em';
      spanName.style.borderRadius='4px';
      h3.appendChild(spanName);
      h3.append(` → ${dests}`);
      results.appendChild(h3);

      if(isMobile()){
        arr.forEach(e=>{
          const card=document.createElement('div');
          card.className='mobile-card fade-in mobile-mtr';

          // Route placeholder (will be hidden by CSS in MTR mode)
          const cRoute=document.createElement('div');
          cRoute.className='mobile-route';

          const cDest=document.createElement('div');
          cDest.className='mobile-dest';
          cDest.textContent=STATIONS[e.dest]?.name||e.dest;

          // PLATFORM: The wrapper div, holding the circle span
          const cPlatform=document.createElement('div');
          cPlatform.className='mobile-platform';
          const circle=document.createElement('span'); // The actual circle content
          circle.className='platform-circle';
          circle.textContent=e.plat;
          circle.style.backgroundColor=bg;
          circle.style.color=fg;
          cPlatform.appendChild(circle); // Add circle to its wrapper div

          const cTimes=document.createElement('div');
          cTimes.className='mobile-times';
          const tspan=document.createElement('span');
          tspan.className='eta-time';
          tspan.textContent=(e.time||'').split(' ')[1]||e.time;
          cTimes.appendChild(tspan);

          // Card now appends elements directly
          card.append(cRoute,cDest,cPlatform,cTimes);
          results.appendChild(card);
        });
      } else {
        const h4=document.createElement('h4');
        h4.textContent=dir;
        h4.style.marginTop='1em';
        results.appendChild(h4);

        const wrap=document.createElement('div');
        wrap.className='eta-table-container';
        const table=document.createElement('table');
        table.className='eta-results';
        const hdrs=[L.tableHeaders.Destination,L.tableHeaders.Platform,L.tableHeaders.Time]; // Access desktop headers via specific lang
        table.innerHTML=`<thead><tr>${
          hdrs.map(h=>`<th>${h}</th>`).join('')
        }</tr></thead>`;
        const tbody=document.createElement('tbody');
        arr.forEach(e=>{
          const tr=document.createElement('tr');
          const tdD=document.createElement('td');
          tdD.textContent=STATIONS[e.dest]?.name||e.dest;
          tr.appendChild(tdD);

          const tdP=document.createElement('td');
          tdP.textContent=e.plat;
          tr.appendChild(tdP);

          const tdT=document.createElement('td');
          tdT.textContent=(e.time||'').split(' ')[1]||e.time;
          tr.appendChild(tdT);

          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        wrap.appendChild(table);
        results.appendChild(wrap);
      }
    });
  }
})();