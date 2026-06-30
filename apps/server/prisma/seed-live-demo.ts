/**
 * 主播端数据看板演示数据注入 —— 为一场「已结束的国学直播」生成自洽、贴合场景的运行时数据，
 * 让 analytics / 数据大屏 / 控制台 / 收益 等主播端看板从空态变为真实丰满。
 *
 * 设计要点：
 * - 目标：易经占断实战（ENDED，主播 13800000001），顺带修正其跨天的不合理时长。
 * - 全部确定性生成（正弦曲线 + index 取模，无 Math.random），便于复现。
 * - 自洽：订单同时写 PRODUCT(各商品销量) 与 LIVESTREAM(直播间 GMV) 两类，保证 overview / products 两看板口径一致。
 * - 幂等：先清理本房旧关联再注入，可安全重复运行。
 * - 演示数据全部挂在该 roomId 下，清理只需删除本房关联（见文件末注释）。
 *
 * 运行：cd apps/server && npx ts-node prisma/seed-live-demo.ts
 */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const ROOM_ID = "c5bce9af-eeb3-4c0a-b679-4eca0e604cf6"; // 易经占断实战：六爻预测技巧
const HOST_ID = "2308a5a0-ea77-4d6a-b28a-c42b4e877fcf"; // 讲师1 李玄明
// 起始时间设为「最近 3 天前的 14:00」，让 analytics/earnings/schedule 呈现一场新鲜的近期直播
const _base = new Date(Date.now() - 3 * 86400000);
_base.setHours(14, 0, 0, 0);
const START = _base;
const DURATION = 105; // 分钟，合理的一场国学直播时长

// 真实昵称观众池（排除 E2E 测试账号）
const AUDIENCE = [
  "fc600ce8-92a5-4ade-bc7a-18d0237907d7", // 王清音
  "f9a2bc23-ed68-415a-9c3b-d32d9a6c6209", // 田靖宇
  "7bc9bc97-2ec5-44ba-9a73-e8fd59aff5d0", // 长安国学馆管理员
  "3c1fc148-e00c-4996-aeeb-7a2941d566b9", // 国学推广合伙人
  "3fe25c40-7b0e-4853-8a3b-8a5fda834b9a", // 用户5678
  "39c2bd42-ed51-418b-847d-864fb827b77c", // 国学管理员
  "57315c1a-2a03-4905-b112-e7800f72c4c2", // 财务管理员
  "373a2d2f-3c60-44f2-b1d1-6872f13d296f", // 客服管理员
  "b8e7df2e-538a-4196-b5e6-5e105667afbf", // 商品品控
];

// 礼物（价格越高越稀有）
const GIFTS = [
  { id: "694e7644-02e9-490a-9153-4bc6d1b8c81e", coin: 10 },   // 小爱心
  { id: "4cdfa01d-5f7f-49ca-a098-7ffe7f92cbaa", coin: 50 },   // 太极图
  { id: "f94b59d5-552c-458f-9f4f-9501a051f721", coin: 100 },  // 八卦阵
  { id: "a172ed66-32f5-4910-a430-43760a17e925", coin: 500 },  // 金龙献瑞
  { id: "683e3ad6-35b2-466b-9cbe-4add5ee7f7de", coin: 1000 }, // 紫微星耀
];

// 直播带货商品
const PRODUCTS = [
  { id: "7d5ee04e-c4fc-4850-8e51-3f5c693206f5", price: 128 }, // 易经六十四卦卡牌
  { id: "911defdc-ae57-4503-bf55-b12a927881dc", price: 299 }, // 道德经线装珍藏版
  { id: "c4171392-45b4-455a-a3f3-99e42f0b50e4", price: 168 }, // 手工檀香静心礼盒
];

// 贴合六爻主题的弹幕
const DANMU = [
  "老师讲得太透彻了！", "请问六爻怎么起卦？", "受教了 🙏", "这个卦象怎么解？",
  "终于听懂了动爻", "讲讲世应关系吧", "六冲卦是不是不太好", "老师能看看我的卦吗",
  "纳甲装卦好难啊", "原来如此，醍醐灌顶", "求老师讲讲梅花易数", "用神到底怎么取",
  "感谢老师无私分享", "笔记已经记满一页", "这场干货太多了", "蓍草起卦和铜钱有区别吗",
  "动爻变爻终于分清了", "易经真的博大精深", "求回放链接！", "已经三连支持老师",
  "世爻持世是什么意思", "六亲怎么排", "老师声音好有磁性", "卦中有伏神怎么看",
];

const minute = (i: number) => new Date(START.getTime() + i * 60000);

// 确定性在线曲线：开场爬升 → 中段峰值 → 缓降收尾
function onlineAt(i: number): number {
  const t = i / DURATION;
  const base = 240 + 980 * Math.sin(Math.PI * t); // 0 → 峰值 → 0 的钟形
  const wobble = 45 * Math.sin(i * 0.7) + 25 * Math.sin(i * 0.23); // 确定性小波动
  return Math.max(200, Math.round(base + wobble));
}

async function main() {
  console.log("▶ 清理本房旧关联（幂等）...");
  await prisma.liveMinuteData.deleteMany({ where: { roomId: ROOM_ID } });
  await prisma.giftRecord.deleteMany({ where: { liveRoomId: ROOM_ID } });
  await prisma.comment.deleteMany({ where: { targetType: "LIVESTREAM", targetId: ROOM_ID } });
  await prisma.like.deleteMany({ where: { targetType: "LIVESTREAM", targetId: ROOM_ID } });
  await prisma.liveProduct.deleteMany({ where: { liveId: ROOM_ID } });
  await prisma.order.deleteMany({ where: { type: "LIVESTREAM", targetId: ROOM_ID } });

  const END = minute(DURATION);

  // 每分钟统计容器
  const mins = Array.from({ length: DURATION }, (_, i) => ({
    online: onlineAt(i),
    gmw: 0, orderCount: 0, commentCount: 0, likeCount: 0, shareCount: 0, giftAmount: 0,
  }));

  // ── 订单：24 笔，分布在 25~100 分钟，商品轮流；驱动 GMV / 销量 ──
  const productOrders: any[] = [];
  const liveOrders: any[] = [];
  let totalGmvYuan = 0;
  for (let n = 0; n < 24; n++) {
    const at = 25 + Math.floor((n * 75) / 24); // 25..100
    const p = PRODUCTS[n % PRODUCTS.length];
    const buyer = AUDIENCE[(n * 5 + 1) % AUDIENCE.length];
    const paidAt = minute(at);
    totalGmvYuan += p.price;
    mins[at].gmw += p.price * 100; // 分
    mins[at].orderCount += 1;
    productOrders.push({
      id: randomUUID(), userId: buyer, type: "PRODUCT", targetId: p.id,
      amount: p.price, payAmount: p.price, status: "COMPLETED",
      payMethod: "WECHAT", paidAt, completedAt: paidAt, createdAt: paidAt, updatedAt: paidAt,
    });
    liveOrders.push({
      id: randomUUID(), userId: buyer, type: "LIVESTREAM", targetId: ROOM_ID,
      amount: p.price, payAmount: p.price, status: "PAID",
      payMethod: "WECHAT", paidAt, createdAt: paidAt, updatedAt: paidAt,
    });
  }

  // ── 打赏：48 笔，分布全程，高价礼物稀有 ──
  const giftRows: any[] = [];
  const giftPattern = [0, 0, 1, 0, 2, 0, 1, 0, 0, 3, 1, 0, 2, 0, 0, 4]; // 取礼物索引的确定性模式
  for (let n = 0; n < 48; n++) {
    const at = Math.floor((n * (DURATION - 6)) / 48) + 3;
    const g = GIFTS[giftPattern[n % giftPattern.length]];
    const qty = g.coin >= 500 ? 1 : 1 + (n % 3);
    const total = g.coin * qty;
    const sender = AUDIENCE[(n * 3) % AUDIENCE.length];
    mins[at].giftAmount += total;
    giftRows.push({
      id: randomUUID(), userId: sender, liveRoomId: ROOM_ID, toUserId: HOST_ID,
      giftId: g.id, quantity: qty, totalCoin: total, createdAt: minute(at),
    });
  }

  // ── 弹幕评论：150 条，分布全程；另派生每分钟弹幕/点赞/分享统计 ──
  const commentRows: any[] = [];
  for (let n = 0; n < 150; n++) {
    const at = Math.floor((n * (DURATION - 2)) / 150) + 1;
    const sender = AUDIENCE[(n * 7 + 2) % AUDIENCE.length];
    commentRows.push({
      id: randomUUID(), userId: sender, targetType: "LIVESTREAM", targetId: ROOM_ID,
      content: DANMU[n % DANMU.length], likeCount: (n * 13) % 18, status: "PUBLISHED",
      createdAt: minute(at),
    });
  }

  // ── 点赞：Like 为唯一关系表（每观众一条=点赞人数）。点赞「次数」由 minuteData 汇总驱动趋势 ──
  const likeRows = AUDIENCE.map((user, idx) => ({
    id: randomUUID(), userId: user, targetType: "LIVESTREAM", targetId: ROOM_ID,
    createdAt: minute(Math.floor((idx * DURATION) / AUDIENCE.length)),
  }));

  // 每分钟弹幕/点赞/分享量随在线人数派生
  for (let i = 0; i < DURATION; i++) {
    mins[i].commentCount = Math.round(mins[i].online / 22);
    mins[i].likeCount = Math.round(mins[i].online / 7);
    mins[i].shareCount = Math.round(mins[i].online / 180);
  }

  // ── 写入 ──
  console.log("▶ 写入分钟级趋势 / 打赏 / 弹幕 / 点赞 / 商品 / 订单 ...");
  await prisma.liveMinuteData.createMany({
    data: mins.map((m, i) => ({
      id: randomUUID(), roomId: ROOM_ID, minute: minute(i),
      onlineCount: m.online, gmw: m.gmw, orderCount: m.orderCount,
      commentCount: m.commentCount, likeCount: m.likeCount, shareCount: m.shareCount,
      giftAmount: m.giftAmount, createdAt: minute(i),
    })),
  });
  await prisma.giftRecord.createMany({ data: giftRows });
  await prisma.comment.createMany({ data: commentRows });
  await prisma.like.createMany({ data: likeRows, skipDuplicates: true });
  await prisma.liveProduct.createMany({
    data: PRODUCTS.map((p, i) => ({ id: randomUUID(), liveId: ROOM_ID, productId: p.id, sortOrder: i })),
  });
  await prisma.order.createMany({ data: productOrders });
  await prisma.order.createMany({ data: liveOrders });

  // ── 修正房间：合理时长 + 累计观看（峰值在线之上的合理人次）──
  const peak = Math.max(...mins.map((m) => m.online));
  await prisma.liveRoom.update({
    where: { id: ROOM_ID },
    data: { startTime: START, endTime: END, viewCount: 8640, status: "ENDED" },
  });

  // ── 我的排期：注入 2 场未来待开播直播，让主播端「排期」页有真实排期（幂等按标题清理）──
  const SCHEDULE_TITLES = ["《周易》系列·第四讲：六十四卦总览与应用", "国学经典诵读 · 线上专场"];
  await prisma.liveRoom.deleteMany({ where: { hostUserId: HOST_ID, status: "WAITING", title: { in: SCHEDULE_TITLES } } });
  const now = Date.now();
  const day = 86400000;
  await prisma.liveRoom.createMany({
    data: [
      { id: randomUUID(), userId: HOST_ID, hostUserId: HOST_ID, hostType: "STATION_MASTER", title: SCHEDULE_TITLES[0], cover: "/static/covers/video_yijing.jpg", status: "WAITING", chargeType: "FREE", viewCount: 0, startTime: new Date(now + 3 * day), createdAt: new Date(now) },
      { id: randomUUID(), userId: HOST_ID, hostUserId: HOST_ID, hostType: "STATION_MASTER", title: SCHEDULE_TITLES[1], cover: "/static/covers/video_daodejing.jpg", status: "WAITING", chargeType: "FREE", viewCount: 0, startTime: new Date(now + 8 * day), createdAt: new Date(now) },
    ],
  });

  // ── 直播评价 + 团队（新表，用原生 SQL 建表+注入，避免重启后端重新 generate client）──
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LiveReview" (
      "id" TEXT NOT NULL, "roomId" TEXT NOT NULL, "userId" TEXT NOT NULL,
      "rating" INTEGER NOT NULL, "content" TEXT NOT NULL, "reply" TEXT,
      "flagged" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LiveReview_pkey" PRIMARY KEY ("id")
    )`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LiveReview_roomId_idx" ON "LiveReview"("roomId")`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LiveTeamMember" (
      "id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "userId" TEXT NOT NULL,
      "role" TEXT NOT NULL, "expertise" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "liveCount" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LiveTeamMember_pkey" PRIMARY KEY ("id")
    )`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "LiveTeamMember_ownerId_userId_key" ON "LiveTeamMember"("ownerId","userId")`);

  // 评价数据（贴合六爻/国学主题，5 星为主，部分已回复）
  await prisma.$executeRawUnsafe(`DELETE FROM "LiveReview" WHERE "roomId" = $1`, ROOM_ID);
  const REVIEWS = [
    { u: 0, r: 5, c: "老师讲六爻起卦的部分太透彻了，受益匪浅！", reply: "感谢支持，祝学习精进！", d: 1 },
    { u: 1, r: 5, c: "案例丰富，世应关系终于搞懂了，五星好评", reply: null, d: 1 },
    { u: 2, r: 5, c: "讲解清晰，纳甲装卦不再难，强烈推荐", reply: "过奖了，常来交流。", d: 1 },
    { u: 3, r: 4, c: "内容很好，就是动爻部分讲得稍快，建议放慢一点", reply: "好的，后续会注意节奏。", d: 2 },
    { u: 4, r: 5, c: "这是我看过最好的易经直播，干货满满", reply: null, d: 2 },
    { u: 5, r: 5, c: "用神取法讲得明白，期待下一场", reply: null, d: 2 },
    { u: 6, r: 4, c: "整体不错，希望能多讲几个实战卦例", reply: "下场安排实战专题。", d: 2 },
    { u: 7, r: 5, c: "老师功底深厚，蓍草起卦演示很直观", reply: null, d: 3 },
    { u: 8, r: 3, c: "内容偏基础，期望更进阶的梅花易数", reply: "进阶系列正在筹备。", d: 3 },
    { u: 0, r: 5, c: "听完醍醐灌顶，六亲六神终于理清了", reply: null, d: 3 },
    { u: 1, r: 5, c: "讲得通俗易懂，零基础也能跟上", reply: null, d: 3 },
    { u: 2, r: 4, c: "很有收获，音质如果再好点就完美了", reply: "已记录，会改进设备。", d: 4 },
    { u: 3, r: 5, c: "六冲六合讲解到位，受教了", reply: null, d: 4 },
    { u: 4, r: 5, c: "案例贴近生活，易学又实用", reply: null, d: 4 },
    { u: 5, r: 2, c: "网络有点卡，影响了观看体验", reply: "抱歉，下次优化推流。", d: 4 },
    { u: 6, r: 5, c: "老师答疑很耐心，问题都解答了", reply: null, d: 5 },
    { u: 7, r: 5, c: "传统文化讲得有深度，值得反复回看", reply: null, d: 5 },
    { u: 8, r: 4, c: "干货多，节奏稍紧，整体满意", reply: null, d: 5 },
  ];
  for (const rv of REVIEWS) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "LiveReview" ("id","roomId","userId","rating","content","reply","flagged","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      randomUUID(), ROOM_ID, AUDIENCE[rv.u], rv.r, rv.c, rv.reply, false, new Date(now - rv.d * 86400000),
    );
  }

  // 团队成员（主播 + 副播 + 场控 + 嘉宾）
  await prisma.$executeRawUnsafe(`DELETE FROM "LiveTeamMember" WHERE "ownerId" = $1`, HOST_ID);
  const TEAM = [
    { uid: HOST_ID, role: "host", exp: ["易学术数", "六爻预测"], lc: 32 },
    { uid: AUDIENCE[0], role: "cohost", exp: ["诗词鉴赏", "互动答疑"], lc: 18 },
    { uid: AUDIENCE[1], role: "operator", exp: ["数据运营", "活动策划"], lc: 12 },
    { uid: AUDIENCE[2], role: "guest", exp: ["国学经典", "易经入门"], lc: 6 },
  ];
  for (const m of TEAM) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "LiveTeamMember" ("id","ownerId","userId","role","expertise","liveCount","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT ("ownerId","userId") DO NOTHING`,
      randomUUID(), HOST_ID, m.uid, m.role, m.exp, m.lc, new Date(now),
    );
  }

  const totalGift = giftRows.reduce((s, g) => s + g.totalCoin, 0);
  console.log("✅ 注入完成：");
  console.log(`   分钟数据 ${DURATION} 条，峰值在线 ${peak}`);
  console.log(`   打赏 ${giftRows.length} 笔 / ${totalGift} 金币，弹幕 ${commentRows.length} 条，点赞 ${likeRows.length}`);
  console.log(`   带货商品 ${PRODUCTS.length} 件，成交 ${productOrders.length} 单，GMV ¥${totalGmvYuan}`);
  console.log(`   房间时长修正为 ${DURATION} 分钟，累计观看 8640`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

/*
 清理本场演示数据（如需）：
 DELETE FROM "LiveMinuteData" WHERE "roomId"='c5bce9af-eeb3-4c0a-b679-4eca0e604cf6';
 DELETE FROM "GiftRecord"     WHERE "liveRoomId"='c5bce9af-eeb3-4c0a-b679-4eca0e604cf6';
 DELETE FROM "Comment"        WHERE "targetType"='LIVESTREAM' AND "targetId"='c5bce9af-eeb3-4c0a-b679-4eca0e604cf6';
 DELETE FROM "Like"           WHERE "targetType"='LIVESTREAM' AND "targetId"='c5bce9af-eeb3-4c0a-b679-4eca0e604cf6';
 DELETE FROM "LiveProduct"    WHERE "liveId"='c5bce9af-eeb3-4c0a-b679-4eca0e604cf6';
 DELETE FROM "Order"          WHERE "targetId"='c5bce9af-eeb3-4c0a-b679-4eca0e604cf6' OR ("type"='PRODUCT' AND "targetId" IN ('7d5ee04e-c4fc-4850-8e51-3f5c693206f5','911defdc-ae57-4503-bf55-b12a927881dc','c4171392-45b4-455a-a3f3-99e42f0b50e4'));
*/
