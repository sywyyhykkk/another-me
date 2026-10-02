const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {runInNewContext}=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const worldSource=readFileSync('utils/world.js','utf8').replace(/export /g,'');
const world=runInNewContext(worldSource+'\n({profileMoment,clockAt})');
const p={selectedAvatar:{role:'traveler',name:'旅行者'},originLocation:{cityName:'上海',latitude:31.23,longitude:121.47},targetLocation:{kind:'ocean',locationLabel:'South Pacific Ocean',latitude:-31.23,longitude:-58.53},metadata:{originTimezoneData:{timezoneId:'Asia/Shanghai'}},result:{distanceKm:20015}};
test('前后端每日规则相同，前端按可见时间推进所有内容',()=>{
 const backend=readFileSync('../another-me-backend/src/domain/world.js','utf8').replace("import('../types')","import('../types/virtualProfile')");
 assert.equal(backend,readFileSync('utils/world.js','utf8'));
 const a=world.profileMoment(p,new Date('2026-10-02T01:00:00Z')),b=world.profileMoment(p,new Date('2026-10-02T15:00:00Z'));
 assert.notEqual(a.currentTitle,b.currentTitle);assert.equal(a.currentDescription,a.timeline.find(i=>i.isCurrent).description);
 assert.equal(b.todayMood,b.timeline.find(i=>i.isCurrent).mood);assert.ok(b.shareText.includes(b.currentTitle));
});
test('双世界海报只绘制快照，包含两地日期时间、活动和故事',()=>{
 const source=readFileSync('utils/poster.ts','utf8').replace(/^import .*\n/gm,'').replace(/export /g,'');
 const {drawPoster}=runInNewContext(stripTypeScriptTypes(source)+'\n({drawPoster})');
 const text=[];
 const ctx=new Proxy({fillText:(s,x,y)=>{assert.ok(x>=0&&x<=600&&y<=920);text.push(s)},measureText:s=>({width:[...s].length*17})},{get:(target,key)=>target[key]||(()=>{})});
 const m=world.profileMoment(p,new Date('2026-10-02T15:00:00Z'));
 const snapshot={id:'fake-public-snapshot',capturedAt:'2026-10-02T15:00:00Z',avatar:{name:'旅行者',role:'traveler'},...m};
 assert.deepEqual(JSON.parse(JSON.stringify(drawPoster(ctx,snapshot))),{width:600,height:920});
 for(const value of [m.originWorld.place,m.originWorld.time,m.targetWorld.time,m.currentTitle,m.dailyStory.title])assert.ok(text.join('\n').includes(value));
 assert.ok(text.some(s=>s.includes(m.targetWorld.date)));assert.doesNotMatch(text.join('\n'),/31\.23|121\.47/);
});

test('页面显示启动时钟，活动与日期切换同步，隐藏与卸载停止更新',async()=>{
 const source=readFileSync('utils/useLiveProfile.ts','utf8').replace(/^import .*\n/gm,'').replace(/export /g,'');
 let time=Date.parse('2026-10-02T12:00:00Z'),tick,show,hide,unload,calls=0,clears=0;
 class ClockDate extends Date{constructor(...args){super(...(args.length?args:[time]))}}
 const runtime={ref:value=>({value}),computed:fn=>({get value(){return fn()}}),profileMoment:world.profileMoment,
   fetchActiveProfile:async()=>{calls++;return p},onShow:fn=>show=fn,onHide:fn=>hide=fn,onUnload:fn=>unload=fn,
   setInterval:fn=>{tick=fn;return 1},clearInterval:()=>clears++,Date:ClockDate};
 const api=runInNewContext(stripTypeScriptTypes(source)+'\nuseLiveProfile()',runtime);
 show();await new Promise(resolve=>setImmediate(resolve));
 const morning=api.moment.value;
 time=Date.parse('2026-10-02T20:00:00Z');tick();await new Promise(resolve=>setImmediate(resolve));
 assert.notEqual(morning.currentTitle,api.moment.value.currentTitle);
 const afternoon=api.moment.value;
 time=Date.parse('2026-10-03T06:00:00Z');tick();await new Promise(resolve=>setImmediate(resolve));
 assert.notEqual(afternoon.targetWorld.date,api.moment.value.targetWorld.date);
 assert.equal(api.moment.value.dailyStory.date,api.moment.value.targetWorld.date);assert.ok(calls>=3);
 hide();assert.equal(clears,1);unload();assert.equal(clears,1);
 show();await new Promise(resolve=>setImmediate(resolve));assert.ok(calls>=4);hide();assert.equal(clears,2);
});
