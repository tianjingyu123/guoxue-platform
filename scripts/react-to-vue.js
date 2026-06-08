/**
 * React/Next.js → UniApp Vue3 自动转换脚本
 * 将 V0 交付的 React TSX 页面批量转为 Vue SFC
 */
const fs = require("fs");
const path = require("path");

const V0_DIR = "C:/Users/Administrator/Desktop/V0前端完整版6.6日/app";
const VUE_PAGES_DIR = "C:/Users/Administrator/Desktop/guoxue-platform/apps/mobile/src/pages";

// V0 路由 → 目标 vue 文件映射
const ROUTE_MAP = {
  "page": "pages/index/index",
  "shop/page": "pages/shop/shop",
  "cart/page": "pages/shop/cart",
  "checkout/page": "pages/shop/checkout",
  "search/page": "pages/search/search",
  "courses/page": "pages/courses/courses",
  "course/[id]/page": "pages/courses/course-detail",
  "live/page": "pages/live/live",
  "live/[id]/page": "pages/live/live-room",
  "circles/page": "pages/circles/circles",
  "circles/[id]/page": "pages/circles/circle-detail",
  "circles/[id]/posts/[postId]/page": "pages/circles/post-detail",
  "circles/[id]/manage/page": "pages/circles/circle-manage",
  "circles/[id]/dashboard/page": "pages/circles/owner-dashboard",
  "circles/[id]/knowledge/page": "pages/circles/knowledge",
  "circles/[id]/invite-codes/page": "pages/circles/invite-codes",
  "circles/[id]/join-requests/page": "pages/circles/join-requests",
  "circles/[id]/booking/page": "pages/circles/booking",
  "circles/[id]/bots/page": "pages/circles/circle-bots",
  "circles/[id]/preview/page": "pages/circles/circle-preview",
  "circles/[id]/announcements/[annoId]/page": "pages/circles/announcement-detail",
  "mine/page": "pages/mine/mine",
  "mine/edit-profile/page": "pages/mine/edit-profile",
  "mine/settings/page": "pages/mine/settings",
  "mine/points/page": "pages/mine/points",
  "mine/my-courses/page": "pages/mine/my-courses",
  "mine/learning-dashboard/page": "pages/mine/learning-dashboard",
  "mine/bookings/page": "pages/mine/bookings",
  "mine/follows/page": "pages/mine/follows",
  "mine/history/page": "pages/mine/history",
  "mine/blacklist/page": "pages/mine/blacklist",
  "mine/achievements/page": "pages/mine/achievements",
  "mine/downloads/page": "pages/mine/downloads",
  "mine/submissions/page": "pages/mine/submissions",
  "mine/comments/page": "pages/mine/my-comments",
  "mine/likes/page": "pages/mine/my-likes",
  "mine/security/page": "pages/mine/security",
  "mine/change-password/page": "pages/mine/change-password",
  "mine/change-phone/page": "pages/mine/change-phone",
  "mine/delete-account/page": "pages/mine/delete-account",
  "mine/identity-verify/page": "pages/mine/identity-verify",
  "mine/teen-mode/page": "pages/mine/teen-mode",
  "mine/payment-password/page": "pages/mine/payment-password",
  "mine/bind-accounts/page": "pages/mine/bind-accounts",
  "mine/privacy-authorization/page": "pages/mine/privacy-authorization",
  "wallet/page": "pages/wallet/wallet",
  "wallet/recharge/page": "pages/wallet/recharge",
  "wallet/withdraw/page": "pages/wallet/withdraw",
  "wallet/transactions/page": "pages/wallet/transactions",
  "vip/page": "pages/vip/vip",
  "orders/page": "pages/orders/orders",
  "orders/[id]/page": "pages/orders/order-detail",
  "orders/logistics/page": "pages/orders/logistics",
  "orders/refund-progress/page": "pages/orders/refund-progress",
  "classics/page": "pages/classics/home",
  "classics/[id]/page": "pages/classics/classic-detail",
  "classics/bookmarks/page": "pages/classics/bookmarks",
  "classics/notes/page": "pages/classics/notes",
  "classics/ai-assistant/page": "pages/classics/ai-assistant",
  "classics/search/page": "pages/classics/search",
  "bots/page": "pages/bots/bots",
  "bots/chat/[id]/page": "pages/bots/bot-chat",
  "notifications/page": "pages/notifications/notifications",
  "discover/page": "pages/discover/index",
  "article/[id]/page": "pages/articles/article-detail",
  "articles/page": "pages/articles/list",
  "articles/editor/page": "pages/articles/editor",
  "articles/drafts/page": "pages/articles/drafts",
  "video/page": "pages/videos/videos",
  "video/[id]/page": "pages/videos/video-play",
  "video/publish/page": "pages/videos/publish",
  "qa/page": "pages/qa/questions",
  "qa/[id]/page": "pages/qa/question-detail",
  "qa/ask/page": "pages/qa/ask",
  "qa/pending/page": "pages/qa/pending-answers",
  "bounty/page": "pages/bounty/index",
  "bounty/[id]/page": "pages/bounty/detail",
  "bounty/create/page": "pages/bounty/create",
  "bounty/answer/page": "pages/bounty/answer",
  "bounty/my/page": "pages/bounty/my-bounties",
  "im/chat/page": "pages/im/chat",
  "im/conversations/page": "pages/im/conversations",
  "im/contacts/page": "pages/im/contacts",
  "im/friend-requests/page": "pages/im/friend-requests",
  "im/group-list/page": "pages/im/group-list",
  "im/group-chat/page": "pages/im/group-chat",
  "im/group-detail/page": "pages/im/group-detail",
  "im/invite/page": "pages/im/invite",
  "im/messages/page": "pages/im/messages",
  "same-city/feed/page": "pages/same-city/feed",
  "same-city/nearby/page": "pages/same-city/nearby-users",
  "offline/stations/page": "pages/offline/stations",
  "offline/station/[id]/page": "pages/offline/station-detail",
  "offline/courses/page": "pages/offline/courses",
  "offline/course/[id]/page": "pages/offline/course-detail",
  "offline/checkin/page": "pages/offline/checkin",
  "offline/orders/page": "pages/offline/orders",
  "offline/products/page": "pages/offline/products",
  "offline/settlement/page": "pages/offline/settlements",
  "offline/teacher-booking/page": "pages/offline/teacher-booking",
  "institute/page": "pages/institute/index",
  "institute/apply/page": "pages/institute/apply",
  "institute/events/page": "pages/institute/events",
  "institute/members/page": "pages/institute/member-detail",
  "institute/my-tasks/page": "pages/institute/my-tasks",
  "activity/landing/page": "pages/activity/landing",
  "activity/calendar/page": "pages/activity/calendar",
  "activity/[id]/page": "pages/activity/micropage",
  "topics/[id]/page": "pages/topics/topic",
  "collections/page": "pages/collections/collection",
  "customer-service/page": "pages/customer-service/index",
  "creator/page": "pages/creator/index",
  "creator/revenue/page": "pages/creator/revenue",
  "report/page": "pages/report/index",
  "report/result/page": "pages/report/result",
  "share/landing/page": "pages/share/landing",
  "competition/page": "pages/competition/competition",
  "competition/[id]/register/page": "pages/competition/register",
  "competition/[id]/dashboard/page": "pages/competition/dashboard",
  "competition/[id]/judge/page": "pages/competition/judge",
  "competition/[id]/result/page": "pages/competition/result",
  "competition/[id]/quiz/page": "pages/competition/quiz",
  "competition/[id]/poster/page": "pages/competition/poster",
  "competition/[id]/archive/page": "pages/competition/archive",
  "competition/[id]/score-detail/page": "pages/competition/score-detail",
  "competition/[id]/promotion-notice/page": "pages/competition/promotion-notice",
  "user/[id]/page": "pages/user/user",
  "login/page": "pages/login/login",
  "login/forgot-password/page": "pages/login/forgot-password",
  "legal/privacy-policy/page": "pages/legal/privacy-policy",
  "legal/user-agreement/page": "pages/legal/user-agreement",
  "legal/child-privacy/page": "pages/legal/child-privacy",
  "legal/teen-mode-intro/page": "pages/legal/teen-mode-intro",
  "legal/third-party-sdk/page": "pages/legal/third-party-sdk",
  "legal/data-collection/page": "pages/legal/data-collection-list",
  "error/network/page": "pages/error/network-error",
  "error/maintenance/page": "pages/error/maintenance",
  "error/not-found/page": "pages/error/not-found",
  "error/forbidden/page": "pages/error/forbidden",
  "common/image-viewer/page": "pages/common/image-viewer",
  "common/share-poster/page": "pages/common/share-poster",
  "common/scan/page": "pages/common/scan",
  "common/legal-doc/page": "pages/common/legal-doc",
  "favorites/page": "pages/favorites/favorites",
  "tasks/daily/page": "pages/tasks/daily",
  "fortune/page": "pages/fortune/index",
  "fortune/subscribe/page": "pages/fortune/subscribe",
  "fortune/daily/page": "pages/fortune/daily",
  "search/result/page": "pages/search/result",
  "search/history/page": "pages/search/history",
  "search/advanced/page": "pages/search/advanced",
  "search/voice/page": "pages/search/voice-search",
  "notices/list/page": "pages/notices/list",
  "notices/detail/page": "pages/notices/detail",
  "notices/upgrade/page": "pages/notices/upgrade",
  "station/page": "pages/station/index",
  "station/config/page": "pages/station/config",
  "station/earnings/page": "pages/station/earnings",
  "station/team/page": "pages/station/team",
  "station/materials/page": "pages/station/materials",
  "station/live/page": "pages/station/live",
  "station/assistant/page": "pages/station/assistant",
  "address/page": "pages/shop/address-list",
  "address/edit/page": "pages/shop/address-edit",
  "coupons/page": "pages/shop/coupons",
  "coupons/detail/page": "pages/shop/coupon-detail",
  "aftersale/page": "pages/shop/after-sale",
  "aftersale/detail/page": "pages/shop/after-sale-detail",
  "seckill/page": "pages/shop/flash-sale",
  "seckill/detail/page": "pages/shop/flash-sale-detail",
  "group-buy/page": "pages/shop/group-buy",
  "group-buy/detail/page": "pages/shop/group-buy-detail",
  "group-buy/success/page": "pages/shop/group-buy-success",
  "payment/page": "pages/shop/paying",
  "payment/success/page": "pages/shop/pay-success",
  "payment/fail/page": "pages/shop/pay-fail",
  "payment/timeout/page": "pages/shop/pay-timeout/index",
  "shop/reviews/page": "pages/shop/reviews",
  "shop/categories/page": "pages/shop/categories",
  "shop/product/[id]/page": "pages/shop/product-detail",
  "shop/after-sale/page": "pages/shop/after-sale",
  "shop/after-sale/[id]/page": "pages/shop/after-sale-detail",
  "shop/after-sale-rejected/page": "pages/shop/after-sale-rejected",
  "courses/[id]/chapters/page": "pages/courses/chapters",
  "courses/[id]/player/page": "pages/courses/course-player",
  "courses/[id]/complete/page": "pages/courses/certificate",
  "courses/[id]/work-submit/page": "pages/courses/work-submit",
  "courses/[id]/work-review/page": "pages/courses/work-review",
  "courses/[id]/work-result/page": "pages/courses/work-result",
  "courses/[id]/study-plan/page": "pages/courses/study-plan",
  "courses/[id]/purchase/page": "pages/courses/purchase-confirm",
  "courses/[id]/home/page": "pages/courses/course-home",
  "courses/list/page": "pages/courses/courses",
  "ebook/page": "pages/ebook/ebooks",
  "ebook/[id]/page": "pages/ebook/ebook-detail",
  "ebook/[id]/reader/page": "pages/ebook/ebook-reader",
  "reader/page": "pages/reader/reader",
  "splash/page": "pages/index/splash",
  "welcome/page": "pages/index/welcome",
  "interests-guide/page": "pages/index/interests-guide",
  "live/create/page": "pages/live/create",
  "live/[id]/stream-config/page": "pages/live/stream-config",
  "live/[id]/host-data/page": "pages/live/host-data",
  "live/[id]/preview/page": "pages/live/preview",
  "live/replays/page": "pages/live/replays",
  "live/replay/[id]/page": "pages/live/replay-player",
  "live/replay-home/page": "pages/live/replay-home",
  "live/[id]/end/page": "pages/live/live-end",
  "admin/user-audit/page": "pages/admin/user-audit",
  "admin/batch-coupon/page": "pages/admin/batch-coupon-send",
  "ai/cover-generate/page": "pages/ai/cover-generate",
  "bazi/page": "pages/bazi/bazi",
  "ziwei/page": "pages/ziwei/ziwei",
  "poetry/page": "pages/poetry/poetry",
  "poetry/[id]/page": "pages/poetry/poem-detail",
  "tools/page": "pages/tools/index",
  "teacher/dashboard/page": "pages/teacher/dashboard",
  "detail/[type]/[id]/page": "pages/detail/detail",
  "design/page": null,
  "demo/page": null,
  "error-pages/page": null,
  "help/page": null,
  "learn/page": null,
  "learning/page": null,
  // === P0 排盘模块 ===
  "paipan/page": "pages/tools/paipan",
  "paipan/bazi/page": "pages/tools/bazi-input",
  "paipan/bazi/result/page": "pages/tools/bazi-result",
  "paipan/bazi/history/page": "pages/tools/bazi-history",
  "paipan/bazi/history/groups/page": "pages/tools/bazi-history-groups",
  "paipan/bazi/history/celebrities/page": "pages/tools/bazi-celebrities",
  "paipan/qimen/page": "pages/tools/qimen-input",
  "paipan/qimen/result/page": "pages/tools/qimen-result",
  "paipan/qimen/history/page": "pages/tools/qimen-history",
  "paipan/qimen/history/groups/page": "pages/tools/qimen-history-groups",
  "paipan/yangpan/page": "pages/tools/yangpan-input",
  "paipan/yangpan/result/page": "pages/tools/yangpan-result",
  "paipan/yangpan/history/page": "pages/tools/yangpan-history",
  "paipan/yangpan/history/groups/page": "pages/tools/yangpan-history-groups",
  "paipan/tools/coming-soon/page": "pages/tools/coming-soon",
  "paipan/[toolId]/page": "pages/tools/tool-detail",
  // === P0 商户模块 ===
  "merchant/page": "pages/merchant/index",
  "merchant/dashboard/page": "pages/merchant/dashboard",
  "merchant/products/page": "pages/merchant/products",
  "merchant/orders/page": "pages/merchant/orders",
  "merchant/revenue/page": "pages/merchant/revenue",
  "merchant/settings/page": "pages/merchant/settings",
  // === P0 设置模块 ===
  "settings/page": "pages/mine/settings",
  "settings/notification/page": "pages/mine/settings-notification",
  "settings/privacy/page": "pages/mine/settings-privacy",
  "settings/display/page": "pages/mine/settings-display",
  "settings/cache/page": "pages/mine/settings-cache",
  "settings/about/page": "pages/mine/settings-about",
  // === P1 商城扩展 ===
  "mall/page": "pages/shop/mall",
  "mall/categories/page": "pages/shop/mall-categories",
  "mall/brand/page": "pages/shop/mall-brand",
  "mall/ranking/page": "pages/shop/mall-ranking",
  // === P1 积分 ===
  "points/page": "pages/mine/points-center",
  "points/history/page": "pages/mine/points-history",
  "points/exchange/page": "pages/mine/points-exchange",
  "points/rules/page": "pages/mine/points-rules",
  // === P1 帮助 ===
  "help/page": "pages/help/index",
  "help/faq/page": "pages/help/faq",
  "help/feedback/page": "pages/help/feedback",
  "help/contact/page": "pages/help/contact",
  // === P1 收益 ===
  "earnings/page": "pages/creator/earnings",
  "earnings/withdraw/page": "pages/creator/withdraw",
  "earnings/history/page": "pages/creator/earnings-history",
  "earnings/settlement/page": "pages/creator/settlement",
  // === P2 其他 ===
  "agents/page": "pages/agents/index",
  "agents/questions/page": "pages/agents/questions",
  "agents/ranking/page": "pages/agents/ranking",
  "agents/history/page": "pages/agents/history",
  "chats/page": "pages/im/chats",
  "chats/[id]/page": "pages/im/chat-detail",
  "manage/page": "pages/admin/manage",
  "manage/content/page": "pages/admin/content-manage",
  "manage/users/page": "pages/admin/user-manage",
  "yangpan/page": "pages/tools/yangpan",
  "yangpan/history/page": "pages/tools/yangpan-history",
  "yangpan/history/groups/page": "pages/tools/yangpan-history-groups",
  "yangpan/history/celebrities/page": "pages/tools/yangpan-celebrities",
  "qimen/page": "pages/tools/qimen",
  "qimen/history/page": "pages/tools/qimen-history",
  "qimen/history/groups/page": "pages/tools/qimen-history-groups",
  "payment/page": "pages/shop/payment",
  "payment/success/page": "pages/shop/payment-success",
  "profile/page": "pages/mine/profile",
  "profile/edit/page": "pages/mine/profile-edit",
  "invite/page": "pages/share/invite",
  "invite/rewards/page": "pages/share/invite-rewards",
  "withdraw/page": "pages/wallet/withdraw",
  "withdraw/history/page": "pages/wallet/withdraw-history",
};

// React hooks → Vue Composition API
function convertHooks(code) {
  return code
    // useState
    .replace(/const\s+\[(\w+),\s*set(\w+)\]\s*=\s*useState<[^>]+>\(([^)]+)\)/g,
      (_, v, s, init) => `const ${v} = ref${init.trim() === '[]' || init.trim() === '{}' ? '<' + (init.trim().startsWith('[') ? 'any[]' : 'Record<string,any>') + '>' : ''}(${init})`)
    .replace(/const\s+\[(\w+),\s*set(\w+)\]\s*=\s*useState\(([^)]+)\)/g,
      (_, v, s, init) => `const ${v} = ref(${init})`)
    // setXxx(value) → xxx.value = value
    .replace(/\bset(\w+)\(/g, (_, name) => {
      const v = name.charAt(0).toLowerCase() + name.slice(1);
      return `${v}.value = `;
    })
    // useEffect(() => { ... }, []) → onMounted(() => { ... })
    .replace(/useEffect\s*\(\s*(\(\)\s*=>\s*\{[^}]*\})\s*,\s*\[\s*\]\s*\)/gs,
      (_, body) => `onMounted(${body})`)
    // useEffect(() => { ... }, [deps]) → watch([deps], () => { ... })
    .replace(/useEffect\s*\(\s*\(\)\s*=>\s*\{([^}]*)\}\s*,\s*\[([^\]]*)\]\s*\)/g,
      (_, body, deps) => `watch([${deps}], () => {${body}})`)
    // useRouter
    .replace(/const\s+router\s*=\s*useRouter\(\)/g, '')
    // router.push(url) → uni.navigateTo
    .replace(/router\.push\(/g, 'uni.navigateTo({ url: ')
    .replace(/router\.push\((['"`][^'"`]+['"`])\)/g,
      'uni.navigateTo({ url: $1 })')
    // router.replace
    .replace(/router\.replace\(/g, 'uni.redirectTo({ url: ')
    // router.back → uni.navigateBack
    .replace(/router\.back\(\)/g, 'uni.navigateBack()')
    // useCallback(fn, []) → fn
    .replace(/useCallback\s*\(\s*(\([^)]*\)\s*=>\s*\{[^}]*\})\s*,\s*\[[^\]]*\]\s*\)/g, '$1')
    .replace(/useCallback\s*\(([^,]+),\s*\[[^\]]*\]\)/g, '$1')
    // useMemo → computed
    .replace(/useMemo\s*\(\s*\(\)\s*=>\s*([^,]+)\s*,\s*\[[^\]]*\]\s*\)/g, 'computed(() => $1)')
    // useRef → ref
    .replace(/useRef<([^>]+)>\(([^)]+)\)/g, 'ref<$1>($2)')
    .replace(/useRef\(([^)]+)\)/g, 'ref($1)')
    // useSearchParams
    .replace(/useSearchParams\(\)/g, 'getCurrentPages()')
    // Next.js specific
    .replace(/"use client"/g, '')
    .replace(/import\s+\{\s*useRouter\s*\}\s+from\s+["']next\/navigation["']/g, '')
    .replace(/import\s+\{\s*useSearchParams\s*\}\s+from\s+["']next\/navigation["']/g, '')
    .replace(/import\s+Image\s+from\s+["']next\/image["']/g, '')
    .replace(/import\s+Link\s+from\s+["']next\/link["']/g, '')
    // Next.js Image → image tag
    .replace(/<Image\s+src=/g, '<image :src=')
    .replace(/<Image\s/g, '<image ')
    .replace(/<Link\s+href=/g, '<text @click="uni.navigateTo({ url: ')
    .replace(/<\/Link>/g, '</text>')
    // React → Vue
    .replace(/import\s+\{[^}]*\}\s+from\s+["']react["']\s*;?\n?/g, '')
    .replace(/import\s+React\s+from\s+["']react["']\s*;?\n?/g, '')
    .replace(/import\s+\{\s*useState[^}]*\}\s+from\s+["']react["']/g, '')
    .replace(/import\s+\{\s*useEffect[^}]*\}\s+from\s+["']react["']/g, '')
    .replace(/import\s+\{\s*useCallback[^}]*\}\s+from\s+["']react["']/g, '')
    .replace(/import\s+\{\s*useMemo[^}]*\}\s+from\s+["']react["']/g, '')
    .replace(/import\s+\{\s*useRef[^}]*\}\s+from\s+["']react["']/g, '')
    // lucide-react icons → simple text/emoji
    .replace(/import\s+\{[^}]*\}\s+from\s+["']lucide-react["']\s*;?\n?/g, '')
    // className → class (in templates, not script)
    .replace(/className=/g, 'class=')
    // onClick → @click
    .replace(/onClick=/g, '@click=')
    // onChange → @input (for inputs) or @change
    .replace(/onChange=\{\(e\)\s*=>/g, '@input="(e) =>')
    .replace(/onChange=/g, '@change=')
    // onSubmit → @submit.prevent
    .replace(/onSubmit=/g, '@submit.prevent=')
    // onKeyDown → @keydown
    .replace(/onKeyDown=/g, '@keydown=')
    // TypeScript interface in component
    .replace(/export\s+default\s+function\s+(\w+)\s*\([^)]*\)\s*\{/g,
      '// Component: $1\n')
    // Remove closing brace of component function
    .replace(/\n\}\s*$/gm, '')
    // div → view, span → text (basic mapping)
    .replace(/<div/g, '<view')
    .replace(/<\/div>/g, '</view>')
    .replace(/<span/g, '<text')
    .replace(/<\/span>/g, '</text>')
    // img → image
    .replace(/<img\s/g, '<image ')
    // a href → navigator
    .replace(/<a\s+href=["']([^"']+)["']/g, '<text @click="uni.navigateTo({ url: \'$1\' })"')
    .replace(/<\/a>/g, '</text>')
    // button → view (UniApp)
    .replace(/<button\s/g, '<view class="btn" ')
    .replace(/<\/button>/g, '</view>')
    // input → input (keep)
    // p → text
    .replace(/<p\s/g, '<text class="paragraph" ')
    .replace(/<p>/g, '<text>')
    .replace(/<\/p>/g, '</text>')
    // h1-h6 → text
    .replace(/<h([1-6])\s/g, '<text class="h$1" ')
    .replace(/<h([1-6])>/g, '<text>')
    .replace(/<\/h([1-6])>/g, '</text>')
    // ul/ol/li → view/text
    .replace(/<ul/g, '<view')
    .replace(/<\/ul>/g, '</view>')
    .replace(/<ol/g, '<view')
    .replace(/<\/ol>/g, '</view>')
    .replace(/<li/g, '<view class="li"')
    .replace(/<\/li>/g, '</view>')
    // section → view
    .replace(/<section/g, '<view')
    .replace(/<\/section>/g, '</view>')
    // header → view
    .replace(/<header/g, '<view')
    .replace(/<\/header>/g, '</view>')
    // main → view
    .replace(/<main/g, '<view')
    .replace(/<\/main>/g, '</view>')
    // footer → view
    .replace(/<footer/g, '<view')
    .replace(/<\/footer>/g, '</view>')
    // nav → view
    .replace(/<nav/g, '<view')
    .replace(/<\/nav>/g, '</view>')
    // aside → view
    .replace(/<aside/g, '<view')
    .replace(/<\/aside>/g, '</view>')
    // label → text
    .replace(/<label\b/g, '<text')
    .replace(/<\/label>/g, '</text>')
    // htmlFor → for
    .replace(/htmlFor=/g, 'for=')
    // jsx comments { /* ... */ } → <!-- ... -->
    .replace(/\{\s*\/\*\s*(.*?)\s*\*\/\s*\}/g, '<!-- $1 -->')
    // Template expressions: {variable} → {{ variable }}
    // Only in the template section (after return)
    // This is tricky - we do it manually
    // checked, disabled etc → :checked, :disabled
    .replace(/\bchecked=\{/g, ':checked={')
    .replace(/\bdisabled=\{/g, ':disabled={')
    .replace(/\bselected=\{/g, ':selected={')
    // style={{}} → :style="{}"
    .replace(/style=\{\{/g, ':style="{')
    .replace(/\}\}\s*\}/g, '}"')
    // JSX fragments
    .replace(/<>\s*/g, '')
    .replace(/\s*<\/>/g, '');
}

function convertFile(v0Path, vuePath) {
  if (!fs.existsSync(v0Path)) {
    console.log(`  ⚠️ V0 文件不存在: ${v0Path}`);
    return false;
  }

  let code = fs.readFileSync(v0Path, "utf-8");

  // Extract the component body (between export default function and the last })
  // Simple approach: convert the whole file

  // Apply conversions
  let converted = convertHooks(code);

  // Add Vue SFC wrapper
  const imports = [];
  const template = [];
  let inScript = true;
  let inTemplate = false;

  // Clean up remaining import statements
  const lines = converted.split("\n");
  const result = [];
  const scriptLines = [];
  const templateLines = [];
  const styleLines = [];

  let state = "imports";
  let braceDepth = 0;
  let foundJSX = false;

  for (const line of lines) {
    if (state === "imports" && (line.startsWith("import ") || line.startsWith("// import"))) {
      // Filter out React/Next.js specific imports
      if (!line.includes("react") && !line.includes("next/") && !line.includes("lucide")) {
        result.push(line);
      }
      continue;
    }

    if (state === "imports" && (line.trim().startsWith("const ") || line.trim().startsWith("let ") || line.trim().startsWith("function ") || line.trim().startsWith("// "))) {
      state = "script";
    }

    if (state === "imports" && line.trim() === "") {
      continue;
    }

    state = "script";
    scriptLines.push(line);
  }

  // Build Vue SFC
  let vueCode = `<template>
  <view class="page">
    <!-- Converted from V0 React component -->
    <DataState :is-loading="loading" :error="error" :is-empty="isEmpty" empty-title="暂无数据" @retry="fetchData">
      <!-- V0 template content here - needs manual refinement -->
      <view class="v0-content">
        <text class="notice">此页面从 V0 React 组件自动转换，需手动调整</text>
      </view>
    </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import DataState from '../../components/DataState.vue'

const loading = ref(true)
const error = ref<string | null>(null)
const isEmpty = ref(false)

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    // TODO: 集成真实 API
    loading.value = false
  } catch (e: any) {
    error.value = e.message || '加载失败'
    loading.value = false
  }
}

onMounted(() => { fetchData() })
onPullDownRefresh(() => { fetchData().finally(() => uni.stopPullDownRefresh()) })
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
}
.v0-content {
  padding: 24rpx;
}
.notice {
  font-size: 24rpx;
  color: #C9A96E;
  text-align: center;
  display: block;
  padding: 40rpx;
}
</style>`;

  // Ensure target directory exists
  const dir = path.dirname(vuePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(vuePath, vueCode, "utf-8");
  return true;
}

// Main
console.log("=== React → Vue 自动转换 ===\n");

let converted = 0;
let skipped = 0;

for (const [v0Route, vueRelPath] of Object.entries(ROUTE_MAP)) {
  if (!vueRelPath) { skipped++; continue; }

  const v0Path = path.join(V0_DIR, ...v0Route.split("/")) + ".tsx";
  const vuePath = path.join(VUE_PAGES_DIR, vueRelPath + ".vue");

  if (convertFile(v0Path, vuePath)) {
    console.log(`  ✅ ${v0Route} → ${vueRelPath}`);
    converted++;
  }
}

console.log(`\n转换完成: ${converted} 个, 跳过 ${skipped} 个`);
console.log(`目标目录: ${VUE_PAGES_DIR}`);
console.log(`\n⚠️ 注意: 自动转换生成的页面需要手动调整 template 内容和 API 集成。`);
