import test from "node:test";
import assert from "node:assert/strict";
import { readContentCategoryStats, readCategoryTree, buildCategoryTreePayload } from "../../apps/admin/src/utils/category-stats.ts";

test("品类统计使用真实 details 字段，不把一级总数误当二级总数", () => {
  const result = readContentCategoryStats({
    totalCategories: 1,
    totalGeneratedToday: 3,
    details: [
      { level1: "国学", level2: "儒家", knowledgeCount: 3, classicsCount: 5, tutorialCount: 2, totalCount: 10, healthScore: 100 },
      { level1: "国学", level2: "道家", knowledgeCount: 0, classicsCount: 0, tutorialCount: 0, totalCount: 0, healthScore: 0 },
    ],
  });
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].totalCount, 10);
  assert.equal(result.rows[0].healthScore, 100);
  assert.equal(result.totalGeneratedToday, 3);
});

test("异常统计值不会破坏图表范围", () => {
  const result = readContentCategoryStats({ details: [null, { level1: "国学", level2: "儒家", totalCount: -1, healthScore: 999 }] });
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].totalCount, 0);
  assert.equal(result.rows[0].healthScore, 100);
  assert.deepEqual(readContentCategoryStats(null), { rows: [], totalGeneratedToday: 0 });
});

test("品类树读取复制数组，编辑不会改动已保存基线", () => {
  const original = { 国学: ["儒家"] };
  const editable = readCategoryTree(original);
  editable.国学[0] = "道家";
  assert.equal(original.国学[0], "儒家");
});

test("保存品类树会规范空格并拒绝同级重名和空名", () => {
  assert.equal(JSON.stringify(buildCategoryTreePayload({ 旧名: [" 儒家 "] }, { 旧名: " 国学 " })), '{"国学":["儒家"]}');
  assert.throws(() => buildCategoryTreePayload({ 甲: ["子"], 乙: ["丑"] }, { 甲: "同名", 乙: "同名" }), /重复/);
  assert.throws(() => buildCategoryTreePayload({ 国学: ["儒家", " 儒家 "] }, {}), /重复/);
  assert.throws(() => buildCategoryTreePayload({ 国学: [" "] }, {}), /空的二级品类/);
  assert.throws(() => buildCategoryTreePayload({ 国学: ["儒家"] }, { 国学: " " }), /不能为空/);
  assert.throws(() => buildCategoryTreePayload({}, {}), /至少保留/);
});
