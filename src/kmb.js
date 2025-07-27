// src/kmb.js

;(function(){
  // Removed KMB I18n block, moved to app.js

  const SUFFIX = { en:'en', tc:'tc', sc:'sc' };

  const API = {
    STOP_LIST: 'https://data.etabus.gov.hk/v1/transport/kmb/stop/',
    STOP_ETA: id=>`https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${id}`,
    ETA: (stop,route,svc)=>
      `https://data.etabus.gov.hk/v1/transport/kmb/eta/${stop}/${route}/${svc}`
  };

  async function getStops(){
    if(!getStops.cache){
      try{
        const r=await fetch('cache/kmb_stops.json');
        if(r.ok){
          const j=await r.json();
          getStops.cache=j.data||j;
          return getStops.cache;
        }
      }catch{}
      const r=await fetch(API.STOP_LIST), j=await r.json();
      getStops.cache=j.data||[];
    }
    return getStops.cache;
  }
  window.getStops=getStops;

  async function getETAs(stopId){
    const r=await fetch(API.STOP_ETA(stopId)), j=await r.json();
    return j.data||[];
  }

  function parseStopInfo(name){
    let title=name, platform='', stopCode='';
    const rx=/[\(（]([^\)）]*)[\)）]/g;
    let m;
    while((m=rx.exec(name))!==null){
      const raw=m[0], inner=m[1].trim(), up=inner.toUpperCase();
      if(!platform && /^[A-Z]\d{1,2}$/.test(up)){
        platform=up; title=title.replace(raw,'');
      } else if(!stopCode && /^[A-Z]{2}\d{3}$/.test(up)){
        stopCode=up; title=title.replace(raw,'');
      }
    }
    return { title:title.trim(), platform, stopCode };
  }

  function formatTimeOnly(iso){
    return iso
      ? new Date(iso).toLocaleTimeString('en-GB',{
          hour12:false, hour:'2-digit',
          minute:'2-digit', second:'2-digit'
        })
      : '';
  }

  function parseRouteStr(r){
    const m=r.match(/^([A-Za-z]*)(\d+)([A-Za-z]*)$/);
    return m?{prefix:m[1],num:+m[2],suffix:m[3]}:{prefix:r,num:0,suffix:''};
  }
  function compareRoute(a,b){
    const x=parseRouteStr(a.route), y=parseRouteStr(b.route);
    if(x.prefix!==y.prefix) return x.prefix.localeCompare(y.prefix);
    if(x.num!==y.num) return x.num-y.num;
    return x.suffix.localeCompare(y.suffix);
  }
  function routeTagClass(r){
    const up=r.toUpperCase(),{prefix,num}=parseRouteStr(up);
    if(prefix==='A') return 'route-A';
    if(/^[ES]/.test(prefix)) return 'route-ES';
    if(prefix==='HK') return 'route-HK';
    if(prefix==='N') return 'route-N';
    if(num>=100&&num<200) return 'route-1XX';
    if(num>=300&&num<400) return 'route-3XX';
    if(num>=600&&num<700) return 'route-6XX';
    if(num>=900&&num<1000)
      return prefix==='P'?'route-P9XX':'route-9XX';
    return 'route-normal';
  }
  function isMobile(){ return window.innerWidth<=576; }

  let kmbRowsData=[];

  window.buildKMB=async function(){
    const currentLang=window.getLang(); // Get current lang from app.js global
    const L=window.ALL_LANGS_DATA.kmb[currentLang]; // Access centralized lang data
    const suffix=SUFFIX[currentLang];

    const stopIn=document.getElementById('stopName').value
                     .trim().toLowerCase();
    const rawR=document.getElementById('routeNumbers').value
                     .trim().toUpperCase();
    const filter=rawR.split(',').map(r=>r.trim()).filter(Boolean);
    const results=document.getElementById('results');
    results.innerHTML='';

    const allStops=await getStops();
    const matches=allStops.filter(s=>
      s.name_en.toLowerCase().includes(stopIn)||
      s.name_tc.toLowerCase().includes(stopIn)||
      s.name_sc.toLowerCase().includes(stopIn)
    );
    if(!matches.length){
      results.textContent=L.noEtas; // L.noEtas is still accessed via the specific lang, it's not a common string.
      return;
    }

    const groups={};
    matches.forEach(s=>{
      const full=s[`name_${currentLang}`], // Use currentLang here
            info=parseStopInfo(full);
      if(!info.stopCode) info.stopCode=parseStopInfo(s.name_en).stopCode;
      (groups[info.title]=groups[info.title]||[]).push({
        stopId:s.stop, platform:info.platform, stopCode:info.stopCode
      });
    });

    for(const [title,infos] of Object.entries(groups)){
      const etasArr=await Promise.all(infos.map(i=>getETAs(i.stopId)));
      const rows=[];
      infos.forEach((info,idx)=>{
        let data=etasArr[idx];
        if(filter.length){
          data=data.filter(e=>filter.includes(e.route.toUpperCase()));
        }
        const byKey={};
        data.forEach(e=>{
          const key=`${e.route}|${e.dest_en}`;
          (byKey[key]=byKey[key]||[]).push(e);
        });
        Object.values(byKey).forEach(ent=>{
          ent.sort((a,b)=>a.eta_seq-b.eta_seq);
          const svcOrder=['1','2','3'], chosen=[];
          for(const svc of svcOrder){
            const tmp=ent.filter(x=>String(x.service_type)===svc&&x.eta);
            if(tmp.length){ chosen.push(...tmp); break; }
          }
          if(!chosen.length) chosen.push(...ent.filter(x=>x.eta));
          const sliced=[chosen[0]||{},chosen[1]||{},chosen[2]||{}];
          const base=chosen[0]||ent[0]||{};
          const numberedRemarks=sliced
            .filter(x=>x.eta&&x.rmk_en!=='Scheduled Bus'&&x[`rmk_${suffix}`])
            .map(x=>`ETA${x.eta_seq}: ${x[`rmk_${suffix}`]}`);
          const noetaRemarks=ent
            .filter(x=>x.rmk_en!=='Scheduled Bus'&&x[`rmk_${suffix}`])
            .map(x=>x[`rmk_${suffix}`]);

          rows.push({
            stopId:info.stopId, route:base.route,
            dest:base[`dest_${suffix}`], platform:info.platform,
            stopCode:info.stopCode, etas:sliced,
            numberedRemarks, noetaRemarks,
            serviceType:base.service_type
          });
        });
      });

      rows.sort((a,b)=>{
        const aHas=a.etas.some(e=>e.eta),
              bHas=b.etas.some(e=>e.eta);
        if(aHas!==bHas) return aHas?-1:1;
        return compareRoute(a,b);
      });

      const h3=document.createElement('h3');
      h3.textContent=title;
      results.appendChild(h3);

      if(isMobile()){
        rows.forEach(r=>{
          const card=document.createElement('div');
          card.className='mobile-card fade-in mobile-kmb';

          const cRoute=document.createElement('div');
          cRoute.className='mobile-route';
          const tag=document.createElement('span');
          tag.className='route-tag '+routeTagClass(r.route);
          tag.textContent=r.route;
          cRoute.appendChild(tag);

          const cDest=document.createElement('div');
          cDest.className=
            'mobile-dest'+(r.etas.every(e=>!e.eta)?' mobile-noeta-text':'');
          cDest.textContent=r.dest;

          // PLATFORM: Create wrapper div. Only add inner circle if platform data exists.
          const cPlatform=document.createElement('div');
          cPlatform.className='mobile-platform';
          if (r.platform) {
            const circle=document.createElement('span');
            circle.className='platform-circle'; // This class is needed for platform circle styling
            circle.textContent=r.platform;
            cPlatform.appendChild(circle);
          }
          // If r.platform is empty, cPlatform will be an empty div, which results in 0 measured width.

          const cTimes=document.createElement('div');
          cTimes.className='mobile-times';
          if(r.etas.some(e=>e.eta)){
            r.etas.filter(e=>e.eta).forEach((e,i)=>{
              const d=document.createElement('div');
              d.className='eta-time'+(i===0?' eta-first':'');
              if(i>0&&e.rmk_en==='Scheduled Bus')
                d.classList.add('scheduled-eta');
              d.textContent=formatTimeOnly(e.eta);
              cTimes.appendChild(d);
            });
          }

          // META: Group cPlatform and cTimes (or button)
          const meta=document.createElement('div');
          meta.className='mobile-meta';
          meta.append(cPlatform); // Always append platform wrapper; it will be empty if no data

          if(r.etas.some(e=>e.eta)){
            meta.append(cTimes); // If ETAs, append times to meta
          } else {
            const btn=document.createElement('button');
            btn.className='mobile-toggle-btn warning';
            btn.setAttribute('aria-label','Toggle details');
            btn.innerHTML='&#9888;';
            btn.addEventListener('click', toggleDetails);
            meta.append(btn); // If no ETAs, append button to meta
          }

          card.append(cRoute, cDest, meta); // Card now appends route, dest, and the meta wrapper

          function toggleDetails(evt){
            if(evt) evt.stopPropagation();
            const nx=card.nextElementSibling;
            if(nx&&nx.classList.contains('mobile-details')){
              nx.remove(); card.classList.remove('expanded');
            } else {
              const md=document.createElement('div');
              md.className='mobile-details';
              md.innerHTML=
                `<div><strong>Stop Code:</strong> ${
                  r.stopCode||'N/A'
                }</div>`+
                `<div><strong>Platform:</strong> ${
                  r.platform||'N/A'
                }</div>`+
                `<div><strong>Remarks:</strong> ${
                  r.etas.some(e=>e.eta)
                    ? r.numberedRemarks.join('; ')
                    : L.noEtas
                }</div>`;
              card.insertAdjacentElement('afterend', md);
              card.classList.add('expanded');
            }
          }

          if(r.etas.some(e=>e.eta)){
            card.addEventListener('dblclick', toggleDetails);
          } else {
             // Button already added to meta, no need for separate listener on card for no-ETA cases.
          }

          results.appendChild(card);

          kmbRowsData.push({
            stopId:r.stopId, route:r.route,
            serviceType:r.serviceType, mobileContainer:cTimes
          });
        });

        window.alignMobileColumns();
      } else {
        // desktop table rendering...
        const wrap=document.createElement('div');
        wrap.className='eta-table-container';
        const table=document.createElement('table');
        table.className='eta-results';
        const showPlat=rows.some(r=>r.platform);
        const hdrs=[
          LANGS.en.tableHeaders.Route, // Access via base english for desktop headers
          LANGS.en.tableHeaders.Destination,
          ...(showPlat?[LANGS.en.tableHeaders.Platform]:[]),
          LANGS.en.tableHeaders.StopCode,
          LANGS.en.tableHeaders.ETA1,
          LANGS.en.tableHeaders.ETA2,
          LANGS.en.tableHeaders.ETA3,
          LANGS.en.tableHeaders.Remarks
        ];
        table.innerHTML=`<thead><tr>${
          hdrs.map(h=>`<th>${h}</th>`).join('')
        }</tr></thead>`;
        const tbody=document.createElement('tbody');
        rows.forEach(r=>{
          const noEta=!r.etas.some(e=>e.eta);
          const tr=document.createElement('tr');
          tr.className=noEta?'no-eta-row eta-data-row':'eta-data-row';

          const tdRt=document.createElement('td');
          tdRt.className='eta-route-cell';
          const spn=document.createElement('span');
          spn.className='route-tag '+routeTagClass(r.route);
          spn.textContent=r.route;
          tdRt.appendChild(spn);
          tr.appendChild(tdRt);

          const tdD=document.createElement('td');
          tdD.textContent=r.dest;
          if(noEta) tdD.classList.add('no-eta-text');
          tr.appendChild(tdD);

          if(showPlat){
            const tdP=document.createElement('td');
            tdP.textContent=r.platform;
            if(noEta) tdP.classList.add('no-eta-text');
            tr.appendChild(tdP);
          }

          const tdC=document.createElement('td');
          tdC.textContent=r.stopCode;
          if(noEta) tdC.classList.add('no-eta-text');
          tr.appendChild(tdC);

          if(noEta){
            const tdR=document.createElement('td');
            tdR.colSpan=4+(showPlat?1:0);
            tdR.className='remark-only-cell';
            tdR.textContent=r.noetaRemarks[0]||L.noEtas; // L.noEtas here is correct for message
            tr.appendChild(tdR);
          } else {
            r.etas.forEach((e,i)=>{
              const td=document.createElement('td');
              td.className='desktop-eta-cell'+(i===0?' eta-first':'');
              td.textContent=formatTimeOnly(e.eta);
              if(i>0&&e.rmk_en==='Scheduled Bus')
                td.classList.add('scheduled-eta');
              tr.appendChild(td);
            });
            const tdR=document.createElement('td');
            tdR.textContent=r.numberedRemarks.join('; ');
            tr.appendChild(tdR);
            kmbRowsData.push({
              stopId:r.stopId, route:r.route,
              serviceType:r.serviceType,
              etaCells:Array.from(
                tr.querySelectorAll('.desktop-eta-cell')
              ),
              remCell:tdR
            });
          }
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        wrap.appendChild(table);
        results.appendChild(wrap);
      }
    }
  };
  // Removed updateKMBText, moved to app.js
})();