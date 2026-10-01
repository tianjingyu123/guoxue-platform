import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import path from 'node:path'
/** 实际 TS 模块，只有宿主/API/应用生命周期驱动为明确测试适配。 */
export function probeHealthResources(root) {
 const ts = createRequire(path.join(root, 'apps/server/package.json'))('typescript')
 const inputs = { './resource-update-lifecycle': 'resource-update-lifecycle.ts', './resource-native-bridge': 'resource-native-bridge.ts', './critical-activities': 'critical-activities.ts' }
 const sourceHashes = {}, definitions = []
 for (const [name, file] of Object.entries(inputs)) {
  const bytes = readFileSync(path.join(root, 'apps/mobile/src/lib', file))
  sourceHashes[file] = createHash('sha256').update(bytes).digest('hex')
  const compiled = ts.transpileModule(bytes.toString('utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText
  definitions.push('definitions[' + JSON.stringify(name) + ']=function(exports,require){' + compiled + '\n};')
 }
 const script = `(function(){
var definitions={},cache={},callbacks={},nextId=0;
var recorder={onStart:function(){},onStop:function(){},onError:function(){}};
window.uni={getSystemInfoSync:function(){return {platform:'android'}},addInterceptor:function(){},getRecorderManager:function(){return recorder}};
window.getCurrentPages=function(){return [{}]};
window.plus={io:{convertLocalFileSystemURL:function(){return Probe.runtimePath()}},android:{
 importClass:function(name){if(name!=='cn.rebu.resource.ResourceRuntime')throw Error('未知测试入口');return {dispatch:function(action,json,callback){var id=++nextId;callbacks[id]=callback;Probe.call(id,action,json)}}},
 implements:function(name,callback){if(name!=='cn.rebu.resource.ResourceRuntime$Callback')throw Error('未知测试接口');return callback}
}};
window.probeNativeReply=function(id,json){var callback=callbacks[id];delete callbacks[id];if(callback)callback.onResult(json)};
var adapters={
 '@/uni_modules/rebu-resource-updater':{includeResourceHook:function(){}},
 '@/utils/request':{apiGetOptionalAuth:function(url){return Promise.resolve(url.indexOf('/trust/')>=0?{keys:[JSON.parse(Probe.grant())]}:{update:null})}},
 '@/utils/storage':{getToken:function(){return 'synthetic-probe-token'},subscribeAuthContext:function(){}},
 './app-distribution':{APP_CLIENT_KEY:'synthetic-probe'},
 './resource-updater':{ResourceUpdater:function(){throw Error('健康宿主不得下载或排队新资源')}}
};
${definitions.join('\n')}
function load(name){if(adapters[name])return adapters[name];if(cache[name])return cache[name];if(!definitions[name])throw Error('缺少测试依赖:'+name);var value={};cache[name]=value;definitions[name](value,load);return value}
var lifecycle=load('./resource-update-lifecycle');
window.ProbeLifecycle={show:function(){lifecycle.observeResourceHealth();Probe.event('observe',performance.now())},hide:function(){lifecycle.pauseResourceHealth();Probe.event('pause',performance.now())},fail:function(){lifecycle.markResourceUnhealthy();Probe.event('failed',performance.now())}};
lifecycle.initializeResourceUpdates();ProbeLifecycle.show();Probe.signal('health-ready');
})();`
 return { script, sourceHashes }
}
