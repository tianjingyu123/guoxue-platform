const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const dir=path.join(root,'apps/mobile/src/pkg-account/lib');
// Git 在 Windows 检出时可能转换为 CRLF，数据解析与摘要统一按来源的 LF 核验。
const source=fs.readFileSync(path.join(dir,'shipping-regions.ts'),'utf8').replace(/\r\n/g,'\n');
const match=source.match(/SHIPPING_REGIONS[^=]*= (\{[\s\S]*\})\n\nexport const SHIPPING_PROVINCES/);
assert.ok(match,'地区数据字面量缺失');
const regions=JSON.parse(match[1]);
const receipt=JSON.parse(fs.readFileSync(path.join(dir,'shipping-regions-source.json'),'utf8'));
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');

test('收货地区覆盖31个大陆省级区域及港澳台选项',()=>{
 const mainland=['北京市','天津市','河北省','山西省','内蒙古自治区','辽宁省','吉林省','黑龙江省','上海市','江苏省','浙江省','安徽省','福建省','江西省','山东省','河南省','湖北省','湖南省','广东省','广西壮族自治区','海南省','重庆市','四川省','贵州省','云南省','西藏自治区','陕西省','甘肃省','青海省','宁夏回族自治区','新疆维吾尔自治区'];
 for(const name of mainland)assert.ok(regions[name],name+'不能在收货选择器中缺失');
 assert.equal(Object.keys(regions).length,34);
 for(const name of ['香港特别行政区','澳门特别行政区','台湾省'])assert.ok(regions[name]);
});
test('每个城市都有可完成选择的非空且无重复区县选项',()=>{
 for(const [province,cities] of Object.entries(regions)){
  assert.ok(Object.keys(cities).length,province);
  for(const [city,districts] of Object.entries(cities)){
   assert.ok(districts.length,province+'/'+city);
   assert.equal(new Set(districts).size,districts.length,'重复名称会破坏选择器key');
   for(const d of districts)assert.ok(typeof d==='string'&&d.trim()===d&&d.length>0);
  }
 }
});
test('之前缺失的河北保定以及省直辖地区可以选择到区县',()=>{
 assert.ok(regions['河北省']['保定市'].includes('竞秀区'));
 assert.ok(regions['河南省']['省直辖县'].includes('济源市'));
 assert.ok(regions['海南省']['省直辖县'].includes('琼海市'));
 assert.ok(regions['新疆维吾尔自治区']['自治区直辖县级行政区划'].includes('石河子市'));
});
test('来源版本、数据摘要、计数及完整MIT许可可追溯',()=>{
 assert.equal(receipt.name,'@vant/area-data');assert.equal(receipt.version,'2.1.0');assert.equal(receipt.license,'MIT');
 assert.equal(hash(JSON.stringify(regions,null,2)),receipt.normalizedDataSha256);
 assert.equal(Object.keys(regions).length,receipt.provinces);
 assert.equal(Object.values(regions).reduce((n,c)=>n+Object.keys(c).length,0),receipt.cities);
 assert.equal(Object.values(regions).reduce((n,c)=>n+Object.values(c).reduce((a,d)=>a+d.length,0),0),receipt.districts);
 const license=fs.readFileSync(path.join(dir,'shipping-regions.LICENSE'),'utf8').replace(/\r\n/g,'\n');
 assert.equal(hash(license),receipt.licenseSha256);assert.match(license,/Copyright \(c\) Youzan/);assert.match(license,/THE SOFTWARE IS PROVIDED "AS IS"/);
});
test('地区表仅由地址编辑页引入，不污染共享账户API或排盘数据',()=>{
 const account=fs.readFileSync(path.join(dir,'account-data.ts'),'utf8');assert.doesNotMatch(account,/shipping-regions|export const REGIONS|export const PROVINCES/);
 const editor=fs.readFileSync(path.join(root,'apps/mobile/src/pkg-account/address-edit/index.vue'),'utf8');
 assert.match(editor,/from '@\/pkg-account\/lib\/shipping-regions'/);
 assert.match(editor,/accountApi\.saveAddress\(/);
 assert.doesNotMatch(fs.readFileSync(path.join(root,'apps/mobile/src/lib/region-data.ts'),'utf8'),/shipping-regions/);
});
