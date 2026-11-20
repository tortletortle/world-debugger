'use strict';
const assert=require('node:assert/strict');
const X=require('./continuous-repair.cjs');
let n=0;function check(v){assert.ok(v);n++;}
for(const mode of X.modes)for(const method of X.methods){
 const a=X.simulate(mode,123,method),b=X.simulate(mode,123,method);
 assert.deepEqual(a,b);n++;
 check(a.trace.length===360);
 check(a.trace.every((z,i)=>i===0||z.x===a.trace[i-1].next||Math.abs(a.trace[i-1].next)>8));
 check(a.trace.every(z=>Math.abs(z.u)<=1&&Number.isFinite(z.next)));
 check(a.fits%25===0);
 check(a.attempts<=(method==='budgeted'?3:6));
 check(a.events.filter(e=>e.type==='commit').length===a.accepted);
 check(a.events.filter(e=>e.type==='rollback').length===a.rollbacks);
 check(a.events.filter(e=>e.type==='commit').every(e=>method==='ungated'||e.gate.accept));
 check(method!=='frozen'||(a.probes===0&&a.fits===0&&a.accepted===0));
}
for(const file of ['development','heldout']){
 const r=require('./'+file+'.json');
 assert.deepEqual(X.benchmark(r.seeds,r.seedBase),r);n++;
 check(r.cases.some(c=>c.rollbacks>0));
 check(r.cases.some(c=>c.rejected>0));
 check(r.cases.some(c=>c.dead));
}
console.log('PASS '+n+' assertions');
