import assert from "node:assert/strict";
import test from "node:test";

import { validateWxml } from "../../apps/mobile/scripts/validate-mp-wxml.mjs";
import {
  validateMpArtifactPath,
  validateMpTextArtifact,
} from "../../apps/mobile/scripts/validate-mp-artifacts.mjs";

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

test("微信文本产物门禁拦截历史编码损坏字符", () => {
  assert.deepEqual(validateMpTextArtifact('const title = "损坏�文本";', ".js"), [
    "包含 Unicode 替换字符 U+FFFD",
  ]);
});

test("微信文本产物门禁拦截不兼容 WXSS 选择器", () => {
  assert.equal(validateMpTextArtifact(".body > * { margin: 1px; }", ".wxss").length, 1);
  assert.equal(validateMpTextArtifact(".pickers > :first-child { flex: 1; }", ".wxss").length, 1);
  assert.deepEqual(validateMpTextArtifact(".body > view { margin: 1px; }", ".wxss"), []);
});

test("微信产物门禁拦截平台会忽略的双下划线保留目录", () => {
  assert.equal(validateMpArtifactPath("pkg-paipan/__shared__/tool.js").length, 1);
  assert.equal(validateMpArtifactPath("pkg-paipan/shared-components/tool.js").length, 0);
});
