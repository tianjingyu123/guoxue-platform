import { ref, reactive, computed } from "vue";
import { ElMessage } from "element-plus";
import { exportCSV } from "../utils/export";

export interface UseTableOptions<T = any> {
  fetchApi: (params: any) => Promise<any>;
  defaultPageSize?: number;
  immediate?: boolean;
  transformResponse?: (res: any) => { items: T[]; total: number };
  exportFileName?: string;
  /** 初始筛选值（在首次 immediate 拉取前预填入 filters，如管理端默认查看全部状态） */
  initialFilters?: Record<string, any>;
}

export function useTable<T = any>(options: UseTableOptions<T>) {
  const {
    fetchApi,
    defaultPageSize = 20,
    immediate = true,
    transformResponse,
    exportFileName = "导出数据",
    initialFilters,
  } = options;

  const loading = ref(false);
  const tableData = ref<T[]>([]) as any;
  const selection = ref<T[]>([]) as any;

  const pagination = reactive({
    page: 1,
    pageSize: defaultPageSize,
    total: 0,
  });

  const filters = reactive<Record<string, any>>({ ...(initialFilters ?? {}) });

  const totalPages = computed(() => Math.ceil(pagination.total / pagination.pageSize));

  async function fetchList() {
    loading.value = true;
    try {
      const params = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...filters,
      };
      const res = await fetchApi(params);
      const data = res?.data ?? res;

      if (transformResponse) {
        const result = transformResponse(data);
        tableData.value = result.items;
        pagination.total = result.total;
      } else {
        tableData.value = data?.items ?? data?.list ?? data?.data ?? [];
        pagination.total = data?.total ?? data?.totalCount ?? 0;
      }
    } catch (err: any) {
      console.error("[useTable] fetchList 失败", err);
    } finally {
      loading.value = false;
    }
  }

  function handlePageChange(page: number) {
    pagination.page = page;
    fetchList();
  }

  function handleSizeChange(size: number) {
    pagination.pageSize = size;
    pagination.page = 1;
    fetchList();
  }

  function handleSearch() {
    pagination.page = 1;
    fetchList();
  }

  function handleReset(resetFields?: Record<string, any>) {
    if (resetFields) {
      Object.keys(resetFields).forEach((k) => { filters[k] = resetFields[k]; });
    } else {
      Object.keys(filters).forEach((k) => { filters[k] = undefined; });
    }
    pagination.page = 1;
    fetchList();
  }

  function handleSelectionChange(rows: T[]) {
    selection.value = rows;
  }

  function handleExport(columns: { label: string; prop?: string; key?: string }[]) {
    if (tableData.value.length === 0) {
      ElMessage.warning("暂无数据可导出");
      return;
    }
    exportCSV(exportFileName, columns, tableData.value);
  }

  function setFilter(key: string, value: any) {
    filters[key] = value;
  }

  if (immediate) fetchList();

  return {
    loading,
    tableData,
    selection,
    pagination,
    filters,
    totalPages,
    fetchList,
    handlePageChange,
    handleSizeChange,
    handleSearch,
    handleReset,
    handleSelectionChange,
    handleExport,
    setFilter,
  };
}
