import{readFileSync,statSync}from'node:fs';import{resolve,join}from'node:path';import{createHash}from'node:crypto';
const [manifestPath,pagesDirectory]=process.argv.slice(2);if(!manifestPath||!pagesDirectory)throw Error('用法：node scripts/ops/managed-exit-verify.mjs 退出清单.json 分页目录');
const root=resolve(pagesDirectory),manifest=JSON.parse(readFileSync(resolve(manifestPath),'utf8'));
const allowed=['users','products','courses','chapters','progress','circles','orders','knowledge','members','posts','agents','addresses','aftercare','assets','origins','orderOrigins','postOrigins','joinRequests','mutes','chatSessions','chatMessages','audit'];
if(manifest.version!==3||manifest.format!=='managed-json-pages'||JSON.stringify(Object.keys(manifest.collections||{}).sort())!==JSON.stringify(allowed.slice().sort()))throw Error('退出清单版本或集合不完整');
const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}':JSON.stringify(value);
const sha=value=>createHash('sha256').update(value).digest('hex');let totalRows=0,totalBytes=0,pages=0,assets=0;
for(const collection of allowed){const meta=manifest.collections[collection];if(!Array.isArray(meta.pages)||!Number.isSafeInteger(meta.rows)||meta.rows<0)throw Error('集合清单无效：'+collection);let rows=0;
  for(const [index,page]of meta.pages.entries()){
    if(page.page!==index||!Number.isSafeInteger(page.rows)||page.rows<1||!/^[a-f0-9]{64}$/.test(page.sha256))throw Error('分页清单无效：'+collection);
    const path=join(root,'managed-'+collection+'-'+index+'.json');if(statSync(path).size>4*1024*1024)throw Error('分页文件超过容量');const chunk=JSON.parse(readFileSync(path,'utf8'));
    if(chunk.collection!==collection||chunk.page!==index||!Array.isArray(chunk.payload)||chunk.payload.length!==page.rows||chunk.sha256!==page.sha256||sha(canonical(chunk.payload))!==page.sha256)throw Error('退出分页内容、行数或摘要不符：'+collection+'-'+index);
    if(collection==='assets')for(const asset of chunk.payload){if(!['image/png','image/jpeg'].includes(asset.contentType)||typeof asset.dataBase64!=='string')throw Error('附件类型无效');const bytes=Buffer.from(asset.dataBase64,'base64');if(bytes.length!==asset.size||sha(bytes)!==asset.sha256)throw Error('附件字节或摘要不符');assets++;}
    rows+=chunk.payload.length;totalBytes+=Buffer.byteLength(JSON.stringify(chunk.payload));pages++;
  }
  if(rows!==meta.rows)throw Error('集合总行数不符：'+collection);totalRows+=rows;
}
if(totalRows!==manifest.totalRows||totalBytes!==manifest.totalBytes)throw Error('退出总行数或字节数不符');
console.log(JSON.stringify({verified:true,version:3,collections:allowed.length,pages,totalRows,totalBytes,assets,readOnly:true,credentialsImported:false}));
