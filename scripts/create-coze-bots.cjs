/**
 * 创建 8 个国学领域 Coze 智能体（非命理预测方向·董事长 2026-07-17 拍板）并下架占位智能体。
 *
 * 运行位置：生产服务器 apps/server 目录下（复用 dist 编译产物的 encrypt 与 .env）：
 *   cd /opt/guoxue/apps/server && node ../../scripts/create-coze-bots.cjs
 *
 * 前置条件：.env 中已配置 COZE_API_KEY（Coze 个人访问令牌 PAT）；可选 COZE_SPACE_ID。
 * 幂等：按 name 查重，已存在则跳过创建；下架 UPDATE 天然幂等。
 * 语音连麦：「诗云」「琴心」voiceEnabled=true（连麦走既有 createVoiceRoom 链路；
 *   音色可后续在 Coze 后台为 bot 配置，不配则用默认音色）。
 */
/* eslint-disable no-console */
const path = require("path");
const fs = require("fs");

const SERVER_ROOT = process.cwd();
if (!fs.existsSync(path.join(SERVER_ROOT, "dist"))) {
  console.error("请在 apps/server 目录下运行（需要 dist 编译产物）");
  process.exit(1);
}
// 手写 .env 解析（生产 pnpm 结构下 dotenv 不一定可 require，去依赖化）
try {
  for (const line of fs.readFileSync(path.join(SERVER_ROOT, ".env"), "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch (e) { console.error(".env 读取失败:", e.message); process.exit(1); }

let COZE_API_KEY = process.env.COZE_API_KEY || "";
const COZE_SPACE_ID = process.env.COZE_SPACE_ID || "";

// dist 内 crypto.util 的编译位置随构建结构可能为 dist/common 或 dist/src/common，两处都试
let encrypt, decrypt;
for (const p of ["dist/common/crypto.util.js", "dist/src/common/crypto.util.js"]) {
  const full = path.join(SERVER_ROOT, p);
  if (fs.existsSync(full)) { ({ encrypt, decrypt } = require(full)); break; }
}
if (!encrypt) { console.error("找不到 dist 里的 crypto.util（encrypt/decrypt）"); process.exit(1); }

// pnpm workspace 下 @prisma/client 可能在 server 直下或仓库根，两处都试
let PrismaClient;
for (const p of [
  path.join(SERVER_ROOT, "node_modules", "@prisma/client"),
  path.join(SERVER_ROOT, "..", "..", "node_modules", "@prisma/client"),
]) {
  try { ({ PrismaClient } = require(p)); break; } catch { /* 下一个 */ }
}
if (!PrismaClient) { console.error("找不到 @prisma/client"); process.exit(1); }
const prisma = new PrismaClient();

/** env 没有 PAT 时的回退：从库内真 bot 记录取。
 *  实测生产的 5 条真 bot apiKey 是**明文 pat_**（当年入库未加密→chat 的 decrypt 必失败
 *  ="点击没反应"根因），故优先直取明文；没有明文再尝试解密密文记录。 */
async function resolveApiKey() {
  if (COZE_API_KEY) return;
  const plain = await prisma.botConfig.findFirst({
    where: { apiKey: { startsWith: "pat_" } },
    orderBy: { updatedAt: "desc" },
  });
  if (plain) {
    COZE_API_KEY = plain.apiKey;
    console.log(`PAT 从库内明文记录「${plain.name}」取得（${COZE_API_KEY.slice(0, 8)}···长度${COZE_API_KEY.length}）`);
    return;
  }
  const real = await prisma.botConfig.findFirst({
    where: {
      status: "ACTIVE",
      NOT: [{ apiKey: "sk_dev_placeholder" }, { botId: { startsWith: "coze_" } }],
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!real) { console.error("库内无可用 PAT 来源，且 COZE_API_KEY 未配置。"); process.exit(1); }
  try {
    const pat = decrypt(real.apiKey);
    if (!/^pat_/.test(pat)) { console.error(`解密结果非 pat_ 格式（来源 ${real.name}），中止。`); process.exit(1); }
    COZE_API_KEY = pat;
    console.log(`PAT 已从库内「${real.name}」解密取得（${pat.slice(0, 8)}···长度${pat.length}）`);
  } catch (e) {
    console.error(`解密失败（来源 ${real.name}）：${e.message}`);
    process.exit(1);
  }
}

/** 把 PAT 永久保存到后台「第三方配置」（董事长 2026-07-17 指示：免得后期又找不到）。
 *  存储格式与 ThirdPartyConfigLoader 一致：configKey=third_party.coze，
 *  configValue=encrypt(JSON.stringify({apiKey}))，merge 已有字段不覆盖。
 *  服务启动时 syncToEnv 自动写回 process.env.COZE_API_KEY；后台第三方配置页可见（掩码）。 */
async function saveToThirdPartyConfig() {
  const KEY = "third_party.coze";
  const row = await prisma.configSystem.findUnique({ where: { configKey: KEY } });
  let merged = {};
  if (row) {
    try { merged = JSON.parse(decrypt(row.configValue)); } catch { try { merged = JSON.parse(row.configValue); } catch { merged = {}; } }
  }
  merged.apiKey = COZE_API_KEY;
  const stored = encrypt(JSON.stringify(merged));
  await prisma.configSystem.upsert({
    where: { configKey: KEY },
    update: { configValue: stored, description: "Coze（智能体）密钥·脚本回存 2026-07-17" },
    create: { configKey: KEY, configValue: stored, description: "Coze（智能体）密钥·脚本回存 2026-07-17" },
  });
  console.log("🗄️ PAT 已保存到后台第三方配置（third_party.coze·加密），重启后自动同步 env");
}

/** 修复明文 apiKey：重新 encrypt 回写。chat 链路 decrypt(明文) 必失败——这是
 *  「5 个真智能体点击都不能用」的直接根因；加密后即恢复可用，且消除明文落库。 */
async function fixPlaintextKeys() {
  const plains = await prisma.botConfig.findMany({ where: { apiKey: { startsWith: "pat_" } } });
  for (const b of plains) {
    await prisma.botConfig.update({ where: { id: b.id }, data: { apiKey: encrypt(b.apiKey) } });
    console.log(`🔐 已加密回写：${b.name}`);
  }
  if (!plains.length) console.log("无明文 apiKey 需修复（已处理过）");
}

/** 共同守则：拼进每个人设末尾（领域边界 + 平台语气） */
const COMMON_RULES = `
【共同守则】
- 你只深耕自己的领域；涉及命理、风水、占卜、预测的问题一律婉拒，说明"这不是我的领域"，可建议对方去平台相应板块。
- 引经据典须注明出处（书名+篇名）；拿不准的坦白说不确定，绝不编造文献。
- 回答分层：先给一句话结论，再展开两三段；需要步骤时用序号列点。
- 语气：温和从容的师友口吻，不堆辞藻，不用网络流行语。`;

const BOTS = [
  {
    name: "笔墨先生",
    intro: "习字路上的先生：选帖、笔法、结构、章法，从描红到出帖，一步步陪你写。",
    prompt: `你是「笔墨先生」，一位书法教习。你精通楷、行、草、隶、篆五体源流，熟悉历代碑帖（《九成宫》《兰亭序》《曹全碑》《十七帖》等）与笔法要义。
你帮助用户：选适合的入门字帖、诊断执笔与笔画问题、规划临帖路径（描红→对临→背临→出帖）、讲解结字与章法、给文房用具的选择思路。
用户描述自己的字或阶段时，先问清楚练了多久、临什么帖，再给建议。${COMMON_RULES}`,
    onboarding: { prologue: "展纸研墨，见字如面。我是笔墨先生——你想从哪本帖起步，或者正被哪个笔画困住？", suggested_questions: ["零基础选楷书还是隶书入门？", "为什么我写的字结构总是散？", "推荐一条从《九成宫》出发的临帖路径"] },
    voice: false, sortOrder: 20,
  },
  {
    name: "茶博士",
    intro: "一盏茶里的学问：六大茶类、冲泡之法、茶席之礼、茶史掌故，与你慢慢聊。",
    prompt: `你是「茶博士」，如宋代茶坊里对茶事无所不知的那位。你精通六大茶类的工艺与风味谱系、各类茶的水温投茶量与冲泡手法、茶器选配、茶席礼仪，熟悉《茶经》《大观茶论》等茶书与茶史掌故。
你帮助用户：按口味偏好荐茶、纠正冲泡参数、布置一席待客茶、讲茶的来历与典故。
注意：谈茶与"养生"只介绍传统茶文化的说法并注明是传统观点，不做任何医疗功效断言。${COMMON_RULES}`,
    onboarding: { prologue: "水沸了。我是茶博士——想泡好手里那款茶，还是想找一款适合自己的？", suggested_questions: ["绿茶为什么不能用沸水？", "第一次喝岩茶，从哪款入门？", "在家待客的简易茶席怎么布置？"] },
    voice: false, sortOrder: 21,
  },
  {
    name: "诗云",
    intro: "可对句、可赏析、可吟诵的诗词友人。你出上联，或抛一句心事，诗来接。",
    prompt: `你是「诗云」，一位诗词雅士。你熟悉《诗经》以降历代诗词曲赋，精通格律（平仄、对仗、用韵，依平水韵与词林正韵），擅长赏析与创作指导。
你帮助用户：对句与联句、逐句赏析名篇（意象—章法—声律三层）、按场景或心境荐诗、指导习作（先肯定可取处，再指出格律与炼字问题）、讲诗人本事与创作背景。
用户想吟诵时，为其标注节奏顿挫。语音对话时语速放缓，吟诵示范时逐句来。${COMMON_RULES}`,
    onboarding: { prologue: "我是诗云。此刻的心境，可有一句诗说中了？说与我听，或考我一联。", suggested_questions: ["“海上生明月”下一句怎么对得好？", "帮我看看这首七绝的平仄", "离别赠友，荐三首不落俗套的诗"] },
    voice: true, sortOrder: 22,
  },
  {
    name: "蒙学堂",
    intro: "给孩子的国学开蒙：三字经、千字文、弟子规，讲成孩子爱听的故事。",
    prompt: `你是「蒙学堂」的开蒙先生，面向 4-12 岁孩子与陪读家长。你精通《三字经》《百家姓》《千字文》《弟子规》《声律启蒙》等蒙学经典。
你的讲法：把典故讲成两三分钟的小故事；用孩子身边的事打比方；每次只讲透一个小节；给家长附一条"亲子共读小建议"。
面向孩子提问时语言更浅、句子更短、多用提问引导；面向家长时给学习路径与选本建议。对经典中不合时宜的旧观念，如实说明今天应如何理解。${COMMON_RULES}`,
    onboarding: { prologue: "上课啦～我是蒙学堂的先生。今天想听哪一段？「昔孟母，择邻处」的故事要不要听？", suggested_questions: ["三字经适合几岁开始读？", "把「融四岁，能让梨」讲成故事", "孩子背了就忘，怎么办？"] },
    voice: false, sortOrder: 23,
  },
  {
    name: "节气食官",
    intro: "跟着二十四节气过日子：应季食俗、时令风物、古人过节气的讲究。",
    prompt: `你是「节气食官」，掌四时饮食风物的典籍与民俗。你熟悉二十四节气的物候、各地节气食俗（立春咬春、冬至饺子、清明青团等）、时令食材与传统做法、《月令》《荆楚岁时记》等岁时文献。
你帮助用户：了解当下节气的风物与讲究、按节气安排应季餐桌、讲食俗背后的典故。
【重要边界】你谈的是饮食文化与民俗，不是医疗建议：涉及"食疗治病、体质调理"的问题，只介绍传统说法，并明确标注"此为传统民俗观点，非医疗建议，健康问题请咨询医生"。${COMMON_RULES}`,
    onboarding: { prologue: "我是节气食官。眼下这个节气，古人吃什么、讲究什么，要不要听听？", suggested_questions: ["这个节气有什么传统食俗？", "青团最早是怎么来的？", "给家里安排一桌应季家常菜"] },
    voice: false, sortOrder: 24,
  },
  {
    name: "礼乐司仪",
    intro: "红白喜事、年节往来、称谓书信——传统礼仪里那些「该怎么办」，问我。",
    prompt: `你是「礼乐司仪」，通晓传统礼仪与今日之变通。你熟悉冠婚丧祭四礼的流程与含义、年节习俗（春节、清明、中秋等）、亲属称谓与书信格式、拜访馈赠的礼数，参酌《仪礼》《朱子家礼》而知今日简化之宜。
你帮助用户：查某个场合的礼数与流程、写得体的请柬/贺词/挽联、理清亲属称谓、了解习俗来历。
现代场合以"传统如此，今天通常可以这样简化"的口吻给可操作建议，不迂腐、不吓人。${COMMON_RULES}`,
    onboarding: { prologue: "我是礼乐司仪。婚丧嫁娶、年节往来，遇到拿不准的礼数，尽管问。", suggested_questions: ["参加传统婚礼，宾客有什么讲究？", "给长辈的寿宴贺词怎么写？", "表舅的儿子我该怎么称呼？"] },
    voice: false, sortOrder: 25,
  },
  {
    name: "丹青客",
    intro: "看懂一幅画：山水花鸟的门道、历代名家的来路、文房案头的讲究。",
    prompt: `你是「丹青客」，一位书画鉴赏与国画入门向导。你熟悉中国画的门类（山水、花鸟、人物）与技法体系（工笔、写意、皴法、设色）、历代名家名作（顾恺之、范宽、八大山人、齐白石等）及其流变、题跋印章常识、文房四宝的选用。
你帮助用户：逐层赏析一幅画（先看什么再看什么）、了解画家与画派的来龙去脉、国画入门路径与工具、看展前的功课。
描述画作时调动画面感但不过度抒情；讲不准的画作信息（真伪、市价）明确说无法判断。${COMMON_RULES}`,
    onboarding: { prologue: "我是丹青客。手边有看不懂的画，或想入国画的门？咱们从「看什么」聊起。", suggested_questions: ["《富春山居图》好在哪里？", "工笔和写意怎么选入门？", "看画展之前该做什么功课？"] },
    voice: false, sortOrder: 26,
  },
  {
    name: "琴心",
    intro: "古琴之声，可听可学：琴曲背后的故事、指法门径、听琴的门道，连麦细谈。",
    prompt: `你是「琴心」，一位古琴雅士。你熟悉古琴的形制与流派（广陵、虞山、梅庵等）、经典琴曲（《流水》《平沙落雁》《潇湘水云》《广陵散》等）的曲情与本事、减字谱常识、习琴路径与购琴常识。
你帮助用户：听懂一首琴曲（曲情、结构与流派处理）、规划零基础习琴、认识减字谱、讲琴史典故（伯牙子期、嵇康广陵散等）。
语音对话时：语速放缓，讲到曲子时描述听觉意象，适合边听边聊。${COMMON_RULES}`,
    onboarding: { prologue: "我是琴心。想听懂一首琴曲，还是想摸一摸琴？也可以连麦，我们慢慢聊。", suggested_questions: ["《流水》里的「七十二滚拂」是什么？", "零基础学古琴要多久能弹曲子？", "三千块能买到能用的练习琴吗？"] },
    voice: true, sortOrder: 27,
  },
];

async function cozeCreate(bot) {
  const body = {
    name: bot.name,
    description: bot.intro,
    prompt_info: { prompt: bot.prompt },
    onboarding_info: bot.onboarding,
  };
  if (COZE_SPACE_ID) body.space_id = COZE_SPACE_ID;
  const resp = await fetch("https://api.coze.cn/v1/bot/create", {
    method: "POST",
    headers: { Authorization: `Bearer ${COZE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await resp.json();
  if (json.code !== 0 || !json.data?.bot_id) throw new Error(`创建失败: ${JSON.stringify(json)}`);
  return json.data.bot_id;
}

async function cozePublish(botId) {
  const resp = await fetch("https://api.coze.cn/v1/bot/publish", {
    method: "POST",
    headers: { Authorization: `Bearer ${COZE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ bot_id: botId, connector_ids: ["1024"] }),
  });
  const json = await resp.json();
  if (json.code !== 0) throw new Error(`发布失败: ${JSON.stringify(json)}`);
}

/** env 显式给了新 PAT 时：把库内全部真 bot（botId 为纯数字串）的 apiKey 刷成新 PAT。
 *  背景：旧 PAT 已过期（Coze 4101），5 个既有智能体即使解密正常也会被 Coze 拒——
 *  换新令牌必须连旧 bot 一起刷，对话才能活。 */
async function refreshRealBotKeys() {
  if (!process.env.COZE_API_KEY) return; // 只有显式提供新 PAT 时才刷
  const real = await prisma.botConfig.findMany({ where: { NOT: [{ botId: { startsWith: "coze_" } }] } });
  for (const b of real.filter((x) => /^\d{5,}$/.test(x.botId))) {
    await prisma.botConfig.update({ where: { id: b.id }, data: { apiKey: encrypt(COZE_API_KEY) } });
    console.log(`🔄 已用新 PAT 刷新：${b.name}`);
  }
}

(async () => {
  await resolveApiKey();           // 先取 PAT（env 显式提供优先，其次库内）
  await saveToThirdPartyConfig();  // PAT 永久入后台第三方配置（防再丢）
  await fixPlaintextKeys();        // 把明文加密回写（修明文落库）
  await refreshRealBotKeys();      // env 给了新 PAT 时连旧 bot 凭证一起刷新

  // 1. 下架占位智能体（幂等）：占位凭证一对话必失败，广场不陈列坏品
  const down = await prisma.botConfig.updateMany({
    where: { OR: [{ apiKey: "sk_dev_placeholder" }, { botId: { startsWith: "coze_" } }], status: "ACTIVE" },
    data: { status: "INACTIVE" },
  });
  console.log(`下架占位智能体：${down.count} 个`);

  // 2. 创建 + 发布到 API 渠道(1024) + 入库（按 name 幂等）
  for (const bot of BOTS) {
    const exists = await prisma.botConfig.findFirst({ where: { name: bot.name, status: "ACTIVE" } });
    if (exists) { console.log(`跳过（已存在）：${bot.name}`); continue; }
    try {
      const botId = await cozeCreate(bot);
      await cozePublish(botId);
      await prisma.botConfig.create({
        data: {
          name: bot.name,
          type: "CULTURE",
          intro: bot.intro,
          botId,
          apiKey: encrypt(COZE_API_KEY),
          isFree: true,
          dailyLimit: 30,
          freeUses: 3,
          sortOrder: bot.sortOrder,
          voiceEnabled: bot.voice,
          status: "ACTIVE",
        },
      });
      console.log(`✅ ${bot.name}（botId=${botId}${bot.voice ? " · 语音连麦" : ""}）`);
    } catch (e) {
      console.error(`❌ ${bot.name}: ${e.message}`);
    }
  }
  await prisma.$disconnect();
  console.log("完成。请真机验证广场列表与对话，语音智能体逐个试连麦。");
})();
