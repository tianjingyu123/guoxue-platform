import dns from "node:dns/promises";
import { isIP } from "node:net";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeHostname(value) {
  return String(value || "").trim().toLowerCase().replace(/\.$/u, "");
}

function isPublicIpv4(address) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 88 && parts[2] === 99) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && parts[2] === 100) ||
    (a === 203 && b === 0 && parts[2] === 113) ||
    a >= 224
  );
}

function isPublicIpv6(address) {
  const normalized = address.toLowerCase().split("%")[0];
  if (normalized.startsWith("::ffff:") && normalized.slice(7).includes(".")) {
    return isPublicIpv4(normalized.slice(7));
  }
  return !(
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/u.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  );
}

export function isPublicAddress(address) {
  const family = isIP(address);
  if (family === 4) return isPublicIpv4(address);
  if (family === 6) return isPublicIpv6(address);
  return false;
}

async function optionalResolve(callback, notFoundCodes) {
  try {
    return await callback();
  } catch (error) {
    if (notFoundCodes.includes(error?.code)) return [];
    throw error;
  }
}

export async function probePublicDns(hostname, options = {}) {
  const resolver = options.resolver ?? dns;
  const start = normalizeHostname(hostname);
  assert(start && isIP(start) === 0, "公网 DNS 探测必须使用域名，不能使用 IP");

  const cnameChain = [];
  const visited = new Set([start]);
  let current = start;
  for (let depth = 0; depth <= 8; depth += 1) {
    const aliases = await optionalResolve(
      () => resolver.resolveCname(current),
      ["ENODATA", "ENOTFOUND", "ENOENT"],
    );
    if (aliases.length === 0) break;
    assert(depth < 8, "DNS CNAME 链超过 8 层");
    assert(aliases.length === 1, `域名 ${current} 返回多个 CNAME，无法形成确定性证据`);
    const alias = normalizeHostname(aliases[0]);
    assert(alias && !visited.has(alias), "DNS CNAME 链存在循环或无效目标");
    cnameChain.push(alias);
    visited.add(alias);
    current = alias;
  }

  const [ipv4, ipv6] = await Promise.all([
    optionalResolve(() => resolver.resolve4(start), ["ENODATA", "ENOTFOUND", "ENOENT"]),
    optionalResolve(() => resolver.resolve6(start), ["ENODATA", "ENOTFOUND", "ENOENT"]),
  ]);
  const addresses = [...new Set([...ipv4, ...ipv6].map(String))].sort();
  assert(addresses.length > 0, `域名 ${start} 未解析到公网地址`);
  assert(addresses.every(isPublicAddress), `域名 ${start} 解析到私网、回环或保留地址`);

  return {
    hostname: start,
    terminalHostname: current,
    cnameChain,
    addresses,
  };
}
