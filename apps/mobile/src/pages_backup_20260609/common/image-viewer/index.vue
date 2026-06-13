<template>
  <view class="viewer" @click="toggleControls">
    <view class="top-bar" :class="{hide:!showControls}" @click.stop>
      <view class="tb-close" @click="goBack"><text>✕</text></view>
      <text class="tb-counter">{{currentIndex+1}}/{{images.length}}</text>
      <view style="width:64rpx"/>
    </view>

    <view class="image-area"
      @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd"
    >
      <image :src="images[currentIndex]" mode="aspectFit" class="main-image"
        :style="{transform:'translate('+pos.x+'px,'+pos.y+'px) scale('+scale+') rotate('+rotation+'deg)'}"
        @dblclick="handleDoubleTap"
      />
    </view>

    <view v-if="images.length>1" class="nav-btns" :class="{hide:!showControls}">
      <view class="nb-btn" :class="{dis:currentIndex===0}" @click.stop="goPrev"><text>‹</text></view>
      <view class="nb-btn" :class="{dis:currentIndex===images.length-1}" @click.stop="goNext"><text>›</text></view>
    </view>

    <view class="bottom-bar" :class="{hide:!showControls}" @click.stop>
      <view v-if="images.length>1" class="dots"><view v-for="(_,i) in images" :key="i" class="dot" :class="{act:i===currentIndex}" @click="currentIndex=i"/></view>
      <view class="bb-actions">
        <view class="bb-act" @click="zoomOut"><text class="bb-icon">🔍</text><text class="bb-label">缩小</text></view>
        <view class="bb-act" @click="zoomIn"><text class="bb-icon">🔎</text><text class="bb-label">放大</text></view>
        <view class="bb-act" @click="rotate"><text class="bb-icon">🔄</text><text class="bb-label">旋转</text></view>
        <view class="bb-act" @click="handleSave"><text class="bb-icon">💾</text><text class="bb-label">保存</text></view>
      </view>
    </view>

    <view v-if="scale!==1" class="zoom-hint"><text>{{Math.round(scale*100)}}%</text></view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
const images=ref(['/placeholder.svg','/placeholder.svg','/placeholder.svg'])
const currentIndex=ref(0),scale=ref(1),rotation=ref(0),pos=ref({x:0,y:0}),showControls=ref(true),isDragging=ref(false),dragStart=ref({x:0,y:0}),touchStart=ref({x:0,y:0})

let controlsTimer:any=null
function toggleControls(){showControls.value=!showControls.value;if(showControls.value){clearTimeout(controlsTimer);controlsTimer=setTimeout(()=>showControls.value=false,3000)}}

function goPrev(){if(currentIndex.value>0){currentIndex.value--;resetTransform()}}
function goNext(){if(currentIndex.value<images.value.length-1){currentIndex.value++;resetTransform()}}
function resetTransform(){scale.value=1;rotation.value=0;pos.value={x:0,y:0}}
function zoomIn(){scale.value=Math.min(scale.value+.5,5)}
function zoomOut(){scale.value=Math.max(scale.value-.5,.5)}
function rotate(){rotation.value=(rotation.value+90)%360}

function handleDoubleTap(){scale.value===1?scale.value=2:resetTransform()}

function onTouchStart(e:any){
  showControls.value=true
  const t=e.touches[0]
  touchStart.value={x:t.clientX-pos.value.x,y:t.clientY-pos.value.y}
  if(scale.value>1)isDragging.value=true
}
function onTouchMove(e:any){
  if(isDragging.value&&scale.value>1){
    const t=e.touches[0]
    pos.value={x:t.clientX-touchStart.value.x,y:t.clientY-touchStart.value.y}
  }
}
function onTouchEnd(e:any){
  isDragging.value=false
  if(scale.value===1&&e.changedTouches.length===1){
    const deltaX=e.changedTouches[0].clientX-touchStart.value.x
    if(Math.abs(deltaX)>80){deltaX>0?goPrev():goNext()}
  }
}
function handleSave(){uni.showToast({title:'长按图片保存',icon:'none'})}

function goBack(){uni.navigateBack()}
onMounted(()=>{controlsTimer=setTimeout(()=>showControls.value=false,3000)})
</script>
<style scoped>
.viewer{position:fixed;inset:0;background:#000;z-index:999;display:flex;flex-direction:column}
.top-bar{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:24rpx 32rpx;background:linear-gradient(180deg,rgba(0,0,0,.6),transparent);z-index:10;transition:opacity .3s}
.top-bar.hide{opacity:0;pointer-events:none}
.tb-close{width:64rpx;height:64rpx;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;color:#fff;font-size:28rpx}
.tb-counter{color:#fff;font-size:28rpx}
.image-area{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden}
.main-image{width:100%;height:100%}
.nav-btns{position:absolute;top:50%;left:0;right:0;display:flex;justify-content:space-between;padding:0 16rpx;transform:translateY(-50%);pointer-events:none;transition:opacity .3s}
.nav-btns.hide{opacity:0}
.nb-btn{width:72rpx;height:72rpx;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;color:#fff;font-size:40rpx;pointer-events:auto}
.nb-btn.dis{opacity:.3}
.bottom-bar{position:absolute;bottom:0;left:0;right:0;padding:20rpx 24rpx 40rpx;background:linear-gradient(0deg,rgba(0,0,0,.6),transparent);transition:opacity .3s}
.bottom-bar.hide{opacity:0;pointer-events:none}
.dots{display:flex;justify-content:center;gap:12rpx;margin-bottom:24rpx}
.dot{width:12rpx;height:12rpx;border-radius:50%;background:rgba(255,255,255,.5)}
.dot.act{width:32rpx;background:#fff}
.bb-actions{display:flex;justify-content:center;gap:48rpx}
.bb-act{display:flex;flex-direction:column;align-items:center;gap:4rpx}
.bb-icon{font-size:40rpx}.bb-label{font-size:20rpx;color:rgba(255,255,255,.8)}
.zoom-hint{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.6);color:#fff;padding:12rpx 28rpx;border-radius:40rpx;font-size:24rpx;pointer-events:none}
</style>
