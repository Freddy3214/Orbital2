// User-initiated sharing only. No automatic posting, trackers or third-party scripts.
const isEnglish=()=>document.documentElement.lang==='en';
for(const button of document.querySelectorAll('[data-share-game]'))button.addEventListener('click',async()=>{
  const status=button.parentElement.querySelector('[data-share-status]')||document.querySelector('[data-share-status]');
  const say=text=>{if(status)status.textContent=text;};
  const url=new URL('/discover.html',location.origin);url.searchParams.set('utm_source','player');url.searchParams.set('utm_medium','share');
  const data={title:'Orbital Foundry',text:'Free browser space strategy — early alpha. Build colonies, research and command fleets. Try the demo without an account.',url:url.href};
  button.disabled=true;
  try {
    if(navigator.share){await navigator.share(data);say(isEnglish()?'Sharing window completed.':'Teilen abgeschlossen.');}
    else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url.href);say(isEnglish()?'Invite link copied.':'Einladungslink kopiert.');}
    else say((isEnglish()?'Copy this link: ':'Diesen Link kopieren: ')+url.href);
  }catch(error){if(error.name!=='AbortError')say((isEnglish()?'Copy this link: ':'Diesen Link kopieren: ')+url.href);}
  finally{button.disabled=false;}
});
