const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const cp = require("node:child_process");
const { chromium } = require(
  path.resolve(process.env.QA_NODE_MODULES || "./node_modules", "playwright"),
);
const root = path.resolve(__dirname, "../..");
const dist = path.join(root, "apps/mobile/dist/build/h5");
const out = path.resolve(
  process.env.QA_OUTPUT_DIR || path.join(root, "artifacts/general-search-browser"),
);
const origin = "http://127.0.0.1:5199";
const mime = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".json": "application/json",
  ".woff2": "font/woff2",
};
(async () => {
  if (fs.existsSync(out)) throw Error("不覆盖旧证据");
  fs.mkdirSync(out);
  const server = http.createServer((req, res) => {
    try {
      let rel = decodeURIComponent(new URL(req.url, origin).pathname).replace(/^\/h5\/?/, "");
      let file = path.resolve(dist, rel);
      if (!file.startsWith(dist + path.sep) && file !== dist) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(dist, "index.html");
      res.setHeader("Content-Type", mime[path.extname(file)] || "application/octet-stream");
      fs.createReadStream(file).pipe(res);
    } catch {
      res.writeHead(500);
      res.end();
    }
  });
  await new Promise((r) => server.listen(5199, "127.0.0.1", r));
  let browser;
  const report = {
    sourceCommit: cp
      .execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" })
      .trim(),
    startedAt: new Date().toISOString(),
    scope: "本地H5构建和合成搜索接口；不代表真实渠道或线上搜索内容",
    realDevice: false,
    checks: [],
    outboundAllowed: 0,
  };
  try {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
    for (const width of [320, 390, 768]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      const apiRequests = [];
      await context.route("**/*", async (route) => {
        const u = new URL(route.request().url());
        if (u.origin === origin) return route.continue();
        if (!u.pathname.includes("/api/v1/")) return route.abort();
        const routePath = u.pathname.split("/api/v1")[1];
        apiRequests.push({ method: route.request().method(), path: routePath });
        let data = {};
        if (routePath === "/search")
          data = {
            products: [
              {
                id: "local-search-fixture",
                title: "本地验收古籍",
                price: 12,
                images: [],
                salesCount: 0,
              },
            ],
          };
        if (routePath === "/search/hot" || routePath === "/search/suggest") data = [];
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ code: 200, message: "ok", data }),
        });
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      try {
        await page.goto(origin + "/h5/pkg-search/search/index?tab=product");
        const input = page.locator(".search-input input");
        await input.waitFor();
        const emptyBox = await input.boundingBox();
        assert.ok(emptyBox.width >= width - 120, JSON.stringify(emptyBox));
        for (const label of ["返回上一页", "搜索", "联系智能客服", "查看消息通知"]) {
          const box = await page.getByRole("button", { name: label, exact: true }).boundingBox();
          assert.ok(box && box.width >= 43.8 && box.height >= 43.8, label + JSON.stringify(box));
        }
        await input.fill("古籍50%");
        const clear = page.getByRole("button", { name: "清空搜索词", exact: true });
        await clear.click();
        await page.waitForFunction(
          () => document.querySelector(".search-input input")?.value === "",
        );
        assert.equal(await input.inputValue(), "");
        await input.fill("古籍50%");
        await page.getByRole("button", { name: "搜索", exact: true }).click();
        await page.waitForURL(/pkg-search\/search\/result/);
        assert.equal(new URL(page.url()).searchParams.get("tab"), "product");
        await page.getByText("本地验收古籍", { exact: true }).waitFor();
        assert.equal((await page.locator(".tab-item--active").innerText()).trim(), "商品");
        await page.locator(".search-input input").fill("课程");
        await page.getByRole("button", { name: "搜索", exact: true }).click();
        await page.getByRole("button", { name: "返回上一页", exact: true }).click();
        await page.waitForURL(/pkg-search\/search\/index/);
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          true,
        );
        assert.equal(
          apiRequests.some((r) => r.path.includes("/search/history")),
          false,
        );
        assert.deepEqual(errors, []);
        await page.screenshot({ path: path.join(out, "search-" + width + ".png") });
        report.checks.push({
          width,
          passed: true,
          inputWidth: emptyBox.width,
          guestPrivateHistoryRequests: 0,
          uncaughtErrors: 0,
        });
      } catch (e) {
        report.checks.push({
          width,
          passed: false,
          error: String(e.message).slice(0, 400),
          errors,
          apiRequests,
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
    report.finishedAt = new Date().toISOString();
    report.passed = report.checks.filter((c) => c.passed).length;
    report.failed = report.checks.length - report.passed;
    fs.writeFileSync(path.join(out, "runtime-report.json"), JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify(report));
    if (report.failed) process.exitCode = 1;
  }
})().catch((e) => {
  console.error(String(e.message).slice(0, 240));
  process.exitCode = 1;
});
