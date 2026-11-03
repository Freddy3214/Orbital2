import assert from "node:assert/strict";
import {test} from "node:test";
import {progression,recordProgress,claimProgress} from "../public/progression.js";
test("daily missions require distinct scouts, grant rewards once and unlock permanent cosmetics",()=>{
 const state={},now=Date.parse("2026-11-03T12:00:00Z");
 recordProgress(state,"scout","world-a",now);recordProgress(state,"scout","world-a",now);
 assert.throws(()=>claimProgress(state,"scout",now));
 recordProgress(state,"scout","world-b",now);recordProgress(state,"scout","world-c",now);
 assert.equal(claimProgress(state,"scout",now).points,100);
 assert.throws(()=>claimProgress(state,"scout",now));
 recordProgress(state,"victory","f1",now);claimProgress(state,"victory",now);
 recordProgress(state,"salvage","f2",now);const p=claimProgress(state,"salvage",now);
 assert.equal(p.points,300);assert.deepEqual(p.unlocked,["aurora"]);
 p.skin="aurora";
 const tomorrow=progression(state,Date.parse("2026-11-04T00:00:00Z"));
 assert.equal(tomorrow.points,300);assert.equal(tomorrow.daily.claimed.length,0);
 const nextMonth=progression(state,Date.parse("2026-12-01T00:00:00Z"));
 assert.equal(nextMonth.points,0);assert.deepEqual(nextMonth.unlocked,["aurora"]);assert.equal(nextMonth.skin,"aurora");
});
