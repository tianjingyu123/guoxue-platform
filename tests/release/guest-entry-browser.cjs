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
  process.env.QA_OUTPUT_DIR || path.join(root, "artifacts/guest-entry-browser"),
);
const origin = "http://127.0.0.1:5203";
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
  assert.ok(!fs.existsSync(out), "不覆盖已有验收记录");
  fs.mkdirSync(out, { recursive: true });
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, origin).pathname).replace(/^\/h5\/?/, "");
    let file = path.resolve(dist, rel);
    if (!file.startsWith(dist + path.sep) && file !== dist) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(dist, "index.html");
    res.setHeader("Content-Type", mime[path.extname(file)] || "application/octet-stream");
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(5203, "127.0.0.1", resolve));
  let browser;
  const report = {
    sourceCommit: cp
      .execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" })
      .trim(),
    startedAt: new Date().toISOString(),
    scope: "本地H5构建、合成公开接口，实际入口、键盘激活、返回与触控范围；不代表真实数据或真机",
    realDevice: false,
    outboundAllowed: 0,
    checks: [],
  };
  try {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
    for (const width of [320, 390, 768]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      const apiRequests = [];
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === origin) return route.continue();
        if (!url.pathname.includes("/api/v1/")) return route.abort();
        const endpoint = url.pathname.split("/api/v1")[1];
        apiRequests.push({ method: route.request().method(), path: endpoint });
        if (route.request().method() !== "GET") return route.abort();
        let data = { items: [], list: [], total: 0, page: 1, pageSize: 20 };
        if (endpoint === "/institute/intro")
          data = {
            id: "isolated-institute",
            name: "本地验收研究院",
            intro: "合成数据仅用于布局验证",
            management: [],
            _count: { members: 0, events: 0, courses: 0 },
          };
        if (endpoint === "/institute/talent-pool") data = { teachers: [] };
        if (endpoint === "/institute/events") data = { events: [] };
        if (endpoint === "/offline/stations/discover") data = { stations: [], total: 0 };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ code: 200, message: "ok", data }),
        });
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const boxes = [];
      try {
        await page.goto(origin + "/h5/pages/discover/index");
        const grid = page.getByRole("navigation", { name: "业务服务" });
        await grid.waitFor();
        assert.equal(await grid.getByRole("link").count(), 5);
        for (const item of [
          {
            label: "研究院",
            path: "pkg-institute/index/index",
            selector: ".nav-back",
            open: "Enter",
            back: "Space",
          },
          {
            label: "赛事",
            path: "pkg-competition/home/index",
            selector: ".a1-back-btn",
            open: "Space",
            back: "Enter",
          },
          {
            label: "线下驿站",
            path: "pkg-offline/stations/index",
            selector: ".c1-nav-btn[role=button]",
            open: "Enter",
            back: "click",
          },
        ]) {
          const link = grid.getByRole("link", { name: item.label, exact: true });
          await link.focus();
          await link.press(item.open);
          await page.waitForURL("**/h5/" + item.path);
          const back = page.locator(item.selector);
          await back.waitFor();
          const box = await back.boundingBox();
          assert.ok(
            box && box.width >= 43.8 && box.height >= 43.8,
            item.label + JSON.stringify(box),
          );
          boxes.push({ label: item.label, box });
          assert.ok(
            await back.evaluate((el) => {
              const r = el.getBoundingClientRect();
              return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
            }),
            "返回按钮被覆盖",
          );
          assert.equal(await back.getAttribute("aria-label"), "返回上一页");
          await page.screenshot({ path: path.join(out, item.label + "-" + width + ".png") });
          if (item.back === "click") await back.click();
          else {
            await back.focus();
            assert.notEqual(await back.evaluate((el) => getComputedStyle(el).outlineStyle), "none");
            await back.press(item.back);
          }
          await page.waitForURL("**/h5/pages/discover/index");
        }
        await page.goto(origin + "/h5/pkg-video/list/index");
        for (const selector of [".vl-back-btn", ".vl-search-btn"]) {
          const box = await page.locator(selector).boundingBox();
          assert.ok(box && box.width >= 43.8 && box.height >= 43.8, selector + JSON.stringify(box));
          boxes.push({ label: selector, box });
        }
        await page.locator(".vl-search-btn").focus();
        await page.locator(".vl-search-btn").press("Enter");
        await page.waitForURL(/pkg-video\/search\/index/);
        await page.goBack();
        await page.waitForURL(/pkg-video\/list\/index/);
        await page.screenshot({ path: path.join(out, "video-" + width + ".png") });
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          true,
        );
        assert.deepEqual(errors, []);
        assert.equal(
          apiRequests.some((r) => r.method !== "GET"),
          false,
          "游客导航不应发起写操作",
        );
        report.checks.push({
          width,
          passed: true,
          boxes,
          keyboardOpenAndBack: true,
          videoSearchKeyboard: true,
          uncaughtErrors: 0,
          businessWrites: 0,
        });
      } catch (error) {
        report.checks.push({
          width,
          passed: false,
          error: String(error.message).slice(0, 500),
          boxes,
          errors,
          apiRequests,
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
    report.finishedAt = new Date().toISOString();
    report.passed = report.checks.filter((c) => c.passed).length;
    report.failed = report.checks.length - report.passed;
    fs.writeFileSync(path.join(out, "runtime-report.json"), JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify(report));
    if (report.failed) process.exitCode = 1;
  }
})().catch((error) => {
  console.error(String(error.message).slice(0, 250));
  process.exitCode = 1;
});
