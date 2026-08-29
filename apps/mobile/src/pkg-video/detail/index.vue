<template>
  <view class="vp">
    <customer-service-fab />
    <!-- 三态：加载/失败/空 -->
    <view v-if="loading || error || !currentVideo" class="vp__state">
      <AppLoading v-if="loading" />
      <block v-else-if="error">
        <text class="vp__state-txt">{{ error }}</text>
        <view class="vp__state-btn" @tap="retry"><text class="vp__state-btn-txt">重试</text></view>
      </block>
      <block v-else>
        <text class="vp__state-txt">视频不见了，去发现页看看其他精彩内容</text>
        <view class="vp__state-btn" @tap="navigateTo('/discover')"><text class="vp__state-btn-txt">去发现页</text></view>
      </block>
    </view>

    <template v-if="currentVideo">
    <!--
      视频容器：uni-app 官方 swiper 纵向轮播（替换原手写 touchstart/move/end 实现）
      根因：手写 touch 未 preventDefault，安卓微信 X5 下滑（返回上一个）手势被页面下拉/回弹消费 →
      只有上滑能触发切换。swiper 内部统一接管手势，双向滑动在 X5 上可靠；current 双向绑定索引。
    -->
    <swiper
      class="vp__stage"
      :vertical="true"
      :current="currentIndex"
      :duration="300"
      :circular="false"
      @change="onSwiperChange"
    >
      <swiper-item v-for="(v, i) in videos" :key="v.id">
        <!-- 只渲染当前±1（预加载前后各一条），其余留空壳，避免 50 条全挂载 -->
        <!-- touchstart/move/end：长按 2 倍速判定（480ms·位移>10px 取消·与 tap 单双击互不冲突） -->
        <view
          v-if="nearCurrent(i)"
          class="vp__layer"
          @tap="onSingleTap"
          @touchstart="onPressStart"
          @touchmove="onPressMove"
          @touchend="onPressEnd"
          @touchcancel="onPressEnd"
        >
          <!-- 封面作为播放器 poster/兜底：视频未就绪或无视频源时展示 -->
          <image lazy-load class="vp__cover" :src="v.coverUrl" mode="aspectFill" />
          <!-- 视频播放器：仅当前条挂载（H5=原生 video，小程序/App=原生组件）·不静音（董事长拍板：
               自动播放被浏览器拦截时显示中央播放按钮让用户点一下，而不是静音自动播） -->
          <!-- #ifdef APP-PLUS -->
          <AppWebVideo
            v-if="i === currentIndex && v.videoUrl && !playError"
            :key="v.id"
            class="vp__video"
            :src="v.videoUrl"
            :poster="v.coverUrl"
            :autoplay="true"
            :loop="true"
            :object-fit="currentLandscape ? 'contain' : 'cover'"
            :command="appPlayerCommand"
            @play="onVideoPlay"
            @pause="onVideoPause"
            @error="onVideoError"
            @timeupdate="onTimeUpdate"
            @loadedmetadata="onVideoMeta"
          />
          <!-- #endif -->
          <!-- #ifndef APP-PLUS -->
          <video
            v-if="i === currentIndex && v.videoUrl && !playError"
            :key="v.id"
            id="vp-player"
            class="vp__video"
            :src="v.videoUrl"
            :controls="false"
            :show-center-play-btn="false"
            :show-play-btn="false"
            :show-fullscreen-btn="false"
            :show-progress="false"
            :enable-progress-gesture="false"
            :enable-play-gesture="false"
            :loop="true"
            autoplay
            :object-fit="currentLandscape ? 'contain' : 'cover'"
            @tap.stop="onSingleTap"
            @touchstart.stop="onPressStart"
            @touchmove.stop="onPressMove"
            @touchend.stop="onPressEnd"
            @touchcancel.stop="onPressCancel"
            @play="onVideoPlay"
            @pause="onVideoPause"
            @error="onVideoError"
            @timeupdate="onTimeUpdate"
            @loadedmetadata="onVideoMeta"
          />
          <!-- #endif -->
          <!-- 不可播诚实态：源加载失败（如 .mov 格式安卓不支持/转码中）-->
          <view v-if="i === currentIndex && playError" class="vp__unplayable">
            <AppIcon name="video-off" :size="64" color="rgba(255,255,255,0.65)" />
            <text class="vp__unplayable-txt">该视频暂不可播</text>
            <text class="vp__unplayable-sub">格式暂不支持或正在转码，请稍后再试</text>
          </view>
          <!-- 中央播放按钮：未在播放（含有声自动播放被浏览器拦截）时显示，点一下开播 -->
          <view v-if="i === currentIndex && !isPlaying && !playError" class="vp__pause">
            <view class="vp__pause-btn">
              <AppIcon name="play" :size="48" color="#ffffff" :fill="true" />
            </view>
          </view>
          <!-- 双击飘心 -->
          <template v-if="i === currentIndex">
            <view
              v-for="heart in floatingHearts"
              :key="heart.id"
              class="vp__heart"
              :style="{ left: heart.x - 24 + 'px', top: heart.y - 24 + 'px' }"
            >
              <AppIcon name="heart" :size="48" color="#c41e3a" :fill="true" />
            </view>
          </template>
          <view class="vp__shade" />
        </view>
      </swiper-item>
    </swiper>

    <!-- 滑动提示（V0 swipe-hint：底部居中·仅首条视频） -->
    <view v-if="currentIndex === 0" class="vp__swipe-tip" :style="{ bottom: 'calc(' + safeBottom + 'px + 36rpx)' }">
      <AppIcon name="chevron-up" :size="32" color="rgba(255,255,255,0.5)" />
      <text class="vp__swipe-tip-txt">上滑看下一个</text>
    </view>

    <!-- 顶部导航：返回 + 来源圈子胶囊 + 购物车/静音 -->
    <view class="vp__top" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="vp__top-row">
        <view class="vp__icon-btn" @tap="onBack">
          <AppIcon name="arrow-left" :size="42" color="#ffffff" />
        </view>
        <!-- 来源圈子胶囊（V0 source-pill）：每条视频标明出处，可点进圈子详情 -->
        <view v-if="currentVideo.circle" class="vp__source-pill" @tap="goCircle">
          <view class="vp__source-pill-ico">
            <AppIcon name="users" :size="24" color="#ffffff" />
          </view>
          <text class="vp__source-pill-name">{{ currentVideo.circle.name }}</text>
        </view>
        <view class="vp__top-right">
          <view v-if="cartTotal > 0" class="vp__icon-btn vp__icon-btn--cart" @tap="showCart = true">
            <AppIcon name="shopping-cart" :size="30" color="#ffffff" />
            <text class="vp__cart-badge">{{ cartTotal }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 右侧互动按钮（V0 actions：头像白描边+朱红关注钮·图标白描边带投影·数字白 72% 透明） -->
    <view class="vp__actions">
      <!-- 作者头像（点头像进作者主页；加号关注·成功变√） -->
      <view class="vp__avatar-wrap" @tap.stop="goAuthor">
        <smart-avatar class="vp__avatar" :src="currentVideo.author.avatar" :name="currentVideo.author.name" />
        <view
          class="vp__follow-plus"
          :class="{ 'vp__follow-plus--ok': currentVideo.author.isFollowed }"
          @tap.stop="onFollow"
        >
          <AppIcon :name="currentVideo.author.isFollowed ? 'check' : 'plus'" :size="24" color="#ffffff" />
        </view>
      </view>

      <!-- 点赞（已赞 → 朱红实心·爆红心 scale 动效 200ms·纯 transform 无 filter） -->
      <view class="vp__act" @tap="onLike">
        <view class="vp__act-ico" :class="{ 'vp__act-ico--liked': currentVideo.isLiked }">
          <AppIcon name="heart" :size="58" :color="currentVideo.isLiked ? '#C41E3A' : 'rgba(255,255,255,0.94)'" :fill="currentVideo.isLiked" />
        </view>
        <text class="vp__act-txt vp__act-txt--num">{{ fmt(currentVideo.likes) }}</text>
      </view>

      <!-- 评论 -->
      <view class="vp__act" @tap="openComments">
        <view class="vp__act-ico">
          <AppIcon name="message-circle" :size="54" color="rgba(255,255,255,0.94)" />
        </view>
        <text class="vp__act-txt vp__act-txt--num">{{ fmt(currentVideo.comments) }}</text>
      </view>

      <!-- 收藏（收藏 → 金星 scale 动效 240ms·star 图标·金 #C9A96E） -->
      <view class="vp__act" @tap="onCollect">
        <view class="vp__act-ico" :class="{ 'vp__act-ico--starred': currentVideo.isCollected }">
          <AppIcon name="star" :size="54" :color="currentVideo.isCollected ? '#C9A96E' : 'rgba(255,255,255,0.94)'" :fill="currentVideo.isCollected" />
        </view>
        <text class="vp__act-txt">收藏</text>
      </view>

      <!-- 分享（弹分享面板：复制链接 + 微信内转发引导） -->
      <view class="vp__act" @tap.stop="onShare">
        <view class="vp__act-ico">
          <AppIcon name="share-2" :size="54" color="rgba(255,255,255,0.94)" />
        </view>
        <text class="vp__act-txt vp__act-txt--num">{{ fmt(currentVideo.shares) }}</text>
      </view>

      <!-- 争议内容出口：直达真实举报表单，避免只能退出或在评论区发泄。 -->
      <view class="vp__act" @tap.stop="onReport">
        <view class="vp__act-ico">
          <AppIcon name="flag" :size="48" color="rgba(255,255,255,0.88)" />
        </view>
        <text class="vp__act-txt">举报</text>
      </view>
    </view>

    <!-- 底部信息区（V0 info：作者名 15px 粗体 + 认证金描边徽章 + 标题 14px/1.6 + 推广浮卡） -->
    <view class="vp__bottom" :style="{ paddingBottom: 'calc(' + safeBottom + 'px + 56rpx)' }">
      <!-- 「仅自己可见」灰标（精修点6·内容被机审降级时仅作者可见·灰底不突兀·当前接口未下发该字段故恒不显示） -->
      <view v-if="currentVideo.selfOnly" class="vp__self-only">
        <AppIcon name="eye-off" :size="22" color="rgba(255,255,255,0.85)" />
        <text class="vp__self-only-txt">仅自己可见</text>
      </view>
      <view class="vp__author-row">
        <text class="vp__author-name">{{ currentVideo.author.name }}</text>
        <view v-if="currentVideo.author.verified" class="vp__auth-badge"><text class="vp__auth-badge-txt">认证</text></view>
      </view>
      <text class="vp__title">{{ currentVideo.title }}</text>
      <!-- 圈子小胶囊（精修点3·可点进圈子·复用现有 goCircle 跳转逻辑·白16%底+金点缀） -->
      <view v-if="currentVideo.circle" class="vp__circle-pill" hover-class="vp__circle-pill--hover" @tap.stop="goCircle">
        <AppIcon name="users" :size="22" color="#C9A96E" />
        <text class="vp__circle-pill-txt">{{ currentVideo.circle.name }}</text>
      </view>
      <!-- 推广浮卡（V0 promo-float）：首件带货商品·深色毛玻璃·点开商品弹层（价格为人民币） -->
      <view v-if="currentVideo.products.length > 0" class="vp__promo" @tap="showProducts = true">
        <image lazy-load class="vp__promo-img" :src="currentVideo.products[0].image" mode="aspectFill" />
        <view class="vp__promo-main">
          <text class="vp__promo-name">{{ currentVideo.products[0].name }}</text>
          <view class="vp__promo-price-row">
            <text class="vp__promo-price">¥{{ currentVideo.products[0].price }}</text>
            <text v-if="currentVideo.products.length > 1" class="vp__promo-more">等{{ currentVideo.products.length }}件</text>
          </view>
        </view>
        <AppIcon name="chevron-right" :size="28" color="rgba(255,255,255,0.5)" />
      </view>
    </view>

    <!-- 长按 2 倍速提示（顶部小胶囊） -->
    <view v-if="speeding" class="vp__speed-tip" :style="{ top: 'calc(' + statusBarHeight + 'px + 120rpx)' }">
      <text class="vp__speed-tip-txt">2x 快进中 ≫</text>
    </view>

    <!-- 播放进度条（V0 progress：底部细条·仅有真实视频源时渲染）
         外层 vp__progress-zone = 透明拖拽热区（64rpx ≥40rpx 要求·视觉细条不变）：
         touchstart/move 更新预览进度 + 时间气泡，touchend seek 到目标 -->
    <view
      v-if="currentVideo.videoUrl && !playError"
      class="vp__progress-zone"
      :style="{ bottom: 'calc(' + safeBottom + 'px - 16rpx)' }"
      @touchstart="onSeekStart"
      @touchmove.stop="onSeekMove"
      @touchend="onSeekEnd"
      @touchcancel="onSeekEnd"
    >
      <!-- 拖拽时间气泡：当前 / 总时长（mm:ss） -->
      <view v-if="seeking" class="vp__seek-tip">
        <text class="vp__seek-tip-cur">{{ fmtClock(seekPreviewTime) }}</text>
        <text class="vp__seek-tip-dur"> / {{ fmtClock(videoDuration) }}</text>
      </view>
      <view class="vp__progress-bar" :class="{ 'vp__progress-bar--drag': seeking }">
        <view class="vp__progress-played" :style="{ width: (seeking ? seekProgress : playProgress) + '%' }" />
      </view>
    </view>
    </template>

    <!-- 评论面板（小红书/抖音式半屏抽屉·深色与播放页一致） -->
    <view v-if="showComments" class="cs-mask" @tap="closeComments" @touchmove.self.prevent>
      <view class="cs" @tap.stop @touchmove.stop>
        <view class="cs__grabber" />
        <view class="cs__head">
          <text class="cs__title">共 {{ fmt(commentTotal) }} 条评论</text>
          <view class="cs__close" @tap="closeComments"><AppIcon name="x" :size="34" color="rgba(255,255,255,0.55)" /></view>
        </view>
        <scroll-view scroll-y class="cs__body">
          <text v-if="commentsLoading" class="cs__hint">加载中...</text>
          <view v-else-if="comments.length === 0" class="cs__empty">
            <AppIcon name="message-circle" :size="72" color="rgba(255,255,255,0.18)" />
            <text class="cs__empty-txt">还没有评论</text>
            <text class="cs__empty-sub">留下你的独到见解，抢个沙发～</text>
          </view>
          <view v-for="c in comments" :key="c.id" class="cs-item" :class="{ 'cs-item--flash': highlightId === c.id }">
            <image v-if="c.avatar" lazy-load class="cs-item__avatar" :src="c.avatar" mode="aspectFill" />
            <view v-else class="cs-item__avatar"><text class="cs-item__avatar-txt">{{ c.user.charAt(0) }}</text></view>
            <view class="cs-item__main">
              <text class="cs-item__user">{{ c.user }}</text>
              <text class="cs-item__content">{{ c.content }}</text>
              <view class="cs-item__meta">
                <text class="cs-item__time">{{ timeAgo(c.createdAt) }}</text>
                <text class="cs-item__reply-btn" @tap="startReply(c)">回复</text>
              </view>
              <!-- 楼中楼 -->
              <view v-if="c.replies.length" class="cs-item__replies">
                <template v-if="expandedIds.includes(c.id)">
                  <view v-for="r in flatReplies(c)" :key="r.id" class="cs-item cs-item--sub" :class="{ 'cs-item--flash': highlightId === r.id }">
                    <image v-if="r.avatar" lazy-load class="cs-item__avatar cs-item__avatar--sub" :src="r.avatar" mode="aspectFill" />
                    <view v-else class="cs-item__avatar cs-item__avatar--sub"><text class="cs-item__avatar-txt">{{ r.user.charAt(0) }}</text></view>
                    <view class="cs-item__main">
                      <text class="cs-item__user">{{ r.user }}</text>
                      <text class="cs-item__content">{{ r.content }}</text>
                      <view class="cs-item__meta">
                        <text class="cs-item__time">{{ timeAgo(r.createdAt) }}</text>
                        <text class="cs-item__reply-btn" @tap="startReply(c, r)">回复</text>
                      </view>
                    </view>
                    <view class="cs-item__like" @tap="onLikeComment(r)">
                      <AppIcon name="heart" :size="30" :color="likedIds.includes(r.id) ? '#C41E3A' : 'rgba(233,228,221,0.45)'" :fill="likedIds.includes(r.id)" />
                      <text class="cs-item__like-num" :class="{ 'cs-item__like-num--on': likedIds.includes(r.id) }">{{ r.likes > 0 ? fmt(r.likes) : '' }}</text>
                    </view>
                  </view>
                  <view class="cs-item__expand" @tap="toggleReplies(c.id)">
                    <view class="cs-item__expand-line" /><text class="cs-item__expand-txt">收起</text>
                  </view>
                </template>
                <view v-else class="cs-item__expand" @tap="toggleReplies(c.id)">
                  <view class="cs-item__expand-line" /><text class="cs-item__expand-txt">展开 {{ countReplies(c) }} 条回复</text>
                  <AppIcon name="chevron-down" :size="24" color="rgba(255,255,255,0.45)" />
                </view>
              </view>
            </view>
            <!-- 右侧点赞小柱 -->
            <view class="cs-item__like" @tap="onLikeComment(c)">
              <AppIcon name="heart" :size="32" :color="likedIds.includes(c.id) ? '#C41E3A' : 'rgba(233,228,221,0.45)'" :fill="likedIds.includes(c.id)" />
              <text class="cs-item__like-num" :class="{ 'cs-item__like-num--on': likedIds.includes(c.id) }">{{ c.likes > 0 ? fmt(c.likes) : '' }}</text>
            </view>
          </view>
          <view v-if="comments.length > 0" class="cs__end"><text class="cs__end-txt">— 到底啦 —</text></view>
        </scroll-view>
        <!-- 底部常驻输入条 -->
        <view class="cs-input" :style="{ paddingBottom: 'calc(' + safeBottom + 'px + 16rpx)' }">
          <view v-if="replyTarget" class="cs-input__reply-bar">
            <text class="cs-input__reply-txt">回复 @{{ replyTarget.user }}</text>
            <view class="cs-input__reply-cancel" @tap="cancelReply"><AppIcon name="x" :size="26" color="rgba(255,255,255,0.45)" /></view>
          </view>
          <view class="cs-input__row">
            <image v-if="myAvatar" lazy-load class="cs-input__avatar" :src="myAvatar" mode="aspectFill" />
            <view v-else class="cs-input__avatar"><text class="cs-item__avatar-txt">我</text></view>
            <input
              class="cs-input__field"
              v-model="commentText"
              :placeholder="replyTarget ? `回复 @${replyTarget.user}…` : '说点什么…'"
              placeholder-class="cs-input__ph"
              confirm-type="send"
              @confirm="onPostComment"
            />
            <view class="cs-input__send" :class="{ 'cs-input__send--on': commentText.trim() && !postingComment }" @tap="onPostComment">
              <text class="cs-input__send-txt">{{ postingComment ? '…' : '发送' }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 分享面板（深色·复制链接 + 微信内转发引导） -->
    <view v-if="showShare" class="cs-mask" @tap="showShare = false" @touchmove.self.prevent>
      <view class="cs cs--share" @tap.stop @touchmove.stop>
        <view class="cs__grabber" />
        <view class="cs__head">
          <text class="cs__title">分享给朋友</text>
          <view class="cs__close" @tap="showShare = false"><AppIcon name="x" :size="34" color="rgba(255,255,255,0.55)" /></view>
        </view>
        <view class="share-opts">
          <view class="share-opt" @tap="copyShareLink">
            <view class="share-opt__ico"><AppIcon name="link-2" :size="44" color="#E9E4DD" /></view>
            <text class="share-opt__txt">复制链接</text>
          </view>
        </view>
        <text class="share-tip">复制链接发给微信好友，或点浏览器/微信右上角「···」直接转发本页</text>
      </view>
    </view>

    <!-- 商品弹层 -->
    <view v-if="showProducts" class="sheet-mask" @tap="showProducts = false" @touchmove.self.prevent>
      <view class="sheet" @tap.stop @touchmove.stop>
        <view class="sheet__head">
          <text class="sheet__title">视频同款</text>
          <view @tap="showProducts = false"><AppIcon name="x" :size="36" color="#999" /></view>
        </view>
        <scroll-view scroll-y class="sheet__body">
          <view v-for="p in currentVideo.products" :key="p.id" class="prod">
            <image lazy-load class="prod__img" :src="p.image" mode="aspectFill" />
            <view class="prod__info">
              <text class="prod__name">{{ p.name }}</text>
              <view class="prod__price-row">
                <text class="prod__price">¥{{ p.price }}</text>
                <text class="prod__origin">¥{{ p.originalPrice }}</text>
              </view>
              <view class="prod__foot">
                <text class="prod__sales">已售 {{ fmt(p.sales) }}</text>
                <view class="prod__buy" :class="{ 'prod__buy--added': addedToCart === p.id }" @tap="addToCart(p)">
                  <text class="prod__buy-txt">{{ addedToCart === p.id ? '已加入' : '加入购物车' }}</text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 购物车弹层 -->
    <view v-if="showCart" class="sheet-mask" @tap="showCart = false" @touchmove.self.prevent>
      <view class="sheet" @tap.stop @touchmove.stop>
        <view class="sheet__head">
          <text class="sheet__title">购物车 ({{ cartTotal }})</text>
          <view @tap="showCart = false"><AppIcon name="x" :size="36" color="#999" /></view>
        </view>
        <scroll-view scroll-y class="sheet__body">
          <text v-if="cart.length === 0" class="sheet__empty">购物车是空的</text>
          <view v-for="item in cart" :key="item.productId" class="cart-row">
            <image lazy-load class="cart-row__img" :src="item.product.image" mode="aspectFill" />
            <view class="cart-row__info">
              <text class="cart-row__name">{{ item.product.name }}</text>
              <text class="cart-row__price">¥{{ item.product.price }}</text>
            </view>
            <view class="cart-row__qty">
              <view class="cart-row__btn" @tap="updateQty(item.productId, -1)"><AppIcon name="minus" :size="26" color="#333" /></view>
              <text class="cart-row__num">{{ item.quantity }}</text>
              <view class="cart-row__btn" @tap="updateQty(item.productId, 1)"><AppIcon name="plus" :size="26" color="#333" /></view>
            </view>
          </view>
        </scroll-view>
        <view v-if="cart.length > 0" class="cart-foot" :style="{ paddingBottom: 'calc(' + safeBottom + 'px + 16rpx)' }">
          <view class="cart-foot__total">
            <text class="cart-foot__label">合计：</text>
            <text class="cart-foot__amount">¥{{ cartAmount }}</text>
          </view>
          <view class="cart-foot__checkout" @tap="onCheckout"><text class="cart-foot__checkout-txt">去结算</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, getCurrentInstance, nextTick } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline, onHide } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
// #ifdef APP-PLUS
import AppWebVideo, { type AppWebVideoCommand } from '@/components/media/app-web-video.vue'
// #endif
import { goBack, navigateTo } from '@/utils/router'
import { useShare } from '@/composables/useShare'
import { withRef } from '@/utils/referral'
import { buildH5Url } from '@/utils/share'
import { getUserInfo } from '@/utils/storage'
import { onMounted } from 'vue'
import { videoApi, formatVideoNumber as fmt, formatCommentTime as timeAgo, type VideoItem, type VideoProduct, type VideoComment } from '@/lib/video-data'
import { shopApi } from '@/lib/shop-data'
import { gotoReport } from '@/lib/report-data'
import { useOverlayScrollLock } from '@/composables/use-overlay-scroll-lock'

interface CartItem { productId: string; quantity: number; product: VideoProduct }

// ===== 系统信息 =====
const sysInfo = uni.getSystemInfoSync()
const isAppPlusRuntime = (sysInfo as typeof sysInfo & { uniPlatform?: string }).uniPlatform === 'app'
const statusBarHeight = ref(sysInfo.statusBarHeight || 0)
const safeBottom = ref(sysInfo.safeAreaInsets?.bottom || 0)
const windowH = ref(sysInfo.windowHeight || 0)

// ===== 数据（真连全屏视频流）=====
const videos = ref<VideoItem[]>([])
const currentIndex = ref(0)
const loading = ref(true)
const error = ref('')
const pendingId = ref('') // onLoad 传入的目标视频 id，加载后定位

// ===== feed 分页（原固定 pageSize=50 一次取完，刷到 50 条断粮）=====
const FEED_PAGE_SIZE = 50 // 首页保持原 50 条（深链 pendingId 定位覆盖范围不回退）
const feedPage = ref(1)
const feedHasMore = ref(true)
const feedLoadingMore = ref(false)

async function loadFeed() {
  loading.value = true
  error.value = ''
  try {
    const list = await videoApi.list({ page: 1, pageSize: FEED_PAGE_SIZE })
    videos.value = list
    feedPage.value = 1
    feedHasMore.value = list.length > 0
    if (pendingId.value) {
      const idx = list.findIndex((v) => v.id === pendingId.value)
      if (idx !== -1) {
        currentIndex.value = idx
      } else {
        // 深链目标不在首屏 feed（排序靠后/被去重）：单拉 GET /videos/:id 插队首定位，
        // 杜绝「分享链接静默换片」——失败/已下架则诚实提示，落回 feed 首条
        try {
          const target = await videoApi.getById(pendingId.value)
          if (target?.id) {
            videos.value = [target, ...videos.value.filter((v) => v.id !== target.id)]
            currentIndex.value = 0
          } else {
            uni.showToast({ title: '视频不存在或已下架', icon: 'none' })
          }
        } catch {
          uni.showToast({ title: '视频不存在或已下架', icon: 'none' })
        }
      }
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}
function retry() { loadFeed() }

/**
 * 追加下一页：滑到倒数第 3 条触发（onSwiperChange 挂钩）。
 * 按 id + 标题双去重（list() 单页内已按标题去重·seed 重复数据跨页仍需防），
 * 同时过滤本会话「不感兴趣」的作者；空页视为断粮 → 最后一条自然滑不动（不加 toast 打扰）。
 */
async function loadMoreFeed() {
  if (feedLoadingMore.value || !feedHasMore.value) return
  feedLoadingMore.value = true
  try {
    const next = feedPage.value + 1
    const list = await videoApi.list({ page: next, pageSize: FEED_PAGE_SIZE })
    feedPage.value = next
    if (!list.length) { feedHasMore.value = false; return }
    const seenIds = new Set(videos.value.map((v) => v.id))
    const seenTitles = new Set(videos.value.map((v) => v.title))
    const fresh = list.filter((v) => !seenIds.has(v.id) && !seenTitles.has(v.title) && !(v.author?.id && dislikedAuthors.has(v.author.id)))
    if (fresh.length) videos.value.push(...fresh)
  } catch { /* 静默失败：下次滑动重试，不打断观看 */ }
  finally { feedLoadingMore.value = false }
}

// ===== 播放/UI 状态 =====
// 不静音（董事长拍板去掉静音起步）：初始视为未播放，autoplay 成功后 @play 事件置 true；
// 若浏览器拦截「有声」自动播放（@play 不触发），中央播放按钮保持可见，用户点一下即有声开播。
const isPlaying = ref(false)
const playError = ref(false) // 视频源加载失败 → 隐藏 player 回退到封面 + 诚实态提示
// 横屏视频适配：竖屏(9:16)用 cover 填满；横屏(16:9 如 OBS 录屏/风景课)用 contain 居中留黑边，
// 完整显示画面不裁切（抖音式）。宽>高×1.1 判为横屏。由 @loadedmetadata 跨端拿真实宽高。
const currentLandscape = ref(false)
let appPlayerCommandSeq = 0
const appPlayerCommand = ref<AppWebVideoCommand>({ seq: 0, type: 'pause' })
function commandAppPlayer(type: AppWebVideoCommand['type'], value?: number) {
  appPlayerCommand.value = { seq: ++appPlayerCommandSeq, type, value }
}
function onVideoMeta(e: any /* uni video @loadedmetadata：detail.{width,height}·vue-tsc 按 HTML video 校验须 any */) {
  const w = Number(e?.detail?.width) || 0
  const h = Number(e?.detail?.height) || 0
  currentLandscape.value = w > 0 && h > 0 && w > h * 1.1
}

// ===== 播放器控制（uni video context）=====
const instance = getCurrentInstance()
let videoCtx: ReturnType<typeof uni.createVideoContext> | null = null
function getVideoCtx() {
  if (!videoCtx) {
    try { videoCtx = uni.createVideoContext('vp-player', instance?.proxy || undefined) } catch { videoCtx = null }
  }
  return videoCtx
}
/**
 * 播放（吞掉 play() promise 拒绝）：
 * uni videoContext.play() 在 H5 内部不 catch，快速滑动切换时旧元素卸载会抛
 * 「The play() request was interrupted…」的 unhandledrejection；有声自动播放被浏览器
 * 拦截时同样拒绝。H5 直接驱动原生 <video> 并 catch，播放成败交给 @play 事件回写 isPlaying。
 */
function safePlay() {
  if (isAppPlusRuntime) { commandAppPlayer('play'); return }
  // #ifdef H5
  const media = document.querySelector<HTMLVideoElement>('.vp__video video') || document.querySelector<HTMLVideoElement>('video')
  if (media) {
    const p = media.play()
    if (p && typeof p.catch === 'function') p.catch(() => { /* 被拦截/切换中断 → 中央播放按钮兜底 */ })
    return
  }
  // #endif
  getVideoCtx()?.play()
}
function safePause() {
  if (isAppPlusRuntime) { commandAppPlayer('pause'); return }
  getVideoCtx()?.pause()
}
function togglePlay() {
  // 无真实视频源：仅切换占位播放态（封面模式）
  if (!currentVideo.value?.videoUrl || playError.value) {
    isPlaying.value = !isPlaying.value
    return
  }
  if (isPlaying.value) { safePause(); isPlaying.value = false }
  else { safePlay() } // isPlaying 由 @play 事件置 true（播放失败则按钮保留·诚实）
}
function onVideoPlay() { isPlaying.value = true }
function onVideoPause() { isPlaying.value = false }
function onVideoError() { playError.value = true; isPlaying.value = false }

// 切页/切后台时暂停视频，根除后台多音轨（点作者头像/圈子跳转时原视频不再后台出声）
// 长按 2x 中切页：倍速一并复位（否则回来续播仍是 2x）
onHide(() => { safePause(); isPlaying.value = false; if (speeding.value) { speeding.value = false; setPlaybackRate(1) } clearPressTimer() })

// ===== 长按 2 倍速（抖音式）=====
const speeding = ref(false)
let pressTimer: ReturnType<typeof setTimeout> | null = null
let suppressTap = false // 长按松手后紧随的 tap 属于长按残留 → 吞掉，不触发暂停/双击
let pressStartX = 0
let pressStartY = 0
let swipeLastX = 0
let swipeLastY = 0
let swipeStartAt = 0
let swipeStartIndex = 0
let swipeTracking = false
function setPlaybackRate(rate: number) {
  if (isAppPlusRuntime) { commandAppPlayer('rate', rate); return }
  // #ifdef H5
  const media = document.querySelector<HTMLVideoElement>('.vp__video video') || document.querySelector<HTMLVideoElement>('video')
  if (media) { media.playbackRate = rate; return }
  // #endif
  getVideoCtx()?.playbackRate(rate)
}
function clearPressTimer() { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null } }
function pressPoint(e: any, changed = false) {
  const t = (changed ? e?.changedTouches?.[0] : e?.touches?.[0])
    || e?.changedTouches?.[0]
    || e?.touches?.[0]
    || {}
  return { x: Number(t.clientX) || 0, y: Number(t.clientY) || 0 }
}
function onPressStart(e: any /* uni touch 事件跨端形状不一，参数须 any */) {
  clearPressTimer()
  const t = pressPoint(e)
  pressStartX = t.x
  pressStartY = t.y
  swipeLastX = t.x
  swipeLastY = t.y
  swipeStartAt = Date.now()
  swipeStartIndex = currentIndex.value
  swipeTracking = true
  // 仅播放中的真实视频可倍速；暂停态长按不响应（避免吞掉恢复播放的点按）
  if (!currentVideo.value?.videoUrl || playError.value || !isPlaying.value) return
  // 480ms 判定长按（> 双击窗口 280ms·短按/双击在 touchend 时先清掉计时器，互不冲突）
  pressTimer = setTimeout(() => {
    pressTimer = null
    speeding.value = true
    setPlaybackRate(2)
  }, 480)
}
function onPressMove(e: any) {
  if (!swipeTracking) return
  const t = pressPoint(e)
  swipeLastX = t.x
  swipeLastY = t.y
  const dx = t.x - pressStartX
  const dy = t.y - pressStartY
  if (Math.abs(dx) > 10 || Math.abs(dy) > 10) clearPressTimer() // 手指位移 → 视为滑动，取消长按
}
function onPressEnd(e?: any) {
  clearPressTimer()
  if (speeding.value) {
    speeding.value = false
    setPlaybackRate(1) // touchend/touchcancel 统一恢复 1x
    suppressTap = true
    setTimeout(() => { suppressTap = false }, 350) // 兜底自清（部分端长按后不派发 tap）
  }
  if (!swipeTracking) return
  const point = pressPoint(e, true)
  if (point.x || point.y) { swipeLastX = point.x; swipeLastY = point.y }
  swipeTracking = false
  const dx = swipeLastX - pressStartX
  const dy = swipeLastY - pressStartY
  const elapsed = Date.now() - swipeStartAt
  // Android App 的原生 video 可能吞掉 swiper 手势：满足明确纵向滑动时手动切页兜底。
  // 若 swiper 已先完成切页，currentIndex 已变化，本逻辑自动跳过，避免一次滑两条。
  if (
    currentIndex.value === swipeStartIndex
    && Math.abs(dy) >= 56
    && Math.abs(dy) > Math.abs(dx) * 1.2
    && elapsed <= 1200
  ) {
    const target = Math.max(0, Math.min(videos.value.length - 1, swipeStartIndex + (dy < 0 ? 1 : -1)))
    if (target !== swipeStartIndex) {
      suppressTap = true
      setTimeout(() => { suppressTap = false }, 350)
      currentIndex.value = target
      currentLandscape.value = false
      if (videos.value.length - target <= 3) loadMoreFeed()
    }
  }
}
function onPressCancel() {
  clearPressTimer()
  swipeTracking = false
  if (speeding.value) { speeding.value = false; setPlaybackRate(1) }
}

// ===== 播放进度（V0 底部细进度条）=====
const playProgress = ref(0) // 0-100
function onTimeUpdate(e: any /* uni video 事件经 vue-tsc 按原生签名校验，参数须 any */) {
  const cur = Number(e?.detail?.currentTime) || 0
  const dur = Number(e?.detail?.duration) || 0
  if (dur > 0) videoDuration.value = dur
  // 拖拽中/seek 生效前的短暂窗口：暂停对进度的回写，防进度条跳动
  if (seeking.value || Date.now() < seekSettleUntil) return
  playProgress.value = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0
}

// ===== 进度条拖拽 seek（视觉细条不变·外层透明热区≥40rpx）=====
const seeking = ref(false)
const seekProgress = ref(0) // 拖拽中的目标进度 0-100
const videoDuration = ref(0) // 秒·由 @timeupdate 回填
let seekSettleUntil = 0 // touchend 后短窗口内不回写进度（等 seek 生效）
const windowW = ref(sysInfo.windowWidth || 375)
const seekPreviewTime = computed(() => (videoDuration.value * seekProgress.value) / 100)

/** mm:ss（时间气泡用） */
function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(Number(sec) || 0))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
/** 触点 X → 进度比例（进度条左右各 32rpx 内边距） */
function seekRatio(e: any /* uni touch 事件·跨端形状不一，参数须 any */): number {
  const t = e?.touches?.[0] || e?.changedTouches?.[0] || {}
  const x = Number(t.clientX) || 0
  const pad = (windowW.value / 750) * 32
  const track = Math.max(1, windowW.value - pad * 2)
  return Math.min(1, Math.max(0, (x - pad) / track))
}
function onSeekStart(e: any) {
  if (!videoDuration.value) return // 元数据未就绪（无时长）不可拖
  seeking.value = true
  seekProgress.value = seekRatio(e) * 100
}
function onSeekMove(e: any) {
  if (!seeking.value) return
  seekProgress.value = seekRatio(e) * 100
}
function onSeekEnd() {
  if (!seeking.value) return
  const target = (videoDuration.value * seekProgress.value) / 100
  playProgress.value = seekProgress.value // 先回写视觉，防 seek 生效前跳回旧进度
  seekSettleUntil = Date.now() + 600
  seeking.value = false
  if (isAppPlusRuntime) { commandAppPlayer('seek', target); return }
  // #ifdef H5
  // 与 safePlay 同思路：H5 直接驱动原生 <video>（uni videoContext.seek 在 H5 偶发不生效）
  const media = document.querySelector<HTMLVideoElement>('.vp__video video') || document.querySelector<HTMLVideoElement>('video')
  if (media && Number.isFinite(target)) { media.currentTime = target; return }
  // #endif
  getVideoCtx()?.seek(target)
}

// ===== 来源圈子胶囊 → 圈子详情 =====
function goCircle() {
  const cid = currentVideo.value?.circle?.id
  if (cid) navigateTo(`/pkg-circle/circles/detail?id=${cid}`)
}
const showComments = ref(false)
const showProducts = ref(false)
const showCart = ref(false)
const floatingHearts = ref<Array<{ id: number; x: number; y: number }>>([])
const cart = ref<CartItem[]>([])
const addedToCart = ref<string | null>(null)

let heartId = 0
let lastTapTime = 0

const currentVideo = computed(() => videos.value[currentIndex.value])
/** swiper-item 渲染窗口：当前±1 才渲染内容（预加载前后各一条封面） */
function nearCurrent(i: number) { return Math.abs(i - currentIndex.value) <= 1 }

// ===== 带货商品懒加载（佣-V2-P3）：列表接口不含带货关联，切到某视频时按需拉取组装 =====
const productsFetched = new Set<string>()
async function loadProducts(v: VideoItem) {
  if (!v || v.products.length || productsFetched.has(v.id)) return
  productsFetched.add(v.id)
  try {
    const ps = await videoApi.getVideoProducts(v.id)
    if (ps.length) v.products = ps
  } catch { /* 无带货/接口失败 → 保持空，不展示同款好物入口（诚实降级） */ }
}
watch(currentVideo, (v) => { if (v) loadProducts(v) }, { immediate: true })

const cartTotal = computed(() => cart.value.reduce((s, i) => s + i.quantity, 0))
const cartAmount = computed(() => Math.round(cart.value.reduce((s, i) => s + i.quantity * i.product.price, 0) * 100) / 100)

onLoad((opts) => {
  if (opts?.id) pendingId.value = String(opts.id)
})
onMounted(loadFeed)

// 微信原生分享（分享当前正在播放的视频）
const { toAppMessage, toTimeline } = useShare()
onShareAppMessage(() => {
  if (currentVideo.value?.id) videoApi.share(currentVideo.value.id).catch(() => {}) // 记录分享数（不阻塞）
  return toAppMessage({
    title: currentVideo.value?.title || '国学视频',
    path: `/video/${currentVideo.value?.id || ''}`,
    cover: currentVideo.value?.coverUrl,
  })
})
onShareTimeline(() => toTimeline({
  title: currentVideo.value?.title || '国学视频',
  path: `/video/${currentVideo.value?.id || ''}`,
  cover: currentVideo.value?.coverUrl,
}))

// ===== 滑动切换（swiper 纵向轮播·双向可靠）=====
function onSwiperChange(e: any /* uni swiper 事件经 vue-tsc 按原生签名校验，参数须 any */) {
  const idx = Number(e?.detail?.current)
  if (Number.isFinite(idx) && idx !== currentIndex.value) {
    currentIndex.value = idx
    currentLandscape.value = false // 重置横竖屏标记，等新视频 @loadedmetadata 回填
    // feed 分页：滑到倒数第 3 条时静默追加下一页
    if (videos.value.length - idx <= 3) loadMoreFeed()
  }
}

// ===== 单击暂停 / 双击点赞 =====
function onSingleTap(e: { changedTouches?: Array<{ clientX?: number; clientY?: number }>; detail?: { clientX?: number; clientY?: number } }) {
  if (suppressTap) { suppressTap = false; return } // 长按 2x 松手残留的 tap → 吞掉
  const now = Date.now()
  if (now - lastTapTime < 280) {
    // 双击
    lastTapTime = 0
    const touch = e.changedTouches?.[0] || e.detail || {}
    const x = touch.clientX || windowW.value / 2 // 横坐标兜底用屏宽（原误用 windowH 屏高）
    const y = touch.clientY || windowH.value / 2
    const id = heartId++
    floatingHearts.value.push({ id, x, y })
    setTimeout(() => {
      floatingHearts.value = floatingHearts.value.filter((h) => h.id !== id)
    }, 1000)
    if (!currentVideo.value.isLiked) onLike()
    return
  }
  lastTapTime = now
  setTimeout(() => {
    if (lastTapTime !== 0 && Date.now() - lastTapTime >= 280) {
      togglePlay()
      lastTapTime = 0
    }
  }, 300)
}

// 点赞：乐观更新 UI + 真连 POST /videos/:id/like（后端去重返 {liked}）
async function onLike() {
  const v = currentVideo.value
  if (!v) return
  const prev = v.isLiked
  v.isLiked = !prev
  v.likes += v.isLiked ? 1 : -1
  try {
    const res = await videoApi.like(v.id)
    if (res.isLiked !== v.isLiked) { v.isLiked = res.isLiked; v.likes += res.isLiked ? 1 : -1 }
  } catch (e) {
    v.isLiked = prev; v.likes += prev ? 1 : -1 // 失败回滚
    uni.showToast({ title: (e as Error)?.message || '操作失败，请重试', icon: 'none' })
  }
}
// 收藏：乐观更新 + 真连 POST /videos/:id/collect
async function onCollect() {
  const v = currentVideo.value
  if (!v) return
  const prev = v.isCollected
  v.isCollected = !prev
  try {
    const res = await videoApi.collect(v.id)
    v.isCollected = res.isCollected
  } catch (e) {
    v.isCollected = prev // 失败回滚
    uni.showToast({ title: (e as Error)?.message || '操作失败，请重试', icon: 'none' })
  }
}
// 关注：真连 POST/DELETE /users/:id/follow（乐观切换 + 失败回滚·成功加号变√）
async function onFollow() {
  const v = currentVideo.value
  if (!v?.author?.id) return
  const prev = v.author.isFollowed
  v.author.isFollowed = !prev
  try {
    if (prev) await videoApi.unfollowAuthor(v.author.id)
    else await videoApi.followAuthor(v.author.id)
    if (!prev) uni.showToast({ title: '已关注', icon: 'none' })
  } catch (e) {
    v.author.isFollowed = prev // 失败回滚
    uni.showToast({ title: (e as Error)?.message || '操作失败，请先登录', icon: 'none' })
  }
}

// 点头像 → 作者主页（/user/:id → pkg-circle/user/profile）
function goAuthor() {
  const uid = currentVideo.value?.author?.id
  if (uid) navigateTo(`/user/${uid}`)
}

// ===== 分享（H5 无原生转发 → 面板：复制链接 + 转发引导；小程序仍走 onShareAppMessage）=====
const showShare = ref(false)
useOverlayScrollLock(() =>
  showComments.value || showShare.value || showProducts.value || showCart.value,
)
function onShare() { showShare.value = true }
function onReport() {
  const video = currentVideo.value
  if (!video) return
  gotoReport('VIDEO', video.id, video.title, video.author.name)
}
function buildShareUrl(): string {
  const vid = currentVideo.value?.id || ''
  return withRef(buildH5Url('pkg-video/detail/index', { id: vid })) // 携带分享者 ref（推荐归因）
}
async function copyShareLink() {
  const v = currentVideo.value
  if (!v) return
  uni.setClipboardData({
    data: buildShareUrl(),
    success: () => uni.showToast({ title: '链接已复制，粘贴给好友吧', icon: 'none' }),
  })
  showShare.value = false
  v.shares += 1
  try { await videoApi.share(v.id) } catch { v.shares -= 1 /* 计数失败回滚·不打扰 */ }
}

/**
 * 不感兴趣（负反馈）：后端 video 模块无 dislike/负反馈端点（已核 controller 全部路由）→
 * 纯本地过滤：本会话内移除当前作者的全部视频（无作者 id 时仅移除当前条），
 * 分页追加时同样过滤该作者（dislikedAuthors），并跳到下一条。
 */
const dislikedAuthors = new Set<string>()
function onNotInterested() {
  showShare.value = false
  const v = currentVideo.value
  if (!v) return
  const aid = v.author?.id || ''
  if (aid) dislikedAuthors.add(aid)
  const idx = currentIndex.value
  const keep = (it: VideoItem, i: number) => i !== idx && (!aid || it.author?.id !== aid)
  // 先记住「下一条」目标 = 原当前条之后第一条保留的视频
  const nextTarget = videos.value.find((it, i) => i > idx && keep(it, i))
  const filtered = videos.value.filter(keep)
  videos.value = filtered
  uni.showToast({ title: '将减少此类内容推荐', icon: 'none' })
  if (!filtered.length) { loadMoreFeed(); return } // 全被过滤 → 尝试补一页，空则显示诚实空态
  let ni = nextTarget ? filtered.findIndex((it) => it.id === nextTarget.id) : -1
  if (ni < 0) ni = Math.min(idx, filtered.length - 1)
  currentIndex.value = Math.max(0, ni) // 索引对应视频已变 → watch(currentVideo.id) 自动重置播放
}

// 切换视频时刷新真实关注态（后端列表默认 isFollowed=false）
watch(() => currentVideo.value?.id, async () => {
  // 切换到新视频：重置状态 + 主动播放。原实现仅靠 video 组件 autoplay + videoUrl 变化触发，
  // 但同源视频(videoUrl 不变)或移动端 autoplay 受限时不重播 → 需滑好几次。改为切换后主动 ctx.play()
  // （用户滑动已构成交互上下文，规避移动端自动播放限制）。
  playError.value = false
  playProgress.value = 0 // 切换视频 → 进度条清零
  videoDuration.value = 0 // 时长清零（等新视频 @timeupdate 回填·未回填前进度条不可拖）
  seeking.value = false
  seekSettleUntil = 0
  speeding.value = false // 长按 2x 复位（新 video 元素随 :key 重建，默认 1x·无需再调 setPlaybackRate）
  clearPressTimer()
  // 不静音策略：切换后先视为未播放（中央播放按钮可见），@play 事件触发才置 true；
  // 滑动手势本身构成用户交互上下文，多数浏览器允许随后的有声 ctx.play()，失败则按钮留给用户点。
  isPlaying.value = false
  // video 元素随 :key=id 重建，旧 context 已失效：置空让下方 nextTick 重新获取指向新元素，
  // 否则切到新视频时仍控制旧 <video> 导致画面不换（用户现象：滑动有切换动效但播放内容没变）。
  videoCtx = null
  const v = currentVideo.value
  nextTick(() => {
    if (v?.videoUrl && !playError.value) {
      safePlay()
    }
  })
  if (!v?.author?.id) return
  try { v.author.isFollowed = await videoApi.isFollowing(v.author.id) } catch { /* 未登录/失败保持默认 */ }
})

// ===== 评论子系统（真连通用 comment 端点·小红书/抖音式面板）=====
const comments = ref<VideoComment[]>([])
const commentTotal = ref(0)
const commentsLoading = ref(false)
const commentText = ref('')
const postingComment = ref(false)
/** 回复目标：楼中楼统一挂顶级评论（parentId=顶级 id·展示扁平一层更清爽） */
const replyTarget = ref<{ id: string; user: string } | null>(null)
const expandedIds = ref<string[]>([]) // 已展开楼中楼的顶级评论 id
const likedIds = ref<string[]>([]) // 本会话已点赞评论 id（后端仅计数不去重·前端防连点）
const highlightId = ref('') // 乐观插入后高亮一瞬的评论 id
const myInfo = getUserInfo<{ id?: string | number; nickname?: string; avatar?: string }>()
const myAvatar = myInfo?.avatar || ''

async function loadComments() {
  const v = currentVideo.value
  if (!v) return
  commentsLoading.value = true
  try {
    const res = await videoApi.getComments(v.id)
    comments.value = res.items
    commentTotal.value = res.total
    v.comments = res.total // 右侧操作栏计数与真实数据对齐
  } catch { comments.value = []; commentTotal.value = 0 }
  finally { commentsLoading.value = false }
}
function openComments() {
  showComments.value = true
  loadComments()
}
function closeComments() {
  showComments.value = false
  cancelReply()
}
function startReply(top: VideoComment, sub?: VideoComment) {
  replyTarget.value = { id: top.id, user: (sub || top).user }
}
function cancelReply() { replyTarget.value = null }
function toggleReplies(id: string) {
  const i = expandedIds.value.indexOf(id)
  if (i >= 0) expandedIds.value.splice(i, 1)
  else expandedIds.value.push(id)
}
/** 楼中楼扁平化（后端 replies 为递归嵌套·展示压成一层） */
function flatReplies(c: VideoComment): VideoComment[] {
  const out: VideoComment[] = []
  const walk = (list: VideoComment[]) => { for (const r of list) { out.push(r); walk(r.replies) } }
  walk(c.replies)
  return out
}
function countReplies(c: VideoComment): number { return flatReplies(c).length }

/** 发布评论：乐观上屏（临时 id + 高亮一瞬）→ 后端成功回填真实 id / 失败回滚 */
async function onPostComment() {
  const text = commentText.value.trim()
  const v = currentVideo.value
  if (!text || !v || postingComment.value) return
  postingComment.value = true
  const parent = replyTarget.value
  const tempId = `temp-${Date.now()}`
  const temp: VideoComment = {
    id: tempId,
    userId: String(myInfo?.id ?? ''),
    user: myInfo?.nickname || '我',
    avatar: myAvatar,
    content: text,
    likes: 0,
    createdAt: new Date().toISOString(),
    replies: [],
  }
  const topParent = parent ? comments.value.find((c) => c.id === parent.id) : undefined
  if (topParent) {
    topParent.replies.push(temp)
    if (!expandedIds.value.includes(topParent.id)) expandedIds.value.push(topParent.id)
  } else {
    comments.value.unshift(temp)
  }
  commentTotal.value += 1
  v.comments += 1
  highlightId.value = tempId
  setTimeout(() => { if (highlightId.value === tempId) highlightId.value = '' }, 1600)
  commentText.value = ''
  cancelReply()
  try {
    const real = await videoApi.postComment(v.id, text, parent?.id)
    // 回填真实 id（后续点赞/回复要用）；经数组代理定位保证响应式
    const list = topParent ? topParent.replies : comments.value
    const item = list.find((c) => c.id === tempId)
    if (item && real.id) item.id = real.id
  } catch (e) {
    // 失败回滚（含内容审核拒绝）
    if (topParent) topParent.replies = topParent.replies.filter((r) => r.id !== tempId)
    else comments.value = comments.value.filter((c) => c.id !== tempId)
    commentTotal.value -= 1
    v.comments -= 1
    commentText.value = text // 还回输入内容，方便改后重发
    uni.showToast({ title: (e as Error)?.message || '评论失败', icon: 'none' })
  } finally {
    postingComment.value = false
  }
}
async function onLikeComment(c: VideoComment) {
  if (c.id.startsWith('temp-')) return // 乐观临时评论未落库·不可点赞
  if (likedIds.value.includes(c.id)) return
  likedIds.value.push(c.id)
  c.likes += 1 // 乐观
  try { await videoApi.likeComment(c.id) }
  catch { c.likes -= 1; likedIds.value = likedIds.value.filter((i) => i !== c.id) }
}

function addToCart(product: VideoProduct) {
  const existing = cart.value.find((i) => i.productId === product.id)
  if (existing) existing.quantity += 1
  else cart.value.push({ productId: product.id, quantity: 1, product })
  addedToCart.value = product.id
  setTimeout(() => { addedToCart.value = null }, 1500)
}
function updateQty(productId: string, delta: number) {
  const item = cart.value.find((i) => i.productId === productId)
  if (!item) return
  item.quantity += delta
  if (item.quantity <= 0) cart.value = cart.value.filter((i) => i.productId !== productId)
}
/**
 * 去结算（佣-V2-P3）：本地选购同步到服务端购物车 → 跳真实结算页，URL 带 VIDEO 内容来源
 * （sourceContentType/Id 透传到 createOrder 落库·纯记录内容场景归因）。
 */
const checkingOut = ref(false)
async function onCheckout() {
  if (checkingOut.value) return
  if (!cart.value.length) return
  const vid = currentVideo.value?.id || ''
  checkingOut.value = true
  try {
    // 结算页购物车模式按服务端购物车项 id 取货 → 先把本地选购写入服务端购物车
    let latest: { id: string; productId: string }[] = []
    for (const it of cart.value) {
      const res = await shopApi.addToCart(it.productId, it.quantity)
      latest = res.items
    }
    const wanted = new Set(cart.value.map((i) => i.productId))
    const ids = latest.filter((i) => wanted.has(i.productId)).map((i) => i.id)
    if (!ids.length) { uni.showToast({ title: '商品已失效，无法结算', icon: 'none' }); return }
    showCart.value = false
    navigateTo(`/pkg-shop/checkout/index?items=${ids.join(',')}&sourceContentType=VIDEO&sourceContentId=${vid}`)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '结算失败，请重试', icon: 'none' })
  } finally {
    checkingOut.value = false
  }
}

function onBack() {
  goBack()
}
</script>

<style scoped lang="scss">
/* V0 深色沉浸场景 token（播放页为全板块唯一深色页面） */
.vp {
  position: fixed;
  inset: 0;
  background: #141216; /* V2 深色沉浸场景底（V0：#141216），视频层实际画面盖住 */
  overflow: hidden;
  /* 安卓微信 X5：禁掉页面下拉刷新/边界回弹，避免下滑手势被页面消费（返回上一个失灵的元凶） */
  overscroll-behavior: none;
}
.vp__state { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; z-index: 30; }
.vp__state-txt { color: rgba(255,255,255,0.8); font-size: 28rpx; }
.vp__state-btn { padding: 14rpx 44rpx; background: var(--brand); border-radius: 999rpx; }
.vp__state-btn-txt { color: #fff; font-size: 26rpx; }
/* swiper 纵向轮播充满全屏；touch-action:none 让 X5 把垂直手势全交给 swiper（不触发页面滚动） */
.vp__stage { position: absolute; inset: 0; overflow: hidden; width: 100%; height: 100%; touch-action: none; }
.vp__layer { position: absolute; inset: 0; width: 100%; height: 100%; }
/* 不可播诚实态（.mov 等安卓不支持格式/转码中） */
.vp__unplayable {
  position: absolute; inset: 0; z-index: 2;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16rpx;
  background: rgba(0,0,0,0.45);
}
.vp__unplayable-txt { color: rgba(255,255,255,0.9); font-size: 30rpx; font-weight: 500; }
.vp__unplayable-sub { color: rgba(255,255,255,0.55); font-size: 24rpx; }
.vp__cover { width: 100%; height: 100%; }
/* 播放器覆盖在封面之上；pointer-events:none 让单击/上下滑手势穿透到父层由脚本统一控制 */
.vp__video { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none; }
/* 上下渐隐遮罩（V0：顶部 96px / 底部 220px 渐隐保证文字可读） */
.vp__shade { position: absolute; inset: 0; pointer-events: none; z-index: 2; }
.vp__shade::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 192rpx;
  background: linear-gradient(to bottom, rgba(20,18,22,0.55), transparent);
}
/* 底部渐变衬底（V2·深底 #141216 0→72%·保证任意画面文字可读·不依赖毛玻璃承载信息） */
.vp__shade::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 400rpx;
  background: linear-gradient(to top, rgba(20,18,22,0.72), rgba(20,18,22,0));
}
.vp__pause { position: absolute; inset: 0; z-index: 2; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.2); }
.vp__pause-btn { width: 140rpx; height: 140rpx; border-radius: 999rpx; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.vp__heart { position: absolute; z-index: 3; animation: float-heart 1s ease-out forwards; pointer-events: none; }
@keyframes float-heart {
  0% { transform: scale(0) translateY(0); opacity: 1; }
  50% { transform: scale(1.2) translateY(-50px); opacity: 1; }
  100% { transform: scale(1) translateY(-100px); opacity: 0; }
}

/* 滑动提示（V0 swipe-hint：底部居中·箭头轻浮动画） */
.vp__swipe-tip {
  position: absolute; left: 50%; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: 12rpx;
  z-index: 10; pointer-events: none; animation: tip-pulse 2s ease-in-out infinite;
}
.vp__swipe-tip-txt { font-size: 22rpx; color: rgba(255,255,255,0.5); }
@keyframes tip-pulse { 0%,100% { opacity: 0.5; transform: translateX(-50%) translateY(0); } 50% { opacity: 1; transform: translateX(-50%) translateY(-8rpx); } }

/* 顶部导航 */
.vp__top { position: absolute; top: 0; left: 0; right: 0; z-index: 30; }
.vp__top-row { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; }
/* 触控热区撑到 88rpx（负 margin 抵消占位·视觉圆钮仍 64rpx 由 ::before 绘制，位置不变） */
.vp__icon-btn { position: relative; width: 88rpx; height: 88rpx; margin: -12rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.vp__icon-btn::before { content: ''; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 64rpx; height: 64rpx; border-radius: 999rpx; background: rgba(0,0,0,0.3); z-index: -1; }
.vp__top-right { display: flex; align-items: center; gap: 12rpx; }
/* 徽标定位随热区外扩 12rpx 内收，保持贴视觉圆钮右上角不变 */
.vp__cart-badge { position: absolute; top: 6rpx; right: 6rpx; min-width: 32rpx; height: 32rpx; padding: 0 6rpx; border-radius: 999rpx; background: var(--brand); color: #fff; font-size: 18rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; }

/* 来源圈子胶囊（V0 source-pill：深色毛玻璃圆角胶囊） */
.vp__source-pill {
  display: flex; align-items: center; gap: 12rpx;
  height: 64rpx; padding: 0 24rpx 0 8rpx; max-width: 380rpx;
  background: rgba(0,0,0,0.35); border-radius: 32rpx;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
/* 圈子头像后端无 → 用小图标替位（V0 胶囊内 24px 圆头像位） */
.vp__source-pill-ico {
  width: 48rpx; height: 48rpx; border-radius: 999rpx;
  background: rgba(255,255,255,0.14);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.vp__source-pill-name { font-size: 24rpx; font-weight: 500; color: #fff; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

/* 右侧互动（V0 actions：无底圈·图标白描边带投影·数字 11px 白 72%） */
.vp__actions { position: absolute; right: 24rpx; bottom: 352rpx; z-index: 30; display: flex; flex-direction: column; align-items: center; gap: 40rpx; }
.vp__avatar-wrap { position: relative; margin-bottom: 12rpx; }
.vp__avatar { width: 88rpx; height: 88rpx; border-radius: 999rpx; border: 3rpx solid #fff; background: #333; }
/* 关注钮：44rpx 可点面积（原 32rpx 安卓难命中）·已关注变√灰底 */
.vp__follow-plus { position: absolute; bottom: -20rpx; left: 50%; transform: translateX(-50%); width: 44rpx; height: 44rpx; border-radius: 999rpx; background: var(--brand); border: 3rpx solid rgba(255,255,255,0.9); display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
.vp__follow-plus--ok { background: rgba(120,120,128,0.75); }
.vp__act {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 88rpx;
  min-height: 88rpx;
  gap: 8rpx;
}
/* 图标 wrap：柔投影保任意画面可读（V0 drop-shadow 0 2px 5px .45）·激活动效作用于此层（纯 transform·X5 禁 filter 动画） */
.vp__act-ico { display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2rpx 5rpx rgba(0,0,0,0.45)); transform: scale(1); }
/* 点赞「爆红心」：80ms 放大 1.28 → 200ms 回 1（transform/opacity·无 filter 动画） */
.vp__act-ico--liked { animation: act-burst-heart 0.2s ease-out; }
@keyframes act-burst-heart { 0% { transform: scale(1); } 40% { transform: scale(1.28); } 100% { transform: scale(1); } }
/* 收藏「金星」：100ms 放大 1.3 带轻摆 → 240ms 回正 */
.vp__act-ico--starred { animation: act-burst-star 0.24s ease-out; }
@keyframes act-burst-star { 0% { transform: scale(1) rotate(0); } 42% { transform: scale(1.3) rotate(-8deg); } 100% { transform: scale(1) rotate(0); } }
.vp__act-txt { font-size: 22rpx; color: rgba(255,255,255,0.92); text-shadow: 0 1rpx 3rpx rgba(0,0,0,0.5); }
/* 计数等宽·投影保底可读（V0 11px 白 92%） */
.vp__act-txt--num { font-variant-numeric: tabular-nums; }

/* 底部信息（V0 info：left 16px / right 76px 区域·字级 作者名>标题>标签） */
.vp__bottom { position: absolute; left: 0; right: 152rpx; bottom: 0; z-index: 30; padding: 28rpx 0 0 32rpx; display: flex; flex-direction: column; gap: 16rpx; }
/* 「仅自己可见」灰标（V0 self-only：灰底 6px 圆角·眼斜杠图标·不突兀） */
.vp__self-only { display: inline-flex; align-items: center; gap: 8rpx; width: fit-content; padding: 5rpx 16rpx; border-radius: 12rpx; background: rgba(110,110,115,0.55); }
.vp__self-only-txt { font-size: 22rpx; color: rgba(255,255,255,0.85); }
.vp__author-row { display: flex; align-items: center; gap: 12rpx; }
/* 作者名 16/700（信息区字级顶层）·投影保可读 */
.vp__author-name { font-size: 32rpx; font-weight: 700; color: #fff; text-shadow: 0 1rpx 4rpx rgba(0,0,0,0.4); }
/* 认证徽章（V0 badge：金描边小徽章） */
.vp__auth-badge { padding: 2rpx 12rpx; border-radius: 10rpx; border: 1rpx solid #C9A96E; background: transparent; }
.vp__auth-badge-txt { font-size: 20rpx; color: #C9A96E; }
/* 标题 13.5/1.55（次层）·投影保可读 */
.vp__title { display: block; font-size: 27rpx; color: rgba(255,255,255,0.88); line-height: 1.55; text-shadow: 0 1rpx 3rpx rgba(0,0,0,0.4); }
/* 圈子小胶囊（V0 circle-pill：白16%底+白30%描边+金点缀·可点进圈子·标签字级最底层） */
.vp__circle-pill { display: inline-flex; align-items: center; gap: 8rpx; width: fit-content; padding: 6rpx 18rpx 6rpx 14rpx; border-radius: 999rpx; background: rgba(255,255,255,0.16); border: 1rpx solid rgba(255,255,255,0.3); transition: background 0.15s; }
.vp__circle-pill--hover { background: rgba(255,255,255,0.26); }
.vp__circle-pill-txt { font-size: 23rpx; color: #fff; max-width: 340rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

/* 推广浮卡（V0 promo-float：深色毛玻璃小卡·首件商品+金色价格） */
.vp__promo {
  display: flex; align-items: center; gap: 16rpx;
  margin-top: 8rpx; height: 80rpx; padding: 0 24rpx 0 10rpx;
  max-width: 500rpx;
  background: rgba(0,0,0,0.35); border-radius: 20rpx;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.vp__promo-img { width: 60rpx; height: 60rpx; border-radius: 14rpx; flex-shrink: 0; background: #333; }
.vp__promo-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.vp__promo-name { font-size: 24rpx; font-weight: 500; color: #fff; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.vp__promo-price-row { display: flex; align-items: baseline; gap: 12rpx; }
.vp__promo-price { font-size: 22rpx; color: #C9A96E; font-weight: 600; }
.vp__promo-more { font-size: 20rpx; color: rgba(255,255,255,0.5); }

/* 播放进度条（V0 progress：底部细线·常态 2px 白22%·已播白90% 圆角·无拖动逻辑故仅常态视觉） */
.vp__progress-bar {
  position: absolute; left: 32rpx; right: 32rpx; z-index: 30;
  height: 4rpx; border-radius: 4rpx; background: rgba(255,255,255,0.22);
  overflow: hidden;
}
.vp__progress-played { height: 100%; border-radius: 0 4rpx 4rpx 0; background: rgba(255,255,255,0.9); }

/* 弹层通用 */
.sheet-mask { position: fixed; inset: 0; z-index: 40; background: rgba(0,0,0,0.5); }
.sheet { position: absolute; left: 0; right: 0; bottom: 0; background: var(--surface, #fff); border-radius: 32rpx 32rpx 0 0; max-height: 70vh; display: flex; flex-direction: column; animation: slide-up 0.3s ease-out; }
@keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
.sheet__head { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 28rpx; border-bottom: 1rpx solid var(--border, #eee); }
.sheet__title { font-size: 30rpx; font-weight: 600; color: var(--text, #1a1a1a); }
.sheet__body { padding: 28rpx; max-height: 56vh; }
.sheet__more { display: block; text-align: center; font-size: 22rpx; color: var(--text-muted, #999); padding: 28rpx 0; }
.sheet__empty { display: block; text-align: center; font-size: 26rpx; color: var(--text-muted, #999); padding: 64rpx 0; }

/* ===== 评论面板（小红书/抖音式半屏抽屉·深色与播放页一致）===== */
.cs-mask { position: fixed; inset: 0; z-index: 40; background: rgba(0,0,0,0.5); }
.cs {
  position: absolute; left: 0; right: 0; bottom: 0;
  background: rgba(28,25,32,0.97); border-radius: 36rpx 36rpx 0 0;
  height: 68vh; display: flex; flex-direction: column;
  color: #E9E4DD;
  animation: slide-up 0.28s ease-out;
}
.cs--share { height: auto; padding-bottom: 48rpx; }
.cs__grabber { width: 72rpx; height: 8rpx; border-radius: 999rpx; background: rgba(255,255,255,0.22); margin: 16rpx auto 0; flex-shrink: 0; }
.cs__head { position: relative; display: flex; align-items: center; justify-content: center; padding: 20rpx 28rpx 16rpx; flex-shrink: 0; }
.cs__title { font-size: 26rpx; font-weight: 500; color: rgba(233,228,221,0.9); }
.cs__close { position: absolute; right: 24rpx; top: 50%; transform: translateY(-50%); width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.cs__body { flex: 1; min-height: 0; padding: 8rpx 28rpx 24rpx; box-sizing: border-box; }
.cs__hint { display: block; text-align: center; font-size: 24rpx; color: rgba(255,255,255,0.4); padding: 48rpx 0; }
.cs__empty { display: flex; flex-direction: column; align-items: center; gap: 12rpx; padding: 96rpx 0; }
.cs__empty-txt { font-size: 28rpx; color: rgba(255,255,255,0.55); }
.cs__empty-sub { font-size: 22rpx; color: rgba(255,255,255,0.3); }
.cs__end { padding: 32rpx 0 16rpx; display: flex; justify-content: center; }
.cs__end-txt { font-size: 22rpx; color: rgba(255,255,255,0.25); }

/* 评论项：头像 + (昵称弱色/正文主体/时间·回复行) + 右侧点赞小柱 */
.cs-item { display: flex; gap: 20rpx; padding: 20rpx 0; border-radius: 16rpx; transition: background 0.5s; }
.cs-item--flash { background: rgba(196,30,58,0.16); }
.cs-item--sub { padding: 14rpx 0 6rpx; }
.cs-item__avatar { width: 68rpx; height: 68rpx; border-radius: 999rpx; background: #333; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cs-item__avatar--sub { width: 48rpx; height: 48rpx; }
.cs-item__avatar-txt { font-size: 26rpx; font-weight: 500; color: rgba(255,255,255,0.6); }
.cs-item__main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.cs-item__user { font-size: 24rpx; color: rgba(233,228,221,0.55); margin-bottom: 6rpx; }
/* 正文暖白 #E9E4DD 14/1.55（V0） */
.cs-item__content { font-size: 28rpx; line-height: 1.55; color: #E9E4DD; word-break: break-all; }
.cs-item__meta { display: flex; align-items: center; gap: 32rpx; margin-top: 10rpx; }
.cs-item__time { font-size: 22rpx; color: rgba(233,228,221,0.4); }
.cs-item__reply-btn { font-size: 22rpx; font-weight: 500; color: rgba(233,228,221,0.55); padding: 6rpx 0; }
.cs-item__like { display: flex; flex-direction: column; align-items: center; gap: 4rpx; padding: 4rpx 0 0 8rpx; flex-shrink: 0; min-width: 56rpx; }
.cs-item__like-num { font-size: 20rpx; color: rgba(233,228,221,0.45); min-height: 24rpx; }
.cs-item__like-num--on { color: #C41E3A; }
/* 楼中楼 */
.cs-item__replies { margin-top: 6rpx; }
.cs-item__expand { display: flex; align-items: center; gap: 12rpx; padding: 14rpx 0 4rpx; }
.cs-item__expand-line { width: 48rpx; height: 1rpx; background: rgba(255,255,255,0.25); }
.cs-item__expand-txt { font-size: 22rpx; color: rgba(255,255,255,0.45); }

/* 底部常驻输入条 */
.cs-input { flex-shrink: 0; border-top: 1rpx solid rgba(255,255,255,0.1); background: rgba(28,25,32,0.97); padding: 16rpx 28rpx 0; }
.cs-input__reply-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 8rpx 12rpx; }
.cs-input__reply-txt { font-size: 22rpx; color: rgba(255,255,255,0.5); }
.cs-input__reply-cancel { width: 44rpx; height: 44rpx; display: flex; align-items: center; justify-content: center; }
.cs-input__row { display: flex; align-items: center; gap: 16rpx; }
.cs-input__avatar { width: 60rpx; height: 60rpx; border-radius: 999rpx; background: #333; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.cs-input__field { flex: 1; height: 72rpx; padding: 0 28rpx; background: rgba(255,255,255,0.08); border-radius: 999rpx; font-size: 26rpx; color: rgba(255,255,255,0.92); }
.cs-input__ph { color: rgba(255,255,255,0.35); }
.cs-input__send { flex-shrink: 0; padding: 16rpx 34rpx; border-radius: 999rpx; background: rgba(255,255,255,0.12); transition: background 0.2s; }
.cs-input__send--on { background: var(--brand); }
.cs-input__send-txt { font-size: 26rpx; font-weight: 500; color: #fff; }

/* 分享面板 */
.share-opts { display: flex; gap: 48rpx; padding: 24rpx 40rpx 8rpx; }
.share-opt { display: flex; flex-direction: column; align-items: center; gap: 14rpx; }
.share-opt__ico { width: 104rpx; height: 104rpx; border-radius: 999rpx; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; }
.share-opt__txt { font-size: 22rpx; color: rgba(233,228,221,0.75); }
.share-tip { display: block; padding: 20rpx 40rpx 0; font-size: 22rpx; line-height: 1.6; color: rgba(233,228,221,0.4); }

/* 商品 */
.prod { display: flex; gap: 20rpx; padding: 20rpx; background: var(--surface-sunken, #f7f7f7); border-radius: 20rpx; margin-bottom: 18rpx; }
.prod__img { width: 140rpx; height: 140rpx; border-radius: 14rpx; flex-shrink: 0; }
.prod__info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.prod__name { font-size: 26rpx; font-weight: 500; color: var(--text, #1a1a1a); line-height: 1.4; }
.prod__price-row { display: flex; align-items: baseline; gap: 12rpx; margin: 10rpx 0; }
.prod__price { font-size: 30rpx; font-weight: 700; color: var(--brand); }
.prod__origin { font-size: 22rpx; color: var(--text-muted, #999); text-decoration: line-through; }
.prod__foot { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
.prod__sales { font-size: 22rpx; color: var(--text-muted, #999); }
.prod__buy { padding: 10rpx 28rpx; border-radius: 999rpx; background: var(--brand); }
.prod__buy--added { background: #34A853; }
.prod__buy-txt { font-size: 22rpx; color: #fff; font-weight: 500; }

/* 购物车 */
.cart-row { display: flex; gap: 20rpx; padding: 20rpx; background: var(--surface-sunken, #f7f7f7); border-radius: 20rpx; margin-bottom: 18rpx; align-items: center; }
.cart-row__img { width: 112rpx; height: 112rpx; border-radius: 14rpx; flex-shrink: 0; }
.cart-row__info { flex: 1; min-width: 0; }
.cart-row__name { display: block; font-size: 26rpx; font-weight: 500; color: var(--text, #1a1a1a); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-bottom: 8rpx; }
.cart-row__price { font-size: 28rpx; font-weight: 700; color: var(--brand); }
.cart-row__qty { display: flex; align-items: center; gap: 16rpx; }
.cart-row__btn { width: 48rpx; height: 48rpx; border-radius: 999rpx; background: var(--surface, #fff); border: 1rpx solid var(--border, #eee); display: flex; align-items: center; justify-content: center; }
.cart-row__num { min-width: 36rpx; text-align: center; font-size: 26rpx; font-weight: 500; color: var(--text, #1a1a1a); }
.cart-foot { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 28rpx; border-top: 1rpx solid var(--border, #eee); }
.cart-foot__label { font-size: 24rpx; color: var(--text-muted, #999); }
.cart-foot__amount { font-size: 38rpx; font-weight: 700; color: var(--brand); }
.cart-foot__checkout { padding: 20rpx 56rpx; border-radius: 999rpx; background: var(--brand); }
.cart-foot__checkout-txt { font-size: 28rpx; color: #fff; font-weight: 500; }
</style>
