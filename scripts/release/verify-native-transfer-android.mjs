import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {installProbe} from './android-probe-install.mjs'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),sdk=process.env.REBU_ANDROID_SDK||'D:/Tools/xiaozhi-build/android-sdk'
const [device,buildText]=process.argv.slice(2),build=Number(buildText),pkg='cn.rebu.resourceprobe'
if(!device||!/^[a-zA-Z0-9-]{4,80}$/.test(device)||!Number.isInteger(build)||build<1||build>64)throw Error('需已核验设备及独立测试构建')
const info=JSON.parse(readFileSync(path.join(root,'artifacts/android-resource-probe-'+build+'/build.json')))
if(info.packageName!==pkg||!info.syntheticOnly||info.dcloud!==false||!info.minified||info.sourceDirty||createHash('sha256').update(readFileSync(info.apk)).digest('hex')!==info.sha256)throw Error('仅接受干净同源压缩独立探针')
const adb=(...args)=>execFileSync(path.join(sdk,'platform-tools/adb.exe'),['-s',device,...args],{encoding:'utf8',timeout:45000,maxBuffer:4*1024*1024})
const formal=()=>adb('shell','dumpsys','package','com.rebu.apprebu').split('\n').filter(l=>/versionCode=|versionName=|lastUpdateTime=/.test(l)).map(l=>l.trim())
const before=formal(),api=Number(adb('shell','getprop','ro.build.version.sdk').trim());if(api<26)throw Error('低于API26')
const installation=await installProbe(sdk,device,info)
try{
 adb('shell','am','force-stop',pkg);const cutoff=Number(adb('shell','date','+%s.%N').trim());adb('shell','am','start','-n',pkg+'/.ProbeActivity','--es','scenario','transfer')
 const began=Date.now();let lines=[]
 while(Date.now()-began<20000){lines=adb('logcat','-d','-v','epoch','-s','REBU_RESOURCE_PROBE:I','*:S').split('\n').filter(l=>Number(l.trim().split(/\s+/)[0])>=cutoff-0.01);const text=lines.join('\n');if(/TRANSFER_FAILED|BOOT_REFUSED|SCENARIO_REFUSED/.test(text))throw Error(text);if(/TRANSFER_DONE groups=3/.test(text))break;await new Promise(r=>setTimeout(r,400))}
 const text=lines.join('\n');for(const action of ['cancel','session','unhealthy','busy'])if(!text.includes('TRANSFER_QUEUE_CANCEL '+action+' rejectedOld=true,control=true'))throw Error('旧队列请求未失效:'+action)
 if(!/TRANSFER_DONE groups=3/.test(text)||!text.includes('TRANSFER_ABORT oldRejected=true,disconnect=true')||!text.includes('TRANSFER_DEADLINE expired=true'))throw Error('传输截止或取消失败')
 if(JSON.stringify(formal())!==JSON.stringify(before))throw Error('正式包元数据改变')
 writeFileSync(path.join(root,'docs/operations/channel-updates-evidence/android-phase6-transfer.json'),JSON.stringify({verifiedAt:new Date().toISOString(),sourceSha:info.sourceSha,sourceDirty:false,api,deviceModel:adb('shell','getprop','ro.product.model').trim(),packageName:pkg,apkSha256:info.sha256,minified:true,installation,passedGroups:3,controlActions:4,evidence:lines,formalPackageUnchanged:true,limits:['实际Android/R8/原生串行队列，非DCloud','HttpURLConnection阻塞替身用于控制器测试；真实TLS另外由JVM回环测试证明','未触发真实交易、TRTC、录音、上传或业务API']},null,2)+'\n')
 console.log('通过：Android/R8旧队列请求在四种控制事件后失效，独立取消及250ms截止触发，正式包未变')
}finally{adb('shell','am','force-stop',pkg)}
