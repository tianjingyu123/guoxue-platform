import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { probePublicTls, summarizeCertificate } from "../../scripts/release/public-tls.mjs";

const nowMs = Date.parse("2026-08-01T00:00:00.000Z");

function certificate(daysRemaining = 30) {
  return {
    valid_from: new Date(nowMs - 24 * 60 * 60 * 1000).toUTCString(),
    valid_to: new Date(nowMs + daysRemaining * 24 * 60 * 60 * 1000).toUTCString(),
    fingerprint256: Array.from({ length: 32 }, () => "ab").join(":"),
    issuer: { CN: "Test CA" },
  };
}

function fakeConnect(snapshot, authorized = true) {
  return () => {
    const socket = new EventEmitter();
    socket.authorized = authorized;
    socket.authorizationError = authorized ? null : "SELF_SIGNED_CERT_IN_CHAIN";
    socket.setTimeout = () => {};
    socket.end = () => {};
    socket.destroy = () => {};
    socket.getPeerCertificate = () => snapshot;
    queueMicrotask(() => socket.emit("secureConnect"));
    return socket;
  };
}

test("证书摘要记录有效期与标准化 SHA-256 指纹", () => {
  const summary = summarizeCertificate(certificate(30), {
    nowMs,
    minimumRemainingDays: 14,
  });
  assert.equal(summary.daysRemaining, 30);
  assert.equal(summary.fingerprintSha256, "ab".repeat(32));
  assert.equal(summary.issuerCommonName, "Test CA");
});

test("剩余不足 14 天的证书被阻断", () => {
  assert.throws(
    () => summarizeCertificate(certificate(7), { nowMs, minimumRemainingDays: 14 }),
    /剩余有效期不足 14 天/u,
  );
});

test("公网 TLS 探测绑定域名、信任链和证书快照", async () => {
  const result = await probePublicTls("https://api.example.test", {
    nowMs,
    minimumRemainingDays: 14,
    connect: fakeConnect(certificate(30)),
  });
  assert.equal(result.origin, "https://api.example.test");
  assert.equal(result.chainAuthorized, true);
  assert.equal(result.hostnameMatched, true);
  assert.equal(result.daysRemaining, 30);
});

test("不可信证书链和 IP 入口被阻断", async () => {
  await assert.rejects(
    probePublicTls("https://api.example.test", {
      nowMs,
      connect: fakeConnect(certificate(30), false),
    }),
    /SELF_SIGNED_CERT_IN_CHAIN/u,
  );
  await assert.rejects(probePublicTls("https://127.0.0.1"), /必须使用域名/u);
});
