import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { PilotInstance, ControlPlane, Rejected } from './pilot.mjs';

async function body(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length; if (size > 16384) throw new Rejected('BODY_TOO_LARGE', 413); chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { throw new Rejected('INVALID_JSON', 400); }
}
function fields(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !keys.includes(k))) throw new Rejected('UNKNOWN_FIELD', 400);
}
export async function loadPublicProtocol(protocolPath) {
  const source = protocolPath ? pathToFileURL(protocolPath) : new URL('../../packages/shared/src/client-presentation.ts', import.meta.url);
  const javascript = stripTypeScriptTypes(readFileSync(source, 'utf8'), { mode: 'strip' });
  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
}
export async function startRuntime(descriptor, port = 0, protocolPath) {
  // 直接加载候选公共源码；无共享 node_modules、构建产物或配置引擎副本。
  const { parseClientPresentation } = await loadPublicProtocol(protocolPath);
  const instance = new PilotInstance(descriptor, parseClientPresentation);
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      // 不能靠前端租户标识选择数据库或扩大归属。
      if (req.headers['x-tenant-id'] || req.headers['x-station-id'] || url.searchParams.has('tenantId') || url.searchParams.has('stationId')) throw new Rejected('CLIENT_SCOPE_FORBIDDEN');
      const ctx = instance.authenticate(req.headers.authorization?.replace(/^Bearer /, ''), req.headers['x-app-client']);
      const data = ['POST','PUT'].includes(req.method) ? await body(req) : {};
      let result;
      if (req.method === 'GET' && url.pathname === '/context') result = { scope: ctx.scope, role: ctx.role, app: ctx.app, status: instance.status(), applicationSubject: instance.config().applicationSubject, tradingSubject: instance.config().tradingSubject };
      else if (req.method === 'GET' && url.pathname === '/resources') result = instance.resources(ctx, url.searchParams.get('kind'), url.searchParams.get('q') ?? '');
      else if (req.method === 'GET' && url.pathname.startsWith('/resources/')) {
        result = instance.resources(ctx, url.searchParams.get('kind')).find(r => r.id === url.pathname.slice('/resources/'.length));
        if (!result) throw new Rejected('RESOURCE_FORBIDDEN');
      }
      else if (req.method === 'PUT' && url.pathname === '/resources') { fields(data, ['items']); result = instance.updateResources(ctx, data.items); }
      else if (req.method === 'POST' && url.pathname === '/circles') { fields(data, ['name']); result = instance.createCircle(ctx, data.name); }
      else if (req.method === 'POST' && url.pathname === '/chats') { fields(data, ['agentId','question']); result = instance.askAgent(ctx, data.agentId, data.question); }
      else if (req.method === 'GET' && url.pathname.startsWith('/chats/')) result = instance.chat(ctx, url.pathname.slice(7));
      else if (req.method === 'POST' && url.pathname === '/orders') { fields(data, ['resourceId','kind']); result = instance.createOrder(ctx, data.resourceId, data.kind); }
      else if (req.method === 'GET' && url.pathname.startsWith('/orders/')) result = instance.order(ctx, url.pathname.slice(8));
      else if (req.method === 'POST' && url.pathname === '/aftercare') { fields(data, ['orderId']); result = instance.aftercare(ctx, data.orderId); }
      else if (req.method === 'POST' && url.pathname === '/presentation/preview') { fields(data, ['presentation','clientProfile']); result = instance.presentation(ctx, data.presentation, data.clientProfile); }
      else if (req.method === 'POST' && url.pathname === '/cache') { fields(data, ['key','value']); result = { value: instance.cache(ctx, data.key, data.value) }; }
      else if (req.method === 'POST' && url.pathname === '/jobs') { fields(data, ['kind']); result = instance.enqueue(ctx, data.kind); }
      else if (req.method === 'POST' && url.pathname === '/exports') { fields(data, []); result = instance.exportData(ctx); }
      else if (req.method === 'GET' && url.pathname.startsWith('/exports/')) {
        result = instance.download(ctx, url.pathname.slice(9), req.headers['x-download-grant']);
        res.setHeader('Content-Disposition', 'attachment; filename="customer-data.json"');
      }
      else if (['GET','POST'].includes(req.method) && url.pathname.startsWith('/assets/')) { fields(data, ['data']); result = instance.asset(ctx, url.pathname.slice(8), data.data); }
      else throw new Rejected('ROUTE_NOT_FOUND', 404);
      res.end(JSON.stringify(result));
    } catch (error) { res.statusCode = error instanceof Rejected ? error.status : 500; res.end(JSON.stringify({ code: error instanceof Rejected ? error.code : 'INTERNAL_ERROR' })); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { port: server.address().port, instance, close: async () => { await new Promise(resolve => server.close(resolve)); instance.close(); } };
}
export async function startControl(root, capability, platform, port = 0) {
  const control = new ControlPlane(root, capability, platform);
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
    try {
      if (req.method !== 'POST' || req.url !== '/provision') throw new Rejected('ROUTE_NOT_FOUND', 404);
      const result = control.provision(req.headers.authorization?.replace(/^Bearer /, ''), await body(req));
      res.end(JSON.stringify(result));
    } catch (error) { res.statusCode = error instanceof Rejected ? error.status : 500; res.end(JSON.stringify({ code: error instanceof Rejected ? error.code : 'INTERNAL_ERROR' })); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { port: server.address().port, control, close: async () => { await new Promise(resolve => server.close(resolve)); control.close(); } };
}
// 只供同一试点验收器通过 IPC 启动；不读取生产环境变量或凭据。
if (process.argv[2] === '--fixture-child') {
  const descriptor = JSON.parse(process.argv[3]);
  const runtime = await startRuntime(descriptor, 0, process.argv[4]);
  process.send?.({ port: runtime.port, pid: process.pid, scope: descriptor.scope });
  process.on('message', async message => { if (message === 'close') { await runtime.close(); process.exit(0); } });
  process.on('disconnect', async () => { await runtime.close(); process.exit(0); });
}
