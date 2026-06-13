<template>
  <view class="ad-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <view class="header-actions">
          <text class="header-btn" @click="handleShare">📤</text>
          <text class="header-btn" @click="showMore = true">⋯</text>
        </view>
      </view>
    </view>

    <template v-if="loading">
      <view class="ad-body">
        <view class="skeleton"><view class="sk-line w-80" /><view class="sk-line w-60" /><view class="sk-block" /></view>
      </view>
    </template>

    <template v-else>
      <view class="ad-body">
        <text class="ad-title">{{ article.title }}</text>

        <view class="author-row">
          <view class="author-left" @click="goPage('/pages/user/id-detail/index?name=' + article.author.name)">
            <view class="author-avatar">{{ article.author.name[0] }}</view>
            <view class="author-info">
              <view class="author-top">
                <text class="author-name">{{ article.author.name }}</text>
                <text v-if="article.author.isVerified" class="author-verify">✅</text>
              </view>
              <text class="author-meta">{{ article.author.title }} · {{ article.publishTime }}</text>
            </view>
          </view>
          <view class="follow-btn" :class="{ followed: isFollowing }" @click="isFollowing = !isFollowing">
            <text>{{ isFollowing ? '已关注' : '关注' }}</text>
          </view>
        </view>

        <view class="stats-row">
          <text>阅读 {{ article.readCount }}</text>
          <text>点赞 {{ likeCount }}</text>
          <text>评论 {{ article.commentCount }}</text>
        </view>

        <view class="divider" />

        <!-- 文章内容块 -->
        <view class="article-content">
          <template v-for="(block, i) in article.content" :key="i">
            <text v-if="block.type === 'heading'" class="content-heading">{{ block.content }}</text>
            <text v-else-if="block.type === 'text'" class="content-text">{{ block.content }}</text>
            <view v-else-if="block.type === 'image'" class="content-image">
              <view class="img-placeholder"><text>🖼️ {{ block.caption }}</text></view>
              <text class="img-caption">{{ block.caption }}</text>
            </view>
            <view v-else-if="block.type === 'embed'" class="embed-card">
              <!-- 圈子嵌入 -->
              <view v-if="block.embedType === 'circle'" class="embed-circle">
                <view class="ec-icon">👥</view>
                <view class="ec-body">
                  <view class="ec-title-row"><text class="ec-title">{{ block.data.name }}</text><text class="ec-badge">圈子</text></view>
                  <text class="ec-desc">{{ block.data.description }}</text>
                  <view class="ec-bottom">
                    <text class="ec-members">{{ block.data.memberCount }} 成员</text>
                    <view class="ec-join" :class="{ joined: block._joined }" @click="block._joined = !block._joined">
                      <text>{{ block._joined ? '已加入' : '加入圈子' }}</text>
                    </view>
                  </view>
                </view>
              </view>
              <!-- 课程嵌入 -->
              <view v-else-if="block.embedType === 'course'" class="embed-course" @click="goPage('/pages/course/id-detail/index?id=' + block.data.id)">
                <view class="ecs-thumb">▶️</view>
                <view class="ecs-body">
                  <text class="ecs-badge">课程</text>
                  <text class="ecs-title">{{ block.data.title }}</text>
                  <view class="ecs-bottom">
                    <view class="ecs-price"><text class="ecs-cur">¥{{ block.data.price }}</text><text class="ecs-orig">¥{{ block.data.originalPrice }}</text></view>
                    <text class="ecs-count">{{ block.data.students }}人学习</text>
                  </view>
                </view>
                <text class="ecs-arrow">›</text>
              </view>
              <!-- 商品嵌入 -->
              <view v-else-if="block.embedType === 'product'" class="embed-product" @click="goPage('/pages/mall/product/index?id=' + block.data.id)">
                <view class="ep-thumb">🛍️</view>
                <view class="ep-body">
                  <text class="ep-badge">商品</text>
                  <text class="ep-title">{{ block.data.name }}</text>
                  <view class="ep-bottom">
                    <view class="ep-price"><text class="ep-cur">¥{{ block.data.price }}</text><text class="ep-orig">¥{{ block.data.originalPrice }}</text></view>
                    <view class="ep-buy"><text>立即购买</text></view>
                  </view>
                </view>
              </view>
              <!-- 排盘嵌入 -->
              <view v-else-if="block.embedType === 'paipan'" class="embed-paipan" @click="goPage('/pages/paipan/index')">
                <view class="epa-icon">☯️</view>
                <view class="epa-body">
                  <text class="epa-title">{{ block.data.title }}</text>
                  <text class="epa-desc">{{ block.data.description }}</text>
                </view>
                <view class="epa-btn"><text>免费排盘</text></view>
              </view>
              <!-- 智能体嵌入 -->
              <view v-else-if="block.embedType === 'agent'" class="embed-agent">
                <view class="ea-icon">🤖</view>
                <view class="ea-body">
                  <view class="ea-title-row"><text class="ea-title">{{ block.data.name }}</text><text class="ea-badge">AI</text></view>
                  <text class="ea-desc">{{ block.data.description }}</text>
                </view>
                <view class="ea-btn"><text>立即体验</text></view>
              </view>
            </view>
          </template>
        </view>
      </view>

      <!-- 来源圈子 -->
      <view class="source-bar">
        <view class="source-left" @click="goPage('/pages/circle/id-detail/index?id=' + article.sourceCircle.id)">
          <view class="source-icon">👥</view>
          <view class="source-info">
            <view class="source-top"><text class="source-name">{{ article.sourceCircle.name }}</text><text class="source-count">{{ article.sourceCircle.memberCount }}成员</text></view>
            <text class="source-desc">{{ article.sourceCircle.description }}</text>
          </view>
        </view>
        <view class="source-join" :class="{ joined: joinedCircle }" @click="joinedCircle = !joinedCircle">
          <text>{{ joinedCircle ? '已加入' : '加入圈子' }}</text>
        </view>
      </view>

      <!-- 底部互动 -->
      <view class="bottom-bar">
        <view class="bb-item" @click="handleLike">
          <text class="bb-icon">{{ isLiked ? '❤️' : '🤍' }}</text>
          <text class="bb-num" :class="{ active: isLiked }">{{ likeCount }}</text>
        </view>
        <view class="bb-item">
          <text class="bb-icon">💬</text>
          <text class="bb-num">{{ article.commentCount }}</text>
        </view>
        <view class="bb-item" @click="handleCollect">
          <text class="bb-icon">{{ isCollected ? '🔖' : '🏷️' }}</text>
          <text class="bb-num" :class="{ active: isCollected }">{{ collectCount }}</text>
        </view>
        <view class="bb-item" @click="handleShare">
          <text class="bb-icon">📤</text>
          <text class="bb-num">分享</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const loading = ref(true)
const isLiked = ref(false)
const isCollected = ref(false)
const isFollowing = ref(false)
const joinedCircle = ref(false)
const likeCount = ref(1256)
const collectCount = ref(892)
const showMore = ref(false)

const article = reactive({
  id: 1,
  title: '八字入门：如何正确排出你的生辰八字',
  author: { name: '玄微子', avatar: '', isVerified: true, title: '易学传承人', followers: 12680 },
  publishTime: '2024-01-15',
  readCount: 8520,
  likeCount: 1256,
  commentCount: 328,
  collectCount: 892,
  sourceCircle: { id: 1, name: '八字命理研究社', avatar: '', memberCount: 3280, description: '专注八字命理研究，分享实战案例与学习心得' },
  content: [
    { type: 'text', content: '八字，又称四柱，是中国传统命理学的核心方法之一。它以一个人出生的年、月、日、时四个时间点，各配以天干地支，形成八个字，故称「八字」。' },
    { type: 'heading', content: '一、什么是八字？' },
    { type: 'text', content: '八字命理学认为，一个人出生时的天干地支，蕴含着其一生的命运信息。通过分析八字中的五行生克、十神关系、神煞等要素，可以推断一个人的性格、事业、婚姻、财运等方面的情况。' },
    { type: 'image', caption: '八字排盘示例图' },
    { type: 'text', content: '学习八字，首先要掌握天干地支的基础知识。天干有十个：甲、乙、丙、丁、戊、己、庚、辛、壬、癸；地支有十二个：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥。' },
    { type: 'embed', embedType: 'paipan', data: { title: 'AI智能排盘', description: '输入生辰，一键生成专业八字命盘' } },
    { type: 'heading', content: '二、如何排八字？' },
    { type: 'text', content: '排八字的第一步是确定出生的准确时间。需要注意的是，八字使用的是真太阳时，而非北京时间。不同地区需要根据经度进行时差校正。' },
    { type: 'embed', embedType: 'course', data: { id: 1, title: '八字命理系统课程', cover: '', price: 299, originalPrice: 599, students: 1580 } },
    { type: 'heading', content: '三、八字的基本构成' },
    { type: 'text', content: '八字由四柱组成，每柱包含一个天干和一个地支。年柱代表祖上和童年，月柱代表父母和青年，日柱代表自己和配偶，时柱代表子女和晚年。' },
    { type: 'embed', embedType: 'circle', data: { id: 1, name: '八字入门学习圈', avatar: '', memberCount: 2156, description: '零基础入门，系统学习八字命理' } },
    { type: 'heading', content: '四、学习建议' },
    { type: 'text', content: '学习八字需要循序渐进，建议从基础概念开始，先熟悉天干地支、五行生克、十神含义，再逐步深入到格局、用神、大运流年等高级内容。' },
    { type: 'embed', embedType: 'product', data: { id: 1, name: '《渊海子平》精装典藏版', image: '', price: 128, originalPrice: 168, sales: 892 } },
    { type: 'text', content: '实践是最好的老师。建议多分析真实案例，与同好交流探讨，在实践中不断验证和修正自己的理解。' },
    { type: 'embed', embedType: 'agent', data: { id: 1, name: '八字智能解读', icon: 'bot', description: 'AI智能分析你的八字命盘，给出专业解读' } },
  ] as any[],
})

setTimeout(() => { loading.value = false }, 200)

function handleLike() { isLiked.value = !isLiked.value; likeCount.value += isLiked.value ? 1 : -1 }
function handleCollect() { isCollected.value = !isCollected.value; collectCount.value += isCollected.value ? 1 : -1 }
function handleShare() { uni.showToast({ title: '分享功能开发中', icon: 'none' }) }
function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.ad-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 180rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(255,255,255,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-actions { display: flex; gap: 8rpx; }
.header-btn { font-size: 32rpx; width: 56rpx; text-align: center; }

.ad-body { padding: 24rpx; }
.skeleton { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.sk-line { height: 18rpx; background: #f0f0f0; border-radius: 4rpx; margin-bottom: 12rpx; }
.sk-line.w-80 { width: 80%; }
.sk-line.w-60 { width: 60%; }
.sk-block { height: 200rpx; background: #f0f0f0; border-radius: 12rpx; }

.ad-title { font-size: 36rpx; font-weight: 700; color: #2C2C2C; display: block; line-height: 1.4; margin-bottom: 24rpx; }

.author-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.author-left { display: flex; align-items: center; gap: 12rpx; flex: 1; }
.author-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; background: #F5F1EB; display: flex; align-items: center; justify-content: center; font-size: 22rpx; color: #C41E3A; }
.author-top { display: flex; align-items: center; gap: 6rpx; }
.author-name { font-size: 26rpx; font-weight: 500; color: #333; }
.author-verify { font-size: 20rpx; }
.author-meta { font-size: 20rpx; color: #BBB; display: block; }
.follow-btn { padding: 8rpx 20rpx; border-radius: 24rpx; border: 2rpx solid #C41E3A; }
.follow-btn text { font-size: 22rpx; color: #C41E3A; }
.follow-btn.followed { background: #F5F1EB; border-color: #F5F1EB; }
.follow-btn.followed text { color: #999; }

.stats-row { display: flex; gap: 24rpx; }
.stats-row text { font-size: 22rpx; color: #BBB; }
.divider { height: 2rpx; background: #E8E0D5; margin: 20rpx 0; }

.content-heading { font-size: 30rpx; font-weight: 700; color: #2C2C2C; display: block; margin: 28rpx 0 14rpx; }
.content-text { font-size: 26rpx; color: #555; line-height: 1.8; display: block; margin-bottom: 14rpx; }
.content-image { margin: 24rpx 0; }
.img-placeholder { aspect-ratio: 16/9; background: #F5F1EB; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.img-placeholder text { font-size: 24rpx; color: #BBB; }
.img-caption { font-size: 22rpx; color: #BBB; text-align: center; display: block; margin-top: 10rpx; }

/* 嵌入卡片通用 */
.embed-card { margin: 16rpx 0; }

.embed-circle { background: #FFFBF5; border-radius: 14rpx; padding: 18rpx; display: flex; gap: 14rpx; }
.ec-icon { width: 64rpx; height: 64rpx; border-radius: 14rpx; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 32rpx; flex-shrink: 0; }
.ec-body { flex: 1; min-width: 0; }
.ec-title-row { display: flex; align-items: center; gap: 8rpx; }
.ec-title { font-size: 26rpx; font-weight: 600; color: #333; }
.ec-badge { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 6rpx; background: rgba(196,30,58,0.08); color: #C41E3A; }
.ec-desc { font-size: 22rpx; color: #999; display: block; margin-top: 6rpx; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.ec-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 14rpx; }
.ec-members { font-size: 20rpx; color: #BBB; }
.ec-join { padding: 6rpx 18rpx; border-radius: 20rpx; background: #C41E3A; }
.ec-join text { font-size: 20rpx; color: #fff; }
.ec-join.joined { background: #F5F1EB; }
.ec-join.joined text { color: #999; }

.embed-course { background: #FFFBF5; border-radius: 14rpx; padding: 18rpx; display: flex; align-items: center; gap: 14rpx; }
.ecs-thumb { width: 100rpx; height: 72rpx; border-radius: 10rpx; background: linear-gradient(135deg, rgba(196,30,58,0.1), rgba(240,160,48,0.1)); display: flex; align-items: center; justify-content: center; font-size: 36rpx; flex-shrink: 0; }
.ecs-body { flex: 1; min-width: 0; }
.ecs-badge { font-size: 18rpx; color: #F0A030; background: rgba(240,160,48,0.1); padding: 2rpx 8rpx; border-radius: 4rpx; }
.ecs-title { font-size: 24rpx; font-weight: 500; color: #333; display: block; margin-top: 6rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ecs-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 8rpx; }
.ecs-price { display: flex; align-items: baseline; gap: 8rpx; }
.ecs-cur { font-size: 26rpx; font-weight: 700; color: #C41E3A; }
.ecs-orig { font-size: 20rpx; color: #BBB; text-decoration: line-through; }
.ecs-count { font-size: 20rpx; color: #BBB; }
.ecs-arrow { font-size: 36rpx; color: #CCC; }

.embed-product { background: #FFFBF5; border-radius: 14rpx; padding: 18rpx; display: flex; gap: 14rpx; }
.ep-thumb { width: 88rpx; height: 88rpx; border-radius: 10rpx; background: linear-gradient(135deg, rgba(240,160,48,0.1), rgba(196,30,58,0.1)); display: flex; align-items: center; justify-content: center; font-size: 36rpx; flex-shrink: 0; }
.ep-body { flex: 1; min-width: 0; }
.ep-badge { font-size: 18rpx; color: #F0A030; background: rgba(240,160,48,0.1); padding: 2rpx 8rpx; border-radius: 4rpx; }
.ep-title { font-size: 24rpx; font-weight: 500; color: #333; display: block; margin-top: 6rpx; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.ep-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 10rpx; }
.ep-price { display: flex; align-items: baseline; gap: 8rpx; }
.ep-cur { font-size: 24rpx; font-weight: 700; color: #C41E3A; }
.ep-orig { font-size: 18rpx; color: #BBB; text-decoration: line-through; }
.ep-buy { padding: 6rpx 16rpx; border-radius: 20rpx; background: #C41E3A; }
.ep-buy text { font-size: 20rpx; color: #fff; }

.embed-paipan { background: linear-gradient(135deg, rgba(196,30,58,0.06), rgba(240,160,48,0.06)); border-radius: 14rpx; padding: 18rpx; display: flex; align-items: center; gap: 16rpx; border: 2rpx solid rgba(196,30,58,0.12); }
.epa-icon { width: 72rpx; height: 72rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 36rpx; flex-shrink: 0; }
.epa-body { flex: 1; }
.epa-title { font-size: 26rpx; font-weight: 600; color: #333; display: block; }
.epa-desc { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.epa-btn { padding: 10rpx 20rpx; border-radius: 20rpx; background: #C41E3A; }
.epa-btn text { font-size: 22rpx; color: #fff; }

.embed-agent { background: linear-gradient(135deg, rgba(240,160,48,0.06), rgba(196,30,58,0.06)); border-radius: 14rpx; padding: 18rpx; display: flex; align-items: center; gap: 14rpx; border: 2rpx solid rgba(240,160,48,0.15); }
.ea-icon { width: 64rpx; height: 64rpx; border-radius: 14rpx; background: linear-gradient(135deg, #F0A030, rgba(240,160,48,0.7)); display: flex; align-items: center; justify-content: center; font-size: 30rpx; flex-shrink: 0; }
.ea-body { flex: 1; }
.ea-title-row { display: flex; align-items: center; gap: 8rpx; }
.ea-title { font-size: 26rpx; font-weight: 600; color: #333; }
.ea-badge { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 6rpx; background: rgba(240,160,48,0.15); color: #F0A030; }
.ea-desc { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.ea-btn { padding: 10rpx 20rpx; border-radius: 20rpx; background: #F0A030; }
.ea-btn text { font-size: 22rpx; color: #fff; }

.source-bar { position: fixed; bottom: 100rpx; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(12rpx); border-top: 1px solid #E8E0D5; padding: 16rpx 24rpx; display: flex; align-items: center; }
.source-left { display: flex; align-items: center; gap: 12rpx; flex: 1; min-width: 0; }
.source-icon { width: 64rpx; height: 64rpx; border-radius: 14rpx; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 30rpx; flex-shrink: 0; }
.source-info { flex: 1; min-width: 0; }
.source-top { display: flex; align-items: center; gap: 8rpx; }
.source-name { font-size: 24rpx; font-weight: 600; color: #333; }
.source-count { font-size: 18rpx; color: #BBB; }
.source-desc { font-size: 20rpx; color: #999; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.source-join { padding: 10rpx 24rpx; border-radius: 20rpx; background: #C41E3A; flex-shrink: 0; }
.source-join text { font-size: 22rpx; color: #fff; }
.source-join.joined { background: #F5F1EB; }
.source-join.joined text { color: #999; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #E8E0D5; display: flex; justify-content: space-around; padding: 12rpx 24rpx; padding-bottom: calc(12rpx + env(safe-area-inset-bottom)); }
.bb-item { display: flex; flex-direction: column; align-items: center; gap: 2rpx; padding: 6rpx 12rpx; }
.bb-icon { font-size: 32rpx; }
.bb-num { font-size: 20rpx; color: #BBB; }
.bb-num.active { color: #C41E3A; }
</style>
