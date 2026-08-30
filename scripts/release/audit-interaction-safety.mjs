#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function hasAll(content, patterns) {
  return patterns.every((pattern) =>
    typeof pattern === "string" ? content.includes(pattern) : pattern.test(content),
  );
}

const contentLayer = read("apps/mobile/src/utils/content-detail-layer.ts");
const appRoot = read("apps/mobile/src/App.vue");
const appNavBar = read("apps/mobile/src/components/common/app-nav-bar.vue");
const audiobook = read("apps/mobile/src/pkg-classics/audiobooks/player.vue");
const reader = read("apps/mobile/src/pkg-classics/reader/index.vue");
const wannianli = read("apps/mobile/src/pkg-paipan/wannianli/index.vue");
const bottomNav = read("apps/mobile/src/components/bottom-nav/bottom-nav.vue");
const animations = read("apps/mobile/src/styles/animations.scss");
const voiceCall = read("apps/mobile/src/pkg-agent/agent/voice-call.vue");
const simpleChat = read("apps/mobile/src/components/agent/simple-chat.vue");
const smartCover = read("apps/mobile/src/components/common/smart-cover.vue");
const homeFeedCard = read("apps/mobile/src/components/home/feed-card.vue");
const commonVideoCard = read("apps/mobile/src/components/cards/video-card.vue");
const creatorCenter = read("apps/mobile/src/pkg-video/creator/index.vue");
const commentList = read("apps/mobile/src/components/comment/comment-list.vue");
const commentSection = read("apps/mobile/src/components/comment/comment-section.vue");
const classicDetail = read("apps/mobile/src/pkg-classics/detail/index.vue");
const platformSupportActions = read("apps/mobile/src/components/common/platform-support-actions.vue");
const homePage = read("apps/mobile/src/pages/index/index.vue");
const discoverPage = read("apps/mobile/src/pages/discover/index.vue");
const searchPage = read("apps/mobile/src/pkg-search/search/index.vue");
const productDetail = read("apps/mobile/src/pkg-mall/product/detail.vue");
const courseDetail = read("apps/mobile/src/pkg-course/detail/index.vue");
const courseHome = read("apps/mobile/src/pkg-course/home/index.vue");
const courseCatalog = read("apps/mobile/src/pkg-course/catalog/index.vue");
const learningCourseCard = read("apps/mobile/src/components/courses/learning-course-card.vue");
const overlayScrollLock = read("apps/mobile/src/composables/use-overlay-scroll-lock.ts");
const contentShareSheet = read("apps/mobile/src/components/common/content-share-sheet.vue");
const purchaseSheet = read("apps/mobile/src/components/common/purchase-sheet.vue");
const aiSearchModal = read("apps/mobile/src/components/common/ai-search-modal.vue");
const allFeaturesSheet = read("apps/mobile/src/components/home/all-features-sheet.vue");
const insufficientBalanceDialog = read("apps/mobile/src/components/wallet/insufficient-balance-dialog.vue");
const publishGuideSheet = read("apps/mobile/src/components/video/publish-guide-sheet.vue");
const giftPanel = read("apps/mobile/src/components/live/gift-panel.vue");
const datePickerModal = read("apps/mobile/src/components/bazi/date-picker-modal.vue");
const groupPickerModal = read("apps/mobile/src/components/bazi/group-picker-modal.vue");
const locationPickerModal = read("apps/mobile/src/components/bazi/location-picker-modal.vue");
const baziInputForm = read("apps/mobile/src/components/bazi/input-form.vue");
const nameCardPoster = read("apps/mobile/src/components/common/name-card-poster.vue");
const courseReviews = read("apps/mobile/src/pkg-course/reviews/index.vue");
const courseQa = read("apps/mobile/src/pkg-course/qa/index.vue");
const orderDetail = read("apps/mobile/src/pkg-order/detail/index.vue");
const videoDetail = read("apps/mobile/src/pkg-video/detail/index.vue");
const videoList = read("apps/mobile/src/pkg-video/list/index.vue");
const liveWatch = read("apps/mobile/src/pkg-live/watch/index.vue");
const livePreview = read("apps/mobile/src/pkg-live/preview/index.vue");
const merchantAgreement = read("apps/mobile/src/pkg-merchant/sign-agreement/index.vue");
const loginPage = read("apps/mobile/src/pkg-auth/login/index.vue");
const registerPage = read("apps/mobile/src/pkg-auth/register/index.vue");
const forgotPasswordPage = read("apps/mobile/src/pkg-auth/forgot-password/index.vue");
const welcomePage = read("apps/mobile/src/pkg-auth/welcome/index.vue");
const interestsGuidePage = read("apps/mobile/src/pkg-auth/interests-guide/index.vue");
const recoverPage = read("apps/mobile/src/pkg-auth/recover/index.vue");
const articleList = read("apps/mobile/src/pkg-circle/articles/index.vue");
const mallHome = read("apps/mobile/src/pkg-mall/home/index.vue");
const mallCategory = read("apps/mobile/src/pkg-mall/category/index.vue");
const classicsHome = read("apps/mobile/src/pkg-classics/home/index.vue");
const productCard = read("apps/mobile/src/components/cards/product-card.vue");
const liveCard = read("apps/mobile/src/components/cards/live-card.vue");
const marketingZone = read("apps/mobile/src/pkg-mall/components/marketing-zone.vue");
const livePlaza = read("apps/mobile/src/pkg-live/plaza/index.vue");
const circlePlaza = read("apps/mobile/src/pages/circles/index.vue");
const agentSquare = read("apps/mobile/src/pkg-agent/agents/index.vue");
const squareAgentCard = read("apps/mobile/src/pkg-agent/agents/components/square-agent-card.vue");
const profilePage = read("apps/mobile/src/pages/profile/index.vue");
const paipanHome = read("apps/mobile/src/pages/paipan/index.vue");
const merchantDashboard = read("apps/mobile/src/pkg-merchant/dashboard/index.vue");
const merchantInventory = read("apps/mobile/src/pkg-merchant/inventory/index.vue");
const highFrequencyTouchTargets = [
  ["apps/mobile/src/components/common/app-nav-bar.vue", ".nav-back"],
  ["apps/mobile/src/components/classics/classics-header.vue", ".ch-btn"],
  ["apps/mobile/src/pkg-classics/home/index.vue", ".ch-circle-btn"],
  ["apps/mobile/src/pkg-circle/articles/index.vue", ".nav-btn"],
  ["apps/mobile/src/pkg-course/home/index.vue", ".nav-btn"],
  ["apps/mobile/src/pkg-search/search/index.vue", ".back-btn"],
  ["apps/mobile/src/pkg-search/search/result.vue", ".back-btn"],
  ["apps/mobile/src/pkg-agent/bots/chat/index.vue", ".nav-btn"],
  ["apps/mobile/src/pkg-circle/my-circles/index.vue", ".nav-btn"],
  ["apps/mobile/src/pkg-circle/rankings/index.vue", ".nav-btn"],
  ["apps/mobile/src/pkg-circle/circles/topic-tag.vue", ".nav-btn"],
  ["apps/mobile/src/pkg-course/certificate/index.vue", ".nav-back"],
  ["apps/mobile/src/pkg-course/work-submit/index.vue", ".nav-back"],
  ["apps/mobile/src/pkg-course/reviews/index.vue", ".nav-back"],
  ["apps/mobile/src/pkg-course/catalog/index.vue", ".back"],
  ["apps/mobile/src/pkg-mall/product/detail.vue", ".nav-btn"],
  ["apps/mobile/src/pkg-live/manage/index.vue", ".nav-btn"],
  ["apps/mobile/src/pkg-live/create/index.vue", ".nav-btn"],
  ["apps/mobile/src/pkg-live/earnings/index.vue", ".nav-btn"],
  ["apps/mobile/src/pkg-circle/circles/level.vue", ".nav-btn"],
  ["apps/mobile/src/pkg-circle/circles/detail.vue", ".nav-back"],
  ["apps/mobile/src/pkg-circle/circles/detail.vue", ".nav-action"],
  ["apps/mobile/src/pkg-circle/circles/members.vue", ".nav-back"],
  ["apps/mobile/src/pkg-circle/circles/me.vue", ".nav-back"],
];

function hasMinimumTouchTarget(relativePath, selector) {
  const content = read(relativePath);
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = content.match(new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`, "s"))?.[1] || "";
  const width = block.match(/\bwidth\s*:\s*(\d+)(rpx|px)/);
  const height = block.match(/\bheight\s*:\s*(\d+)(rpx|px)/);
  if (!width || !height || width[2] !== height[2]) return false;
  const minimum = width[2] === "px" ? 44 : 88;
  return Number(width[1]) >= minimum && Number(height[1]) >= minimum;
}

const readerDialogCount = (reader.match(/role="dialog"/g) || []).length;
const readerPanelTouchStopCount = (reader.match(/@touchmove\.stop/g) || []).length;

const checks = [
  {
    name: "汇付扫码支付必须等待服务端确认，禁止收到二维码后直接宣告成功",
    file: "apps/mobile/src/components/common/purchase-sheet.vue",
    pass:
      hasAll(purchaseSheet, [
        "paymentPending",
        "drawQrToCanvas",
        "purchaseApi.queryHuifuPayment",
        "result.trans_stat === 'S'",
        "等待支付确认",
      ]) &&
      !purchaseSheet.includes("setTimeout(() => { emit('paid'"),
  },
  {
    name: "H5 内容详情支持左缘右滑收起并设置方向、距离和速度阈值",
    file: "apps/mobile/src/utils/content-detail-layer.ts",
    pass: hasAll(contentLayer, [
      "gx-content-detail-layer__edge",
      "onEdgePointerDown",
      "onEdgePointerMove",
      "onEdgePointerEnd",
      "deltaX > deltaY * 1.25",
      "shellRect.width * 0.18",
      "velocity > 0.55",
    ]),
  },
  {
    name: "H5 内容详情保留侧边收起、Esc、浏览器历史返回和父子页消息返回",
    file: "apps/mobile/src/utils/content-detail-layer.ts",
    pass: hasAll(contentLayer, [
      /left:\s*["']-13px["']/,
      /top:\s*["']50%["']/,
      /event\.key === ["']Escape["']/,
      "window.history.pushState",
      /window\.addEventListener\(["']popstate["']/,
      "CONTENT_LAYER_CLOSE_MESSAGE",
    ]),
  },
  {
    name: "H5 内容详情打开时锁定底层滚动并在关闭后完整恢复",
    file: "apps/mobile/src/utils/content-detail-layer.ts",
    pass: hasAll(contentLayer, [
      "const previousBodyOverflow = document.body.style.overflow",
      /document\.body\.style\.overflow = ["']hidden["']/,
      "document.body.style.overflow = previousBodyOverflow",
      /sourceNode\.style\.pointerEvents = ["']none["']/,
      "sourceNode.style.pointerEvents = previousSourcePointerEvents",
    ]),
  },
  {
    name: "听书目录抽屉阻断遮罩和面板事件，目录拥有独立滚动边界",
    file: "apps/mobile/src/pkg-classics/audiobooks/player.vue",
    pass: hasAll(audiobook, [
      'class="ap-mask" @tap="closeChapters" @touchmove.self.prevent',
      'class="ap-sheet"',
      'aria-label="听书目录"',
      "focusContainerSelector: '.ap-sheet'",
      "@touchmove.stop",
      '<scroll-view scroll-y class="ap-sheet-list">',
      ".ap-sheet-list { flex: 1; height: 0; min-height: 0;",
      "overscroll-behavior: contain;",
    ]),
  },
  {
    name: "古籍阅读全部抽屉阻断面板冒泡，目录和正文抽屉拥有独立滚动边界",
    file: "apps/mobile/src/pkg-classics/reader/index.vue",
    pass:
      readerDialogCount >= 5 &&
      readerPanelTouchStopCount >= 5 &&
      hasAll(reader, [
        "@touchmove.self.prevent",
        "focusContainerSelector: '.rd-sheet--toc'",
        "focusContainerSelector: '.rd-sheet--settings'",
        "focusContainerSelector: '.rd-sheet--dict'",
        "focusContainerSelector: '.rd-sheet--ai'",
        "focusContainerSelector: '.rd-sheet--note'",
        '<scroll-view v-if="tocTab === \'toc\'" scroll-y class="rd-toc-body"',
        ".rd-sheet-body { padding: 0 40rpx 40rpx; flex: 1; min-height: 0;",
        ".rd-toc-body { padding: 0 24rpx 40rpx; flex: 1; min-height: 0;",
        "overscroll-behavior: contain;",
      ]),
  },
  {
    name: "桌面 H5 滚动后弹层锁定底层、保留阅读位置并补偿 transform 裁剪",
    file: "apps/mobile/src/composables/use-overlay-scroll-lock.ts",
    pass: hasAll(overlayScrollLock, [
      "scrollX: window.scrollX",
      "scrollY: window.scrollY",
      "body.style.position = 'fixed'",
      "body.style.top = `${-snapshot.scrollY}px`",
      "window.scrollTo(scrollX, scrollY)",
      "compensateTransformedAppOffset",
      "compensatedAncestors",
      "ancestor.style.minHeight",
      "current.style.height = `${window.innerHeight}px`",
      "current.style.translate = `0 ${offset}px`",
    ]),
  },
  {
    name: "全平台底部导航固定在视口底部并适配设备安全区",
    file: "apps/mobile/src/components/bottom-nav/bottom-nav.vue",
    pass: hasAll(bottomNav, [
      ".bottom-nav {",
      "position: fixed;",
      "bottom: 0;",
      "padding-bottom: env(safe-area-inset-bottom);",
    ]),
  },
  {
    name: "H5 仅在桌面宽屏启用 480px 壳层，平板保留完整视口避免 rpx 二次挤压",
    file: "apps/mobile/src/App.vue",
    pass:
      hasAll(appRoot, [
        "@media screen and (min-width: 960px)",
        "max-width: 480px;",
      ]) && !appRoot.includes("@media screen and (min-width: 600px)"),
  },
  {
    name: "万年历择日导航固定在底部且正文为导航和安全区留位",
    file: "apps/mobile/src/pkg-paipan/wannianli/index.vue",
    pass: hasAll(wannianli, [
      ".nav {",
      "position: fixed;",
      "bottom: 0;",
      "padding-bottom: calc(100rpx + env(safe-area-inset-bottom));",
      "scroll-padding-bottom: calc(100rpx + env(safe-area-inset-bottom));",
    ]),
  },
  {
    name: "高频页面返回与导航操作拥有不小于 44pt 的触控热区",
    file: `apps/mobile/src/components/common/app-nav-bar.vue 等 ${highFrequencyTouchTargets.length} 个高频入口`,
    pass: highFrequencyTouchTargets.every(([file, selector]) =>
      hasMinimumTouchTarget(file, selector),
    ),
  },
  {
    name: "H5 核心导航、客服消息与课程排序支持键盘操作和清晰焦点",
    file: "apps/mobile/src/App.vue 等 4 个核心公共入口",
    pass:
      hasAll(appRoot, [
        ":focus-visible",
        "outline: 3px solid rgba(196, 30, 58, 0.72);",
      ]) &&
      hasAll(appNavBar, [
        'role="button"',
        'aria-label="返回上一页"',
        'tabindex="0"',
        '@keydown="onBackKeydown"',
        "event.key !== 'Enter' && event.key !== ' '",
      ]) &&
      hasAll(bottomNav, [
        'role="navigation"',
        'aria-label="主导航"',
        'role="link"',
        ':aria-current="isActive(tab.id) ? \'page\' : undefined"',
        '@keydown="onNavKeydown($event, tab.url, tab.id)"',
      ]) &&
      hasAll(platformSupportActions, [
        "function activateOnKeyboard",
        "@keydown=\"activateOnKeyboard($event, '/customer-service')\"",
        "@keydown=\"activateOnKeyboard($event, '/notifications')\"",
      ]) &&
      hasAll(courseHome, [
        'aria-label="选择课程排序"',
        'role="radio"',
        ':aria-checked="activeSort === option.id ? \'true\' : \'false\'"',
        "@keydown=\"selectSortByKeyboard($event, option.id)\"",
      ]),
  },
  {
    name: "登录页关键入口具备键盘操作、读屏名称、状态反馈和协议防误触",
    file: "apps/mobile/src/pkg-auth/login/index.vue",
    pass: hasAll(loginPage, [
      'aria-label="返回上一页"',
      'role="tablist"',
      ':aria-selected="loginType === \'phone\' ? \'true\' : \'false\'"',
      "onLoginTypeKeydown",
      'aria-label="手机号"',
      'aria-label="短信验证码"',
      ':aria-disabled="countdown > 0 || !isPhoneValid || isSendingCode ? \'true\' : \'false\'"',
      ':aria-label="showPassword ? \'隐藏密码\' : \'显示密码\'"',
      'role="alert" aria-live="polite"',
      'role="checkbox"',
      ':aria-checked="agreedTerms ? \'true\' : \'false\'"',
      ':aria-busy="isLoading ? \'true\' : \'false\'"',
      "activateOnKeyboard",
    ]),
  },
  {
    name: "注册与找回密码全流程具备键盘操作、读屏名称、防重复提交和密码状态反馈",
    file: "apps/mobile/src/pkg-auth/register/index.vue 等 2 个认证入口",
    pass:
      hasAll(registerPage, [
        'aria-label="返回上一步"',
        'aria-label="注册手机号"',
        'aria-label="注册短信验证码"',
        ':aria-busy="isSendingCode ? \'true\' : \'false\'"',
        ':aria-label="showPassword ? \'隐藏密码\' : \'显示密码\'"',
        'role="checkbox"',
        ':aria-checked="agreed ? \'true\' : \'false\'"',
        ':aria-busy="isLoading ? \'true\' : \'false\'"',
        "activateOnKeyboard",
      ]) &&
      hasAll(forgotPasswordPage, [
        'aria-label="找回密码手机号"',
        'aria-label="短信验证码"',
        "const isSendingCode = ref(false)",
        ':aria-busy="isSendingCode ? \'true\' : \'false\'"',
        'role="meter"',
        ':aria-valuenow="passwordStrength.level"',
        ':aria-label="showConfirmPassword ? \'隐藏确认密码\' : \'显示确认密码\'"',
        'role="alert" aria-live="polite"',
        ':aria-busy="isLoading ? \'true\' : \'false\'"',
        "activateOnKeyboard",
      ]),
  },
  {
    name: "新用户欢迎、兴趣选择与账号找回入口支持键盘、读屏状态和减少动态设置",
    file: "apps/mobile/src/pkg-auth/welcome/index.vue 等 3 个新用户入口",
    pass:
      hasAll(welcomePage, [
        'role="button"',
        ':aria-label="`开始探索，${countdown}秒后自动进入`"',
        "@media (prefers-reduced-motion: reduce)",
        "activateOnKeyboard",
      ]) &&
      hasAll(interestsGuidePage, [
        'aria-label="跳过兴趣选择"',
        'role="group"',
        'role="checkbox"',
        ':aria-checked="isSelected(theme.key) ? \'true\' : \'false\'"',
        ':aria-disabled="selected.length === 0 ? \'true\' : \'false\'"',
        'aria-live="polite"',
        "@media (prefers-reduced-motion: reduce)",
      ]) &&
      hasAll(recoverPage, [
        'aria-label="返回上一页"',
        'aria-label="手机号找回，当前由客服协助处理"',
        'aria-label="邮箱找回，当前由客服协助处理"',
        'aria-label="联系人工客服找回账号"',
        ".back-btn {",
        "width: 88rpx;",
        "height: 88rpx;",
        "activateOnKeyboard",
      ]),
  },
  {
    name: "全局循环动效、语音通话和流式对话尊重系统减少动态设置",
    file: "apps/mobile/src/styles/animations.scss",
    pass:
      hasAll(animations, [
        "@media (prefers-reduced-motion: reduce)",
        ".live-indicator,",
        ".agent-gradient-warm,",
        ".animate-soundwave,",
        "animation: none !important;",
      ]) &&
      hasAll(voiceCall, [
        "@media (prefers-reduced-motion: reduce)",
        ".orb-wrap.active .ring-one,",
        ".orb-wrap.active .sound-bar",
      ]) &&
      hasAll(simpleChat, [
        "@media (prefers-reduced-motion: reduce)",
        ".stream-cursor,",
        ".typing-dot",
      ]) &&
      hasAll(audiobook, [
        "@media (prefers-reduced-motion: reduce)",
        ".ap-wave--on .ap-wave-bar",
      ]),
  },
  {
    name: "短视频无首图时先显示国学视觉兜底，首帧解码成功后再平滑切换",
    file: "apps/mobile/src/components/common/smart-cover.vue",
    pass: hasAll(smartCover, [
      "const videoFrameReady = ref(false)",
      'class="sc-full sc-gen sc-video-fallback"',
      '@loadeddata="onVideoFrameReady"',
      '@canplay="onVideoFrameReady"',
      ".sc-video-el--ready",
      "@media (prefers-reduced-motion: reduce)",
    ]),
  },
  {
    name: "短视频广场搜索、筛选、空错态和全部内容卡支持键盘与读屏操作",
    file: "apps/mobile/src/pkg-video/list/index.vue",
    pass: hasAll(videoList, [
      'aria-label="搜索短视频"',
      'role="tablist"',
      ':aria-selected="activeTab === tab.id ? \'true\' : \'false\'"',
      "onTabKeydown",
      'role="alert" aria-live="polite"',
      'role="status" aria-live="polite"',
      'role="link"',
      ':aria-label="`播放短视频：${video.title}`"',
      "openVideoOnKeyboard",
      "@media (prefers-reduced-motion: reduce)",
    ]),
  },
  {
    name: "文章专区搜索、分类、排序、空错态和全部文章卡支持键盘与读屏操作",
    file: "apps/mobile/src/pkg-circle/articles/index.vue",
    pass: hasAll(articleList, [
      'aria-label="返回上一页"',
      'aria-label="打开文章 AI 搜索"',
      'aria-label="搜索文章标题或内容"',
      'role="tablist"',
      ':aria-selected="activeTag === tag.name ? \'true\' : \'false\'"',
      "onCategoryKeydown",
      'aria-haspopup="true"',
      'role="radiogroup"',
      ':aria-checked="sortBy === \'popular\' ? \'true\' : \'false\'"',
      'role="alert" aria-live="polite"',
      ':aria-label="`阅读文章：${article.title}`"',
      "openArticleOnKeyboard",
      ':aria-busy="loadingMore ? \'true\' : \'false\'"',
    ]),
  },
  {
    name: "课程首页分类、状态、排序和全部课程卡支持键盘与读屏操作",
    file: "apps/mobile/src/pkg-course/home/index.vue 等 2 个课程入口",
    pass:
      hasAll(courseHome, [
        'role="alert" aria-live="assertive"',
        'aria-label="重新加载课程"',
        'role="status" aria-live="polite" aria-label="课程加载中"',
        ':aria-label="`浏览课程：${entry.name}`"',
        'aria-label="查看全部新上架课程"',
        ':aria-expanded="showSortSheet ? \'true\' : \'false\'"',
        'role="radiogroup" aria-label="课程排序方式"',
      ]) &&
      hasAll(learningCourseCard, [
        'role="link"',
        ':aria-label="accessibilityLabel"',
        'tabindex="0"',
        '@keydown="openOnKeyboard"',
      ]),
  },
  {
    name: "课程分类页返回、搜索、纵向分类、排序和状态反馈支持键盘与读屏操作",
    file: "apps/mobile/src/pkg-course/catalog/index.vue",
    pass: hasAll(courseCatalog, [
      'aria-label="返回上一页"',
      'aria-label="搜索课程名称或内容"',
      'aria-label="清空课程搜索"',
      'role="tablist"',
      'aria-orientation="vertical"',
      ':aria-selected="activeCategory === category.id ? \'true\' : \'false\'"',
      "onCategoryKeydown",
      'aria-haspopup="true"',
      ':aria-expanded="showSort ? \'true\' : \'false\'"',
      'role="radiogroup" aria-label="课程排序方式"',
      'role="alert" aria-live="assertive"',
      'role="status" aria-live="polite"',
    ]),
  },
  {
    name: "商城首页、促销会场、商品卡与直播卡支持键盘、读屏和明确状态反馈",
    file: "apps/mobile/src/pkg-mall/home/index.vue 等 4 个商城入口",
    pass:
      hasAll(mallHome, [
        ':aria-label="cartCount > 0 ? `购物车，共 ${cartCount} 件商品` : \'购物车\'"',
        'role="status" aria-live="polite" aria-label="商城加载中"',
        'role="alert" aria-live="assertive"',
        'aria-label="重新加载商城"',
        ':aria-label="entry.label"',
        'aria-label="进入国学好物季专题会场"',
        'aria-label="查看全部商品分类"',
        ':aria-label="`浏览商品分类：${cat.name}`"',
      ]) &&
      hasAll(marketingZone, [
        ':aria-label="seckillLabel"',
        ':aria-label="groupLabel"',
        '@keydown="activateOnKeyboard($event, () => navigateTo(\'/shop/flash-sale\'))"',
        '@keydown="activateOnKeyboard($event, () => navigateTo(\'/shop/group-buy\'))"',
      ]) &&
      hasAll(productCard, [
        'role="link"',
        ':aria-label="accessibilityLabel"',
        'tabindex="0"',
        '@keydown="openOnKeyboard"',
      ]) &&
      hasAll(liveCard, [
        ':aria-label="accessibilityLabel"',
        ':aria-label="booked ? `取消预约：${data.title}` : `预约直播：${data.title}`"',
        ':aria-pressed="booked ? \'true\' : \'false\'"',
        '@keydown.stop="activateOnKeyboard($event, toggleBook)"',
      ]),
  },
  {
    name: "商城分类页支持纵向分类键盘导航、排序单选、筛选弹层与完整状态反馈",
    file: "apps/mobile/src/pkg-mall/category/index.vue",
    pass: hasAll(mallCategory, [
      'aria-label="返回上一页"',
      'aria-label="搜索商品名称或内容"',
      'role="tablist"',
      'aria-orientation="vertical"',
      ':aria-selected="activeCategory === cat.id ? \'true\' : \'false\'"',
      "onCategoryKeydown",
      'aria-label="选择商品排序"',
      'role="radiogroup" aria-label="商品排序方式"',
      'role="dialog"',
      'aria-modal="true"',
      'aria-label="商品筛选"',
      'role="radiogroup" aria-label="快捷价格区间"',
      'role="alert" aria-live="assertive"',
      'role="status" aria-live="polite"',
    ]),
  },
  {
    name: "古籍馆高频入口、榜单分类、听书与状态反馈支持键盘和读屏操作",
    file: "apps/mobile/src/pkg-classics/home/index.vue",
    pass: hasAll(classicsHome, [
      'aria-label="返回上一页"',
      'aria-label="打开我的书架"',
      'role="status"',
      'aria-live="polite"',
      'role="alert"',
      'aria-live="assertive"',
      'aria-label="搜索古籍"',
      ':aria-label="`阅读今日导读：${todayFeature.title}`"',
      ':aria-label="`继续阅读${lastReading.title}，当前进度${lastReading.progress}%`"',
      ':aria-label="`浏览${cat.name}分类，${cat.count}`"',
      'role="tablist" aria-label="古籍榜单分类"',
      ':aria-selected="activeType === t.id"',
      "onTypeKeydown",
      ':aria-label="`播放有声书：${book.title}，朗读者${book.narrator}`"',
      'aria-label="打开AI国学助手，白话解读古籍疑难"',
    ]),
  },
  {
    name: "直播广场分类、直播、预约、回放和状态反馈支持键盘与读屏操作",
    file: "apps/mobile/src/pkg-live/plaza/index.vue",
    pass: hasAll(livePlaza, [
      'aria-label="返回上一页"',
      'aria-label="搜索直播"',
      'role="tablist" aria-label="直播分类"',
      ':aria-selected="activeTab === tab"',
      "onTabKeydown",
      'aria-label="直播广场内容"',
      'aria-label="直播广场加载中"',
      'role="alert" aria-live="assertive"',
      'aria-label="重新加载直播广场"',
      ':aria-label="liveAccessibilityLabel(live)"',
      ':aria-label="upcomingAccessibilityLabel(featuredUpcoming)"',
      ':aria-label="bookingAccessibilityLabel(featuredUpcoming)"',
      ':aria-pressed="bookedMap[featuredUpcoming.id]"',
      ':aria-label="replayAccessibilityLabel(rp)"',
      "预约 · {{ featuredUpcoming.scheduledTime || '时间待定' }}",
    ]),
  },
  {
    name: "圈子广场快捷入口、分类、圈子分流、换一批和圈内动态支持键盘与读屏操作",
    file: "apps/mobile/src/pages/circles/index.vue",
    pass: hasAll(circlePlaza, [
      'aria-label="圈子广场快捷操作"',
      'aria-label="搜索圈子"',
      'aria-label="创建圈子"',
      'aria-label="打开我的圈子"',
      'aria-label="查看全部我的圈子"',
      'role="tablist" aria-label="发现圈子分类"',
      ':aria-selected="category === cat.id"',
      "onCategoryKeydown",
      ':aria-label="`进入圈子：${c.name}',
      ':aria-label="`${c.name}，${c.description}',
      'aria-label="换一批发现圈子"',
      'role="alert" aria-live="assertive"',
      'aria-label="来自已加入圈子的最新动态"',
      ':aria-label="`${post.circleName}，${post.author.name}发布',
    ]),
  },
  {
    name: "智能体广场搜索、语音、榜单、最近对话和全部智能体卡支持键盘与读屏操作",
    file: "apps/mobile/src/pkg-agent/agents/index.vue 等 2 个智能体广场入口",
    pass:
      hasAll(agentSquare, [
        'role="status" aria-live="polite"',
        'role="alert" aria-live="assertive"',
        'aria-label="重新加载智能体广场"',
        'aria-label="返回上一页"',
        'aria-label="打开智能体对话记录"',
        'role="search" aria-label="搜索智能体"',
        'aria-label="输入智能体名称或问题"',
        ':aria-label="isListening ? \'停止语音搜索\' : \'开始语音搜索\'"',
        ':aria-pressed="isListening"',
        'aria-label="打开智玄国学学习向导，规划内容、学伴和学习路线"',
        ':aria-label="`继续与${c.agentName}对话',
        'aria-label="查看完整智能体热度榜"',
        ':aria-label="`热度第${i + 1}名',
        ':aria-label="`向${q.botName}提问',
        'aria-label="联系智能客服，处理账号、购买、功能与反馈问题"',
      ]) &&
      hasAll(squareAgentCard, [
        'role="link"',
        'tabindex="0"',
        ':aria-label="`${bot.name}，${bot.description',
        "selectByKeyboard",
      ]),
  },
  {
    name: "个人中心消息、资料、资产、订单、内容、身份和服务入口支持键盘与读屏操作",
    file: "apps/mobile/src/pages/profile/index.vue",
    pass: hasAll(profilePage, [
      'role="status" aria-live="polite"',
      'role="alert" aria-live="assertive"',
      'aria-label="重新加载个人中心"',
      ':aria-label="unreadNotify > 0 ? `消息通知',
      'aria-label="打开设置"',
      ':aria-label="isGuest ? \'登录或注册\' : \'编辑个人资料\'"',
      ':aria-label="`查看称号与成就',
      ':aria-label="`我的关注',
      'aria-label="查看书院会员权益与续费"',
      ':aria-label="`继续学习${userData.continueLearning.title}',
      ':aria-label="`${c.label}，${c.value}`"',
      'aria-label="查看全部订单"',
      ':aria-label="`${item.label}订单',
      ':aria-label="row.joined ? `进入${row.name}工作台',
      ':aria-expanded="rolesExpanded"',
      'aria-label="联系智能客服"',
      'aria-label="查看我的举报记录"',
      "activateOnKeyboard",
      "toggleRoles",
    ]),
  },
  {
    name: "排盘工具首页的案例、工具、研发预告和智能体入口支持键盘与读屏操作",
    file: "apps/mobile/src/pages/paipan/index.vue",
    pass: hasAll(paipanHome, [
      'aria-label="查看排盘历史记录"',
      'role="main" aria-label="排盘工具与国学服务"',
      'aria-label="进入统一排盘案例库，跨术式研习真实案例"',
      'aria-label="投稿真实排盘案例"',
      ':aria-pressed="editing"',
      ':aria-label="toolAriaLabel(tool)"',
      ':aria-expanded="showAllTools"',
      ':aria-label="`${tool.name}，开发中，查看开放状态`"',
      'role="status" aria-live="polite"',
      ':aria-label="agentAriaLabel(agent)"',
      "activateOnKeyboard",
      "toolAriaLabel",
      "agentAriaLabel",
    ]),
  },
  {
    name: "商家经营后台的指标、趋势、待办、快捷入口与信用明细支持键盘和读屏操作",
    file: "apps/mobile/src/pkg-merchant/dashboard/index.vue",
    pass: hasAll(merchantDashboard, [
      'role="main" aria-label="商家经营后台"',
      'role="tablist" aria-label="经营数据周期"',
      ':aria-selected="tab === \'today\'"',
      "onMetricTabKeydown",
      ':aria-label="`今日成交额${money(dashboard.todaySales)}元',
      ':aria-label="`${b.date}，${b.value}单，查看当日订单`"',
      ':aria-label="`${pendingShip}笔待发货订单，进入处理`"',
      ':aria-label="`打开${q.label}`"',
      'role="dialog" aria-modal="true" aria-label="信用变动明细"',
      "focusContainerSelector: '.credit-pop'",
      "initialFocusSelector: '.pop-close'",
      "activateOnKeyboard",
    ]),
  },
  {
    name: "商家进销存的库存、采购、验收与底账弹层支持键盘、读屏和焦点闭环",
    file: "apps/mobile/src/pkg-merchant/inventory/index.vue",
    pass: hasAll(merchantInventory, [
      'role="tablist" aria-label="库存与履约数据视图"',
      'role="tablist" aria-label="采购单状态筛选"',
      'role="dialog" aria-modal="true" aria-label="新建采购单"',
      'role="dialog" aria-modal="true" aria-label="登记采购到货验收"',
      'role="dialog" aria-modal="true" aria-label="到货质检记录"',
      'role="dialog" aria-modal="true" aria-label="库存档案"',
      "focusContainerSelector: '.sheet[role=\"dialog\"]'",
      "initialFocusSelector: '.sheet-close'",
      "activateOnKeyboard",
      "onWorkspaceTabKeydown",
      "onPurchaseFilterKeydown",
      "stockItemAriaLabel",
      "closeActiveOverlay",
      "import { computed, nextTick, ref } from 'vue'",
      "await nextTick()",
      "waitForOverlayExit",
      "requestAnimationFrame",
    ]),
  },
  {
    name: "首页、通用视频卡片和创作者中心均传递真实视频地址供首帧兜底",
    file: "apps/mobile/src/components/home/feed-card.vue 等 3 个视频入口",
    pass:
      hasAll(homeFeedCard, [':video-url="cardType === \'video\' ? item.videoUrl : \'\'"']) &&
      hasAll(commonVideoCard, [':video-url="data.videoUrl"']) &&
      hasAll(creatorCenter, [
        ':video-url="v.videoUrl"',
        ':video-url="video.videoUrl"',
      ]),
  },
  {
    name: "古籍空评论区的图标、文案和整块空态均可唤起延迟评论输入框",
    file: "apps/mobile/src/components/comment/comment-list.vue 等 3 个评论入口",
    pass:
      hasAll(commentList, [
        "(e: 'empty-tap'): void",
        'class="cl__empty"',
        "@tap=\"emit('empty-tap')\"",
        "还没有评论，来抢沙发～",
      ]) &&
      hasAll(commentSection, [
        "@empty-tap=\"showInput\"",
        "inputVisible.value = true",
        "inputRef.value?.focus()",
      ]) &&
      hasAll(classicDetail, [
        "deferred-input",
        ':open-signal="commentInputSignal"',
        "@click=\"openCommentInput\"",
      ]),
  },
  {
    name: "首页、发现页和搜索页统一提供客服与真实未读消息入口",
    file: "apps/mobile/src/components/common/platform-support-actions.vue 等 4 个公共入口",
    pass:
      hasAll(platformSupportActions, [
        "mineApi.getUnreadNotifyCount()",
        "navigateTo('/customer-service')",
        "navigateTo('/notifications')",
        'aria-label="联系智能客服"',
        'aria-label="查看消息通知"',
      ]) &&
      hasAll(homePage, ["<platform-support-actions />"]) &&
      hasAll(discoverPage, ["<platform-support-actions />"]) &&
      hasAll(searchPage, ['<platform-support-actions compact tone="plain" />']),
  },
  {
    name: "订单、商品、课程、短视频和直播等高争议场景均直达真实投诉或举报表单",
    file: "apps/mobile/src/pkg-order/detail/index.vue 等 5 个业务详情页",
    pass:
      hasAll(orderDetail, [
        "@tap=\"complainOrder\"",
        "gotoComplaint('订单支付、履约或售后服务'",
      ]) &&
      hasAll(productDetail, [
        "@tap=\"complainProduct\"",
        "gotoComplaint('商品与商家服务'",
      ]) &&
      hasAll(courseDetail, [
        "@tap=\"complainCourse\"",
        "gotoComplaint('课程内容与教学服务'",
      ]) &&
      hasAll(videoDetail, [
        "@tap.stop=\"onReport\"",
        "gotoReport('VIDEO'",
      ]) &&
      hasAll(liveWatch, [
        "@tap=\"onReport\"",
        "gotoReport('LIVE'",
      ]),
  },
  {
    name: "课程详情、评价与问答的吸底栏、正文留位和半屏弹层统一适配设备安全区",
    file: "apps/mobile/src/pkg-course/detail/index.vue 等 3 个课程页面",
    pass:
      hasAll(courseDetail, [
        "padding-bottom: calc(200rpx + env(safe-area-inset-bottom));",
        "padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));",
        "padding: 20rpx 32rpx calc(64rpx + env(safe-area-inset-bottom));",
      ]) &&
      hasAll(courseReviews, [
        "padding: 12rpx 40rpx calc(180rpx + env(safe-area-inset-bottom));",
        "padding: 20rpx 40rpx calc(20rpx + env(safe-area-inset-bottom));",
      ]) &&
      hasAll(courseQa, [
        "padding: 24rpx 40rpx calc(200rpx + env(safe-area-inset-bottom));",
        "padding: 24rpx 40rpx calc(24rpx + env(safe-area-inset-bottom));",
        "padding: 40rpx 40rpx calc(28rpx + env(safe-area-inset-bottom));",
      ]),
  },
  {
    name: "直播预约与商家签约的关键吸底操作在异形屏上不被系统手势区遮挡",
    file: "apps/mobile/src/pkg-live/preview/index.vue 等 2 个关键转化页面",
    pass:
      hasAll(livePreview, [
        "padding-bottom: calc(192rpx + env(safe-area-inset-bottom));",
        "padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));",
      ]) &&
      hasAll(merchantAgreement, [
        "safeBottom.value = res.safeAreaInsets?.bottom || 0",
        ":style=\"{ paddingBottom: 18 + safeBottom + 'px' }\"",
      ]),
  },
  {
    name: "高频弹层具备焦点进入、Tab 圈定、Esc 关闭和关闭后焦点归位",
    file: "apps/mobile/src/composables/use-overlay-scroll-lock.ts 等 13 个高频入口",
    pass:
      hasAll(overlayScrollLock, [
        "const overlayStack: OverlayEntry[] = []",
        "event.key === 'Escape'",
        "event.key !== 'Tab'",
        "focusContainerSelector",
        "initialFocusSelector",
        "restoreTarget",
        "entry.restoreTarget?.isConnected",
      ]) &&
      hasAll(courseHome, [
        "focusContainerSelector: '.course-sort-sheet'",
        "initialFocusSelector: '.course-sort-sheet [aria-checked=\"true\"]'",
        'class="sheet course-sort-sheet"',
      ]) &&
      hasAll(contentShareSheet, [
        "focusContainerSelector: '.css-sheet'",
        "initialFocusSelector: '.css-close'",
        'aria-label="关闭分享面板"',
        "@keydown=\"activateOnKeyboard($event, shareFriend)\"",
      ]) &&
      hasAll(purchaseSheet, [
        "focusContainerSelector: '.ps-sheet'",
        "initialFocusSelector: '.ps-head__close'",
        'aria-label="关闭购买面板"',
        'role="radio"',
      ]) &&
      hasAll(aiSearchModal, [
        "focusContainerSelector: '.ai-modal-card'",
        "initialFocusSelector: '.ai-modal-card .ai-input'",
        'aria-label="关闭 AI 智能搜索"',
        "@keydown=\"activateOnKeyboard($event, handleSearch)\"",
      ]) &&
      hasAll(allFeaturesSheet, [
        "focusContainerSelector: '.af-sheet'",
        "initialFocusSelector: '.af-close'",
        'aria-label="关闭全部功能"',
        'role="link"',
      ]) &&
      hasAll(insufficientBalanceDialog, [
        "focusContainerSelector: '.ibd-card'",
        "initialFocusSelector: '.ibd-recharge'",
        'aria-label="余额不足"',
        'aria-label="稍后再说"',
      ]) &&
      hasAll(publishGuideSheet, [
        "focusContainerSelector: '.pgs-sheet'",
        "initialFocusSelector: '.pgs-close'",
        'aria-label="短视频发布资格"',
        ':aria-disabled="actionBusy"',
      ]) &&
      hasAll(giftPanel, [
        "focusContainerSelector: '.gp-sheet'",
        "initialFocusSelector: '.gp-cell'",
        'aria-label="直播送礼"',
        ':aria-disabled="insufficient"',
      ]) &&
      hasAll(datePickerModal, [
        "focusContainerSelector: '.dp-panel'",
        "initialFocusSelector: '.dp-confirm'",
        'aria-label="选择出生日期和时间"',
        ':aria-checked="mode === m"',
      ]) &&
      hasAll(groupPickerModal, [
        "focusContainerSelector: '.gp-panel'",
        "initialFocusSelector: '.gp-confirm'",
        'aria-label="选择客户分组"',
        ':aria-checked="selected === g.name"',
      ]) &&
      hasAll(locationPickerModal, [
        "focusContainerSelector: '.lp-panel'",
        "initialFocusSelector: '.lp-confirm'",
        "focusContainerSelector: '.lp-explain-card'",
        'aria-label="北京时间换算说明"',
        'role="switch"',
      ]) &&
      hasAll(nameCardPoster, [
        "focusContainerSelector: '.card-modal'",
        "initialFocusSelector: '.card-close'",
        'aria-label="从业者名片海报"',
        ':aria-disabled="saving"',
      ]),
  },
  {
    name: "排盘核心录入支持键盘选择日期、地点、分组和时间算法选项",
    file: "apps/mobile/src/components/bazi/input-form.vue",
    pass: hasAll(baziInputForm, [
      'role="radio" :aria-checked="gender === \'male\'"',
      'role="button" tabindex="0"',
      "@keydown=\"activateOnKeyboard($event, () => showDatePicker = true)\"",
      "@keydown=\"activateOnKeyboard($event, () => showLocationPicker = true)\"",
      "@keydown=\"activateOnKeyboard($event, () => showGroupPicker = true)\"",
      'role="checkbox" :aria-checked="optState[o.key]"',
      'role="switch" :aria-checked="saveRecord"',
      "@keydown=\"activateOnKeyboard($event, handleSubmit)\"",
    ]),
  },
];

const failed = checks.filter((item) => !item.pass);

console.log("沉浸式交互与滚动安全发布审计");
console.log(`检查结果：${checks.length - failed.length}/${checks.length} 通过`);
for (const item of checks) {
  console.log(`${item.pass ? "通过" : "失败"}：${item.name}（${item.file}）`);
}

if (failed.length > 0) {
  console.error(`发布门禁失败：${failed.length} 项交互安全规则不满足。`);
  process.exit(1);
}

console.log("交互安全门禁通过：手势返回、历史返回、滚动隔离和固定导航均有静态防回归保护。");
