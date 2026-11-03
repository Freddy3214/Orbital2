import assert from "node:assert/strict";
import {test} from "node:test";
import {FLEET,shipCargo,fleetCapacity,flightFuel,combatSpeedBonus} from "../public/units.js";
import {simulateBattle} from "../public/combat.js";
test("cargo and asymmetric bonuses share one balance model",()=>{
 assert.equal(FLEET.smallTransport.cargo,25000);assert.equal(FLEET.mediumTransport.cargo,100000);assert.equal(FLEET.largeTransport.cargo,250000);
 assert.equal(shipCargo("largeTransport","trader"),312500);assert.equal(shipCargo("recycler","warrior"),25000);
 assert.equal(fleetCapacity({smallTransport:1,mediumTransport:1,largeTransport:1},"trader"),468750);
 const regular=flightFuel({battleship:10},40,null,"raid");
 assert.equal(flightFuel({battleship:10},40,"warrior","raid"),regular*.75);
 assert.equal(flightFuel({battleship:10},40,"warrior","recycle"),regular);
 assert.equal(combatSpeedBonus({battleship:1},"warrior","raid"),1.2);
 assert.equal(combatSpeedBonus({battleship:1,smallTransport:1},"warrior","raid"),1);
 assert.equal(combatSpeedBonus({recycler:1},"warrior","recycle"),1);
 const battle=simulateBattle({attackerFleet:{smallTransport:2},attackerCareer:"trader"});
 assert.equal(battle.capacity,fleetCapacity(battle.survivors,"trader",true));
});
