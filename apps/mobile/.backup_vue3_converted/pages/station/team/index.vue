<template>
  <view class="min-h-screen" style="background-color:#FAF8F5">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10" style="background-color:#FAF8F5;border-bottom:1px solid #E8E0D5">
      <view class="flex items-center justify-between px-4" style="height:56px">
        <view class="flex items-center gap-3">
          <view class="p-1" @click="goBack">
            <text class="text-xl" style="color:#2C2C2C">←</text>
          </view>
          <text class="text-lg font-semibold" style="color:#2C2C2C">团队管理</text>
        </view>
        <view
          class="px-3 py-1.5 rounded-lg text-sm text-white flex items-center gap-1"
          style="background-color:#C41E3A"
          @click="handleInvite"
        >
          <text class="text-xs"></text>
          <text>邀请下级</text>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="flex items-center justify-center" style="padding:120px 0">
      <view class="text-center">
        <text class="text-4xl block mb-3 opacity-50"></text>
        <text class="text-sm" style="color:#999">加载中...</text>
      </view>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="flex items-center justify-center" style="padding:120px 0">
      <view class="text-center px-4">
        <text class="text-4xl block mb-3"></text>
        <text class="text-sm block mb-4" style="color:#999">{{ error }}</text>
        <view
          class="inline-block px-6 py-2 rounded-lg text-sm text-white"
          style="background-color:#C41E3A"
          @click="loadData"
        >
          重新加载
        </view>
      </view>
    </view>

    <!-- 主内容 -->
    <view v-else class="pb-20">
      <!-- 概览卡片 -->
      <view class="p-4" style="background:linear-gradient(135deg,rgba(196,30,58,0.1),rgba(196,30,58,0.05))">
        <view class="grid grid-cols-2 gap-3">
          <view class="rounded-xl p-4 shadow-sm" style="background-color:#FFF">
            <view class="flex items-center gap-2 mb-2" style="color:#999">
              <text class="text-base"></text>
              <text class="text-sm">团队总人数</text>
            </view>
            <text class="text-2xl font-bold" style="color:#2C2C2C">{{ overview.totalMembers }}</text>
            <text class="text-xs block mt-1" style="color:#22C55E">本月新增 +{{ overview.newMembersThisMonth }}</text>
          </view>
          <view class="rounded-xl p-4 shadow-sm" style="background-color:#FFF">
            <view class="flex items-center gap-2 mb-2" style="color:#999">
              <text class="text-base">👛</text>
              <text class="text-sm">累计佣金</text>
            </view>
            <text class="text-2xl font-bold" style="color:#C41E3A">{{ overview.totalCommission.toFixed(2) }}</text>
            <text class="text-xs block mt-1" style="color:#999">元</text>
          </view>
          <view class="rounded-xl p-4 shadow-sm" style="background-color:#FFF">
            <view class="flex items-center gap-2 mb-2" style="color:#999">
              <text class="text-base"></text>
              <text class="text-sm">提成比例</text>
            </view>
            <text class="text-2xl font-bold" style="color:#2C2C2C">{{ overview.commissionRate }}%</text>
            <text class="text-xs block mt-1" style="color:#999">{{ overview.myLevel }}</text>
          </view>
          <view class="rounded-xl p-4 shadow-sm" style="background-color:#FFF">
            <view class="flex items-center gap-2 mb-2" style="color:#999">
              <text class="text-base">📈</text>
              <text class="text-sm">升级进度</text>
            </view>
            <view class="mt-2">
              <view class="h-2 rounded-full overflow-hidden" style="background-color:#F1EDE8">
                <view
                  class="h-full rounded-full transition-all"
                  :style="{ width: progressPercent + '%', backgroundColor: '#C41E3A' }"
                />
              </view>
              <text class="text-xs block mt-1" style="color:#999">距下一等级还需 {{ nextLevelRemain }} 元</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Tab 切换 -->
      <view class="mt-4 px-4">
        <view class="flex rounded-lg p-1" style="background-color:#F1EDE8">
          <view
            v-for="tab in tabs"
            :key="tab.value"
            class="flex-1 text-center py-2 text-sm font-medium rounded-md"
            :class="activeTab === tab.value ? 'shadow-sm' : ''"
            :style="activeTab === tab.value ? 'background-color:#FFF;color:#2C2C2C' : 'color:#999'"
            @click="activeTab = tab.value"
          >
            <text>{{ tab.label }}</text>
          </view>
        </view>
      </view>

      <!-- 成员列表 -->
      <view v-if="activeTab === 'members'" class="mt-4 px-4">
        <!-- 筛选与排序栏 -->
        <view class="flex items-center gap-2 mb-4 flex-wrap">
          <view
            v-for="f in memberFilters"
            :key="f.value"
            class="px-3 py-1.5 rounded-lg text-xs"
            :style="memberFilter === f.value ? 'background-color:#C41E3A;color:#FFF' : 'background-color:#FFF;border:1px solid #E8E0D5;color:#999'"
            @click="memberFilter = f.value"
          >
            <text>{{ f.label }}</text>
          </view>
          <view style="flex:1" />
          <view
            v-for="s in memberSorts"
            :key="s.value"
            class="px-2 py-1.5 rounded-lg text-xs"
            :style="memberSort === s.value ? 'background-color:#C41E3A;color:#FFF' : 'background-color:#FFF;border:1px solid #E8E0D5;color:#999'"
            @click="memberSort = s.value"
          >
            <text>{{ s.label }}</text>
          </view>
        </view>

        <view class="space-y-3">
          <view
            v-for="member in members"
            :key="member.id"
            class="rounded-xl p-4 border"
            style="background-color:#FFF;border-color:#E8E0D5"
            @click="viewMemberDetail(member)"
          >
            <view class="flex items-start gap-3">
              <view class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style="background-color:rgba(196,30,58,0.1)">
                <image v-if="member.avatar" :src="member.avatar" mode="aspectFill" class="w-full h-full" />
                <text v-else class="text-base" style="color:#C41E3A">{{ member.nickname.charAt(0) }}</text>
              </view>
              <view class="flex-1" style="min-width:0">
                <view class="flex items-center gap-2 flex-wrap">
                  <text class="font-medium truncate" style="color:#2C2C2C">{{ member.nickname }}</text>
                  <text class="text-[10px] px-1.5 py-0.5 rounded" style="background-color:#F1EDE8;color:#999">{{ member.levelIcon }} {{ member.level }}</text>
                  <text v-if="member.status === 'inactive'" class="text-[10px] px-1.5 py-0.5 rounded border" style="border-color:#E8E0D5;color:#999">不活跃</text>
                </view>
                <text class="text-sm block mt-1" style="color:#999">{{ member.phone }} · 加入于 {{ member.joinDate }}</text>
                <view class="flex items-center gap-4 mt-2 text-sm" style="color:#2C2C2C">
                  <text>佣金 <text class="font-medium" style="color:#C41E3A">{{ member.totalCommission.toFixed(2) }}</text></text>
                  <text>邀请 <text class="font-medium" style="color:#2C2C2C">{{ member.inviteCount }}</text> 人</text>
                </view>
              </view>
              <text class="text-sm" style="color:#999">›</text>
            </view>
          </view>

          <!-- 空状态 -->
          <view v-if="members.length === 0" class="text-center py-12" style="color:#999">
            <text class="text-4xl block mb-3 opacity-50"></text>
            <text>暂无团队成员</text>
            <view class="mt-2" style="color:#C41E3A" @click="handleInvite">
              <text>立即邀请下级</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 排行榜 -->
      <view v-if="activeTab === 'leaderboard'" class="mt-4 px-4">
        <!-- 周期选择 -->
        <view class="flex gap-2 mb-4">
          <view
            v-for="p in periods"
            :key="p.value"
            class="px-4 py-1.5 rounded-lg text-xs"
            :style="leaderboardPeriod === p.value ? 'background-color:#C41E3A;color:#FFF' : 'background-color:#FFF;border:1px solid #E8E0D5;color:#999'"
            @click="leaderboardPeriod = p.value"
          >
            <text>{{ p.label }}</text>
          </view>
        </view>

        <view class="space-y-3">
          <view
            v-for="item in leaderboard"
            :key="item.userId"
            class="rounded-xl p-4"
            :style="item.rank <= 3
              ? 'background:linear-gradient(to right,rgba(196,30,58,0.05),transparent);border-left:4px solid #C41E3A'
              : 'background-color:#FFF;border:1px solid #E8E0D5'"
          >
            <view class="flex items-center gap-3">
              <view
                class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                :style="getRankStyle(item.rank)"
              >
                <text>{{ item.rank }}</text>
              </view>
              <view class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style="background-color:#F1EDE8">
                <image v-if="item.avatar" :src="item.avatar" mode="aspectFill" class="w-full h-full" />
                <text v-else class="text-sm" style="color:#2C2C2C">{{ item.nickname.charAt(0) }}</text>
              </view>
              <view class="flex-1" style="min-width:0">
                <view class="flex items-center gap-2">
                  <text class="font-medium truncate" style="color:#2C2C2C">{{ item.nickname }}</text>
                  <text v-if="item.rank <= 3" class="text-sm">{{ rankIcons[item.rank - 1] }}</text>
                </view>
                <text class="text-xs block" style="color:#999">{{ item.level }}</text>
              </view>
              <view class="text-right">
                <text class="font-bold" style="color:#C41E3A">{{ item.value.toFixed(2) }}</text>
                <view class="text-xs flex items-center justify-end gap-1">
                  <text v-if="item.change > 0" style="color:#22C55E">↗ +{{ item.change }}</text>
                  <text v-else-if="item.change < 0" style="color:#EF4444">↘ {{ item.change }}</text>
                  <text v-else style="color:#999">-</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 我的排名 -->
          <view v-if="myRank" class="mt-6 p-4 rounded-xl" style="background-color:rgba(196,30,58,0.05);border:1px solid rgba(196,30,58,0.2)">
            <text class="text-sm block mb-1" style="color:#999">我的排名</text>
            <text class="text-2xl font-bold" style="color:#2C2C2C">第 {{ myRank }} 名</text>
          </view>
        </view>
      </view>

      <!-- 团队动态 -->
      <view v-if="activeTab === 'activities'" class="mt-4 px-4">
        <view class="relative">
          <!-- 时间线 -->
          <view class="absolute top-0 bottom-0" style="left:21px;width:2px;background-color:#E8E0D5" />

          <view class="space-y-4">
            <view v-for="activity in activities" :key="activity.id" class="relative" style="padding-left:48px">
              <!-- 时间点 -->
              <view class="absolute w-4 h-4 rounded-full flex items-center justify-center text-[10px]" style="left:12px;top:4px;background-color:#FFF;border:2px solid #C41E3A">
                <text>{{ getActivityTypeIcon(activity.type) }}</text>
              </view>

              <view class="rounded-xl p-4 border" style="background-color:#FFF;border-color:#E8E0D5">
                <view class="flex items-start gap-3">
                  <view class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style="background-color:#F1EDE8">
                    <image v-if="activity.userAvatar" :src="activity.userAvatar" mode="aspectFill" class="w-full h-full" />
                    <text v-else class="text-sm" style="color:#2C2C2C">{{ activity.userNickname.charAt(0) }}</text>
                  </view>
                  <view class="flex-1">
                    <view>
                      <text class="font-medium" style="color:#2C2C2C">{{ activity.userNickname }}</text>
                      <text class="ml-2 text-sm" style="color:#999">{{ activity.content }}</text>
                    </view>
                    <view v-if="activity.amount" class="font-medium mt-1" style="color:#C41E3A">
                      <text>+{{ activity.amount.toFixed(2) }} 元</text>
                    </view>
                    <view class="text-xs mt-2 flex items-center gap-1" style="color:#999">
                      <text>🕐</text>
                      <text>{{ activity.createdAt }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <!-- 空状态 -->
            <view v-if="activities.length === 0" class="text-center py-12" style="color:#999">
              <text class="text-4xl block mb-3 opacity-50">🕐</text>
              <text>暂无团队动态</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 成功案例 -->
      <view v-if="activeTab === 'cases'" class="mt-4 px-4">
        <view class="space-y-4">
          <view v-for="c in successCases" :key="c.id" class="rounded-xl p-4 border" style="background-color:#FFF;border-color:#E8E0D5">
            <view class="flex items-start gap-3 mb-3">
              <view class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style="background-color:#F1EDE8">
                <image v-if="c.avatar" :src="c.avatar" mode="aspectFill" class="w-full h-full" />
                <text v-else class="text-base" style="color:#2C2C2C">{{ c.nickname.charAt(0) }}</text>
              </view>
              <view>
                <text class="font-medium block" style="color:#2C2C2C">{{ c.nickname }}</text>
                <view class="flex items-center gap-2 mt-1">
                  <text class="text-[10px] px-2 py-0.5 rounded" style="background-color:rgba(196,30,58,0.1);color:#C41E3A">{{ c.achievement }}</text>
                  <text class="text-xs" style="color:#999">加入 {{ c.duration }}</text>
                </view>
              </view>
            </view>
            <text class="font-medium block mb-2" style="color:#2C2C2C">{{ c.title }}</text>
            <text class="text-sm block" style="color:#999;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">{{ c.description }}</text>
            <view class="flex items-center justify-between mt-4 pt-3" style="border-top:1px solid #E8E0D5">
              <text class="text-sm" style="color:#999">累计收益</text>
              <text class="font-bold" style="color:#C41E3A">{{ c.totalEarnings.toFixed(2) }} 元</text>
            </view>
          </view>

          <!-- 空状态 -->
          <view v-if="successCases.length === 0" class="text-center py-12" style="color:#999">
            <text class="text-4xl block mb-3 opacity-50"></text>
            <text>暂无成功案例</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 邀请弹窗 -->
    <view v-if="showInvite" class="fixed inset-0 z-50 flex items-end justify-center" style="background-color:rgba(0,0,0,0.6)" @click="showInvite = false">
      <view class="w-full rounded-t-2xl" style="max-width:512px;background-color:#FFF" @click.stop>
        <view class="flex items-center justify-between p-4" style="border-bottom:1px solid #E8E0D5">
          <text class="font-semibold" style="color:#2C2C2C">邀请下级</text>
          <view @click="showInvite = false" class="p-1">
            <text class="text-lg" style="color:#999">✕</text>
          </view>
        </view>
        <view class="py-6 px-4 space-y-6">
          <!-- 二维码 -->
          <view class="flex flex-col items-center">
            <view class="w-48 h-48 rounded-xl flex items-center justify-center" style="background-color:#F1EDE8">
              <text class="text-6xl" style="color:#999"></text>
            </view>
            <text class="text-sm mt-2" style="color:#999">扫码加入我的团队</text>
          </view>

          <!-- 邀请链接 -->
          <view class="space-y-2">
            <text class="text-sm font-medium" style="color:#2C2C2C">邀请链接</text>
            <view class="flex gap-2">
              <input
                class="flex-1 px-3 py-2 rounded-lg text-sm"
                style="background-color:#F1EDE8;color:#2C2C2C"
                :value="inviteLink"
                readonly
              />
              <view
                class="px-4 py-2 rounded-lg text-sm text-white flex items-center gap-1"
                style="background-color:#C41E3A"
                @click="handleCopyLink"
              >
                <text></text>
                <text>复制</text>
              </view>
            </view>
          </view>

          <!-- 分享按钮 -->
          <view class="w-full py-3 rounded-xl text-center text-white text-sm flex items-center justify-center gap-2" style="background-color:#C41E3A">
            <text></text>
            <text>分享邀请海报</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 成员详情弹窗 -->
    <view v-if="showMemberDetail && selectedMember" class="fixed inset-0 z-50 flex items-end justify-center" style="background-color:rgba(0,0,0,0.6)" @click="showMemberDetail = false">
      <view class="w-full rounded-t-2xl" style="max-width:512px;background-color:#FFF;max-height:80vh;overflow:auto" @click.stop>
        <view class="flex items-center justify-between p-4 sticky top-0 z-10" style="background-color:#FFF;border-bottom:1px solid #E8E0D5">
          <text class="font-semibold" style="color:#2C2C2C">成员详情</text>
          <view @click="showMemberDetail = false" class="p-1">
            <text class="text-lg" style="color:#999">✕</text>
          </view>
        </view>
        <view class="py-4 px-4 space-y-4">
          <!-- 成员信息 -->
          <view class="flex items-center gap-4 p-4 rounded-xl" style="background-color:rgba(241,237,232,0.5)">
            <view class="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style="background-color:rgba(196,30,58,0.1)">
              <image v-if="selectedMember.avatar" :src="selectedMember.avatar" mode="aspectFill" class="w-full h-full" />
              <text v-else class="text-xl" style="color:#C41E3A">{{ selectedMember.nickname.charAt(0) }}</text>
            </view>
            <view>
              <text class="font-medium text-lg block" style="color:#2C2C2C">{{ selectedMember.nickname }}</text>
              <text class="text-[10px] px-2 py-0.5 rounded inline-flex items-center" style="background-color:#F1EDE8;color:#999">{{ selectedMember.levelIcon }} {{ selectedMember.level }}</text>
              <text class="text-sm block mt-1" style="color:#999">加入于 {{ selectedMember.joinDate }}</text>
            </view>
          </view>

          <!-- 业绩数据 -->
          <view class="grid grid-cols-3 gap-3">
            <view class="text-center p-3 rounded-xl border" style="background-color:#FFF;border-color:#E8E0D5">
              <text class="text-2xl font-bold block" style="color:#C41E3A">{{ selectedMember.totalCommission.toFixed(0) }}</text>
              <text class="text-xs" style="color:#999">累计佣金</text>
            </view>
            <view class="text-center p-3 rounded-xl border" style="background-color:#FFF;border-color:#E8E0D5">
              <text class="text-2xl font-bold block" style="color:#2C2C2C">{{ selectedMember.thisMonthCommission.toFixed(0) }}</text>
              <text class="text-xs" style="color:#999">本月佣金</text>
            </view>
            <view class="text-center p-3 rounded-xl border" style="background-color:#FFF;border-color:#E8E0D5">
              <text class="text-2xl font-bold block" style="color:#2C2C2C">{{ selectedMember.inviteCount }}</text>
              <text class="text-xs" style="color:#999">邀请人数</text>
            </view>
          </view>

          <!-- 近期订单 -->
          <view v-if="memberDetailData && memberDetailData.recentOrders">
            <text class="font-medium block mb-3" style="color:#2C2C2C">近期推广订单</text>
            <view class="space-y-2">
              <view v-for="order in memberDetailData.recentOrders" :key="order.id" class="flex items-center justify-between p-3 rounded-lg border" style="background-color:#FFF;border-color:#E8E0D5">
                <view>
                  <text class="text-sm" style="color:#2C2C2C">订单金额 {{ order.amount }} 元</text>
                  <text class="text-xs block" style="color:#999">{{ order.time }}</text>
                </view>
                <text class="font-medium" style="color:#C41E3A">+{{ order.commission.toFixed(2) }}</text>
              </view>
            </view>
          </view>

          <!-- 邀请的成员 -->
          <view v-if="memberDetailData && memberDetailData.invitedMembers && memberDetailData.invitedMembers.length > 0">
            <text class="font-medium block mb-3" style="color:#2C2C2C">邀请的成员</text>
            <view class="flex flex-wrap gap-3">
              <view v-for="m in memberDetailData.invitedMembers" :key="m.id" class="flex items-center gap-2 px-3 py-2 rounded-full" style="background-color:#F1EDE8">
                <view class="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden" style="background-color:rgba(196,30,58,0.1)">
                  <image v-if="m.avatar" :src="m.avatar" mode="aspectFill" class="w-full h-full" />
                  <text v-else class="text-[10px]" style="color:#C41E3A">{{ m.nickname.charAt(0) }}</text>
                </view>
                <text class="text-sm" style="color:#2C2C2C">{{ m.nickname }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// ---- 类型定义 ----
interface TeamOverview {
  totalMembers: number
  newMembersThisMonth: number
  totalCommission: number
  commissionRate: number
  myLevel: string
  nextLevelRequirement: number
}

interface TeamMember {
  id: number
  nickname: string
  avatar: string
  phone: string
  level: string
  levelIcon: string
  status: string
  joinDate: string
  totalCommission: number
  thisMonthCommission: number
  inviteCount: number
}

interface LeaderboardItem {
  userId: number
  rank: number
  nickname: string
  avatar: string
  level: string
  value: number
  change: number
}

interface TeamActivity {
  id: number
  type: string
  userNickname: string
  userAvatar: string
  content: string
  amount: number | null
  createdAt: string
}

interface TeamSuccessCase {
  id: number
  nickname: string
  avatar: string
  achievement: string
  duration: string
  title: string
  description: string
  totalEarnings: number
}

// ---- 响应式状态 ----
const activeTab = ref<string>('members')
const loading = ref<boolean>(true)
const error = ref<string | null>(null)

const memberFilter = ref<'all' | 'active' | 'inactive'>('all')
const memberSort = ref<'commission' | 'inviteCount' | 'joinDate'>('commission')
const leaderboardPeriod = ref<'week' | 'month' | 'all'>('month')

const showInvite = ref<boolean>(false)
const inviteLink = ref<string>('')
const inviteQrcode = ref<string>('')

const showMemberDetail = ref<boolean>(false)
const selectedMember = ref<TeamMember | null>(null)
const memberDetailData = ref<any>(null)

// ---- 主数据 ----
const overview = ref<TeamOverview>({
  totalMembers: 128,
  newMembersThisMonth: 12,
  totalCommission: 12680.00,
  commissionRate: 5,
  myLevel: '金牌推广员',
  nextLevelRequirement: 20000
})

const members = ref<TeamMember[]>([
  { id: 1, nickname: '张三丰', avatar: '', phone: '138****8888', level: '金牌推广员', levelIcon: '👑', status: 'active', joinDate: '2024-01-15', totalCommission: 12680, thisMonthCommission: 3560, inviteCount: 25 },
  { id: 2, nickname: '李易安', avatar: '', phone: '139****9999', level: '银牌推广员', levelIcon: '', status: 'active', joinDate: '2024-03-20', totalCommission: 8560, thisMonthCommission: 2180, inviteCount: 18 },
  { id: 3, nickname: '王玄机', avatar: '', phone: '137****7777', level: '铜牌推广员', levelIcon: '', status: 'active', joinDate: '2024-05-10', totalCommission: 3280, thisMonthCommission: 980, inviteCount: 8 },
  { id: 4, nickname: '赵无极', avatar: '', phone: '136****6666', level: '普通推广员', levelIcon: '', status: 'inactive', joinDate: '2024-06-01', totalCommission: 560, thisMonthCommission: 0, inviteCount: 2 },
])

const leaderboard = ref<LeaderboardItem[]>([
  { userId: 1, rank: 1, nickname: '张三丰', avatar: '', level: '金牌推广员', value: 12680, change: 5 },
  { userId: 2, rank: 2, nickname: '李易安', avatar: '', level: '银牌推广员', value: 8560, change: 3 },
  { userId: 3, rank: 3, nickname: '王玄机', avatar: '', level: '铜牌推广员', value: 3280, change: -1 },
  { userId: 4, rank: 4, nickname: '赵无极', avatar: '', level: '普通推广员', value: 560, change: 0 },
])

const myRank = ref<number | undefined>(4)

const activities = ref<TeamActivity[]>([
  { id: 1, type: 'invite', userNickname: '张三丰', userAvatar: '', content: '成功邀请新成员「易学小白」加入团队', amount: null, createdAt: '2025-01-15 14:30' },
  { id: 2, type: 'commission', userNickname: '李易安', userAvatar: '', content: '获得课程推广佣金', amount: 299, createdAt: '2025-01-15 10:20' },
  { id: 3, type: 'levelup', userNickname: '王玄机', userAvatar: '', content: '等级提升为「铜牌推广员」', amount: null, createdAt: '2025-01-14 16:00' },
  { id: 4, type: 'achievement', userNickname: '张三丰', userAvatar: '', content: '本月佣金突破10000元', amount: null, createdAt: '2025-01-13 09:15' },
])

const successCases = ref<TeamSuccessCase[]>([
  { id: 1, nickname: '张三丰', avatar: '', achievement: '金牌推广员', duration: '6个月', title: '从零到金牌推广员的成长之路', description: '通过系统学习推广技巧，积极分享课程内容，短短6个月发展成为团队核心成员，月佣金稳定在5000元以上。', totalEarnings: 52680 },
  { id: 2, nickname: '李易安', avatar: '', achievement: '银牌推广员', duration: '3个月', title: '宝妈也能做推广，月入3000+', description: '利用碎片时间分享国学课程，在宝妈群体中打开了市场，3个月积累18位下级成员，月均佣金3000元以上。', totalEarnings: 18560 },
])

// ---- UI 常量 ----
const tabs = [
  { value: 'members', label: '成员' },
  { value: 'leaderboard', label: '排行榜' },
  { value: 'activities', label: '动态' },
  { value: 'cases', label: '案例' },
]

const memberFilters = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '活跃' },
  { value: 'inactive', label: '不活跃' },
]

const memberSorts = [
  { value: 'commission', label: '按佣金' },
  { value: 'inviteCount', label: '按邀请数' },
  { value: 'joinDate', label: '按加入时间' },
]

const periods = [
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'all', label: '总榜' },
]

const rankIcons = ['', '', '']

// ---- 计算属性 ----
const progressPercent = computed(() => {
  if (!overview.value.nextLevelRequirement) return 0
  return Math.min((overview.value.totalCommission / overview.value.nextLevelRequirement) * 100, 100)
})

const nextLevelRemain = computed(() => {
  return (overview.value.nextLevelRequirement - overview.value.totalCommission).toFixed(0)
})

// ---- 方法 ----
function goBack() {
  uni.navigateBack()
}

async function loadData() {
  loading.value = true
  error.value = null
  try {
    // 模拟异步加载
    await new Promise(resolve => setTimeout(resolve, 200))
    // 数据已在 ref 初始化时设置
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

function getRankStyle(rank: number): string {
  if (rank === 1) return 'background:linear-gradient(135deg,#FCD34D,#EAB308);color:#FFF'
  if (rank === 2) return 'background:linear-gradient(135deg,#D1D5DB,#9CA3AF);color:#FFF'
  if (rank === 3) return 'background:linear-gradient(135deg,#D97706,#B45309);color:#FFF'
  return 'background-color:#F1EDE8;color:#999'
}

function getActivityTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    invite: '',
    commission: '',
    achievement: '',
    levelup: '⬆',
  }
  return icons[type] || ''
}

function handleInvite() {
  inviteLink.value = 'https://rebu.com/team/invite?code=ABC123'
  inviteQrcode.value = ''
  showInvite.value = true
}

function handleCopyLink() {
  uni.setClipboardData({
    data: inviteLink.value,
    success: () => {
      uni.showToast({ title: '链接已复制', icon: 'success' })
    }
  })
}

function viewMemberDetail(member: TeamMember) {
  selectedMember.value = member
  showMemberDetail.value = true
  // 模拟异步加载成员详情
  setTimeout(() => {
    memberDetailData.value = {
      recentOrders: [
        { id: 'ord_001', amount: 299, time: '2025-01-15 10:20', commission: 29.9 },
        { id: 'ord_002', amount: 199, time: '2025-01-14 15:30', commission: 19.9 },
        { id: 'ord_003', amount: 599, time: '2025-01-12 09:00', commission: 59.9 },
      ],
      invitedMembers: [
        { id: 101, nickname: '易学小白', avatar: '' },
        { id: 102, nickname: '周易达人', avatar: '' },
        { id: 103, nickname: '国学爱好者', avatar: '' },
      ]
    }
  }, 100)
}

// ---- 生命周期 ----
onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
@keyframes */
</style>
