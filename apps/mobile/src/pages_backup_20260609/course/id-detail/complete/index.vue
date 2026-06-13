<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text>←</text><text class="nav-title">学习完成</text></view><view style="width:48rpx"/></view>

    <scroll-view scroll-y class="content" :style="{paddingBottom:'160rpx'}">
      <view class="achieve-card"><view class="ac-bg"><text class="ac-icon">🏆</text><text class="ac-title">恭喜你完成学习！</text><text class="ac-course">《{{course.title}}》</text></view>
        <view class="ac-stats"><view class="acs"><text class="acs-val">⏰{{fmtDuration(course.totalDuration)}}</text><text class="acs-label">总学习时长</text></view><view class="acs"><text class="acs-val">📚{{course.chaptersCount}}节</text><text class="acs-label">完成章节</text></view><view class="acs"><text class="acs-val">⚡+{{course.earnedPoints}}</text><text class="acs-label">获得积分</text></view></view>
      </view>

      <view v-if="course.hasCertificate" class="cert-entry" @click="goCertificate"><view class="ce-icon">🎓</view><view class="ce-info"><text class="ce-title">结业证书已生成</text><text class="ce-sub">点击查看并下载你的专属证书</text></view><text>›</text></view>

      <view class="card"><text class="card-title">为课程评分</text>
        <view v-if="!isSubmitted">
          <view class="stars"><text v-for="s in 5" :key="s" class="star" :class="{fill:(hoverRating||rating)>=s}" @click="rating=s" @mouseenter="hoverRating=s" @mouseleave="hoverRating=0">{{(hoverRating||rating)>=s?'★':'☆'}}</text></view>
          <text class="rate-hint">{{rating===0?'点击星星评分':['很不满意','不太满意','一般','比较满意','非常满意'][rating-1]}}</text>
          <textarea v-model="review" class="review-input" placeholder="分享你的学习感受...（选填）" :rows="3"/>
          <view class="submit-btn" :class="{dis:rating===0||isSubmitting}" @click="handleSubmit">{{isSubmitting?'提交中...':'提交评价'}}</view>
        </view>
        <view v-else class="thanks"><text class="thanks-icon">✅</text><text class="thanks-title">感谢你的评价！</text><text class="thanks-sub">你的反馈将帮助更多学员</text></view>
      </view>

      <text class="rec-title">学完这门课的人还学了</text>
      <scroll-view scroll-x class="rec-scroll"><view v-for="c in recCourses" :key="c.id" class="rec-card"><view class="rc-cover">📚</view><text class="rc-name">{{c.title}}</text><text class="rc-instructor">{{c.instructor}}</text><view class="rc-bottom"><text class="rc-price">¥{{c.price}}</text><text class="rc-students">{{c.students}}人学习</text></view></view></scroll-view>

      <view class="thanks-card"><text class="tc-avatar">{{course.instructor[0]}}</text><view><text>来自讲师 {{course.instructor}}</text><text class="tc-msg">感谢你的学习，期待下次相见！</text></view></view>
    </scroll-view>

    <view class="bottom-bar"><view class="bb-btn" @click="goHome">返回首页</view><view class="bb-btn primary">📤 分享成就</view></view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const course={title:'八字入门实战课',instructor:'周易大师',totalDuration:1860,chaptersCount:24,earnedPoints:500,hasCertificate:true}
const recCourses=[{id:2,title:'八字进阶实战课',instructor:'周易大师',price:399,students:1024},{id:3,title:'紫微斗数精讲',instructor:'张玄风',price:299,students:856},{id:4,title:'八字看婚姻专题',instructor:'周易大师',price:199,students:628}]

const rating=ref(0),hoverRating=ref(0),review=ref(''),isSubmitting=ref(false),isSubmitted=ref(false)

function fmtDuration(m:number){const h=Math.floor(m/60),mins=m%60;return h+'小时'+(mins>0?mins+'分钟':'')}
async function handleSubmit(){if(rating.value===0)return;isSubmitting.value=true;await new Promise(r=>setTimeout(r,1000));isSubmitting.value=false;isSubmitted.value=true}

function goBack(){uni.navigateBack()}
function goHome(){uni.reLaunch({url:'/pages/index/index'})}
function goCertificate(){uni.navigateTo({url:'/pages/courses/certificate/index'})}

onMounted(()=>{})
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:rgba(250,248,245,.95);backdrop-filter:blur(10px);border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx;font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}
.content{padding:24rpx}
.achieve-card{border-radius:24rpx;overflow:hidden;background:#fff;box-shadow:0 2rpx 16rpx rgba(0,0,0,.06);margin-bottom:24rpx}
.ac-bg{background:linear-gradient(135deg,#C41E3A, #C9A96E);padding:48rpx 24rpx;text-align:center}
.ac-icon{font-size:80rpx;display:block;margin-bottom:16rpx}
.ac-title{font-size:36rpx;font-weight:700;color:#fff;display:block}
.ac-course{font-size:26rpx;color:rgba(255,255,255,.8);margin-top:8rpx;display:block}
.ac-stats{display:flex;border-top:1px solid #E8E0D5}.acs{flex:1;text-align:center;padding:28rpx 12rpx}.acs-val{font-size:28rpx;font-weight:700;color:#2C2C2C;display:block}.acs-label{font-size:22rpx;color:#999;margin-top:4rpx}
.cert-entry{display:flex;align-items:center;gap:16rpx;background:linear-gradient(90deg,rgba(201,169,110,.1),rgba(201,169,110,.05));border:1px solid rgba(201,169,110,.3);border-radius:20rpx;padding:24rpx;margin-bottom:24rpx}.ce-icon{font-size:48rpx}.ce-info{flex:1}.ce-title{font-size:28rpx;font-weight:600;color:#2C2C2C;display:block}.ce-sub{font-size:22rpx;color:#999;margin-top:4rpx}
.card{background:#fff;border-radius:20rpx;padding:28rpx;margin-bottom:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.card-title{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:24rpx;display:block}
.stars{display:flex;justify-content:center;gap:12rpx;margin-bottom:12rpx}.star{font-size:56rpx;color:#E8E0D5;transition:color .2s}.star.fill{color:#f59e0b}
.rate-hint{text-align:center;font-size:24rpx;color:#999;margin-bottom:20rpx;display:block}
.review-input{width:100%;padding:20rpx;background:#F5F1EB;border-radius:16rpx;font-size:24rpx;box-sizing:border-box;resize:none;margin-bottom:20rpx}
.submit-btn{width:100%;padding:24rpx;text-align:center;background:#C41E3A;color:#fff;border-radius:24rpx;font-size:28rpx;font-weight:500}.submit-btn.dis{background:#D9D9D9;color:#999}
.thanks{text-align:center;padding:40rpx 0}.thanks-icon{font-size:72rpx;display:block;margin-bottom:16rpx}.thanks-title{font-size:28rpx;font-weight:500;color:#2C2C2C;display:block}.thanks-sub{font-size:24rpx;color:#999;margin-top:8rpx}
.rec-title{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx;display:block}
.rec-scroll{white-space:nowrap;margin-bottom:24rpx}.rec-card{display:inline-block;width:280rpx;background:#fff;border-radius:20rpx;padding:20rpx;margin-right:16rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}.rc-cover{aspect-ratio:4/3;background:#F5F1EB;border-radius:12rpx;display:flex;align-items:center;justify-content:center;font-size:48rpx;margin-bottom:12rpx}.rc-name{font-size:26rpx;font-weight:500;color:#2C2C2C;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.rc-instructor{font-size:22rpx;color:#999;margin-top:4rpx;display:block}.rc-bottom{display:flex;justify-content:space-between;align-items:center;margin-top:12rpx}.rc-price{font-size:28rpx;color:#C41E3A;font-weight:600}.rc-students{font-size:20rpx;color:#999}
.thanks-card{display:flex;align-items:center;gap:16rpx;background:#fff;border-radius:20rpx;padding:24rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04);margin-bottom:24rpx}.tc-avatar{width:72rpx;height:72rpx;border-radius:50%;background:rgba(196,30,58,.1);color:#C41E3A;display:flex;align-items:center;justify-content:center;font-size:28rpx;flex-shrink:0}.tc-msg{font-size:24rpx;color:#999;margin-top:4rpx;display:block}
.bottom-bar{position:fixed;bottom:0;left:0;right:0;display:flex;gap:24rpx;padding:20rpx 24rpx;background:rgba(255,255,255,.95);backdrop-filter:blur(10px);border-top:1px solid #E8E0D5;z-index:50}.bb-btn{flex:1;padding:24rpx;text-align:center;background:#F5F1EB;border-radius:24rpx;font-size:28rpx;font-weight:500;color:#666}.bb-btn.primary{background:#C41E3A;color:#fff}
</style>
