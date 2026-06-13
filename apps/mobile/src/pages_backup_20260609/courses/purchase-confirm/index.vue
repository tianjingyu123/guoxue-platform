<template>
  <view class="page">
    <view class="nav-header"><view class="nav-left" @click="goBack"><text>←</text><text class="nav-title">确认订单</text></view><view style="width:48rpx"/></view>

    <view v-if="isLoading" class="skel"><view v-for="i in 3" :key="i" class="skel-item"/></view>
    <view v-else class="body">
      <view class="card"><view class="course-row"><view class="cr-cover">📚</view><view class="cr-info"><text class="cr-title">{{course.title}}</text><text class="cr-meta">{{course.instructor}} | {{course.chapters}}课时</text><view class="cr-price-row"><text class="cr-price">¥{{course.price}}</text><text class="cr-orig">¥{{course.originalPrice}}</text></view></view></view></view>

      <view class="card"><view class="card-head" @click="showCoupons=!showCoupons"><view><text>🏷️ 优惠券</text><text v-if="availableCoupons.length>0" class="badge">{{availableCoupons.length}}张可用</text></view><text class="arrow" :class="{rot:showCoupons}">{{selectedCoupon?'-¥'+discount:'选择优惠券'}} ›</text></view>
        <view v-if="showCoupons" class="coupon-list">
          <view class="cl-item" :class="{sel:!selectedCoupon}" @click="selectCoupon(null)"><text>不使用优惠券</text><text v-if="!selectedCoupon">✓</text></view>
          <view v-for="c in coupons" :key="c.id" class="cl-item" :class="{sel:selectedCoupon===c.id,dis:!c.isAvailable||c.minAmount>course.price}" @click="c.isAvailable&&c.minAmount<=course.price&&selectCoupon(c.id)">
            <view class="cli-left"><view class="cli-amount">¥{{c.value}}</view><view class="cli-info"><text class="cli-name">{{c.name}}</text><text class="cli-cond">满{{c.minAmount}}可用</text><text class="cli-exp">🕐 {{c.expireAt}}到期</text></view></view><text v-if="selectedCoupon===c.id">✓</text>
          </view>
        </view>
      </view>

      <view class="card"><text class="card-title">支付方式</text>
        <view v-for="m in payMethods" :key="m.id" class="pay-item" :class="{sel:payMethod===m.id}" @click="payMethod=m.id"><text class="pi-icon">{{m.icon}}</text><text class="pi-name">{{m.name}}</text><text v-if="m.balance" class="pi-bal">余额:{{m.balance}}币</text><text v-if="payMethod===m.id" class="pi-check">✓</text></view>
      </view>

      <view class="card"><text class="card-title">价格明细</text>
        <view class="price-row"><text>课程原价</text><text>¥{{course.price}}</text></view>
        <view v-if="discount>0" class="price-row red"><text>优惠券抵扣</text><text>-¥{{discount}}</text></view>
        <view class="price-row total"><text>实付金额</text><text class="final-price">¥{{finalPrice}}</text></view>
      </view>

      <view class="agree-row"><view class="agree-cb" :class="{on:agreed}" @click="agreed=!agreed"><text v-if="agreed">✓</text></view><text>我已阅读并同意《用户协议》和《隐私政策》，购买后不支持退款</text></view>
    </view>

    <view class="bottom-bar"><view class="bb-price"><text class="bb-label">实付</text><text class="bb-val">¥{{finalPrice}}</text></view><view class="bb-btn" :class="{dis:!agreed||isSubmitting}" @click="handleSubmit"><text>{{isSubmitting?'⏳处理中...':'🛡️ 确认支付'}}</text></view></view>
  </view>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
const isLoading=ref(true),showCoupons=ref(false),selectedCoupon=ref<string|null>(null),payMethod=ref('wechat'),agreed=ref(false),isSubmitting=ref(false)

const course={title:'八字命理入门到精通',cover:'',instructor:'张老师',price:299,originalPrice:599,students:2860,rating:4.9,chapters:32}
const coupons=[{id:'1',name:'新人专享券',type:'amount',value:50,minAmount:100,expireAt:'2024-12-31',isAvailable:true},{id:'2',name:'课程9折券',type:'percent',value:10,minAmount:200,maxDiscount:100,expireAt:'2024-06-30',isAvailable:true},{id:'3',name:'满300减30',type:'amount',value:30,minAmount:300,expireAt:'2024-07-15',isAvailable:false}]
const payMethods=[{id:'wechat',name:'微信支付',icon:'💚'},{id:'alipay',name:'支付宝',icon:'💙'},{id:'coins',name:'学习币',icon:'🪙',balance:150}]
const availableCoupons=computed(()=>coupons.filter(c=>c.isAvailable&&c.minAmount<=course.price))

const discount=computed(()=>{if(!selectedCoupon.value)return 0;const c=coupons.find(x=>x.id===selectedCoupon.value);if(!c)return 0;return c.type==='amount'?c.value:Math.min(course.price*(c.value/100),c.maxDiscount||999)})
const finalPrice=computed(()=>course.price-discount.value)

function selectCoupon(id:string|null){selectedCoupon.value=id;showCoupons.value=false}

async function handleSubmit(){if(!agreed.value||isSubmitting.value)return;isSubmitting.value=true;await new Promise(r=>setTimeout(r,1000));isSubmitting.value=false;uni.showToast({title:'支付成功',icon:'success'})}

function goBack(){uni.navigateBack()}
onMounted(async()=>{await new Promise(r=>setTimeout(r,600));isLoading.value=false})
</script>
<style scoped>
.page{background:#FAF8F5;min-height:100vh}
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5;position:sticky;top:0;z-index:40}
.nav-left{display:flex;align-items:center;gap:12rpx;font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600;color:#2C2C2C}
.skel{padding:24rpx}.skel-item{height:120rpx;background:#e8e8e8;border-radius:16rpx;margin-bottom:16rpx}
.body{padding:24rpx;padding-bottom:160rpx}
.card{background:#fff;border-radius:20rpx;padding:24rpx;margin-bottom:20rpx;box-shadow:0 2rpx 12rpx rgba(0,0,0,.04)}
.card-head{display:flex;justify-content:space-between;align-items:center}.badge{font-size:20rpx;padding:2rpx 10rpx;background:rgba(196,30,58,.1);color:#C41E3A;border-radius:8rpx;margin-left:8rpx}.arrow{font-size:24rpx;color:#999}.arrow.rot{transform:rotate(90deg)}
.course-row{display:flex;gap:16rpx}.cr-cover{width:160rpx;height:108rpx;background:#F5F1EB;border-radius:16rpx;display:flex;align-items:center;justify-content:center;font-size:56rpx;flex-shrink:0}.cr-title{font-size:28rpx;font-weight:500;color:#2C2C2C;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.cr-meta{font-size:22rpx;color:#999;margin-top:4rpx;display:block}.cr-price-row{display:flex;align-items:baseline;gap:12rpx;margin-top:8rpx}.cr-price{font-size:32rpx;font-weight:700;color:#C41E3A}.cr-orig{font-size:22rpx;color:#999;text-decoration:line-through}
.card-title{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}
.coupon-list{margin-top:16rpx}
.cl-item{display:flex;align-items:center;justify-content:space-between;padding:20rpx;border:2rpx solid #E8E0D5;border-radius:16rpx;margin-bottom:12rpx}
.cl-item.sel{border-color:#C41E3A;background:rgba(196,30,58,.03)}
.cl-item.dis{opacity:.5}
.cli-left{display:flex;align-items:center;gap:16rpx}.cli-amount{width:100rpx;height:100rpx;border-radius:16rpx;background:linear-gradient(135deg,#C41E3A,#8B0000);display:flex;align-items:center;justify-content:center;font-size:32rpx;font-weight:700;color:#fff;flex-shrink:0}.cli-name{font-size:26rpx;font-weight:500;color:#2C2C2C;display:block}.cli-cond{font-size:22rpx;color:#999}.cli-exp{font-size:20rpx;color:#999;margin-top:2rpx}
.pay-item{display:flex;align-items:center;gap:16rpx;padding:20rpx;border:2rpx solid #E8E0D5;border-radius:16rpx;margin-bottom:12rpx}.pay-item.sel{border-color:#C41E3A;background:rgba(196,30,58,.03)}.pi-icon{font-size:36rpx}.pi-name{font-size:26rpx;color:#2C2C2C;flex:1}.pi-bal{font-size:22rpx;color:#999}.pi-check{color:#C41E3A;font-weight:700}
.price-row{display:flex;justify-content:space-between;padding:12rpx 0;font-size:26rpx;color:#666}.price-row.red{color:#C41E3A}.price-row.total{padding-top:12rpx;border-top:1px solid #E8E0D5;font-weight:500;color:#2C2C2C}.final-price{font-size:44rpx;font-weight:700;color:#C41E3A}
.agree-row{display:flex;align-items:flex-start;gap:12rpx;font-size:22rpx;color:#999;line-height:1.6}.agree-cb{width:36rpx;height:36rpx;border-radius:6rpx;border:2rpx solid #ccc;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2rpx;font-size:20rpx}.agree-cb.on{background:#C41E3A;border-color:#C41E3A;color:#fff}
.bottom-bar{position:fixed;bottom:0;left:0;right:0;display:flex;align-items:center;gap:24rpx;padding:20rpx 24rpx;background:#fff;border-top:1px solid #E8E0D5;z-index:50}.bb-price{flex:1}.bb-label{font-size:22rpx;color:#999;display:block}.bb-val{font-size:44rpx;font-weight:700;color:#C41E3A}.bb-btn{padding:24rpx 56rpx;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:40rpx;font-size:28rpx;font-weight:600}.bb-btn.dis{background:#D9D9D9;color:#999}
</style>
