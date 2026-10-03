const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ts=require('node:module').createRequire(require('node:path').resolve('apps/mobile/package.json'))('typescript');
const src=fs.readFileSync('apps/mobile/src/lib/legacy-h5-navigation.ts','utf8').replace(/export /g,'');
const c={URL};vm.createContext(c);vm.runInContext(ts.transpile(src),c);
test('返回标记只消费一次并保留路由状态',()=>{const h={state:{position:3,back:'/home'},replaceState(s){this.state=s}};c.markLegacyDeparture(h);assert.equal(c.consumeLegacyReturn(h),true);assert.equal(c.consumeLegacyReturn(h),false);assert.equal(h.state.position,3);assert.equal(h.state.back,'/home');});
test('推荐链接不丢参数且拒绝非排盘地址',()=>{assert.equal(c.validateLegacyNavigation('https://www.yrydai.com/p1.php?ruid=123'),'https://www.yrydai.com/p1.php?ruid=123');for(const u of ['http://www.yrydai.com/p1.php','https://www.yrydai.com.evil.test','https://u:p@www.yrydai.com/'])assert.throws(()=>c.validateLegacyNavigation(u));});
