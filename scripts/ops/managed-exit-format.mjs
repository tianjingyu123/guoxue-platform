import {readFileSync,lstatSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';

export const managedExitCollections=['users','products','courses','chapters','progress','circles','orders','knowledge','members','posts','agents','addresses','aftercare','assets','origins','orderOrigins','postOrigins','joinRequests','mutes','chatSessions','chatMessages','audit'];
export const canonicalExitJson=value=>Array.isArray(value)?'['+value.map(canonicalExitJson).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalExitJson(value[k])).join(',')+'}':JSON.stringify(value);
export const exitSha=value=>createHash('sha256').update(value).digest('hex');
const count=(value,max)=>Number.isSafeInteger(value)&&value>=0&&value<=max;
export function validateExitManifest(manifest,binding){
  if(!manifest||manifest.version!==3||manifest.format!=='managed-json-pages'||!manifest.collections||Array.isArray(manifest.collections)||JSON.stringify(Object.keys(manifest.collections).sort())!==JSON.stringify(managedExitCollections.slice().sort()))throw Error('退出清单版本或集合不完整');
  if(!count(manifest.totalRows,100000)||!count(manifest.totalBytes,128*1024*1024)||manifest.pageSize!==500||manifest.pageSizes?.assets!==1)throw Error('退出清单容量或分页规则无效');
  if(binding&&(manifest.customerId!==binding.customerId||manifest.applicationId!==binding.applicationId))throw Error('退出清单与固定客户或应用不符');
  let total=0,pages=0;
  for(const name of managedExitCollections){const meta=manifest.collections[name];if(!meta||!Array.isArray(meta.pages)||!count(meta.rows,100000)||meta.pages.length>meta.rows)throw Error('集合清单无效：'+name);let rows=0;
    for(const[index,page]of meta.pages.entries()){if(page.page!==index||!count(page.rows,name==='assets'?1:500)||page.rows<1||typeof page.sha256!=='string'||!/^[a-f0-9]{64}$/.test(page.sha256))throw Error('分页清单无效：'+name);rows+=page.rows;pages++;}
    if(rows!==meta.rows)throw Error('集合清单总行数不符：'+name);total+=rows;
  }
  if(total!==manifest.totalRows||pages>100000)throw Error('退出清单总行数不符');return {pages,totalRows:total};
}
export function validateExitPage(chunk,collection,index,meta){
  if(!chunk||chunk.collection!==collection||chunk.page!==index||!Array.isArray(chunk.payload)||chunk.payload.length!==meta.rows||chunk.sha256!==meta.sha256||exitSha(canonicalExitJson(chunk.payload))!==meta.sha256)throw Error('退出分页内容、行数或摘要不符：'+collection+'-'+index);
  const bytes=Buffer.byteLength(JSON.stringify(chunk.payload));if(bytes>2*1024*1024)throw Error('分页载荷超过容量');let assets=0;
  if(collection==='assets')for(const asset of chunk.payload){if(!asset||!['image/png','image/jpeg'].includes(asset.contentType)||typeof asset.dataBase64!=='string'||!count(asset.size,512*1024))throw Error('附件类型或容量无效');const raw=Buffer.from(asset.dataBase64,'base64');if(raw.toString('base64')!==asset.dataBase64||raw.length!==asset.size||exitSha(raw)!==asset.sha256)throw Error('附件字节或摘要不符');assets++;}
  return {rows:chunk.payload.length,bytes,assets};
}
const readJson=(path,limit)=>{const stat=lstatSync(path);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>limit)throw Error('退出文件类型或容量无效');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(readFileSync(path)));};
export function verifyManagedExitFiles(manifestPath,pagesDirectory){
  const root=resolve(pagesDirectory),manifest=readJson(resolve(manifestPath),8*1024*1024);validateExitManifest(manifest);let totalRows=0,totalBytes=0,pages=0,assets=0;
  for(const collection of managedExitCollections)for(const[index,page]of manifest.collections[collection].pages.entries()){const chunk=readJson(join(root,'managed-'+collection+'-'+index+'.json'),4*1024*1024),result=validateExitPage(chunk,collection,index,page);totalRows+=result.rows;totalBytes+=result.bytes;pages++;assets+=result.assets;}
  if(totalRows!==manifest.totalRows||totalBytes!==manifest.totalBytes)throw Error('退出总行数或字节数不符');return {verified:true,version:3,collections:managedExitCollections.length,pages,totalRows,totalBytes,assets,readOnly:true,credentialsImported:false};
}
