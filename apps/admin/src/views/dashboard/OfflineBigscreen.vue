<template>
  <TopicScreenFrame
    title="线下服务网络"
    subtitle="城市覆盖、驿站名录与运营规模"
    topic="offline"
    :snapshot="snapshot"
    :updated-at="data.updatedAt"
    footer="城市关系视图，不是地理投影"
    @refresh="refresh"
  >
    <div class="ts-offline-layout">
      <section class="ts-surface">
        <div class="ts-section-head">
          <div><h2>城市覆盖结构</h2><p>选择城市，定位右侧驿站名录</p></div><button
            v-if="selectedCity !== null"
            class="ts-button"
            @click="selectedCity = null"
          >
            全部城市
          </button>
        </div>
        <div class="ts-coverage-summary">
          <dl class="ts-stat">
            <dt>运营中驿站</dt><dd>{{ metric(data.totalStations) }}</dd><small>当前状态为运营中</small>
          </dl>
          <dl class="ts-stat">
            <dt>覆盖城市</dt><dd>{{ metric(cityCount) }}</dd><small>按已填写城市汇总，空城市不计</small>
          </dl>
        </div>
        <div
          v-if="cities.items.length"
          class="ts-city-network"
          tabindex="0"
          aria-label="城市驿站分布"
        >
          <button
            v-for="city in cities.items"
            :key="city.key"
            :aria-pressed="selectedCity === city.key"
            @click="selectedCity = selectedCity === city.key ? null : city.key"
          >
            <span>{{ city.label }}</span><b>{{ metric(city.value) }} 座<small>{{ percent(city.share) }}</small></b><span
              class="ts-city-bar"
              aria-hidden="true"
            ><i :style="{ width: `${city.share ?? 0}%` }" /></span>
          </button>
        </div>
        <div
          v-else
          class="ts-empty"
        >
          <span
            class="ts-empty-mark"
            aria-hidden="true"
          >⌖</span><strong>{{ Array.isArray(data.cityDistribution) ? '暂无运营中城市节点' : '城市分布暂未提供' }}</strong><p>驿站进入运营状态后会汇入网络。不使用虚构坐标填充地图。</p>
        </div>
        <p class="ts-note">
          连接线表达驿站按城市汇总的关系；条形长度表示驿站数量占比，不能理解为城市距离或地理位置。
        </p>
      </section>
      <section class="ts-surface ts-directory">
        <div class="ts-section-head">
          <div><h2>驿站名录</h2><p>在当前城市范围搜索名称、城市或地址</p></div>
        </div>
        <div class="ts-directory-tools">
          <label class="ts-search"><span>搜索</span><input
            v-model="query"
            type="search"
            placeholder="驿站名称、城市或地址"
            aria-label="搜索驿站名称、城市或地址"
          ></label><button
            v-if="query || selectedCity !== null"
            class="ts-button"
            @click="clearFilters"
          >
            清空筛选
          </button>
        </div>
        <p
          class="ts-filter-note"
          role="status"
        >
          {{ selectedCity === null ? '全部城市' : selectedCity || '未填写城市' }}，找到 {{ filtered.length }} 座驿站
        </p>
        <div
          v-if="filtered.length"
          class="ts-stations"
          tabindex="0"
          aria-label="筛选后的驿站名录"
        >
          <article
            v-for="station in filtered"
            :key="station.id"
            class="ts-station"
          >
            <div><h3>{{ station.name || '未填写名称' }}</h3><span>{{ station.city || '未填写城市' }}</span></div><p>{{ station.address || '暂未提供地址' }}</p>
          </article>
        </div>
        <div
          v-else
          class="ts-empty"
        >
          <span
            class="ts-empty-mark"
            aria-hidden="true"
          >⌕</span><strong>{{ query || selectedCity !== null ? '没有匹配的驿站' : Array.isArray(data.stations) ? '暂无运营中驿站' : '驿站名录暂未提供' }}</strong><p>{{ query || selectedCity !== null ? '试试缩短关键词，或清空城市与搜索条件。' : '运营中的驿站会在此显示名称、城市和地址。' }}</p>
        </div>
      </section>
    </div>
    <section
      class="ts-offline-metrics"
      aria-label="线下运营规模"
    >
      <dl class="ts-stat">
        <dt>审核通过课程</dt><dd>{{ metric(data.totalCourses) }}</dd><small>运营中驿站的线下课程</small>
      </dl>
      <dl class="ts-stat">
        <dt>累计报名</dt><dd>{{ metric(data.totalStudents) }}</dd><small>报名记录数，不是去重学员数</small>
      </dl>
      <dl class="ts-stat">
        <dt>已支付订单</dt><dd>{{ metric(data.totalOrders) }}</dd><small>运营中驿站累计已付订单</small>
      </dl>
      <dl class="ts-stat">
        <dt>累计营收</dt><dd>{{ metric(data.totalRevenue, true) }}</dd><small>客单价 {{ metric(quotient(data.totalRevenue, data.totalOrders), true) }}</small>
      </dl>
    </section>
    <template #scope>
      <p>本屏范围为当前运营中的驿站；线下课程仅计审核通过项，累计报名为这些驿站下课程的报名记录数，未去重到用户。订单和金额仅计 PAID 状态。城市以接口已填写值汇总，不进行地理坐标推测。搜索仅筛选当前返回的运营中名录，不改变运营规模指标。</p>
    </template>
  </TopicScreenFrame>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { bigscreenApi } from '@/api'
import TopicScreenFrame from '@/components/TopicScreenFrame.vue'
import { useTopicSnapshot } from '@/composables/useTopicSnapshot'
import { coveredCityCount, distribution, filterStations, metric, percent, quotient, type OfflineScreen } from '@/utils/topic-screen'
const { snapshot, data, refresh } = useTopicSnapshot<OfflineScreen>(token => bigscreenApi.offlineMap(token, true))
const query = ref(''), selectedCity = ref<string | null>(null)
const cityRows = computed(() => Array.isArray(data.value.cityDistribution) ? data.value.cityDistribution : undefined)
const cities = computed(() => distribution(cityRows.value?.map(city => ({ key: city.city ?? '', label: city.city || '未填写城市', value: city.count }))))
const cityCount = computed(() => coveredCityCount(cityRows.value))
const filtered = computed(() => filterStations(Array.isArray(data.value.stations) ? data.value.stations : undefined, selectedCity.value, query.value))
function clearFilters() { query.value = ''; selectedCity.value = null }
watch(cities, value => { if (selectedCity.value !== null && !value.items.some(item => item.key === selectedCity.value)) selectedCity.value = null })
</script>
