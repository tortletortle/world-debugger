'use strict';
// Research pilot: episodic nonlinear model reconstruction and disjoint audit.
function module48(){
'use strict';
const modes=['healthy','gain','bias','quadratic','interaction','saturation','mixed','cross','switch','ripple'];
const methods=['frozen','linear','polynomial','reconstruct','reconstruct_unguarded'];
const clamp=(a,l,h)=>Math.max(l,Math.min(h,a));
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const rms=a=>Math.sqrt(mean(a.map(x=>x*x)));
function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return(s+.5)/4294967296;};}
function normal(r){return Math.sqrt(-2*Math.log(r()))*Math.cos(2*Math.PI*r());}
const nominal={terms:['1','x','u'],beta:[0,.65,.45],bias:0};
const features={'1':()=>1,x:(x)=>x,u:(x,u)=>u,'x²':x=>x*x,'u²':(x,u)=>u*u,'xu':(x,u)=>x*u,'x³':x=>x*x*x,'u³':(x,u)=>u*u*u,'x²u':(x,u)=>x*x*u,'xu²':(x,u)=>x*u*u,'sin(πx)':x=>Math.sin(Math.PI*x),'tanh(2x)':x=>Math.tanh(2*x),'|x|':x=>Math.abs(x),'tanh(2u)':(x,u)=>Math.tanh(2*u),'sin(πxu)':(x,u)=>Math.sin(Math.PI*x*u),'x tanh(2u)':(x,u)=>x*Math.tanh(2*u)};
function predict(m,x,u){return m.terms.reduce((s,k,i)=>s+m.beta[i]*features[k](x,u),0);}
const base=['1','x','u'],poly=['x²','u²','xu','x³','u³','x²u','xu²'],grammar=[...poly,...Object.keys(features).slice(10)];
function fit(rows,terms){const n=terms.length,A=Array.from({length:n},()=>Array(n+1).fill(0));for(const row of rows){const f=terms.map(k=>features[k](row.x,row.u));for(let i=0;i<n;i++){for(let j=0;j<n;j++)A[i][j]+=f[i]*f[j];A[i][n]+=f[i]*row.ref;}}for(let i=0;i<n;i++)A[i][i]+=1e-7;for(let i=0;i<n;i++){let k=i;for(let j=i+1;j<n;j++)if(Math.abs(A[j][i])>Math.abs(A[k][i]))k=j;[A[i],A[k]]=[A[k],A[i]];const d=A[i][i];if(Math.abs(d)<1e-12)return null;for(let j=i;j<=n;j++)A[i][j]/=d;for(let k=0;k<n;k++)if(k!==i){const z=A[k][i];for(let j=i;j<=n;j++)A[k][j]-=z*A[i][j];}}return {terms:[...terms],beta:A.map(a=>a[n]),bias:mean(rows.map(r=>r.y-r.ref))};}
function error(m,rows){return rms(rows.map(r=>predict(m,r.x,r.u)-r.ref));}
function search(train,val,method){let fits=0;const seen=new Set(),all=[];function score(terms){const key=terms.join(',');if(seen.has(key))return;seen.add(key);fits++;const m=fit(train,terms);if(!m)return;const validation=error(m,val),objective=validation+.008*(terms.length-base.length);if(Number.isFinite(objective))all.push({...m,validation,objective});}
score(base);if(method!=='linear'){const library=method==='polynomial'?poly:grammar;for(const k of library)score([...base,k]);const leaders=all.filter(m=>m.terms.length===4).sort((a,b)=>a.objective-b.objective).slice(0,3);for(const leader of leaders)for(const k of library)if(!leader.terms.includes(k))score([...base,...[leader.terms[3],k].sort()]);}
all.sort((a,b)=>a.objective-b.objective||a.terms.join(',').localeCompare(b.terms.join(',')));return {best:all[0],fits,rank:all.slice(0,3).map(m=>({terms:m.terms,validation:m.validation,objective:m.objective}))};}
function control(m,x,target){let u=-1,cost=Infinity;for(let j=0;j<=80;j++){const q=-1+j/40,d=Math.abs(predict(m,x,q)-target)+1e-7*Math.abs(q);if(d<cost){cost=d;u=q;}}return u;}
function makeWorld(mode,seed){const r=rng(seed^0x8f234),sign=r()<.5?-1:1,amp=sign*(.4+.25*r()),change=24+Math.floor(r()*17);let bias=0;if(mode==='bias'||mode==='mixed')bias=sign*(.18+.12*r());
const f=(x,u)=>.65*x+.45*u+(mode==='gain'?.55*amp*u:mode==='quadratic'?amp*(x*x-.35):mode==='interaction'?amp*x*u:mode==='saturation'?amp*Math.tanh(2*u):mode==='mixed'?amp*Math.sin(Math.PI*x):mode==='cross'?amp*(x+.35*u)**3:mode==='switch'?amp*(x+.25*u>.13?1:-1):mode==='ripple'?amp*Math.sin(11*x+5*u):0);return {f,bias,change};}
function shuffled(a,r){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function run(mode,seed,noise=.045){
if(!modes.includes(mode)||!Number.isFinite(noise)||noise<0)throw Error('bad inputs');
const w=makeWorld(mode,seed),r=rng(seed),op=Array.from({length:120},()=>({x:2*r()-1,target:.5*r()-.1,z:normal(r)}));
const rr=rng(seed^0x9f83),points=shuffled(Array.from({length:81},(_,i)=>({x:-1+Math.floor(i/9)/4,u:-1+(i%9)/4,id:i})),rr).slice(0,40).map(p=>({...p,z:normal(rr),zref:normal(rr)}));
const alarmWindow=[];let alarm=null;for(let t=0;t<op.length;t++){const x=op[t].x,u=control(nominal,x,op[t].target);const y=t>=w.change?w.f(x,u)+w.bias:predict(nominal,x,u);alarmWindow.push(y+noise*op[t].z-predict(nominal,x,u));if(alarmWindow.length>6)alarmWindow.shift();if(alarmWindow.length===6&&rms(alarmWindow)>.15){alarm=t;break;}}
const eligible=alarm!==null&&alarm+40<op.length;
const observations=eligible?points.map((p,i)=>{const changed=alarm+i>=w.change,truth=changed?w.f(p.x,p.u):predict(nominal,p.x,p.u);return {...p,ref:truth+noise*p.zref,y:truth+(changed?w.bias:0)+noise*p.z};}):[];
const train=observations.slice(0,16),val=observations.slice(16,24),audit=observations.slice(24,40);
const out={mode,seed,noise,change:w.change,alarm,probeIds:observations.map(p=>p.id),methods:{}};
for(const method of methods){let model=nominal,selected=null,auditError=null,biasError=null,accepted=false,fits=0;
if(method!=='frozen'&&eligible){const p=search(train,val,method==='reconstruct_unguarded'?'reconstruct':method);fits=p.fits;selected=p.best;auditError=error(selected,audit);biasError=rms(audit.map(s=>s.y-s.ref-selected.bias));accepted=method==='reconstruct_unguarded'||(auditError<=Math.max(.13,2*noise)&&biasError<=Math.max(.14,2.5*noise));if(accepted)model=selected;}
const start=eligible?Math.max(alarm+40,w.change+40):w.change+40;
const tail=op.slice(Math.min(op.length-1,start)).map(v=>{const u=control(model,v.x,v.target);return w.f(v.x,u)-v.target;});
const independent=Array.from({length:121},(_,i)=>{const x=-.97+Math.floor(i/11)*.193,u=-.97+(i%11)*.193;return predict(model,x,u)-w.f(x,u);});
out.methods[method]={accepted,fits,queries:fits?40:0,auditError,biasError,terms:model.terms,selectedTerms:selected?.terms??null,beta:model.beta,bias:model.bias,tracking:rms(tail),modelError:rms(independent),excursions:tail.filter(e=>Math.abs(e)>.35).length,steps:tail.length};}
return out;
}
function benchmark(seeds=32){const cases=[];for(const mode of modes)for(const noise of [.045,.075])for(let i=0;i<seeds;i++)cases.push(run(mode,480001+7919*i,noise));const report={};for(const m of methods){const changed=cases.filter(r=>r.mode!=='healthy'),known=changed.filter(r=>!['switch','ripple'].includes(r.mode)),nonlinear=known.filter(r=>!['gain','bias'].includes(r.mode)),unknown=changed.filter(r=>['switch','ripple'].includes(r.mode));const s=a=>a.map(r=>r.methods[m]);report[m]={tracking:mean(s(changed).map(x=>x.tracking)),nonlinearTracking:mean(s(nonlinear).map(x=>x.tracking)),nonlinearModelError:mean(s(nonlinear).map(x=>x.modelError)),knownAccepted:s(known).filter(x=>x.accepted).length,knownTotal:known.length,nonlinearAccepted:s(nonlinear).filter(x=>x.accepted).length,nonlinearTotal:nonlinear.length,unknownAccepted:s(unknown).filter(x=>x.accepted).length,unknownTotal:unknown.length,badAccepted:s(changed).filter(x=>x.accepted&&x.modelError>.15).length,averageFits:mean(s(changed).map(x=>x.fits)),meanQueries:mean(s(changed).map(x=>x.queries))};}
return {seeds,report,cases};}
return {run,benchmark,search,fit,control,predict,modes,methods};
}
const instance=module48();
if(typeof module!=='undefined'){module.exports=instance;if(require.main===module)console.log(JSON.stringify(instance.benchmark(32),null,2));}
