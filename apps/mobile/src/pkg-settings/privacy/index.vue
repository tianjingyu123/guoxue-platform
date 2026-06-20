<template>
  <view class="page">
    <app-nav-bar
      title="隐私设置"
      :back-icon="'arrow-left'"
      :back-size="40"
      :title-size="32"
      :title-weight="600"
      :bar-height="112"
    />

    <scroll-view
      scroll-y
      class="scroll"
    >
      <view class="container">
        <!-- 个人信息可见性 -->
        <view class="card">
          <view class="card-head">
            <text class="card-head-txt">
              个人信息可见性
            </text>
          </view>
          <view class="rows">
            <view
              v-for="(it, idx) in visItems"
              :key="it.id"
              class="row"
              :class="{ 'no-border': idx === 0 }"
            >
              <view class="row-left">
                <view class="ic-wrap">
                  <app-icon
                    :name="it.icon"
                    :size="32"
                    color="#c41e3a"
                  />
                </view>
                <view class="row-info">
                  <text class="row-title">
                    {{ it.title }}
                  </text>
                  <text class="row-desc">
                    {{ it.desc }}
                  </text>
                </view>
              </view>
              <switch
                :checked="it.value"
                color="#c41e3a"
                style="transform:scale(0.85)"
                @change="it.value = !it.value"
              />
            </view>
          </view>
        </view>

        <!-- 互动权限 -->
        <view class="card">
          <view class="card-head">
            <text class="card-head-txt">
              互动权限
            </text>
          </view>
          <view class="rows">
            <view
              v-for="(sel, idx) in selItems"
              :key="sel.id"
              class="sel-block"
              :class="{ 'no-border': idx === 0 }"
            >
              <view class="sel-head">
                <view class="row-left">
                  <view class="ic-wrap">
                    <app-icon
                      :name="sel.icon"
                      :size="32"
                      color="#c41e3a"
                    />
                  </view>
                  <text class="row-title">
                    {{ sel.title }}
                  </text>
                </view>
                <view
                  class="sel-cur"
                  @click="sel.open = !sel.open"
                >
                  <text class="sel-cur-txt">
                    {{ curLabel(sel) }}
                  </text>
                  <app-icon
                    name="chevron-right"
                    :size="24"
                    color="#999"
                    :style="{ transform: sel.open ? 'rotate(90deg)' : 'rotate(0deg)' }"
                  />
                </view>
              </view>
              <view
                v-if="sel.open"
                class="sel-opts"
              >
                <view
                  v-for="opt in sel.options"
                  :key="opt.value"
                  class="opt"
                  :class="{ 'opt-on': sel.value === opt.value }"
                  @click="sel.value = opt.value; sel.open = false"
                >
                  <text
                    class="opt-txt"
                    :class="{ 'opt-txt-on': sel.value === opt.value }"
                  >
                    {{ opt.label }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 黑名单 -->
        <view class="card">
          <view
            class="blacklist"
            @click="go('/settings/blacklist')"
          >
            <view class="row-left">
              <view class="ic-wrap ic-red">
                <app-icon
                  name="user-x"
                  :size="32"
                  color="#e74c3c"
                />
              </view>
              <view class="row-info">
                <text class="row-title">
                  黑名单管理
                </text>
                <text class="row-desc">
                  已拉黑 3 人
                </text>
              </view>
            </view>
            <app-icon
              name="chevron-right"
              :size="28"
              color="#ccc"
            />
          </view>
        </view>

        <!-- 其他 -->
        <view class="card">
          <view class="card-head">
            <text class="card-head-txt">
              其他
            </text>
          </view>
          <view class="rows">
            <view
              v-for="(it, idx) in otherItems"
              :key="it.id"
              class="row"
              :class="{ 'no-border': idx === 0 }"
            >
              <view class="row-left">
                <view class="ic-wrap">
                  <app-icon
                    :name="it.icon"
                    :size="32"
                    color="#c41e3a"
                  />
                </view>
                <view class="row-info">
                  <text class="row-title">
                    {{ it.title }}
                  </text>
                  <text class="row-desc">
                    {{ it.desc }}
                  </text>
                </view>
              </view>
              <switch
                :checked="it.value"
                color="#c41e3a"
                style="transform:scale(0.85)"
                @change="it.value = !it.value"
              />
            </view>
          </view>
        </view>

        <text class="tip">
          隐私设置修改后立即生效，部分设置可能需要刷新页面查看效果
        </text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'

const visItems = ref([
  { id: 'online', icon: 'globe', title: '显示在线状态', desc: '其他用户可以看到您是否在线', value: true },
  { id: 'lastseen', icon: 'clock', title: '显示最后上线时间', desc: '其他用户可以看到您的最后活跃时间', value: true },
  { id: 'location', icon: 'map-pin', title: '显示位置信息', desc: '在内容中显示您的地理位置', value: false },
  { id: 'favorites', icon: 'heart', title: '公开收藏夹', desc: '其他用户可以查看您的收藏内容', value: true },
  { id: 'following', icon: 'users', title: '公开关注列表', desc: '其他用户可以查看您关注的人', value: true },
])

const selItems = ref([
  { id: 'message', icon: 'message-circle', title: '谁可以私信我', value: 'everyone', open: false,
    options: [{ label: '所有人', value: 'everyone' }, { label: '仅关注的人', value: 'following' }, { label: '关闭私信', value: 'none' }] },
  { id: 'comment', icon: 'message-circle', title: '谁可以评论我', value: 'everyone', open: false,
    options: [{ label: '所有人', value: 'everyone' }, { label: '仅关注的人', value: 'following' }, { label: '关闭评论', value: 'none' }] },
  { id: 'circle', icon: 'users', title: '我加入的圈子', value: 'members', open: false,
    options: [{ label: '所有人可见', value: 'everyone' }, { label: '仅成员可见', value: 'members' }, { label: '仅自己可见', value: 'private' }] },
])

const otherItems = ref([
  { id: 'history', icon: 'clock', title: '记录浏览历史', desc: '记录您浏览过的内容，方便回顾', value: true },
  { id: 'recommend', icon: 'eye', title: '个性化推荐', desc: '基于您的兴趣推荐相关内容', value: true },
])

function curLabel(sel: any) {
  return sel.options.find((o: any) => o.value === sel.value)?.label || ''
}
function go(path: string) {
  navigateTo(path)
}
</script>

<style scoped>
.page { min-height: 100vh; background: #faf8f5; }
.scroll { height: calc(100vh - 112rpx); }
.container { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }
.card { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.03); }
.card-head { padding: 20rpx 28rpx; border-bottom: 1rpx solid #f0ece5; }
.card-head-txt { font-size: 24rpx; color: #999; font-weight: 500; }
.rows { display: flex; flex-direction: column; }
.row { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 28rpx; border-top: 1rpx solid #f5f1ea; }
.row.no-border { border-top: none; }
.row-left { display: flex; align-items: center; gap: 20rpx; flex: 1; }
.ic-wrap { width: 56rpx; height: 56rpx; border-radius: 14rpx; background: rgba(196,30,46,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ic-wrap.ic-red { background: rgba(231,76,60,0.1); }
.row-info { display: flex; flex-direction: column; gap: 4rpx; }
.row-title { font-size: 28rpx; color: #2c2c2c; font-weight: 500; }
.row-desc { font-size: 20rpx; color: #999; }
.sel-block { padding: 24rpx 28rpx; border-top: 1rpx solid #f5f1ea; }
.sel-block.no-border { border-top: none; }
.sel-head { display: flex; align-items: center; justify-content: space-between; }
.sel-cur { display: flex; align-items: center; gap: 6rpx; }
.sel-cur-txt { font-size: 24rpx; color: #999; }
.sel-opts { margin-top: 16rpx; margin-left: 76rpx; display: flex; flex-wrap: wrap; gap: 16rpx; }
.opt { padding: 10rpx 24rpx; border-radius: 999rpx; background: #f5f1ea; }
.opt-on { background: #c41e3a; }
.opt-txt { font-size: 24rpx; color: #999; }
.opt-txt-on { color: #fff; }
.blacklist { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 28rpx; }
.tip { font-size: 20rpx; color: #999; text-align: center; padding: 8rpx 28rpx; }
</style>
