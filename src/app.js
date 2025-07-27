// src/app.js

function getMode(){ return document.querySelector('.mode-switch button.active').dataset.value; }
function getLang(){ return document.querySelector('.lang-switch button.active').dataset.value; }
function updateUIByMode(){
  const mode=getMode();
  const routeDiv=document.getElementById('routeNumbers').parentElement;
  const stopIn=document.getElementById('stopName');
  if(mode==='kmb'){
    routeDiv.style.display=''; stopIn.setAttribute('list','stopsList');
  } else {
    routeDiv.style.display='none'; stopIn.removeAttribute('list');
  }
}

let refreshTimer=null, hasBuilt=false;
window.initialBuild=function(){
  if(refreshTimer) clearInterval(refreshTimer);
  const m=getMode();
  if(m==='kmb'){
    window.buildKMB(); refreshTimer=setInterval(window.refreshKMB,30000);
  } else if(m==='mtr'){
    window.buildMTR(); refreshTimer=setInterval(window.buildMTR,30000);
  } else {
    window.buildLR(); refreshTimer=setInterval(window.buildLR,30000);
  }
};

// ripple
document.addEventListener('click',e=>{
  const btn=e.target.closest('.ripple');
  if(!btn) return;
  const r=btn.getBoundingClientRect();
  btn.style.setProperty('--ripple-x',`${e.clientX-r.left}px`);
  btn.style.setProperty('--ripple-y',`${e.clientY-r.top}px`);
  btn.classList.remove('animate');
  void btn.offsetWidth;
  btn.classList.add('animate');
});

// theme
const themeToggle=document.getElementById('themeToggle');
themeToggle.checked=document.documentElement.classList.contains('dark-mode');
themeToggle.addEventListener('change',e=>{
  document.documentElement.classList.toggle('dark-mode',e.target.checked);
  localStorage.setItem('theme',e.target.checked?'dark':'light');
});

document.addEventListener('DOMContentLoaded',()=>{
  // populate datalist
  window.getStops().then(stops=>{
    const dl=document.getElementById('stopsList');
    stops.forEach(s=>{
      const opt=document.createElement('option');opt.value=s.name_en;dl.appendChild(opt);
    });
  });

  // mode switch
  document.querySelectorAll('.mode-switch button').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.mode-switch button')
        .forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      updateUIByMode();
      const m=getMode();
      if(m==='kmb') window.updateKMBText();
      else if(m==='mtr') window.updateMTRText();
      else window.updateLRText();
      if(hasBuilt) window.initialBuild();
    });
  });

  // lang switch
  document.querySelectorAll('.lang-switch button').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.lang-switch button')
        .forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const m=getMode();
      if(m==='kmb') window.updateKMBText();
      else if(m==='mtr') window.updateMTRText();
      else window.updateLRText();
      if(hasBuilt) window.initialBuild();
    });
  });

  // form submit
  const sf=document.getElementById('searchForm');
  sf.addEventListener('submit',ev=>{
    ev.preventDefault();
    const m=getMode();
    if(m==='kmb') window.updateKMBText();
    else if(m==='mtr') window.updateMTRText();
    else window.updateLRText();
    localStorage.setItem('lastSearch',JSON.stringify({
      mode:getMode(),lang:getLang(),
      stopName:document.getElementById('stopName').value.trim(),
      routeNumbers:document.getElementById('routeNumbers')?.value.trim()||''
    }));
    hasBuilt=true; window.initialBuild();
  });

  // restore
  const last=localStorage.getItem('lastSearch');
  if(last){
    try{
      const {mode,lang,stopName,routeNumbers}=JSON.parse(last);
      document.querySelectorAll('.mode-switch button')
        .forEach(b=>b.classList.toggle('active',b.dataset.value===mode));
      document.querySelectorAll('.lang-switch button')
        .forEach(b=>b.classList.toggle('active',b.dataset.value===lang));
      updateUIByMode();
      if(mode==='kmb') window.updateKMBText();
      else if(mode==='mtr') window.updateMTRText();
      else window.updateLRText();
      document.getElementById('stopName').value=stopName;
      if(mode==='kmb') document.getElementById('routeNumbers').value=routeNumbers;
      hasBuilt=true; window.initialBuild();
    }catch(e){
      console.error(e); updateUIByMode(); window.updateKMBText();
    }
  } else {
    updateUIByMode(); window.updateKMBText();
  }
});