import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const read = (file) => readFile(path.join(root, file), "utf8");

test("管理端路由在角色缓存缺失或损坏时默认拒绝并服务端复核身份", async () => {
  const source = await read("apps/admin/src/router/index.ts");
  assert.match(source, /await auth\.fetchProfile\(\)/);
  assert.match(source, /if \(requiredRoles\.length === 0\) return "\/403"/);
  assert.doesNotMatch(source, /userRoles\.length === 0\) return next\(\)/);
  assert.doesNotMatch(source, /解析失败不阻塞/);
  assert.doesNotMatch(source, /access\.roles\.includes\("SUPER_ADMIN"\)\) return true/);
  assert.match(source, /clearAdminSession\(\{ preserveRedirect: true \}\)/);
});

test("商家后台入口显式声明 MERCHANT 角色且全量导出不错误暴露给财务角色", async () => {
  const source = await read("apps/admin/src/router/index.ts");
  const merchantRoutes = [...source.matchAll(/path:\s*"merchant-backend\/[^"]+"[\s\S]{0,240}?meta:\s*\{[^}]*roles:\s*\["MERCHANT"\]/g)];
  assert.equal(merchantRoutes.length, 11);
  assert.match(source, /path:\s*"system\/export"[\s\S]{0,220}?roles:\s*\["SUPER_ADMIN", "OPERATION_ADMIN"\]/);
  assert.doesNotMatch(source, /path:\s*"system\/export"[\s\S]{0,220}?FINANCE_ADMIN/);
});

test("服务端权限守卫默认拒绝，敏感导出与商家接口拥有真实授权边界", async () => {
  const [rolesGuard, systemController, merchantController, merchantGuard] = await Promise.all([
    read("apps/server/src/common/roles.guard.ts"),
    read("apps/server/src/modules/system/system.controller.ts"),
    read("apps/server/src/modules/merchant/merchant-backend.controller.ts"),
    read("apps/server/src/modules/merchant/merchant.guard.ts"),
  ]);
  assert.match(rolesGuard, /if \(!requiredRoles \|\| requiredRoles\.length === 0\) return false/);

  const exportEndpoints = [...systemController.matchAll(/@Post\("export\/[^"]+"\)[\s\S]{0,180}?@Roles\(([^)]+)\)/g)];
  assert.equal(exportEndpoints.length, 6);
  for (const endpoint of exportEndpoints) {
    assert.match(endpoint[1], /"SUPER_ADMIN", "OPERATION_ADMIN"/);
    assert.doesNotMatch(endpoint[1], /FINANCE_ADMIN/);
  }

  assert.match(merchantController, /@Controller\("merchant-backend"\)[\s\S]{0,100}?@UseGuards\(JwtAuthGuard, MerchantGuard\)/);
  assert.match(merchantGuard, /merchant\.status !== "ACTIVE"/);
  assert.match(merchantGuard, /merchantMember\.findFirst/);
  assert.match(merchantGuard, /request\.actingUserId = userId/);
});

test("所有管理端懒加载路由指向真实存在的源码文件，路由名称不重复", async () => {
  const source = await read("apps/admin/src/router/index.ts");
  const imports = [...source.matchAll(/import\("@\/([^"?]+)"\)/g)].map((match) => match[1]);
  assert.ok(imports.length >= 200, `仅识别到 ${imports.length} 个页面路由`);
  for (const relative of imports) {
    assert.ok(existsSync(path.join(root, "apps/admin/src", relative)), `路由文件不存在：${relative}`);
  }

  // 只统计独占一行的路由声明，避免把守卫中的 `{ name: "NotFound" }` 导航目标误判为重复路由。
  const names = [...source.matchAll(/^\s+name:\s*"([^"]+)",?\s*$/gm)].map((match) => match[1]);
  const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
  assert.deepEqual(duplicateNames, []);
});

test("除登录、错误页和开发验收页外，每个页面路由都必须显式声明角色", async () => {
  const source = await read("apps/admin/src/router/index.ts");
  const components = [...source.matchAll(/component:\s*\(\)\s*=>\s*import\("@\/[^"]+"\)/g)];
  const missingRoles = [];

  for (const component of components) {
    const componentIndex = component.index;
    const context = source.slice(Math.max(0, componentIndex - 260), componentIndex);
    const routeName = context.match(/name:\s*"([^"]+)"[^]*$/)?.[1] || "未知路由";
    const metaIndex = source.indexOf("meta:", componentIndex + component[0].length);
    const openBrace = source.indexOf("{", metaIndex);
    let depth = 0;
    let closeBrace = openBrace;
    for (; closeBrace < source.length; closeBrace += 1) {
      if (source[closeBrace] === "{") depth += 1;
      if (source[closeBrace] === "}") depth -= 1;
      if (depth === 0) break;
    }
    const meta = source.slice(openBrace, closeBrace + 1);
    const exempt = /guest:\s*true|devPreview:\s*true/.test(meta)
      || routeName === "Forbidden"
      || routeName === "NotFound";
    if (!exempt && !/roles:\s*/.test(meta)) missingRoles.push(routeName);
  }

  assert.deepEqual(missingRoles, []);
});

test("大规模后台提供权限内全局检索、最近访问和完整键盘操作", async () => {
  const [palette, layout, session, globalCss] = await Promise.all([
    read("apps/admin/src/components/AdminCommandPalette.vue"),
    read("apps/admin/src/views/Layout.vue"),
    read("apps/admin/src/utils/auth-session.ts"),
    read("apps/admin/src/styles/global.css"),
  ]);
  assert.match(palette, /Ctrl\/Cmd\+K|event\.ctrlKey \|\| event\.metaKey/);
  assert.match(palette, /ArrowDown/);
  assert.match(palette, /ArrowUp/);
  assert.match(palette, /role="listbox"/);
  assert.match(palette, /admin_recent_routes/);
  assert.match(layout, /<AdminCommandPalette/);
  assert.match(layout, /aria-label="搜索后台功能，快捷键 Ctrl K"/);
  assert.match(session, /'admin_recent_routes'/);
  assert.match(globalCss, /:focus-visible/);
  assert.match(globalCss, /prefers-reduced-motion:\s*reduce/);
});

test("自动轮询静默降级且待办入口使用原生可聚焦按钮", async () => {
  const [connection, pending, layout, authStore] = await Promise.all([
    read("apps/admin/src/components/ConnectionStatus.vue"),
    read("apps/admin/src/components/PendingOverview.vue"),
    read("apps/admin/src/views/Layout.vue"),
    read("apps/admin/src/store/auth.ts"),
  ]);
  assert.match(connection, /silentError:\s*true/);
  assert.match(pending, /silentError:\s*true/);
  assert.match(pending, /<button[\s\S]*?class="po-item"/);
  assert.match(layout, /unreadCount\(\{ silentError: true \}\)/);
  assert.match(layout, /if \(!auth\.user\) await auth\.fetchProfile\(\)/);
  assert.match(authStore, /logout\(\{ notify: false \}\)/);
});

test("登录后工作现场恢复仅接受同源绝对路径", async () => {
  const [session, login, api] = await Promise.all([
    read("apps/admin/src/utils/auth-session.ts"),
    read("apps/admin/src/views/Login.vue"),
    read("apps/admin/src/api/index.ts"),
  ]);
  assert.match(session, /value\.startsWith\('\/\'/);
  assert.match(session, /value\.startsWith\('\/\/\'/);
  assert.match(session, /url\.origin !== origin/);
  assert.match(session, /basePath = import\.meta\.env\.BASE_URL/);
  assert.match(login, /consumeAdminRedirect\(\)/);
  assert.match(api, /rememberAdminRedirect\(currentPath\)/);
});

test("前后端 CSV 导出统一防止表格公式注入", async () => {
  const [clientExport, serverExport, serverTest] = await Promise.all([
    read("apps/admin/src/utils/export.ts"),
    read("apps/server/src/modules/system/export.service.ts"),
    read("apps/server/src/modules/system/export.service.spec.ts"),
  ]);
  const formulaGuard = /\^\[\\t\\r\\n \]\*\[=\+\\-@\]/;
  assert.match(clientExport, formulaGuard);
  assert.match(serverExport, formulaGuard);
  assert.match(serverTest, /疑似表格公式按文本导出/);
  assert.match(clientExport, /downloadCsvRows/);
});

test("AI Markdown 链接限制危险协议并隔离新窗口", async () => {
  const source = await read("apps/admin/src/components/ChatUI/markdown.ts");
  assert.match(source, /function safeHref/);
  assert.match(source, /\^\(https\?:\|mailto:\)/);
  assert.match(source, /rel="noopener noreferrer"/);
  assert.match(source, /return '#'/);
});

test("关键编辑页面统一保护未保存现场，课程分步保存失败时可安全重试", async () => {
  const [guard, content, course, competitionCreate, competitionEdit] = await Promise.all([
    read("apps/admin/src/composables/useUnsavedChanges.ts"),
    read("apps/admin/src/views/ContentEdit.vue"),
    read("apps/admin/src/views/courses/CourseEditor.vue"),
    read("apps/admin/src/views/competition/CompetitionCreate.vue"),
    read("apps/admin/src/views/competition/CompetitionEdit.vue"),
  ]);
  assert.match(guard, /onBeforeRouteLeave/);
  assert.match(guard, /beforeunload/);
  assert.match(guard, /captureBaseline/);
  for (const editor of [content, course, competitionCreate, competitionEdit]) {
    assert.match(editor, /useUnsavedChanges/);
    assert.match(editor, /captureBaseline\(\)/);
  }
  assert.match(course, /ch\.id = createdId/);
  assert.match(course, /已保留当前编辑现场，请修正后重试/);
  assert.match(course, /if \(chapterFailed > 0 \|\| auxiliaryFailed\)[\s\S]{0,360}?return/);
});

test("管理端页面规模纳入审计基线", async () => {
  async function countVueFiles(dir) {
    let count = 0;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) count += await countVueFiles(target);
      else if (entry.name.endsWith(".vue")) count += 1;
    }
    return count;
  }
  const count = await countVueFiles(path.join(root, "apps/admin/src/views"));
  assert.ok(count >= 220, `管理端页面数量异常：${count}`);
});

test("预发布多角色验收同时阻断角色缺失与最小权限污染", async () => {
  const verifier = await read("apps/server/scripts/qa-preprod-roles.cjs");
  assert.match(verifier, /const missingRoles = expectedRoles\.filter/);
  assert.match(verifier, /const unexpectedRoles = actualRoles\.filter/);
  assert.match(
    verifier,
    /const roleOk = missingRoles\.length === 0 && unexpectedRoles\.length === 0/,
  );
  assert.doesNotMatch(verifier, /expectedRoles\.every\(\(role\) => actualRoles\.includes\(role\)\)/);
});

test("AI事件证据只能由内部总线产生，部分失败可按稳定消费者续投", async () => {
  const [controller, eventBus, bridge] = await Promise.all([
    read("apps/server/src/modules/ai-gateway/ai-event-bus.controller.ts"),
    read("apps/server/src/modules/ai-gateway/ai-event-bus.service.ts"),
    read("apps/server/src/modules/ai-gateway/ai-ops-bridge.service.ts"),
  ]);
  assert.doesNotMatch(controller, /@Post\("publish"\)/);
  assert.doesNotMatch(controller, /:id\/process/);
  assert.match(eventBus, /consumerId\?: string/);
  assert.match(eventBus, /failedCount === 0/);
  assert.match(eventBus, /event\.processedBy\.includes\(consumerId\)/);
  assert.match(bridge, /consumerId: "ai-ops-bridge:anomaly-detected"/);
  assert.match(bridge, /sourceEventId: event\.id/);
});

test("AI协作未绑定真实动作处理器时不能伪造执行或回滚", async () => {
  const [service, page] = await Promise.all([
    read("apps/server/src/modules/ai-gateway/collaboration.service.ts"),
    read("apps/admin/src/views/ai/CollaborationList.vue"),
  ]);
  const autoApprove = service.slice(service.indexOf("private async autoApprove"));
  assert.match(service, /registerActionHandler/);
  assert.match(service, /尚未绑定受控动作处理器/);
  assert.match(service, /不能伪造回滚完成状态/);
  assert.doesNotMatch(autoApprove, /status: "executed"/);
  assert.match(page, /待接入执行器/);
  assert.match(page, /executionCapability\?\.executionReady/);
});

test("AI决策账本具备真实审核、效果回收、追溯与模型对比闭环", async () => {
  const [router, menu, api, page, controller, service, dto] = await Promise.all([
    read("apps/admin/src/router/index.ts"),
    read("apps/admin/src/lib/menu-structure.ts"),
    read("apps/admin/src/api/index.ts"),
    read("apps/admin/src/views/ai/DecisionLedger.vue"),
    read("apps/server/src/modules/ai-gateway/decision-ledger.controller.ts"),
    read("apps/server/src/modules/ai-gateway/decision-ledger.service.ts"),
    read("apps/server/src/modules/ai-gateway/dto/ai-infra.dto.ts"),
  ]);

  assert.match(router, /path:\s*"ai\/decisions"[\s\S]{0,180}?DecisionLedger\.vue/);
  assert.match(menu, /M\("\/ai\/decisions"\)/);
  assert.match(api, /review:[\s\S]{0,180}?action:[\s\S]{0,120}?note\?: string/);
  assert.match(api, /outcome:[\s\S]{0,180}?metric: string; expectedValue: number; actualValue: number/);
  assert.match(api, /compare:[\s\S]{0,180}?modelA: string; modelB: string; agentId: string/);
  assert.match(page, /人工审核 AI 决策/);
  assert.match(page, /记录决策实际效果/);
  assert.match(page, /决策追溯与复盘/);
  assert.match(page, /模型版本对比/);
  assert.match(controller, /async query\(@Query\(\) query: QueryDecisionDto\)/);
  assert.match(controller, /@Post\(":id\/outcome"\)[\s\S]{0,100}?@RedLineGate\(RedLine\.COMPLIANCE\)/);
  assert.match(dto, /class QueryDecisionDto[\s\S]{0,1500}?@Max\(100\)/);
  assert.match(service, /where: \{ id: decisionId, humanAction: null \}/);
  assert.match(service, /AI 决策不存在/);
  assert.match(service, /filters\.humanAction === "pending" \? null/);
});

test("AI协作采用原子审核与回滚，并提供真实验收和安全巡检执行器", async () => {
  const [service, controller, page, registry, opsModule, ledger, decisionPage] = await Promise.all([
    read("apps/server/src/modules/ai-gateway/collaboration.service.ts"),
    read("apps/server/src/modules/ai-gateway/collaboration.controller.ts"),
    read("apps/admin/src/views/ai/CollaborationList.vue"),
    read("apps/server/src/modules/ops/collaboration-inspection.service.ts"),
    read("apps/server/src/modules/ops/ops.module.ts"),
    read("apps/server/src/modules/ai-gateway/decision-ledger.service.ts"),
    read("apps/admin/src/views/ai/DecisionLedger.vue"),
  ]);
  assert.match(service, /this\.prisma\.\$transaction/);
  assert.match(service, /status: "rolling_back"/);
  assert.match(service, /status: "rollback_failed"/);
  assert.match(service, /feedbackRating: null/);
  assert.match(controller, /@Post\(":id\/feedback"\)[\s\S]{0,100}?@RedLineGate\(RedLine\.COMPLIANCE\)/);
  assert.match(page, /验收协作执行效果/);
  assert.match(page, /detail\.executionResult/);
  assert.match(page, /detail\.feedbackBy/);
  assert.match(registry, /registerActionHandler/);
  assert.match(registry, /allowAutoFix: false/);
  assert.match(registry, /report\.reportTaskId/);
  assert.match(opsModule, /providers:[\s\S]{0,180}?CollaborationInspectionService/);
  assert.match(ledger, /assertStandaloneDecision/);
  assert.match(decisionPage, /前往协作审核/);
});

test("定时任务页区分只读运行时任务和超管受控手动任务", async () => {
  const [controller, service, api, page] = await Promise.all([
    read("apps/server/src/modules/system/system.controller.ts"),
    read("apps/server/src/modules/system/system.service.ts"),
    read("apps/admin/src/api/index.ts"),
    read("apps/admin/src/views/system/CronManage.vue"),
  ]);
  assert.match(controller, /@Post\("cron\/:jobName\/manual"\)[\s\S]{0,180}?@Roles\("SUPER_ADMIN"\)/);
  assert.match(service, /runExclusive\([\s\S]{0,100}?`system-webhook-\$\{jobName\}`/);
  assert.match(service, /userId: triggeredBy === "WEBHOOK" \? null : triggeredBy/);
  assert.match(api, /cron\/\$\{jobName\}\/manual/);
  assert.match(page, /v-if="row\.manualRunnable"/);
  assert.match(page, /仅自动调度/);
});

test("管理员关闭悬赏按业务单号原子解冻并保留关闭证据", async () => {
  const [schema, service, controller, page] = await Promise.all([
    read("apps/server/prisma/schema.prisma"),
    read("apps/server/src/modules/bounty/bounty.service.ts"),
    read("apps/server/src/modules/bounty/bounty-admin.controller.ts"),
    read("apps/admin/src/views/bounty/QuestionList.vue"),
  ]);
  assert.match(schema, /closeReason\s+String\?/);
  assert.match(schema, /closedBy\s+String\?/);
  assert.match(service, /this\.prisma\.\$transaction/);
  assert.match(service, /question\.id,[\s\S]{0,30}?tx/);
  assert.match(service, /先完成赏金归属处理/);
  assert.match(controller, /@Body\(\) body: CloseBountyQuestionDto/);
  assert.match(page, /\['OPEN', 'CLAIMED'\]\.includes/);
});

test("移动端数据大屏的顶部操作满足44px触控目标", async () => {
  const styles = await read("apps/admin/src/styles/bigscreen.css");
  assert.match(
    styles,
    /@media \(max-width: 560px\) \{[\s\S]{0,180}?\.screen-presentation-button \{[^}]*min-height: 44px/,
  );
});
