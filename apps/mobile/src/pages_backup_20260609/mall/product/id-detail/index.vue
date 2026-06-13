<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">商品详情</text><text class="nav-share" @click="onShare">📤</text></view>
    <scroll-view scroll-y class="content" :style="{height:'calc(100vh - 56px - 120rpx)'}">
      <view class="gallery"><view class="ga-main">🛍️</view><view class="ga-dots"><text v-for="i in 3" :key="i" class="gad" :class="{act:i===curImg}"/></view></view>
      <view class="info"><text class="ip-name">{{product.name}}</text><view class="ip-price-row"><text class="ip-price">¥{{product.price}}</text><text class="ip-orig">¥{{product.origPrice}}</text><text class="ip-sales">已售{{product.sales}}</text></view>
        <view class="ip-rating"><text>⭐{{product.rating}}</text><text @click="goReviews">{{product.reviews}}条评价</text></view>
      </view>
      <view class="card"><text class="ct">选择规格</text>
        <view class="sku-row"><text v-for="s in product.skus" :key="s.id" class="sku" :class="{sel:selectedSku===s.id}" @click="selectedSku=s.id">{{s.name}}</text></view>
      </view>
      <view class="card"><text class="ct">商品详情</text><text class="desc">{{product.description}}</text></view>
      <view style="height:48rpx"/>
    </scroll-view>
    <view class="bb"><view class="bb-cart" @click="addCart">🛒</view><view class="bb-buy" @click="buyNow">立即购买</view></view>
  </view>
</template>
<script setup lang="ts">import {ref} from 'vue';import {onPullDownRefresh} from '@dcloudio/uni-app';const curImg=ref(1),selectedSku=ref(1);const product={name:'渊海子平精装版',price:98,origPrice:168,sales:256,rating:4.8,reviews:128,description:'《渊海子平》是八字命理学的经典著作，本书为正版精装版，纸质优良，排版精美。',skus:[{id:1,name:'平装版 ¥98'},{id:2,name:'精装版 ¥128'},{id:3,name:'套装版 ¥198'}]};function goReviews(){uni.navigateTo({url:'/pages/mall/product/id-detail/reviews/index'})};function addCart(){uni.showToast({title:'已加入购物车'})};function buyNow(){uni.navigateTo({url:'/pages/shop/checkout/index'})};function onShare(){};function goBack(){uni.navigateBack()};onPullDownRefresh(()=>setTimeout(()=>uni.stopPullDownRefresh(),500))</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.nav-share{font-size:32rpx}.content{}.gallery{position:relative}.ga-main{aspect-ratio:1;background:#F5F1EB;display:flex;align-items:center;justify-content:center;font-size:120rpx}.ga-dots{display:flex;justify-content:center;gap:12rpx;padding:12rpx}.gad{width:12rpx;height:12rpx;border-radius:50%;background:#E8E0D5}.gad.act{background:#C41E3A;width:32rpx}.info{background:#fff;padding:24rpx;margin-bottom:16rpx}.ip-name{font-size:34rpx;font-weight:600;color:#2C2C2C;margin-bottom:16rpx;display:block}.ip-price-row{display:flex;align-items:baseline;gap:12rpx;margin-bottom:12rpx}.ip-price{font-size:44rpx;font-weight:700;color:#C41E3A}.ip-orig{font-size:26rpx;color:#999;text-decoration:line-through}.ip-sales{font-size:22rpx;color:#999;margin-left:auto}.ip-rating{display:flex;gap:24rpx;font-size:24rpx;color:#999}.card{background:#fff;padding:24rpx;margin-bottom:16rpx}.ct{font-size:28rpx;font-weight:600;color:#2C2C2C;margin-bottom:20rpx;display:block}.sku-row{display:flex;flex-wrap:wrap;gap:12rpx}.sku{padding:14rpx 24rpx;background:#F5F1EB;border-radius:16rpx;font-size:24rpx;color:#999}.sku.sel{border:2rpx solid #C41E3A;color:#C41E3A;background:#FFF5F5}.desc{font-size:26rpx;color:#666;line-height:1.6}.bb{position:fixed;bottom:0;left:0;right:0;display:flex;align-items:center;gap:24rpx;padding:16rpx 24rpx;background:#fff;border-top:1px solid #E8E0D5;z-index:50}.bb-cart{font-size:44rpx;padding:8rpx}.bb-buy{flex:1;padding:28rpx;text-align:center;background:linear-gradient(90deg,#C41E3A,#E74C3C);color:#fff;border-radius:40rpx;font-size:28rpx;font-weight:600}
</style>
