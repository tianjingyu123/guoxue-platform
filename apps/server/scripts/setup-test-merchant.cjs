// 商家端演示数据注入（幂等）：开功能开关 + 系统配置 + 协议模版 + ACTIVE 测试商家 + 商品/订单/评价/违规/结算
// 定位：商家=平台电商供货端/供应链源头，商品池唯一正规入口。圈主/驿站/商城为分销渠道。
// 状态机：申请 PENDING_REVIEW →(审核)→ DEPOSIT_PENDING →(缴保证金)→ AGREEMENT_PENDING →(签协议)→ ACTIVE
const path = require('path')
const fs = require('fs')
for (const rel of ['../../.env', '../.env']) {
  try {
    const txt = fs.readFileSync(path.resolve(__dirname, rel), 'utf8')
    const m = txt.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m)
    if (m && !process.env.DATABASE_URL) process.env.DATABASE_URL = m[1]
  } catch {}
}
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

const MERCHANT_PHONE = '13912340099' // 测试商家账号；登录凭据由受控环境单独管理

async function userByPhone(phone) {
  const u = await p.user.findFirst({ where: { phone } })
  if (!u) throw new Error(`用户 ${phone} 不存在，请先注册`)
  return u
}

async function main() {
  // ── 1. 功能开关（onboarding/backend 不开则全链路 404；auto_approve/deposit_auto 让入驻可自助走通）──
  const flags = [
    { key: 'merchant_onboarding', name: '商家入驻', description: '商家入驻申请链路总开关' },
    { key: 'merchant_backend', name: '商家后台', description: '商家经营后台总开关' },
    { key: 'merchant_auto_approve', name: '商家自动审核', description: '开发/演示：提交申请即视为审核通过' },
    { key: 'merchant_deposit_auto', name: '保证金自动计算', description: '提交审核时按类目自动计算保证金' },
  ]
  for (const f of flags) {
    await p.featureFlag.upsert({
      where: { key: f.key },
      update: { enabled: true, percentage: 100 },
      create: { key: f.key, name: f.name, description: f.description, enabled: true, percentage: 100, targetUserIds: [] },
    })
  }

  // ── 2. 系统配置（保证金基数/类目加价/默认分佣）──
  const configs = [
    { configKey: 'merchant_deposit_base', configValue: '1000', description: '商家保证金基数（元）' },
    { configKey: 'merchant_deposit_per_category', configValue: '500', description: '每个经营类目附加保证金（元）' },
    { configKey: 'merchant_commission_rate', configValue: '0.85', description: '默认商家分成比例（0.85=85%归商家）' },
    { configKey: 'merchant_settlement_cycle', configValue: 'monthly', description: '结算周期' },
  ]
  for (const c of configs) {
    await p.configSystem.upsert({
      where: { configKey: c.configKey },
      update: { configValue: c.configValue, description: c.description },
      create: { ...c, updatedBy: 'system' },
    })
  }

  // ── 3. 协议模版（merchantId="TEMPLATE"，agreement-preview/sign 依赖）──
  // MerchantAgreement.merchantId 有外键约束，需先建一条 id="TEMPLATE" 的占位商家承载协议模版。
  let tplUser = await p.user.findFirst({ where: { phone: '10000000001' } })
  if (!tplUser) tplUser = await p.user.create({ data: { phone: '10000000001', nickname: '__协议模版占位__' } })
  await p.merchant.upsert({
    where: { id: 'TEMPLATE' },
    update: {},
    create: {
      id: 'TEMPLATE', userId: tplUser.id, shopName: '__协议模版__',
      contactName: '__', contactPhone: '10000000001', idCardNumber: '__TEMPLATE__', status: 'CLOSED',
    },
  })
  const tplExist = await p.merchantAgreement.findFirst({ where: { merchantId: 'TEMPLATE' } })
  if (!tplExist) {
    await p.merchantAgreement.create({
      data: {
        merchantId: 'TEMPLATE',
        version: 'v1.0',
        title: '热卜国学平台商家入驻协议',
        content: [
          '## 热卜国学平台商家入驻协议',
          '',
          '### 第一条 总则',
          '甲方（平台）与乙方（入驻商家）就乙方在平台开设店铺、销售商品等事宜达成如下协议。',
          '',
          '### 第二条 商品与履约',
          '1. 乙方所售商品须经平台审核进入商品池，对商品质量、描述真实性、售后承担全部责任。',
          '2. 乙方须按承诺时效发货，退款率、投诉率纳入平台履约监控。',
          '',
          '### 第三条 保证金与分佣',
          '1. 乙方按经营类目缴纳保证金，违规时平台可按规则扣罚。',
          '2. 平台按成交订单收取佣金，余额按结算周期结算至乙方。',
          '',
          '### 第四条 违规与处罚',
          '平台对违规行为可采取警告、扣保证金、商品下架、暂停经营、清退等逐级处罚。',
          '',
          '### 第五条 其他',
          '本协议自乙方在线签署之日起生效。',
        ].join('\n'),
      },
    })
  }

  // ── 4. ACTIVE 测试商家 ──
  const mUser = await userByPhone(MERCHANT_PHONE)
  const merchant = await p.merchant.upsert({
    where: { userId: mUser.id },
    update: {
      status: 'ACTIVE', depositPaid: true, agreementSigned: true,
      depositAmount: 2000, commissionRate: 0.85, rating: 4.9,
    },
    create: {
      userId: mUser.id,
      shopName: '墨香阁文化', shopIntro: '专注国学文化传播，提供命理、风水、书法等传统文化产品。',
      shopLogo: '', contactName: '掌柜', contactPhone: MERCHANT_PHONE,
      idCardNumber: '110101199001011234', // 注：真实链路会加密，注入演示数据直接明文便于 mask 展示
      categoryIds: ['guji', 'wenfang'],
      status: 'ACTIVE', depositAmount: 2000, depositPaid: true,
      agreementSigned: true, signedAt: new Date(), openedAt: new Date(),
      commissionRate: 0.85, rating: 4.9,
    },
  })

  // ── 5. 商品（userId=商家user，supplierType=CERTIFIED_MERCHANT，状态混合）──
  const productSeeds = [
    { title: '滴天髓精解', intro: '命理学经典著作精装版', price: 68, stock: 156, status: 'ON_SALE', categoryId: 'guji' },
    { title: '子平真诠评注', intro: '子平命理入门必读', price: 88, stock: 89, status: 'ON_SALE', categoryId: 'guji' },
    { title: '文房四宝套装', intro: '毛笔墨汁宣纸砚台礼盒', price: 268, stock: 0, status: 'ON_SALE', categoryId: 'wenfang' },
    { title: '紫砂茶壶礼盒', intro: '手工紫砂茶具', price: 588, stock: 23, status: 'OFF_SHELF', categoryId: 'wenfang' },
    { title: '八字命理基础课', intro: '零基础八字入门', price: 199, stock: 999, status: 'PENDING', categoryId: 'guji' },
  ]
  const products = []
  for (const s of productSeeds) {
    let prod = await p.product.findFirst({ where: { userId: mUser.id, title: s.title } })
    const data = {
      userId: mUser.id, title: s.title, intro: s.intro, detail: `<p>${s.intro}</p>`,
      images: [], price: s.price, stock: s.stock, categoryId: s.categoryId, tags: [],
      isPlatform: false, supplierType: 'CERTIFIED_MERCHANT', status: s.status,
    }
    if (prod) { prod = await p.product.update({ where: { id: prod.id }, data }) }
    else { prod = await p.product.create({ data }) }
    products.push(prod)
  }

  // ── 6. 买家（取一个非商家用户）+ 订单（merchantId=商家，状态混合，含今日订单）──
  const buyer = await p.user.findFirst({ where: { id: { not: mUser.id } }, orderBy: { createdAt: 'asc' } })
  if (!buyer) throw new Error('找不到买家用户')

  // 清理旧的演示订单（幂等：按 payTransactionId 前缀标识）
  await p.order.deleteMany({ where: { merchantId: merchant.id, payTransactionId: { startsWith: 'DEMO-MCH-' } } })
  const orderSeeds = [
    { product: products[0], qty: 2, status: 'PAID', payMethod: 'WECHAT' },     // 待发货
    { product: products[1], qty: 1, status: 'SHIPPED', payMethod: 'WECHAT' },  // 已发货
    { product: products[2], qty: 1, status: 'COMPLETED', payMethod: 'ALIPAY' },// 已完成
    { product: products[4], qty: 1, status: 'REFUNDED', payMethod: 'WECHAT' }, // 已退款
    { product: products[0], qty: 1, status: 'PAID', payMethod: 'WECHAT' },     // 今日新单
  ]
  let oi = 0
  const orders = []
  for (const s of orderSeeds) {
    const amount = Number(s.product.price) * s.qty
    const o = await p.order.create({
      data: {
        userId: buyer.id, type: 'PRODUCT', targetId: s.product.id, merchantId: merchant.id,
        amount, payAmount: amount, status: s.status, payMethod: s.payMethod,
        payTransactionId: `DEMO-MCH-${Date.now()}-${oi++}`,
        paidAt: s.status === 'PENDING' ? null : new Date(),
        shippingInfo: { name: '张三', phone: '13800000000', province: '北京市', city: '北京市', district: '朝阳区', detail: '建国路88号' },
      },
    })
    orders.push(o)
  }

  // ── 7. 评价（部分已回复）──
  await p.productReview.deleteMany({ where: { productId: { in: products.map((x) => x.id) }, userId: buyer.id } })
  const reviewSeeds = [
    { product: products[0], rating: 5, content: '书的质量很好，印刷清晰，内容详实，对学习命理很有帮助。发货也快，好评！', reply: '感谢您的支持与好评！' },
    { product: products[1], rating: 4, content: '整体不错，但有些地方注解不够详细，希望增加更多案例分析。', reply: null },
    { product: products[2], rating: 5, content: '非常满意！毛笔质量很好，宣纸手感细腻。送朋友的，他很喜欢。', reply: null },
  ]
  for (const s of reviewSeeds) {
    await p.productReview.create({
      data: {
        productId: s.product.id, userId: buyer.id, rating: s.rating, content: s.content,
        reply: s.reply, repliedAt: s.reply ? new Date() : null,
      },
    })
  }

  // ── 8. 违规记录 ──
  const vExist = await p.merchantViolation.findFirst({ where: { merchantId: merchant.id } })
  if (!vExist) {
    await p.merchantViolation.createMany({
      data: [
        { merchantId: merchant.id, type: 'MINOR', title: '商品信息违规', description: '商品标题含夸大宣传用语，请整改。', penalty: 0, status: 'PENDING' },
        { merchantId: merchant.id, type: 'MODERATE', title: '延迟发货', description: '超过承诺时效48小时未发货。', penalty: 50, status: 'CONFIRMED', handledBy: 'system', handledAt: new Date() },
      ],
    })
  }

  // ── 9. 结算单 ──
  const sExist = await p.merchantSettlement.findFirst({ where: { merchantId: merchant.id } })
  if (!sExist) {
    const totalRevenue = 1200
    const commission = Math.round(totalRevenue * 0.15)
    await p.merchantSettlement.create({
      data: {
        merchantId: merchant.id,
        periodStart: new Date(Date.now() - 30 * 86400000), periodEnd: new Date(),
        orderCount: 4, totalRevenue, commission, settlementAmount: totalRevenue - commission, status: 'PENDING',
      },
    })
  }

  const counts = {
    flags: await p.featureFlag.count({ where: { key: { startsWith: 'merchant_' }, enabled: true } }),
    products: await p.product.count({ where: { userId: mUser.id } }),
    orders: await p.order.count({ where: { merchantId: merchant.id } }),
    reviews: await p.productReview.count({ where: { productId: { in: products.map((x) => x.id) } } }),
    violations: await p.merchantViolation.count({ where: { merchantId: merchant.id } }),
    settlements: await p.merchantSettlement.count({ where: { merchantId: merchant.id } }),
  }
  console.log('商家注入完成:', JSON.stringify(counts))
  console.log('测试商家:', MERCHANT_PHONE, 'merchantId=', merchant.id.slice(0, 8), 'status=', merchant.status)
}
main().then(() => process.exit(0)).catch((e) => { console.error('ERR:', e.message); process.exit(1) })
