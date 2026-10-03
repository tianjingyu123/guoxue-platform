import {verifyManagedExitFiles} from './managed-exit-format.mjs';
const [manifestPath,pagesDirectory]=process.argv.slice(2);
if(!manifestPath||!pagesDirectory)throw Error('用法：node scripts/ops/managed-exit-verify.mjs 退出清单.json 分页目录');
console.log(JSON.stringify(verifyManagedExitFiles(manifestPath,pagesDirectory)));
