// src/lr.js
;(function(){
  const LANGS = {
    en:{inputLabel:'Light Rail Stop Name',inputPlaceholder:'e.g. Butterfly',searchButton:'Search Trains',noData:'No train data available',tableHeaders:{Route:'Route',Destination:'Destination',Time:'Time'}},
    tc:{inputLabel:'輕鐵站名',inputPlaceholder:'例如：蝴蝶',searchButton:'查詢列車',noData:'沒有列車資料',tableHeaders:{Route:'路線',Destination:'目的地',Time:'時間'}},
    sc:{inputLabel:'轻铁站名',inputPlaceholder:'例如：蝴蝶',searchButton:'查询列车',noData:'没有列车资料',tableHeaders:{Route:'路线',Destination:'目的地',Time:'时间'}}
  };

  const API = id => `https://rt.data.gov.hk/v1/transport/mtr/lrt/getSchedule?station_id=${encodeURIComponent(id)}`;

  const STOPS = {
    'Tuen Mun Ferry Pier':1,'Melody Garden':10,'Butterfly':15,'Light Rail Depot':20,'Lung Mun':30,
    'Tsing Shan Tsuen':40,'Tsing Wun':50,'Kin On':60,'Ho Tin':70,'Choy Yee Bridge':75,'Affluence':80,
    'Tuen Mun Hospital':90,'Siu Hong':100,'Kei Lun':110,'Ching Chung':120,'Kin Sang':130,'Tin King':140,
    'Leung King':150,'San Wai':160,'Shek Pai':170,'Shan King (North)':180,'Shan King (South)':190,
    'Ming Kum':200,'Tai Hing (North)':212,'Tai Hing (South)':220,'Ngan Wai':230,'Siu Hei':240,
    'Tuen Mun Swimming Pool':250,'Goodview Garden':260,'Siu Lun':265,'On Ting':270,'Yau Oi':275,
    'Town Centre':280,'Tuen Mun':295,'Pui To':300,'Hoh Fuk Tong':310,'San Hui':320,'Prime View':330,
    'Fung Tei':340,'Lam Tei':350,'Nai Wai':360,'Chung Uk Tsuen':370,'Hung Shui Kiu':380,
    'Tong Fong Tsuen':390,'Ping Shan':400,'Hang Mei Tsuen':425,'Tin Shui Wai':430,'Tin Tsz':435,
    'Tin Yiu':445,'Locwood':448,'Tin Wu':450,'Ginza':455,'Tin Shui':460,'Chung Fu':468,
    'Tin Fu':480,'Chestwood':490,'Tin Wing':500,'Tin Yuet':510,'Tin Sau':520,'Wetland Park':530,
    'Tin Heng':540,'Tin Yat':550,'Shui Pin Wai':560,'Fung Nin Road':570,'Hong Lok Road':580,
    'Tai Tong Road':590,'Yuen Long':600,'Sam Shing':920
  };
  const NAME_TO_ID = {};
  Object.entries(STOPS).forEach(([n,i])=>NAME_TO_ID[n.toLowerCase()]=i);

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

  window.updateLRText = function(){
    const L=LANGS[getLang()];
    document.getElementById('labelStopName').textContent=L.inputLabel;
    document.getElementById('stopName').placeholder=L.inputPlaceholder;
    document.querySelector('.controls button').textContent=L.searchButton;
  };

  window.buildLR = async function(){
    const lang=getLang(),L=LANGS[lang];
    const raw=document.getElementById('stopName').value.trim().toLowerCase();
    const results=document.getElementById('results');
    results.innerHTML='';

    const stationId=NAME_TO_ID[raw];
    if(stationId==null){ results.textContent=L.noData; return; }

    try{
      const res=await fetch(API(stationId)),j=await res.json();
      if(j.status!==1||!j.platform_list?.length){
        results.textContent=L.noData; return;
      }
      j.platform_list.forEach(p=>{
        const h3=document.createElement('h3');
        h3.textContent=`Platform ${p.platform_id}`;
        results.appendChild(h3);

        if(isMobile()){
          p.route_list.forEach(e=>{
            const card=document.createElement('div');
            card.className='mobile-card fade-in';

            // left: route+dest
            const left=document.createElement('div');
            left.style.display='flex';
            left.style.alignItems='center';
            left.style.gap='8px';
            const tag=document.createElement('span');
            tag.className='route-tag';
            tag.textContent=e.route_no;
            const bg=COLORS[e.route_no],fg=bg?contrastColor(bg):'#000';
            if(bg){tag.style.backgroundColor=bg;tag.style.color=fg;}
            const dest=document.createElement('span');
            dest.className='mobile-dest';
            dest.textContent=lang==='en'?e.dest_en:e.dest_ch;
            left.append(tag,dest);

            // right: circle+ETA
            const meta=document.createElement('div');
            meta.className='mobile-meta';

            const circle=document.createElement('span');
            circle.className='platform-circle';
            circle.textContent=p.platform_id;
            circle.style.backgroundColor=bg;circle.style.color=fg;
            meta.append(circle);

            const tspan=document.createElement('span');
            tspan.className='eta-time';
            tspan.style.fontSize='1.1em';
            tspan.textContent=lang==='en'?e.time_en:e.time_ch;
            meta.append(tspan);

            card.append(left,meta);
            results.appendChild(card);
          });
        } else {
          const wrap=document.createElement('div');
          wrap.className='eta-table-container';
          const table=document.createElement('table');
          table.className='eta-results';
          const hdrs=[L.tableHeaders.Route,L.tableHeaders.Destination,L.tableHeaders.Time];
          table.innerHTML=`<thead><tr>${
            hdrs.map(h=>`<th>${h}</th>`).join('')
          }</tr></thead>`;
          const tbody=document.createElement('tbody');
          p.route_list.forEach(e=>{
            const tr=document.createElement('tr');
            const tdR=document.createElement('td'),sp=document.createElement('span');
            sp.className='route-tag';
            sp.textContent=e.route_no;
            const bg=COLORS[e.route_no],fg=bg?contrastColor(bg):'#000';
            if(bg){sp.style.backgroundColor=bg;sp.style.color=fg;}
            tdR.appendChild(sp);tr.appendChild(tdR);

            const tdD=document.createElement('td');
            tdD.textContent=lang==='en'?e.dest_en:e.dest_ch;
            tr.appendChild(tdD);

            const tdT=document.createElement('td');
            tdT.textContent=lang==='en'?e.time_en:e.time_ch;
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
      results.textContent=L.noData;
    }
  };
})();