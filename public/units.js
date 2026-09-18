// Shared by browser and server: one source for unit balance.
export const FLEET = {
  cargoDrone: { power:4, cargo:850 }, interceptor:{power:45,cargo:120},
  smallTransport:{name:"Kleiner Transporter",power:8,cargo:2500,level:2,minimumBuildTimeMs:120000,cost:{metal:450,crystal:220,tritium:60}},
  mediumTransport:{name:"Mittlerer Transporter",power:25,cargo:10000,level:4,minimumBuildTimeMs:360000,cost:{metal:1800,crystal:900,tritium:250}},
  largeTransport:{name:"Großer Transporter",power:70,cargo:40000,level:6,minimumBuildTimeMs:900000,cost:{metal:7200,crystal:3600,tritium:1000}},
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
