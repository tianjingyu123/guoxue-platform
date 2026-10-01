#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

// 只解析固定版本的数据字面量；不执行下载包中的代码或生命周期脚本。
const sourceDir=path.resolve(process.argv[2]||'');
assert.ok(process.argv[2],'用法：node scripts/release/generate-shipping-regions.mjs 已验真包目录');
const pkg=JSON.parse(fs.readFileSync(path.join(sourceDir,'package.json'),'utf8'));
assert.equal(pkg.name,'@vant/area-data');assert.equal(pkg.version,'2.1.0');assert.equal(pkg.license,'MIT');
const input=fs.readFileSync(path.join(sourceDir,'dist/index.js'),'utf8');
assert.ok(input.startsWith('const areaList = {'));
const end=input.indexOf('\n};');assert.ok(end>0);
const literal=input.slice(input.indexOf('{'),end+2)
  .replace(/([{,]\s*)(province_list|city_list|county_list|\d+)\s*:/g,'$1"$2":')
  .replace(/,\s*([}\]])/g,'$1');
const raw=JSON.parse(literal),regions={};let duplicateLabels=0;
for(const [provinceCode,province] of Object.entries(raw.province_list)){
  const cities={};
  for(const [cityCode,city] of Object.entries(raw.city_list)){
    if(!cityCode.startsWith(provinceCode.slice(0,2)))continue;
    assert.ok(!cities[city],'同省内同名城市不能覆盖');
    const labels=Object.entries(raw.county_list).filter(([code])=>code.startsWith(cityCode.slice(0,4))).map(([,name])=>name);
    const districts=[...new Set(labels)];duplicateLabels+=labels.length-districts.length;
    assert.ok(districts.length,'地区列表不能出现无法完成选择的空城市');cities[city]=districts;
  }
  assert.ok(Object.keys(cities).length,'省级列表不能为空');regions[province]=cities;
}
assert.equal(Object.keys(regions).length,34);
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const license=fs.readFileSync(path.join(sourceDir,'LICENSE'),'utf8');
assert.ok(license.startsWith('MIT License'));assert.ok(license.includes('Copyright (c) Youzan'));
const dir='apps/mobile/src/pkg-account/lib';
const json=JSON.stringify(regions,null,2);
fs.writeFileSync(path.join(dir,'shipping-regions.ts'),`/**\n * 收货地区数据：@vant/area-data 2.1.0（MIT），来源及摘要见 shipping-regions-source.json。\n * 原版权及完整许可见 shipping-regions.LICENSE；只用于收货表单，不替换排盘地点数据。\n * 数据版本不等于最新行政区划证明；具体门牌、镇街变更由详细地址补充。\n */\nexport const SHIPPING_REGIONS: Record<string, Record<string, string[]>> = ${json}\n\nexport const SHIPPING_PROVINCES = Object.keys(SHIPPING_REGIONS)\n`);
fs.writeFileSync(path.join(dir,'shipping-regions.LICENSE'),license);
const receipt={name:pkg.name,version:pkg.version,license:pkg.license,repository:'https://github.com/vant-ui/vant/tree/main/packages/vant-area-data',registry:'https://registry.npmjs.org/@vant/area-data/2.1.0',sourceFileSha256:hash(input),licenseSha256:hash(license),normalizedDataSha256:hash(json),provinces:Object.keys(regions).length,cities:Object.values(regions).reduce((n,c)=>n+Object.keys(c).length,0),districts:Object.values(regions).reduce((n,c)=>n+Object.values(c).reduce((a,d)=>a+d.length,0),0),duplicateLabelsRemoved:duplicateLabels,purpose:'收货地址选择；不代表全部物流范围、官方最新行政区划或排盘地理数据库'};
fs.writeFileSync(path.join(dir,'shipping-regions-source.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
