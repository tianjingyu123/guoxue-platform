<template>
  <div class="search-filter">
    <el-form
      :inline="true"
      :model="localFilters"
    >
      <el-form-item
        v-if="showKeyword"
        label="关键词"
      >
        <el-input
          v-model="localFilters.keyword"
          :placeholder="placeholder"
          clearable
          style="width: 200px"
          @keyup.enter="handleSearch"
        />
      </el-form-item>
      <el-form-item
        v-for="f in customFilters"
        :key="f.key"
        :label="f.label"
      >
        <el-input
          v-if="f.type === 'input'"
          v-model="localFilters[f.key]"
          :placeholder="f.placeholder"
          clearable
          style="width: 160px"
        />
        <el-select
          v-else-if="f.type === 'select'"
          v-model="localFilters[f.key]"
          :placeholder="f.placeholder ?? '全部'"
          clearable
          style="width: 140px"
        >
          <el-option
            v-for="o in f.options"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </el-select>
        <el-date-picker
          v-else-if="f.type === 'date'"
          v-model="localFilters[f.key]"
          type="date"
          :placeholder="f.placeholder"
          value-format="YYYY-MM-DD"
          style="width: 160px"
        />
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          @click="handleSearch"
        >
          搜索
        </el-button>
        <el-button @click="handleReset">
          重置
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue"

export interface FilterDef {
  key: string
  label: string
  type: 'input' | 'select' | 'date'
  placeholder?: string
  options?: { label: string; value: string | number }[]
}

const props = withDefaults(defineProps<{
  filters?: Record<string, any>
  customFilters?: FilterDef[]
  placeholder?: string
  showKeyword?: boolean
}>(), {
  filters: () => ({}),
  customFilters: () => [],
  placeholder: '搜索...',
  showKeyword: true,
})

const emit = defineEmits<{
  search: [filters: Record<string, any>]
  reset: []
}>()

const localFilters = reactive<Record<string, any>>({
  keyword: '',
  ...props.filters,
})

props.customFilters.forEach(f => {
  if (!(f.key in localFilters)) {
    localFilters[f.key] = undefined
  }
})

watch(() => props.filters, (v) => {
  Object.assign(localFilters, v)
}, { deep: true })

function handleSearch() {
  const cleaned: Record<string, any> = {}
  for (const [k, v] of Object.entries(localFilters)) {
    if (v !== '' && v !== null && v !== undefined) cleaned[k] = v
  }
  emit('search', cleaned)
}

function handleReset() {
  localFilters.keyword = ''
  props.customFilters.forEach(f => { localFilters[f.key] = undefined })
  emit('reset')
}
</script>

<style scoped>
.search-filter { margin-bottom: 0; }
</style>
