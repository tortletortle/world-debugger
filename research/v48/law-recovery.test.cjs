'use strict';
const assert=require('node:assert/strict');
const E=require('./law-recovery.cjs');
const reference=require('./results.json');
let checks=0;
function check(x){assert.ok(x);checks++;}
for(const mode of E.modes)for(const method of E.methods){
 const a=E.run(mode,123,method),b=E.run(mode,123,method);
 assert.deepEqual(a,b);checks++;
 check(a.queries===0||a.queries===24);
 check(a.commit===null||a.commit>=a.alarm+23);
 check(a.trace.every(o=>Number.isFinite(o.error)&&Math.abs(o.u)<=1));
 check(!a.rejected||a.commit===null);
 if(a.queries===24&&['random','residual'].includes(method))check(a.fits===25);
}
const rows=[-1,-.5,0,.5,1].flatMap(x=>[-1,0,1].map(u=>{const y=.2+.65*x+.45*u+.6*x*x;return{f:E.features(x,u),ref:y,y:y+.1};}));
const fit=E.fit([0,1,2,3],rows);
check(Math.abs(fit.beta[3]-.6)<.00001);
check(Math.abs(fit.bias-.1)<.00001);
check(E.audit(fit,rows).accept);
check(!E.audit(fit,rows.map(r=>({...r,ref:r.ref+1,y:r.y+1}))).accept);
check(!E.audit(fit,rows.map(r=>({...r,y:r.y+1}))).accept);
const r=E.benchmark(12);
assert.deepEqual(r,reference);checks++;
console.log('PASS '+checks+' assertions');
