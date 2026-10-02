import { DatabaseSync } from 'node:sqlite';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const migration = readFileSync(new URL('./migrations/001-pilot.sql', import.meta.url), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a],[b]) => a.localeCompare(b))) : item);
export class Rejected extends Error {
  constructor(code, status = 403) { super(code); this.code = code; this.status = status; }
}
function requireThat(value, code, status) { if (!value) throw new Rejected(code, status); }
function identifier(value) { requireThat(typeof value === 'string' && /^[a-z][a-z0-9-]{1,47}$/.test(value), 'INVALID_ID', 400); return value; }
function exact(value, keys) {
  requireThat(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(k => keys.includes(k)), 'UNKNOWN_FIELD', 400);
}
function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = fn(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
function open(path) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA busy_timeout=10000; PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
  return db;
}
function audit(db, scope, actor, action, target, now) {
  db.prepare('INSERT INTO audit(scope,actor,action,target,at) VALUES(?,?,?,?,?)').run(scope, actor, action, target, now);
}
/** 严格合成配置，无真实商户、收费或保留期限默认值。 */
export function validateConfig(config) {
  exact(config, ['scope','space','customer','mode','applicationSubject','tradingSubject','merchantRef','applications','modules','resources','maxCircles','template','brand','term','contract']);
  for (const key of ['scope','space','customer']) identifier(config[key]);
  requireThat(['LEASE','BRAND'].includes(config.mode), 'INVALID_MODE', 400);
  requireThat(['community','single-agent'].includes(config.template), 'INVALID_TEMPLATE', 400);
  for (const key of ['applicationSubject','tradingSubject']) requireThat(typeof config[key] === 'string' && config[key].startsWith('synthetic-'), 'SYNTHETIC_SUBJECT_REQUIRED', 400);
  requireThat(typeof config.merchantRef === 'string' && config.merchantRef.startsWith('test-merchant-'), 'TEST_MERCHANT_REQUIRED', 400);
  requireThat(config.mode !== 'LEASE' || config.scope === config.space, 'LEASE_REQUIRES_OWN_SPACE', 400);
  requireThat(Array.isArray(config.applications) && config.applications.length > 0 && config.applications.length <= 5, 'INVALID_APPLICATIONS', 400);
  const selectors = new Set();
  for (const app of config.applications) {
    exact(app, ['applicationId','platform','channelId','clientKey']);
    identifier(app.applicationId); identifier(app.channelId); identifier(app.clientKey);
    requireThat(['h5','miniprogram','android','ios','harmony'].includes(app.platform) && !selectors.has(app.clientKey), 'INVALID_DISTRIBUTION', 400);
    selectors.add(app.clientKey);
  }
  requireThat(Array.isArray(config.modules) && config.modules.every(x => ['shop','course','circle','agent'].includes(x)) && new Set(config.modules).size === config.modules.length, 'INVALID_MODULES', 400);
  exact(config.resources, ['product','course','agent']);
  for (const kind of ['product','course','agent']) requireThat(Array.isArray(config.resources[kind]) && config.resources[kind].every(x => { identifier(x); return true; }), 'INVALID_RESOURCES', 400);
  requireThat(Number.isSafeInteger(config.maxCircles) && config.maxCircles >= 0 && config.maxCircles <= 10000, 'INVALID_QUOTA', 400);
  exact(config.brand, ['name','themeColor']);
  requireThat(typeof config.brand.name === 'string' && config.brand.name.length <= 60 && !/[<>\x00-\x1f]/.test(config.brand.name) && /^#[a-fA-F0-9]{6}$/.test(config.brand.themeColor), 'INVALID_BRAND', 400);
  exact(config.term, ['remindAt','endAt','exportUntil','downloadTtlMs']);
  requireThat(Object.values(config.term).every(Number.isSafeInteger) && config.term.remindAt <= config.term.endAt && config.term.exportUntil >= config.term.endAt && config.term.downloadTtlMs > 0 && config.term.downloadTtlMs <= 86400000, 'INVALID_TERM', 400);
  exact(config.contract, ['maintenancePrice','maintenanceCycle','priceRule','commissionRule']);
  requireThat(config.contract.maintenanceCycle === 'ANNUAL', 'ANNUAL_CONTRACT_REQUIRED', 400);
  requireThat(config.contract.maintenancePrice === null || typeof config.contract.maintenancePrice === 'string', 'INVALID_PRICE', 400);
  requireThat(typeof config.contract.priceRule === 'string' && typeof config.contract.commissionRule === 'string', 'CONTRACT_REQUIRED', 400);
  return structuredClone(config);
}

/** 本地控制面；只由独立运维身份调用，客户角色没有此对象或控制令牌。 */
export class ControlPlane {
  #db; #root; #capability; #clock; #platform;
  constructor(root, capability, platformContract, clock = Date.now) {
    requireThat(typeof capability === 'string' && capability.length >= 32, 'CONTROL_CREDENTIAL_REQUIRED');
    this.#root = root; this.#clock = clock; this.#platform = structuredClone(platformContract); this.#capability = hash(capability);
    mkdirSync(root, { recursive: true });
    this.#db = open(join(root, 'registry.db'));
    this.#db.exec('CREATE TABLE IF NOT EXISTS deployments(scope TEXT PRIMARY KEY, space TEXT NOT NULL, digest TEXT NOT NULL, config TEXT NOT NULL, state TEXT NOT NULL); CREATE TABLE IF NOT EXISTS selectors(clientKey TEXT PRIMARY KEY, scope TEXT NOT NULL); CREATE TABLE IF NOT EXISTS spaces(space TEXT PRIMARY KEY, mode TEXT NOT NULL);');
    this.#db.exec(migration);
  }
  #authorize(capability) { requireThat(typeof capability === 'string' && hash(capability) === this.#capability, 'CONTROL_FORBIDDEN'); }
  provision(capability, input) {
    this.#authorize(capability);
    const config = validateConfig(input); const digest = hash(canonical(config));
    if (config.mode === 'BRAND') {
      requireThat(config.space === this.#platform.space && config.tradingSubject === this.#platform.tradingSubject && config.merchantRef === this.#platform.merchantRef && config.contract.priceRule === this.#platform.priceRule && config.contract.commissionRule === this.#platform.commissionRule, 'PLATFORM_CONTRACT_CHANGED');
      requireThat(config.applications.every(a => ['h5','miniprogram'].includes(a.platform)), 'BRAND_APP_DEFERRED');
    }
    // 先持久化归属。失败保留 PREPARING，只允许相同请求恢复，绝不盲重建。
    transaction(this.#db, () => {
      const old = this.#db.prepare('SELECT * FROM deployments WHERE scope=?').get(config.scope);
      requireThat(!old || old.digest === digest, 'PROVISION_CONFLICT', 409);
      const space = this.#db.prepare('SELECT * FROM spaces WHERE space=?').get(config.space);
      requireThat(!space || old || (space.mode === 'BRAND' && config.mode === 'BRAND'), 'SPACE_ALREADY_OWNED', 409);
      for (const app of config.applications) {
        const owner = this.#db.prepare('SELECT scope FROM selectors WHERE clientKey=?').get(app.clientKey);
        requireThat(!owner || owner.scope === config.scope, 'SELECTOR_ALREADY_OWNED', 409);
        this.#db.prepare('INSERT OR IGNORE INTO selectors VALUES(?,?)').run(app.clientKey, config.scope);
      }
      this.#db.prepare('INSERT OR IGNORE INTO spaces VALUES(?,?)').run(config.space, config.mode);
      this.#db.prepare('INSERT OR IGNORE INTO deployments VALUES(?,?,?,?,?)').run(config.scope, config.space, digest, JSON.stringify(config), 'PREPARING');
    });
    const dir = join(this.#root, config.space); mkdirSync(dir, { recursive: true });
    const db = open(join(dir, 'business.db'));
    try {
      db.exec(migration);
      transaction(db, () => {
        const old = db.prepare('SELECT digest FROM identity WHERE space=?').get(config.scope);
        requireThat(!old || old.digest === digest, 'DATABASE_IDENTITY_MISMATCH');
        db.prepare('INSERT OR IGNORE INTO identity VALUES(?,?,?)').run(config.scope, JSON.stringify({ ...config, authRevision: 1 }), digest);
      });
    } finally { db.close(); }
    const keyPath = join(dir, `${config.scope}.synthetic-key`);
    if (!existsSync(keyPath)) {
      try { writeFileSync(keyPath, randomBytes(32), { flag: 'wx', mode: 0o600 }); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
    }
    transaction(this.#db, () => {
      this.#db.prepare("UPDATE deployments SET state='READY' WHERE scope=?").run(config.scope);
      audit(this.#db, config.scope, 'maintenance', 'PROVISION_READY', digest, this.#clock());
    });
    return { scope: config.scope, space: config.space, state: 'READY', digest };
  }
  descriptor(capability, scope) {
    this.#authorize(capability); identifier(scope);
    const row = this.#db.prepare("SELECT * FROM deployments WHERE scope=? AND state='READY'").get(scope);
    requireThat(row, 'DEPLOYMENT_NOT_READY');
    return { root: this.#root, scope, space: row.space };
  }
  close() { this.#db.close(); }
}

/** 固定实例只打开固定数据库；请求中的 tenantId/Host/选择器不参与数据库路由。 */
export class PilotInstance {
  #db; #key; #scope; #space; #clock; #cache = new Map(); #contexts = new WeakMap(); #parsePresentation;
  constructor(descriptor, parsePresentation, clock = Date.now) {
    identifier(descriptor.scope); identifier(descriptor.space);
    this.#scope = descriptor.scope; this.#space = descriptor.space; this.#clock = clock; this.#parsePresentation = parsePresentation;
    const dir = join(descriptor.root, this.#space);
    requireThat(existsSync(join(dir, 'business.db')), 'DATABASE_MISSING');
    this.#db = open(join(dir, 'business.db'));
    try {
      this.#key = readFileSync(join(dir, `${this.#scope}.synthetic-key`));
      const c = this.config();
      requireThat(c.space === this.#space && c.scope === this.#scope && Number.isSafeInteger(c.authRevision), 'DATABASE_IDENTITY_MISMATCH');
    } catch (error) { this.#db.close(); throw error; }
  }
  config() {
    const row = this.#db.prepare('SELECT config FROM identity WHERE space=?').get(this.#scope);
    requireThat(row, 'DATABASE_IDENTITY_MISMATCH'); return JSON.parse(row.config);
  }
  status() {
    const c = this.config(); const now = this.#clock();
    return now < c.term.remindAt ? 'ACTIVE' : now < c.term.endAt ? 'REMINDER' : now < c.term.exportUntil ? 'EXPIRED_RESTRICTED' : 'ARCHIVED_RETAINED';
  }
  // 合成开户/种子只供控制面验收器调用；HTTP 无此入口。
  seed(users, resources) {
    transaction(this.#db, () => {
      for (const u of users) {
        identifier(u.id); requireThat(['CUSTOMER_ADMIN','CUSTOMER_SUPPORT','STATION_MASTER','USER'].includes(u.role), 'ROLE_ESCALATION');
        requireThat(this.config().mode !== 'BRAND' || ['STATION_MASTER','USER'].includes(u.role), 'ROLE_ESCALATION');
        this.#db.prepare('INSERT INTO users(id,scope,role,phone) VALUES(?,?,?,?)').run(u.id, this.#scope, u.role, u.phone ?? null);
      }
      for (const r of resources) {
        identifier(r.id); requireThat(['product','course','agent'].includes(r.kind), 'INVALID_KIND', 400);
        exact(r.body, r.kind === 'agent' ? ['knowledge'] : ['priceMinor']);
        requireThat(r.kind === 'agent' ? typeof r.body.knowledge === 'string' && r.body.knowledge.length <= 10000 : Number.isSafeInteger(r.body.priceMinor) && r.body.priceMinor >= 0, 'INVALID_RESOURCE_BODY', 400);
        this.#db.prepare('INSERT INTO resources VALUES(?,?,?,?,?)').run(r.id, this.config().mode === 'BRAND' ? 'platform' : this.#scope, r.kind, r.title, JSON.stringify(r.body));
      }
      audit(this.#db, this.#scope, 'maintenance', 'SYNTHETIC_SEED', 'fixture', this.#clock());
    });
  }
  // 真实登录应由固定应用 OAuth 验证器产生；本方法只接受已存在的合成身份。
  token(userId, clientKey, ttlMs = 3600000) {
    const c = this.config(); const app = c.applications.find(a => a.clientKey === clientKey);
    const user = this.#db.prepare('SELECT * FROM users WHERE id=? AND scope=?').get(userId, this.#scope);
    requireThat(app && user, 'LOGIN_MEMBERSHIP_REQUIRED');
    const payload = encode({ scope: this.#scope, space: this.#space, applicationId: app.applicationId, clientKey, sub: userId, revision: user.revision, authRevision: c.authRevision, exp: this.#clock() + ttlMs });
    return `${payload}.${createHmac('sha256', this.#key).update(payload).digest('base64url')}`;
  }
  authenticate(token, clientKey) {
    requireThat(typeof token === 'string' && token.length <= 4096 && typeof clientKey === 'string', 'CONTEXT_REQUIRED', 401);
    const pieces = token.split('.'); requireThat(pieces.length === 2, 'INVALID_TOKEN', 401);
    const mac = createHmac('sha256', this.#key).update(pieces[0]).digest();
    const supplied = Buffer.from(pieces[1], 'base64url');
    requireThat(supplied.length === mac.length && timingSafeEqual(mac, supplied), 'INVALID_TOKEN', 401);
    let claim; try { claim = JSON.parse(Buffer.from(pieces[0], 'base64url').toString()); } catch { throw new Rejected('INVALID_TOKEN', 401); }
    const c = this.config(); const app = c.applications.find(a => a.clientKey === clientKey);
    requireThat(app && claim.clientKey === clientKey && claim.applicationId === app.applicationId && claim.space === this.#space && claim.scope === this.#scope && Number.isSafeInteger(claim.exp) && claim.exp > this.#clock() && claim.authRevision === c.authRevision, 'TOKEN_SCOPE_MISMATCH', 401);
    const user = this.#db.prepare('SELECT * FROM users WHERE id=? AND scope=?').get(claim.sub, this.#scope);
    requireThat(user && user.revision === claim.revision, 'MEMBERSHIP_REVOKED', 401);
    // 角色始终读取主库，不信任令牌或请求附带的角色。
    const ctx = Object.freeze({ userId: user.id, role: user.role, app: Object.freeze(app), scope: this.#scope });
    this.#contexts.set(ctx, { authRevision: c.authRevision, userRevision: user.revision, exp: claim.exp });
    return ctx;
  }
  #context(ctx) {
    const issued = ctx && this.#contexts.get(ctx);
    requireThat(issued && ctx.scope === this.#scope && issued.authRevision === this.config().authRevision && issued.exp > this.#clock() && this.#db.prepare('SELECT 1 FROM users WHERE id=? AND scope=? AND role=? AND revision=?').get(ctx.userId, this.#scope, ctx.role, issued.userRevision), 'CONTEXT_REQUIRED');
  }
  #write(ctx, module, roles) {
    this.#context(ctx); const c = this.config();
    requireThat(['ACTIVE','REMINDER'].includes(this.status()), 'LEASE_EXPIRED');
    requireThat(c.modules.includes(module) && roles.includes(ctx.role), 'CAPABILITY_FORBIDDEN');
  }
  #resource(ctx, id, kind) {
    this.#context(ctx); const c = this.config();
    requireThat(c.modules.includes({product:'shop',course:'course',agent:'agent'}[kind]) && c.resources[kind]?.includes(id), 'RESOURCE_FORBIDDEN');
    const row = this.#db.prepare('SELECT * FROM resources WHERE id=? AND scope=? AND kind=?').get(id, c.mode === 'BRAND' ? 'platform' : this.#scope, kind);
    requireThat(row, 'RESOURCE_FORBIDDEN'); return { ...row, body: JSON.parse(row.body) };
  }
  resources(ctx, kind, query = '') {
    this.#context(ctx); requireThat(['product','course','agent'].includes(kind) && typeof query === 'string' && query.length <= 100, 'INVALID_QUERY', 400);
    const rows = this.#db.prepare('SELECT id FROM resources WHERE scope=? AND kind=? AND title LIKE ?').all(this.config().mode === 'BRAND' ? 'platform' : this.#scope, kind, `%${query}%`);
    return rows.flatMap(r => { try { return [this.#resource(ctx, r.id, kind)]; } catch (e) { if (e instanceof Rejected) return []; throw e; } });
  }
  updateResources(ctx, items) {
    this.#write(ctx, 'shop', ['CUSTOMER_ADMIN']); requireThat(this.config().mode === 'LEASE', 'BRAND_UPLOAD_FORBIDDEN');
    requireThat(Array.isArray(items) && items.length > 0 && items.length <= 20, 'INVALID_BATCH', 400);
    return transaction(this.#db, () => {
      for (const item of items) {
        exact(item, ['id','title']); this.#resource(ctx, item.id, 'product');
        requireThat(typeof item.title === 'string' && item.title.length <= 100 && !/[<>\x00-\x1f]/.test(item.title), 'INVALID_TITLE', 400);
        this.#db.prepare('UPDATE resources SET title=? WHERE id=? AND scope=?').run(item.title, item.id, this.#scope);
      }
      audit(this.#db, this.#scope, ctx.userId, 'UPDATE_RESOURCES', String(items.length), this.#clock()); return { updated: items.length };
    });
  }
  createCircle(ctx, name) {
    this.#write(ctx, 'circle', ['CUSTOMER_ADMIN']);
    requireThat(this.config().mode === 'LEASE' && typeof name === 'string' && name.length > 0 && name.length <= 60, 'CIRCLE_FORBIDDEN');
    return transaction(this.#db, () => {
      const count = this.#db.prepare('SELECT count(*) n FROM circles WHERE scope=?').get(this.#scope).n;
      requireThat(count < this.config().maxCircles, 'CIRCLE_QUOTA', 409);
      const id = randomUUID(); this.#db.prepare('INSERT INTO circles VALUES(?,?,?)').run(id, this.#scope, name);
      audit(this.#db, this.#scope, ctx.userId, 'CREATE_CIRCLE', id, this.#clock()); return { id };
    });
  }
  askAgent(ctx, agentId, question) {
    this.#write(ctx, 'agent', ['CUSTOMER_ADMIN','USER']);
    const agent = this.#resource(ctx, agentId, 'agent');
    requireThat(typeof question === 'string' && question.length > 0 && question.length <= 1000, 'INVALID_QUESTION', 400);
    const id = randomUUID();
    // 只模拟检索，不接模型供应商；知识从归属资源读取，不自动包含平台全局库。
    const body = JSON.stringify({ question, knowledge: agent.body.knowledge, synthetic: true });
    this.#db.prepare('INSERT INTO chats VALUES(?,?,?,?,?)').run(id, this.#scope, ctx.userId, agentId, body);
    audit(this.#db, this.#scope, ctx.userId, 'ASK_AGENT', id, this.#clock()); return { id, ...JSON.parse(body) };
  }
  chat(ctx, id) {
    this.#context(ctx);
    const row = this.#db.prepare('SELECT * FROM chats WHERE id=? AND scope=? AND userId=?').get(id, this.#scope, ctx.userId);
    requireThat(row, 'CHAT_FORBIDDEN'); this.#resource(ctx, row.agentId, 'agent'); return { id, ...JSON.parse(row.body) };
  }
  createOrder(ctx, resourceId, kind = 'product') {
    this.#write(ctx, kind === 'product' ? 'shop' : 'course', ['USER','CUSTOMER_ADMIN','STATION_MASTER']);
    requireThat(['product','course'].includes(kind), 'INVALID_KIND', 400);
    const resource = this.#resource(ctx, resourceId, kind); const c = this.config();
    requireThat(Number.isSafeInteger(resource.body.priceMinor) && resource.body.priceMinor >= 0, 'PRICE_CONTRACT_REQUIRED');
    const snapshot = { resourceId, kind, priceMinor: resource.body.priceMinor, tradingSubject: c.tradingSubject, merchantRef: c.merchantRef, priceRule: c.contract.priceRule, commissionRule: c.contract.commissionRule, applicationSubject: c.applicationSubject, applicationId: ctx.app.applicationId, synthetic: true };
    const id = randomUUID();
    transaction(this.#db, () => { this.#db.prepare('INSERT INTO orders VALUES(?,?,?,?,?,?)').run(id, this.#scope, ctx.userId, JSON.stringify(snapshot), 'PENDING', 0); audit(this.#db, this.#scope, ctx.userId, 'CREATE_ORDER', id, this.#clock()); });
    return this.order(ctx, id);
  }
  order(ctx, id) {
    this.#context(ctx);
    const staff = ['CUSTOMER_ADMIN','CUSTOMER_SUPPORT','STATION_MASTER'].includes(ctx.role);
    const row = this.#db.prepare('SELECT * FROM orders WHERE id=? AND scope=? AND (?=1 OR userId=?)').get(id, this.#scope, staff ? 1 : 0, ctx.userId);
    requireThat(row, 'ORDER_FORBIDDEN'); return { ...row, snapshot: JSON.parse(row.snapshot) };
  }
  // 合成回调契约，HTTP 不开放；真实验签、金额、商户校验需沿用现有支付实现。
  paymentEvent(id, event, action, merchantRef, priceMinor) {
    requireThat(['PAY','REFUND'].includes(action) && typeof event === 'string' && event.length <= 100, 'INVALID_CALLBACK', 400);
    return transaction(this.#db, () => {
      const row = this.#db.prepare('SELECT * FROM orders WHERE id=? AND scope=?').get(id, this.#scope); requireThat(row, 'ORDER_FORBIDDEN');
      const snapshot = JSON.parse(row.snapshot);
      requireThat(snapshot.merchantRef === merchantRef && snapshot.priceMinor === priceMinor, 'PAYMENT_CONTRACT_MISMATCH');
      const old = this.#db.prepare('SELECT * FROM callbacks WHERE event=?').get(event);
      requireThat(!old || (old.orderId === id && old.action === action), 'CALLBACK_CONFLICT', 409);
      if (old) return { duplicate: true, status: row.status };
      requireThat(action === 'PAY' ? row.status === 'PENDING' : row.status === 'PAID', 'ORDER_STATE_CONFLICT', 409);
      this.#db.prepare('INSERT INTO callbacks VALUES(?,?,?)').run(event, id, action);
      this.#db.prepare('UPDATE orders SET status=?,entitlement=? WHERE id=? AND scope=?').run(action === 'PAY' ? 'PAID' : 'REFUNDED', action === 'PAY' ? 1 : 0, id, this.#scope);
      audit(this.#db, this.#scope, 'synthetic-payment', action, id, this.#clock()); return { duplicate: false, status: action === 'PAY' ? 'PAID' : 'REFUNDED' };
    });
  }
  aftercare(ctx, id) { const row = this.order(ctx, id); audit(this.#db, this.#scope, ctx.userId, 'AFTERCARE', id, this.#clock()); return { orderId: row.id, accepted: true }; }
  presentation(ctx, value, clientProfile) {
    this.#context(ctx); requireThat(['legacy-v1','presentation-v1'].includes(clientProfile), 'CLIENT_CAPABILITY_UNKNOWN', 400);
    let parsed; try { parsed = this.#parsePresentation(value, true); } catch { throw new Rejected('INVALID_PRESENTATION', 400); }
    const modules = this.config().modules;
    const granted = id => modules.includes({mall:'shop',course:'course',agent:'agent',circles:'circle',circle:'circle'}[id]);
    // 只投影公共引擎已校验的配置；模板/组件不能增加后端授权。
    const pages = Object.fromEntries(Object.entries(parsed.pages).map(([surface, blocks]) => [surface, blocks.map(b => ({ ...b, entries: b.entries.filter(granted) })).filter(b => !b.targetEntryId || granted(b.targetEntryId))]));
    return { ...parsed, entries: parsed.entries.filter(e => granted(e.id)), navigation: parsed.navigation.filter(e => granted(e.id)), pages: clientProfile === 'legacy-v1' ? {} : pages, brand: this.config().brand, template: this.config().template };
  }
  cache(ctx, key, value) {
    this.#context(ctx); identifier(key); const namespaced = `${this.#space}:${this.#scope}:${ctx.app.applicationId}:${ctx.userId}:${key}`;
    if (value !== undefined) this.#cache.set(namespaced, value); return this.#cache.get(namespaced) ?? null;
  }
  enqueue(ctx, kind) {
    this.#write(ctx, 'shop', ['CUSTOMER_ADMIN']); requireThat(kind === 'synthetic-charge', 'INVALID_JOB', 400);
    const id = randomUUID(); this.#db.prepare('INSERT INTO jobs VALUES(?,?,?,?,?)').run(id, this.#scope, this.config().authRevision, 'READY', kind); return { id };
  }
  runJob(id) {
    // worker 先按固定实例检查任务主库归属和状态；过期或旧合同任务只暂停。
    return transaction(this.#db, () => {
      const row = this.#db.prepare('SELECT * FROM jobs WHERE id=? AND scope=?').get(id, this.#scope); requireThat(row, 'JOB_FORBIDDEN');
      if (row.state !== 'READY') return { state: row.state };
      const allowed = ['ACTIVE','REMINDER'].includes(this.status()) && row.revision === this.config().authRevision;
      const state = allowed ? 'DONE_SYNTHETIC' : 'HELD';
      this.#db.prepare('UPDATE jobs SET state=? WHERE id=? AND scope=?').run(state, id, this.#scope);
      audit(this.#db, this.#scope, 'synthetic-worker', state, id, this.#clock()); return { state };
    });
  }
  renew(term) {
    // 仅控制面本地运维适配器调用；没有客户 HTTP 续费/扣款接口。
    return transaction(this.#db, () => {
      const c = this.config(); const { authRevision, ...contract } = c; const next = validateConfig({ ...contract, term });
      next.authRevision = c.authRevision + 1;
      this.#db.prepare('UPDATE identity SET config=? WHERE space=?').run(JSON.stringify(next), this.#scope);
      audit(this.#db, this.#scope, 'maintenance', 'RENEW_WITHOUT_JOB_REPLAY', String(next.authRevision), this.#clock()); return { status: this.status() };
    });
  }
  asset(ctx, id, data) {
    this.#context(ctx); identifier(id);
    if (data !== undefined) {
      this.#write(ctx, 'agent', ['CUSTOMER_ADMIN','USER']); requireThat(typeof data === 'string' && data.length <= 10000, 'INVALID_ASSET', 400);
      this.#db.prepare('INSERT INTO assets VALUES(?,?,?,?)').run(id, this.#scope, ctx.userId, data);
    }
    const row = this.#db.prepare('SELECT body FROM assets WHERE id=? AND scope=? AND userId=?').get(id, this.#scope, ctx.userId);
    requireThat(row, 'ASSET_FORBIDDEN'); return { id, data: row.body };
  }
  exportData(ctx) {
    this.#context(ctx); requireThat(ctx.role === 'CUSTOMER_ADMIN' && this.config().mode === 'LEASE', 'EXPORT_FORBIDDEN');
    requireThat(this.#clock() < this.config().term.exportUntil, 'EXPORT_WINDOW_ENDED');
    return transaction(this.#db, () => {
      // 明确字段允许清单；不导出凭据、源码、控制面、其他站点及原始手机号。
      const users = this.#db.prepare('SELECT id,role,phone FROM users WHERE scope=?').all(this.#scope).map(u => ({ id: u.id, role: u.role, phone: u.phone ? `${u.phone.slice(0,3)}****${u.phone.slice(-4)}` : null }));
      const grants = this.config().resources;
      const data = { schemaVersion: 1, scope: this.#scope, users, resources: this.#db.prepare('SELECT id,kind,title,body FROM resources WHERE scope=?').all(this.#scope).filter(r => grants[r.kind]?.includes(r.id)).map(r => ({ ...r, body: JSON.parse(r.body) })), circles: this.#db.prepare('SELECT id,name FROM circles WHERE scope=?').all(this.#scope), orders: this.#db.prepare('SELECT id,userId,snapshot,status,entitlement FROM orders WHERE scope=?').all(this.#scope).map(r => ({ ...r, snapshot: JSON.parse(r.snapshot) })), chats: this.#db.prepare('SELECT id,userId,agentId,body FROM chats WHERE scope=?').all(this.#scope).filter(r => grants.agent.includes(r.agentId)).map(r => ({ ...r, body: JSON.parse(r.body) })), assets: this.#db.prepare('SELECT id,userId,body FROM assets WHERE scope=?').all(this.#scope) };
      const id = randomUUID(); const grant = randomBytes(32).toString('base64url');
      const untilAt = Math.min(this.#clock() + this.config().term.downloadTtlMs, this.config().term.exportUntil);
      this.#db.prepare('INSERT INTO exports VALUES(?,?,?,?,?,?)').run(id, this.#scope, ctx.userId, hash(grant), untilAt, JSON.stringify(data));
      audit(this.#db, this.#scope, ctx.userId, 'CREATE_EXPORT', id, this.#clock()); return { id, grant, untilAt };
    });
  }
  download(ctx, id, grant) {
    this.#context(ctx); requireThat(ctx.role === 'CUSTOMER_ADMIN' && typeof grant === 'string', 'EXPORT_FORBIDDEN');
    const row = this.#db.prepare('SELECT * FROM exports WHERE id=? AND scope=? AND userId=?').get(id, this.#scope, ctx.userId);
    requireThat(row && this.#clock() < row.untilAt && this.#clock() < this.config().term.exportUntil && hash(grant) === row.grantHash, 'EXPORT_GRANT_INVALID');
    audit(this.#db, this.#scope, ctx.userId, 'DOWNLOAD_EXPORT', id, this.#clock()); return JSON.parse(row.data);
  }
  backup(destination) {
    // 同版本迁出演练：VACUUM INTO 产生一致副本，凭据由独立运维路径管理，不含在客户导出中。
    requireThat(!existsSync(destination), 'BACKUP_EXISTS', 409);
    this.#db.prepare('VACUUM INTO ?').run(destination); return { sha256: hash(readFileSync(destination)), scope: this.#scope };
  }
  auditLog() { return this.#db.prepare('SELECT scope,actor,action,target,at FROM audit WHERE scope=? ORDER BY id').all(this.#scope); }
  close() { this.#db.close(); }
}

export const pilotDirectory = fileURLToPath(new URL('.', import.meta.url));
