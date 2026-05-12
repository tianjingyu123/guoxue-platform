<script setup lang="ts">
/**
 * 紫微斗数排盘页面
 * 输入农历信息，展示十二宫命盘 + 四化 + 格局
 */
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { paipanApi } from '@/api'

const form = reactive({
  name: '',
  gender: '男' as string,
  year: 1990,
  month: 1,
  day: 15,
  hour: 0,
  lunarMonth: 1,
  lunarDay: 15,
  lunarHour: '子' as string,
  lunarYearGan: '庚' as string,
  lunarYearZhi: '午' as string,
})

const result = ref<any>(null)
const loading = ref(false)

const tianGan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const diZhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
const shiChen = diZhi.map((z, i) => ({ value: z, label: `${z}时 (${i*2}-${(i*2+2)%24}时)` }))

async function doCalc() {
  if (!form.lunarYearGan || !form.lunarYearZhi) {
    ElMessage.warning('请选择年份干支')
    return
  }
  loading.value = true
  try {
    result.value = await paipanApi.ziweiPreview({ ...form })
  } catch (e: any) {
    ElMessage.error('排盘失败：' + (e.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

// 星曜样式
function starClass(star: any) {
  const base = 'star-tag'
  const type = star.type === 'main' ? 'star-main' : star.type === 'assist' ? 'star-assist' : 'star-sisha'
  const ji = star.liangJi === '吉' ? 'star-ji' : star.liangJi === '凶' ? 'star-xiong' : 'star-neutral'
  return `${base} ${type} ${ji}`
}
</script>

<template>
  <div class="ziwei-page">
    <!-- 输入面板 -->
    <div class="input-panel">
      <h2>紫微斗数排盘</h2>
      <el-form
        :model="form"
        inline
      >
        <el-form-item label="姓名">
          <el-input
            v-model="form.name"
            placeholder="请输入姓名"
            size="small"
            style="width:120px"
          />
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group
            v-model="form.gender"
            size="small"
          >
            <el-radio-button value="男">
              男
            </el-radio-button>
            <el-radio-button value="女">
              女
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="农历年">
          <el-input-number
            v-model="form.year"
            :min="1900"
            :max="2100"
            size="small"
          />年
        </el-form-item>
        <el-form-item label="农历月">
          <el-select
            v-model="form.lunarMonth"
            size="small"
            style="width:80px"
          >
            <el-option
              v-for="m in 12"
              :key="m"
              :label="m+'月'"
              :value="m"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="农历日">
          <el-select
            v-model="form.lunarDay"
            size="small"
            style="width:80px"
          >
            <el-option
              v-for="d in 30"
              :key="d"
              :label="d+'日'"
              :value="d"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="时辰">
          <el-select
            v-model="form.lunarHour"
            size="small"
            style="width:150px"
          >
            <el-option
              v-for="sc in shiChen"
              :key="sc.value"
              :label="sc.label"
              :value="sc.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <el-form
        :model="form"
        inline
        style="margin-top:8px"
      >
        <el-form-item label="年干">
          <el-select
            v-model="form.lunarYearGan"
            size="small"
            style="width:80px"
          >
            <el-option
              v-for="g in tianGan"
              :key="g"
              :label="g"
              :value="g"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="年支">
          <el-select
            v-model="form.lunarYearZhi"
            size="small"
            style="width:80px"
          >
            <el-option
              v-for="z in diZhi"
              :key="z"
              :label="z"
              :value="z"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            @click="doCalc"
          >
            排盘
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 结果展示 -->
    <div
      v-if="result"
      class="result-area"
    >
      <!-- 概览 -->
      <div class="overview">
        <el-tag
          type="warning"
          size="large"
        >
          {{ result.wuXingJu }}
        </el-tag>
        <el-tag size="large">
          命宫: {{ result.mingGong?.name }} {{ result.mingGong?.gan }}{{ result.mingGong?.zhi }}
        </el-tag>
        <el-tag
          type="success"
          size="large"
        >
          身宫: {{ result.shenGong }}
        </el-tag>
        <el-tag
          v-if="result.geShi?.length"
          type="danger"
          size="large"
        >
          格局: {{ result.geShi.join(' · ') }}
        </el-tag>
      </div>

      <!-- 四化 -->
      <div class="sihua">
        <span class="sihua-item lu">化禄: {{ result.siHua?.huaLu }}</span>
        <span class="sihua-item quan">化权: {{ result.siHua?.huaQuan }}</span>
        <span class="sihua-item ke">化科: {{ result.siHua?.huaKe }}</span>
        <span class="sihua-item ji">化忌: {{ result.siHua?.huaJi }}</span>
      </div>

      <!-- 十二宫 -->
      <div class="gong-grid">
        <div
          v-for="gong in result.gongWei"
          :key="gong.name"
          :class="['gong-card', { shen: gong.shenGong, ming: gong.name === '命宫' }]"
        >
          <div class="gong-header">
            <div class="gong-title-row">
              <span class="gong-name">{{ gong.name }}</span>
              <span
                v-if="gong.shenGong"
                class="gong-badge shen"
              >身</span>
              <span
                v-if="gong.name === '命宫'"
                class="gong-badge ming"
              >命</span>
            </div>
            <span class="gong-ganzhi">{{ gong.gan }}{{ gong.zhi }}</span>
            <span class="gong-daxian">大限: {{ gong.daXianStart }}-{{ gong.daXianEnd }}岁</span>
          </div>
          <div class="gong-stars">
            <span
              v-if="!gong.stars?.length"
              class="empty-gong"
            >空宫</span>
            <span
              v-for="star in gong.stars"
              :key="star.name"
              :class="starClass(star)"
            >
              {{ star.name }}
            </span>
          </div>
          <div class="gong-extra">
            <span class="extra-item">三方: {{ gong.sanFang?.join(' ') }}</span>
            <span class="extra-item">对宫: {{ gong.duiGong }}</span>
            <span class="extra-item">宫气: {{ gong.gongQi }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div
      v-if="!result && !loading"
      class="empty-state"
    >
      <p>请输入出生信息，点击"排盘"查看紫微斗数命盘</p>
    </div>
  </div>
</template>

<style scoped>
.ziwei-page {
  min-height: 100vh;
  background: #f5f0e6;
  padding-bottom: 40px;
}

.input-panel {
  background: #fff;
  padding: 16px 24px;
  border-bottom: 1px solid #E8E0D5;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
}
.input-panel h2 {
  margin: 0 0 12px;
  font-size: 18px;
  color: #8b4513;
}

.result-area {
  padding: 20px 24px;
}

/* 概览 */
.overview {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

/* 四化 */
.sihua {
  display: flex;
  gap: 20px;
  padding: 10px 16px;
  background: #fefbf6;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #e8dcc8;
}
.sihua-item { font-size: 15px; font-weight: bold; }
.sihua-item.lu { color: #67c23a; }
.sihua-item.quan { color: #409eff; }
.sihua-item.ke { color: #9b59b6; }
.sihua-item.ji { color: #f56c6c; }

/* 十二宫网格 */
.gong-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.gong-card {
  background: #fff;
  border: 1px solid #e8dcc8;
  border-radius: 8px;
  padding: 12px;
  border-left: 3px solid #E8E0D5;
}
.gong-card.ming {
  border-left-color: #8b4513;
  background: #fefbf6;
}
.gong-card.shen {
  border-left-color: #e6a23c;
}

.gong-header {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #f0e6d3;
}
.gong-title-row { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.gong-name { font-size: 14px; font-weight: bold; color: #333; }
.gong-badge { font-size: 10px; padding: 1px 5px; border-radius: 4px; color: #fff; }
.gong-badge.ming { background: #8b4513; }
.gong-badge.shen { background: #e6a23c; }
.gong-ganzhi { font-size: 13px; color: #666; display: block; }
.gong-daxian { font-size: 11px; color: #bbb; display: block; }

.gong-stars {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-bottom: 6px;
  min-height: 24px;
}
.empty-gong { font-size: 11px; color: #ddd; }

.star-tag {
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 3px;
  background: #f5f5f5;
  color: #666;
}
.star-main { font-weight: bold; }
.star-assist { font-size: 10px; }
.star-sisha { font-style: italic; }
.star-ji { background: #f0f9eb; color: #67c23a; }
.star-xiong { background: #fef0f0; color: #f56c6c; }
.star-neutral { background: #f5f5f5; color: #909399; }

.gong-extra { padding-top: 6px; border-top: 1px dashed #f0f0f0; }
.extra-item { font-size: 10px; color: #ccc; display: block; line-height: 1.6; }

.empty-state {
  text-align: center;
  color: #999;
  padding: 60px 0;
  font-size: 15px;
}
</style>
