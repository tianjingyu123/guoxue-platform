import https from 'node:https'
import { readFileSync, writeFileSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

// 仅监听回环；读取仓库外临时测试私钥，不记录请求头或业务数据。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const [fixtureDirectory, privateDirectory, output] = process.argv.slice(2)
if (!fixtureDirectory || !privateDirectory || !output) throw Error('缺少独立TLS夹具参数')
if (realpathSync(privateDirectory).toLowerCase().startsWith(realpathSync(root).toLowerCase() + path.sep)) throw Error('测试私钥必须在仓库外')
const bytes = readFileSync(path.join(fixtureDirectory, 'assets/good.wgt'))
const publicCertificate = readFileSync(path.join(fixtureDirectory, 'assets/tls-fixture-public.pem'))
const evidence = { beganAt: new Date().toISOString(), fixtureSha256: createHash('sha256').update(bytes).digest('hex'), certificateSha256: createHash('sha256').update(publicCertificate).digest('hex'), cancelStarted: false, requests: [], wrongCertificateConnections: 0, wrongCertificateHttpRequests: 0, stopped: false }
const save = () => writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n')
const sockets = new Set(), timers = new Set()
function handler(req, res) {
 const route = req.url.split('?')[0]
 if (route === '/status') { res.end(JSON.stringify({ cancelStarted: evidence.cancelStarted })); return }
 const record = { route, beganAt: new Date().toISOString(), bytes: 0, closed: false }
 evidence.requests.push(record); save()
 res.on('close', () => { record.closed = true; record.closedAt = new Date().toISOString(); save() })
 if (route === '/tls-redirect') { res.writeHead(302, { Location: 'https://127.0.0.1:58843/tls-normal' }); res.end(); return }
 if (route === '/tls-normal') { record.bytes = bytes.length; res.end(bytes); return }
 if (route === '/tls-short') { record.bytes = 1; res.end(bytes.subarray(0, 1)); return }
 if (route === '/tls-oversize') { record.bytes = bytes.length + 1; res.end(Buffer.concat([bytes, Buffer.from([0])])); return }
 if (route === '/tls-cancel') { evidence.cancelStarted = true; record.bytes = 1; res.writeHead(200); res.write(bytes.subarray(0, 1)); save(); return }
 if (route === '/tls-trickle') {
  res.writeHead(200); res.flushHeaders()
  const timer = setInterval(() => { if (res.destroyed) { clearInterval(timer); timers.delete(timer); return } record.bytes++; res.write(Buffer.from([1])); if (record.bytes >= 100) { clearInterval(timer); timers.delete(timer); res.end() } }, 100)
  timers.add(timer); return
 }
 res.writeHead(404); res.end()
}
const servers = [
 https.createServer({ pfx: readFileSync(path.join(privateDirectory, 'trusted.p12')), passphrase: 'fixture-only' }, handler),
 https.createServer({ pfx: readFileSync(path.join(privateDirectory, 'untrusted.p12')), passphrase: 'fixture-only' }, (req, res) => { evidence.wrongCertificateHttpRequests++; res.end(bytes); save() }),
]
servers[1].on('connection', () => { evidence.wrongCertificateConnections++; save() })
for (const server of servers) { server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)) }); server.on('tlsClientError', () => {}); server.on('error', error => { console.error(error.code); process.exitCode = 1; stop() }) }
await Promise.all(servers.map((server, index) => new Promise(resolve => server.listen(58843 + index, '127.0.0.1', resolve))))
save(); console.log('PROBE_TLS_READY ' + JSON.stringify({ fixtureSha256: evidence.fixtureSha256, certificateSha256: evidence.certificateSha256, ports: [58843, 58844] }))
function stop() { for (const timer of timers) clearInterval(timer); for (const socket of sockets) socket.destroy(); for (const server of servers) server.close(); evidence.stopped = true; save() }
process.on('SIGINT', stop); process.on('SIGTERM', stop)
