<template>
  <view class="page">
    <!-- 加载中 -->
    <view
      v-if="loading"
      class="loading-state"
    >
      <text class="loading-text">
        加载中...
      </text>
    </view>

    <!-- 页面内容 -->
    <template v-else-if="pageData">
      <view
        v-if="pageData.name"
        class="page-header"
      >
        <text class="page-title">
          {{ pageData.name }}
        </text>
      </view>

      <view
        v-for="(comp, idx) in visibleComponents"
        :key="comp.id || idx"
        class="comp-wrapper"
      >
        <!-- 轮播图 -->
        <view
          v-if="comp.type === 'CAROUSEL'"
          class="comp-carousel"
        >
          <swiper
            :autoplay="true"
            :circular="true"
            :interval="3000"
            class="carousel-swiper"
          >
            <swiper-item
              v-for="(img, i) in (comp.config.images || comp.config.banners || [])"
              :key="i"
            >
              <image
                :src="img"
                class="carousel-img"
                mode="aspectFill"
                @click="onBannerClick(comp.config, i)"
              />
            </swiper-item>
          </swiper>
        </view>

        <!-- 倒计时 -->
        <view
          v-else-if="comp.type === 'COUNTDOWN'"
          class="comp-countdown"
        >
          <text class="cd-label">
            {{ comp.config.label || comp.title || '倒计时' }}
          </text>
          <text class="cd-time">
            {{ countdownText(comp.config.targetTime) }}
          </text>
        </view>

        <!-- 图片 -->
        <view
          v-else-if="comp.type === 'IMAGE'"
          class="comp-image"
        >
          <image
            :src="comp.config.src || comp.config.url"
            class="single-img"
            mode="widthFix"
            @click="onImageClick(comp.config)"
          />
        </view>

        <!-- 文本 -->
        <view
          v-else-if="comp.type === 'TEXT'"
          class="comp-text"
        >
          <rich-text :nodes="comp.config.content || comp.config.text || comp.title || ''" />
        </view>

        <!-- 秒杀专区 -->
        <view
          v-else-if="comp.type === 'FLASHSALE'"
          class="comp-section"
        >
          <view class="section-hd">
            <text class="section-title">
              ⚡ 限时秒杀
            </text>
          </view>
          <scroll-view
            scroll-x
            class="product-scroll"
          >
            <view
              v-for="item in (flashItems || [])"
              :key="item.id"
              class="product-card-sm"
              @click="goProduct(item)"
            >
              <image
                :src="item.cover || item.image"
                class="pcard-img"
                mode="aspectFill"
              />
              <text class="pcard-name">
                {{ item.name || item.title }}
              </text>
              <text class="pcard-price">
                ¥{{ item.flashPrice || item.price }}
              </text>
            </view>
          </scroll-view>
        </view>

        <!-- 拼团专区 -->
        <view
          v-else-if="comp.type === 'GROUPBUY'"
          class="comp-section"
        >
          <view class="section-hd">
            <text class="section-title">
              👥 超值拼团
            </text>
          </view>
          <scroll-view
            scroll-x
            class="product-scroll"
          >
            <view
              v-for="item in (groupBuyItems || [])"
              :key="item.id"
              class="product-card-sm"
              @click="goProduct(item)"
            >
              <image
                :src="item.cover || item.image"
                class="pcard-img"
                mode="aspectFill"
              />
              <text class="pcard-name">
                {{ item.name || item.title }}
              </text>
              <text class="pcard-price">
                ¥{{ item.groupPrice || item.price }} / {{ item.minMembers || 2 }}人团
              </text>
            </view>
          </scroll-view>
        </view>

        <!-- 独立秒杀（页面内嵌） -->
        <view
          v-else-if="comp.type === 'FLASHSALE_INDEPENDENT'"
          class="comp-section"
        >
          <view class="section-hd">
            <text class="section-title">
              ⚡ {{ comp.title || '限时秒杀' }}
            </text>
          </view>
          <view
            class="indie-product-card"
            @click="goProduct({ id: comp.config?.productId })"
          >
            <image
              :src="comp.config?.cover || ''"
              class="indie-img"
              mode="aspectFill"
            />
            <view class="indie-info">
              <text class="indie-name">
                商品ID: {{ comp.config?.productId || '' }}
              </text>
              <view class="indie-price-row">
                <text class="indie-price">
                  ¥{{ comp.config?.flashPrice || 0 }}
                </text>
                <text
                  v-if="comp.config?.originalPrice"
                  class="indie-original"
                >
                  ¥{{ comp.config.originalPrice }}
                </text>
              </view>
              <text class="indie-stock">
                库存 {{ comp.config?.stock || 0 }} | 限购 {{ comp.config?.limitPerUser || 1 }}
              </text>
            </view>
            <view class="indie-btn flash-btn">
              立即抢购
            </view>
          </view>
        </view>

        <!-- 独立拼团（页面内嵌） -->
        <view
          v-else-if="comp.type === 'GROUPBUY_INDEPENDENT'"
          class="comp-section"
        >
          <view class="section-hd">
            <text class="section-title">
              👥 {{ comp.title || '超值拼团' }}
            </text>
          </view>
          <view
            class="indie-product-card"
            @click="goProduct({ id: comp.config?.productId })"
          >
            <image
              :src="comp.config?.cover || ''"
              class="indie-img"
              mode="aspectFill"
            />
            <view class="indie-info">
              <text class="indie-name">
                商品ID: {{ comp.config?.productId || '' }}
              </text>
              <view class="indie-price-row">
                <text class="indie-price">
                  ¥{{ comp.config?.groupPrice || 0 }}
                </text>
                <text
                  v-if="comp.config?.originalPrice"
                  class="indie-original"
                >
                  ¥{{ comp.config.originalPrice }}
                </text>
              </view>
              <text class="indie-stock">
                {{ comp.config?.minMembers || 2 }}人成团 | 库存 {{ comp.config?.stock || 0 }}
              </text>
            </view>
            <view class="indie-btn group-btn">
              去开团
            </view>
          </view>
        </view>

        <!-- 优惠券 -->
        <view
          v-else-if="comp.type === 'COUPON'"
          class="comp-section"
        >
          <view class="section-hd">
            <text class="section-title">
              🎫 领券中心
            </text>
          </view>
          <scroll-view
            scroll-x
            class="coupon-scroll"
          >
            <view
              v-for="c in (coupons || [])"
              :key="c.id"
              class="coupon-card"
              @click="claimCoupon(c)"
            >
              <text class="coupon-value">
                {{ c.type === 'PERCENT' ? c.faceValue + '%' : '¥' + c.faceValue }}
              </text>
              <text class="coupon-cond">
                满{{ c.threshold || 0 }}可用
              </text>
              <text class="coupon-btn">
                领取
              </text>
            </view>
          </scroll-view>
        </view>

        <!-- 商品列表 -->
        <view
          v-else-if="comp.type === 'PRODUCT_LIST'"
          class="comp-section"
        >
          <view class="section-hd">
            <text class="section-title">
              {{ comp.title || '精选商品' }}
            </text>
          </view>
          <view class="product-grid">
            <view
              v-for="item in (productListItems || [])"
              :key="item.id"
              class="product-grid-item"
              @click="goProduct(item)"
            >
              <image
                :src="item.cover || item.image"
                class="grid-img"
                mode="aspectFill"
              />
              <text class="grid-name">
                {{ item.name || item.title }}
              </text>
              <view class="grid-price-row">
                <text class="grid-price">
                  {{ comp.config.showPrice !== false ? '¥' + (item.price || 0) : '' }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <!-- 推荐 -->
        <view
          v-else-if="comp.type === 'RECOMMEND'"
          class="comp-section"
        >
          <view class="section-hd">
            <text class="section-title">
              {{ comp.title || '为您推荐' }}
            </text>
          </view>
          <view
            v-for="item in (recommendItems || [])"
            :key="item.id"
            class="recommend-item"
            @click="goContent(item)"
          >
            <image
              :src="item.cover || item.image"
              class="rec-img"
              mode="aspectFill"
            />
            <view class="rec-info">
              <text class="rec-title">
                {{ item.title }}
              </text>
              <text class="rec-desc">
                {{ item.description || item.summary || '' }}
              </text>
            </view>
          </view>
        </view>

        <!-- 未知类型 -->
        <view
          v-else
          class="comp-unknown"
        >
          <text class="unknown-label">
            {{ comp.title || comp.type }}
          </text>
        </view>
      </view>

      <!-- 空页面 -->
      <view
        v-if="!visibleComponents.length"
        class="empty-state"
      >
        <text>暂无可展示的内容</text>
      </view>
    </template>

    <!-- 页面不存在 -->
    <view
      v-else
      class="empty-state"
    >
      <text>页面不存在或已下架</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { marketingApi, shopApi } from "../../api";

const loading = ref(true);
const pageData = ref<any>(null);
const flashItems = ref<any[]>([]);
const groupBuyItems = ref<any[]>([]);
const coupons = ref<any[]>([]);
const productListItems = ref<any[]>([]);
const recommendItems = ref<any[]>([]);
const timer = ref<ReturnType<typeof setInterval> | null>(null);
const now = ref(Date.now());

const visibleComponents = computed(() => {
  if (!pageData.value?.components) return [];
  return pageData.value.components.filter((c: any) => {
    if (c.startTime && new Date(c.startTime).getTime() > now.value) return false;
    if (c.endTime && new Date(c.endTime).getTime() < now.value) return false;
    return true;
  });
});

onLoad((query: any) => {
  const route = query?.route || "";
  if (route) fetchPage(route);
  else loading.value = false;
});

onMounted(() => {
  timer.value = setInterval(() => { now.value = Date.now(); }, 1000);
});

function countdownText(targetTime: string) {
  if (!targetTime) return "";
  const diff = new Date(targetTime).getTime() - now.value;
  if (diff <= 0) return "已开始";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function fetchPage(route: string) {
  loading.value = true;
  try {
    const data = await marketingApi.pageByRoute(route);
    const page = data?.page || data?.data || data;
    pageData.value = page;

    // 预加载各组件所需数据
    const comps = page.components || [];
    for (const c of comps) {
      switch (c.type) {
        case "FLASHSALE":
          try {
            const r = await marketingApi.flashSales({ page: 1, pageSize: c.config?.displayCount || 10 });
            flashItems.value = r?.flashSales || r?.data || [];
          } catch { /* */ }
          break;
        case "GROUPBUY":
          try {
            const r = await marketingApi.groupBuys({ page: 1, pageSize: c.config?.displayCount || 10 });
            groupBuyItems.value = r?.groupBuys || r?.data || [];
          } catch { /* */ }
          break;
        case "COUPON":
          try {
            const r = await shopApi.listCoupons({ page: 1, pageSize: 20 });
            coupons.value = r?.coupons || r?.data || [];
          } catch { /* */ }
          break;
        case "PRODUCT_LIST":
          if (c.config?.productIds?.length) {
            productListItems.value = c.config.productIds.map((id: string) => ({ id, name: "商品", image: "", price: 0 }));
          }
          break;
        case "RECOMMEND":
          recommendItems.value = []; // 由推荐引擎填充
          break;
      }
    }
  } catch { pageData.value = null; } finally { loading.value = false; }
}

function onBannerClick(config: any, index: number) {
  const links = config.links || [];
  const url = links[index];
  if (url) uni.navigateTo({ url });
}

function onImageClick(config: any) {
  if (config.link) uni.navigateTo({ url: config.link });
}

function goProduct(item: any) {
  uni.navigateTo({ url: `/pages/shop/product-detail?id=${item.id}` });
}

function goContent(item: any) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${item.id}` });
}

function claimCoupon(c: any) {
  uni.showToast({ title: "已领取", icon: "success" });
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.loading-state, .empty-state { display: flex; justify-content: center; align-items: center; padding: 80px 0; color: #999; }
.page-header { padding: 20px 16px 8px; }
.page-title { font-size: 20px; font-weight: bold; color: #3D2B1F; }

.comp-wrapper { margin-bottom: 8px; }

/* 轮播图 */
.comp-carousel { width: 100%; }
.carousel-swiper { width: 100%; height: 180px; }
.carousel-img { width: 100%; height: 100%; }

/* 倒计时 */
.comp-countdown { display: flex; align-items: center; gap: 8px; padding: 14px 16px; background: linear-gradient(135deg, #C41E3A, #E85D75); color: #fff; }
.cd-label { font-size: 14px; }
.cd-time { font-size: 22px; font-weight: bold; font-family: monospace; }

/* 图片 */
.comp-image { width: 100%; }
.single-img { width: 100%; display: block; }

/* 文本 */
.comp-text { padding: 12px 16px; background: #fff; }

/* 通用section */
.comp-section { background: #fff; padding: 14px 0; }
.section-hd { padding: 0 14px; margin-bottom: 10px; }
.section-title { font-size: 16px; font-weight: 600; color: #3D2B1F; }

/* 横向滚动商品 */
.product-scroll { white-space: nowrap; padding: 0 14px; }
.product-card-sm { display: inline-block; width: 130px; margin-right: 10px; }
.pcard-img { width: 130px; height: 130px; border-radius: 8px; }
.pcard-name { display: block; font-size: 13px; margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pcard-price { display: block; font-size: 15px; color: #C41E3A; font-weight: bold; }

/* 优惠券scroll */
.coupon-scroll { white-space: nowrap; padding: 0 14px; }
.coupon-card { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; width: 110px; height: 80px; margin-right: 10px; background: linear-gradient(135deg, #C41E3A, #E85D75); border-radius: 8px; color: #fff; }
.coupon-value { font-size: 18px; font-weight: bold; }
.coupon-cond { font-size: 11px; opacity: 0.8; }
.coupon-btn { margin-top: 4px; font-size: 12px; background: rgba(255,255,255,0.2); padding: 2px 10px; border-radius: 10px; }

/* 商品网格 */
.product-grid { display: flex; flex-wrap: wrap; padding: 0 14px; }
.product-grid-item { width: calc(50% - 5px); margin-right: 10px; margin-bottom: 12px; }
.product-grid-item:nth-child(2n) { margin-right: 0; }
.grid-img { width: 100%; height: 160px; border-radius: 8px; }
.grid-name { display: block; font-size: 13px; margin-top: 6px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.grid-price-row { margin-top: 4px; }
.grid-price { font-size: 16px; color: #C41E3A; font-weight: bold; }

/* 推荐 */
.recommend-item { display: flex; padding: 10px 14px; gap: 10px; }
.rec-img { width: 90px; height: 90px; border-radius: 8px; flex-shrink: 0; }
.rec-info { flex: 1; overflow: hidden; }
.rec-title { font-size: 14px; font-weight: 500; display: block; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.rec-desc { font-size: 12px; color: #999; margin-top: 4px; display: block; }

/* 未知 */
.comp-unknown { padding: 20px; background: #fff; text-align: center; }
.unknown-label { font-size: 14px; color: #999; }

/* 独立活动卡片 */
.indie-product-card { display: flex; align-items: center; padding: 12px 14px; gap: 10px; background: #fff; margin: 0 14px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.indie-img { width: 80px; height: 80px; border-radius: 8px; flex-shrink: 0; background: #f5f5f5; }
.indie-info { flex: 1; overflow: hidden; }
.indie-name { font-size: 13px; font-weight: 500; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.indie-price-row { display: flex; align-items: baseline; gap: 6px; margin-top: 4px; }
.indie-price { font-size: 18px; font-weight: bold; color: #C41E3A; }
.indie-original { font-size: 12px; color: #999; text-decoration: line-through; }
.indie-stock { font-size: 11px; color: #999; margin-top: 2px; display: block; }
.indie-btn { padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; flex-shrink: 0; }
.indie-btn.flash-btn { background: linear-gradient(135deg, #C41E3A, #E85D75); color: #fff; }
.indie-btn.group-btn { background: linear-gradient(135deg, #e67e22, #f0a04b); color: #fff; }
</style>
