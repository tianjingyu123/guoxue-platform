import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..", "..");
const builder = path.join(projectRoot, "scripts/release/build-app-link-associations.mjs");

function completeIntake() {
  return {
    appDeepLinks: {
      host: "api.guoxue.cn",
      pathPatterns: ["/h5/*", "/share/*"],
      ios: {
        teamId: "A1B2C3D4E5",
        bundleId: "com.rebu.iosapprebu",
      },
      android: {
        packageName: "com.rebu.apprebu",
        sha256CertFingerprints: [
          "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899",
        ],
      },
    },
  };
}

async function runBuilder(intake) {
  const root = await mkdtemp(path.join(os.tmpdir(), "gx-app-links-"));
  const input = path.join(root, "intake.json");
  const output = path.join(root, "output");
  await writeFile(input, `${JSON.stringify(intake, null, 2)}\n`, "utf8");
  const result = spawnSync(
    process.execPath,
    ["--", builder, "--", "--input", input, "--output", output],
    { cwd: projectRoot, encoding: "utf8" },
  );
  return { root, output, result };
}

test("生成与现有双端应用身份一致的 Universal Link 和 App Link 文件", async () => {
  const run = await runBuilder(completeIntake());
  try {
    assert.equal(run.result.status, 0, run.result.stderr || run.result.stdout);
    const apple = JSON.parse(
      await readFile(path.join(run.output, ".well-known/apple-app-site-association"), "utf8"),
    );
    const android = JSON.parse(
      await readFile(path.join(run.output, ".well-known/assetlinks.json"), "utf8"),
    );
    const plan = JSON.parse(
      await readFile(path.join(run.output, "app-deep-link-build-plan.json"), "utf8"),
    );
    const report = JSON.parse(
      await readFile(path.join(run.output, "app-link-association-report.json"), "utf8"),
    );

    assert.equal(apple.applinks.details[0].appID, "A1B2C3D4E5.com.rebu.iosapprebu");
    assert.deepEqual(
      apple.applinks.details[0].components.map((item) => item["/"]),
      ["/h5/*", "/share/*"],
    );
    assert.equal(android[0].target.package_name, "com.rebu.apprebu");
    assert.equal(
      android[0].target.sha256_cert_fingerprints[0],
      "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99",
    );
    assert.deepEqual(plan.ios.associatedDomainsEntitlement, ["applinks:api.guoxue.cn"]);
    assert.equal(plan.android.intentFilter.data[0].pathPrefix, "/h5/");
    assert.equal(report.success, true);
    assert.equal(JSON.stringify(report).includes("api.guoxue.cn"), false);
    assert.equal(JSON.stringify(report).includes("AA:BB:CC"), false);
  } finally {
    await rm(run.root, { recursive: true, force: true });
  }
});

test("错误包名或签名指纹会在写出关联文件前阻断", async () => {
  const intake = completeIntake();
  intake.appDeepLinks.android.packageName = "com.example.invalid";
  intake.appDeepLinks.android.sha256CertFingerprints = ["invalid"];
  const run = await runBuilder(intake);
  try {
    assert.notEqual(run.result.status, 0);
    await assert.rejects(access(run.output));
  } finally {
    await rm(run.root, { recursive: true, force: true });
  }
});

test("占位域名与非受控路径不能生成公网关联文件", async () => {
  const intake = completeIntake();
  intake.appDeepLinks.host = "api.example.com";
  intake.appDeepLinks.pathPatterns = ["/h5/?redirect=*"];
  const run = await runBuilder(intake);
  try {
    assert.notEqual(run.result.status, 0);
    await assert.rejects(access(run.output));
  } finally {
    await rm(run.root, { recursive: true, force: true });
  }
});

test("当前接入清单生成物已纳入 Nginx 固定发布包且 iOS 描述文件启用关联域", async () => {
  const intake = JSON.parse(
    await readFile(path.join(projectRoot, "config/release/infrastructure-intake.json"), "utf8"),
  );
  const run = await runBuilder(intake);
  try {
    assert.equal(run.result.status, 0, run.result.stderr || run.result.stdout);
    const generatedApple = JSON.parse(
      await readFile(path.join(run.output, ".well-known/apple-app-site-association"), "utf8"),
    );
    const generatedAndroid = JSON.parse(
      await readFile(path.join(run.output, ".well-known/assetlinks.json"), "utf8"),
    );
    const deployedApple = JSON.parse(
      await readFile(path.join(projectRoot, "docker/nginx/well-known/apple-app-site-association"), "utf8"),
    );
    const deployedAndroid = JSON.parse(
      await readFile(path.join(projectRoot, "docker/nginx/well-known/assetlinks.json"), "utf8"),
    );
    assert.deepEqual(deployedApple, generatedApple);
    assert.deepEqual(deployedAndroid, generatedAndroid);

    const directNginx = await readFile(path.join(projectRoot, "docker/nginx/nginx.conf.template"), "utf8");
    const clbNginx = await readFile(path.join(projectRoot, "docker/nginx/nginx.clb.conf.template"), "utf8");
    const prodCompose = await readFile(path.join(projectRoot, "docker/docker-compose.prod.yml"), "utf8");
    const tencentCompose = await readFile(path.join(projectRoot, "docker/docker-compose.tencent.yml"), "utf8");
    for (const config of [directNginx, clbNginx]) {
      assert.match(config, /location = \/\.well-known\/apple-app-site-association/u);
      assert.match(config, /location = \/\.well-known\/assetlinks\.json/u);
      assert.match(config, /try_files \$uri =404/u);
      assert.match(config, /default_type application\/json/u);
    }
    for (const compose of [prodCompose, tencentCompose]) {
      assert.match(compose, /\.\/nginx\/well-known:\/var\/www\/\.well-known:ro/u);
    }

    const mobileManifest = JSON.parse(
      await readFile(path.join(projectRoot, "apps/mobile/src/manifest.json"), "utf8"),
    );
    assert.deepEqual(
      mobileManifest["app-plus"].distribute.ios.capabilities.entitlements[
        "com.apple.developer.associated-domains"
      ],
      [`applinks:${intake.appDeepLinks.host}`],
    );
  } finally {
    await rm(run.root, { recursive: true, force: true });
  }
});
