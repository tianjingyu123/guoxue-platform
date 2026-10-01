import {execFileSync} from 'node:child_process'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const jdk=process.env.REBU_NATIVE_JDK||'D:/Tools/xiaozhi-build/jdk-17.0.20.1+1', output=path.join(root,'artifacts/native-transfer-test')
mkdirSync(output,{recursive:true})
// 回环 TLS 的临时夹具证书；口令是公开测试值，不使用任何正式签名材料。
const certificate=path.join(output,'fixture-'+Date.now()+'.p12')
execFileSync(path.join(jdk,'bin/keytool.exe'),['-genkeypair','-alias','fixture','-keyalg','RSA','-keysize','2048','-validity','2','-dname','CN=localhost','-ext','SAN=dns:localhost,ip:127.0.0.1','-storetype','PKCS12','-keystore',certificate,'-storepass','fixture-only'],{stdio:'pipe'})
const sources=['ResourceCrypto.java','ResourceTransfer.java','ResourceStore.java'].map(name=>path.join(root,'apps/mobile/native/resource-updater/src/cn/rebu/resource',name))
sources.push(path.join(root,'tests/release/native/NativeTransferProbe.java'))
execFileSync(path.join(jdk,'bin/javac.exe'),['-encoding','UTF-8','-d',output,...sources],{stdio:'inherit'})
const result=execFileSync(path.join(jdk,'bin/java.exe'),['-cp',output,'NativeTransferProbe',certificate],{encoding:'utf8',timeout:30000})
console.log(result.trim())
writeFileSync(path.join(output,'evidence.json'),JSON.stringify({sourceSha:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceDirty:Boolean(execFileSync('git',['status','--porcelain','--','apps','packages','scripts','tests'],{cwd:root,encoding:'utf8'}).trim()),inputs:Object.fromEntries(sources.map(file=>[path.relative(root,file).replaceAll('\\','/'),createHash('sha256').update(readFileSync(file)).digest('hex')])),result:JSON.parse(result.trim()),limits:['临时证书和回环HTTPS，仅JVM，不冒充Android网络栈','未调用业务API、支付、直播或商店后台']},null,2)+'\n')
