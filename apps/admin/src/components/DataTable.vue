<template>
  <div class="data-table-wrap">
    <el-table
      v-loading="loading"
      :data="data"
      stripe
      border
      @sort-change="$emit('sortChange', $event)"
      @selection-change="$emit('selectionChange', $event)"
    >
      <el-table-column
        v-if="selectable"
        type="selection"
        width="50"
      />
      <el-table-column
        v-for="col in columns"
        :key="col.prop"
        :prop="col.prop"
        :label="col.label"
        :width="col.width"
        :min-width="col.minWidth"
        :sortable="col.sortable"
        :fixed="col.fixed"
        :align="col.align ?? 'left'"
        :show-overflow-tooltip="col.showOverflow ?? true"
      >
        <template
          v-if="col.slot"
          #default="{ row, $index }"
        >
          <slot
            :name="col.slot"
            :row="row"
            :index="$index"
          />
        </template>
      </el-table-column>
      <el-table-column
        v-if="$slots.actions"
        label="操作"
        :width="actionsWidth"
        fixed="right"
      >
        <template #default="{ row, $index }">
          <slot
            name="actions"
            :row="row"
            :index="$index"
          />
        </template>
      </el-table-column>
    </el-table>
    <div
      v-if="showPagination"
      class="pagination-wrap"
    >
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="currentPageSize"
        :total="total"
        :page-sizes="pageSizes"
        layout="total, sizes, prev, pager, next"
        @size-change="$emit('update:pageSize', $event); $emit('change')"
        @current-change="$emit('update:page', $event); $emit('change')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"

export interface TableColumn {
  prop: string
  label: string
  width?: string | number
  minWidth?: string | number
  sortable?: boolean | string
  fixed?: boolean | string
  align?: string
  slot?: string
  showOverflow?: boolean
}

const props = withDefaults(defineProps<{
  columns: TableColumn[]
  data: any[]
  loading?: boolean
  total?: number
  page?: number
  pageSize?: number
  selectable?: boolean
  showPagination?: boolean
  actionsWidth?: string | number
  pageSizes?: number[]
}>(), {
  loading: false,
  total: 0,
  page: 1,
  pageSize: 10,
  selectable: false,
  showPagination: true,
  actionsWidth: 180,
  pageSizes: () => [10, 20, 50],
})

const emit = defineEmits<{
  change: []
  sortChange: [value: any]
  selectionChange: [value: any]
  'update:page': [value: number]
  'update:pageSize': [value: number]
}>()

const currentPage = computed({
  get: () => props.page,
  set: (v) => emit('update:page', v),
})
const currentPageSize = computed({
  get: () => props.pageSize,
  set: (v) => emit('update:pageSize', v),
})
</script>

<style scoped>
.data-table-wrap { width: 100%; }
.pagination-wrap { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
