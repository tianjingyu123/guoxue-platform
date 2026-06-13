<template>
  <div class="page">
    <el-tabs v-model="activeTab">
      <el-tab-pane
        label="充值档位"
        name="tiers"
      >
        <div class="toolbar">
          <h3>充值档位</h3><el-button
            type="primary"
            @click="openCreateTier"
          >
            添加档位
          </el-button>
        </div>
        <el-table
          v-loading="loading"
          :data="tierList"
          stripe
        >
          <el-table-column
            prop="name"
            label="档位名称"
            min-width="120"
          />
          <el-table-column
            prop="amount"
            label="金额(元)"
            width="120"
          />
          <el-table-column
            prop="presentedCoins"
            label="赠送(国学币)"
            width="140"
          />
          <el-table-column
            prop="coins"
            label="国学币数"
            width="120"
          />
          <el-table-column
            label="操作"
            width="160"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                @click="openEditTier(row)"
              >
                编辑
              </el-button><el-button
                size="small"
                type="danger"
                @click="delTier(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane
        label="礼物管理"
        name="gifts"
      >
        <div class="toolbar">
          <h3>礼物管理</h3><el-button
            type="primary"
            @click="openCreateGift"
          >
            添加礼物
          </el-button>
        </div>
        <el-table
          v-loading="loading"
          :data="giftList"
          stripe
        >
          <el-table-column
            prop="name"
            label="礼物名"
            min-width="120"
          />
          <el-table-column
            prop="iconUrl"
            label="图标"
            width="80"
          >
            <template #default="{ row }">
              <el-image
                v-if="row.iconUrl"
                :src="row.iconUrl"
                style="width:40px;height:40px"
                fit="cover"
              />
            </template>
          </el-table-column>
          <el-table-column
            prop="price"
            label="价格(国学币)"
            width="140"
          />
          <el-table-column
            prop="animationType"
            label="动画类型"
            width="120"
          />
          <el-table-column
            label="操作"
            width="160"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                @click="openEditGift(row)"
              >
                编辑
              </el-button><el-button
                size="small"
                type="danger"
                @click="del(row.id)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="page"
          :total="total"
          :page-size="20"
          layout="total, prev, pager, next"
          style="margin-top:16px;justify-content:flex-end"
          @current-change="fetchGifts"
        />
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="vis"
      :title="dialogTitle"
      width="500px"
    >
      <el-form
        :model="form"
        label-width="100px"
      >
        <el-form-item
          label="档位名称"
          required
        >
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item
          label="金额"
          required
        >
          <el-input-number
            v-model="form.amount"
            :min="0"
            :precision="2"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item
          label="国学币数"
          required
        >
          <el-input-number
            v-model="form.coins"
            :min="0"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="赠送数量">
          <el-input-number
            v-model="form.presentedCoins"
            :min="0"
            style="width:100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="vis = false">
          取消
        </el-button><el-button
          type="primary"
          :loading="saving"
          @click="saveTier"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="giftVis"
      :title="giftDialogTitle"
      width="500px"
    >
      <el-form
        :model="giftForm"
        label-width="100px"
      >
        <el-form-item
          label="礼物名"
          required
        >
          <el-input v-model="giftForm.name" />
        </el-form-item>
        <el-form-item label="图标URL">
          <el-input
            v-model="giftForm.iconUrl"
            placeholder="礼物图标地址"
          />
        </el-form-item>
        <el-form-item
          label="价格(国学币)"
          required
        >
          <el-input-number
            v-model="giftForm.price"
            :min="0"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="动画类型">
          <el-select
            v-model="giftForm.animationType"
            style="width:100%"
          >
            <el-option
              label="无"
              value=""
            /><el-option
              label="飞入"
              value="fly"
            /><el-option
              label="旋转"
              value="rotate"
            /><el-option
              label="闪烁"
              value="sparkle"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="giftVis = false">
          取消
        </el-button><el-button
          type="primary"
          :loading="saving"
          @click="saveGift"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'

const loading = ref(false); const saving = ref(false)
const tierList = ref<any[]>([]); const giftList = ref<any[]>([]); const total = ref(0); const page = ref(1)
const activeTab = ref('tiers')
const vis = ref(false); const editingId = ref(''); const dialogTitle = ref('添加档位')
const giftVis = ref(false); const giftEditingId = ref(''); const giftDialogTitle = ref('添加礼物')
const form = reactive({ name: '', amount: 0, coins: 0, presentedCoins: 0 })
const giftForm = reactive({ name: '', iconUrl: '', price: 0, animationType: '' })

const TIER_PREFIX = 'coin.tier.'
const GIFT_BASE = '/coin/gifts'

onMounted(() => { fetchTiers() })

function formatDate(d: string) { return d ? new Date(d).toLocaleString() : '-' }

async function fetchTiers() {
  loading.value = true
  try {
    const { data } = await api.get('/system/configs', { params: { keyPrefix: TIER_PREFIX } })
    const items = data?.configs ?? data?.data ?? []
    tierList.value = items.map((item: any) => {
      const val = typeof item.value === 'string' ? JSON.parse(item.value) : item.value
      return { ...val, _key: item.key, _id: item.id }
    })
  } catch { tierList.value = [] } finally { loading.value = false }
}

async function fetchGifts() {
  loading.value = true
  try {
    const { data } = await api.get(GIFT_BASE, { params: { page: page.value, pageSize: 20 } })
    giftList.value = data.gifts || data.data || []
    total.value = data.total || 0
  } catch { giftList.value = [] } finally { loading.value = false }
}

function openCreateTier() {
  editingId.value = ''; dialogTitle.value = '添加档位'
  Object.assign(form, { name: '', amount: 0, coins: 0, presentedCoins: 0 })
  vis.value = true
}

function openEditTier(row: any) {
  editingId.value = row._key || row._id; dialogTitle.value = '编辑档位'
  Object.assign(form, { name: row.name, amount: row.amount, coins: row.coins, presentedCoins: row.presentedCoins || 0 })
  vis.value = true
}

async function saveTier() {
  saving.value = true
  try {
    const payload = { name: form.name, amount: form.amount, coins: form.coins, presentedCoins: form.presentedCoins }
    if (editingId.value) {
      await api.put(`/system/configs/${editingId.value}`, { key: editingId.value, value: JSON.stringify(payload) })
    } else {
      await api.post('/system/configs', { key: TIER_PREFIX + form.name, value: JSON.stringify(payload) })
    }
    ElMessage.success('已保存'); vis.value = false; fetchTiers()
  } catch { } finally { saving.value = false }
}

async function delTier(row: any) {
  try {
    await ElMessageBox.confirm('确定删除该档位？', '提示', { type: 'warning' })
    await api.delete(`/system/configs/${row._id}`)
    ElMessage.success('已删除'); fetchTiers()
  } catch {}
}

function openCreateGift() {
  giftEditingId.value = ''; giftDialogTitle.value = '添加礼物'
  Object.assign(giftForm, { name: '', iconUrl: '', price: 0, animationType: '' })
  giftVis.value = true
}

function openEditGift(row: any) {
  giftEditingId.value = row.id; giftDialogTitle.value = '编辑礼物'
  Object.assign(giftForm, { name: row.name, iconUrl: row.iconUrl || '', price: row.price, animationType: row.animationType || '' })
  giftVis.value = true
}

async function saveGift() {
  saving.value = true
  try {
    if (giftEditingId.value) {
      await api.put(`${GIFT_BASE}/${giftEditingId.value}`, giftForm)
    } else {
      await api.post(GIFT_BASE, giftForm)
    }
    ElMessage.success('已保存'); giftVis.value = false; fetchGifts()
  } catch { } finally { saving.value = false }
}

async function del(id: string) {
  try {
    await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' })
    await api.delete(`${GIFT_BASE}/${id}`)
    ElMessage.success('已删除'); fetchGifts()
  } catch {}
}
</script>
<style scoped>.page { padding: 16px; } .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; } .toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }</style>
