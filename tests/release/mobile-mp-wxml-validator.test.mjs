import assert from "node:assert/strict";
import test from "node:test";

import { validateWxml } from "../../apps/mobile/scripts/validate-mp-wxml.mjs";

test("WXML 校验器接受正常属性、指令与自闭合标签", () => {
  const source = `
    <view class="card" wx:if="{{visible}}">
      <input placeholder="请输入确认注销" data-id="{{item.id}}" />
      <text aria-label='确认提示'>确认注销</text>
    </view>
  `;

  assert.deepEqual(validateWxml(source), []);
});

test("WXML 校验器忽略注释与 wxs 原始脚本文本", () => {
  const source = `
    <!-- <input placeholder="注释中的标签" /> -->
    <wxs module="guard">function ok(a, b) { return a < b; }</wxs>
    <view>正常内容</view>
  `;

  assert.deepEqual(validateWxml(source), []);
});

test("WXML 校验器拦截注销页曾出现的内嵌双引号故障", () => {
  const source = '<input placeholder="请输入"确认注销"" placeholder-class="ph" />';
  const issues = validateWxml(source);

  assert.equal(issues.length, 1);
  assert.equal(issues[0].line, 1);
  assert.match(issues[0].message, /结束引号后出现非法字符 "确"/u);
});

test("WXML 校验器拦截未加引号和未闭合的属性", () => {
  const unquoted = validateWxml("<view data-id={{item.id}}></view>");
  const unclosed = validateWxml('<view aria-label="确认注销></view>');

  assert.match(unquoted[0].message, /必须使用引号包裹/u);
  assert.match(unclosed[0].message, /引号未闭合/u);
});
