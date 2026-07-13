<!--
  I1 · 研究院首页（书院研究院 V0 重构版）
  视觉方向：Rooted Journal 编辑感 / 宣纸白 #FAF8F5 / 朱红 #C41E3A 品牌头 / 金 #C9A96E 荣誉强调
  真连：instituteApi.getIntro / getTalentPool / getEvents —— 只用后端真枚举与字段，虚构纪要卡降级。
  数据接线沿用原页 onLoad/load/loading/errMsg，模板与样式按 mockup 1:1 还原。
-->
<template>
  <view class="page">
    <!-- 顶部导航（custom·朱红品牌头下自绘） -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#fff" />
        </view>
        <text class="nav-title">书院研究院</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll">
      <!-- 加载态 -->
      <view v-if="loading" class="state-box">
        <view class="spinner" />
        <text class="state-text">加载中…</text>
      </view>
      <!-- 错误态 -->
      <view v-else-if="errMsg" class="state-box">
        <app-icon name="alert-circle" :size="40" color="#d1d5db" />
        <text class="state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>

      <template v-else-if="info">
        <!-- 品牌头 -->
        <view class="hero" :style="{ paddingTop: navHeight + 16 + 'px' }">
          <view class="seal" />
          <view class="seal2" />
          <text class="hero-badge">ACADEMY · 书院研究院</text>
          <text class="hero-title">{{ info.name }}</text>
          <text class="hero-sub">{{ info.intro || '平台精英师资筛选培养体系——从付费会员中遴选签约讲师，输送线下驿站授课。' }}</text>
          <view class="hero-rule" />
        </view>

        <view class="wrap">
          <!-- 成长主线 · 五步机制漏斗 -->
          <view class="sec-h">
            <view class="sec-t">
              <text class="sec-t-main">成长主线 · 五步机制</text>
              <text class="sec-t-en">THE PATH</text>
            </view>
          </view>
          <view class="funnel">
            <template v-for="(s, i) in funnelSteps" :key="i">
              <view class="fstep" :class="{ gold: s.gold }">
                <view class="fnum">{{ i + 1 }}</view>
                <view class="fbody">
                  <text class="fbody-b">{{ s.title }}</text>
                  <text class="fbody-s">{{ s.desc }}</text>
                </view>
              </view>
              <view v-if="i < funnelSteps.length - 1" class="fconn"><view class="fconn-i" /></view>
            </template>
            <view class="ghost-btn" @tap="goApply">
              <text class="ghost-btn-t">查看讲师遴选机制</text>
              <app-icon name="chevron-right" :size="14" color="#C41E3A" />
            </view>
          </view>

          <!-- 数据带 -->
          <view class="stats">
            <view class="stat">
              <text class="stat-b">{{ info.counts.members }}</text>
              <text class="stat-s">在册会员</text>
            </view>
            <view class="stat">
              <text class="stat-b">{{ signedCount }}</text>
              <text class="stat-s">签约讲师</text>
            </view>
            <view class="stat">
              <text class="stat-b">{{ info.counts.events }}</text>
              <text class="stat-s">研究院活动</text>
            </view>
          </view>

          <!-- 精英讲师 -->
          <view class="sec-h">
            <view class="sec-t">
              <text class="sec-t-main">精英讲师</text>
              <text class="sec-t-en">LECTURERS</text>
            </view>
            <view class="more" @tap="goInstructors">
              <text class="more-t">全部</text>
              <app-icon name="chevron-right" :size="12" color="#C41E3A" />
            </view>
          </view>
          <scroll-view v-if="teachers.length" scroll-x class="hscroll" :show-scrollbar="false">
            <view class="hscroll-inner">
              <view v-for="t in teachers" :key="t.id" class="lcard" @tap="goInstructor(t.id)">
                <view class="lav">
                  <image v-if="t.user.avatar" :src="t.user.avatar" class="lav-img" mode="aspectFill" />
                  <text v-else class="lav-txt">師</text>
                </view>
                <text class="lname">{{ memberName(t.user) }}</text>
                <text class="chip" :style="{ color: lecturerLevelColor[t.lecturerLevel].color, background: lecturerLevelColor[t.lecturerLevel].bg }">{{ lecturerLevelLabel[t.lecturerLevel] }}</text>
              </view>
            </view>
          </scroll-view>
          <view v-else class="mini-empty"><text class="mini-empty-text">暂无讲师入库</text></view>

          <!-- 近期活动 -->
          <view class="sec-h">
            <view class="sec-t">
              <text class="sec-t-main">近期活动</text>
              <text class="sec-t-en">EVENTS</text>
            </view>
            <view class="more" @tap="goEvents">
              <text class="more-t">排期</text>
              <app-icon name="chevron-right" :size="12" color="#C41E3A" />
            </view>
          </view>
          <view v-if="upcomingEvents.length" class="event-list">
            <view v-for="e in upcomingEvents" :key="e.id" class="card ecard" @tap="goEvent(e.id)">
              <view class="ecov" :class="covClass(e.type)">
                <text class="ecov-txt">{{ eventTypeLabel[e.type] }}</text>
              </view>
              <view class="ebody">
                <view class="etags">
                  <text class="etag" :style="{ background: eventTypeColor[e.type].color }">{{ eventTypeLabel[e.type] }}</text>
                  <text class="etag-status" :style="{ color: eventStatusColor[e.status].color, background: eventStatusColor[e.status].bg }">{{ eventStatusLabel[e.status] }}</text>
                </view>
                <text class="etitle">{{ e.title }}</text>
                <text class="emeta">{{ eventMeta(e) }}</text>
              </view>
            </view>
          </view>
          <view v-else class="mini-empty"><text class="mini-empty-text">近期暂无活动</text></view>

          <!-- 研究院内容 · 真实频道入口（替代 mockup 虚构纪要卡） -->
          <view class="sec-h">
            <view class="sec-t">
              <text class="sec-t-main">研究院内容</text>
              <text class="sec-t-en">CONTENTS</text>
            </view>
          </view>
          <view class="entry-list">
            <view class="entry-row rankings" @tap="goRankings">
              <view class="entry-ic rankings-ic"><app-icon name="trophy" :size="20" color="#7a5f33" /></view>
              <view class="entry-info">
                <text class="entry-title rankings-title">讲师影响力榜单</text>
                <text class="entry-sub rankings-sub">任务 · 授课 · 驿站 · 资历 四维透明计分</text>
              </view>
              <app-icon name="chevron-right" :size="16" color="#C9A96E" />
            </view>
            <view class="entry-row lectures" @tap="goLectures">
              <view class="entry-ic lectures-ic"><app-icon name="landmark" :size="20" color="#fff" /></view>
              <view class="entry-info">
                <text class="entry-title on-dark">大师讲座</text>
                <text class="entry-sub on-dark-sub">分享回放沉淀 · 研究院出品精品讲座</text>
              </view>
              <app-icon name="chevron-right" :size="16" color="rgba(255,255,255,0.7)" />
            </view>
            <view class="entry-row contents" @tap="goContents">
              <view class="entry-ic contents-ic"><app-icon name="book-open" :size="20" color="#C41E3A" /></view>
              <view class="entry-info">
                <text class="entry-title">大师讲堂</text>
                <text class="entry-sub">讲师沉淀的文章 · 视频 · 文档知识库</text>
              </view>
              <app-icon name="chevron-right" :size="16" color="#9B9B9B" />
            </view>
            <view class="entry-row board" @tap="goBoardGroups">
              <view class="entry-ic board-ic"><app-icon name="users" :size="20" color="#e8dcc3" /></view>
              <view class="entry-info">
                <text class="entry-title on-dark">私董会</text>
                <text class="entry-sub on-dark-sub">6-12 人闭门小组 · 轮流出题 · 拆解经营课题</text>
              </view>
              <app-icon name="chevron-right" :size="16" color="rgba(255,255,255,0.5)" />
            </view>
          </view>

          <!-- 组织架构 -->
          <view class="sec-h">
            <view class="sec-t">
              <text class="sec-t-main">组织架构</text>
              <text class="sec-t-en">GOVERNANCE</text>
            </view>
          </view>
          <view class="card org">
            <text class="org-txt">院长 / 副院长 / 秘书长 由平台任命轮岗</text>
            <text class="org-sm">会费收入平台 / 研究院 50 : 50 留存，管理层从留存中发放分红。</text>
            <view v-if="info.management.length" class="mgmt-list">
              <view v-for="m in info.management" :key="m.id" class="mgmt-row">
                <view class="mgmt-av">
                  <image v-if="m.user.avatar" :src="m.user.avatar" class="mgmt-av-img" mode="aspectFill" />
                  <app-icon v-else name="user" :size="16" color="#9B9B9B" />
                </view>
                <text class="mgmt-name">{{ memberName(m.user) }}</text>
                <text class="mgmt-role" :style="{ color: roleColor[m.role].color, background: roleColor[m.role].bg }">{{ roleLabel[m.role] }}</text>
              </view>
            </view>
          </view>

          <!-- 组织简介统计（成员/活动/课程数） -->
          <view class="counts-strip">
            <view class="counts-cell">
              <text class="counts-num">{{ info.counts.members }}</text>
              <text class="counts-label">研究院成员</text>
            </view>
            <view class="counts-div" />
            <view class="counts-cell">
              <text class="counts-num">{{ info.counts.events }}</text>
              <text class="counts-label">活动</text>
            </view>
            <view class="counts-div" />
            <view class="counts-cell">
              <text class="counts-num">{{ info.counts.courses }}</text>
              <text class="counts-label">课程</text>
            </view>
          </view>

          <view class="bottom-safe" />
        </view>
      </template>
    </scroll-view>

    <!-- 吸底 CTA -->
    <view v-if="info && !loading && !errMsg" class="dock">
      <view class="price">
        <text class="price-b">¥10,000</text>
        <text class="price-s"> /年 · 可退押金机制</text>
      </view>
      <view class="cta" @tap="goApply">
        <text class="cta-t">加入研究院</text>
        <app-icon name="arrow-right" :size="15" color="#fff" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  instituteApi, lecturerLevelLabel, lecturerLevelColor,
  eventStatusLabel, eventStatusColor, eventTypeLabel, eventTypeColor,
  roleLabel, roleColor, fmtDate, memberName,
  type InstituteIntro, type TalentTeacher, type InstituteEvent, type EventType,
} from '@/lib/institute-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)
const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

const loading = ref(true)
const errMsg = ref('')
const info = ref<InstituteIntro | null>(null)
const teachers = ref<TalentTeacher[]>([])
const events = ref<InstituteEvent[]>([])

// 五步成长主线（机制说明·非虚构数据，来自定位文档）
const funnelSteps = [
  { title: '付费准入', desc: '会费 ¥10,000/年 · 交钱即进 · 不设审核门槛', gold: false },
  { title: '申请分享（自主选择）', desc: '成为分享会员承接任务；不申请则纯学习', gold: false },
  { title: '完成任务 → 年度退还会费', desc: '会费本质是可退押金；不申请分享不退费', gold: true },
  { title: '平台评估 → 主动签约成讲师', desc: '签约遴选制，非自荐填表', gold: false },
  { title: '进入线下驿站讲师库授课', desc: '签约讲师入驻驿站，线下开讲', gold: false },
]

// 签约讲师数（真实字段·SIGNED 计数）
const signedCount = computed(() => teachers.value.filter((t) => t.lecturerLevel === 'SIGNED').length)

const upcomingEvents = computed(() =>
  events.value.filter((e) => e.status === 'SCHEDULED' || e.status === 'ONGOING').slice(0, 3),
)

// 活动封面配色（按后端 EventType 真枚举）
function covClass(type: EventType) {
  return { SALON: 'cov-salon', LIVE: 'cov-live', COURSE: 'cov-course' }[type] || 'cov-salon'
}
// 活动 meta：日期 · 地点 · 主讲（均为真实字段，缺失诚实降级）
function eventMeta(e: InstituteEvent) {
  const parts = [fmtDate(e.scheduleAt), e.location || '地点待定']
  if (e.lecturer?.nickname) parts.push('主讲 ' + e.lecturer.nickname)
  return parts.join(' · ')
}

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    const [intro, talent, evs] = await Promise.all([
      instituteApi.getIntro(),
      instituteApi.getTalentPool(),
      instituteApi.getEvents({ upcoming: true }),
    ])
    info.value = intro
    teachers.value = talent
    events.value = evs
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onLoad(() => load())

function goInstructors() { navigateTo('/institute/instructors') }
function goInstructor(id: string) { navigateTo('/institute/instructors/' + id) }
function goEvents() { navigateTo('/institute/events') }
function goEvent(id: string) { navigateTo('/institute/events/' + id) }
function goApply() { navigateTo('/institute/member-apply') }
function goRankings() { navigateTo('/pkg-institute/rankings/index') }
function goContents() { navigateTo('/pkg-institute/contents/index') }
function goLectures() { navigateTo('/pkg-institute/lectures/index') }
function goBoardGroups() { navigateTo('/pkg-institute/board-groups/index') }
</script>

<style lang="scss" scoped>
$paper: #FAF8F5;
$card: #FFFFFF;
$red: #C41E3A;
$red-deep: #9E1730;
$gold: #C9A96E;
$ink: #2C2C2C;
$sub: #6E6E73;
$faint: #9B9B9B;
$line: #ECE7DF;
$radius: 36rpx;

.page { min-height: 100vh; background: $paper; }

/* 顶部导航（品牌头上透明·白字） */
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 20; }
.nav-bar { height: 88rpx; display: flex; align-items: center; padding: 0 24rpx; }
.nav-back { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; margin-left: -8rpx; }
.nav-title { flex: 1; text-align: center; font-size: 34rpx; font-weight: 700; color: #fff; letter-spacing: 2rpx; }
.nav-placeholder { width: 64rpx; }

.scroll { height: 100vh; box-sizing: border-box; }

/* 品牌头 */
.hero { position: relative; overflow: hidden; padding: 32rpx 44rpx 60rpx;
  background: linear-gradient(150deg, #{$red} 0%, #{$red-deep} 100%); }
.seal { position: absolute; right: -36rpx; top: 48rpx; width: 240rpx; height: 240rpx; border: 3rpx solid rgba(255,255,255,0.18); border-radius: 50%; }
.seal2 { position: absolute; right: 28rpx; top: 112rpx; width: 128rpx; height: 128rpx; border: 2rpx solid rgba(201,169,110,0.5); border-radius: 50%; }
.hero-badge { display: inline-block; font-size: 22rpx; letter-spacing: 5rpx; color: $gold;
  border: 2rpx solid rgba(201,169,110,0.55); border-radius: 999px; padding: 8rpx 24rpx; margin-bottom: 28rpx; }
.hero-title { display: block; font-size: 60rpx; font-weight: 800; color: #fff; letter-spacing: 4rpx; margin-bottom: 16rpx;
  font-family: "Songti SC", "STSong", serif; }
.hero-sub { display: block; font-size: 26rpx; color: rgba(255,255,255,0.86); line-height: 1.7; max-width: 500rpx; }
.hero-rule { width: 68rpx; height: 4rpx; background: $gold; margin-top: 28rpx; }

.wrap { padding: 40rpx; }

/* 区块头 */
.sec-h { display: flex; align-items: center; justify-content: space-between; margin: 44rpx 0 24rpx; }
.sec-h:first-child { margin-top: 0; }
.sec-t { display: flex; flex-direction: column; }
.sec-t-main { font-size: 34rpx; font-weight: 700; color: $ink; letter-spacing: 1rpx; }
.sec-t-en { font-size: 18rpx; color: $faint; letter-spacing: 5rpx; margin-top: 4rpx; }
.more { display: flex; align-items: center; gap: 6rpx; }
.more-t { font-size: 22rpx; color: $red; }

/* 漏斗 */
.funnel { background: $card; border: 2rpx solid $line; border-radius: $radius; padding: 36rpx;
  box-shadow: 0 8rpx 32rpx rgba(140,120,90,0.06); }
.fstep { display: flex; gap: 24rpx; align-items: flex-start; padding: 20rpx 0; }
.fnum { width: 52rpx; height: 52rpx; border-radius: 50%; background: $red; color: #fff; font-size: 24rpx; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-family: "Songti SC", serif; }
.fstep.gold .fnum { background: $gold; }
.fbody { flex: 1; }
.fbody-b { display: block; font-size: 26rpx; color: $ink; font-weight: 600; margin-bottom: 4rpx; }
.fbody-s { display: block; font-size: 22rpx; color: $sub; line-height: 1.55; }
.fconn { width: 52rpx; display: flex; justify-content: center; }
.fconn-i { width: 3rpx; height: 28rpx; background: $line; }
.ghost-btn { display: flex; align-items: center; justify-content: center; gap: 12rpx; height: 76rpx;
  border: 2rpx solid $red; border-radius: 999px; margin-top: 16rpx; }
.ghost-btn-t { font-size: 24rpx; color: $red; font-weight: 700; }

/* 数据带 */
.stats { display: flex; gap: 20rpx; margin: 12rpx 0; }
.stat { flex: 1; background: $card; border: 2rpx solid $line; border-radius: 28rpx; padding: 28rpx 12rpx; text-align: center; }
.stat-b { display: block; font-family: "Songti SC", serif; font-size: 48rpx; color: $red; line-height: 1; }
.stat-s { display: block; font-size: 20rpx; color: $faint; margin-top: 10rpx; }

/* 讲师横滑 */
.hscroll { white-space: nowrap; margin: 0 -40rpx; }
.hscroll-inner { display: inline-flex; gap: 24rpx; padding: 8rpx 40rpx; }
.lcard { width: 236rpx; flex-shrink: 0; background: $card; border: 2rpx solid $line; border-radius: 32rpx; padding: 28rpx 20rpx; text-align: center; }
.lav { width: 116rpx; height: 116rpx; border-radius: 50%; margin: 0 auto 16rpx; overflow: hidden;
  background: linear-gradient(135deg, #e9ddc9, #d8c4a0); display: flex; align-items: center; justify-content: center; }
.lav-img { width: 116rpx; height: 116rpx; }
.lav-txt { color: #fff; font-family: "Songti SC", serif; font-size: 44rpx; }
.lname { display: block; font-size: 24rpx; font-weight: 700; color: $ink; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chip { display: inline-block; font-size: 18rpx; border-radius: 999px; padding: 4rpx 16rpx; margin-top: 12rpx; }

/* 活动卡 */
.event-list { display: flex; flex-direction: column; }
.card { background: $card; border: 2rpx solid $line; border-radius: $radius; box-shadow: 0 8rpx 32rpx rgba(140,120,90,0.06); }
.ecard { display: flex; gap: 24rpx; padding: 24rpx; margin-bottom: 20rpx; }
.ecov { width: 116rpx; height: 116rpx; border-radius: 24rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.ecov-txt { color: #fff; font-size: 22rpx; font-family: "Songti SC", serif; }
.cov-salon { background: linear-gradient(135deg, #C41E3A, #8f1327); }
.cov-live { background: linear-gradient(135deg, #3a6ea5, #274d78); }
.cov-course { background: linear-gradient(135deg, #C9A96E, #a5854a); }
.ebody { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
.etags { display: flex; align-items: center; gap: 8rpx; }
.etag { font-size: 18rpx; letter-spacing: 1rpx; border-radius: 8rpx; padding: 2rpx 12rpx; color: #fff; }
.etag-status { font-size: 18rpx; border-radius: 8rpx; padding: 2rpx 12rpx; }
.etitle { display: block; font-size: 26rpx; font-weight: 700; color: $ink; margin: 10rpx 0 6rpx;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.emeta { display: block; font-size: 21rpx; color: $faint; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 内容频道入口 */
.entry-list { display: flex; flex-direction: column; gap: 20rpx; }
.entry-row { display: flex; align-items: center; gap: 24rpx; border-radius: $radius; padding: 28rpx 32rpx; }
.entry-ic { width: 80rpx; height: 80rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.entry-info { flex: 1; min-width: 0; }
.entry-title { display: block; font-size: 28rpx; font-weight: 700; color: $ink; }
.entry-sub { display: block; font-size: 21rpx; color: $faint; margin-top: 4rpx; }
.entry-title.on-dark { color: #fff; }
.entry-sub.on-dark-sub { color: rgba(255,255,255,0.6); }
.rankings { background: linear-gradient(135deg, #fdf9f0, #f6ecd8); border: 2rpx solid rgba(201,169,110,0.55); }
.rankings-ic { background: linear-gradient(135deg, #f3e7cf, #c9a96e); border-radius: 50%; box-shadow: 0 4rpx 16rpx rgba(201,169,110,0.35); }
.rankings-title { color: #7a5f33; }
.rankings-sub { color: #a98d5f; }
.lectures { background: linear-gradient(135deg, #7c1423, #a4283c); }
.lectures-ic { background: rgba(255,255,255,0.14); }
.contents { background: $card; border: 2rpx solid $line; }
.contents-ic { background: rgba(196,30,58,0.08); }
.board { background: linear-gradient(135deg, #2b2f3a, #3d3428); }
.board-ic { background: rgba(201,169,110,0.24); }

/* 组织架构 */
.org { padding: 32rpx; }
.org-txt { display: block; font-size: 24rpx; color: $ink; line-height: 1.7; }
.org-sm { display: block; font-size: 21rpx; color: $faint; margin-top: 12rpx; line-height: 1.6; }
.mgmt-list { margin-top: 24rpx; border-top: 2rpx solid $line; padding-top: 20rpx; display: flex; flex-direction: column; gap: 20rpx; }
.mgmt-row { display: flex; align-items: center; gap: 16rpx; }
.mgmt-av { width: 56rpx; height: 56rpx; border-radius: 50%; overflow: hidden; background: #f3efe8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mgmt-av-img { width: 56rpx; height: 56rpx; }
.mgmt-name { flex: 1; font-size: 24rpx; color: $ink; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mgmt-role { font-size: 20rpx; border-radius: 8rpx; padding: 3rpx 14rpx; }

/* 组织简介统计条 */
.counts-strip { display: flex; align-items: center; background: $card; border: 2rpx solid $line; border-radius: 28rpx; padding: 28rpx 0; margin-top: 24rpx; }
.counts-cell { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.counts-num { font-size: 40rpx; font-weight: 700; color: $red; font-family: "Songti SC", serif; }
.counts-label { font-size: 20rpx; color: $faint; }
.counts-div { width: 2rpx; height: 48rpx; background: $line; }

.bottom-safe { height: 40rpx; }

/* 吸底 CTA */
.dock { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20;
  padding: 20rpx 36rpx calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(255,255,255,0.94); backdrop-filter: blur(8px); border-top: 2rpx solid $line;
  display: flex; align-items: center; gap: 24rpx; }
.price { flex: 1; }
.price-b { font-family: "Songti SC", serif; font-size: 44rpx; color: $red; font-weight: 700; }
.price-s { font-size: 22rpx; color: $faint; }
.cta { background: $red; border-radius: 999px; height: 92rpx; padding: 0 44rpx;
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  box-shadow: 0 12rpx 32rpx rgba(196,30,58,0.32); }
.cta-t { font-size: 28rpx; font-weight: 700; color: #fff; }

/* 三态 */
.state-box { padding: 160rpx 0; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.state-text { font-size: 26rpx; color: $faint; }
.spinner { width: 56rpx; height: 56rpx; border: 6rpx solid #f0ece4; border-top-color: $red; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 8rpx; padding: 12rpx 40rpx; border: 2rpx solid $red; border-radius: 999px; }
.retry-text { font-size: 26rpx; color: $red; }
.mini-empty { padding: 48rpx 0; display: flex; justify-content: center; }
.mini-empty-text { font-size: 26rpx; color: $faint; }
</style>
