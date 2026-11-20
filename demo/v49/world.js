'use strict';
function World49(){
'use strict';
const dt=.05,T=60,modes=['healthy','wind','drag','spring','ripple'],clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),rms=a=>Math.sqrt(a.reduce((s,x)=>s+x*x,0)/Math.max(1,a.length));
function rng(seed){let s=seed>>>0;return()=>((s=(Math.imul(1664525,s)+1013904223)>>>0)+.5)/4294967296;}
const basis={'1':()=>1,x:x=>x,v:(x,v)=>v,'|v|v':(x,v)=>Math.abs(v)*v,'x³':x=>x*x*x,'sin(x)':x=>Math.sin(x)};
const nominal={terms:['v'],coef:[-.35]};
function force(m,x,v){return m.terms.reduce((s,k,i)=>s+m.coef[i]*basis[k](x,v),0);}
function target(t){return {x:1.6*Math.sin(.62*t),v:.992*Math.cos(.62*t),a:-.61504*Math.sin(.62*t)};}
function law(mode,seed){const r=rng(seed),s=r()<.5?-1:1,k=.85+.3*r();return (x,v)=>-.35*v+(mode==='wind'?s*1.3*k:mode==='drag'?.8*s*k-.95*k*Math.abs(v)*v:mode==='spring'?-.55*k*x*x*x:mode==='ripple'?1.5*k*Math.sin(7*x+3*v):0);}
function fit(rows,terms){let n=terms.length,A=Array.from({length:n},()=>Array(n+1).fill(0));for(const {x,v,y} of rows){let f=terms.map(k=>basis[k](x,v));for(let i=0;i<n;i++){A[i][n]+=f[i]*y;for(let j=0;j<n;j++)A[i][j]+=f[i]*f[j];}}for(let i=0;i<n;i++)A[i][i]+=.002;for(let i=0;i<n;i++){let k=i;for(let j=i+1;j<n;j++)if(Math.abs(A[j][i])>Math.abs(A[k][i]))k=j;[A[i],A[k]]=[A[k],A[i]];let d=A[i][i];if(Math.abs(d)<1e-10)return null;for(let j=i;j<=n;j++)A[i][j]/=d;for(let k=0;k<n;k++)if(k!==i){let z=A[k][i];for(let j=i;j<=n;j++)A[k][j]-=z*A[i][j];}}return {terms,coef:A.map(a=>a[n])};}
const modelError=(m,rows)=>rms(rows.map(r=>r.y-force(m,r.x,r.v)));
function search(train,val){const sets=[['1','x','v'],...['|v|v','x³','sin(x)'].map(k=>['1','x','v',k]),['1','x','v','|v|v','x³'],['1','x','v','|v|v','sin(x)'],['1','x','v','x³','sin(x)']];return sets.map(terms=>{let m=fit(train,terms);return {...m,validation:modelError(m,val),score:modelError(m,val)+.012*(terms.length-3)};}).sort((a,b)=>a.score-b.score)[0];}
function create(mode='drag',seed=49,policy='guarded',noise=.025){if(!modes.includes(mode)||!['frozen','guarded','unguarded'].includes(policy))throw Error('invalid setting');let r=rng(seed^45321),actual=law(mode,seed),model=nominal,candidate=null,phase='monitor',age=0,alarm=null,commit=null,mutation=12,stepCount=0,x=0,v=0,u=0,residual=0,stopped=false,rows=[],val=[],audit=[],window=[],trace=[],events=[],auditError=null;const ev=(type,t,detail)=>events.push({type,t,detail});
function inject(){if(mode!=='healthy'&&stepCount*dt<mutation){mutation=stepCount*dt;return true;}return false;}
function step(){if(stopped||stepCount>=T/dt)return snapshot();const t=stepCount*dt,goal=target(t),phaseBefore=phase;if(mode!=='healthy'&&stepCount===Math.round(mutation/dt))ev('mutation',t,'环境规律改变（仅演示器知道）');const f=t+1e-8>=mutation?actual(x,v):force(nominal,x,v);const probing=['train','validate','audit'].includes(phase);const excitation=probing?.65*Math.sin(2.1*t)+.35*Math.cos(3.7*t):0;u=clamp(goal.a+2.5*(goal.x-x)+2.1*(goal.v-v)-force(model,x,v)+excitation,-6,6);
const oldX=x,oldV=v;v+=dt*(u+f);x+=dt*v;const observed=(v-oldV)/dt-u+noise*(r()*2-1)*Math.sqrt(3);residual=observed-force(model,oldX,oldV);window.push(residual);if(window.length>16)window.shift();
if(phase==='monitor'&&window.length===16&&rms(window)>.22){alarm=t;phase=policy==='frozen'?'frozen':'train';ev('alarm',t,'残差超过阈值');}
else if(phaseBefore==='train'){rows.push({x:oldX,v:oldV,y:observed});if(rows.length===160){phase='validate';ev('train',t,'160 个连续观测');}}
else if(phaseBefore==='validate'){val.push({x:oldX,v:oldV,y:observed});if(val.length===80){candidate=search(rows,val);phase='audit';ev('candidate',t,'验证集选定候选结构');}}
else if(phaseBefore==='audit'){audit.push({x:oldX,v:oldV,y:observed});if(audit.length===80){auditError=modelError(candidate,audit);if(policy==='unguarded'||auditError<=.12){model=candidate;phase='repaired';commit=t;ev('commit',t,'更新补偿控制模型');}else{phase='rejected';ev('reject',t,'独立审计失败，保留旧模型');}}}
if(!Number.isFinite(x)||!Number.isFinite(v)||Math.abs(x)>8||Math.abs(v)>6){stopped=true;ev('stop',t,'超出运动边界，停止仿真');}
trace.push({t:t+dt,x,v,u,target:target(t+dt).x,error:Math.abs(x-target(t+dt).x),residual,phase});stepCount++;return snapshot();}
function snapshot(){return {mode,seed,policy,t:stepCount*dt,x,v,u,target:target(stepCount*dt).x,phase,alarm,commit,mutation,queries:rows.length+val.length+audit.length,model,candidate,auditError,residual,stopped,done:stopped||stepCount>=T/dt,events:events.slice()};}
return {step,snapshot,inject,trace};}
function run(mode,seed,policy,noise=.025){const sim=create(mode,seed,policy,noise);while(!sim.snapshot().done)sim.step();const s=sim.snapshot(),tail=sim.trace.filter(p=>p.t>=32);return {...s,tracking:tail.length?rms(tail.map(p=>p.error)):null,allTracking:rms(sim.trace.filter(p=>p.t>=12).map(p=>p.error)),steps:sim.trace.length};}
function benchmark(n=20){const cases=[];for(const mode of modes)for(const noise of [.025,.06])for(let i=0;i<n;i++)for(const policy of ['frozen','guarded','unguarded'])cases.push({...run(mode,49001+i*7919,policy,noise),noise});const report={};for(const p of ['frozen','guarded','unguarded']){const a=cases.filter(x=>x.policy===p),changed=a.filter(x=>x.mode!=='healthy'),ood=a.filter(x=>x.mode==='ripple'),healthy=a.filter(x=>x.mode==='healthy'),known=changed.filter(x=>x.mode!=='ripple');report[p]={cases:a.length,known:known.length,knownRepair:known.filter(x=>x.commit!==null).length,oodAccepted:ood.filter(x=>x.commit!==null).length,ood:ood.length,healthyAlarms:healthy.filter(x=>x.alarm!==null).length,healthy:healthy.length,stops:a.filter(x=>x.stopped).length,meanTracking:changed.reduce((s,x)=>s+(x.tracking??8),0)/changed.length,wholeChangedTracking:changed.reduce((s,x)=>s+x.allTracking,0)/changed.length};}return {report,cases};}
return {create,run,benchmark,target,force,dt,T,modes};
}
const WD49=World49();
if(typeof module!=='undefined')module.exports=WD49;
