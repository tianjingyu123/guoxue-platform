#!/usr/bin/env node
// 通过 GitHub API 设置仓库 secret
// 用法: node scripts/set-github-secret.js <NAME> <VALUE>

const sodium = require("libsodium-wrappers");
const https = require("https");

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "tianjingyu123";
const REPO = "guoxue-platform";

async function getPublicKey() {
  return request("GET", `/repos/${OWNER}/${REPO}/actions/secrets/public-key`);
}

async function setSecret(name, value) {
  await sodium.ready;
  const { key, key_id } = await getPublicKey();
  const keyBytes = Buffer.from(key, "base64");
  const valueBytes = Buffer.from(value, "utf-8");

  // libsodium sealed box 加密
  const encryptedBytes = sodium.crypto_box_seal(valueBytes, keyBytes);
  const encryptedValue = Buffer.from(encryptedBytes).toString("base64");

  const body = JSON.stringify({
    encrypted_value: encryptedValue,
    key_id: key_id,
  });

  return request(
    "PUT",
    `/repos/${OWNER}/${REPO}/actions/secrets/${name}`,
    body
  );
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "api.github.com",
      path: path,
      method: method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "guoxue-cli",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    };
    if (body) {
      opts.headers["Content-Type"] = "application/json";
      opts.headers["Content-Length"] = Buffer.byteLength(body);
    }
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  const [name, value] = process.argv.slice(2);
  if (!name || !value) {
    console.log("用法: node scripts/set-github-secret.js <NAME> <VALUE>");
    console.log("需要设置 GITHUB_TOKEN 环境变量");
    process.exit(1);
  }

  try {
    await setSecret(name, value);
    console.log(`✅ Secret "${name}" 设置成功`);
  } catch (err) {
    console.error(`❌ 设置 "${name}" 失败:`, err.message);
    process.exit(1);
  }
})();
