/**
 * Coze 真 bot 同步脚本
 * ============================================================
 * ⚠️ 请在【你自己的终端】运行（沙箱外·能连 5433·环境含真 ENCRYPTION_KEY）。
 *    Claude 工具启的进程连不上 5433，这个脚本必须你手动跑。
 *
 * 前置条件（缺一不可，脚本会逐项校验并拦截）：
 *   1) 根 .env 的 COZE_API_KEY 填成你的真 PAT（pat_ 开头）
 *   2) 根 .env 的 ENCRYPTION_KEY 是合法的 32 字节密钥
 *      （当前是 "change-me-in..." 40 字节占位，必须先改成 32 字节，
 *       且要和后端运行时用的值一致，否则写进去的 apiKey 后端解不开）
 *
 * 用法（在 apps/server 目录下）：
 *   node scripts/seed-coze-bots.cjs           # 只读预览：列出 Coze 真 bot + 同步计划，不写库
 *   node scripts/seed-coze-bots.cjs --apply   # 执行：把 Coze 真 bot 写入 BotConfig，假占位下线
 * ============================================================
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const APPLY = process.argv.includes("--apply");

// ── 1. 加载根 .env 并注入 process.env ──
const envPath = path.resolve(__dirname, "../../../.env");
if (!fs.existsSync(envPath)) {
  console.error("✗ 找不到根 .env:", envPath);
  process.exit(1);
}
const envRaw = fs.readFileSync(envPath, "utf8");
for (const line of envRaw.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/\r$/, "");
}

// ── 2. 前置校验 ──
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "";
const COZE_API_KEY = process.env.COZE_API_KEY || "";
const DATABASE_URL = process.env.DATABASE_URL || "";

function die(msg) { console.error("\n✗ " + msg + "\n"); process.exit(1); }

if (Buffer.byteLength(ENCRYPTION_KEY, "utf8") !== 32) {
  die(`ENCRYPTION_KEY 必须正好 32 字节，当前 ${Buffer.byteLength(ENCRYPTION_KEY, "utf8")} 字节（值前缀 "${ENCRYPTION_KEY.slice(0, 8)}"）。\n` +
    `  请先把根 .env 的 ENCRYPTION_KEY 改成合法 32 字节密钥，且与后端运行时一致。\n` +
    `  生成示例：node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"  （16 字节 hex = 32 字符）`);
}
if (!COZE_API_KEY.startsWith("pat_")) {
  die(`COZE_API_KEY 未配置或不是 pat_ 开头（当前长度 ${COZE_API_KEY.length}）。请在根 .env 填入你的 Coze PAT。`);
}
if (!DATABASE_URL) die("DATABASE_URL 未配置。");

// ── 3. AES-256-GCM 加密（与 apps/server/src/common/crypto.util.ts 完全一致） ──
function encrypt(plaintext) {
  const key = Buffer.from(ENCRYPTION_KEY, "utf8");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, enc, tag]).toString("base64");
}

const H = { Authorization: "Bearer " + COZE_API_KEY, "Content-Type": "application/json" };
const isRealBotId = (id) => /^\d{15,}$/.test(String(id || "")); // 真 Coze botId 是 19 位左右纯数字

async function listCozeBots() {
  // 先取空间 id（list_bot 需要 space_id）
  let spaceId = "";
  try {
    const wr = await fetch("https://api.coze.cn/v1/workspaces", { headers: H });
    const wj = await wr.json();
    const ws = (wj.data && (wj.data.workspaces || wj.data.items)) || [];
    if (ws.length) spaceId = ws[0].id;
    console.log(`  空间数: ${ws.length}${spaceId ? `，使用 space_id=${spaceId}` : ""}`);
  } catch (e) { console.log("  取空间列表失败:", e.message); }

  const url = "https://api.coze.cn/v1/space/list_bot" + (spaceId ? `?space_id=${spaceId}&page_size=50` : "?page_size=50");
  const r = await fetch(url, { headers: H });
  const j = await r.json();
  if (j.code !== 0) die(`Coze list_bot 失败: code=${j.code} msg=${j.msg}`);
  const data = j.data || {};
  const list = data.space_bots || data.items || [];
  return list.map((b) => ({
    botId: String(b.bot_id),
    name: b.bot_name || b.name || "未命名",
    intro: b.description || "",
    avatar: b.icon_url || b.avatar_url || "",
  }));
}

async function main() {
  console.log(`\n=== Coze 真 bot 同步 ${APPLY ? "【写库模式 --apply】" : "【只读预览】"} ===\n`);

  console.log("① 拉取 Coze 空间真 bot ...");
  const cozeBots = await listCozeBots();
  console.log(`  Coze 真 bot 数: ${cozeBots.length}`);
  cozeBots.forEach((b) => console.log(`    - ${b.botId} | ${b.name}`));
  if (!cozeBots.length) die("Coze 空间没有可同步的 bot。请先在 Coze 后台创建并发布智能体。");

  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  try {
    console.log("\n② 读取库内 BotConfig ...");
    const dbBots = await prisma.botConfig.findMany({ orderBy: { sortOrder: "asc" } });
    const placeholders = dbBots.filter((b) => !isRealBotId(b.botId)); // 假占位
    console.log(`  库内共 ${dbBots.length} 条，其中假占位 ${placeholders.length} 条`);

    // ── 计划：每个 Coze bot → 已存在同 botId 则更新；否则顶替一个假占位；占位用完则新建 ──
    const dbByBotId = new Map(dbBots.map((b) => [b.botId, b]));
    let phCursor = 0;
    const plan = []; // { action, targetId?, coze }
    for (const cb of cozeBots) {
      if (dbByBotId.has(cb.botId)) {
        plan.push({ action: "update", targetId: dbByBotId.get(cb.botId).id, coze: cb });
      } else if (phCursor < placeholders.length) {
        const ph = placeholders[phCursor++];
        plan.push({ action: "replace", targetId: ph.id, targetName: ph.name, coze: cb });
      } else {
        plan.push({ action: "create", coze: cb });
      }
    }
    const usedPlaceholderIds = new Set(plan.filter((p) => p.action === "replace").map((p) => p.targetId));
    const toDeactivate = placeholders.filter((p) => !usedPlaceholderIds.has(p.id) && p.status === "ACTIVE");

    console.log("\n③ 同步计划：");
    for (const p of plan) {
      if (p.action === "update") console.log(`    [更新] 真bot已在库 → 刷新 apiKey/资料：${p.coze.name}`);
      else if (p.action === "replace") console.log(`    [顶替] 假占位「${p.targetName}」→ 真bot「${p.coze.name}」(${p.coze.botId})`);
      else console.log(`    [新建] 真bot「${p.coze.name}」(${p.coze.botId})`);
    }
    console.log(`    [下线] 剩余 ${toDeactivate.length} 条假占位 → status=INACTIVE（从广场隐藏，不删除）`);
    toDeactivate.forEach((b) => console.log(`        · ${b.name} (${b.botId})`));

    if (!APPLY) {
      console.log("\n只读预览结束。确认无误后加 --apply 执行写库。\n");
      return;
    }

    console.log("\n④ 写库中 ...");
    const encKey = encrypt(COZE_API_KEY);
    let nextSort = Math.max(0, ...dbBots.map((b) => b.sortOrder || 0));
    for (const p of plan) {
      const c = p.coze;
      if (p.action === "create") {
        await prisma.botConfig.create({
          data: {
            name: c.name, type: "COZE_AGENT", avatar: c.avatar, intro: c.intro,
            botId: c.botId, apiKey: encKey, isFree: true, dailyLimit: 10,
            sortOrder: ++nextSort, status: "ACTIVE",
          },
        });
      } else {
        // update / replace：刷新 botId(顶替时)、apiKey、资料，置 ACTIVE；保留原 type/sortOrder/价格
        await prisma.botConfig.update({
          where: { id: p.targetId },
          data: {
            name: c.name, avatar: c.avatar, intro: c.intro,
            botId: c.botId, apiKey: encKey, status: "ACTIVE",
          },
        });
      }
    }
    for (const b of toDeactivate) {
      await prisma.botConfig.update({ where: { id: b.id }, data: { status: "INACTIVE" } });
    }

    const activeReal = await prisma.botConfig.count({ where: { status: "ACTIVE" } });
    console.log(`\n✓ 完成。当前 ACTIVE 智能体 ${activeReal} 个，均指向真 Coze botId。`);
    console.log("  现在去智能体广场即可真对话。\n");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error("脚本异常:", e); process.exit(1); });
