<template>
  <view class="page">
    <!-- 自绘导航栏 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#2C2C2C" />
        </view>
        <text class="nav-title serif">组织架构</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ height: scrollHeight + 'px' }">
      <view class="wrap">
        <!-- 加载态 -->
        <view v-if="loading" class="state-box">
          <view class="spinner" />
          <text class="state-text">加载中…</text>
        </view>

        <!-- 错误态 -->
        <view v-else-if="errMsg" class="state-box">
          <app-icon name="alert-circle" :size="40" color="#D8CFC2" />
          <text class="state-text">{{ errMsg }}</text>
          <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
        </view>

        <template v-else>
          <!-- 治理机制卡（制度固定说明） -->
          <view class="gov">
            <view class="gov-seal" />
            <text class="gov-title serif">治理机制</text>
            <text class="gov-desc">院长 / 副院长 / 秘书长由平台任命、定期轮岗；会费收入平台 / 研究院 50 : 50 留存，管理层从研究院留存中获得分红。</text>
          </view>

          <!-- 管理层 -->
          <view class="sec-t serif">管理层</view>
          <text class="sub-note">平台任命 · 轮岗履职</text>
          <view v-if="management.length" class="mgmt">
            <view
              v-for="mg in management"
              :key="mg.id"
              class="mcard"
              :class="{ lead: mg.role === 'PRESIDENT' }"
              @tap="goDetailByUser(mg.user.id)"
            >
              <smart-avatar class="mc-av-wrap" :src="mg.user.avatar" :name="memberName(mg.user)" />
              <text class="mc-name">{{ memberName(mg.user) }}</text>
              <view
                class="role"
                :class="mg.role === 'PRESIDENT' ? 'role-pres' : 'role-other'"
              >
                <text class="role-t" :class="mg.role === 'PRESIDENT' ? 'role-t-pres' : 'role-t-other'">{{ roleLabel[mg.role] }}</text>
              </view>
            </view>
          </view>
          <view v-else class="mini-empty"><text class="mini-empty-t">管理层信息待完善</text></view>

          <!-- 委员会（私董会小组·院内成员可见） -->
          <template v-if="!boardForbidden">
            <view class="sec-t serif">委员会</view>
            <text class="sub-note">研究院管理层发起 · 闭门共研小组</text>
            <view v-if="boardGroups.length">
              <view
                v-for="g in boardGroups"
                :key="g.id"
                class="gcard"
                @tap="goBoardGroup(g)"
              >
                <view class="gc-main">
                  <view class="gc-head">
                    <text class="gname">{{ g.name }}</text>
                    <view v-if="g.status !== 'ACTIVE'" class="g-off"><text class="g-off-t">已解散</text></view>
                  </view>
                  <text class="gmeta">成员 {{ g.memberCount }} 人 · 组长 {{ g.leader.nickname || '研究院成员' }}</text>
                  <view v-if="g.topic" class="gc-topic">
                    <text class="gc-topic-tag">本期议题</text>
                    <text class="gc-topic-t">{{ g.topic }}</text>
                  </view>
                </view>
                <view class="gc-leader-av">
                  <smart-avatar class="face-sa" :src="g.leader.avatar" :name="g.leader.nickname || '组'" />
                </view>
              </view>
            </view>
            <view v-else class="mini-empty"><text class="mini-empty-t">暂无委员会小组</text></view>
          </template>

          <!-- 全体成员 -->
          <view class="sec-t serif">
            全体成员 <text class="sec-count">（{{ members.length }}）</text>
          </view>
          <view v-if="members.length === 0" class="mini-empty"><text class="mini-empty-t">暂无成员</text></view>
          <view v-else>
            <view
              v-for="m in sortedMembers"
              :key="m.id"
              class="mrow"
              @tap="goDetail(m.id)"
            >
              <smart-avatar class="mr-av-wrap" :src="m.user.avatar" :name="memberName(m.user)" />
              <view class="mr-info">
                <view class="mr-name-row">
                  <text class="mr-name">{{ memberName(m.user) }}</text>
                  <view class="chip" :class="chipClass(m)">
                    <text class="chip-t" :class="chipClass(m) + '-t'">{{ chipLabel(m) }}</text>
                  </view>
                </view>
                <text class="mr-meta">{{ m.joinYear }} 年加入</text>
              </view>
              <app-icon name="chevron-right" :size="18" color="#9B9B9B" />
            </view>
          </view>

          <view class="bottom-safe" />
        </template>
      </view>
    </scroll-view>

    <!-- 申请入口 -->
    <view class="footer">
      <view class="footer-btn" @tap="goApply">
        <text class="footer-btn-text">申请加入研究院</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  instituteApi, roleLabel, isManagement, memberName,
  type InstituteRole, type InstituteMember, type InstituteIntro, type BoardGroup,
} from '@/lib/institute-data'

const statusBarHeight = ref(0)
const scrollHeight = ref(600)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  scrollHeight.value = (info.windowHeight || 700) - statusBarHeight.value - 52 - 64
} catch (e) {}

const ROLE_ORDER: Record<InstituteRole, number> = {
  PRESIDENT: 1, VICE_PRESIDENT: 2, SECRETARY_GENERAL: 3, INITIATOR: 4, TYPE_A: 5, TYPE_B: 6,
}

const loading = ref(true)
const errMsg = ref('')
const members = ref<InstituteMember[]>([])
const intro = ref<InstituteIntro | null>(null)
const boardGroups = ref<BoardGroup[]>([])
const boardForbidden = ref(false)

async function load() {
  loading.value = true
  errMsg.value = ''
  boardForbidden.value = false
  try {
    // 成员与介绍并行；管理层取自 intro.management
    const [ms, intro_] = await Promise.all([
      instituteApi.getMembers({ status: 'ACTIVE' }),
      instituteApi.getIntro(),
    ])
    members.value = ms
    intro.value = intro_
    // 私董会小组：403=非院内成员则整块隐藏（诚实降级），其余错误静默不阻断主页
    try {
      boardGroups.value = await instituteApi.getBoardGroups()
    } catch (e) {
      const msg = (e as Error)?.message || ''
      if (/403|Forbidden|成员|权限/i.test(msg)) boardForbidden.value = true
    }
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onLoad(() => load())

// 管理层：优先取 intro.management（含 role/user），按角色序排
const management = computed(() =>
  (intro.value?.management || [])
    .slice()
    .sort((a, b) => (ROLE_ORDER[a.role] || 99) - (ROLE_ORDER[b.role] || 99))
)

// 全体成员：排除管理层（管理层单列上方），按角色/加入年排序
const sortedMembers = computed(() =>
  members.value
    .filter(m => !isManagement(m.role))
    .slice()
    .sort((a, b) => (ROLE_ORDER[a.role] - ROLE_ORDER[b.role]) || (b.joinYear - a.joinYear))
)

// chip：签约讲师优先（lecturerLevel），否则按 role 真实标签
function chipClass(m: InstituteMember): string {
  if (m.lecturerLevel === 'SIGNED') return 'chip-signed'
  if (m.role === 'TYPE_A') return 'chip-share'
  return 'chip-norm'
}
function chipLabel(m: InstituteMember): string {
  if (m.lecturerLevel === 'SIGNED') return '签约讲师'
  return roleLabel[m.role]
}

function goDetail(id: string) {
  navigateTo(`/institute/members/${id}`)
}
// 管理层卡按 userId 找对应成员记录再跳详情（详情页以成员 id 为主键）
function goDetailByUser(userId: string) {
  const hit = members.value.find(m => m.userId === userId)
  if (hit) navigateTo(`/institute/members/${hit.id}`)
}
// 委员会：入组/进组统一跳承载私密圈（复用 board-groups 逻辑）
function goBoardGroup(g: BoardGroup) {
  if (g.status !== 'ACTIVE') return
  navigateTo(`/pkg-circle/circles/detail?id=${g.circleId}`)
}
function goApply() {
  navigateTo('/institute/member-apply')
}
</script>

<style lang="scss" scoped>
$paper: #FAF8F5;
$card: #FFFFFF;
$red: #C41E3A;
$gold: #C9A96E;
$ink: #2C2C2C;
$sub: #6E6E73;
$faint: #9B9B9B;
$line: #EDEAE4;
$radius: 18rpx;

.page { min-height: 100vh; background: $paper; }
.serif { font-family: "Songti SC", "STSong", "SimSun", serif; }

/* 自绘导航栏 */
.nav { position: sticky; top: 0; z-index: 20; background: $paper; border-bottom: 1rpx solid $line; }
.nav-bar { height: 52px; display: flex; align-items: center; padding: 0 16rpx; }
.nav-back {
  width: 60rpx; height: 60rpx; border-radius: 50%;
  background: #fff; border: 1rpx solid $line;
  display: flex; align-items: center; justify-content: center;
}
.nav-title { flex: 1; text-align: center; font-size: 34rpx; font-weight: 700; color: $ink; margin-right: 60rpx; }
.nav-placeholder { width: 60rpx; }

.scroll { width: 100%; }
.wrap { padding: 36rpx 40rpx; }

/* 治理机制卡 */
.gov {
  position: relative; overflow: hidden;
  background: linear-gradient(150deg, #8A6D2F, #6D5522);
  border-radius: $radius; padding: 36rpx; margin-bottom: 40rpx;
}
.gov-seal {
  position: absolute; right: -32rpx; top: -32rpx;
  width: 200rpx; height: 200rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.2); border-radius: 50%;
}
.gov-title { display: block; font-size: 30rpx; font-weight: 700; color: #fff; margin-bottom: 12rpx; }
.gov-desc { display: block; font-size: 23rpx; color: rgba(255, 255, 255, 0.85); line-height: 1.7; }

/* 区块标题 */
.sec-t { font-size: 32rpx; font-weight: 700; color: $ink; margin: 40rpx 0 12rpx; }
.sec-count { font-size: 24rpx; color: $faint; font-weight: 400; }
.sub-note { display: block; font-size: 22rpx; color: $faint; margin-bottom: 24rpx; }

/* 迷你空态 */
.mini-empty { padding: 40rpx 0; display: flex; justify-content: center; }
.mini-empty-t { font-size: 24rpx; color: $faint; }

/* 管理层三卡 */
.mgmt { display: flex; gap: 20rpx; margin-bottom: 12rpx; }
.mcard {
  flex: 1; background: $card; border: 1rpx solid $line; border-radius: 32rpx;
  padding: 28rpx 12rpx; text-align: center;
  box-shadow: 0 8rpx 28rpx rgba(140, 120, 90, 0.06);
}
.mcard.lead { border-color: $red; }
.mc-av-wrap { width: 104rpx; height: 104rpx; margin: 0 auto 16rpx; border-radius: 50%; }
.mc-av {
  width: 104rpx; height: 104rpx; border-radius: 50%;
  background: linear-gradient(135deg, #E9DDC9, #D8C4A0);
  display: flex; align-items: center; justify-content: center;
}
.mc-av-img { width: 104rpx; height: 104rpx; border-radius: 50%; }
.mc-av-t { font-size: 40rpx; color: #fff; }
.mc-name { display: block; font-size: 24rpx; font-weight: 700; color: $ink; }
.role { display: inline-block; border-radius: 999px; padding: 4rpx 16rpx; margin-top: 10rpx; }
.role-pres { background: $red; }
.role-other { background: #F3ECE0; }
.role-t { font-size: 18rpx; }
.role-t-pres { color: #fff; }
.role-t-other { color: #A8791F; }

/* 委员会卡 */
.gcard {
  display: flex; justify-content: space-between; align-items: center;
  padding: 28rpx; margin-bottom: 20rpx;
  background: $card; border: 1rpx solid $line; border-radius: $radius;
  box-shadow: 0 8rpx 28rpx rgba(140, 120, 90, 0.06);
}
.gc-main { flex: 1; min-width: 0; }
.gc-head { display: flex; align-items: center; gap: 12rpx; }
.gname { font-size: 26rpx; font-weight: 700; color: $ink; }
.g-off { background: #F3ECE0; border-radius: 999px; padding: 2rpx 12rpx; }
.g-off-t { font-size: 18rpx; color: $faint; }
.gmeta { display: block; font-size: 21rpx; color: $faint; margin-top: 6rpx; }
.gc-topic { display: flex; align-items: flex-start; gap: 10rpx; margin-top: 14rpx; }
.gc-topic-tag {
  flex-shrink: 0; font-size: 18rpx; color: #A8791F;
  background: rgba(201, 169, 110, 0.16); border-radius: 6rpx; padding: 3rpx 10rpx;
}
.gc-topic-t { flex: 1; font-size: 22rpx; color: $sub; line-height: 1.5; }
.gc-leader-av { flex-shrink: 0; margin-left: 20rpx; }
.face-sa { width: 56rpx; height: 56rpx; border-radius: 50%; border: 3rpx solid #fff; }
.face {
  width: 56rpx; height: 56rpx; border-radius: 50%;
  border: 3rpx solid #fff;
  background: linear-gradient(135deg, #E9DDC9, #C9A96E);
  display: flex; align-items: center; justify-content: center;
}
.face-img { width: 56rpx; height: 56rpx; border-radius: 50%; border: 3rpx solid #fff; }
.face-t { font-size: 18rpx; color: #fff; }

/* 全体成员行 */
.mrow {
  display: flex; gap: 24rpx; align-items: center;
  padding: 24rpx 28rpx; margin-bottom: 20rpx;
  background: $card; border: 1rpx solid $line; border-radius: 28rpx;
}
.mr-av-wrap { width: 76rpx; height: 76rpx; flex-shrink: 0; border-radius: 50%; }
.mr-av {
  width: 76rpx; height: 76rpx; border-radius: 50%;
  background: linear-gradient(135deg, #E9DDC9, #D8C4A0);
  display: flex; align-items: center; justify-content: center;
}
.mr-av-img { width: 76rpx; height: 76rpx; border-radius: 50%; }
.mr-av-t { font-size: 30rpx; color: #fff; }
.mr-info { flex: 1; min-width: 0; }
.mr-name-row { display: flex; align-items: center; gap: 10rpx; flex-wrap: wrap; }
.mr-name { font-size: 28rpx; font-weight: 600; color: $ink; }
.chip { border-radius: 999px; padding: 2rpx 14rpx; }
.chip-signed { background: $red; }
.chip-share { background: #F3ECE0; }
.chip-norm { background: $line; }
.chip-t { font-size: 18rpx; }
.chip-signed-t { color: #fff; }
.chip-share-t { color: #A8791F; }
.chip-norm-t { color: $sub; }
.mr-meta { display: block; font-size: 21rpx; color: $faint; margin-top: 6rpx; }

.bottom-safe { height: 24rpx; }

/* 三态 */
.state-box { padding: 128rpx 40rpx; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.state-text { font-size: 26rpx; color: $faint; text-align: center; line-height: 1.7; }
.spinner {
  width: 56rpx; height: 56rpx;
  border: 6rpx solid #F0EAE0; border-top-color: $gold; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 8rpx; padding: 12rpx 40rpx; border: 1rpx solid $gold; border-radius: 999px; }
.retry-text { font-size: 26rpx; color: #A8791F; }

/* 底部申请栏 */
.footer {
  position: fixed; bottom: 0; left: 0; right: 0;
  padding: 20rpx 40rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: $paper; border-top: 1rpx solid $line;
}
.footer-btn {
  display: flex; align-items: center; justify-content: center;
  height: 88rpx; background: $red; border-radius: 16rpx;
}
.footer-btn-text { font-size: 28rpx; color: #fff; font-weight: 500; }
</style>
