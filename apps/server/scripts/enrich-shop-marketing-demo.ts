/**
 * 商城·营销演示数据增强（幂等，可重复运行，可随时清理）
 * 让以下真实端点返回丰满数据，供前端真连：
 *  - 优惠券 /shop/coupons、/shop/coupons/my（刷新为 ACTIVE + 给测试用户发券）
 *  - 秒杀   /marketing/flash-sales/active（国学主题·进行中场次 + 秒杀商品）
 *  - 拼团   /marketing/group-buys/active（国学主题·进行中拼团 + 参与者）
 *  - 评价   /shop/products/:id/reviews、/shop/reviews（5 商品各注入真实评价）
 *  - 物流   /shop/orders/:id/logistics（测试用户已发货/已付款订单注入物流轨迹）
 * 运行：npx tsx scripts/enrich-shop-marketing-demo.ts
 *
 * 清理：所有演示数据均可识别——FlashSale/GroupBuy/ProductReview/OrderLogistics
 *       为本脚本独占注入；UserCoupon 仅测试用户演示券。重跑即覆盖。
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 测试账号（国学管理员 13800000000）
const TEST_USER_ID = "39c2bd42-ed51-418b-847d-864fb827b77c";

async function main() {
  const now = new Date();
  const products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });
  if (products.length === 0) {
    console.log("⚠️ 无商品，跳过");
    return;
  }
  const pByTitle = (kw: string) => products.find(p => p.title.includes(kw));

  // ───────── 1. 优惠券：刷新为 ACTIVE + 延长有效期 90 天 ─────────
  const validEnd = new Date(now.getTime() + 90 * 86400 * 1000);
  const validStart = new Date(now.getTime() - 86400 * 1000);
  const cpRes = await prisma.coupon.updateMany({
    data: { status: "ACTIVE", validStart, validEnd },
  });
  console.log(`✅ 优惠券刷新为进行中: ${cpRes.count} 张`);

  // 给测试用户发 2 张券（用于「我的优惠券」页演示），幂等
  const activeCoupons = await prisma.coupon.findMany({ where: { status: "ACTIVE" }, take: 2 });
  await prisma.userCoupon.deleteMany({ where: { userId: TEST_USER_ID } });
  for (const c of activeCoupons) {
    await prisma.userCoupon.create({ data: { userId: TEST_USER_ID, couponId: c.id, used: false } });
  }
  console.log(`✅ 测试用户领取演示券: ${activeCoupons.length} 张`);

  // ───────── 2. 秒杀：清旧建新（国学主题·进行中场次） ─────────
  await prisma.flashSale.deleteMany({}); // items 级联删除
  const flashItems = [
    { p: pByTitle("道德经"), discount: 0.7, stock: 50, limit: 1 },
    { p: pByTitle("易经"), discount: 0.75, stock: 80, limit: 2 },
    { p: pByTitle("檀香"), discount: 0.8, stock: 60, limit: 2 },
    { p: pByTitle("文化衫"), discount: 0.6, stock: 100, limit: 3 },
  ].filter(i => i.p);
  const flash = await prisma.flashSale.create({
    data: {
      name: "国学经典·限时秒杀",
      startTime: new Date(now.getTime() - 3600 * 1000),     // 1 小时前开始
      endTime: new Date(now.getTime() + 8 * 3600 * 1000),    // 8 小时后结束
      warmupMinutes: 30,
      status: "ACTIVE",
      scope: "GLOBAL",
      items: {
        create: flashItems.map((it, idx) => ({
          productId: it.p!.id,
          flashPrice: Number((Number(it.p!.price) * it.discount).toFixed(2)),
          limitCount: it.limit,
          stock: it.stock,
          sold: Math.floor(it.stock * (0.2 + idx * 0.12)), // 演示已售进度
          sortOrder: idx,
        })),
      },
    },
    include: { items: true },
  });
  console.log(`✅ 秒杀场次「${flash.name}」: ${flash.items.length} 件商品`);

  // ───────── 3. 拼团：清旧建新（国学主题·进行中 + 参与者） ─────────
  await prisma.groupBuy.deleteMany({}); // participants 级联删除
  const memberIds = [
    "2308a5a0-ea77-4d6a-b28a-c42b4e877fcf", // 李玄明
    "fc600ce8-92a5-4ade-bc7a-18d0237907d7", // 王清音
    "f9a2bc23-ed68-415a-9c3b-d32d9a6c6209", // 田靖宇
  ];
  const groupBuySpecs = [
    { p: pByTitle("道德经"), price: 0.65, minMembers: 3, joined: 2 },
    { p: pByTitle("播放器"), price: 0.7, minMembers: 2, joined: 1 },
  ].filter(s => s.p);
  let gbN = 0;
  for (const spec of groupBuySpecs) {
    const gb = await prisma.groupBuy.create({
      data: {
        productId: spec.p!.id,
        groupPrice: Number((Number(spec.p!.price) * spec.price).toFixed(2)),
        minMembers: spec.minMembers,
        expireMinutes: 1440,
        status: "ACTIVE",
        scope: "GLOBAL",
      },
    });
    // 注入参与者（团长 + 已参与），同一 groupId
    const groupId = gb.id;
    for (let i = 0; i < spec.joined; i++) {
      await prisma.groupBuyParticipant.create({
        data: {
          groupBuyId: gb.id,
          userId: memberIds[i % memberIds.length],
          groupId,
          isLeader: i === 0,
          status: "WAITING",
        },
      });
    }
    gbN++;
  }
  console.log(`✅ 拼团活动: ${gbN} 个（含参与者）`);

  // ───────── 4. 商品评价：5 商品各注入真实国学评价 ─────────
  const reviewers = [
    { id: "2308a5a0-ea77-4d6a-b28a-c42b4e877fcf" },
    { id: "fc600ce8-92a5-4ade-bc7a-18d0237907d7" },
    { id: "f9a2bc23-ed68-415a-9c3b-d32d9a6c6209" },
    { id: "3c1fc148-e00c-4996-aeeb-7a2941d566b9" },
  ];
  const reviewTemplates: Record<string, { rating: number; content: string; reply?: string }[]> = {
    道德经: [
      { rating: 5, content: "线装珍藏版纸张考究，墨香淡雅，竖排繁体读来格外有味道，值得收藏传家。", reply: "感谢您的喜爱，愿道德经常伴您左右，温故知新。" },
      { rating: 5, content: "装帧精美，注释详尽，五千言常读常新，送长辈也很有面子。" },
      { rating: 4, content: "内容一流，包装若再加一层防潮就更稳妥了。" },
    ],
    易经: [
      { rating: 5, content: "六十四卦卡牌做工精良，卦象爻辞一目了然，入门学《易》的好帮手。", reply: "学易贵在持恒，祝您渐入佳境。" },
      { rating: 4, content: "卡牌质感不错，附带的小册子讲解通俗，适合初学。" },
      { rating: 5, content: "随身携带随时翻阅，象数义理兼顾，超出预期。" },
    ],
    播放器: [
      { rating: 5, content: "音质清亮，内置经典诵读资源丰富，长辈也能轻松操作，晨读必备。" },
      { rating: 4, content: "续航给力，操作简单，希望后续固件能再加些蒙学内容。" },
    ],
    文化衫: [
      { rating: 5, content: "纯棉透气，论语印花雅致不张扬，码数标准，夏天穿很舒服。", reply: "愿您着此衫，行君子之风。" },
      { rating: 4, content: "面料舒适，版型正合身，洗后无明显掉色。" },
      { rating: 5, content: "经典系列设计低调有内涵，朋友都问在哪买的。" },
    ],
    檀香: [
      { rating: 5, content: "檀香气息醇厚不刺鼻，礼盒典雅，静心打坐读书皆宜，送礼自用两相宜。", reply: "焚一炉好香，静一颗本心，谢谢支持。" },
      { rating: 5, content: "手工品质看得见，燃烧均匀无杂味，包装上档次。" },
      { rating: 4, content: "香味很正，盒子精致，价格略高但物有所值。" },
    ],
  };
  // 幂等：先清这 5 商品的旧评价再重建
  const productIds = products.map(p => p.id);
  await prisma.productReview.deleteMany({ where: { productId: { in: productIds } } });
  let rvN = 0;
  for (const p of products) {
    const key = Object.keys(reviewTemplates).find(k => p.title.includes(k));
    if (!key) continue;
    const tpls = reviewTemplates[key];
    for (let i = 0; i < tpls.length; i++) {
      const t = tpls[i];
      const reviewer = reviewers[i % reviewers.length];
      await prisma.productReview.create({
        data: {
          productId: p.id,
          userId: reviewer.id,
          rating: t.rating,
          content: t.content,
          images: [],
          status: "PUBLISHED",
          reply: t.reply ?? null,
          repliedAt: t.reply ? new Date(now.getTime() - i * 3600 * 1000) : null,
          createdAt: new Date(now.getTime() - (i + 1) * 12 * 3600 * 1000),
        },
      });
      rvN++;
    }
  }
  console.log(`✅ 商品评价: ${rvN} 条`);

  // ───────── 5. 物流：测试用户 已发货/已付款 订单注入物流轨迹 ─────────
  const shippableOrders = await prisma.order.findMany({
    where: { userId: TEST_USER_ID, status: { in: ["SHIPPED", "PAID", "COMPLETED"] } },
    orderBy: { createdAt: "desc" },
    take: 4,
  });
  let lgN = 0;
  for (const ord of shippableOrders) {
    const shipped = ord.status === "SHIPPED" || ord.status === "COMPLETED";
    const trackingNo = `SF${1000000000000 + Math.floor(Number(ord.amount) * 7919) % 9000000000000}`;
    const t0 = new Date(now.getTime() - 3 * 86400 * 1000);
    const trackingData = shipped
      ? [
          { time: new Date(t0.getTime() + 0).toISOString(), status: "已揽收", desc: "【杭州】顺丰速运 已揽收您的国学好物" },
          { time: new Date(t0.getTime() + 6 * 3600 * 1000).toISOString(), status: "运输中", desc: "快件已到达【杭州集散中心】" },
          { time: new Date(t0.getTime() + 20 * 3600 * 1000).toISOString(), status: "运输中", desc: "快件已发往【北京】" },
          { time: new Date(t0.getTime() + 40 * 3600 * 1000).toISOString(), status: "派送中", desc: "【北京】派件员正在为您派送，请保持电话畅通" },
          ...(ord.status === "COMPLETED"
            ? [{ time: new Date(t0.getTime() + 44 * 3600 * 1000).toISOString(), status: "已签收", desc: "您的快件已签收，感谢使用，欢迎再次品鉴国学" }]
            : []),
        ]
      : [{ time: now.toISOString(), status: "待发货", desc: "商家正在为您备货，国学好物即将启程" }];
    await prisma.orderLogistics.upsert({
      where: { orderId: ord.id },
      create: {
        orderId: ord.id,
        company: shipped ? "顺丰速运" : null,
        logisticsNo: shipped ? trackingNo : null,
        contactName: "国学管理员",
        contactPhone: "138****0000",
        province: "北京市", city: "北京市", district: "海淀区",
        address: "中关村国学文化中心 8 号楼",
        status: ord.status === "COMPLETED" ? "SIGNED" : shipped ? "IN_TRANSIT" : "PENDING",
        trackingData,
      },
      update: {
        company: shipped ? "顺丰速运" : null,
        logisticsNo: shipped ? trackingNo : null,
        status: ord.status === "COMPLETED" ? "SIGNED" : shipped ? "IN_TRANSIT" : "PENDING",
        trackingData,
      },
    });
    lgN++;
  }
  console.log(`✅ 订单物流轨迹: ${lgN} 单`);

  // ───────── 6. 售后/退款：测试用户 已完成 订单注入售后申请（不同状态） ─────────
  // applyAfterSale 仅允许 PAID/SHIPPED/COMPLETED 订单；取 COMPLETED 且有真实商品的订单。
  const afterSaleOrders = await prisma.order.findMany({
    where: { userId: TEST_USER_ID, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  await prisma.afterSale.deleteMany({ where: { userId: TEST_USER_ID } }); // 幂等：清旧重建
  const afterSaleTpl = [
    { type: "refund_only", reason: "商品与描述不符，香味与介绍有出入，申请仅退款", status: "PENDING" },
    {
      type: "refund_with_return", reason: "礼盒外包装在运输中轻微压损，申请退货退款", status: "APPROVED",
      logistics: JSON.stringify({ returnAddress: "河北省保定市莲池区热卜国学退货中心" }),
    },
    { type: "refund_only", reason: "重复下单，多拍了一份，申请退款", status: "COMPLETED" },
  ];
  let asN = 0;
  for (let i = 0; i < afterSaleOrders.length && i < afterSaleTpl.length; i++) {
    const ord = afterSaleOrders[i];
    const tpl = afterSaleTpl[i];
    await prisma.afterSale.create({
      data: {
        orderId: ord.id,
        userId: TEST_USER_ID,
        type: tpl.type,
        reason: tpl.reason,
        amount: ord.payAmount ?? ord.amount,
        logistics: tpl.logistics,
        status: tpl.status,
        createdAt: new Date(now.getTime() - (i + 1) * 18 * 3600 * 1000),
      },
    });
    asN++;
  }
  console.log(`✅ 售后/退款申请: ${asN} 条`);

  // ───────── 7. 商品分类归属：把演示商品挂到叶子分类（分类页才有真实商品） ─────────
  // 原 5 件 ON_SALE 商品 categoryId 全为 null → 分类页商品恒空。按 title 关键词挂到合适叶子分类。
  const leafCats = await prisma.productCategory.findMany({ where: { level: 2, status: "ACTIVE" } });
  const leafByName = (n: string) => leafCats.find(c => c.name === n);
  const catAssign: { kw: string; leaf: string }[] = [
    { kw: "道德经", leaf: "国学经典" },
    { kw: "易经", leaf: "易学命理" },
    { kw: "播放器", leaf: "手账" },
    { kw: "文化衫", leaf: "帆布包" },
    { kw: "檀香", leaf: "线香" },
  ];
  let catN = 0;
  for (const a of catAssign) {
    const leaf = leafByName(a.leaf);
    if (!leaf) continue;
    const r = await prisma.product.updateMany({
      where: { title: { contains: a.kw }, status: "ON_SALE" },
      data: { categoryId: leaf.id },
    });
    catN += r.count;
  }
  console.log(`✅ 商品分类归属: ${catN} 件`);

  // ───────── 8. 演示收货地址（换货/结算页需地址；测试用户当前为空） ─────────
  const addrCount = await prisma.shippingAddress.count({ where: { userId: TEST_USER_ID } });
  if (addrCount === 0) {
    await prisma.shippingAddress.create({
      data: {
        userId: TEST_USER_ID, name: "国学管理员", phone: "13800000000",
        province: "北京市", city: "北京市", district: "海淀区",
        detail: "中关村国学文化中心 8 号楼 808", isDefault: true,
      },
    });
    console.log("✅ 演示收货地址: 1 条");
  } else {
    console.log(`✅ 演示收货地址: 已存在 ${addrCount} 条（跳过）`);
  }

  console.log("\n🎉 商城营销演示数据注入完成（幂等，可重复运行）");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
