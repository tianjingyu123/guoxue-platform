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
  const deployedApple = JSON.parse(
    await readFile(path.join(projectRoot, "docker/nginx/well-known/apple-app-site-association"), "utf8"),
  );
  const deployedAndroid = JSON.parse(
    await readFile(path.join(projectRoot, "docker/nginx/well-known/assetlinks.json"), "utf8"),
  );
  const mobileManifest = JSON.parse(
    await readFile(path.join(projectRoot, "apps/mobile/src/manifest.json"), "utf8"),
  );
  const iosBundleId = mobileManifest["app-plus"].distribute.ios.appid;
  const androidPackageName = mobileManifest["app-plus"].distribute.android.packagename;
  const associatedDomains =
    mobileManifest["app-plus"].distribute.ios.capabilities.entitlements[
      "com.apple.developer.associated-domains"
    ];

  assert.deepEqual(associatedDomains, ["applinks:api.rebugx.cn"]);
  assert.equal(deployedApple.applinks.details[0].appID, `WL5PA97667.${iosBundleId}`);
  assert.deepEqual(deployedApple.applinks.details[0].components, [{ "/": "/h5/*" }]);
  assert.equal(deployedAndroid[0].target.package_name, androidPackageName);
  assert.deepEqual(deployedAndroid[0].target.sha256_cert_fingerprints, [
    "73:7C:54:A4:5E:71:0B:CE:7C:68:75:A4:1A:5A:5C:0C:22:8C:09:BD:31:FC:08:DF:8E:01:63:64:B6:1B:9D:67",
    "85:A8:1C:39:36:B9:5D:95:32:B7:1C:85:C6:7B:24:8D:40:DF:09:5F:E1:C2:AA:A0:AB:75:90:40:65:09:87:A7",
  ]);

  const directNginx = await readFile(path.join(projectRoot, "docker/nginx/nginx.conf.template"), "utf8");
  const clbNginx = await readFile(path.join(projectRoot, "docker/nginx/nginx.clb.conf.template"), "utf8");
  const prodCompose = await readFile(path.join(projectRoot, "docker/docker-compose.prod.yml"), "utf8");
  const tencentCompose = await readFile(path.join(projectRoot, "docker/docker-compose.tencent.yml"), "utf8");
  const deployScript = await readFile(path.join(projectRoot, "docker/deploy.sh"), "utf8");
  const releaseActivator = await readFile(
    path.join(projectRoot, "scripts/release/activate-fixed-release.sh"),
    "utf8",
  );
  const androidManifest = await readFile(
    path.join(projectRoot, "apps/mobile/AndroidManifest.xml"),
    "utf8",
  );
  const androidNetworkSecurity = await readFile(
    path.join(
      projectRoot,
      "apps/mobile/nativeResources/android/res/xml/network_security_config.xml",
    ),
    "utf8",
  );
  for (const config of [directNginx, clbNginx]) {
    assert.match(config, /location = \/\.well-known\/apple-app-site-association/u);
    assert.match(config, /location = \/\.well-known\/assetlinks\.json/u);
    assert.match(config, /try_files \$uri =404/u);
    assert.match(config, /default_type application\/json/u);
  }
  for (const compose of [prodCompose, tencentCompose]) {
    assert.match(compose, /\.\/nginx\/well-known:\/var\/www\/\.well-known:ro/u);
  }
  assert.match(
    deployScript,
    /"\$\{COMPOSE\[@\]\}" up -d --no-deps server nginx/u,
    "已有服务滚动发布必须同时刷新 Nginx，避免继续挂载旧发布目录",
  );
  assert.match(releaseActivator, /normalize_public_association_permissions\(\)/u);
  assert.match(releaseActivator, /chmod 0755 "\$association_dir"/u);
  assert.match(releaseActivator, /chmod 0644 "\$apple_file" "\$android_file"/u);
  assert.match(
    releaseActivator,
    /normalize_public_association_permissions "\$FINAL_DIR"/u,
    "固定包首次激活和可重入恢复都必须让 Nginx worker 可读取公开关联文件",
  );
  assert.match(androidManifest, /package="com\.rebu\.apprebu"/u);
  assert.equal(mobileManifest["app-plus"].distribute.android.usesCleartextTraffic, false);
  assert.equal(
    mobileManifest["app-plus"].distribute.android.permissions.some((permission) =>
      permission.includes("FOREGROUND_SERVICE_MEDIA_PROJECTION"),
    ),
    false,
  );
  assert.match(androidManifest, /android:name="com\.rebu\.apprebu\.AppLinkEntry"/u);
  assert.match(androidManifest, /android:targetActivity="io\.dcloud\.PandoraEntryActivity"/u);
  assert.match(androidManifest, /<intent-filter android:autoVerify="true">/u);
  assert.match(androidManifest, /android:usesCleartextTraffic="false"/u);
  assert.match(androidManifest, /android:networkSecurityConfig="@xml\/network_security_config"/u);
  assert.match(androidManifest, /android:scheme="https"/u);
  assert.match(androidManifest, /android:host="api\.rebugx\.cn"/u);
  assert.doesNotMatch(androidManifest, /pre-api\.rebugx\.cn/u);
  assert.match(androidManifest, /android:pathPrefix="\/h5\/"/u);
  assert.match(androidNetworkSecurity, /cleartextTrafficPermitted="false"/u);
  assert.match(androidNetworkSecurity, /<certificates src="system" \/>/u);
});
