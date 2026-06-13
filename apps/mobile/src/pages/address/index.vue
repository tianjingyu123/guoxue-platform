<script setup lang="ts">
import { ref, computed } from 'vue'

interface Address {
  id: number; name: string; phone: string; province: string; city: string
  district: string; street: string; detail: string; isDefault: boolean
}
const addresses = ref<Address[]>([
  { id: 1, name: '张三', phone: '138****8888', province: '北京市', city: '北京市', district: '朝阳区', street: '建国路88号', detail: '国贸中心A座1808室', isDefault: true },
  { id: 2, name: '李四', phone: '139****9999', province: '上海市', city: '上海市', district: '浦东新区', street: '陆家嘴环路1000号', detail: '恒生银行大厦12层', isDefault: false },
  { id: 3, name: '王五', phone: '137****7777', province: '广东省', city: '深圳市', district: '南山区', street: '科技园南路', detail: '腾讯大厦8楼', isDefault: false },
])
const regions = {
  provinces: ['北京市','上海市','广东省','浙江省','江苏省','四川省'],
  cities: { '北京市':['北京市'],'上海市':['上海市'],'广东省':['广州市','深圳市','东莞市'],'浙江省':['杭州市','宁波市'],'江苏省':['南京市','苏州市'],'四川省':['成都市','绵阳市'] } as Record<string,string[]>,
  districts: { '北京市':['朝阳区','海淀区','东城区','西城区'],'上海市':['浦东新区','黄浦区','静安区','徐汇区'],'广州市':['天河区','越秀区','荔湾区'],'深圳市':['南山区','福田区','罗湖区'],'杭州市':['西湖区','上城区','下城区'],'成都市':['锦江区','青羊区','武侯区'] } as Record<string,string[]>,
}
const showEditModal = ref(false)
const showDeleteConfirm = ref<number|null>(null)
const editingId = ref<number|null>(null)
const showRegionPicker = ref(false)
const regionStep = ref<'province'|'city'|'district'>('province')
const formData = ref({ name:'', phone:'', province:'', city:'', district:'', street:'', detail:'', isDefault:false })
const regionOptions = computed(() => {
  if (regionStep.value==='province') return regions.provinces
  if (regionStep.value==='city') return regions.cities[formData.value.province]||[]
  return regions.districts[formData.value.city]||[]
})
const regionTitle = computed(() => ({ province:'选择省份', city:'选择城市', district:'选择区县' }[regionStep.value]))
const formRegionText = computed(() => {
  const { province, city, district } = formData.value
  if (!province) return ''
  return [province, city!==province?city:'', district].filter(Boolean).join(' ')
})
function openAdd() { editingId.value=null; formData.value={ name:'', phone:'', province:'', city:'', district:'', street:'', detail:'', isDefault:addresses.value.length===0 }; showEditModal.value=true }
function openEdit(a: Address) { editingId.value=a.id; formData.value={ name:a.name, phone:a.phone, province:a.province, city:a.city, district:a.district, street:a.street, detail:a.detail, isDefault:a.isDefault }; showEditModal.value=true }
function handleSave() {
  if (!formData.value.name||!formData.value.phone||!formData.value.province||!formData.value.detail) return
  if (editingId.value!==null) { addresses.value=addresses.value.map(a=>a.id===editingId.value?{...a,...formData.value}:(formData.value.isDefault?{...a,isDefault:false}:a)) }
  else { const id=Math.max(0,...addresses.value.map(a=>a.id))+1; if(formData.value.isDefault) addresses.value=addresses.value.map(a=>({...a,isDefault:false})); addresses.value.push({id,...formData.value}) }
  showEditModal.value=false
}
function handleDelete(id: number) { addresses.value=addresses.value.filter(a=>a.id!==id); showDeleteConfirm.value=null }
function handleSetDefault(id: number) { addresses.value=addresses.value.map(a=>({...a,isDefault:a.id===id})) }
function selectRegion(val: string) {
  if (regionStep.value==='province') { formData.value.province=val; formData.value.city=''; formData.value.district=''; regionStep.value='city' }
  else if (regionStep.value==='city') { formData.value.city=val; formData.value.district=''; regionStep.value='district' }
  else { formData.value.district=val; showRegionPicker.value=false; regionStep.value='province' }
}
function regionPickerBack() {
  if (regionStep.value==='city') regionStep.value='province'
  else if (regionStep.value==='district') regionStep.value='city'
  else showRegionPicker.value=false
}
</script>

<template>
  <view class="min-h-screen bg-background pb-24">
    <view class="sticky top-0 z-40 bg-background border-b border-border">
      <view class="flex items-center justify-between h-14 px-4">
        <view class="w-9 h-9 rounded-full flex items-center justify-center" @tap="uni.navigateBack()">
          <svg class="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </view>
        <text class="font-semibold text-base text-foreground">收货地址</text>
        <view class="w-9" />
      </view>
    </view>

    <view class="p-4 space-y-3">
      <view v-if="addresses.length === 0" class="flex flex-col items-center justify-center py-20">
        <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </view>
        <text class="text-muted-foreground text-sm">暂无收货地址</text>
      </view>
      <view v-else class="space-y-3">
        <view v-for="addr in addresses" :key="addr.id" class="bg-card rounded-xl border border-border p-4">
          <view class="flex items-start justify-between">
            <view class="flex-1 min-w-0">
              <view class="flex items-center gap-3 mb-2">
                <text class="font-semibold text-foreground">{{ addr.name }}</text>
                <text class="text-sm text-muted-foreground">{{ addr.phone }}</text>
                <view v-if="addr.isDefault" class="px-1.5 py-0.5 rounded-full bg-accent/20">
                  <text class="text-[10px] text-accent font-medium">默认</text>
                </view>
              </view>
              <text class="text-sm text-muted-foreground leading-relaxed">{{ addr.province }}{{ addr.city!==addr.province?addr.city:'' }}{{ addr.district }}{{ addr.street }}{{ addr.detail }}</text>
            </view>
            <view class="p-2 -mr-2" @tap="openEdit(addr)">
              <svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </view>
          </view>
          <view class="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <view v-if="!addr.isDefault" class="text-xs text-primary" @tap="handleSetDefault(addr.id)">设为默认地址</view>
            <view v-else class="text-xs text-muted-foreground">当前默认地址</view>
            <view class="flex items-center gap-1 text-xs text-destructive" @tap="showDeleteConfirm=addr.id">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              <text>删除</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
      <view class="w-full h-12 bg-primary rounded-xl flex items-center justify-center gap-2" @tap="openAdd">
        <svg class="w-5 h-5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <text class="text-primary-foreground font-medium">新增收货地址</text>
      </view>
    </view>

    <!-- 删除确认 -->
    <view v-if="showDeleteConfirm!==null" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <view class="bg-card w-full max-w-sm rounded-2xl p-6 text-center">
        <text class="font-semibold text-lg text-foreground block mb-2">确认删除</text>
        <text class="text-sm text-muted-foreground block mb-6">删除后将无法恢复，确定要删除这个地址吗？</text>
        <view class="flex gap-3">
          <view class="flex-1 h-11 bg-secondary rounded-xl flex items-center justify-center" @tap="showDeleteConfirm=null"><text class="text-foreground font-medium">取消</text></view>
          <view class="flex-1 h-11 bg-destructive rounded-xl flex items-center justify-center" @tap="handleDelete(showDeleteConfirm!)"><text class="text-destructive-foreground font-medium">删除</text></view>
        </view>
      </view>
    </view>

    <!-- 编辑/新增弹窗 -->
    <view v-if="showEditModal" class="fixed inset-0 z-50 bg-background flex flex-col">
      <view class="sticky top-0 bg-background border-b border-border">
        <view class="flex items-center justify-between h-14 px-4">
          <view class="p-2 -ml-2" @tap="showEditModal=false">
            <svg class="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </view>
          <text class="font-semibold text-base text-foreground">{{ editingId!==null?'编辑地址':'新增地址' }}</text>
          <view class="text-sm font-medium" :class="(formData.name&&formData.phone&&formData.province&&formData.detail)?'text-primary':'text-muted-foreground'" @tap="handleSave">保存</view>
        </view>
      </view>
      <view class="flex-1 overflow-y-auto p-4 space-y-4">
        <view>
          <text class="text-sm text-muted-foreground block mb-1.5">收件人</text>
          <input class="w-full px-4 py-3 bg-secondary rounded-xl text-foreground" placeholder="请输入收件人姓名" :value="formData.name" @input="(e:any)=>formData.name=e.detail.value" />
        </view>
        <view>
          <text class="text-sm text-muted-foreground block mb-1.5">手机号</text>
          <input class="w-full px-4 py-3 bg-secondary rounded-xl text-foreground" type="number" placeholder="请输入手机号码" :value="formData.phone" @input="(e:any)=>formData.phone=e.detail.value" />
        </view>
        <view>
          <text class="text-sm text-muted-foreground block mb-1.5">所在地区</text>
          <view class="w-full px-4 py-3 bg-secondary rounded-xl flex items-center justify-between" @tap="()=>{regionStep='province';showRegionPicker=true}">
            <text :class="formRegionText?'text-foreground':'text-muted-foreground/60'">{{ formRegionText||'请选择省/市/区' }}</text>
            <svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </view>
        </view>
        <view>
          <text class="text-sm text-muted-foreground block mb-1.5">详细地址</text>
          <textarea class="w-full px-4 py-3 bg-secondary rounded-xl text-foreground" placeholder="街道、楼牌号等" :value="formData.detail" @input="(e:any)=>formData.detail=e.detail.value" />
        </view>
        <view class="flex items-center justify-between py-3">
          <text class="text-sm text-foreground">设为默认地址</text>
          <view class="w-12 h-7 rounded-full relative transition-colors" :class="formData.isDefault?'bg-primary':'bg-secondary'" @tap="formData.isDefault=!formData.isDefault">
            <view class="absolute top-1 w-5 h-5 rounded-full bg-card shadow transition-transform" :class="formData.isDefault?'translate-x-6':'translate-x-1'" />
          </view>
        </view>
      </view>

      <!-- 地区选择器 -->
      <view v-if="showRegionPicker" class="fixed inset-0 z-50 flex items-end bg-black/60">
        <view class="w-full bg-card rounded-t-2xl" style="max-height:60vh;">
          <view class="flex items-center justify-between px-4 py-3 border-b border-border">
            <view class="text-sm text-muted-foreground" @tap="regionPickerBack">{{ regionStep==='province'?'取消':'返回' }}</view>
            <text class="font-medium text-foreground">{{ regionTitle }}</text>
            <view class="w-10" />
          </view>
          <scroll-view scroll-y style="max-height:50vh;">
            <view v-for="opt in regionOptions" :key="opt" class="px-4 py-3 flex items-center justify-between border-b border-border/30" @tap="selectRegion(opt)">
              <text class="text-foreground">{{ opt }}</text>
              <svg v-if="(regionStep==='province'&&formData.province===opt)||(regionStep==='city'&&formData.city===opt)||(regionStep==='district'&&formData.district===opt)" class="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>
  </view>
</template>
