import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { RedLine } from "./red-lines";

type WriteVerb = "POST" | "PUT" | "PATCH" | "DELETE";

interface WriteRoute {
  file: string;
  line: number;
  verb: WriteVerb;
  route: string;
  roles: string[];
  backendScoped: boolean;
  redLines: RedLine[];
}

const MODULE_ROOT = join(__dirname, "../modules");
const ADMIN_ROLES = new Set([
  "SUPER_ADMIN",
  "OPERATION_ADMIN",
  "FINANCE_ADMIN",
  "CONTENT_AUDITOR",
  "GOODS_AUDITOR",
  "CUSTOMER_SERVICE",
  "MERCHANT",
]);
const BACKEND_PREFIX = /(?:^|\/)(?:admin|manage|merchant-backend|ops|system|dashboard|finance|settlement|commission|pricing|payout|payee-account|huifu|audit|notification|email|webhooks?|feature-flags?)(?:\/|$)/i;

const REQUIRED_ROUTES: Array<[string, RedLine[]]> = [
  // 商品、商家、履约与资金
  ["POST shop/products", [RedLine.EXTERNAL_PUBLISH]],
  ["PUT shop/products/:id", [RedLine.MONEY, RedLine.EXTERNAL_PUBLISH]],
  ["PUT shop/products/:id/status", [RedLine.EXTERNAL_PUBLISH]],
  ["DELETE shop/products/:id", [RedLine.IRREVERSIBLE]],
  ["PUT shop/orders/:id/ship", [RedLine.EXTERNAL_PUBLISH, RedLine.IRREVERSIBLE]],
  ["PUT shop/orders/:id/refund", [RedLine.MONEY]],
  ["PUT shop/orders/:id/logistics", [RedLine.EXTERNAL_PUBLISH]],
  ["PUT shop/admin/after-sales/:id/process", [RedLine.MONEY]],
  ["POST merchant-backend/products", [RedLine.EXTERNAL_PUBLISH]],
  ["PUT merchant-backend/products/:id", [RedLine.MONEY, RedLine.EXTERNAL_PUBLISH]],
  ["DELETE merchant-backend/products/:id", [RedLine.IRREVERSIBLE]],
  ["POST merchant-backend/products/:id/list", [RedLine.EXTERNAL_PUBLISH]],
  ["POST merchant-backend/products/:id/unlist", [RedLine.EXTERNAL_PUBLISH]],
  ["PUT merchant-backend/orders/:id/ship", [RedLine.EXTERNAL_PUBLISH, RedLine.IRREVERSIBLE]],
  ["POST merchant-backend/orders/batch-ship", [RedLine.EXTERNAL_PUBLISH, RedLine.IRREVERSIBLE]],
  ["POST merchant-backend/orders/:id/refund/approve", [RedLine.MONEY]],
  ["POST merchant-backend/orders/:id/refund/reject", [RedLine.MONEY]],
  ["POST merchant-backend/inventory/adjustments", [RedLine.EXTERNAL_PUBLISH]],
  ["POST merchant-backend/purchase-orders/:id/submit", [RedLine.MONEY, RedLine.IRREVERSIBLE]],
  ["POST merchant-backend/purchase-orders/:id/receive", [RedLine.EXTERNAL_PUBLISH, RedLine.IRREVERSIBLE]],
  ["POST huifu/split", [RedLine.MONEY]],
  ["POST huifu/refund", [RedLine.MONEY]],
  ["POST commission/admin/withdrawals/:id/payout", [RedLine.MONEY]],
  ["POST finance/withdrawals/:id/pay", [RedLine.MONEY]],

  // 直播、内容、消息与赛事外发
  ["PUT live/rooms/:id/start", [RedLine.EXTERNAL_PUBLISH]],
  ["PUT live/rooms/:id/start-obs", [RedLine.EXTERNAL_PUBLISH]],
  ["PUT live/rooms/:id/end", [RedLine.EXTERNAL_PUBLISH]],
  ["DELETE live/rooms/:id", [RedLine.IRREVERSIBLE]],
  ["PUT live/rooms/:id/replay", [RedLine.EXTERNAL_PUBLISH]],
  ["PUT live/rooms/:id/replay/unpublish", [RedLine.EXTERNAL_PUBLISH]],
  ["POST email/send", [RedLine.EXTERNAL_PUBLISH]],
  ["POST email/send-template", [RedLine.EXTERNAL_PUBLISH]],
  ["POST courses/drafts/:id/publish", [RedLine.EXTERNAL_PUBLISH]],
  ["POST admin/competitions/:id/publish", [RedLine.EXTERNAL_PUBLISH]],
  ["POST admin/competitions/:id/start", [RedLine.EXTERNAL_PUBLISH]],
  ["POST admin/competitions/:id/finish", [RedLine.EXTERNAL_PUBLISH]],

  // 客户端版本发布工作流
  ["DELETE system/version/:id", [RedLine.IRREVERSIBLE]],
  ["POST system/version/:id/publish", [RedLine.EXTERNAL_PUBLISH]],
  ["POST system/version/:id/rollback", [RedLine.EXTERNAL_PUBLISH]],
  ["POST system/version/:id/retire", [RedLine.EXTERNAL_PUBLISH]],

  // AI 治理、人审权限与批量高风险入口
  ["PUT ops/tasks/:id/approval", [RedLine.COMPLIANCE]],
  ["POST ai/collaborations/:id/review", [RedLine.COMPLIANCE]],
  ["POST ai/collaborations/:id/execute", [RedLine.COMPLIANCE]],
  ["POST ai/collaborations/:id/feedback", [RedLine.COMPLIANCE]],
  ["POST ai/decisions/:id/review", [RedLine.COMPLIANCE]],
  ["POST ai/decisions/:id/outcome", [RedLine.COMPLIANCE]],
  ["POST system/automation/toggle", [RedLine.COMPLIANCE]],
  ["POST system/cron/:jobName/manual", [RedLine.COMPLIANCE]],
  ["POST system/ops-actions/execute", [RedLine.COMPLIANCE]],
  ["PUT admin/roles/:role/permissions", [RedLine.USER_DATA, RedLine.COMPLIANCE]],
  ["POST identity/admin/approve/:id", [RedLine.USER_DATA, RedLine.COMPLIANCE]],
  ["POST identity/admin/reject/:id", [RedLine.USER_DATA, RedLine.COMPLIANCE]],
  ["POST system/import/:type", [RedLine.MONEY, RedLine.USER_DATA, RedLine.EXTERNAL_PUBLISH]],
  ["POST system/backup/upload-cos", [RedLine.USER_DATA, RedLine.EXTERNAL_PUBLISH]],
];

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory()
      ? walk(path)
      : /\.controller\.ts$/i.test(name)
        ? [path]
        : [];
  });
}

function decoratorsOf(node: ts.Node): readonly ts.Decorator[] {
  return ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : [];
}

function decoratorCall(node: ts.Node, name: string): ts.CallExpression | undefined {
  for (const decorator of decoratorsOf(node)) {
    if (!ts.isCallExpression(decorator.expression)) continue;
    if (decorator.expression.expression.getText() === name) return decorator.expression;
  }
  return undefined;
}

function stringArguments(call?: ts.CallExpression): string[] {
  return call?.arguments
    .filter(ts.isStringLiteralLike)
    .map((argument) => argument.text) ?? [];
}

function writeRouteOf(node: ts.MethodDeclaration): { verb: WriteVerb; path: string } | undefined {
  const decorators: Array<[string, WriteVerb]> = [
    ["Post", "POST"],
    ["Put", "PUT"],
    ["Patch", "PATCH"],
    ["Delete", "DELETE"],
  ];
  for (const [decorator, verb] of decorators) {
    const call = decoratorCall(node, decorator);
    if (call) return { verb, path: stringArguments(call)[0] ?? "" };
  }
  return undefined;
}

function routePath(prefix: string, path: string): string {
  return [prefix, path].filter(Boolean).join("/").replace(/\/{2,}/g, "/");
}

function scanWriteRoutes(): WriteRoute[] {
  const routes: WriteRoute[] = [];
  for (const file of walk(MODULE_ROOT)) {
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    source.forEachChild((node) => {
      if (!ts.isClassDeclaration(node)) return;
      const prefix = stringArguments(decoratorCall(node, "Controller"))[0] ?? "";
      const classRoles = stringArguments(decoratorCall(node, "Roles"));
      for (const member of node.members) {
        if (!ts.isMethodDeclaration(member)) continue;
        const writeRoute = writeRouteOf(member);
        if (!writeRoute) continue;
        const route = routePath(prefix, writeRoute.path);
        const roles = [...new Set([...classRoles, ...stringArguments(decoratorCall(member, "Roles"))])];
        const redLines = (decoratorCall(member, "RedLineGate")?.arguments ?? []).map((argument) =>
          argument.getText().replace(/^RedLine\./, "") as RedLine,
        );
        routes.push({
          file: relative(MODULE_ROOT, file).replace(/\\/g, "/"),
          line: source.getLineAndCharacterOfPosition(member.getStart(source)).line + 1,
          verb: writeRoute.verb,
          route,
          roles,
          backendScoped: BACKEND_PREFIX.test(route) || roles.some((role) => ADMIN_ROLES.has(role)),
          redLines,
        });
      }
    });
  }
  return routes;
}

describe("后台高风险写接口统一红线静态门禁", () => {
  const routes = scanWriteRoutes();
  const byKey = new Map(routes.map((route) => [`${route.verb} ${route.route}`, route]));

  it.each(REQUIRED_ROUTES)("%s 必须声明既定红线", (key, expected) => {
    const route = byKey.get(key);
    expect(route).toBeDefined();
    expect(route?.redLines).toEqual(expect.arrayContaining(expected));
  });

  it("后台、商家和运营域的 DELETE 接口必须声明不可逆红线", () => {
    const missing = routes
      .filter((route) => route.backendScoped && route.verb === "DELETE")
      .filter((route) => !route.redLines.includes(RedLine.IRREVERSIBLE))
      .map((route) => `${route.file}:${route.line} DELETE ${route.route}`);
    expect(missing).toEqual([]);
  });

  it("高风险红线覆盖面不得被批量移除", () => {
    const protectedBackendWrites = routes.filter(
      (route) => route.backendScoped && route.redLines.length > 0,
    );
    expect(protectedBackendWrites.length).toBeGreaterThanOrEqual(390);
  });
});
