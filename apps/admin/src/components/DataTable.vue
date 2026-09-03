<template>
  <div class="data-table-wrap">
    <div
      v-if="$slots.toolbar"
      class="data-table__toolbar"
      role="search"
      aria-label="列表筛选与操作"
    >
      <slot name="toolbar" />
    </div>
    <div
      v-if="$slots.batch"
      class="data-table__batch"
      role="status"
      aria-live="polite"
    >
      <slot name="batch" />
    </div>
    <el-table
      v-loading="loading"
      :data="data"
      class="data-table"
      stripe
      @sort-change="$emit('sortChange', $event)"
      @selection-change="$emit('selectionChange', $event)"
    >
      <template #empty>
        <slot name="empty">
          <el-empty
            :description="emptyText"
            :image-size="72"
          />
        </slot>
      </template>
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
    <div class="data-table__footer">
      <div
        v-if="showPagination"
        class="pagination-wrap"
      >
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="currentPageSize"
          :total="total"
          :page-sizes="pageSizes"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="$emit('update:pageSize', $event); $emit('change')"
          @current-change="$emit('update:page', $event); $emit('change')"
        />
      </div>
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
  // 表格行结构由各业务页面决定，保留动态边界以兼容自动注册组件的插槽推断。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  loading?: boolean
  total?: number
  page?: number
  pageSize?: number
  selectable?: boolean
  showPagination?: boolean
  actionsWidth?: string | number
  pageSizes?: number[]
  emptyText?: string
}>(), {
  loading: false,
  total: 0,
  page: 1,
  pageSize: 10,
  selectable: false,
  showPagination: true,
  actionsWidth: 200,
  pageSizes: () => [10, 20, 50],
  emptyText: '暂无符合条件的数据，可调整筛选条件后重试',
})

const emit = defineEmits([
  'change',
  'sortChange',
  'selectionChange',
  'update:page',
  'update:pageSize',
])

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
.data-table-wrap {
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  background: rgba(255,255,255,.96);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-divider);
  padding: 8px 18px 16px;
  box-shadow: var(--shadow-card);
}

.data-table__toolbar {
  min-height: 54px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}
.data-table__footer {
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.data-table__batch {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-height: 44px;
  margin: 0 -8px 8px;
  padding: 7px 12px;
  border: 1px solid rgba(82,120,157,.14);
  border-radius: 10px;
  color: #385975;
  background: rgba(82,120,157,.07);
  font-size: 12px;
  font-weight: 600;
}
.pagination-wrap { margin-left: auto; }
:deep(.el-table::before) { display: none; }
:deep(.el-table th.el-table__cell) { background: #f7f8fa !important; }
@media (max-width: 760px) {
  .data-table-wrap { padding: 6px 10px 12px; border-radius: var(--radius-lg); }
  .data-table__footer { align-items: flex-start; flex-direction: column; }
  .pagination-wrap { width: 100%; margin-left: 0; overflow-x: auto; }
}
</style>
