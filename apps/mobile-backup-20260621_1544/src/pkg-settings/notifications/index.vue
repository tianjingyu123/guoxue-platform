<template>
  <view class="page">
    <app-nav-bar
      title="通知设置"
      :back-icon="'arrow-left'"
      :back-size="40"
      :title-size="36"
      :title-weight="600"
      :bar-height="100"
      title-align="left"
    />

    <scroll-view
      scroll-y
      class="scroll"
    >
      <view class="content">
        <!-- 总开关 -->
        <view class="card master">
          <view class="master-l">
            <view
              class="master-ic"
              :class="{ off: !pushEnabled }"
            >
              <app-icon
                :name="pushEnabled ? 'bell' : 'bell-off'"
                :size="20"
                :color="pushEnabled ? '#c41e3a' : '#a39a8c'"
              />
            </view>
            <view>
              <text class="master-title">
                接收推送通知
              </text>
              <text class="master-desc">
                {{ pushEnabled ? '已开启，将收到各类通知提醒' : '已关闭，将不会收到任何推送' }}
              </text>
            </view>
          </view>
          <switch
            :checked="pushEnabled"
            color="#c41e3a"
            style="transform:scale(0.8)"
            @change="pushEnabled=($event as any).detail.value"
          />
        </view>

        <!-- 总开关关闭时禁用 -->
        <view :class="{ disabled: !pushEnabled }">
          <!-- 互动通知 -->
          <view class="card">
            <view class="card-hd">
              <text class="card-hd-text">
                互动通知
              </text>
            </view>
            <view class="rows">
              <notify-row
                v-for="r in interactRows"
                :key="r.key"
                :icon="r.icon"
                :title="r.title"
                :desc="r.desc"
                :checked="state[r.key]"
                @change="state[r.key]=$event"
              />
            </view>
          </view>
          <!-- 内容更新 -->
          <view class="card">
            <view class="card-hd">
              <text class="card-hd-text">
                内容更新
              </text>
            </view>
            <view class="rows">
              <notify-row
                v-for="r in contentRows"
                :key="r.key"
                :icon="r.icon"
                :title="r.title"
                :desc="r.desc"
                :checked="state[r.key]"
                @change="state[r.key]=$event"
              />
            </view>
          </view>
          <!-- 交易通知 -->
          <view class="card">
            <view class="card-hd">
              <text class="card-hd-text">
                交易通知
              </text>
            </view>
            <view class="rows">
              <notify-row
                v-for="r in tradeRows"
                :key="r.key"
                :icon="r.icon"
                :title="r.title"
                :desc="r.desc"
                :important="r.important"
                :checked="state[r.key]"
                @change="state[r.key]=$event"
              />
            </view>
          </view>
          <!-- 系统通知 -->
          <view class="card">
            <view class="card-hd">
              <text class="card-hd-text">
                系统通知
              </text>
            </view>
            <view class="rows">
              <notify-row
                v-for="r in systemRows"
                :key="r.key"
                :icon="r.icon"
                :title="r.title"
                :desc="r.desc"
                :checked="state[r.key]"
                @change="state[r.key]=$event"
              />
            </view>
          </view>
          <!-- 免打扰模式 -->
          <view class="card">
            <view class="card-hd">
              <text class="card-hd-text">
                免打扰模式
              </text>
            </view>
            <view class="rows">
              <view class="row">
                <view class="row-l">
                  <view class="row-ic purple">
                    <app-icon
                      name="moon"
                      :size="16"
                      color="#9254de"
                    />
                  </view>
                  <view>
                    <text class="row-title">
                      开启免打扰
                    </text>
                    <text class="row-desc">
                      在指定时间段内不接收推送通知
                    </text>
                  </view>
                </view>
                <switch
                  :checked="quietMode"
                  color="#c41e3a"
                  style="transform:scale(0.8)"
                  @change="quietMode=($event as any).detail.value"
                />
              </view>
              <view
                v-if="quietMode"
                class="row quiet-time"
              >
                <text class="quiet-label">
                  免打扰时段
                </text>
                <view class="time-picks">
                  <picker
                    mode="selector"
                    :range="times"
                    :value="times.indexOf(quietStart)"
                    @change="quietStart=times[$event.detail.value]"
                  >
                    <view class="time-box">
                      <text class="time-text">
                        {{ quietStart }}
                      </text>
                    </view>
                  </picker>
                  <text class="time-sep">
                    -
                  </text>
                  <picker
                    mode="selector"
                    :range="times"
                    :value="times.indexOf(quietEnd)"
                    @change="quietEnd=times[$event.detail.value]"
                  >
                    <view class="time-box">
                      <text class="time-text">
                        {{ quietEnd }}
                      </text>
                    </view>
                  </picker>
                </view>
              </view>
            </view>
          </view>
        </view>

        <text class="footer-tip">
          关闭通知后，您仍可在消息中心查看相关消息
        </text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const pushEnabled = ref(true)
const quietMode = ref(true)
const quietStart = ref('22:00')
const quietEnd = ref('08:00')

const times = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

const state = reactive<Record<string, boolean>>({
  comment: true, like: true, follow: true, mention: true, message: true,
  circleUpdate: true, liveStart: true, courseUpdate: true, activityRemind: true,
  order: true, income: true, expiry: true,
  system: true, promotion: false,
})

const interactRows = [
  { key: 'comment', icon: 'message-circle', title: '评论通知', desc: '有人评论您的内容时通知' },
  { key: 'like', icon: 'heart', title: '点赞通知', desc: '有人点赞您的内容时通知' },
  { key: 'follow', icon: 'users', title: '关注通知', desc: '有人关注您时通知' },
  { key: 'mention', icon: 'message-circle', title: '@提及通知', desc: '有人@您时通知' },
  { key: 'message', icon: 'message-circle', title: '私信通知', desc: '收到私信时通知' },
]
const contentRows = [
  { key: 'circleUpdate', icon: 'users', title: '圈子更新', desc: '关注的圈子有新内容时通知' },
  { key: 'liveStart', icon: 'video', title: '直播开播', desc: '预约的直播开播时通知' },
  { key: 'courseUpdate', icon: 'smartphone', title: '课程更新', desc: '订阅的课程有新章节时通知' },
  { key: 'activityRemind', icon: 'calendar', title: '活动提醒', desc: '报名的活动即将开始时通知' },
]
const tradeRows = [
  { key: 'order', icon: 'shopping-bag', title: '订单通知', desc: '订单状态变更时通知（发货、完成等）' },
  { key: 'income', icon: 'coins', title: '收益通知', desc: '有新收益到账时通知' },
  { key: 'expiry', icon: 'clock', title: '到期提醒', desc: '会员、圈子等即将到期时通知', important: true },
]
const systemRows = [
  { key: 'system', icon: 'bell', title: '系统消息', desc: '平台公告、安全提醒等重要通知' },
  { key: 'promotion', icon: 'mail', title: '营销推广', desc: '优惠活动、新功能推荐等' },
]
</script>

<style scoped>
.page { min-height: 100vh; background: #faf8f5; display: flex; flex-direction: column; }
.scroll { flex: 1; height: 0; }
.content { padding: 24rpx; padding-bottom: 80rpx; }

.card { background: #ffffff; border-radius: 24rpx; overflow: hidden; margin-bottom: 24rpx; }
.card-hd { padding: 20rpx 28rpx; border-bottom: 1rpx solid #f0ece4; }
.card-hd-text { font-size: 22rpx; color: #a39a8c; font-weight: 500; }
.rows { display: flex; flex-direction: column; }

.master { display: flex; align-items: center; justify-content: space-between; padding: 28rpx; }
.master-l { display: flex; align-items: center; gap: 22rpx; }
.master-ic { width: 72rpx; height: 72rpx; border-radius: 20rpx; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; }
.master-ic.off { background: #f0ece4; }
.master-title { font-size: 28rpx; font-weight: 500; color: #2c2c2c; display: block; }
.master-desc { font-size: 22rpx; color: #a39a8c; margin-top: 4rpx; display: block; }

.disabled { opacity: 0.5; pointer-events: none; }

.row { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 28rpx; border-bottom: 1rpx solid #f5f1ea; }
.row:last-child { border-bottom: none; }
.row-l { display: flex; align-items: center; gap: 20rpx; }
.row-ic { width: 56rpx; height: 56rpx; border-radius: 14rpx; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.row-ic.purple { background: rgba(146,84,222,0.1); }
.row-title { font-size: 28rpx; font-weight: 500; color: #2c2c2c; display: block; }
.row-desc { font-size: 20rpx; color: #a39a8c; margin-top: 2rpx; display: block; }

.quiet-time { padding-left: 28rpx; }
.quiet-label { font-size: 28rpx; color: #a39a8c; margin-left: 76rpx; }
.time-picks { display: flex; align-items: center; gap: 12rpx; }
.time-box { background: #f5f1ea; border-radius: 10rpx; padding: 8rpx 18rpx; }
.time-text { font-size: 24rpx; color: #2c2c2c; }
.time-sep { color: #a39a8c; }

.footer-tip { display: block; text-align: center; font-size: 20rpx; color: #a39a8c; padding: 0 28rpx; margin-top: 8rpx; }
</style>
