# 国学平台管理后台 — V0 设计改造素材包

## 给 V0 的第一句话

> 我要改造一个国学传统文化平台的管理后台。技术栈 Vue3 + Element Plus + ECharts。不要中国风，参考**小红书/Notion/Linear 的现代简约风格**：清新、留白多、圆角卡片、柔和阴影、交互反馈细腻。

---

## 设计规范（请 V0 严格遵循）

### 配色
| 用途 | 色值 | 说明 |
|------|------|------|
| 页面背景 | `#F5F5F5` 或 `#FAFAFA` | 浅灰白底，不刺眼 |
| 卡片背景 | `#FFFFFF` | 纯白卡片 |
| 主色调 | `#FF2442` → 改为 `#FF6B6B` | 小红书红但更柔和 |
| 辅助色 | `#4ECDC4` | 青绿，用于成功/正向指标 |
| 强调色 | `#FFE66D` | 暖黄，用于提醒/高亮 |
| 文字主色 | `#1A1A1A` | 近黑色，不用纯黑 |
| 文字辅助 | `#999999` | 中灰 |
| 边框 | `#F0F0F0` | 极淡的灰 |
| 图表色 | `#FF6B6B`, `#4ECDC4`, `#FFE66D`, `#95E1D3`, `#F38181` | 暖色系渐变 |

### 布局
- 侧边栏宽度：**240px**（比现在的 220px 略宽，更从容）
- 卡片间距：**20px**
- 卡片圆角：**16px**（不再是直角小圆角）
- 卡片阴影：`box-shadow: 0 2px 12px rgba(0,0,0,0.04)` — 轻阴影，不要 heavy shadow
- 内边距：卡片内部 padding **24px**
- 页面内容最大宽度：不设限制，自适应

### 字体
- 标题：font-weight 600, letter-spacing -0.5px
- 数字：font-weight 700, font-feature-settings "tnum"（等宽数字）
- 正文：14px / 1.6 line-height
- 小字：12px / 1.5

### 交互
- hover 卡片：轻微上浮 `transform: translateY(-2px)` + 阴影加深，过渡 0.2s ease
- 按钮：圆角 8px，hover 时颜色加深 10%
- 表格行 hover：浅灰背景 `#FAFAFA`
- 所有可点击元素有 cursor:pointer

---

## 第 1 批：Layout + Dashboard（这是整个后台的基调）

### 📄 文件 1：Layout.vue — 导航壳

当前代码：
```vue
<template>
  <el-container class="layout">
    <el-aside width="220px">
      <div class="logo">国学平台</div>
      <el-menu router :default-active="route.path" background-color="#304156" text-color="#bfcbd9" active-text-color="#409eff">
        <el-menu-item index="/dashboard"><span>仪表盘</span></el-menu-item>
        <el-menu-item index="/contents"><span>内容管理</span></el-menu-item>
        <el-menu-item index="/classics"><span>古籍管理</span></el-menu-item>
        <el-sub-menu index="community">
          <template #title><span>社区管理</span></template>
          <el-menu-item index="/circles"><span>圈子管理</span></el-menu-item>
          <el-menu-item index="/videos"><span>视频管理</span></el-menu-item>
          <el-menu-item index="/lives"><span>直播管理</span></el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="tools">
          <template #title><span>排盘工具</span></template>
          <el-menu-item index="/bazi"><span>八字排盘</span></el-menu-item>
          <el-menu-item index="/ziwei"><span>紫微排盘</span></el-menu-item>
          <el-menu-item index="/paipan-records"><span>排盘记录</span></el-menu-item>
          <el-menu-item index="/bots"><span>Bot管理</span></el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="edu">
          <template #title><span>教学管理</span></template>
          <el-menu-item index="/courses"><span>课程管理</span></el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/reports"><span>举报管理</span></el-menu-item>
        <el-menu-item index="/comments"><span>评论管理</span></el-menu-item>
        <el-menu-item index="/search-analytics"><span>搜索分析</span></el-menu-item>
        <el-sub-menu index="offline">
          <template #title><span>线下管理</span></template>
          <el-menu-item index="/stations"><span>分站管理</span></el-menu-item>
          <el-menu-item index="/offline-venues"><span>线下驿站</span></el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="shop">
          <template #title><span>商城管理</span></template>
          <el-menu-item index="/products"><span>商品管理</span></el-menu-item>
          <el-menu-item index="/orders"><span>订单管理</span></el-menu-item>
          <el-menu-item index="/coupons"><span>优惠券管理</span></el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="commission">
          <template #title><span>营销分佣</span></template>
          <el-menu-item index="/commission-config"><span>佣金配置</span></el-menu-item>
          <el-menu-item index="/withdrawals"><span>提现审核</span></el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="finance">
          <template #title><span>财务管理</span></template>
          <el-menu-item index="/recharges"><span>充值记录</span></el-menu-item>
          <el-menu-item index="/gifts"><span>礼物管理</span></el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/notifications"><span>通知管理</span></el-menu-item>
        <el-menu-item index="/institutes"><span>研究院管理</span></el-menu-item>
        <el-sub-menu index="system">
          <template #title><span>系统管理</span></template>
          <el-menu-item index="/users"><span>用户管理</span></el-menu-item>
          <el-menu-item index="/banners"><span>Banner管理</span></el-menu-item>
          <el-menu-item index="/system-settings"><span>系统设置</span></el-menu-item>
          <el-menu-item index="/audit-logs"><span>审计日志</span></el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header>
        <span>{{ auth.user?.nickname }}</span>
        <el-button text @click="logout">退出</el-button>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../store/auth";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

onMounted(async () => {
  try {
    await auth.fetchProfile();
  } catch {
    router.push("/login");
  }
});

function logout() {
  auth.logout();
  router.push("/login");
}
</script>

<style scoped>
.layout { height: 100vh; }
.el-aside { background: #304156; }
.logo { color: #fff; text-align: center; padding: 16px; font-size: 18px; font-weight: bold; }
.el-header { background: #fff; display: flex; align-items: center; justify-content: flex-end; gap: 12px; border-bottom: 1px solid #e6e6e6; }
.el-main { background: #f0f2f5; }
</style>
```

**Layout 改造要求：**
1. 侧边栏背景改为白色 `#FFF`，不要深蓝黑色
2. 菜单选中项用淡粉背景 `#FFF0F0` + 左侧 3px `#FF6B6B` 竖线指示器
3. Logo 区改为「国学平台」+ 小字 slogan，左对齐，不要居中大字
4. 顶部 Header 极简化：只要头像圆圈 + 昵称 + 退出图标，不要文字按钮
5. 主内容区背景 `#F5F5F5`
6. 整体不要传统的深色 sidebar 模式，参考 Notion/飞书的清爽侧栏

---

### 📄 文件 2：Dashboard.vue — 数据仪表盘

当前代码已在上面完整展示（317 行，含模板/脚本/样式）。核心结构：
- 16 个统计卡片（分 4 行，每行 4 个）
- 2 个 ECharts 折线图（用户增长 + 内容趋势）
- 1 个 ECharts 饼图（内容类型分布）
- 1 个 TOP10 热门文章表格

**Dashboard 改造要求：**
1. 统计卡片重新设计：
   - 去掉左边框色条（`.card-blue { border-left: 4px solid ... }`）
   - 改为：大数字在上 + 标签在下的卡片，背景纯白，圆角 16px
   - 卡片里放一个小图标（用 emoji 或 Element Plus icon），放在右上角
   - 数字用 feature-settings "tnum" 等宽字体，24px → 32px 更大更突出
2. 图表区域：
   - 折线图改用渐变填充 + 无数据点标记（smooth 曲线）
   - 饼图改为环形图（radius: ["55%", "75%"]），标签放外侧
   - 图表配色统一用规范里的暖色系
3. TOP10 表格：
   - 排名数字 1-3 用奖牌色（🥇金 🥈银 🥉铜），4-10 灰色
   - 去掉 stripe 斑马纹，用分割线替代
4. 整体间距加大，现在的 16px gap 太挤了 → 20px

---

## 附：Dashboard 数据接口（供参考，不需要改）

```typescript
// stats 对象
{
  articleCount, userCount, courseCount, classicBookCount,
  totalViews, totalLikes, totalComments, totalCollects,
  circleCount, productCount, orderCount, paidOrderCount,
  todayNewUsers, monthNewUsers, monthNewArticles,
  pendingReports, liveRoomCount, videoCount
}

// trends 对象
{
  dates: string[],
  userTrend: number[],
  articleTrend: number[]
}

// charts 对象
{
  userGrowth: { date: string; count: number }[],
  contentDistribution: { name: string; count: number }[],
  topArticles: { id, title, viewCount, likeCount, commentCount, author }[]
}
```

---

## 第 2 批预告（第 1 批通过后再做）

| 页面 | 文件 | 改造要点 |
|------|------|---------|
| Login | Login.vue | 极简登录：左侧品牌区 + 右侧表单，背景渐变 |
| UserList | users/UserList.vue | 卡片式用户列表，头像圆角，状态标签 |
| ContentList | ContentList.vue | 图文卡片流，封面图 + 标题 + 标签 |
| ProductList | shop/ProductList.vue | 商品卡片网格，价格突出 |
| CourseList | courses/CourseList.vue | 课程卡片 + 进度条 |
| 其余 20+ 页面 | ... | 统一应用第 1 批的设计语言 |

---

## V0 输出要求

- 输出完整的 `.vue` 单文件组件（template + script + style）
- 保持 `<script setup lang="ts">` 中的逻辑不变，只改 template 和 style
- **不要改 Element Plus 组件的 props/events，只改视觉层**
- ECharts 初始化逻辑保持不变，只改 option 配色和样式
- CSS 优先用 scoped style，复杂的全局变量可以抽到 `<style>` 里
