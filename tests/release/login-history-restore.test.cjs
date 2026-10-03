const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('apps/mobile/src/pkg-auth/login/index.vue', 'utf8');
const body = source.match(/function restoreLoginPage\(event: PageTransitionEvent\) \{([\s\S]*?)\nonMounted/)[0].replace(/\nonMounted$/, '').replace(': PageTransitionEvent', '');
function setup(token) {
  const calls = [];
  const context = { h5WechatAuthorizationUrl: {value:'pending'}, isLoading:{value:true}, getToken:()=>token, uni:{reLaunch:o=>calls.push(o.url)} };
  vm.createContext(context); vm.runInContext(body, context);
  return {context,calls};
}
test('首次页面显示不消耗正在进行的授权',()=>{
  const {context,calls}=setup('token'); context.restoreLoginPage({persisted:false});
  assert.equal(context.h5WechatAuthorizationUrl.value,'pending'); assert.equal(calls.length,0);
});
test('已登录返回缓存页回首页，不重新进入排盘',()=>{
  const {context,calls}=setup('token'); context.restoreLoginPage({persisted:true});
  assert.equal(context.h5WechatAuthorizationUrl.value,''); assert.deepEqual(calls,['/pages/index/index']);
});
test('未完成登录返回缓存页清除旧弹层，不假定登录成功',()=>{
  const {context,calls}=setup(''); context.restoreLoginPage({persisted:true});
  assert.equal(context.h5WechatAuthorizationUrl.value,''); assert.equal(context.isLoading.value,false); assert.equal(calls.length,0);
});
