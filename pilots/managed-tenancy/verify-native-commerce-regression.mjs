import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeFileSync,readFileSync,mkdirSync} from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {assertFresh} from '../../scripts/ops/prisma-candidate/client.mjs';
const repo=fileURLToPath(new URL('../../',import.meta.url)),server=resolve(repo,'apps/server'),require=createRequire(resolve(server,'package.json')),runtime=resolve(repo,'pilots/managed-tenancy/.runtime');assertFresh();mkdirSync(runtime,{recursive:true});
const specs=['shop-order.service.spec.ts','shop-order-lifecycle.service.spec.ts','course-purchase.service.spec.ts','shop-order-types.constants.spec.ts'];
const config={rootDir:server,testEnvironment:'node',testMatch:specs.map(file=>'**/'+file),moduleFileExtensions:['ts','js','json'],transform:{'^.+\\.tsx?$':['ts-jest',{tsconfig:resolve(server,'tsconfig.jest.json'),diagnostics:false}]},setupFiles:[resolve(server,'test/jest-setup.ts')],moduleNameMapper:{'^@prisma/client$':resolve(server,'.prisma-candidate/client/index.js'),'^@guoxue/shared$':resolve(repo,'packages/shared/src/index.ts')},reporters:['default']};
const cfg=resolve(runtime,'native-commerce-jest.config.json'),results=resolve(runtime,'native-commerce-results-'+Date.now()+'.json');writeFileSync(cfg,JSON.stringify(config));
const run=spawnSync(process.execPath,[require.resolve('jest/bin/jest'),'--config',cfg,'--runInBand','--json','--outputFile',results,'--silent'],{cwd:server,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});writeFileSync(resolve(runtime,'native-commerce-jest.log'),(run.stdout||'')+(run.stderr||''));
if(run.error||run.status!==0){console.error('原商城与课程回归失败，诊断保留在本任务忽略目录');process.exit(1);}
const result=JSON.parse(readFileSync(results,'utf8')),files=['apps/server/src/modules/shop/shop-order.service.ts','apps/server/src/modules/shop/shop-order-lifecycle.service.ts','apps/server/src/modules/course/course-purchase.service.ts','apps/server/src/modules/shop/shop-order-types.constants.ts',...specs.map(file=>'apps/server/src/modules/'+(file.startsWith('course')?'course/':'shop/')+file)];
const report={head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),workingTreeDirty:!!execFileSync('git',['status','--porcelain'],{cwd:repo,encoding:'utf8'}).trim(),sources:Object.fromEntries(files.map(path=>[path,createHash('sha256').update(readFileSync(resolve(repo,path))).digest('hex')])),passed:result.numPassedTests,failed:result.numFailedTests,success:result.success,production:false,limits:['四套原平台定价、归因、下单和生命周期单元回归；不代表真实商户或真实付款、退款和分佣验收']};
const output=resolve(process.argv[2]??resolve(runtime,'native-commerce-regression.json'));mkdirSync(resolve(output,'..'),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,report:output}));
