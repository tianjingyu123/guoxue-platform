import assert from "node:assert/strict";
import test from "node:test";
import {
  createPublicDnsResolver,
  defaultPublicDnsResolvers,
  isPublicAddress,
  probeAuthoritativeDns,
  probePublicDns,
} from "../../scripts/release/public-dns.mjs";

function resolver(records) {
  return {
    async resolveCname(hostname) {
      const value = records.cname?.[hostname];
      if (!value) throw Object.assign(new Error("no cname"), { code: "ENODATA" });
      return value;
    },
    async resolve4(hostname, options) {
      const values = records.ipv4?.[hostname] || [];
      return options?.ttl
        ? values.map((address) => ({ address, ttl: records.ttl ?? 300 }))
        : values;
    },
    async resolve6(hostname, options) {
      const values = records.ipv6?.[hostname] || [];
      return options?.ttl
        ? values.map((address) => ({ address, ttl: records.ttl ?? 300 }))
        : values;
    },
    async resolveSoa(hostname) {
      const errorCode = records.soaErrors?.[hostname];
      if (errorCode) throw Object.assign(new Error("soa response error"), { code: errorCode });
      const value = records.soa?.[hostname];
      if (!value) throw Object.assign(new Error("no soa"), { code: "ENODATA" });
      return value;
    },
    async resolveNs(hostname) {
      const value = records.ns?.[hostname];
      if (!value) throw Object.assign(new Error("no ns"), { code: "ENODATA" });
      return value;
    },
  };
}

test("公网地址拒绝私网、回环、保留和文档地址", () => {
  assert.equal(isPublicAddress("43.132.1.9"), true);
  assert.equal(isPublicAddress("2402:4e00:1020::1"), true);
  for (const address of [
    "10.0.0.1",
    "127.0.0.1",
    "169.254.1.1",
    "192.168.1.1",
    "192.0.2.1",
    "198.51.100.1",
    "203.0.113.1",
    "::1",
    "::ffff:127.0.0.1",
    "fd00::1",
    "2001:db8::1",
  ]) {
    assert.equal(isPublicAddress(address), false, address);
  }
});

test("多路公网解析器使用受控 IP 并拒绝无效服务器", () => {
  assert.deepEqual(defaultPublicDnsResolvers, [
    { id: "dnspod", servers: ["119.29.29.29"] },
    { id: "alidns", servers: ["223.5.5.5"] },
  ]);
  assert.doesNotThrow(() => createPublicDnsResolver(["119.29.29.29"]));
  assert.throws(() => createPublicDnsResolver([]), /至少需要一个服务器地址/u);
  assert.throws(() => createPublicDnsResolver(["dns.example.test"]), /必须使用 IP 地址/u);
});

test("DNS 探测保留 CNAME 链和去重后的公网地址", async () => {
  const result = await probePublicDns("Assets.Example.Test.", {
    resolver: resolver({
      cname: {
        "assets.example.test": ["edge.cdn.test."],
        "edge.cdn.test": ["terminal.cdn.test"],
      },
      ipv4: { "assets.example.test": ["43.132.1.9", "43.132.1.9"] },
      ipv6: { "assets.example.test": ["2402:4e00:1020::1"] },
    }),
  });
  assert.deepEqual(result, {
    hostname: "assets.example.test",
    terminalHostname: "terminal.cdn.test",
    cnameChain: ["edge.cdn.test", "terminal.cdn.test"],
    addresses: ["2402:4e00:1020::1", "43.132.1.9"],
  });
});

test("DNS 探测阻断私网解析、IP 入口和 CNAME 循环", async () => {
  await assert.rejects(
    probePublicDns("api.example.test", {
      resolver: resolver({ ipv4: { "api.example.test": ["10.0.0.8"] } }),
    }),
    /私网、回环或保留地址/u,
  );
  await assert.rejects(probePublicDns("127.0.0.1"), /必须使用域名/u);
  await assert.rejects(
    probePublicDns("a.example.test", {
      resolver: resolver({
        cname: {
          "a.example.test": ["b.example.test"],
          "b.example.test": ["a.example.test"],
        },
        ipv4: { "a.example.test": ["43.132.1.9"] },
      }),
    }),
    /CNAME 链存在循环/u,
  );
});

test("切流 DNS 探测记录真实 TTL 并阻断尚未收敛的旧高 TTL", async () => {
  const accepted = await probePublicDns("api.example.test", {
    resolver: resolver({ ipv4: { "api.example.test": ["43.132.1.9"] }, ttl: 180 }),
    maximumTtlSeconds: 300,
  });
  assert.deepEqual(accepted.ttlSeconds, { minimum: 180, maximum: 180 });
  await assert.rejects(
    probePublicDns("api.example.test", {
      resolver: resolver({ ipv4: { "api.example.test": ["43.132.1.9"] }, ttl: 900 }),
      maximumTtlSeconds: 300,
    }),
    /剩余 TTL 900s 超过切流上限 300s/u,
  );
});

test("权威 DNS 探测从子域向上定位区域并严格核对双 NS 委派", async () => {
  const records = {
    soa: { "example.test": { nsname: "Ns1.DnsPod.Net." } },
    ns: { "example.test": ["ns2.dnspod.net.", "ns1.dnspod.net."] },
  };
  const accepted = await probeAuthoritativeDns("api.example.test", {
    resolver: resolver(records),
    expectedNameServers: ["ns1.dnspod.net", "ns2.dnspod.net"],
  });
  assert.deepEqual(accepted, {
    hostname: "api.example.test",
    zone: "example.test",
    soaPrimary: "ns1.dnspod.net",
    nameServers: ["ns1.dnspod.net", "ns2.dnspod.net"],
  });
  await assert.rejects(
    probeAuthoritativeDns("api.example.test", {
      resolver: resolver(records),
      expectedNameServers: ["old1.example.net", "old2.example.net"],
    }),
    /权威 NS 与接入清单不一致/u,
  );
});

test("权威 DNS 探测兼容 CNAME 子域查询 SOA 返回 EBADRESP", async () => {
  const accepted = await probeAuthoritativeDns("pre-api.example.test", {
    resolver: resolver({
      soaErrors: { "pre-api.example.test": "EBADRESP" },
      soa: { "example.test": { nsname: "ns1.dnspod.net" } },
      ns: { "example.test": ["ns1.dnspod.net", "ns2.dnspod.net"] },
    }),
    expectedNameServers: ["ns1.dnspod.net", "ns2.dnspod.net"],
  });

  assert.equal(accepted.zone, "example.test");
  await assert.rejects(
    probeAuthoritativeDns("example.test", {
      resolver: resolver({ soaErrors: { "example.test": "EBADRESP" } }),
      expectedNameServers: ["ns1.dnspod.net", "ns2.dnspod.net"],
    }),
    (error) => error?.code === "EBADRESP",
  );
});
