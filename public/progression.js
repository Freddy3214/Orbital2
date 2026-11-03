export const DAILY_GOALS = [
 {id:"scout",label:"Drei verschiedene Welten ausspionieren",target:3},
 {id:"victory",label:"Einen Flottenkampf gewinnen",target:1},
 {id:"salvage",label:"Ein Trümmerfeld erfolgreich bergen",target:1}
];
export function progression(state, now=Date.now()){
 const day=new Date(now).toISOString().slice(0,10),season=day.slice(0,7);
 const old=state.progression || {};
 state.progression={
  season,points:old.season===season?Math.max(0,Number(old.points)||0):0,
  unlocked:Array.isArray(old.unlocked)?old.unlocked.filter(x=>x==="aurora"):[],
  skin:old.skin==="aurora" && old.unlocked?.includes("aurora")?"aurora":"classic",
  daily:old.daily?.day===day?old.daily:{day,scanned:[],victory:0,salvage:0,claimed:[]}
 };
 return state.progression;
}
export function recordProgress(state,kind,target,now=Date.now()){
 const p=progression(state,now),d=p.daily;
 if(kind==="scout")d.scanned=[...new Set([...(d.scanned||[]),String(target)])].slice(0,3);
 if(kind==="victory"||kind==="salvage")d[kind]=1;
 return p;
}
export function claimProgress(state,id,now=Date.now()){
 const p=progression(state,now),d=p.daily;
 const goal=DAILY_GOALS.find(x=>x.id===id),value=id==="scout"?(d.scanned||[]).length:d[id]||0;
 if(!goal||value<goal.target||d.claimed.includes(id))throw Object.assign(new Error("Dieses Tagesziel kann noch nicht oder nicht erneut abgeholt werden."),{status:400});
 d.claimed.push(id);p.points+=100;
 if(p.points>=300&&!p.unlocked.includes("aurora"))p.unlocked.push("aurora");
 return p;
}
