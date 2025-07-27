// src/lr.js
;(function(){
  // Removed LANGS block, now managed globally in app.js

  const API = id =>
    `https://rt.data.gov.hk/v1/transport/mtr/lrt/getSchedule?station_id=${encodeURIComponent(id)}`;

  const STOPS = window.LR_STOPS;
  const NAME_TO_ID = window.LR_NAME_TO_ID;

  const COLORS = {
    '505':'#da2128','507':'#25a650','507P':'#25a650','610':'#551b14','614':'#44c0f3',
    '614P':'#f4858d','615':'#f9dd07','615P':'#256684','705':'#72bf44','706':'#b27ab4',
    '751':'#f5821f','761P':'#6f2b91'
  };
  function contrastColor(hex){
    const r=parseInt(hex.substr(1,2),16),
          g=parseInt(hex.substr(3,2),16),
          b=parseInt(hex.substr(5,2),16);
    return (0.299*r+0.587*g+0.114*b)>186?'#000':'#fff';
  }

  function getLang(){ return document.querySelector('.lang-switch button.active').dataset.value; }
  function isMobile(){ return window.innerWidth<=576; }

  // Removed updateLRText, now managed globally in app.js

  window.buildLR = async function(){
    const currentLang=getLang(); // Get current lang from app.js global
    const L=window.ALL_LANGS_DATA.lr[currentLang]; // Access centralized lang data

    const raw = document.getElementById('stopName').value.trim().toLowerCase();
    const results = document.getElementById('results');
    results.innerHTML='';

    const stationId = NAME_TO_ID[raw];
    if (stationId == null) {
      results.textContent = L.noData; // L.noData from specific lang
      return;
    }

    try {
      const res = await fetch(API(stationId)),
            j   = await res.json();
      if (j.status!==1 || !j.platform_list?.length) {
        results.textContent = L.noData;
        return;
      }

      j.platform_list.forEach(p=>{
        const h3 = document.createElement('h3');
        h3.textContent = `Platform ${p.platform_id}`;
        results.appendChild(h3);

        if(isMobile()){
          p.route_list.forEach(e=>{
            const card = document.createElement('div');
            card.className='mobile-card fade-in mobile-lr';

            const cRoute=document.createElement('div');
            cRoute.className='mobile-route';
            const tag=document.createElement('span');
            tag.className='route-tag';
            tag.textContent=e.route_no;
            const bg=COLORS[e.route_no], fg=bg?contrastColor(bg):'#000';
            if(bg){tag.style.backgroundColor=bg;tag.style.color=fg;}
            cRoute.appendChild(tag);

            const cDest=document.createElement('div');
            cDest.className='mobile-dest';
            cDest.textContent=currentLang==='en'?e.dest_en:e.dest_ch; // Use currentLang here

            // PLATFORM: The wrapper div
            const cPlatform=document.createElement('div');
            cPlatform.className='mobile-platform';
            const circle=document.createElement('span'); // The actual circle content
            circle.className='platform-circle';
            circle.textContent=p.platform_id;
            if(bg){circle.style.backgroundColor=bg;circle.style.color=fg;}
            cPlatform.appendChild(circle); // Add circle to its wrapper div

            const cTimes=document.createElement('div');
            cTimes.className='mobile-times';
            const tspan=document.createElement('span');
            tspan.className='eta-time';
            tspan.textContent=currentLang==='en'?e.time_en:e.time_ch; // Use currentLang here
            cTimes.appendChild(tspan);

            // Card now appends elements directly
            card.append(cRoute,cDest,cPlatform,cTimes);
            results.appendChild(card);
          });

          window.alignMobileColumns(); // Align columns after all cards are in DOM
        } else {
          const wrap=document.createElement('div');
          wrap.className='eta-table-container';
          const table=document.createElement('table');
          table.className='eta-results';
          const hdrs=[L.tableHeaders.Route,L.tableHeaders.Destination,L.tableHeaders.Time]; // Access desktop headers via specific lang
          table.innerHTML=`<thead><tr>${
            hdrs.map(h=>`<th>${h}</th>`).join('')
          }</tr></thead>`;
          const tbody=document.createElement('tbody');
          p.route_list.forEach(e=>{
            const tr=document.createElement('tr');
            const tdR=document.createElement('td'), sp=document.createElement('span');
            sp.className='route-tag';
            sp.textContent=e.route_no;
            const bg=COLORS[e.route_no], fg=bg?contrastColor(bg):'#000';
            if(bg){sp.style.backgroundColor=bg;sp.style.color=fg;}
            tdR.appendChild(sp); tr.appendChild(tdR);

            const tdD=document.createElement('td');
            tdD.textContent=currentLang==='en'?e.dest_en:e.dest_ch; // Use currentLang here
            tr.appendChild(tdD);

            const tdT=document.createElement('td');
            tdT.textContent=currentLang==='en'?e.time_en:e.time_ch; // Use currentLang here
            tr.appendChild(tdT);

            tbody.appendChild(tr);
          });
          table.appendChild(tbody);
          wrap.appendChild(table);
          results.appendChild(wrap);
        }
      });
    } catch(err){
      console.error(err);
      results.textContent = L.noData;
    }
  };
})();