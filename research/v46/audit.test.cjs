'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{plan,audit,evaluate}=require('./audit.cjs');
const models=[{terms:[],beta:[1]},{terms:[],beta:[1]}],train=[{x:[0,0],y:123}],pool=Array.from({length:16},(_,i)=>[i%4,Math.floor(i/4)]);
for(const method of ['random','disagree','hybrid']){const p=plan(models,train,pool,method,123,4);assert.deepEqual(p,plan(models,[{x:[0,0],y:-999}],pool,method,123,4));assert.equal(new Set(p.map(x=>x.id)).size,4);let calls=0;assert.equal(audit(models[0],p,()=>{calls++;return 1}),0);assert.equal(calls,4);assert.equal(audit(models[0],p,()=>3),2);}
assert.throws(()=>plan(models,train,pool,'random',1,17));
const r=JSON.parse(fs.readFileSync(__dirname+'/results.json'));assert.equal(r.cal.length,6);assert.equal(r.test.length,6);assert(r.cal.every(x=>!r.test.some(y=>y.mode===x.mode)));assert.deepEqual(evaluate(r.cal,r.test),r.summary);for(const x of [...r.cal,...r.test])for(const p of Object.values(x.probes))assert.equal(new Set(p).size,12);console.log('PASS: deterministic planning, no observation-label access, budget, residual, split and result replay');
