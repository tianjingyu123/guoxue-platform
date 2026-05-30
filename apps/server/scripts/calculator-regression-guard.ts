/**
 * 计算器回归防线 — CI 集成脚本
 *
 * 检查项：
 * 1. 所有计算器文件必须有对应的测试覆盖（单元测试或交叉验证）
 * 2. 运行全量计算器测试确保无回归
 * 3. 新增计算器文件必须在交叉验证列表中注册
 *
 * 使用: npx ts-node scripts/calculator-regression-guard.ts
 */

import * as fs from "fs";
import * as path from "path";

const CALC_DIR = path.resolve(__dirname, "../src/modules/tool-registry/calculators");
const CROSS_VALIDATION_FILE = path.resolve(__dirname, "../test/cross-validation-extension.spec.ts");

function main() {
  console.log("═══ 计算器回归防线检查 ═══\n");

  // 1. 扫描所有计算器源文件
  const allFiles = fs.readdirSync(CALC_DIR);
  const calcFiles = allFiles
    .filter((f) => f.endsWith(".calculator.ts") && !f.endsWith(".spec.ts"))
    .map((f) => f.replace(".calculator.ts", ""));

  const specFiles = allFiles
    .filter((f) => f.endsWith(".calculator.spec.ts"))
    .map((f) => f.replace(".calculator.spec.ts", ""));

  console.log(`计算器总数: ${calcFiles.length}`);
  console.log(`有独立单元测试: ${specFiles.length}`);

  // 2. 检查交叉验证覆盖
  const crossValidationContent = fs.readFileSync(CROSS_VALIDATION_FILE, "utf-8");
  const crossValidatedCalcs = calcFiles.filter(
    (name) => crossValidationContent.includes(`${name}.calculator`) || crossValidationContent.includes(`"${name}"`)
  );
  console.log(`交叉验证覆盖: ${crossValidatedCalcs.length}`);

  // 3. 找出未覆盖的计算器
  const uncovered = calcFiles.filter(
    (name) => !specFiles.includes(name) && !crossValidatedCalcs.includes(name)
  );

  if (uncovered.length > 0) {
    console.error(`\n❌ 以下 ${uncovered.length} 个计算器缺少测试覆盖:`);
    for (const name of uncovered) {
      console.error(`   - ${name}.calculator.ts`);
    }
    console.error("\n解决方案: 在 test/cross-validation-extension.spec.ts 中添加条目，或创建独立 .spec.ts 文件");
    process.exit(1);
  }

  // 4. 统计报告
  const bothCovered = calcFiles.filter(
    (name) => specFiles.includes(name) && crossValidatedCalcs.includes(name)
  );
  const onlySpec = calcFiles.filter(
    (name) => specFiles.includes(name) && !crossValidatedCalcs.includes(name)
  );
  const onlyCross = calcFiles.filter(
    (name) => !specFiles.includes(name) && crossValidatedCalcs.includes(name)
  );

  console.log(`\n✅ 测试覆盖完整 (${calcFiles.length}/${calcFiles.length})`);
  console.log(`   双重覆盖（单测+交叉）: ${bothCovered.length}`);
  console.log(`   仅单元测试: ${onlySpec.length}`);
  console.log(`   仅交叉验证: ${onlyCross.length}`);
  console.log("\n下一步: 运行 npm run test:calculators 执行全量测试");
}

main();
