// Shared by browser and server: one source for unit balance.
export const WORLD_SPEED = 10;
// A fixed transition avoids granting tenfold resources for time before deployment.
export const SPEED_START_AT = Date.parse("2026-10-06T08:00:00Z");
export function worldSpeedAt(at = Date.now()) { return at >= SPEED_START_AT ? WORLD_SPEED : 1; }
export const FLEET = {
  cargoDrone: { power:4, cargo:850, cost:{metal:180,crystal:80,tritium:40} }, interceptor:{power:45,cargo:120,cost:{metal:270,crystal:160,tritium:80}},
  recycler:{name:"Recycler",power:1,cargo:20000,level:4,minimumBuildTimeMs:600000,cost:{metal:3000,crystal:2000,tritium:800}},
  smallTransport:{name:"Kleiner Transporter",power:8,cargo:25000,level:2,minimumBuildTimeMs:120000,cost:{metal:450,crystal:220,tritium:60}},
  mediumTransport:{name:"Mittlerer Transporter",power:25,cargo:100000,level:4,minimumBuildTimeMs:360000,cost:{metal:1800,crystal:900,tritium:250}},
  largeTransport:{name:"Großer Transporter",power:70,cargo:250000,level:6,minimumBuildTimeMs:900000,cost:{metal:7200,crystal:3600,tritium:1000}},
  frigate:{name:"Fregatte",power:180,cargo:400,level:3,minimumBuildTimeMs:480000,cost:{metal:1200,crystal:650,tritium:300}},
  cruiser:{name:"Kreuzer",power:650,cargo:1200,level:5,minimumBuildTimeMs:1200000,cost:{metal:4200,crystal:2600,tritium:1000}},
  battleship:{name:"Schlachtschiff",power:2400,cargo:3500,level:8,minimumBuildTimeMs:2100000,cost:{metal:16000,crystal:9000,tritium:4000}},
  destroyer:{name:"Zerstörer",power:7000,cargo:6000,level:10,minimumBuildTimeMs:2700000,cost:{metal:48000,crystal:32000,tritium:14000}}
};
export const DEFENSE = {
  rocketBattery:{name:"Raketenbatterie",power:100,antiSpy:0,level:2,cost:{metal:650,crystal:150,tritium:60},description:"Bodenraketen gegen angreifende Flotten."},
  teslaCoil:{name:"Teslaspule",power:420,antiSpy:0,level:4,cost:{metal:1800,crystal:1400,tritium:350},description:"Hochenergieentladungen zur planetaren Flottenabwehr."},
  missileDefense:{name:"Raketenabwehr",power:220,antiSpy:.015,level:3,cost:{metal:900,crystal:800,tritium:180},description:"Abfangstellung gegen angreifende Schiffe und Sonden; wird zur Abwehrstärke gerechnet."},
  sensorJammer:{name:"Sondenstörsender",power:25,antiSpy:.07,level:4,cost:{metal:600,crystal:1600,tritium:400},description:"Erhöht das Abfangrisiko für Spionagesonden und erschwert die Aufklärung."}
};


export const TRANSPORT_KEYS = ["cargoDrone","smallTransport","mediumTransport","largeTransport"];
export function shipCargo(key, career = null) {
 const base = FLEET[key]?.cargo || 0;
 return Math.floor(base * (career === "trader" && TRANSPORT_KEYS.includes(key) ? 1.25 : career === "warrior" && key === "recycler" ? 1.25 : 1));
}
export function fleetCapacity(fleet, career=null, raid=false) {
 const total=Object.entries(fleet||{}).reduce((sum,[key,n])=>sum+Math.max(0,Math.floor(Number(n)||0))*shipCargo(key,career),0);
 return Math.floor(total*(raid && career==="warrior"?1.2:1));
}
const FUEL = {spyProbe:5,cargoDrone:10,interceptor:25,smallTransport:40,mediumTransport:120,largeTransport:300,frigate:100,cruiser:250,battleship:600,destroyer:1500,recycler:120,colonyShip:200};
export function flightFuel(fleet,distance,career=null,kind="raid"){
 const base=Object.entries(fleet||{}).reduce((sum,[key,n])=>sum+Math.max(0,Math.floor(Number(n)||0))*(FUEL[key]||0),0);
 return Math.ceil(base*2*(1+Math.max(0,Number(distance)||0)/40)*(career==="warrior" && kind==="raid"?.75:1));
}
export function combatSpeedBonus(fleet,career,kind){
 return career==="warrior" && kind==="raid" && Object.entries(fleet||{}).some(([,n])=>n>0)
  && Object.entries(fleet).every(([key,n])=>!(n>0)||(FLEET[key]?.power>=45 && !TRANSPORT_KEYS.includes(key))) ? 1.2:1;
}
