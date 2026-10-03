import {createRequire} from 'node:module';import {resolve} from 'node:path';import {fileURLToPath} from 'node:url';import {loadCandidatePrisma} from '../../scripts/ops/prisma-candidate/client.mjs';
const repo=fileURLToPath(new URL('../../',import.meta.url)),require=createRequire(resolve(repo,'apps/server/package.json'));loadCandidatePrisma();
if(process.argv.includes('--compiled')) require(resolve(repo,'apps/server/.prisma-candidate/server-build/lease-main.js'));
else { require('ts-node').register({transpileOnly:true,compilerOptions:{module:'commonjs',experimentalDecorators:true,emitDecoratorMetadata:true}});require(resolve(repo,'apps/server/src/lease-main.ts')); }
