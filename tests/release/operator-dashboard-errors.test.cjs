const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('apps/mobile/src/pkg-operator/dashboard/index.vue', 'utf8');
const body = source.slice(source.indexOf('async function loadData()'), source.indexOf('onMounted(() =>'));
async function run(message, method) {
 const ctx = { operatorApi: {}, loading:{value:false},error:{value:''},notOpened:{value:false},plan:{},data:{},overview:{},teamHealth:{},members:{} };
 for(const name of ['getOperatorPricing','getDashboardData','getTeamOverview','getTeamHealth','getTeamMembers']) ctx.operatorApi[name] = async()=>{ if(name===method) throw Error(message); return name==='getTeamMembers'?[]:{}; };
 vm.createContext(ctx);
 vm.runInContext(body.replace('(e as Error)', 'e'),ctx);
 await ctx.loadData(); return ctx;
}
test('团队读取失败显示错误而不是空团队或未开通',async()=>{
 const r=await run('运营商团队读取失败','getTeamMembers');
 assert.equal(r.error.value,'运营商团队读取失败');assert.equal(r.notOpened.value,false);
});
test('确认不是运营商才显示开通引导',async()=>{
 const r=await run('当前用户不是运营商','getDashboardData');
 assert.equal(r.notOpened.value,true);assert.equal(r.loading.value,false);
});
