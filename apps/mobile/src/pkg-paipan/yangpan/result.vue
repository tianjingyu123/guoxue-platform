<script setup lang="ts">
/** 阳盘命理奇门排盘结果页——从原型 app/paipan/yangpan/result/page.tsx 1:1 迁移 */
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import NotesPanel from '@/components/bazi/notes-panel.vue'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import { navigateTo } from '@/utils/router'
import { yangpanApi } from '@/lib/yangpan-data'
import type { QimenGong } from '@/lib/qimen-data'

// ─── 五行颜色映射 ───
const wuxingColors: Record<string, string> = {
  '甲': 'wx-wood', '乙': 'wx-wood', '丙': 'wx-fire', '丁': 'wx-fire',
  '戊': 'wx-earth', '己': 'wx-earth', '庚': 'wx-metal', '辛': 'wx-metal',
  '壬': 'wx-water', '癸': 'wx-water',
  '子': 'wx-water', '丑': 'wx-earth', '寅': 'wx-wood', '卯': 'wx-wood',
  '辰': 'wx-earth', '巳': 'wx-fire', '午': 'wx-fire', '未': 'wx-earth',
  '申': 'wx-metal', '酉': 'wx-metal', '戌': 'wx-earth', '亥': 'wx-water',
}
function wx(c: string) { return wuxingColors[c] || '' }

const PALACE_NAMES: Record<number, string> = {
  4: '巽四宫', 9: '离九宫', 2: '坤二宫', 3: '震三宫', 5: '中五宫',
  7: '兑七宫', 8: '艮八宫', 1: '坎一宫', 6: '乾六宫',
}
const PALACE_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6]

interface Cell {
  bashen: string; jiuxing: string; bamen: string
  tianGan: string; diGan: string; anGan: string; dipanShen: string
  kongwang: boolean; maXing: boolean
  changsheng: { tian: string; an: string }
}
// 兜底硬编码（API 失败时使用）
const _fallbackPalace: Record<number, Cell> = {
  4: { bashen: '值符', jiuxing: '天蓬', bamen: '休门', tianGan: '戊', diGan: '庚', anGan: '癸', dipanShen: '腾蛇', kongwang: true, maXing: false, changsheng: { tian: '长生', an: '沐浴' } },
  9: { bashen: '腾蛇', jiuxing: '天芮', bamen: '生门', tianGan: '己', diGan: '辛', anGan: '乙', dipanShen: '太阴', kongwang: false, maXing: true, changsheng: { tian: '冠带', an: '临官' } },
  2: { bashen: '太阴', jiuxing: '天冲', bamen: '伤门', tianGan: '庚', diGan: '壬', anGan: '丙', dipanShen: '六合', kongwang: false, maXing: false, changsheng: { tian: '帝旺', an: '衰' } },
  3: { bashen: '六合', jiuxing: '天辅', bamen: '杜门', tianGan: '辛', diGan: '癸', anGan: '丁', dipanShen: '白虎', kongwang: true, maXing: false, changsheng: { tian: '墓', an: '死' } },
  5: { bashen: '勾陈', jiuxing: '天禽', bamen: '中宫', tianGan: '壬', diGan: '甲', anGan: '戊', dipanShen: '玄武', kongwang: false, maXing: false, changsheng: { tian: '绝', an: '胎' } },
  7: { bashen: '白虎', jiuxing: '天心', bamen: '惊门', tianGan: '癸', diGan: '乙', anGan: '己', dipanShen: '九地', kongwang: false, maXing: false, changsheng: { tian: '养', an: '长生' } },
  8: { bashen: '玄武', jiuxing: '天柱', bamen: '死门', tianGan: '甲', diGan: '丙', anGan: '庚', dipanShen: '九天', kongwang: false, maXing: false, changsheng: { tian: '沐浴', an: '冠带' } },
  1: { bashen: '九地', jiuxing: '天任', bamen: '景门', tianGan: '乙', diGan: '丁', anGan: '辛', dipanShen: '值符', kongwang: false, maXing: true, changsheng: { tian: '临官', an: '帝旺' } },
  6: { bashen: '九天', jiuxing: '天英', bamen: '开门', tianGan: '丙', diGan: '戊', anGan: '壬', dipanShen: '勾陈', kongwang: false, maXing: false, changsheng: { tian: '衰', an: '墓' } },
}

interface DaYunItem { year: number; gan: string; zhi: string; shiShen: string; shiShenZhi: string; age: number; active?: boolean }
interface LiuNianItem { year: number; gan: string; zhi: string; shiShen: string; shiShenZhi: string; age: number; active?: boolean }

const palaceData = ref<Record<number, Cell>>({ ..._fallbackPalace })
const daYunData = ref<DaYunItem[]>([
  { year: 1990, gan: '戊', zhi: '午', shiShen: '伤', shiShenZhi: '劫', age: 0 },
  { year: 1994, gan: '丁', zhi: '巳', shiShen: '比', shiShenZhi: '枭', age: 4 },
  { year: 2004, gan: '丙', zhi: '辰', shiShen: '劫', shiShenZhi: '食', age: 14 },
  { year: 2014, gan: '乙', zhi: '卯', shiShen: '枭', shiShenZhi: '枭', age: 24 },
  { year: 2024, gan: '甲', zhi: '寅', shiShen: '印', shiShenZhi: '印', age: 34, active: true },
  { year: 2034, gan: '癸', zhi: '丑', shiShen: '杀', shiShenZhi: '食', age: 44 },
  { year: 2044, gan: '壬', zhi: '子', shiShen: '官', shiShenZhi: '官', age: 54 },
  { year: 2054, gan: '辛', zhi: '亥', shiShen: '才', shiShenZhi: '官', age: 64 },
])
const liuNianData = ref<LiuNianItem[]>([
  { year: 2024, gan: '甲', zhi: '辰', shiShen: '印', shiShenZhi: '食', age: 34 },
  { year: 2025, gan: '乙', zhi: '巳', shiShen: '枭', shiShenZhi: '枭', age: 35 },
  { year: 2026, gan: '丙', zhi: '午', shiShen: '劫', shiShenZhi: '劫', age: 36, active: true },
  { year: 2027, gan: '丁', zhi: '未', shiShen: '比', shiShenZhi: '食', age: 37 },
  { year: 2028, gan: '戊', zhi: '申', shiShen: '伤', shiShenZhi: '才', age: 38 },
  { year: 2029, gan: '己', zhi: '酉', shiShen: '食', shiShenZhi: '才', age: 39 },
  { year: 2030, gan: '庚', zhi: '戌', shiShen: '财', shiShenZhi: '伤', age: 40 },
  { year: 2031, gan: '辛', zhi: '亥', shiShen: '才', shiShenZhi: '官', age: 41 },
  { year: 2032, gan: '壬', zhi: '子', shiShen: '官', shiShenZhi: '官', age: 42 },
  { year: 2033, gan: '癸', zhi: '丑', shiShen: '杀', shiShenZhi: '食', age: 43 },
])

const PALACE_DIZHI: Record<number, string[]> = {
  1: ['子'], 2: ['丑', '未'], 3: ['卯'], 4: ['辰', '巳'], 5: [],
  6: ['戌', '亥'], 7: ['酉'], 8: ['丑', '寅'], 9: ['午'],
}

// ─── 路由参数 ───
const q = reactive({
  name: '', gender: 'male', year: 1990, month: 1, day: 1, hour: 12, minute: 0,
  panMethod: 'zhuan', jigongMethod: 'kungong', startMethod: 'chaibu',
})
const apiLoading = ref(false)
const apiError = ref(false)
onLoad((opts: Record<string, string> = {}) => {
  q.name = opts.name ? decodeURIComponent(opts.name) : ''
  q.gender = opts.gender || 'male'
  q.year = Number(opts.year) || 1990
  q.month = Number(opts.month) || 1
  q.day = Number(opts.day) || 1
  q.hour = Number(opts.hour) || 12
  q.minute = Number(opts.minute) || 0
  q.panMethod = opts.panMethod || 'zhuan'
  q.jigongMethod = opts.jigongMethod || 'kungong'
  q.startMethod = opts.startMethod || 'chaibu'
  fetchYangpanData()
})

async function fetchYangpanData() {
  apiLoading.value = true
  apiError.value = false
  try {
    const result = await yangpanApi.calculate({
      name: q.name || undefined,
      gender: q.gender as 'male' | 'female',
      year: q.year, month: q.month, day: q.day, hour: q.hour, minute: q.minute,
      panMethod: q.panMethod as 'zhuan' | 'fei',
      jigongMethod: q.jigongMethod as 'kungong' | 'yanggenyin',
      startMethod: q.startMethod as 'chaibu' | 'maoshan' | 'zhirun',
      anganMethod: 'dipan',
    })
    currentJu.isYang = result.dunType === 'yang'
    currentJu.num = result.juNumber
    currentZhiFu.value = result.zhiFu
    currentZhiShiMen.value = result.zhiShiMen
    currentJieQi.value = result.jieQi
    // 从 gongs 构建 palaceData
    const map: Record<number, Cell> = {}
    for (const gong of result.gongs) {
      const g = gong as QimenGong & { anGan?: string; dipanShen?: string; changsheng?: { tian: string; an: string } }
      map[gong.index] = {
        bashen: gong.shen,
        jiuxing: gong.star,
        bamen: gong.men,
        tianGan: gong.tianPan,
        diGan: gong.diPan,
        anGan: g.anGan || gong.diPan,
        dipanShen: g.dipanShen || gong.shen,
        kongwang: gong.kongWang,
        maXing: gong.maXing,
        changsheng: g.changsheng || { tian: '', an: '' },
      }
    }
    palaceData.value = map
    // 马星所在地支
    for (const gong of result.gongs) {
      if (gong.maXing) {
        const dz = PALACE_DIZHI[gong.index]
        if (dz && dz.length > 0) currentMaXing.value = dz[0]
        break
      }
    }
    // 大运数据
    if (result.mingli?.daYun) {
      const now = new Date()
      const currentAge = now.getFullYear() - q.year
      daYunData.value = (result.mingli.daYun as any[]).map((d: any) => ({
        year: q.year + (d.startAge || 0),
        gan: d.gan,
        zhi: d.zhi,
        shiShen: d.ganShiShen || '',
        shiShenZhi: d.zhiShiShen || '',
        age: d.startAge || 0,
        active: currentAge >= (d.startAge || 0) && currentAge <= (d.endAge || 0),
      }))
      // 生成流年数据（基于当前活跃大运）
      buildLiuNianData()
    }
    // 旬首
    currentXunShou.value = deriveXunShou(result.yongShi)
  } catch (_err) {
    apiError.value = true
    palaceData.value = { ..._fallbackPalace }
  } finally {
    apiLoading.value = false
  }
}

function deriveXunShou(yongShi: string): string {
  const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
  const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
  const xunShouMap: Record<string, string> = {
    '子':'甲子戊','丑':'甲子戊','寅':'甲子戊','卯':'甲子戊','辰':'甲子戊',
    '巳':'甲子戊','午':'甲子戊','未':'甲子戊','申':'甲子戊','酉':'甲子戊',
    '戌':'甲戌己','亥':'甲戌己',
  }
  // 简化：根据日柱地支查旬首
  const riZhi = yongShi[1]
  const zhiIdx = ZHI.indexOf(riZhi)
  if (zhiIdx === -1) return '甲子戊'
  const xunStartIdx = Math.floor(zhiIdx / 10) * 10
  const xunGan = GAN[xunStartIdx % 10]
  const xunZhi = ZHI[xunStartIdx]
  return `甲${xunGan}${xunZhi}`
}

function buildLiuNianData() {
  const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
  const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
  const SHEN_LIST = ['比','劫','食','伤','财','才','官','杀','印','枭']
  // 取当前活跃大运或第一个大运
  const activeDy = daYunData.value.find(d => d.active) || daYunData.value[0]
  if (!activeDy) return
  const startYear = activeDy.year
  const riGanIdx = GAN.indexOf(activeDy.gan)
  const items: LiuNianItem[] = []
  for (let i = 0; i < 10; i++) {
    const year = startYear + i
    const ganzhiIdx = (year - 4) % 60 // 简化公元年→干支索引
    const gan = GAN[(ganzhiIdx % 10 + 10) % 10]
    const zhi = ZHI[(ganzhiIdx % 12 + 12) % 12]
    items.push({
      year,
      gan,
      zhi,
      shiShen: SHEN_LIST[((GAN.indexOf(gan) - riGanIdx) % 10 + 10) % 10] || '',
      shiShenZhi: '',
      age: activeDy.age + i,
      active: year === new Date().getFullYear(),
    })
  }
  liuNianData.value = items
}

// ─── 状态 ───
const showNotes = ref(false)
const selectedPalace = ref<number | null>(null)
const showChangsheng = ref(false)
const showDipanShen = ref(false)
const expandedDaYun = ref<number | null>(null)
const selectedKongwang = ref(2)

const currentJu = reactive({ isYang: true, num: 9 })
const currentZhiFu = ref('天蓬')
const currentZhiShiMen = ref('休门')
const currentJieQi = ref('立夏')
const currentMaXing = ref('亥')
const currentXunShou = ref('甲午辛')

const sizhu = ref([
  { label: '年柱', g: '庚', z: '午' },
  { label: '月柱', g: '戊', z: '寅' },
  { label: '日柱', g: '丁', z: '丑' },
  { label: '时柱', g: '丁', z: '未' },
])
const kongwangData = ref([
  { label: '年', zhi: '子丑' }, { label: '月', zhi: '子丑' },
  { label: '日', zhi: '申酉' }, { label: '时', zhi: '寅卯' },
])

const panshi = computed(() =>
  `${q.panMethod === 'zhuan' ? '转盘' : '飞盘'} ${q.jigongMethod === 'kungong' ? '坤宫' : '阳艮阴坤'} ${q.startMethod === 'chaibu' ? '拆补' : q.startMethod === 'maoshan' ? '茅山' : '置闰'}`)

function pad(n: number) { return String(n).padStart(2, '0') }

const detail = computed(() => {
  const p = selectedPalace.value
  if (!p) return null
  return { name: PALACE_NAMES[p], d: palaceData.value[p] }
})

function goToBazi() {
  const params: Record<string, string> = {
    name: q.name, gender: q.gender, year: String(q.year), month: String(q.month),
    day: String(q.day), hour: String(q.hour), minute: String(q.minute),
  }
  const qs = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&')
  navigateTo(`/paipan/bazi/result?${qs}`)
}
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="hdr">
      <view class="hdr-inner">
        <view
          class="hdr-back"
          @tap="navigateTo('/paipan/yangpan')"
        >
          <app-icon
            name="chevron-left"
            :size="40"
            color="var(--text-ink)"
          />
        </view>
        <text class="hdr-title">
          阳盘命理奇门
        </text>
        <view class="hdr-share">
          <app-icon
            name="share-2"
            :size="32"
            color="var(--text-soft)"
          />
        </view>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="body"
    >
      <!-- 加载状态 -->
      <view
        v-if="apiLoading"
        class="status-wrap"
      >
        <view class="status-card">
          <text class="status-text">
            排盘中...
          </text>
        </view>
      </view>
      <!-- 错误提示 -->
      <view
        v-if="apiError"
        class="status-wrap err"
      >
        <view class="status-card err">
          <text class="status-text">
            API请求失败，显示兜底数据
          </text>
          <view
            class="status-retry"
            @tap="fetchYangpanData"
          >
            <text class="status-retry-t">
              重试
            </text>
          </view>
        </view>
      </view>
      <!-- 信息表格 -->
      <view class="info-wrap">
        <view class="info-card">
          <view class="info-row">
            <text class="info-key">
              姓名
            </text><text class="info-val">
              {{ q.name || '未填写' }}
            </text>
          </view>
          <view class="info-row">
            <text class="info-key">
              性别
            </text><text class="info-val">
              {{ q.gender === 'male' ? '男' : '女' }}
            </text>
          </view>
          <view class="info-row">
            <text class="info-key">
              盘式
            </text><text class="info-val sm">
              {{ panshi }}
            </text>
          </view>
          <view class="info-row">
            <text class="info-key">
              出生
            </text><text class="info-val">
              {{ q.year }}年{{ pad(q.month) }}月{{ pad(q.day) }}日 {{ q.hour }}时{{ q.minute }}分
            </text>
          </view>
          <!-- 四柱 -->
          <view class="info-row col">
            <text class="info-key">
              四柱
            </text>
            <view class="grid4">
              <view
                v-for="z in sizhu"
                :key="z.label"
                class="sz-cell"
              >
                <text class="sz-label">
                  {{ z.label }}
                </text>
                <text
                  class="sz-gz"
                  :class="wx(z.g)"
                >
                  {{ z.g }}
                </text>
                <text
                  class="sz-gz"
                  :class="wx(z.z)"
                >
                  {{ z.z }}
                </text>
              </view>
            </view>
          </view>
          <!-- 空亡 -->
          <view class="info-row col">
            <text class="info-key">
              空亡
            </text>
            <view class="grid4">
              <view
                v-for="(k, i) in kongwangData"
                :key="i"
                class="kw-cell"
                :class="{ on: selectedKongwang === i }"
                @tap="selectedKongwang = i"
              >
                <text
                  class="kw-text"
                  :class="{ on: selectedKongwang === i }"
                >
                  {{ k.zhi }}
                </text>
              </view>
            </view>
          </view>
          <view class="info-row">
            <text class="info-key">
              节气
            </text><text class="info-val sm">
              <text class="hl">
                {{ currentJieQi }}
              </text>
            </text>
          </view>
          <!-- 旬首表头 -->
          <view class="info-row shade">
            <text class="info-key">
              旬首
            </text>
            <view class="grid4 center">
              <text class="xh-h">
                局数
              </text><text class="xh-h">
                值符
              </text><text class="xh-h">
                值使
              </text><text class="xh-h">
                马星
              </text>
            </view>
          </view>
          <view class="info-row noborder">
            <text class="info-key dark">
              {{ currentXunShou }}
            </text>
            <view class="grid4 center mid">
              <text class="xh-v">
                {{ currentJu.isYang ? '阳' : '阴' }}{{ currentJu.num }}局
              </text>
              <text class="xh-v green">
                {{ currentZhiFu }}
              </text>
              <text class="xh-v green">
                {{ currentZhiShiMen }}
              </text>
              <view class="ma-badge">
                <text class="ma-badge-t">
                  {{ currentMaXing }}
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 九宫格 -->
      <view class="grid-wrap">
        <view class="grid9">
          <view
            v-for="palace in PALACE_ORDER"
            :key="palace"
            class="cell"
            :class="{ sel: selectedPalace === palace, center: palace === 5 }"
            @tap="selectedPalace = selectedPalace === palace ? null : palace"
          >
            <view
              v-if="palaceData[palace].maXing"
              class="cell-ma"
            >
              <text class="cell-ma-t">
                马
              </text>
            </view>
            <view class="cell-grid">
              <view class="cell-c1">
                <view class="cell-slot">
                  <view
                    v-if="palaceData[palace].kongwang"
                    class="kw-circle"
                  />
                </view>
                <view class="cell-slot">
                  <text class="cell-tg">
                    {{ palaceData[palace].tianGan }}
                  </text>
                </view>
                <view class="cell-slot">
                  <text
                    v-if="showDipanShen"
                    class="cell-dps"
                  >
                    {{ palaceData[palace].dipanShen }}
                  </text>
                </view>
              </view>
              <view class="cell-c2">
                <view class="cell-slot left">
                  <text class="cell-main">
                    {{ palaceData[palace].bashen }}
                  </text>
                </view>
                <view class="cell-slot left">
                  <text class="cell-main">
                    {{ palaceData[palace].jiuxing }}
                  </text>
                </view>
                <view class="cell-slot left">
                  <text class="cell-main">
                    {{ palaceData[palace].bamen }}
                  </text>
                </view>
              </view>
              <view class="cell-c3">
                <view class="cell-slot end" />
                <view class="cell-slot end">
                  <text
                    v-if="showChangsheng"
                    class="cell-cs"
                  >
                    {{ palaceData[palace].changsheng.tian.slice(0,2) }}
                  </text>
                  <text class="cell-gan">
                    {{ palaceData[palace].diGan }}
                  </text>
                </view>
                <view class="cell-slot end">
                  <text
                    v-if="showChangsheng"
                    class="cell-cs"
                  >
                    {{ palaceData[palace].changsheng.an.slice(0,2) }}
                  </text>
                  <text class="cell-gan">
                    {{ palaceData[palace].anGan }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="ops">
          <view
            class="op"
            :class="{ on: showChangsheng }"
            @tap="showChangsheng = !showChangsheng"
          >
            <text
              class="op-t"
              :class="{ on: showChangsheng }"
            >
              长生状态
            </text>
          </view>
          <view
            class="op op-blue"
            @tap="goToBazi"
          >
            <text class="op-t light">
              切换到八字
            </text>
          </view>
          <view
            class="op"
            :class="{ on: showDipanShen }"
            @tap="showDipanShen = !showDipanShen"
          >
            <text
              class="op-t"
              :class="{ on: showDipanShen }"
            >
              地盘九神
            </text>
          </view>
        </view>
        <text class="hint">
          点击宫位查看详细信息
        </text>
      </view>

      <!-- 宫位详情 -->
      <view
        v-if="detail"
        class="detail"
      >
        <view class="detail-head">
          <text class="detail-title">
            {{ detail.name }}
          </text>
          <view
            class="detail-close"
            @tap="selectedPalace = null"
          >
            <app-icon
              name="x"
              :size="34"
              color="var(--text-soft)"
            />
          </view>
        </view>
        <view class="detail-base">
          <text>
            <text class="hl bold">
              {{ detail.name }}
            </text>：八神{{ detail.d.bashen }}，九星{{ detail.d.jiuxing }}，八门{{ detail.d.bamen }}，天盘{{ detail.d.diGan }}，地盘{{ detail.d.tianGan }}。
          </text>
        </view>
      </view>

      <!-- 大运 -->
      <view class="dy-wrap">
        <view class="dy-card">
          <view class="dy-head">
            <text class="dy-title">
              大运
            </text><text class="dy-tip">
              点击展开流年
            </text>
          </view>
          <view class="dy-table">
            <view class="dy-trow yrs">
              <text
                v-for="(d, i) in daYunData"
                :key="i"
                class="dy-yr"
              >
                {{ d.year }}
              </text>
            </view>
            <view class="dy-trow gans">
              <view
                v-for="(d, i) in daYunData"
                :key="i"
                class="dy-cell"
                :class="{ act: d.active, exp: expandedDaYun === i }"
                @tap="expandedDaYun = expandedDaYun === i ? null : i"
              >
                <text
                  class="dy-gz"
                  :class="wx(d.gan)"
                >
                  {{ d.gan }}
                </text><text class="dy-ss">
                  {{ d.shiShen }}
                </text>
              </view>
            </view>
            <view class="dy-trow gans">
              <view
                v-for="(d, i) in daYunData"
                :key="i"
                class="dy-cell"
                :class="{ act: d.active, exp: expandedDaYun === i }"
                @tap="expandedDaYun = expandedDaYun === i ? null : i"
              >
                <text
                  class="dy-gz"
                  :class="wx(d.zhi)"
                >
                  {{ d.zhi }}
                </text><text class="dy-ss">
                  {{ d.shiShenZhi }}
                </text>
              </view>
            </view>
          </view>
          <view
            v-if="expandedDaYun !== null"
            class="dy-exp"
          >
            <view class="dy-exp-head">
              <text class="dy-exp-t">
                {{ daYunData[expandedDaYun].year }}-{{ daYunData[expandedDaYun].year + 9 }} 流年
              </text>
              <text
                class="dy-exp-close"
                @tap="expandedDaYun = null"
              >
                收起
              </text>
            </view>
            <view class="dy-exp-grid">
              <view
                v-for="i in 10"
                :key="i"
                class="dy-exp-cell"
              >
                <text class="dy-exp-yr">
                  {{ daYunData[expandedDaYun].year + (i - 1) }}
                </text>
                <text
                  class="dy-exp-gan"
                  :class="wx(liuNianData[(i-1) % 10].gan)"
                >
                  {{ liuNianData[(i-1) % 10].gan }}
                </text>
                <text
                  class="dy-exp-gan"
                  :class="wx(liuNianData[(i-1) % 10].zhi)"
                >
                  {{ liuNianData[(i-1) % 10].zhi }}
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 流年 -->
      <view class="ln-wrap">
        <view class="ln-card">
          <view class="ln-head">
            <text class="ln-title">
              流年
            </text>
          </view>
          <view class="ln-table">
            <view class="ln-trow yrs">
              <text
                v-for="(n, i) in liuNianData"
                :key="i"
                class="ln-yr"
              >
                {{ n.year }}
              </text>
            </view>
            <view class="ln-trow">
              <view
                v-for="(n, i) in liuNianData"
                :key="i"
                class="ln-cell"
                :class="{ act: n.active }"
              >
                <text
                  class="ln-gz"
                  :class="wx(n.gan)"
                >
                  {{ n.gan }}
                </text><text class="ln-ss">
                  {{ n.shiShen }}
                </text>
              </view>
            </view>
            <view class="ln-trow">
              <view
                v-for="(n, i) in liuNianData"
                :key="i"
                class="ln-cell"
                :class="{ act: n.active }"
              >
                <text
                  class="ln-gz"
                  :class="wx(n.zhi)"
                >
                  {{ n.zhi }}
                </text><text class="ln-ss">
                  {{ n.shiShenZhi }}
                </text>
              </view>
            </view>
            <view class="ln-trow ages">
              <text
                v-for="(n, i) in liuNianData"
                :key="i"
                class="ln-age"
                :class="{ act: n.active }"
              >
                {{ n.age }}岁
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- AI解析/保存 -->
      <view class="cta">
        <view class="cta-ai">
          <app-icon
            name="sparkles"
            :size="32"
            color="#ffffff"
          /><text class="cta-ai-t">
            AI智能解析
          </text>
        </view>
        <view class="cta-save">
          <app-icon
            name="save"
            :size="30"
            color="var(--text-ink)"
          /><text class="cta-save-t">
            保存
          </text>
        </view>
      </view>

      <!-- 免责声明 -->
      <view class="dc-wrap">
        <disclaimer
          variant="fortune"
          tone="card"
        />
      </view>
    </scroll-view>

    <!-- 悬浮笔记按钮 -->
    <view
      class="fab"
      @tap="showNotes = true"
    >
      <app-icon
        name="book-open"
        :size="32"
        color="var(--brand)"
      />
      <text class="fab-t">
        笔记
      </text>
    </view>

    <!-- 笔记面板 -->
    <notes-panel
      :open="showNotes"
      @close="showNotes = false"
    />
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }

.hdr { position: sticky; top: 0; z-index: 10; background: var(--bg-paper); border-bottom: 2rpx solid var(--border); padding-top: var(--status-bar-height, 0); }
.hdr-inner { height: 84rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; }
.hdr-back { padding: 8rpx; margin-left: -8rpx; }
.hdr-title { font-size: 30rpx; font-weight: 700; color: var(--text-ink); }
.hdr-share { padding: 8rpx; margin-right: -8rpx; }

.body { flex: 1; }

/* 加载/错误 */
.status-wrap { padding: 24rpx 24rpx 0; }
.status-wrap.err { padding-top: 8rpx; }
.status-card { padding: 20rpx 24rpx; background: rgba(0,0,0,0.03); border-radius: 16rpx; text-align: center; }
.status-card.err { background: rgba(220,38,38,0.06); border: 2rpx solid rgba(220,38,38,0.15); display: flex; align-items: center; justify-content: space-between; }
.status-text { font-size: 26rpx; color: var(--text-soft); }
.status-retry { padding: 10rpx 24rpx; background: var(--brand); border-radius: 999rpx; }
.status-retry-t { font-size: 24rpx; color: #fff; font-weight: 500; }

/* 五行色 */
.wx-wood { color: #16a34a; } .wx-fire { color: #dc2626; } .wx-earth { color: #ca8a04; }
.wx-metal { color: #d97706; } .wx-water { color: #2563eb; }

/* 信息表格 */
.info-wrap { padding: 16rpx 24rpx 0; }
.info-card { background: var(--card); border-radius: 24rpx; border: 2rpx solid rgba(0,0,0,0.06); overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }
.info-row { display: flex; align-items: center; padding: 14rpx 0; border-bottom: 2rpx solid rgba(0,0,0,0.05); }
.info-row.col { flex-direction: column; align-items: stretch; gap: 8rpx; }
.info-row.shade { background: rgba(0,0,0,0.02); padding: 10rpx 0; }
.info-row.noborder { border-bottom: none; }
.info-key { width: 120rpx; flex-shrink: 0; padding: 0 24rpx; font-size: 26rpx; color: var(--brand); font-weight: 500; }
.info-key.dark { color: var(--text-ink); }
.info-val { flex: 1; padding-right: 24rpx; font-size: 26rpx; color: var(--text-ink); }
.info-val.sm { font-size: 24rpx; }
.hl { color: var(--brand); font-weight: 500; }
.hl.bold { font-weight: 600; }

.grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8rpx; padding: 0 24rpx; }
.grid4.center { text-align: center; }
.grid4.mid { align-items: center; }
.sz-cell { display: flex; flex-direction: column; align-items: center; padding: 10rpx 0; background: rgba(196,30,58,0.05); border-radius: 12rpx; border: 2rpx solid rgba(196,30,58,0.1); }
.sz-label { font-size: 18rpx; color: var(--text-soft); margin-bottom: 4rpx; }
.sz-gz { font-size: 34rpx; font-weight: 700; line-height: 1.1; }
.kw-cell { padding: 12rpx 0; text-align: center; border-radius: 12rpx; background: rgba(0,0,0,0.04); }
.kw-cell.on { background: var(--brand); box-shadow: 0 2rpx 6rpx rgba(196,30,58,0.2); }
.kw-text { font-size: 28rpx; font-weight: 500; color: var(--text-ink); }
.kw-text.on { color: #fff; }
.xh-h { font-size: 20rpx; color: var(--brand); font-weight: 500; }
.xh-v { font-size: 26rpx; color: var(--text-ink); font-weight: 500; }
.xh-v.green { color: #059669; font-weight: 600; }
.ma-badge { justify-self: center; padding: 2rpx 16rpx; background: #f59e0b; border-radius: 8rpx; }
.ma-badge-t { font-size: 22rpx; font-weight: 700; color: #fff; }

/* 九宫格 */
.grid-wrap { padding: 16rpx 24rpx; }
.grid9 { border: 2rpx solid rgba(0,0,0,0.4); border-radius: 16rpx; overflow: hidden; background: var(--card); display: grid; grid-template-columns: repeat(3, 1fr); box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.cell { position: relative; height: 236rpx; border-right: 2rpx solid rgba(0,0,0,0.3); border-bottom: 2rpx solid rgba(0,0,0,0.3); }
.cell:nth-child(3n) { border-right: none; }
.cell:nth-child(n+7) { border-bottom: none; }
.cell.sel { background: rgba(196,30,58,0.1); }
.cell.center { background: rgba(245,158,11,0.06); }
.cell-ma { position: absolute; top: 10rpx; right: 10rpx; z-index: 2; padding: 2rpx 12rpx; background: #f59e0b; border-radius: 6rpx; }
.cell-ma-t { font-size: 18rpx; font-weight: 700; color: #fff; }
.cell-grid { position: absolute; inset: 0; padding: 16rpx; display: flex; }
.cell-c1 { display: flex; flex-direction: column; justify-content: space-between; width: 40rpx; flex-shrink: 0; }
.cell-c2 { display: flex; flex-direction: column; justify-content: space-between; flex: 1; margin-left: 8rpx; }
.cell-c3 { display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; }
.cell-slot { height: 60rpx; display: flex; align-items: center; justify-content: center; }
.cell-slot.left { justify-content: flex-start; }
.cell-slot.end { justify-content: flex-end; gap: 4rpx; }
.kw-circle { width: 26rpx; height: 26rpx; border-radius: 999rpx; border: 3rpx dashed var(--brand); box-sizing: border-box; }
.cell-tg { font-size: 22rpx; color: var(--text-soft); }
.cell-dps { font-size: 20rpx; color: var(--text-soft); }
.cell-main { font-size: 30rpx; font-weight: 500; color: var(--text-ink); letter-spacing: 2rpx; }
.cell-cs { font-size: 20rpx; color: var(--text-soft); }
.cell-gan { font-size: 30rpx; color: var(--text-ink); }

.ops { display: flex; gap: 16rpx; margin-top: 24rpx; }
.op { flex: 1; padding: 20rpx 0; border-radius: 12rpx; background: var(--card); border: 2rpx solid var(--border); text-align: center; }
.op.on { background: var(--brand); border-color: var(--brand); box-shadow: 0 2rpx 8rpx rgba(196,30,58,0.2); }
.op.op-blue { background: #3b82f6; border-color: #3b82f6; box-shadow: 0 2rpx 8rpx rgba(59,130,246,0.3); }
.op-t { font-size: 26rpx; font-weight: 500; color: var(--text-ink); }
.op-t.on, .op-t.light { color: #fff; }
.hint { display: block; text-align: center; font-size: 22rpx; color: var(--text-soft); margin-top: 16rpx; }

/* 详情 */
.detail { margin: 8rpx 24rpx; background: var(--card); border: 2rpx solid var(--border); border-radius: 20rpx; padding: 24rpx; }
.detail-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.detail-title { font-size: 34rpx; font-weight: 700; color: var(--brand); }
.detail-close { padding: 6rpx; }
.detail-base { background: rgba(0,0,0,0.03); border-radius: 12rpx; padding: 20rpx; font-size: 26rpx; color: var(--text-ink); line-height: 1.6; }

/* 大运 */
.dy-wrap { padding: 24rpx 24rpx 0; }
.dy-card { background: var(--card); border-radius: 24rpx; border: 2rpx solid var(--border); overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }
.dy-head { padding: 18rpx 24rpx; border-bottom: 2rpx solid var(--border); display: flex; align-items: center; justify-content: space-between; }
.dy-title { font-size: 28rpx; font-weight: 700; color: var(--brand); }
.dy-tip { font-size: 22rpx; color: var(--text-soft); }
.dy-table { padding: 8rpx 0; }
.dy-trow { display: grid; grid-template-columns: repeat(8, 1fr); text-align: center; }
.dy-trow.yrs { padding-top: 8rpx; }
.dy-yr { font-size: 20rpx; color: var(--text-soft); }
.dy-cell { display: flex; align-items: baseline; justify-content: center; padding: 4rpx 0; }
.dy-cell.act { background: rgba(196,30,58,0.08); }
.dy-cell.exp { background: rgba(0,0,0,0.05); }
.dy-gz { font-size: 36rpx; font-weight: 900; line-height: 1; }
.dy-ss { font-size: 18rpx; color: var(--text-soft); margin-left: 2rpx; }
.dy-exp { border-top: 2rpx solid var(--border); padding: 18rpx; background: rgba(0,0,0,0.02); }
.dy-exp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.dy-exp-t { font-size: 24rpx; color: var(--text-ink); font-weight: 500; }
.dy-exp-close { font-size: 24rpx; color: var(--brand); }
.dy-exp-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12rpx; }
.dy-exp-cell { background: var(--card); border-radius: 8rpx; padding: 12rpx 0; text-align: center; border: 2rpx solid var(--border); display: flex; flex-direction: column; align-items: center; }
.dy-exp-yr { font-size: 20rpx; color: var(--text-soft); }
.dy-exp-gan { font-size: 30rpx; font-weight: 700; }

/* 流年 */
.ln-wrap { padding: 20rpx 24rpx 0; }
.ln-card { background: var(--card); border-radius: 24rpx; border: 2rpx solid var(--border); overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }
.ln-head { padding: 18rpx 24rpx; border-bottom: 2rpx solid var(--border); }
.ln-title { font-size: 28rpx; font-weight: 700; color: var(--brand); }
.ln-table { padding: 8rpx 0; }
.ln-trow { display: grid; grid-template-columns: repeat(10, 1fr); text-align: center; }
.ln-trow.yrs { padding-top: 8rpx; }
.ln-trow.ages { padding-bottom: 8rpx; }
.ln-yr { font-size: 18rpx; color: var(--text-soft); }
.ln-cell { display: flex; align-items: baseline; justify-content: center; padding: 2rpx 0; }
.ln-cell.act { background: rgba(196,30,58,0.08); }
.ln-gz { font-size: 32rpx; font-weight: 700; line-height: 1; }
.ln-ss { font-size: 16rpx; color: var(--text-soft); margin-left: 1rpx; }
.ln-age { font-size: 18rpx; color: var(--text-soft); }
.ln-age.act { background: rgba(196,30,58,0.08); }

/* CTA */
.cta { display: flex; gap: 24rpx; padding: 24rpx 24rpx 0; }
.cta-ai { flex: 1; display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 26rpx 0; background: var(--brand); border-radius: 20rpx; box-shadow: 0 8rpx 20rpx rgba(196,30,58,0.25); }
.cta-ai-t { font-size: 28rpx; font-weight: 500; color: #fff; }
.cta-save { display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 26rpx 48rpx; background: var(--secondary, rgba(0,0,0,0.04)); border: 2rpx solid var(--border); border-radius: 20rpx; }
.cta-save-t { font-size: 28rpx; font-weight: 500; color: var(--text-ink); }

.dc-wrap { padding: 24rpx; }

/* FAB */
.fab { position: fixed; right: 32rpx; bottom: 48rpx; z-index: 10; width: 96rpx; height: 96rpx; background: var(--card); border-radius: 999rpx; box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.12); border: 2rpx solid var(--border); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2rpx; }
.fab-t { font-size: 18rpx; font-weight: 500; color: var(--brand); }
</style>
