const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')
const ts = require('node:module').createRequire(path.resolve(__dirname, '../../apps/server/package.json'))('typescript')
const tick = async () => { for (let i=0;i<12;i++) await Promise.resolve() }
function load(file, context, dependencies) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports,require:n=>{if(!(n in dependencies))throw Error('测试依赖未明确:'+n);return dependencies[n]},...context})
  return exports
}
function healthFixture() {
  const timers=new Map(),calls=[];let next=0,pages=[{}],identity=async()=>({resourceVersion:2,activeReleaseId:'probe-good'})
  class Bridge {
    bindRuntime(){return Promise.resolve(true)} replaceTrust(){return Promise.resolve(true)}
    call(action,args){calls.push({action,args});return Promise.resolve(true)} identity(){return identity()}
  }
  const code=load('apps/mobile/src/lib/resource-update-lifecycle.ts',{uni:{getSystemInfoSync:()=>({platform:'android'})},getCurrentPages:()=>pages,setTimeout:(fn,ms)=>{timers.set(++next,{fn,ms});return next},clearTimeout:id=>timers.delete(id)},
    {'@/utils/request':{apiGetOptionalAuth:async url=>url.includes('/trust/')?{keys:[]}:{update:null}},'@/utils/storage':{getToken:()=>'',subscribeAuthContext:()=>{}},'./app-distribution':{APP_CLIENT_KEY:'synthetic'},'./resource-native-bridge':{AndroidResourceBridge:Bridge},'./resource-updater':{},'./critical-activities':{installCriticalActivityTracking:()=>{},subscribeCriticalActivities:()=>{}}})
  code.initializeResourceUpdates()
  return {code,calls,timers,identity:value=>identity=value,pages:value=>pages=value,fire:()=>{const [id,t]=timers.entries().next().value;timers.delete(id);assert.equal(t.ms,65000);t.fn()}}
}
test('实际生命周期：65秒门槛、前后台重新计时及无页面拒绝（受控时钟）',async()=>{
  const f=healthFixture();await tick();f.code.observeResourceHealth();f.code.pauseResourceHealth();assert.equal(f.timers.size,0)
  f.code.observeResourceHealth();f.pages([]);f.fire();await tick();assert.equal(f.calls.filter(c=>c.action==='healthy').length,0)
  f.pages([{}]);f.code.observeResourceHealth();f.fire();await tick();assert.equal(f.calls.filter(c=>c.action==='healthy').length,1)
})
for(const event of ['pause','error','pause-resume'])test('身份异步查询后 '+event+' 不接受旧窗口的迟到健康结果',async()=>{
  const f=healthFixture();await tick();let reply;f.identity(()=>new Promise(resolve=>reply=resolve))
  f.code.observeResourceHealth();f.fire();await tick()
  if(event==='error')f.code.markResourceUnhealthy();else f.code.pauseResourceHealth()
  if(event==='pause-resume')f.code.observeResourceHealth()
  reply({resourceVersion:2,activeReleaseId:'probe-good'});await tick()
  assert.equal(f.calls.filter(c=>c.action==='healthy').length,0)
  if(event==='error'){f.code.observeResourceHealth();assert.equal(f.timers.size,0);assert.equal(f.calls.filter(c=>c.action==='unhealthy').length,1)}
})
function liveFixture() {
  const timers=new Map(),listeners=new Map(),history=[],enterRequests=[];let next=0;const plugins={sharedInstance:()=>{},enterRoom:args=>{history.push('enter');enterRequests.push(args)},startLocalAudio:()=>history.push('audio'),startLocalPreview:()=>history.push('preview'),stopLocalPreview:()=>history.push('stop-preview'),stopLocalAudio:()=>history.push('stop-audio'),exitRoom:()=>history.push('exit'),destroySharedInstance:()=>history.push('destroy')}
  const critical=load('apps/mobile/src/lib/critical-activities.ts',{},{}), events={addEventListener:(n,fn)=>listeners.set(n,fn),removeEventListener:n=>listeners.delete(n)}
  const code=load('apps/mobile/src/pkg-live/live-trtc-client.ts',{uni:{requireNativePlugin:n=>n==='globalEvent'?events:plugins},setTimeout:(fn,ms)=>{timers.set(++next,{fn,ms});return next},clearTimeout:id=>timers.delete(id)}, {'@/lib/critical-activities':critical})
  return {code,critical,plugins,listeners,timers,history,enterRequests,config:{sdkAppId:0,userId:'synthetic',userSig:'not-a-real-sig',strRoomId:'synthetic',canPublishAudio:true},emit:(n,data)=>listeners.get(n)?.({data})}
}
for(const reason of ['cancel','timeout','native-error','enter-throw','audio-throw','preview-throw'])test('实际TRTC模块在 '+reason+' 后清理租约、计时及迟到回调（插件替身）',async()=>{
  const f=liveFixture();let pending
  if(reason==='preview-throw') {f.plugins.startLocalPreview=()=>{throw Error('模拟插件异常')};assert.throws(()=>f.code.startLiveDevicePreview('view'));assert.equal(f.critical.currentCriticalActivities().length,0);return}
  if(reason==='enter-throw')f.plugins.enterRoom=()=>{throw Error('模拟入房异常')}
  if(reason==='audio-throw')f.plugins.startLocalAudio=()=>{throw Error('模拟音频异常')}
  pending=f.code.joinLiveAudio(f.config);const rejected=assert.rejects(pending)
  const late=f.listeners.get('onEnterRoom')
  assert.equal(f.critical.currentCriticalActivities()[0],'live')
  if(reason==='cancel')f.code.leaveLiveAudio()
  if(reason==='timeout'){const t=[...f.timers.values()][0];assert.equal(t.ms,12000);t.fn()}
  if(reason==='native-error')f.emit('onError',[-1])
  if(reason==='audio-throw')f.emit('onEnterRoom',[1])
  await rejected
  assert.equal(f.timers.size,0);assert.equal(f.critical.currentCriticalActivities().length,0);assert.equal(f.listeners.size,0)
  late?.({data:[1]});assert.equal(f.history.includes('audio'),false)
  assert.ok(f.history.includes('destroy'))
})
test('退出旧入房等待后立即新建，旧异常不销毁新房间；成功后幂等退出',async()=>{
  const f=liveFixture(),old=f.code.joinLiveAudio(f.config),rejected=assert.rejects(old)
  const late=f.listeners.get('onEnterRoom');f.code.leaveLiveAudio()
  const next=f.code.joinLiveAudio(f.config);late({data:[1]});await rejected
  assert.equal(f.critical.currentCriticalActivities()[0],'live')
  f.emit('onEnterRoom',[1]);await next;assert.equal(f.history.filter(x=>x==='audio').length,1)
  f.code.leaveLiveAudio();f.code.leaveLiveAudio();assert.equal(f.timers.size,0);assert.equal(f.critical.currentCriticalActivities().length,0)
})
test('视频预览转入房过程中关闭预览仍保留等待保护，成功后退出统一清理',async()=>{
  const f=liveFixture();f.code.startLiveDevicePreview('preview')
  const next=f.code.joinLiveVideo({...f.config,mediaMode:'VIDEO',canPublishVideo:true,role:'GUEST'},'joined-view')
  f.code.stopLiveDevicePreview();assert.equal(f.critical.currentCriticalActivities()[0],'live')
  f.emit('onEnterRoom',[1]);await next
  assert.equal(f.history.filter(x=>x==='preview').length,2)
  f.code.leaveLiveVideo();assert.equal(f.critical.currentCriticalActivities().length,0)
})
test('音频观众与视频主播实际入房调用使用同一直播场景，主播带分发标识',async()=>{
  const audio=liveFixture(),video=liveFixture()
  const a=audio.code.joinLiveAudio(audio.config)
  const v=video.code.joinLiveVideo({...video.config,mediaMode:'VIDEO',canPublishVideo:true,role:'HOST',streamId:'synthetic-stream'},'view')
  assert.equal(audio.enterRequests[0].appScene,1);assert.equal(video.enterRequests[0].appScene,1)
  assert.equal(video.enterRequests[0].streamId,'synthetic-stream')
  audio.emit('onEnterRoom',[1]);video.emit('onEnterRoom',[1]);await Promise.all([a,v])
  audio.code.leaveLiveAudio();video.code.leaveLiveVideo()
})
