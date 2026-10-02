import { BadRequestException } from "@nestjs/common";
import { createHash } from "crypto";

export interface ManagedTerm {
  remindAt: string;
  endAt: string;
  exportUntil: string;
  downloadTtlSeconds: number;
}
export interface ManagedApplicationInput {
  applicationId: string;
  applicationSubject: string;
  stationId?: string;
  allowedPlatforms: string[];
  brand: { name: string; themeColor: string };
  templateId: string;
}
export interface ManagedInput {
  requestKey: string;
  name: string;
  mode: "LEASE" | "BRAND";
  tradingSubject: string;
  maintenancePrice: string | null;
  term: ManagedTerm;
  applications: ManagedApplicationInput[];
  modules: string[];
  resources: Record<"product" | "course" | "circle" | "agent", string[]>;
  circleLimit: number;
  deployment?: { spaceKey: string; databaseName: string; databaseRole: string; credentialRef: string; authKeyFingerprint: string };
  reason: string;
}
export function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new BadRequestException(message);
}
function object(value: unknown, keys: string[]): Record<string, any> {
  check(value && typeof value === "object" && !Array.isArray(value), "配置必须为对象");
  const record = value as Record<string, any>;
  check(Object.keys(record).every(key => keys.includes(key)), "配置包含未知字段或凭据");
  return record;
}
function text(value: unknown, max = 120): string {
  check(typeof value === "string" && value.trim().length > 0 && value.length <= max && !/[<>]/.test(value) && !Array.from(value).some(char => char.charCodeAt(0) < 32), "文本内容或长度无效");
  return value.trim();
}
function id(value: unknown): string {
  const result = text(value, 80);
  check(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(result), "标识仅允许字母、数字、短横线或下划线");
  return result;
}
export function parseTerm(value: unknown): ManagedTerm {
  const raw = object(value, ["remindAt", "endAt", "exportUntil", "downloadTtlSeconds"]);
  const dates = [raw.remindAt, raw.endAt, raw.exportUntil];
  check(dates.every(validDate), "必须显式提供真实有效、带时区的提醒、到期和导出截止时间");
  check(Date.parse(raw.remindAt) <= Date.parse(raw.endAt) && Date.parse(raw.endAt) <= Date.parse(raw.exportUntil), "期限顺序无效");
  check(Number.isInteger(raw.downloadTtlSeconds) && raw.downloadTtlSeconds > 0 && raw.downloadTtlSeconds <= 86400, "下载授权期限应为1至86400秒");
  return { remindAt: new Date(raw.remindAt).toISOString(), endAt: new Date(raw.endAt).toISOString(), exportUntil: new Date(raw.exportUntil).toISOString(), downloadTtlSeconds: raw.downloadTtlSeconds };
}
function validDate(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!match) return false;
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  // Date.parse 会把部分无效日期归一化，合同日期必须先按原输入核实。
  return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] && hour <= 23 && minute <= 59 && second <= 59 && (!match[9] || (Number(match[9]) <= 23 && Number(match[10]) <= 59)) && Number.isFinite(Date.parse(value));
}
export function parseManagedGrant(value: unknown, mode: "LEASE" | "BRAND") {
  const raw = object(value, ["modules", "resources", "circleLimit"]);
  check(Array.isArray(raw.modules) && raw.modules.every((m: string) => ["shop", "course", "circle", "agent"].includes(m)) && new Set(raw.modules).size === raw.modules.length, "模块不在已实施范围");
  const resource = object(raw.resources, ["product", "course", "circle", "agent"]);
  const resources = Object.fromEntries(["product", "course", "circle", "agent"].map(key => {
    check(Array.isArray(resource[key]) && resource[key].length <= 1000, "资源白名单无效");
    const ids = resource[key].map(id); check(new Set(ids).size === ids.length, "资源标识重复"); return [key, ids];
  })) as ManagedInput["resources"];
  check(Number.isInteger(raw.circleLimit) && raw.circleLimit >= 0 && raw.circleLimit <= 10000, "圈子数量无效");
  check(mode !== "BRAND" || raw.circleLimit === 0, "品牌入口不能增加站长创建圈子的权限");
  return { modules: raw.modules as string[], resources, circleLimit: raw.circleLimit as number };
}
export function parseManagedInput(value: unknown): ManagedInput {
  const raw = object(value, ["requestKey", "name", "mode", "tradingSubject", "maintenancePrice", "term", "applications", "modules", "resources", "circleLimit", "deployment", "reason"]);
  check(raw.mode === "LEASE" || raw.mode === "BRAND", "经营模式无效");
  check(raw.maintenancePrice === null || (typeof raw.maintenancePrice === "string" && /^\d{1,9}(\.\d{1,2})?$/.test(raw.maintenancePrice)), "维护金额未知时应填null，不能自动定价");
  check(Array.isArray(raw.applications) && raw.applications.length > 0 && raw.applications.length <= 10, "需登记1至10个应用");
  const seen = new Set();
  const applications = raw.applications.map((value: unknown) => {
    const app = object(value, ["applicationId", "applicationSubject", "stationId", "allowedPlatforms", "brand", "templateId"]);
    const applicationId = id(app.applicationId);
    check(!seen.has(applicationId), "应用标识重复"); seen.add(applicationId);
    check(Array.isArray(app.allowedPlatforms) && app.allowedPlatforms.length > 0 && app.allowedPlatforms.every((p: string) => ["miniprogram", "h5", ...(raw.mode === "LEASE" ? ["android", "ios", "harmony"] : [])].includes(p)) && new Set(app.allowedPlatforms).size === app.allowedPlatforms.length, "应用平台范围无效");
    const brand = object(app.brand, ["name", "themeColor"]);
    check(typeof brand.themeColor === "string" && /^#[a-fA-F0-9]{6}$/.test(brand.themeColor), "主题颜色无效");
    check(["community", "single-agent"].includes(app.templateId), "模板未登记");
    check(raw.mode !== "BRAND" || typeof app.stationId === "string", "品牌站须绑定既有分站");
    check(raw.mode !== "LEASE" || app.stationId === undefined, "独立客户不能绑定平台分站");
    return { applicationId, applicationSubject: text(app.applicationSubject), ...(app.stationId ? { stationId: id(app.stationId) } : {}), allowedPlatforms: app.allowedPlatforms, brand: { name: text(brand.name, 60), themeColor: brand.themeColor }, templateId: app.templateId };
  });
  const grant = parseManagedGrant({ modules: raw.modules, resources: raw.resources, circleLimit: raw.circleLimit }, raw.mode);
  let deployment: ManagedInput["deployment"];
  if (raw.mode === "LEASE") {
    const input = object(raw.deployment, ["spaceKey", "databaseName", "databaseRole", "credentialRef", "authKeyFingerprint"]);
    check(typeof input.credentialRef === "string" && /^secret-ref:[a-zA-Z0-9/_-]{1,120}$/.test(input.credentialRef), "只允许受限凭据引用，不接受数据库连接字符串");
    check(typeof input.authKeyFingerprint === "string" && /^[a-f0-9]{64}$/.test(input.authKeyFingerprint), "必须提供独立认证密钥摘要");
    deployment = { spaceKey: id(input.spaceKey), databaseName: id(input.databaseName), databaseRole: id(input.databaseRole), credentialRef: input.credentialRef, authKeyFingerprint: input.authKeyFingerprint };
  } else check(raw.deployment === undefined, "品牌分站使用平台数据体系，不开独立收款部署");
  return { requestKey: id(raw.requestKey), name: text(raw.name), mode: raw.mode, tradingSubject: text(raw.tradingSubject), maintenancePrice: raw.maintenancePrice, term: parseTerm(raw.term), applications, ...grant, ...(deployment ? { deployment } : {}), reason: text(raw.reason, 500) };
}
export function digest(value: unknown) {
  const canonical = JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
  return createHash("sha256").update(canonical).digest("hex");
}
export function operatingStatus(term: { remindAt: Date; endAt: Date; exportUntil: Date }, now = new Date()) {
  return now < term.remindAt ? "ACTIVE" : now < term.endAt ? "REMINDER" : now < term.exportUntil ? "EXPIRED_RESTRICTED" : "ARCHIVED_RETAINED";
}
