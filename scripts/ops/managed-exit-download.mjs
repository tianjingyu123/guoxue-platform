import {readFileSync,lstatSync,realpathSync,existsSync,mkdirSync,openSync,writeFileSync,fsyncSync,closeSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {managedExitCollections,canonicalExitJson,validateExitManifest,validateExitPage,verifyManagedExitFiles} from './managed-exit-format.mjs';

/** 凭据与退出资料只使用调用者已有的受限目录；Windows不能只凭mode宣称受限。 */
export function verifyExitPrivatePath(path,directory=false){
  const full=resolve(path),stat=lstatSync(full);
  if(stat.isSymbolicLink()||(directory?!stat.isDirectory():!stat.isFile()))throw Error('受限路径类型无效');
  const normalize=p=>process.platform==='win32'?p.toLowerCase():p;
  if(normalize(realpathSync(full))!==normalize(full))throw Error('受限路径不能经过符号链接或目录联接');
  if(process.platform==='win32'){
    const literal=full.replaceAll("'","''"),code=`$ErrorActionPreference='Stop'; $allowed=@([Security.Principal.WindowsIdentity]::GetCurrent().User.Value,'S-1-5-18','S-1-5-32-544'); foreach($rule in (Get-Acl -LiteralPath '${literal}').Access){if($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin $allowed){throw '权限范围过大'}}`;
    try{execFileSync('pwsh.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(code,'utf16le').toString('base64')],{windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:15000});}catch{throw Error('受限路径ACL核验未通过（须使用PowerShell 7）');}
  }else if((stat.mode&0o077)!==0||![0,process.getuid()].includes(stat.uid))throw Error('受限路径权限核验未通过');
}
const safeId=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,120}$/.test(v);
function validateConfiguration(raw){
  if(!raw||Array.isArray(raw)||!safeId(raw.customerId)||!safeId(raw.applicationId)||!safeId(raw.exportId)||typeof raw.clientKey!=='string'||raw.clientKey.length<1||raw.clientKey.length>80||/[\r\n]/.test(raw.clientKey)||typeof raw.accessToken!=='string'||raw.accessToken.length>4096||!/^[a-zA-Z0-9_.-]+$/.test(raw.accessToken)||typeof raw.downloadToken!=='string'||!/^[a-zA-Z0-9_-]{43}$/.test(raw.downloadToken))throw Error('固定客户下载配置无效');
  const origin=new URL(raw.origin);if(origin.username||origin.password||origin.search||origin.hash||origin.pathname!=='/'||!(origin.protocol==='https:'||(origin.protocol==='http:'&&origin.hostname==='127.0.0.1'&&origin.port)))throw Error('下载入口须为明确HTTPS源站或本机loopback');
  return {...raw,origin:origin.origin};
}
const privateJson=(path,value,first=false)=>{const fd=openSync(path,first?'wx':'w',0o600);try{writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fsyncSync(fd);}finally{closeSync(fd);}};
/** 只GET已有快照；不登录、不刷新令牌、不建立快照、不跨源或自动重试。 */
export async function downloadManagedExit(configurationPath,outputDirectory){
  verifyExitPrivatePath(configurationPath);verifyExitPrivatePath(dirname(resolve(configurationPath)),true);
  const input=readFileSync(configurationPath);if(input.length>64*1024)throw Error('下载配置超过容量');const config=validateConfiguration(JSON.parse(input.toString('utf8')));
  const target=resolve(outputDirectory);verifyExitPrivatePath(dirname(target),true);if(existsSync(target))throw Error('下载目录已存在，禁止覆盖或混入旧分页');
  const binding={customerId:config.customerId,applicationId:config.applicationId},headers={'x-app-client':config.clientKey,Authorization:'Bearer '+config.accessToken,'x-export-token':config.downloadToken};
  let requestCount=0,downloadedPages=0,downloadedBytes=0,started=false;
  const get=async(path,limit)=>{
    requestCount++;let response;try{response=await fetch(config.origin+'/api/v1/lease'+path,{method:'GET',headers,redirect:'error',signal:AbortSignal.timeout(30000)});}catch{throw Error('退出下载网络未确认，未重试');}
    if(!response.ok){void response.body?.cancel().catch(()=>{});throw Error('退出下载被拒绝：HTTP '+response.status);}
    if(!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')||'')){void response.body?.cancel().catch(()=>{});throw Error('退出下载响应类型无效');}
    const length=response.headers.get('content-length');if(length&&(!/^[0-9]+$/.test(length)||Number(length)>limit)){void response.body?.cancel().catch(()=>{});throw Error('退出下载响应超过容量');}
    const reader=response.body?.getReader();if(!reader)throw Error('退出下载响应无正文');const chunks=[];let bytes=0;
    try{for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>limit)throw Error('退出下载响应超过容量');chunks.push(part.value);}const body=Buffer.concat(chunks),secrets=[config.accessToken,config.downloadToken];if(secrets.some(secret=>body.includes(Buffer.from(secret))))throw Error('退出响应含认证或下载凭据，拒绝保存');const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body));if(secrets.some(secret=>JSON.stringify(value).includes(secret)))throw Error('退出响应转义后含凭据，拒绝保存');return value;}
    catch{throw Error('退出下载正文无效、含凭据或超过容量');}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  };
  const authorize=async()=>{const context=await get('/context',64*1024);if(context.customerId!==binding.customerId||context.applicationId!==binding.applicationId||context.role!=='CUSTOMER_ADMIN')throw Error('下载入口身份或管理员权限与固定客户应用不符');};
  const coreManifest=value=>{const clean={...value};delete clean.maintenanceReadOnly;delete clean.auditRecorded;return clean;};
  try{
    await authorize();const manifest=coreManifest(await get('/exports/'+config.exportId,8*1024*1024));validateExitManifest(manifest,binding);
    mkdirSync(target,{mode:0o700});started=true;verifyExitPrivatePath(target,true);privateJson(resolve(target,'download-status.json'),{verified:false,state:'IN_PROGRESS'},true);privateJson(resolve(target,'manifest.json'),manifest,true);
    for(const collection of managedExitCollections)for(const[index,meta]of manifest.collections[collection].pages.entries()){
      const chunk=await get('/exports/'+config.exportId+'/pages/'+collection+'/'+index,4*1024*1024),valid=validateExitPage(chunk,collection,index,meta);downloadedBytes+=valid.bytes;if(downloadedBytes>128*1024*1024)throw Error('退出累计载荷超过容量');
      privateJson(resolve(target,'managed-'+collection+'-'+index+'.json'),chunk,true);downloadedPages++;
    }
    // 最后再核远端快照及授权，并从已落盘文件独立读取验真。
    const latest=coreManifest(await get('/exports/'+config.exportId,8*1024*1024));validateExitManifest(latest,binding);if(canonicalExitJson(latest)!==canonicalExitJson(manifest))throw Error('退出下载期间清单发生变化');await authorize();
    const verified=verifyManagedExitFiles(resolve(target,'manifest.json'),target);const receipt={...verified,clientHttpMethods:['GET'],requestCount,downloadedPages,credentialsSaved:false,automaticRetries:0,state:'VERIFIED'};delete receipt.readOnly;privateJson(resolve(target,'download-status.json'),receipt);return receipt;
  }catch(error){if(started)privateJson(resolve(target,'download-status.json'),{verified:false,state:'FAILED',requestCount,downloadedPages,downloadedBytes,credentialsSaved:false,automaticRetries:0});throw error;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const[configurationPath,outputDirectory]=process.argv.slice(2);
  try{if(!configurationPath||!outputDirectory)throw Error();console.log(JSON.stringify(await downloadManagedExit(configurationPath,outputDirectory)));}
  catch{console.error('退出下载未通过；凭据和响应正文未输出。请检查受限配置与已有下载状态，使用新的空目录复核，工具不会自动重试。');process.exitCode=1;}
}
