<template>
  <div class="hpc-page">
    <div class="page-header">
      <h3>首页模块配置</h3>
      <div>
        <el-button
          type="primary"
          :loading="saving"
          @click="saveAll"
        >
          保存配置
        </el-button>
        <el-button @click="refresh">
          重置/刷新
        </el-button>
      </div>
    </div>

    <el-row :gutter="16">
      <!-- 左侧：已启用模块列表 -->
      <el-col :span="14">
        <el-card>
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>首页模块排序（拖拽调整）</span>
              <el-button
                size="small"
                @click="addModule"
              >
                + 添加模块
              </el-button>
            </div>
          </template>

          <div
            v-if="modules.length === 0"
            style="color:#909399;text-align:center;padding:40px"
          >
            暂无已启用的首页模块，请添加
          </div>

          <div v-else>
            <div
              v-for="(element, index) in modules"
              :key="element.key"
              class="module-card"
              :class="{ disabled: !element.enabled }"
            >
              <div class="sort-btns">
                <el-button
                  size="small"
                  circle
                  :disabled="index === 0"
                  @click="moveUp(index)"
                >
                  ↑
                </el-button>
                <el-button
                  size="small"
                  circle
                  :disabled="index === modules.length - 1"
                  @click="moveDown(index)"
                >
                  ↓
                </el-button>
              </div>
              <div class="module-info">
                <div class="module-header">
                  <span class="module-type">{{ TYPE_LABELS[element.type] || element.type }}</span>
                  <span class="module-key">{{ element.key }}</span>
                  <el-tag
                    v-if="element.enabled"
                    type="success"
                    size="small"
                  >
                    启用
                  </el-tag>
                  <el-tag
                    v-else
                    type="info"
                    size="small"
                  >
                    禁用
                  </el-tag>
                </div>
                <div
                  v-if="element.description"
                  class="module-desc"
                >
                  {{ element.description }}
                </div>
              </div>
              <div class="module-actions">
                <el-switch
                  v-model="element.enabled"
                  size="small"
                />
                <el-button
                  size="small"
                  @click="editModule(element, index)"
                >
                  配置
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  @click="removeModule(index)"
                >
                  移除
                </el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：发现页配置 + 排盘入口 -->
      <el-col :span="10">
        <el-card style="margin-bottom:16px">
          <template #header>
            <span>发现页 - 品类栏目</span>
          </template>
          <div style="margin-bottom:8px">
            <el-checkbox-group v-model="discoveryCategories">
              <el-checkbox
                v-for="cat in allCategories"
                :key="cat"
                :label="cat"
                style="margin:4px 12px 4px 0"
              >
                {{ cat }}
              </el-checkbox>
            </el-checkbox-group>
          </div>
          <el-input-number
            v-model="discoveryCols"
            :min="2"
            :max="5"
            size="small"
            style="width:120px"
          />
          <span style="margin-left:8px;font-size:13px;color:#909399">每行列数</span>
        </el-card>

        <el-card style="margin-bottom:16px">
          <template #header>
            <span>排盘工具入口</span>
          </template>
          <el-form
            label-width="100px"
            size="small"
          >
            <el-form-item label="入口位置">
              <el-input-number
                v-model="paipanSlot"
                :min="1"
                :max="20"
              />
              <span style="margin-left:8px;font-size:12px;color:#909399">第N个模块位置</span>
            </el-form-item>
            <el-form-item label="展示工具">
              <el-checkbox-group v-model="paipanTools">
                <el-checkbox
                  label="bazi"
                  style="margin-right:12px"
                >
                  八字排盘
                </el-checkbox>
                <el-checkbox
                  label="ziwei"
                  style="margin-right:12px"
                >
                  紫微排盘
                </el-checkbox>
                <el-checkbox label="qimen">
                  奇门遁甲
                </el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card>
          <template #header>
            <span>精选标签</span>
          </template>
          <div style="margin-bottom:8px">
            <el-tag
              v-for="(tag, idx) in featuredTags"
              :key="idx"
              closable
              size="small"
              style="margin:3px"
              @close="featuredTags.splice(idx, 1)"
            >
              {{ tag }}
            </el-tag>
          </div>
          <div style="display:flex;gap:8px">
            <el-input
              v-model="newTag"
              size="small"
              placeholder="输入标签名"
              style="width:160px"
              @keyup.enter="addTag"
            />
            <el-button
              size="small"
              @click="addTag"
            >
              添加
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 编辑模块对话框 -->
    <el-dialog
      v-model="editDialog"
      title="配置首页模块"
      width="550px"
    >
      <el-form
        v-if="editTarget"
        :model="editTarget"
        label-width="90px"
      >
        <el-form-item
          label="模块类型"
          required
        >
          <el-select
            v-model="editTarget.type"
            style="width:100%"
            @change="onTypeChange"
          >
            <el-option-group
              v-for="grp in availableModuleGroups"
              :key="grp.label"
              :label="grp.label"
            >
              <el-option
                v-for="t in grp.options"
                :key="t.value"
                :label="t.label"
                :value="t.value"
              />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="唯一标识">
          <el-input
            v-model="editTarget.key"
            placeholder="如 banner_top, category_nav"
          />
        </el-form-item>
        <el-form-item label="说明">
          <el-input
            v-model="editTarget.description"
            placeholder="模块用途描述"
          />
        </el-form-item>
        <el-form-item label="配置数据">
          <el-input
            v-model="editTarget.configJson"
            type="textarea"
            :rows="5"
            placeholder="JSON配置，如 {&quot;maxItems&quot;: 6, &quot;sortBy&quot;: &quot;hot&quot;}"
          />
        </el-form-item>
        <el-form-item label="展示条件">
          <el-input
            v-model="editTarget.condition"
            placeholder="留空表示始终展示；如 role:vip"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="confirmEdit"
        >
          确认
        </el-button>
      </template>
    </el-dialog>

    <!-- 预览 -->
    <el-card style="margin-top:16px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>首页预览（共 {{ enabledModules.length }} 个模块）</span>
          <el-button
            size="small"
            @click="showPreview = !showPreview"
          >
            {{ showPreview ? '收起' : '展开' }}
          </el-button>
        </div>
      </template>
      <div
        v-if="showPreview"
        class="preview-phone"
      >
        <div
          v-for="(m, i) in enabledModules"
          :key="m.key"
          class="preview-block"
          :style="{ background: PREVIEW_COLORS[i % PREVIEW_COLORS.length] }"
        >
          <div class="preview-label">
            {{ TYPE_LABELS[m.type] || m.type }}
          </div>
          <div class="preview-key">
            {{ m.description || m.key }}
          </div>
        </div>
        <div
          v-if="enabledModules.length === 0"
          style="color:#909399;text-align:center;padding:40px"
        >
          暂无启用模块
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { systemApi, api } from "@/api";

const TYPE_LABELS: Record<string, string> = {
  banner: "Banner轮播",
  category_nav: "品类导航",
  paipan_entry: "排盘工具入口",
  hot_content: "热门内容",
  featured_courses: "精选课程",
  topic_posts: "话题帖子",
  circle_entries: "推荐圈子",
  live_entries: "直播推荐",
  ai_recommend: "AI个性化推荐",
  announcement: "全站公告",
  activity_card: "活动卡片",
  custom: "自定义模块",
};

const PREVIEW_COLORS = ["#e8f4fd", "#fef0e6", "#e6f9e6", "#fde8ef", "#f3e8fd", "#e8faf0"];

// 可用模块分组
const availableModuleGroups = [
  { label: "基础模块", options: [
    { label: "Banner轮播", value: "banner" },
    { label: "品类导航", value: "category_nav" },
    { label: "排盘工具入口", value: "paipan_entry" },
    { label: "全站公告", value: "announcement" },
  ]},
  { label: "内容推荐", options: [
    { label: "热门内容", value: "hot_content" },
    { label: "精选课程", value: "featured_courses" },
    { label: "话题帖子", value: "topic_posts" },
    { label: "AI个性化推荐", value: "ai_recommend" },
  ]},
  { label: "社区电商", options: [
    { label: "推荐圈子", value: "circle_entries" },
    { label: "直播推荐", value: "live_entries" },
    { label: "活动卡片", value: "activity_card" },
  ]},
  { label: "其他", options: [
    { label: "自定义模块", value: "custom" },
  ]},
];

const saving = ref(false);
const showPreview = ref(false);

// 首页模块
const modules = ref<any[]>([]);

// 发现页
const discoveryCategories = ref<string[]>([]);
const discoveryCols = ref(3);
const allCategories = ref<string[]>([]);

// 排盘入口
const paipanSlot = ref(6);
const paipanTools = ref(["bazi", "ziwei"]);

// 精选标签
const featuredTags = ref<string[]>([]);
const newTag = ref("");

// 编辑
const editDialog = ref(false);
const editTarget = ref<any>(null);
const editIndex = ref(-1);

const enabledModules = computed(() => modules.value.filter((m: any) => m.enabled));

onMounted(() => refresh());

async function refresh() {
  try {
    // 加载首页配置
    const { data: configsData } = await systemApi.listConfigs();
    const configs = (configsData as any)?.configs || [];

    const findCfg = (key: string) => {
      const c = configs.find((c: any) => c.configKey === key);
      if (c?.configValue) {
        try { return JSON.parse(c.configValue); } catch { return c.configValue; }
      }
      return null;
    };

    // 首页模块布局
    const layout = findCfg("home:layout");
    if (Array.isArray(layout)) {
      modules.value = layout;
    } else {
      // 默认布局
      modules.value = [
        { key: "banner_top", type: "banner", enabled: true, description: "顶部Banner轮播" },
        { key: "category_nav", type: "category_nav", enabled: true, description: "品类导航入口" },
        { key: "paipan", type: "paipan_entry", enabled: true, description: "排盘工具快捷入口" },
        { key: "hot_content", type: "hot_content", enabled: true, description: "热门内容推荐" },
        { key: "featured_courses", type: "featured_courses", enabled: true, description: "精选课程展示" },
        { key: "circle_entries", type: "circle_entries", enabled: true, description: "推荐圈子入口" },
      ];
    }

    // 发现页
    const discovery = findCfg("home:discovery");
    if (discovery) {
      discoveryCategories.value = discovery.categories || [];
      discoveryCols.value = discovery.cols || 3;
    }

    // 排盘入口
    const paipan = findCfg("home:paipan_slot");
    paipanSlot.value = Number(paipan?.slot || paipan || 6);
    if (paipan?.tools) paipanTools.value = paipan.tools;

    // 精选标签
    const tags = findCfg("home:featured_tags");
    featuredTags.value = Array.isArray(tags) ? tags : [];

    // 品类列表
    try {
      const { data: treeData } = await api.get("/system/category-tree");
      allCategories.value = Object.keys(treeData || {});
    } catch {
      allCategories.value = ["国学经典", "中医养生", "诗词歌赋", "民俗节庆", "非遗传承", "茶道香道", "书法绘画", "传统音乐", "武术太极", "易经智慧"];
    }

    // 如果发现页未配置，默认全选
    if (discoveryCategories.value.length === 0) {
      discoveryCategories.value = [...allCategories.value];
    }
  } catch { /* ignore */ }
}

async function saveAll() {
  saving.value = true;
  try {
    const configs: Array<{ key: string; value: string }> = [];

    // 首页布局
    configs.push({ key: "home:layout", value: JSON.stringify(modules.value) });

    // 发现页
    configs.push({
      key: "home:discovery",
      value: JSON.stringify({ categories: discoveryCategories.value, cols: discoveryCols.value }),
    });

    // 排盘入口
    configs.push({
      key: "home:paipan_slot",
      value: JSON.stringify({ slot: paipanSlot.value, tools: paipanTools.value }),
    });

    // 精选标签
    configs.push({ key: "home:featured_tags", value: JSON.stringify(featuredTags.value) });

    for (const cfg of configs) {
      await systemApi.setConfig(cfg.key, { value: cfg.value, description: "首页模块配置" });
    }

    ElMessage.success("首页配置已保存");
  } finally { saving.value = false; }
}

function addModule() {
  editTarget.value = { key: "", type: "custom", enabled: true, description: "", configJson: "{}", condition: "" };
  editIndex.value = -1;
  editDialog.value = true;
}

function editModule(element: any, index: number) {
  editTarget.value = {
    ...element,
    configJson: element.config ? JSON.stringify(element.config, null, 2) : "{}",
  };
  editIndex.value = index;
  editDialog.value = true;
}

function confirmEdit() {
  const item: any = {
    key: editTarget.value.key || `${editTarget.value.type}_${Date.now()}`,
    type: editTarget.value.type,
    enabled: editTarget.value.enabled !== false,
    description: editTarget.value.description,
    condition: editTarget.value.condition || undefined,
  };
  try { item.config = JSON.parse(editTarget.value.configJson || "{}"); } catch { item.config = {}; }

  if (editIndex.value >= 0) {
    modules.value[editIndex.value] = item;
  } else {
    modules.value.push(item);
  }
  editDialog.value = false;
}

function removeModule(index: number) {
  modules.value.splice(index, 1);
}

function moveUp(index: number) {
  if (index > 0) {
    const temp = modules.value[index];
    modules.value[index] = modules.value[index - 1];
    modules.value[index - 1] = temp;
  }
}

function moveDown(index: number) {
  if (index < modules.value.length - 1) {
    const temp = modules.value[index];
    modules.value[index] = modules.value[index + 1];
    modules.value[index + 1] = temp;
  }
}

function onTypeChange(type: string) {
  if (!editTarget.value.key) {
    editTarget.value.key = `${type}_${Date.now()}`;
  }
}

function addTag() {
  const t = newTag.value.trim();
  if (t && !featuredTags.value.includes(t)) {
    featuredTags.value.push(t);
    newTag.value = "";
  }
}
</script>

<style scoped>
.hpc-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: #8b4513; }

.module-card {
  display: flex; align-items: center; padding: 10px 12px; margin-bottom: 8px;
  background: #fff; border: 1px solid #ebeef5; border-radius: 8px; transition: all .2s;
}
.module-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,.08); }
.module-card.disabled { opacity: 0.5; }
.module-card .module-info { flex: 1; min-width: 0; }
.module-card .module-header { display: flex; align-items: center; gap: 8px; }
.module-card .module-type { font-weight: 600; font-size: 14px; }
.module-card .module-key { color: #909399; font-size: 12px; }
.module-card .module-desc { font-size: 12px; color: #909399; margin-top: 2px; }
.module-card .module-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

.sort-btns { display: flex; flex-direction: column; gap: 2px; margin-right: 10px; }

.preview-phone { max-width: 375px; margin: 0 auto; border: 2px solid #e0e0e0; border-radius: 16px; overflow: hidden; }
.preview-block { padding: 20px 16px; text-align: center; min-height: 48px; border-bottom: 1px solid rgba(0,0,0,.05); }
.preview-label { font-size: 14px; font-weight: 600; color: #303133; }
.preview-key { font-size: 11px; color: #909399; margin-top: 2px; }
</style>
