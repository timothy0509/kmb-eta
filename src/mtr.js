// src/mtr.js
;(function(){
  const LANGS = {
    en:{
      inputLabel:'Station Code / Name',
      inputPlaceholder:'e.g. TIK  Tiu Keng Leng',
      searchButton:'Search Trains',
      noData:'No train data available',
      tableHeaders:{Destination:'Destination',Platform:'Platform',Time:'Time'}
    },
    tc:{
      inputLabel:'站點代號 / 名稱',
      inputPlaceholder:'例如：TIK  調景嶺',
      searchButton:'查詢列車',
      noData:'沒有列車資料',
      tableHeaders:{Destination:'目的地',Platform:'月台',Time:'時間'}
    },
    sc:{
      inputLabel:'站点编号 / 名称',
      inputPlaceholder:'例如：TIK  调景岭',
      searchButton:'查询列车',
      noData:'没有列车资料',
      tableHeaders:{Destination:'目的地',Platform:'站台',Time:'时间'}
    }
  };

  const API = (line,sta,lang='en') =>
    `https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php`+
    `?line=${encodeURIComponent(line)}`+
    `&sta=${encodeURIComponent(sta)}`+
    `&lang=${encodeURIComponent(lang)}`;

  // MTR station dictionary (abbreviated, include all codes in your real file)
  const STATIONS = {
    AEL:{name:'Airport Express Line',type:'line'},
    TCL:{name:'Tung Chung Line',type:'line'},
    TML:{name:'Tuen Ma Line',type:'line'},
    TKL:{name:'Tseung Kwan O Line',type:'line'},
    EAL:{name:'East Rail Line',type:'line'},
    SIL:{name:'South Island Line',type:'line'},
    TWL:{name:'Tsuen Wan Line',type:'line'},
    ISL:{name:'Island Line',type:'line'},
    KTL:{name:'Kwun Tong Line',type:'line'},
    DRL:{name:'Disneyland Resort Line',type:'line'},
    AIR:{name:'Airport',lines:['AEL']},
    AWE:{name:'AsiaWorld Expo',lines:['AEL']},
    HOK:{name:'Hong Kong',lines:['AEL','TCL']},
    KOW:{name:'Kowloon',lines:['AEL','TCL']},
    TSY:{name:'Tsing Yi',lines:['AEL','TCL']},
    OLY:{name:'Olympic',lines:['TCL']},
    NAC:{name:'Nam Cheong',lines:['TCL','TML']},
    LAK:{name:'Lai King',lines:['TCL','TWL']},
    TUC:{name:'Tung Chung',lines:['TCL']},
    SUN:{name:'Sunny Bay',lines:['TCL','DRL']},
    WKS:{name:'Wu Kai Sha',lines:['TML']},
    MOS:{name:'Ma On Shan',lines:['TML']},
    HEO:{name:'Heng On',lines:['TML']},
    TSH:{name:'Tai Shui Hang',lines:['TML']},
    SHM:{name:'Shek Mun',lines:['TML']},
    CIO:{name:'City One',lines:['TML']},
    STW:{name:'Sha Tin Wai',lines:['TML']},
    CKT:{name:'Che Kung Temple',lines:['TML']},
    TAW:{name:'Tai Wai',lines:['TML','EAL']},
    HIK:{name:'Hin Keng',lines:['TML']},
    DIH:{name:'Diamond Hill',lines:['TML','KTL']},
    KAT:{name:'Kai Tak',lines:['TML']},
    SUW:{name:'Sung Wong Toi',lines:['TML']},
    TKW:{name:'To Kwa Wan',lines:['TML']},
    HOM:{name:'Ho Man Tin',lines:['TML','KTL']},
    HUH:{name:'Hung Hom',lines:['TML','EAL']},
    ETS:{name:'East Tsim Sha Tsui',lines:['TML']},
    MEF:{name:'Mei Foo',lines:['TML','TWL']},
    TWW:{name:'Tsuen Wan West',lines:['TML']},
    KSR:{name:'Kam Sheung Road',lines:['TML']},
    YUL:{name:'Yuen Long',lines:['TML']},
    LOP:{name:'Long Ping',lines:['TML']},
    TIS:{name:'Tin Shui Wai',lines:['TML']},
    SIH:{name:'Siu Hong',lines:['TML']},
    TUM:{name:'Tuen Mun',lines:['TML']},
    NOP:{name:'North Point',lines:['TKL','ISL']},
    QUB:{name:'Quarry Bay',lines:['TKL','ISL']},
    YAT:{name:'Yau Tong',lines:['TKL','KTL']},
    TIK:{name:'Tiu Keng Leng',lines:['TKL','KTL']},
    TKO:{name:'Tseung Kwan O',lines:['TKL']},
    LHP:{name:'LOHAS Park',lines:['TKL']},
    HAH:{name:'Hang Hau',lines:['TKL']},
    POA:{name:'Po Lam',lines:['TKL']},
    ADM:{name:'Admiralty',lines:['EAL','SIL','TWL','ISL']},
    EXC:{name:'Exhibition Centre',lines:['EAL']},
    MKK:{name:'Mong Kok East',lines:['EAL']},
    KOT:{name:'Kowloon Tong',lines:['EAL','KTL']},
    SHT:{name:'Sha Tin',lines:['EAL']},
    FOT:{name:'Fo Tan',lines:['EAL']},
    RAC:{name:'Racecourse',lines:['EAL']},
    UNI:{name:'University',lines:['EAL']},
    TAP:{name:'Tai Po Market',lines:['EAL']},
    TWO:{name:'Tai Wo',lines:['EAL']},
    FAN:{name:'Fanling',lines:['EAL']},
    SHS:{name:'Sheung Shui',lines:['EAL']},
    LOW:{name:'Lo Wu',lines:['EAL']},
    LMC:{name:'Lok Ma Chau',lines:['EAL']},
    OCP:{name:'Ocean Park',lines:['SIL']},
    WCH:{name:'Wong Chuk Hang',lines:['SIL']},
    LET:{name:'Lei Tung',lines:['SIL']},
    SOH:{name:'South Horizons',lines:['SIL']},
    CEN:{name:'Central',lines:['TWL','ISL']},
    TST:{name:'Tsim Sha Tsui',lines:['TWL']},
    JOR:{name:'Jordan',lines:['TWL']},
    YMT:{name:'Yau Ma Tei',lines:['TWL','KTL']},
    MOK:{name:'Mong Kok',lines:['TWL','KTL']},
    PRE:{name:'Prince Edward',lines:['TWL','KTL']},
    SSP:{name:'Sham Shui Po',lines:['TWL']},
    CSW:{name:'Cheung Sha Wan',lines:['TWL']},
    LCK:{name:'Lai Chi Kok',lines:['TWL']},
    KWF:{name:'Kwai Fong',lines:['TWL']},
    KWH:{name:'Kwai Hing',lines:['TWL']},
    TWH:{name:'Tai Wo Hau',lines:['TWL']},
    WHA:{name:'Whampoa',lines:['KTL']},
    SKM:{name:'Shek Kip Mei',lines:['KTL']},
    LOF:{name:'Lok Fu',lines:['KTL']},
    WTS:{name:'Wong Tai Sin',lines:['KTL']},
    CHH:{name:'Choi Hung',lines:['KTL']},
    KOB:{name:'Kowloon Bay',lines:['KTL']},
    NTK:{name:'Ngau Tau Kok',lines:['KTL']},
    KWT:{name:'Kwun Tong',lines:['KTL']},
    LAT:{name:'Lam Tin',lines:['KTL']},
    KET:{name:'Kennedy Town',lines:['ISL']},
    HKU:{name:'HKU',lines:['ISL']},
    SYP:{name:'Sai Ying Pun',lines:['ISL']},
    SHW:{name:'Sheung Wan',lines:['ISL']},
    WAC:{name:'Wan Chai',lines:['ISL']},
    CAB:{name:'Causeway Bay',lines:['ISL']},
    TIH:{name:'Tin Hau',lines:['ISL']},
    FOH:{name:'Fortress Hill',lines:['ISL']},
    TAK:{name:'Tai Koo',lines:['ISL']},
    SWH:{name:'Sai Wan Ho',lines:['ISL']},
    SKW:{name:'Shau Kei Wan',lines:['ISL']},
    HFC:{name:'Heng Fa Chuen',lines:['ISL']},
    CHW:{name:'Chai Wan',lines:['ISL']},
    DIS:{name:'Disneyland Resort',lines:['DRL']}
  };


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

  function getLang(){
    return document.querySelector('.lang-switch button.active').dataset.value;
  }
  function isMobile(){ return window.innerWidth<=576; }

  window.updateMTRText = function(){
    const L = LANGS[getLang()];
    document.getElementById('labelStopName').textContent = L.inputLabel;
    document.getElementById('stopName').placeholder = L.inputPlaceholder;
    document.querySelector('.controls button').textContent = L.searchButton;
  };

  window.buildMTR = async function(){
    const lang=getLang(), L=LANGS[lang];
    const inp=document.getElementById('stopName').value.trim();
    const results=document.getElementById('results');
    results.innerHTML='';

    if(!inp){
      results.textContent=L.noData;
      return;
    }
    const low=inp.toLowerCase();
    let sta=null, lines=[];
    const up=inp.toUpperCase();
    if(/^[A-Za-z]{3}$/.test(up) && STATIONS[up]?.lines){
      sta=up; lines=STATIONS[up].lines.slice();
    }
    if(!sta){
      const nameKey = Object.entries(STATIONS)
        .find(([c,i])=>i.name.toLowerCase()===low);
      if(nameKey){
        sta=nameKey[0];
        lines=STATIONS[sta].lines.slice();
      }
    }
    if(!sta){
      results.textContent=L.noData;
      return;
    }

    let any=false;
    for(const line of lines){
      try{
        const res=await fetch(API(line,sta,lang)),
              j=await res.json();
        const key=`${line}-${sta}`;
        if(j.status===1 && j.data?.[key]){
          any=true;
          renderBlock(j.data[key], line);
        }
      }catch(e){
        console.warn('MTR error',e);
      }
    }
    if(!any){
      results.textContent=L.noData;
    }
  };

  function renderBlock(block,line){
    const lang=getLang(), L=LANGS[lang];
    const results=document.getElementById('results');
    const col=LINE_COLOR[line]||'#000', fg=contrastColor(col);
    const lineName=STATIONS[line].name;

    ['UP','DOWN'].forEach(dir=>{
      const arr=block[dir]||[];
      if(!arr.length) return;

      // Unique destinations
      const dests = Array.from(new Set(arr.map(e=>e.dest)))
        .map(d=>STATIONS[d]?.name||d)
        .join(' / ');

      // Title
      const h3 = document.createElement('h3');
      const spanLine = document.createElement('span');
      spanLine.textContent = lineName;
      spanLine.style.backgroundColor = col;
      spanLine.style.color = fg;
      spanLine.style.padding = '0.2em 0.5em';
      spanLine.style.borderRadius = '4px';
      h3.appendChild(spanLine);
      h3.append(` → ${dests}`);
      results.appendChild(h3);

      if(isMobile()){
        arr.forEach(e=>{
          const card=document.createElement('div');
          card.className='mobile-card fade-in';

          const destDiv=document.createElement('div');
          destDiv.className='mobile-dest';
          destDiv.textContent = STATIONS[e.dest]?.name || e.dest;

          const meta=document.createElement('div');
          meta.className='mobile-meta';
          const circle=document.createElement('span');
          circle.className='platform-circle';
          circle.textContent=e.plat;
          circle.style.backgroundColor=col;
          circle.style.color=fg;
          const tspan=document.createElement('span');
          tspan.className='eta-time';
          tspan.style.fontSize='1.1em';
          tspan.textContent=(e.time||'').split(' ')[1]||e.time;
          meta.append(circle,tspan);

          card.append(destDiv, meta);
          results.appendChild(card);
        });
      } else {
        // Desktop: one table per direction
        const h4 = document.createElement('h4');
        h4.textContent=dir;
        h4.style.marginTop='1em';
        results.appendChild(h4);

        const wrap=document.createElement('div');
        wrap.className='eta-table-container';
        const table=document.createElement('table');
        table.className='eta-results';
        const hdrs=[L.tableHeaders.Destination,L.tableHeaders.Platform,L.tableHeaders.Time];
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