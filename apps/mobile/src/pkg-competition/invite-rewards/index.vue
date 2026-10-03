<template>
  <view class="a15-page">
    <scroll-view scroll-y class="a15-scroll">
      <!-- 朱红品牌头（自定义 navbar） -->
      <view class="a15-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="a15-nav-row">
          <view class="a15-icon-btn" @tap="onBack"><app-icon name="chevron-left" :size="22" color="#fff" /></view>
          <view class="a15-nav-title-wrap">
            <text class="a15-nav-title">我的邀请奖励</text>
            <text class="a15-nav-en">INVITATION REWARDS</text>
          </view>
          <view class="a15-icon-btn" />
        </view>
      </view>

      <view class="a15-body">
        <!-- ─────────── 战绩概览（占位·即将开放） ─────────── -->
        <view class="a15-blk">
          <view class="a15-stat3">
            <view class="a15-s"><text class="a15-n">—</text><text class="a15-l">已邀请</text></view>
            <view class="a15-s"><text class="a15-n red">—</text><text class="a15-l">已参赛</text></view>
            <view class="a15-s"><text class="a15-n gold">—</text><text class="a15-l">TA 获奖</text></view>
          </view>
        </view>

        <!-- ─────────── 功能预告主卡 ─────────── -->
        <view class="a15-preview">
          <view class="a15-preview-badge"><app-icon name="gift" :size="26" color="#C9A96E" /></view>
          <text class="a15-preview-title">邀请奖励明细即将开放</text>
          <text class="a15-preview-desc">「我邀请的人」列表与「连带奖励发放公示」正在建设中，稍后将在此透明展示每一笔奖励的结算与发放状态。当前你可以先邀请好友同台参赛。</text>
          <view class="a15-preview-btn" @tap="goInvite">
            <text class="a15-preview-btn-txt">去邀请好友</text>
          </view>
        </view>

        <!-- ─────────── 邀请规则摘要（来自 A14 邀请机制） ─────────── -->
        <view class="a15-sec">
          <view class="a15-sec-ln" />
          <text class="a15-sec-title">邀请奖励规则</text>
        </view>
        <view class="a15-rules">
          <view v-for="(r, i) in rules" :key="i" class="a15-rule">
            <view class="a15-rule-ico"><app-icon :name="r.icon" :size="18" color="#C41E3A" /></view>
            <view class="a15-rule-body">
              <text class="a15-rule-h">{{ r.title }}</text>
              <text class="a15-rule-sub">{{ r.desc }}</text>
            </view>
          </view>
        </view>

        <!-- ─────────── 发放公示占位（高透明说明） ─────────── -->
        <view class="a15-sec">
          <view class="a15-sec-ln" />
          <text class="a15-sec-title">发放公示</text>
        </view>
        <view class="a15-pub-empty">
          <app-icon name="shield-check" :size="34" color="#d8cfc0" />
          <text class="a15-pub-empty-h">暂无发放记录</text>
          <text class="a15-pub-empty-sub">当你邀请的好友取得赛事战绩，触发的连带奖励将在此逐笔公示（待发放 / 已发放）。</text>
        </view>

        <!-- 透明红线说明 -->
        <view class="a15-tip">
          <text class="a15-tip-txt">发放状态以后端结算为准，前端只展示不复算金额。资金 / 实物动作由平台履约，公开透明可追溯。荣誉同享，非拉人头返利。</text>
        </view>

        <view class="a15-safe" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch {}

// 邀请奖励规则摘要（来自 A14 邀请机制说明·静态文案·非后端数据）
interface RuleItem { icon: string; title: string; desc: string }
const rules: RuleItem[] = [
  { icon: 'user-plus', title: '邀好友同台竞技', desc: '通过你的邀请链接报名参赛，即与你建立邀请关系。' },
  { icon: 'award', title: 'TA 获奖·你同享连带奖', desc: '被邀请人在赛事中获得名次，你可获得一份连带奖励。' },
  { icon: 'shield-check', title: '发放高透明可追溯', desc: '每笔奖励的结算与发放状态公开公示，前端只展示不复算。' },
]

function onBack() { goBack() }
// 引导去 A14 邀请页（邀请机制说明）
function goInvite() { navigateTo('/pkg-competition/invite/index') }
</script>

<style lang="scss" scoped>
.a15-page { height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }
.a15-scroll { flex: 1; height: 0; min-height: 0; }

/* 朱红品牌头 */
.a15-nav { background: linear-gradient(135deg, #C41E3A, #a01830); padding-bottom: 20px; }
.a15-nav-row { display: flex; align-items: center; justify-content: space-between; min-height: 46px; padding: 0 14px; }
.a15-icon-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.a15-nav-title-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; }
.a15-nav-title { font-size: 20px; font-weight: 800; color: #fff; letter-spacing: 1px; font-family: 'Songti SC', 'STSong', serif; }
.a15-nav-en { font-size: 9px; letter-spacing: 3px; color: rgba(255, 255, 255, 0.6); margin-top: 2px; }

.a15-body { padding: 18px 20px 40px; }
.a15-blk { margin-bottom: 18px; }

/* 战绩概览三宫格（占位显 —） */
.a15-stat3 { display: flex; background: linear-gradient(160deg, #fff, #fdf8ef); border: 1px solid #efe4d3; border-radius: 18px; padding: 18px 0; box-shadow: 0 6px 20px rgba(160, 120, 60, 0.08); }
.a15-s { flex: 1; display: flex; flex-direction: column; align-items: center; }
.a15-s + .a15-s { border-left: 1px solid #f0e8da; }
.a15-n { font-size: 26px; font-weight: 800; color: #2C2C2C; font-family: 'Songti SC', serif; }
.a15-n.gold { color: #C9A96E; }
.a15-n.red { color: #C41E3A; }
.a15-l { font-size: 11px; color: #999; margin-top: 4px; }

/* 功能预告主卡 */
.a15-preview { background: #fff; border: 1px solid #efe4d3; border-radius: 18px; padding: 26px 22px; text-align: center; box-shadow: 0 6px 20px rgba(160, 120, 60, 0.08); margin-bottom: 22px; display: flex; flex-direction: column; align-items: center; }
.a15-preview-badge { width: 68px; height: 68px; border-radius: 20px; background: linear-gradient(135deg, #faf3e6, #f1e4c4); border: 1px solid #e3d5b0; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.a15-preview-title { font-size: 17px; font-weight: 800; color: #2C2C2C; font-family: 'Songti SC', serif; margin-bottom: 10px; }
.a15-preview-desc { font-size: 12.5px; color: #6E6E73; line-height: 1.85; margin-bottom: 22px; }
.a15-preview-btn { background: linear-gradient(135deg, #C41E3A, #a01830); border-radius: 999px; padding: 13px 40px; box-shadow: 0 6px 16px rgba(196, 30, 58, 0.28); }
.a15-preview-btn-txt { font-size: 15px; font-weight: 700; color: #fff; }

/* 段标题 */
.a15-sec { display: flex; align-items: center; gap: 7px; margin: 22px 0 12px; }
.a15-sec-ln { width: 3px; height: 14px; background: #C41E3A; border-radius: 2px; }
.a15-sec-title { font-size: 15px; font-weight: 700; color: #2C2C2C; font-family: 'Songti SC', serif; }

/* 规则卡 */
.a15-rules { background: #fff; border: 1px solid #efe4d3; border-radius: 18px; overflow: hidden; box-shadow: 0 3px 12px rgba(160, 120, 60, 0.05); }
.a15-rule { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #f2ede4; }
.a15-rule:last-child { border-bottom: none; }
.a15-rule-ico { width: 36px; height: 36px; border-radius: 10px; background: rgba(196, 30, 58, 0.07); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.a15-rule-body { flex: 1; min-width: 0; }
.a15-rule-h { display: block; font-size: 14px; font-weight: 700; color: #2C2C2C; }
.a15-rule-sub { display: block; font-size: 11.5px; color: #999; margin-top: 4px; line-height: 1.6; }

/* 发放公示空态 */
.a15-pub-empty { background: #fff; border: 1px solid #efe4d3; border-radius: 18px; padding: 32px 24px; text-align: center; box-shadow: 0 3px 12px rgba(160, 120, 60, 0.05); display: flex; flex-direction: column; align-items: center; }
.a15-pub-empty-h { font-size: 14px; font-weight: 700; color: #6E6E73; margin-top: 12px; }
.a15-pub-empty-sub { font-size: 12px; color: #a59b8c; margin-top: 8px; line-height: 1.7; }

/* 透明红线说明 */
.a15-tip { background: #faf6ef; border-radius: 12px; padding: 12px 14px; margin-top: 14px; }
.a15-tip-txt { font-size: 11px; color: #a59b8c; line-height: 1.75; }

.a15-safe { height: 30px; }
</style>
