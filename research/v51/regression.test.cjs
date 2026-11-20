'use strict';
const E=require('./world.js'),B=require('./benchmark.cjs'),reference=require('./results.json'),old=require('../../demo/v50/world.js');
let checks=0;function ok(v,m){if(!v)throw Error(m);checks++;}
for(const mode of E.modes){const a=old.run(mode,50,'guarded',.04),b=E.run(mode,50,'guarded',.04);for(const k of ['late','post','repairs','attempts','samples','collisions'])ok(a[k]===b[k],'baseline parity '+mode+' '+k);}
const failure=E.run('sequential',137110,'guarded',.08);ok(failure.repairs===1&&failure.rejects===1,'historical failure');
for(const options of [{planner:'active'},{retry:true},{planner:'active',retry:true}]){const a=E.run('sequential',137110,'guarded',.08,options);ok(a.repairs===2&&a.modelError<.25,'historical recovery');}
for(const mode of E.modes)for(const options of [{},{planner:'active'},{retry:true},{planner:'active',retry:true}]){
 const a=E.create(mode,510041,'guarded',.08,options),b=E.create(mode,510041,'guarded',.08,options);
 while(!a.snapshot().done){a.step();b.step();}
 const s=a.snapshot();ok(JSON.stringify(s)===JSON.stringify(b.snapshot()),'determinism');
 ok(s.attempts<=3&&s.totalSamples<=1440&&s.repairs+s.rejects+s.restarts<=s.attempts,'attempt budget');
 ok(a.trace.every(p=>p.bodies.every(v=>v.every(Number.isFinite)&&Math.hypot(v[4],v[5])<=6+1e-9)),'bounded force');
 ok(s.probeFrames<=a.trace.length&&s.probeEnergy>=0,'effort accounting');
 if(mode==='healthy')ok(s.events.length===0,'healthy');
 if(mode==='unknown')ok(s.repairs===0,'held-out oscillation refusal at test seed');
}
const run=B(E,reference.n);ok(run.cases.length===reference.cases.length,'case count');
function compare(a,b,path){if(typeof b==='number')ok(Number.isFinite(a)&&Math.abs(a-b)<1e-7,path);else if(b&&typeof b==='object'){ok(!!a&&Object.keys(a).length===Object.keys(b).length,path+' shape');for(const k of Object.keys(b))compare(a[k],b[k],path+'/'+k);}else ok(a===b,path);}
compare(run.report,reference.report,'report');compare(run.cases,reference.cases,'cases');
console.log('PASS: '+checks+' assertions, including V0.50 parity and full replay');
