'use strict';
const assert=require('node:assert/strict');
const E=require('./world-repair.cjs');
const reference=require('./results.json');
let checks=0;
for(const mode of E.modes)for(const method of E.methods){
 const a=E.run(mode,42,method),b=E.run(mode,42,method);
 assert.deepEqual(a,b);checks++;
 assert(a.queries===0||a.queries===12);checks++;
 assert(a.commit===null||a.commit>=a.alarm+11);checks++;
 assert(a.trace.every(x=>Number.isFinite(x.tracking)&&Math.abs(x.u)<=1));checks++;
}
assert.equal(E.fit([{x:0,u:0,y:0,ref:0}]),null);checks++;
assert.deepEqual(E.benchmark(24),reference);checks++;
console.log('PASS: '+checks+' assertions');
