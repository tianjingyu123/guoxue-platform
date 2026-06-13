<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-10 bg-background border-b border-border">
      <view class="flex items-center justify-between px-4 h-11">
        <view @click="goBack" class="p-1 -ml-1">
          <text class="text-2xl leading-none text-foreground">←</text>
        </view>
        <text class="text-base font-bold text-foreground">热卜奇门遁甲</text>
        <view class="p-1 -mr-1 text-muted-foreground">
          <text class="text-lg"></text>
        </view>
      </view>
    </header>

    <scroll-view scroll-y class="flex-1 pb-4">
      <!-- 信息表格 -->
      <view class="px-3 pt-2" style="font-size:13px">
        <view class="bg-white rounded-xl overflow-hidden shadow-sm" style="border:1px solid rgba(232,224,213,0.6)">
          <view class="border-b border-border/40">
            <view class="flex">
              <text class="py-2 px-3 text-primary font-medium" style="width:64px">事项</text>
              <view class="py-2 px-2 flex items-center gap-2 flex-1">
                <text class="text-foreground flex-1">{{ editedMatter || '-' }}</text>
                <view @click="showEditMatter = true" class="p-1">
                  <text class="text-sm text-muted-foreground">✏️</text>
                </view>
              </view>
            </view>
          </view>
          <view class="border-b border-border/40">
            <view class="flex">
              <text class="py-2 px-3 text-primary font-medium" style="width:64px">盘式</text>
              <text class="py-2 px-2 text-foreground text-xs">{{ panshi }}</text>
            </view>
          </view>
          <view class="border-b border-border/40">
            <view class="flex">
              <text class="py-2 px-3 text-primary font-medium" style="width:64px">日期</text>
              <text class="py-2 px-2 text-foreground">{{ year }}年{{ month }}月{{ day }}日 {{ hour }}时{{ minute }}分 <text class="text-muted-foreground">(四月初一)</text></text>
            </view>
          </view>
          <view class="border-b border-border/40">
            <view class="flex">
              <text class="py-2 px-3 text-primary font-medium" style="width:64px">真太阳时</text>
              <text class="py-2 px-2 text-foreground">{{ year }}年{{ month }}月{{ day }}日 {{ hour }}时{{ Math.max(0, minute - 15) }}分</text>
            </view>
          </view>

          <!-- 四柱 -->
          <view class="border-b border-border/40">
            <view class="flex">
              <text class="py-2 px-3 text-primary font-medium" style="width:64px">四柱</text>
              <view class="py-2 px-2 flex-1">
                <view class="grid grid-cols-4 gap-1">
                  <view v-for="(z, i) in sizhuList" :key="i" class="text-center rounded-lg py-1.5" style="background:linear-gradient(180deg,rgba(196,30,58,0.05),rgba(196,30,58,0.1));border:1px solid rgba(196,30,58,0.1)">
                    <text class="text-[9px] text-muted-foreground block mb-0.5">{{ z.label }}</text>
                    <view class="leading-tight">
                      <text class="text-primary font-bold text-lg">{{ z.g }}</text>
                      <br />
                      <text class="text-primary font-bold text-lg">{{ z.z }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 空亡 -->
          <view class="border-b border-border/40">
            <view class="flex">
              <text class="py-2 px-3 text-primary font-medium" style="width:64px">空亡</text>
              <view class="py-2 px-2 flex-1">
                <view class="grid grid-cols-4 gap-1">
                  <view v-for="(k, i) in kongwangData" :key="i"
                    @click="selectedKongwang = i"
                    class="py-1.5 rounded-lg text-sm font-medium text-center transition-all"
                    :class="selectedKongwang === i ? 'bg-primary text-white shadow-sm' : 'bg-secondary/40 text-foreground'"
                  >
                    <text>{{ k.zhi }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <view class="border-b border-border/40">
            <view class="flex">
              <text class="py-2 px-3 text-primary font-medium" style="width:64px">节气</text>
              <text class="py-2 px-2 text-foreground text-xs">
                <text class="text-primary font-medium">立夏</text> {{ year }}.05.05 19:48 ~ <text class="text-primary font-medium">小满</text> {{ year }}.05.21 08:36
              </text>
            </view>
          </view>

          <!-- 旬首/局数/值符/值使/马星 -->
          <view class="border-b border-border/40 bg-secondary/20">
            <view class="flex">
              <text class="py-1.5 px-3 text-primary font-medium" style="width:64px">旬首</text>
              <view class="py-1.5 px-2 flex-1">
                <view class="grid grid-cols-4 text-center text-[10px] text-primary font-medium">
                  <text>局数</text><text>值符</text><text>值使</text><text>马星</text>
                </view>
              </view>
            </view>
          </view>
          <view class="border-b border-border/40">
            <view class="flex">
              <text class="py-2 px-3 text-foreground text-sm font-medium">甲午辛</text>
              <view class="py-2 px-2 flex-1">
                <view class="grid grid-cols-4 text-center text-sm">
                  <text class="text-foreground font-medium">{{ startMethodLabel }} {{ isYang ? '阳' : '阴' }}{{ juNum }}</text>
                  <text class="text-emerald-600 font-semibold">天蓬</text>
                  <text class="text-emerald-600 font-semibold">休门</text>
                  <view class="inline-flex px-2 py-0.5 text-xs font-bold rounded" style="background:linear-gradient(135deg,#fbbf24,#f97316);color:white">
                    <text>巳</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 九宫格 -->
      <view class="px-3 py-2">
        <view class="rounded-lg overflow-hidden bg-white shadow-sm" style="border:1px solid rgba(44,44,44,0.4)">
          <view class="grid grid-cols-3">
            <view v-for="palace in palaceOrder" :key="palace"
              @click="togglePalace(palace)"
              class="relative transition-all"
              :class="[
                palace === 5 ? 'bg-gradient-to-br from-amber-50/50 to-orange-50/30' : '',
                selectedPalace === palace ? 'bg-primary/10' : '',
                'border-r border-b'
              ]"
              style="border-color:rgba(44,44,44,0.3);height:118px"
            >
              <!-- 马星 -->
              <view v-if="hasMaXing(palace)" class="absolute top-1.5 right-1.5 z-10">
                <view class="px-1.5 py-0.5 text-[9px] text-white font-bold rounded-sm shadow-md" style="background:linear-gradient(135deg,#fbbf24,#f97316);border:1px solid rgba(217,119,6,0.2)">
                  <text>马</text>
                </view>
              </view>

              <view class="absolute inset-0 p-2 flex">
                <!-- 列1 -->
                <view class="flex flex-col justify-between shrink-0" style="width:16px">
                  <view class="h-[30px] flex items-center justify-center">
                    <view v-if="hasKongwang(palace)" class="w-3.5 h-3.5 rounded-full border border-dashed border-primary" style="border-width:1.5px" />
                  </view>
                  <view class="h-[30px] flex items-center justify-center">
                    <text class="text-[11px] text-muted-foreground">{{ palaceData[palace]?.tianGan }}</text>
                  </view>
                  <view class="h-[30px] flex items-center justify-center">
                    <text v-if="showDipanShen" class="text-[10px] text-muted-foreground">{{ palaceData[palace]?.dipanShen }}</text>
                  </view>
                </view>

                <!-- 列2 -->
                <view class="flex flex-col justify-between flex-1 ml-1">
                  <view class="h-[30px] flex items-center">
                    <text class="text-[15px] font-medium text-foreground tracking-wide">{{ palaceData[palace]?.bashen }}</text>
                  </view>
                  <view class="h-[30px] flex items-center">
                    <text class="text-[15px] font-medium text-foreground tracking-wide">{{ palaceData[palace]?.jiuxing }}</text>
                  </view>
                  <view class="h-[30px] flex items-center">
                    <text class="text-[15px] font-medium text-foreground tracking-wide">{{ palaceData[palace]?.bamen }}</text>
                  </view>
                </view>

                <!-- 列3 -->
                <view class="flex flex-col justify-between items-end">
                  <view class="h-[30px]" />
                  <view class="h-[30px] flex items-center justify-end gap-0.5">
                    <text v-if="showChangsheng" class="text-[10px] text-muted-foreground">{{ palaceData[palace]?.changsheng?.tian?.slice(0,2) }}</text>
                    <text class="text-[15px] text-foreground">{{ palaceData[palace]?.diGan }}</text>
                  </view>
                  <view class="h-[30px] flex items-center justify-end gap-0.5">
                    <text v-if="showChangsheng" class="text-[10px] text-muted-foreground">{{ palaceData[palace]?.changsheng?.an?.slice(0,2) }}</text>
                    <text class="text-[15px] text-foreground">{{ palaceData[palace]?.anGan }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 颜色说明 -->
        <view class="mt-1.5 text-[11px] text-center text-muted-foreground">
          <text>颜色说明：<text class="text-green-600">符使</text>、<text class="text-orange-500">入墓</text>、<text class="text-blue-500">击刑</text>、<text class="text-pink-500">门迫</text>、<text class="text-purple-500">刑+墓</text></text>
        </view>

        <!-- 操作按钮 -->
        <view class="flex gap-2 mt-3">
          <view @click="showChangsheng = !showChangsheng"
            class="flex-1 py-2.5 rounded-lg text-sm font-medium text-center transition-all"
            :class="showChangsheng ? 'bg-primary text-white shadow-md' : 'bg-white text-foreground'"
            style="border:1px solid rgba(232,224,213,0.6)"
          >长生状态</view>
          <view @click="prevJu" class="flex-1 py-2.5 rounded-lg text-sm font-medium text-center bg-white text-foreground" style="border:1px solid rgba(232,224,213,0.6)">上一局</view>
          <view @click="nextJu" class="flex-1 py-2.5 rounded-lg text-sm font-medium text-center bg-white text-foreground" style="border:1px solid rgba(232,224,213,0.6)">下一局</view>
          <view @click="showDipanShen = !showDipanShen"
            class="flex-1 py-2.5 rounded-lg text-sm font-medium text-center transition-all"
            :class="showDipanShen ? 'bg-primary text-white shadow-md' : 'bg-white text-foreground'"
            style="border:1px solid rgba(232,224,213,0.6)"
          >地盘九神</view>
        </view>
        <view class="text-center text-[11px] text-muted-foreground mt-2">
          <text>点击宫位查看详细信息</text>
        </view>
      </view>

      <!-- 宫位详情 -->
      <view v-if="selectedPalace && palaceData[selectedPalace]" class="bg-white border-t border-border shadow-lg">
        <view class="p-4 space-y-3">
          <view class="flex items-center justify-between">
            <text class="text-lg font-bold text-primary">{{ palaceNames[selectedPalace] }}</text>
            <view @click="selectedPalace = null" class="p-1.5">
              <text class="text-lg text-muted-foreground">✕</text>
            </view>
          </view>
          <view class="text-sm text-foreground leading-relaxed bg-secondary/30 rounded-lg p-3">
            <text class="text-primary font-semibold">{{ palaceNames[selectedPalace] }}</text>：
            先天宫为<text>{{ xiantianGong[selectedPalace] }}</text>宫。取数：<text>{{ getPalaceNums(selectedPalace) }}</text>。地支：<text>{{ palaceDizhi[selectedPalace]?.join('') || '' }}</text>。
          </view>
          <view v-for="(c, i) in getCombos(selectedPalace)" :key="i" class="pt-3" style="border-top:1px solid rgba(232,224,213,0.5)">
            <text class="text-primary font-semibold">{{ c.l }}</text>：
            <text class="text-sm text-foreground leading-relaxed">{{ gejuMeanings[c.k] || '此格局需结合用神具体分析。' }}</text>
          </view>
        </view>
      </view>

      <!-- AI解析和保存按钮 -->
      <view class="px-3 mt-4 flex gap-3">
        <view class="flex-1 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 text-center"
          style="background:linear-gradient(135deg,#8b5cf6,#a855f7,#6366f1);box-shadow:0 4px 14px rgba(139,92,246,0.25)"
        >
          <text class="text-sm"></text>
          <text class="text-sm">AI智能解析</text>
        </view>
        <view class="px-6 py-3 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-2 text-center"
          style="box-shadow:0 4px 14px rgba(196,30,58,0.25)"
        >
          <text class="text-sm">💾</text>
          <text class="text-sm">保存</text>
        </view>
      </view>
    </scroll-view>

    <!-- 悬浮笔记按钮 -->
    <view class="fixed right-4 bottom-6 z-10">
      <view @click="showNotes = !showNotes"
        class="w-12 h-12 bg-white rounded-full shadow-lg flex flex-col items-center justify-center gap-0.5"
        style="border:1px solid rgba(232,224,213,0.8)"
      >
        <text class="text-sm text-primary"></text>
        <text class="text-[8px] text-primary font-medium">笔记</text>
      </view>
    </view>

    <!-- 笔记面板 -->
    <view v-if="showNotes" class="fixed inset-0 bg-black/40 z-50 flex items-end" @click="showNotes = false">
      <view class="bg-white w-full rounded-t-2xl max-h-[60vh] overflow-y-auto" @click.stop>
        <view class="px-4 py-4 border-b border-border text-center">
          <text class="text-base font-semibold text-foreground">笔记</text>
        </view>
        <view class="p-4">
          <textarea placeholder="添加笔记..." class="w-full h-32 px-3 py-2 rounded-xl text-sm border border-border bg-secondary/30 box-border"></textarea>
          <view class="mt-3 px-4 py-2.5 bg-primary text-white rounded-full text-center text-sm font-medium">保存笔记</view>
        </view>
      </view>
    </view>

    <!-- 修改事项弹窗 -->
    <view v-if="showEditMatter" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6" @click="showEditMatter = false">
      <view class="bg-white w-full max-w-sm rounded-2xl p-5" @click.stop>
        <text class="text-lg font-bold mb-4 block">修改事项</text>
        <input type="text" :value="editedMatter" @input="(e:any) => { editedMatter = e.detail.value }" placeholder="请输入事项"
          class="w-full px-4 py-3 rounded-xl border border-border bg-secondary/30 box-border" />
        <view class="flex gap-3 mt-4">
          <view @click="showEditMatter = false" class="flex-1 py-2.5 rounded-full bg-secondary text-muted-foreground font-medium text-center">取消</view>
          <view @click="showEditMatter = false" class="flex-1 py-2.5 rounded-full bg-primary text-white font-medium text-center">确定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

// 从 query 获取参数
const matter = ref('')
const editedMatter = ref('')
const year = ref(2026)
const month = ref(5)
const day = ref(17)
const hour = ref(13)
const minute = ref(38)
const panMethod = ref('fei')
const flyMethod = ref('yinyang')
const startMethod = ref('zhirun')
const anganMethod = ref('dipan')
const customJu = ref('')

// 初始化时从 query 获取参数
function initFromQuery() {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  if (page && page.options) {
    const opts = page.options
    matter.value = opts.matter || ''
    editedMatter.value = matter.value
    year.value = Number(opts.year) || 2026
    month.value = Number(opts.month) || 5
    day.value = Number(opts.day) || 17
    hour.value = Number(opts.hour) || 13
    minute.value = Number(opts.minute) || 38
    panMethod.value = opts.panMethod || 'fei'
    flyMethod.value = opts.flyMethod || 'yinyang'
    startMethod.value = opts.startMethod || 'zhirun'
    anganMethod.value = opts.anganMethod || 'dipan'
    customJu.value = opts.customJu || ''
  }
}
initFromQuery()

// 盘式描述
const startMethodLabel = computed(() => {
  const map: Record<string, string> = { zhirun: '置闰', chaibu: '拆补', maoshan: '茅山', custom: '自选' }
  return map[startMethod.value] || startMethod.value
})

const panshi = computed(() => {
  return `${panMethod.value === 'fei' ? '飞盘' : '转盘'}奇门 - ${flyMethod.value === 'yinyang' ? '阴阳皆顺' : '阳顺阴逆'} - ${startMethodLabel.value} - ${anganMethod.value === 'dipan' ? '门地盘起' : '值使门起'}`
})

// 局数
const isYang = ref(true)
const juNum = ref(7)

// 九宫常量
const palaceOrder = [4, 9, 2, 3, 5, 7, 8, 1, 6]
const palaceNames = ['', '坎1宫', '坤2宫', '震3宫', '巽4宫', '中5宫', '乾6宫', '兑7宫', '艮8宫', '离9宫']
const bashenList = ['', '值符', '腾蛇', '太阴', '六合', '勾陈', '太常', '九地', '九天', '朱雀']
const jiuxingList = ['', '天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英']
const bamenList = ['', '休门', '死门', '伤门', '杜门', '中门', '开门', '惊门', '生门', '景门']
const dipanShenList = ['', '常', '符', '阴', '合', '', '天', '地', '蛇', '雀']
const changshengList = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养']
const xiantianGong = ['', '震', '艮', '坎', '巽', '', '离', '坤', '乾', '兑']

const palaceDizhi: Record<number, string[]> = {
  1: ['子'], 2: ['丑', '未'], 3: ['卯'], 4: ['辰', '巳'], 5: [],
  6: ['戌', '亥'], 7: ['酉'], 8: ['丑', '寅'], 9: ['午']
}

const gejuMeanings: Record<string, string> = {
  '癸+己': '华盖地户。男女测之，音信皆阻，此格躲灾避难方为吉。得吉门尚可为之。',
  '戊+己': '青龙相合。主有财运，婚姻之喜，若门生宫及比合，则主百事吉，门克宫则好事成蹉跎，有始无终。',
  '惊+生': '主因女人生产或求财事惊忧，皆吉。',
  '丙+辛': '天狱。主官司败诉，有牢狱之灾。',
  '庚+庚': '太白同宫。主卜事多阻，不利经商，行人难归。',
}

// 生成九宫数据
function generatePalaceData(ju: number, yang: boolean, zhifu: number, zhishi: number) {
  const tiangan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const offset = (ju - 1) % 9
  const data: Record<number, any> = {}
  for (let i = 1; i <= 9; i++) {
    const idx = yang ? (i + offset - 1) % 9 : (9 - i + offset) % 9
    data[i] = {
      bashen: bashenList[(idx % 9) + 1] || bashenList[i],
      jiuxing: jiuxingList[(idx % 9) + 1] || jiuxingList[i],
      bamen: bamenList[(idx % 9) + 1] || bamenList[i],
      tianGan: tiangan[idx % 10],
      diGan: tiangan[(idx + 3) % 10],
      anGan: tiangan[(idx + 6) % 10],
      dipanShen: dipanShenList[i],
      changsheng: {
        tian: changshengList[(idx + ju) % 12],
        di: changshengList[(idx + ju + 4) % 12],
        an: changshengList[(idx + ju + 8) % 12]
      },
      isZhifu: i === zhifu,
      isZhishi: i === zhishi,
    }
  }
  return data
}

const zhifuPalace = 1
const zhishiPalace = 6
const palaceData = reactive<Record<number, any>>({})

function refreshPalaceData() {
  const data = generatePalaceData(juNum.value, isYang.value, zhifuPalace, zhishiPalace)
  for (const k in data) {
    palaceData[Number(k)] = data[Number(k)]
  }
}
refreshPalaceData()

function prevJu() {
  if (juNum.value === 1) { isYang.value = !isYang.value; juNum.value = 9 }
  else { juNum.value-- }
  selectedPalace.value = null
  refreshPalaceData()
}

function nextJu() {
  if (juNum.value === 9) { isYang.value = !isYang.value; juNum.value = 1 }
  else { juNum.value++ }
  selectedPalace.value = null
  refreshPalaceData()
}

// 状态
const showChangsheng = ref(false)
const showDipanShen = ref(false)
const selectedPalace = ref<number | null>(null)
const showNotes = ref(false)
const showEditMatter = ref(false)
const selectedKongwang = ref(3)

const sizhu = { year: { g: '丙', z: '午' }, month: { g: '癸', z: '巳' }, day: { g: '辛', z: '卯' }, hour: { g: '乙', z: '未' } }

const sizhuList = computed(() => [
  { label: '年柱', ...sizhu.year },
  { label: '月柱', ...sizhu.month },
  { label: '日柱', ...sizhu.day },
  { label: '时柱', ...sizhu.hour },
])

const kongwangData = [
  { zhi: '寅卯', label: '年' },
  { zhi: '午未', label: '月' },
  { zhi: '午未', label: '日' },
  { zhi: '辰巳', label: '时' }
]

const maXing = '巳'

function hasKongwang(palace: number) {
  const zhi = kongwangData[selectedKongwang.value]?.zhi || ''
  return (palaceDizhi[palace] || []).some((dz: string) => zhi.includes(dz))
}

function hasMaXing(palace: number) {
  return (palaceDizhi[palace] || []).includes(maXing)
}

function togglePalace(palace: number) {
  selectedPalace.value = selectedPalace.value === palace ? null : palace
}

function getPalaceNums(p: number) {
  return [p, p + 2, p + 4, p + 6].filter(n => n <= 10).join('，')
}

function getCombos(palace: number) {
  const d = palaceData[palace]
  if (!d) return []
  return [
    { k: `${d.tianGan}+${d.diGan}`, l: `${d.tianGan}+${d.diGan}` },
    { k: `${d.tianGan}+${d.anGan}`, l: `${d.tianGan}+${d.anGan}` },
    { k: `${d.bamen.replace('门', '')}+${d.jiuxing.replace('天', '')}`, l: `${d.bamen}+${d.jiuxing}` },
  ]
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
