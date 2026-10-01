import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { installProbe } from './android-probe-install.mjs'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),sdk=process.env.REBU_ANDROID_SDK||'D:/Tools/xiaozhi-build/android-sdk'
const device=process.argv[2],build=Number(process.argv[3]);if(!device||!/^[a-zA-Z0-9-]{4,80}$/.test(device)||!Number.isInteger(build)||build<1||build>64)throw Error('需已核验设备与独立探针构建号')
const pkg='cn.rebu.resourceprobe',component=pkg+'/.ProbeActivity',info=JSON.parse(readFileSync(path.join(root,'artifacts/android-resource-probe-'+build+'/build.json')))
const evidenceName=process.argv[4]||'android-health-window';if(!['android-health-window','android-phase6-health-window'].includes(evidenceName))throw Error('健康证据名称非法')
if(info.packageName!==pkg||!info.syntheticOnly||info.dcloud!==false||!info.minified||info.sourceDirty||createHash('sha256').update(readFileSync(info.apk)).digest('hex')!==info.sha256)throw Error('健康窗口只接受干净同源压缩独立测试包')
const adb=(...args)=>execFileSync(path.join(sdk,'platform-tools/adb.exe'),['-s',device,...args],{encoding:'utf8',timeout:45000,maxBuffer:8*1024*1024})
const formal=()=>adb('shell','dumpsys','package','com.rebu.apprebu').split('\n').filter(l=>/versionCode=|versionName=|lastUpdateTime=/.test(l)).map(l=>l.trim())
const baseline=formal(),api=Number(adb('shell','getprop','ro.build.version.sdk').trim());if(api<26)throw Error('低于API26，不安装')
const installation=await installProbe(sdk,device,info),evidence=[],passed=[];const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const now=()=>Number(adb('shell','date','+%s.%N').trim())
const logs=cutoff=>adb('logcat','-d','-v','epoch','-s','REBU_RESOURCE_PROBE:I','*:S').split('\n').filter(l=>Number(l.trim().split(/\s+/)[0])>=cutoff-0.01)
async function wait(cutoff,expected,timeout=18000){const began=Date.now();while(Date.now()-began<timeout){const lines=logs(cutoff),text=lines.join('\n');if(expected.test(text)){evidence.push({cutoff,elapsedMs:Date.now()-began,expected:expected.source,logs:lines});return lines}if(/BOOT_REFUSED|SCENARIO_REFUSED|JS_ERROR/.test(text))throw Error('健康宿主运行拒绝：'+text);await sleep(700)}throw Error('健康宿主未出现预期信号：'+expected+'\n'+logs(cutoff).join('\n'))}
async function launch(scenario,expected,{force=true,extras=[]}={}){if(force)adb('shell','am','force-stop',pkg);const cutoff=now();adb('shell','am','start','-n',component,'-f','0x20000000','--es','scenario',scenario,...extras);const lines=await wait(cutoff,expected);return {cutoff,lines}}
async function fresh(){await launch('new-suite',/NEW_SUITE/);const r=await launch('show',/JS_READY baseline-ready/);if(!r.lines.join('\n').includes('phase=HEALTHY,version=0'))throw Error('基线未恢复')}
async function prepare(){await fresh();await launch('prepare-good',/PREPARED good/,{extras:['--ez','healthWindow','true']});return launch('show',/JS_READY health-ready/)}
const record=s=>{passed.push(s);console.log('通过：'+s)}
try{
 const start=await prepare();await launch('health-early',/REAL_HEALTH_EARLY .*"ok":false/,{force:false});record('真实 ResourceRuntime 拒绝原生60秒前确认当前待健康资源')
 await sleep(8000);const pauseCutoff=now();adb('shell','input','keyevent','KEYCODE_HOME');await wait(pauseCutoff,/REAL_HEALTH_JS pause/)
 console.log('健康窗口：真实切后台，等待跨过原65秒观察期限')
 await sleep(62000);if(logs(start.cutoff).some(l=>/action=healthy,ok=true/.test(l)))throw Error('切后台后仍确认健康')
 const resume=await launch('health-status',/REAL_HEALTH_JS observe/,{force:false});
 console.log('健康窗口：恢复前台，重新等待完整65秒')
 const healthy=await wait(resume.cutoff,/REAL_HEALTH_NATIVE action=healthy,ok=true,phase=HEALTHY,version=2/,85000)
 const observed=healthy.find(l=>/REAL_HEALTH_JS observe/.test(l)),accepted=healthy.find(l=>/REAL_HEALTH_NATIVE action=healthy,ok=true/.test(l));const elapsed=(Number(accepted.trim().split(/\s+/)[0])-Number(observed.trim().split(/\s+/)[0]))*1000
 if(elapsed<65000-50)throw Error('前台真实观察不足65秒：'+elapsed)
 evidence.push({continuousForegroundObservedMs:elapsed,nativeMinimumMs:60000,javascriptMinimumMs:65000})
 record('实际生产TS生命周期及桥接模块在WebView连续前台65秒后经生产原生入口确认；后台时间不累计')
 const persisted=await launch('show',/JS_READY health-ready/);if(!persisted.lines.join('\n').includes('phase=HEALTHY,version=2'))throw Error('健康版本首个冷启动未保持')
 record('真实健康确认后的资源版本在后续首个冷启动保持')
 await prepare();await sleep(4000);const restored=await launch('show',/JS_READY baseline-ready/);if(!restored.lines.join('\n').includes('RECOVERED_BEFORE_JS'))throw Error('短时退出未在JS前恢复')
 const repeated=await launch('show',/JS_READY baseline-ready/);if(!repeated.lines.join('\n').includes('phase=HEALTHY,version=0'))throw Error('恢复不幂等');record('未满健康窗口短时退出先恢复旧版，再次冷启动保持恢复结果')
 await prepare();await launch('health-error',/REAL_HEALTH_NATIVE action=unhealthy,ok=true/,{force:false});await launch('show',/JS_READY baseline-ready/);record('实际生产生命周期错误处理取消计时并使下一冷启动恢复基线')
 await fresh();await launch('prepare-good',/PREPARED good/);await launch('health-cancel',/REAL_CANCEL .*"ok":true/,{force:false});const cancelled=await launch('show',/JS_READY baseline-ready/);if(!cancelled.lines.join('\n').includes('version=0'))throw Error('取消后仍激活');record('生产原生取消入口清除待激活队列，保留当前版本')
 await fresh();await launch('prepare-good',/PREPARED good/,{extras:['--ez','denyOffer','true']});await launch('show',/JS_READY baseline-ready/);const stopped=await launch('show',/JS_READY baseline-ready/);if(!stopped.lines.join('\n').includes('version=0'))throw Error('停发后反复启动仍激活');record('合成停发准入拒绝及重复启动保持基线')
 if(JSON.stringify(formal())!==JSON.stringify(baseline))throw Error('正式包元数据发生改变')
 writeFileSync(path.join(root,'docs/operations/channel-updates-evidence/'+evidenceName+'.json'),JSON.stringify({verifiedAt:new Date().toISOString(),sourceSha:info.sourceSha,sourceDirty:false,apkSha256:info.sha256,minified:true,deviceModel:adb('shell','getprop','ro.product.model').trim(),api,packageName:pkg,healthModuleSourceHashes:info.healthModuleSourceHashes,installation,passed,evidence,formalPackageUnchanged:true,limits:['独立Android WebView宿主，非DCloud完整包','运行生产TS生命周期、AndroidResourceBridge及原生healthy/unhealthy/cancel入口，Native.js以明确JavascriptInterface适配代替','测试适配把生产Runtime的store绑定到采用合成OfferCheck的真实目录事务；不证明原生HTTPS准入已打通','App页面栈/API/trust返回及宿主生命周期驱动是明确测试适配；未触发真实交易或TRTC/录音/上传']},null,2)+'\n')
}finally{adb('shell','am','force-stop',pkg)}
