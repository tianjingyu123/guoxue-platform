<template>
  <view class="pe-page">
    <!-- 顶部导航 -->
    <view
      class="pe-nav"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="pe-nav-inner">
        <view
          class="pe-nav-ic"
          @tap="goBack"
        >
          <AppIcon
            name="arrow-left"
            :size="36"
            color="#2C2C2C"
          />
        </view>
        <text class="pe-nav-ttl">
          {{ isEdit ? '编辑商品' : '发布商品' }}
        </text>
        <view
          class="pe-nav-draft"
          @tap="onSaveDraft"
        >
          <text class="pe-nav-draft-txt">
            {{ savingDraft ? '保存中…' : '存草稿' }}
          </text>
        </view>
      </view>
    </view>

    <!-- Loading（编辑预填中） -->
    <view
      v-if="loading"
      class="pe-state"
      :style="{ paddingTop: navHeight + 40 + 'px' }"
    >
      <text class="pe-state-txt">
        加载中…
      </text>
    </view>
    <!-- Error -->
    <view
      v-else-if="error"
      class="pe-state"
      :style="{ paddingTop: navHeight + 40 + 'px' }"
    >
      <AppIcon
        name="alert-circle"
        :size="80"
        color="#C41E3A"
      />
      <text class="pe-state-txt">
        {{ error }}
      </text>
      <view
        class="pe-state-btn"
        @tap="loadProduct"
      >
        <text class="pe-state-btn-txt">
          重试
        </text>
      </view>
    </view>

    <template v-else>
      <scroll-view
        scroll-y
        class="pe-scroll"
        :scroll-into-view="scrollTarget"
        :style="{ paddingTop: navHeight + 'px' }"
      >
        <view class="pe-body">
          <!-- ① 商品主图 -->
          <view
            id="sec-1"
            class="pe-sec"
            :class="{ err: errFields.mainImage }"
          >
            <view class="pe-sh">
              <view class="pe-sh-l">
                <text class="pe-idx">
                  1
                </text>
                <text class="pe-sh-n">
                  商品主图
                </text>
                <text class="pe-req">
                  必填
                </text>
              </view>
              <text
                class="pe-tip"
                :class="{ 'tip-err': errFields.mainImage }"
              >
                {{ errFields.mainImage ? '未上传' : '1张 · 1:1' }}
              </text>
            </view>
            <view class="pe-sb">
              <view
                v-if="form.mainImage"
                class="pe-main-wrap"
              >
                <image
                  :src="form.mainImage"
                  class="pe-main-img"
                  mode="aspectFill"
                />
                <view
                  class="pe-main-del"
                  @tap="form.mainImage = ''"
                >
                  <AppIcon
                    name="x"
                    :size="24"
                    color="#fff"
                  />
                </view>
              </view>
              <view
                v-else
                class="pe-up pe-up-main"
                :class="{ err: errFields.mainImage }"
                @tap="onUploadMain"
              >
                <AppIcon
                  name="image"
                  :size="52"
                  color="#C9A96E"
                />
                <text class="pe-up-t">
                  {{ uploading.main ? '上传中…' : '点击上传' }}
                </text>
                <text class="pe-up-s">
                  建议 800×800
                </text>
              </view>
              <view
                v-if="errFields.mainImage"
                class="pe-errline"
              >
                <AppIcon
                  name="alert-circle"
                  :size="26"
                  color="#C41E3A"
                />
                <text class="pe-errline-t">
                  请上传商品主图
                </text>
              </view>
              <view class="pe-anno">
                <text>单图上传（1:1）。作为列表卡 / 详情首图。</text>
              </view>
            </view>
          </view>

          <!-- ② 基本信息 -->
          <view
            id="sec-2"
            class="pe-sec"
            :class="{ err: errFields.title }"
          >
            <view class="pe-sh">
              <view class="pe-sh-l">
                <text class="pe-idx">
                  2
                </text>
                <text class="pe-sh-n">
                  基本信息
                </text>
                <text class="pe-req">
                  必填
                </text>
              </view>
            </view>
            <view class="pe-sb">
              <input
                v-model="form.title"
                class="pe-inp"
                :class="{ err: errFields.title }"
                maxlength="30"
                placeholder="商品标题（30字内）"
                placeholder-class="pe-ph"
              >
              <view
                v-if="errFields.title"
                class="pe-errline"
              >
                <AppIcon
                  name="alert-circle"
                  :size="26"
                  color="#C41E3A"
                />
                <text class="pe-errline-t">
                  请填写商品标题
                </text>
              </view>
              <textarea
                v-model="form.intro"
                class="pe-textarea"
                maxlength="100"
                placeholder="卖点简介 · 纯文本（100字内，无富文本）"
                placeholder-class="pe-ph"
              />
              <!-- 类目选择 -->
              <view
                class="pe-inp pe-select"
                @tap="showCatPicker = true"
              >
                <text :class="form.categoryId ? 'pe-select-val' : 'pe-select-ph'">
                  {{ selectedCategory ? '类目：' + selectedCategory.name : '类目：请选择' }}
                </text>
                <AppIcon
                  name="chevron-down"
                  :size="28"
                  color="#9A9A9A"
                />
              </view>
              <view
                v-if="selectedCategory"
                class="pe-fee-tip"
              >
                <AppIcon
                  name="info"
                  :size="22"
                  color="#9A9A9A"
                />
                <text>该类目平台收取 {{ selectedCategory.fee }} 技术服务费</text>
              </view>
              <!-- 标签 -->
              <view class="pe-tags-row">
                <view
                  class="pe-chip add"
                  @tap="showTagInput = !showTagInput"
                >
                  <AppIcon
                    name="plus"
                    :size="20"
                    color="#C9A96E"
                  />
                  <text class="pe-chip-add-t">
                    添加标签
                  </text>
                </view>
                <view
                  v-for="tag in form.tags"
                  :key="tag"
                  class="pe-chip on"
                  @tap="removeTag(tag)"
                >
                  <text>{{ tag }}</text>
                  <text class="pe-chip-x">
                    ×
                  </text>
                </view>
              </view>
              <view
                v-if="showTagInput"
                class="pe-tag-input-row"
              >
                <input
                  v-model="newTag"
                  class="pe-inp pe-tag-input"
                  maxlength="8"
                  placeholder="输入标签（≤5个）"
                  placeholder-class="pe-ph"
                  @confirm="addTag"
                >
                <view
                  class="pe-tag-add-btn"
                  :class="{ disabled: form.tags.length >= 5 }"
                  @tap="addTag"
                >
                  <text class="pe-tag-add-t">
                    加入
                  </text>
                </view>
              </view>
              <view class="pe-anno">
                <text>类目=平台类目字典单选（弹层）；标签 ≤ 5 个。</text>
              </view>
            </view>
          </view>

          <!-- ③ 轮播图 -->
          <view class="pe-sec">
            <view class="pe-sh">
              <view class="pe-sh-l">
                <text class="pe-idx">
                  3
                </text>
                <text class="pe-sh-n">
                  轮播图
                </text>
              </view>
              <text class="pe-tip">
                1:1 · 最多8张 · 可排序
              </text>
            </view>
            <view class="pe-sb">
              <view class="pe-thumb-grid">
                <view
                  v-for="(img, i) in form.carousel"
                  :key="img + i"
                  class="pe-thumb"
                >
                  <image
                    :src="img"
                    class="pe-thumb-img"
                    mode="aspectFill"
                  />
                  <text
                    v-if="i === 0"
                    class="pe-badge"
                  >
                    主图
                  </text>
                  <view
                    class="pe-thumb-del"
                    @tap="removeCarousel(i)"
                  >
                    <AppIcon
                      name="x"
                      :size="20"
                      color="#fff"
                    />
                  </view>
                  <view class="pe-thumb-sort">
                    <view
                      class="pe-thumb-mv"
                      :class="{ dis: i === 0 }"
                      @tap="moveCarousel(i, -1)"
                    >
                      <AppIcon
                        name="chevron-up"
                        :size="20"
                        color="#fff"
                      />
                    </view>
                    <view
                      class="pe-thumb-mv"
                      :class="{ dis: i === form.carousel.length - 1 }"
                      @tap="moveCarousel(i, 1)"
                    >
                      <AppIcon
                        name="chevron-down"
                        :size="20"
                        color="#fff"
                      />
                    </view>
                  </view>
                </view>
                <view
                  v-if="form.carousel.length < 8"
                  class="pe-addbox"
                  @tap="onUploadCarousel"
                >
                  <AppIcon
                    name="plus"
                    :size="30"
                    color="#C9A96E"
                  />
                  <text class="pe-addbox-s">
                    {{ uploading.carousel ? '上传中' : '上传' }}
                  </text>
                </view>
              </view>
              <view class="pe-anno">
                <text>第1张永远标「主图」角标；用 ↑↓ 调整顺序，移到第1位即成主图。</text>
              </view>
            </view>
          </view>

          <!-- ④ 商品详情图 -->
          <view class="pe-sec">
            <view class="pe-sh">
              <view class="pe-sh-l">
                <text class="pe-idx">
                  4
                </text>
                <text class="pe-sh-n">
                  商品详情图
                </text>
              </view>
              <text class="pe-tip">
                宽750 · 不限高 · 可排序
              </text>
            </view>
            <view class="pe-sb">
              <view
                v-for="(img, i) in form.detailImages"
                :key="img + i"
                class="pe-drow"
              >
                <image
                  :src="img"
                  class="pe-dimg"
                  mode="widthFix"
                />
                <view class="pe-drow-ops">
                  <view
                    class="pe-drow-mv"
                    :class="{ dis: i === 0 }"
                    @tap="moveDetail(i, -1)"
                  >
                    <AppIcon
                      name="chevron-up"
                      :size="26"
                      color="#6E6E73"
                    />
                  </view>
                  <view
                    class="pe-drow-mv"
                    :class="{ dis: i === form.detailImages.length - 1 }"
                    @tap="moveDetail(i, 1)"
                  >
                    <AppIcon
                      name="chevron-down"
                      :size="26"
                      color="#6E6E73"
                    />
                  </view>
                  <view
                    class="pe-drow-mv del"
                    @tap="removeDetail(i)"
                  >
                    <AppIcon
                      name="trash-2"
                      :size="24"
                      color="#C41E3A"
                    />
                  </view>
                </view>
              </view>
              <view
                class="pe-up pe-up-detail"
                :class="{ dis: uploading.detail }"
                @tap="onUploadDetail"
              >
                <text class="pe-up-detail-t">
                  ＋ 继续添加详情图
                </text>
                <text class="pe-up-s">
                  {{ uploading.detail ? '上传中…' : '宽750 · 不限高 · 可连续多选' }}
                </text>
              </view>
              <view class="pe-anno">
                <text>可连续加多张（支持一次多选）。预览端纵向无缝拼成详情长图。无富文本编辑器。</text>
              </view>
            </view>
          </view>

          <!-- ⑤ 价格与规格 -->
          <view
            id="sec-5"
            class="pe-sec"
            :class="{ err: errFields.price }"
          >
            <view class="pe-sh">
              <view class="pe-sh-l">
                <text class="pe-idx">
                  5
                </text>
                <text class="pe-sh-n">
                  价格与规格
                </text>
              </view>
              <text
                v-if="form.multiSku"
                class="pe-tip"
              >
                多规格=开
              </text>
            </view>
            <view class="pe-sb">
              <!-- 划线价（商品级·仅展示不结算） -->
              <view class="pe-inp pe-price-inp">
                <text class="pe-price-lb">
                  划线价（原价）
                </text>
                <text class="pe-price-cny">
                  ¥
                </text>
                <input
                  v-model="form.originalPrice"
                  class="pe-price-field"
                  type="digit"
                  placeholder="选填"
                  placeholder-class="pe-ph"
                >
                <text class="pe-price-hint">
                  仅展示不结算
                </text>
              </view>

              <!-- 多规格开关 -->
              <view class="pe-swline">
                <text class="pe-sw-lb">
                  是否多规格（SKU）
                </text>
                <switch
                  class="pe-switch"
                  :checked="form.multiSku"
                  color="#C41E3A"
                  @change="onToggleSku"
                />
              </view>
              <view class="pe-divln" />

              <!-- 无SKU：商品级售价 -->
              <template v-if="!form.multiSku">
                <view
                  class="pe-inp pe-price-inp key"
                  :class="{ err: errFields.price }"
                >
                  <text class="pe-price-lb strong">
                    售价
                  </text>
                  <text class="pe-price-cny red">
                    ¥
                  </text>
                  <input
                    v-model="form.price"
                    class="pe-price-field strong"
                    type="digit"
                    placeholder="0.00"
                    placeholder-class="pe-ph"
                  >
                  <text class="pe-price-hint">
                    按此结算
                  </text>
                </view>
                <view
                  v-if="errFields.price"
                  class="pe-errline"
                >
                  <AppIcon
                    name="alert-circle"
                    :size="26"
                    color="#C41E3A"
                  />
                  <text class="pe-errline-t">
                    售价须大于 0
                  </text>
                </view>
              </template>

              <!-- 有SKU：规格定义 + 矩阵 + 区间 -->
              <template v-else>
                <text class="pe-sku-h">
                  规格定义
                </text>
                <view
                  v-for="(spec, si) in form.specGroups"
                  :key="si"
                  class="pe-spec-def"
                >
                  <view class="pe-spec-name-row">
                    <input
                      v-model="spec.name"
                      class="pe-inp pe-spec-name"
                      placeholder="规格名（如 材质）"
                      placeholder-class="pe-ph"
                      @blur="rebuildMatrix"
                    >
                    <view
                      class="pe-spec-del"
                      @tap="removeSpecGroup(si)"
                    >
                      <AppIcon
                        name="x"
                        :size="24"
                        color="#9A9A9A"
                      />
                    </view>
                  </view>
                  <view class="pe-spec-vals">
                    <view
                      v-for="(val, vi) in spec.values"
                      :key="vi"
                      class="pe-chip on"
                      @tap="removeSpecValue(si, vi)"
                    >
                      <text>{{ val }}</text>
                      <text class="pe-chip-x">
                        ×
                      </text>
                    </view>
                    <input
                      v-model="spec.draft"
                      class="pe-spec-val-input"
                      placeholder="+值"
                      placeholder-class="pe-ph"
                      @confirm="addSpecValue(si)"
                    >
                  </view>
                </view>
                <view
                  v-if="form.specGroups.length < 3"
                  class="pe-add-spec"
                  @tap="addSpecGroup"
                >
                  <AppIcon
                    name="plus"
                    :size="24"
                    color="#C9A96E"
                  />
                  <text class="pe-add-spec-t">
                    添加规格维度
                  </text>
                </view>

                <!-- SKU 矩阵 -->
                <template v-if="skuMatrix.length">
                  <view class="pe-sku-matrix-h">
                    <text class="pe-sku-h">
                      SKU 矩阵（组合自动生成）
                    </text>
                    <text class="pe-sku-scroll-hint">
                      ← 左右滑动 →
                    </text>
                  </view>
                  <scroll-view
                    scroll-x
                    class="pe-skuwrap"
                  >
                    <view class="pe-sku-table">
                      <view class="pe-sku-tr head">
                        <view class="pe-sku-td combo">
                          规格组合
                        </view>
                        <view class="pe-sku-td">
                          售价¥*
                        </view>
                        <view class="pe-sku-td">
                          库存*
                        </view>
                        <view class="pe-sku-td">
                          SKU图
                        </view>
                      </view>
                      <view
                        v-for="(row, ri) in skuMatrix"
                        :key="row.key"
                        class="pe-sku-tr"
                      >
                        <view class="pe-sku-td combo">
                          {{ row.label }}
                        </view>
                        <view class="pe-sku-td">
                          <input
                            v-model="row.price"
                            class="pe-sku-cell"
                            :class="{ err: errFields.skuRows.includes(ri) && !(Number(row.price) > 0) }"
                            type="digit"
                            placeholder="0"
                            placeholder-class="pe-ph"
                          >
                        </view>
                        <view class="pe-sku-td">
                          <input
                            v-model="row.stock"
                            class="pe-sku-cell"
                            :class="{ err: errFields.skuRows.includes(ri) && row.stock === '' }"
                            type="number"
                            placeholder="0"
                            placeholder-class="pe-ph"
                          >
                        </view>
                        <view class="pe-sku-td">
                          <image
                            v-if="row.image"
                            :src="row.image"
                            class="pe-sku-img"
                            mode="aspectFill"
                            @tap="onUploadSkuImg(ri)"
                          />
                          <text
                            v-else
                            class="pe-sku-imgadd"
                            @tap="onUploadSkuImg(ri)"
                          >
                            ＋
                          </text>
                        </view>
                      </view>
                    </view>
                  </scroll-view>
                  <view class="pe-autobox">
                    <text class="pe-autobox-l">
                      商品级展示价（自动）· 只读
                    </text>
                    <text class="pe-autobox-b">
                      {{ priceRangeText }}
                    </text>
                  </view>
                </template>
              </template>

              <view class="pe-anno">
                <text v-if="!form.multiSku">
                  划线价=商品级1个值仅展示；无SKU→商品级售价结算。
                </text>
                <text v-else>
                  有SKU时售价由各SKU定，商品级改显区间；下单按所选SKU价结算。SKU图选填(1:1)。
                </text>
              </view>
            </view>
          </view>

          <!-- ⑥ 库存 -->
          <view
            id="sec-6"
            class="pe-sec"
            :class="{ err: errFields.stock }"
          >
            <view class="pe-sh">
              <view class="pe-sh-l">
                <text class="pe-idx">
                  6
                </text>
                <text class="pe-sh-n">
                  库存
                </text>
              </view>
              <text class="pe-tip">
                {{ form.multiSku ? '按SKU汇总' : '单一库存' }}
              </text>
            </view>
            <view class="pe-sb">
              <template v-if="!form.multiSku">
                <view
                  class="pe-inp pe-price-inp"
                  :class="{ err: errFields.stock }"
                >
                  <text class="pe-price-lb">
                    库存数量
                  </text>
                  <input
                    v-model="form.stock"
                    class="pe-price-field"
                    type="number"
                    placeholder="0"
                    placeholder-class="pe-ph"
                  >
                  <text class="pe-price-hint">
                    件
                  </text>
                </view>
                <view
                  v-if="errFields.stock"
                  class="pe-errline"
                >
                  <AppIcon
                    name="alert-circle"
                    :size="26"
                    color="#C41E3A"
                  />
                  <text class="pe-errline-t">
                    请填写库存数量
                  </text>
                </view>
              </template>
              <view
                v-else
                class="pe-autobox"
              >
                <text class="pe-autobox-l">
                  总库存（自动汇总）· 在矩阵内逐行填写
                </text>
                <text class="pe-autobox-b">
                  {{ totalStock }} 件
                </text>
              </view>
              <view class="pe-anno">
                <text>低于预警阈值时列表标「库存预警」。</text>
              </view>
            </view>
          </view>

          <!-- ⑦ 上架控制 -->
          <view class="pe-sec">
            <view class="pe-sh">
              <view class="pe-sh-l">
                <text class="pe-idx">
                  7
                </text>
                <text class="pe-sh-n">
                  上架控制
                </text>
              </view>
            </view>
            <view class="pe-sb">
              <view class="pe-anno noborder">
                <text>「存草稿」保存不提交审核；「保存并上架」→ 商品进「审核中」，平台审核通过后在售。</text>
              </view>
            </view>
          </view>
        </view>
        <view style="height: 160rpx" />
      </scroll-view>

      <!-- 预览悬浮按钮 -->
      <view
        class="pe-fab"
        @tap="openPreview"
      >
        <AppIcon
          name="eye"
          :size="30"
          color="#fff"
        />
        <text class="pe-fab-t">
          预览
        </text>
      </view>

      <!-- 底部操作栏 -->
      <view class="pe-foot">
        <view
          class="pe-btn ghost"
          @tap="onSaveDraft"
        >
          <text>{{ savingDraft ? '保存中…' : '存草稿' }}</text>
        </view>
        <view
          class="pe-btn pri"
          :class="{ loading: submitting }"
          @tap="onSubmit"
        >
          <view
            v-if="submitting"
            class="pe-spin"
          />
          <text>{{ submitting ? '提交中…' : '保存并上架' }}</text>
        </view>
      </view>

      <!-- 类目选择浮层 -->
      <view
        v-if="showCatPicker"
        class="pe-mask"
        @tap="showCatPicker = false"
      >
        <view
          class="pe-sheet"
          @tap.stop
        >
          <text class="pe-sheet-title">
            选择商品类目
          </text>
          <scroll-view
            scroll-y
            class="pe-sheet-list"
          >
            <view
              v-for="cat in categories"
              :key="cat.id"
              class="pe-sheet-item"
              :class="{ active: form.categoryId === cat.id }"
              @tap="pickCategory(cat.id)"
            >
              <text>{{ cat.name }}</text>
              <text class="pe-sheet-fee">
                服务费 {{ cat.fee }}
              </text>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- ═══ 态D 实时预览覆盖层 ═══ -->
      <view
        v-if="showPreview"
        class="pe-preview"
      >
        <view
          class="pe-pv-nav"
          :style="{ paddingTop: statusBarHeight + 'px' }"
        >
          <text class="pe-pv-ttl">
            预览 · 商品详情
          </text>
          <view
            class="pe-pv-close"
            @tap="showPreview = false"
          >
            <text class="pe-pv-close-t">
              × 收起
            </text>
          </view>
        </view>
        <scroll-view
          scroll-y
          class="pe-pv-scroll"
        >
          <!-- 轮播首图 -->
          <view class="pe-pv-hero">
            <image
              v-if="previewCover"
              :src="previewCover"
              class="pe-pv-hero-img"
              mode="aspectFill"
            />
            <view
              v-else
              class="pe-pv-hero-ph"
            >
              <text>暂无主图</text>
            </view>
            <text
              v-if="previewCover"
              class="pe-badge pe-pv-badge"
            >
              主图
            </text>
            <view
              v-if="form.carousel.length > 1"
              class="pe-pv-dots"
            >
              <view
                v-for="(c, i) in form.carousel"
                :key="i"
                class="pe-pv-dot"
                :class="{ on: i === 0 }"
              />
            </view>
          </view>
          <!-- 价格标题 -->
          <view class="pe-pv-info">
            <view class="pe-pv-price-row">
              <text class="pe-pv-price">
                {{ previewPriceText }}
              </text>
              <text
                v-if="Number(form.originalPrice) > 0"
                class="pe-pv-origin"
              >
                ¥{{ form.originalPrice }}
              </text>
            </view>
            <text class="pe-pv-title">
              {{ form.title || '商品标题实时同步显示在这里' }}
            </text>
            <text
              v-if="form.intro"
              class="pe-pv-intro"
            >
              {{ form.intro }}
            </text>
          </view>
          <!-- 规格 -->
          <view
            v-if="form.multiSku && specSummary"
            class="pe-pv-spec"
          >
            <text>规格选择：{{ specSummary }}</text>
          </view>
          <!-- 详情长图 -->
          <view class="pe-pv-detail">
            <text class="pe-pv-detail-hd">
              — 商品详情 —
            </text>
            <view
              v-if="form.detailImages.length"
              class="pe-pv-detail-imgs"
            >
              <image
                v-for="(img, i) in form.detailImages"
                :key="i"
                :src="img"
                class="pe-pv-detail-img"
                mode="widthFix"
              />
            </view>
            <text
              v-else
              class="pe-pv-detail-empty"
            >
              暂无详情图
            </text>
          </view>
          <view style="height: 60rpx" />
        </scroll-view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { chooseAndUploadImage } from '@/utils/request'
import { merchantBackendApi, productCategories, type MerchantProductSku } from '@/lib/merchant-data'

const statusBarHeight = ref(0)
uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0 } })
// 导航条总高度（状态栏 + 88rpx 内容≈44px）
const navHeight = computed(() => statusBarHeight.value + 44)

const categories = productCategories
const productId = ref('')
const isEdit = computed(() => !!productId.value)
const loading = ref(false)
const error = ref('')
const submitting = ref(false)
const savingDraft = ref(false)
const uploading = reactive({ main: false, carousel: false, detail: false })

const showCatPicker = ref(false)
const showTagInput = ref(false)
const showPreview = ref(false)
const newTag = ref('')
const scrollTarget = ref('')

// ───────── 表单 ─────────
interface SpecGroup { name: string; values: string[]; draft: string }
interface SkuRow { key: string; label: string; combo: Record<string, string>; price: string; stock: string; image: string; id?: string }

const form = reactive({
  mainImage: '',
  title: '',
  intro: '',
  categoryId: '',
  tags: [] as string[],
  carousel: [] as string[],
  detailImages: [] as string[],
  originalPrice: '',
  price: '',
  stock: '',
  multiSku: false,
  specGroups: [] as SpecGroup[],
})
// SKU 矩阵行（由 specGroups 笛卡尔积生成，保留已填值）
const skuMatrix = ref<SkuRow[]>([])
// 记录后端已存在的 SKU（编辑态·用于 diff 增删）
const originalSkus = ref<MerchantProductSku[]>([])

// 校验错误标记
const errFields = reactive({ mainImage: false, title: false, price: false, stock: false, skuRows: [] as number[] })

const selectedCategory = computed(() => categories.find((c) => c.id === form.categoryId))

// ───────── 加载编辑数据 ─────────
async function loadProduct() {
  if (!productId.value) return
  loading.value = true
  error.value = ''
  try {
    const p = await merchantBackendApi.getProduct(productId.value)
    const imgs = [...(p.images || [])]
    form.mainImage = imgs[0] || ''
    form.carousel = imgs.length ? imgs.slice() : []
    // 详情图从 detail（存换行分隔 URL）还原
    form.detailImages = parseDetailImages(p.detail)
    form.title = p.title || ''
    form.intro = p.intro || ''
    form.categoryId = p.categoryId || ''
    form.tags = [...(p.tags || [])]
    form.originalPrice = p.originalPrice != null ? String(p.originalPrice) : ''
    form.price = p.price != null ? String(p.price) : ''
    form.stock = p.stock != null ? String(p.stock) : ''
    // SKU 回填
    const skus = p.skus || []
    originalSkus.value = skus
    if (skus.length) {
      form.multiSku = true
      restoreSpecFromSkus(skus)
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

// detail 字段：本编辑器用换行分隔的详情图 URL 存储（无富文本）
function parseDetailImages(detail?: string): string[] {
  if (!detail) return []
  return detail.split('\n').map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s))
}
function buildDetail(): string {
  // 至少一个字符（后端 detail MinLength=1）；无图时用占位
  return form.detailImages.length ? form.detailImages.join('\n') : (form.intro || form.title || '　')
}

// 从已有 SKU 反推规格维度并生成矩阵
function restoreSpecFromSkus(skus: MerchantProductSku[]) {
  const groupMap: Record<string, string[]> = {}
  const order: string[] = []
  for (const sku of skus) {
    const specs = sku.specs || {}
    for (const k of Object.keys(specs)) {
      if (!groupMap[k]) { groupMap[k] = []; order.push(k) }
      if (!groupMap[k].includes(specs[k])) groupMap[k].push(specs[k])
    }
  }
  form.specGroups = order.map((name) => ({ name, values: groupMap[name].slice(), draft: '' }))
  rebuildMatrix()
  // 把已存 SKU 的价格/库存/id 填回矩阵
  for (const row of skuMatrix.value) {
    const match = skus.find((s) => sameCombo(s.specs || {}, row.combo))
    if (match) {
      row.price = String(match.price ?? '')
      row.stock = String(match.stock ?? '')
      row.id = match.id
    }
  }
}
function sameCombo(a: Record<string, string>, b: Record<string, string>): boolean {
  const ak = Object.keys(a), bk = Object.keys(b)
  if (ak.length !== bk.length) return false
  return ak.every((k) => a[k] === b[k])
}

onLoad((opts) => {
  if (opts?.id) {
    productId.value = String(opts.id)
    loadProduct()
  }
})

// ───────── 图片上传 ─────────
async function doUpload(): Promise<string> {
  return await chooseAndUploadImage()
}
async function onUploadMain() {
  if (uploading.main) return
  uploading.main = true
  try {
    const url = await doUpload()
    if (url) { form.mainImage = url; errFields.mainImage = false; syncMainToCarousel(url) }
  } catch (e) { toastErr(e) } finally { uploading.main = false }
}
// 主图上传后若轮播为空则同步一张，保持"主图=轮播第1张"口径
function syncMainToCarousel(url: string) {
  if (!form.carousel.length) form.carousel = [url]
  else form.carousel[0] = url
}
async function onUploadCarousel() {
  if (uploading.carousel) return
  if (form.carousel.length >= 8) { uni.showToast({ title: '最多8张轮播图', icon: 'none' }); return }
  uploading.carousel = true
  try {
    const url = await doUpload()
    if (url) {
      form.carousel.push(url)
      if (!form.mainImage) form.mainImage = form.carousel[0]
    }
  } catch (e) { toastErr(e) } finally { uploading.carousel = false }
}
function removeCarousel(i: number) {
  form.carousel.splice(i, 1)
  form.mainImage = form.carousel[0] || ''
}
function moveCarousel(i: number, dir: number) {
  const j = i + dir
  if (j < 0 || j >= form.carousel.length) return
  const arr = form.carousel
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
  form.mainImage = arr[0] || ''
}
async function onUploadDetail() {
  if (uploading.detail) return
  uploading.detail = true
  try {
    const url = await doUpload()
    if (url) form.detailImages.push(url)
  } catch (e) { toastErr(e) } finally { uploading.detail = false }
}
function removeDetail(i: number) { form.detailImages.splice(i, 1) }
function moveDetail(i: number, dir: number) {
  const j = i + dir
  if (j < 0 || j >= form.detailImages.length) return
  const arr = form.detailImages
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}
async function onUploadSkuImg(ri: number) {
  try {
    const url = await doUpload()
    if (url && skuMatrix.value[ri]) skuMatrix.value[ri].image = url
  } catch (e) { toastErr(e) }
}
function toastErr(e: unknown) {
  const msg = (e as Error)?.message
  if (msg && msg !== '已取消' && msg !== '未选择图片') uni.showToast({ title: msg, icon: 'none' })
}

// ───────── 类目 / 标签 ─────────
function pickCategory(id: string) { form.categoryId = id; showCatPicker.value = false }
function addTag() {
  const t = newTag.value.trim()
  if (t && !form.tags.includes(t) && form.tags.length < 5) { form.tags.push(t); newTag.value = '' }
  else if (form.tags.length >= 5) uni.showToast({ title: '最多5个标签', icon: 'none' })
}
function removeTag(tag: string) { form.tags = form.tags.filter((t) => t !== tag) }

// ───────── SKU 规格 ─────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- uni-app switch @change 事件类型与内置 SVGAttributes 冲突，全仓库统一用 any 规避
function onToggleSku(e: any) {
  form.multiSku = e.detail.value
  if (form.multiSku && !form.specGroups.length) {
    form.specGroups = [{ name: '', values: [], draft: '' }]
  }
  rebuildMatrix()
}
function addSpecGroup() {
  if (form.specGroups.length >= 3) return
  form.specGroups.push({ name: '', values: [], draft: '' })
}
function removeSpecGroup(si: number) { form.specGroups.splice(si, 1); rebuildMatrix() }
function addSpecValue(si: number) {
  const g = form.specGroups[si]
  const v = (g.draft || '').trim()
  if (v && !g.values.includes(v)) { g.values.push(v); g.draft = '' }
  rebuildMatrix()
}
function removeSpecValue(si: number, vi: number) { form.specGroups[si].values.splice(vi, 1); rebuildMatrix() }

// 笛卡尔积生成矩阵行（保留已填 price/stock/image）
function rebuildMatrix() {
  const groups = form.specGroups.filter((g) => g.name.trim() && g.values.length)
  if (!groups.length) { skuMatrix.value = []; return }
  let combos: Record<string, string>[] = [{}]
  for (const g of groups) {
    const next: Record<string, string>[] = []
    for (const c of combos) {
      for (const v of g.values) next.push({ ...c, [g.name.trim()]: v })
    }
    combos = next
  }
  const prev = skuMatrix.value
  skuMatrix.value = combos.map((combo) => {
    const key = Object.values(combo).join('·')
    const old = prev.find((r) => r.key === key)
    return old || { key, label: key, combo, price: '', stock: '', image: '' }
  })
}

// ───────── 派生：价格区间 / 总库存 / 预览 ─────────
const priceRangeText = computed(() => {
  const nums = skuMatrix.value.map((r) => Number(r.price)).filter((n) => n > 0)
  if (!nums.length) return '待填写'
  const min = Math.min(...nums), max = Math.max(...nums)
  return min === max ? `¥${min}` : `¥${min} ~ ¥${max}`
})
const totalStock = computed(() =>
  skuMatrix.value.reduce((sum, r) => sum + (Number(r.stock) || 0), 0),
)
const previewCover = computed(() => form.mainImage || form.carousel[0] || '')
const previewPriceText = computed(() => {
  if (form.multiSku) return priceRangeText.value === '待填写' ? '¥--' : priceRangeText.value.replace(/ /g, '')
  return form.price ? `¥${form.price}` : '¥--'
})
const specSummary = computed(() =>
  form.specGroups.filter((g) => g.name && g.values.length).map((g) => `${g.name}：${g.values.join(' / ')}`).join('；'),
)

function openPreview() { showPreview.value = true }

// ───────── 校验 ─────────
function validate(): boolean {
  errFields.mainImage = false
  errFields.title = false
  errFields.price = false
  errFields.stock = false
  errFields.skuRows = []
  let firstErr = ''

  if (!form.mainImage && !form.carousel.length) { errFields.mainImage = true; firstErr = firstErr || 'sec-1' }
  if (!form.title.trim()) { errFields.title = true; firstErr = firstErr || 'sec-2' }

  if (form.multiSku) {
    if (!skuMatrix.value.length) {
      uni.showToast({ title: '请先定义规格并生成SKU', icon: 'none' })
      return false
    }
    skuMatrix.value.forEach((r, i) => {
      if (!(Number(r.price) > 0) || r.stock === '') errFields.skuRows.push(i)
    })
    if (errFields.skuRows.length) firstErr = firstErr || 'sec-5'
  } else {
    if (!form.price || Number(form.price) <= 0) { errFields.price = true; firstErr = firstErr || 'sec-5' }
    if (form.stock === '' || Number(form.stock) < 0) { errFields.stock = true; firstErr = firstErr || 'sec-6' }
  }
  if (!form.categoryId) { uni.showToast({ title: '请选择商品类目', icon: 'none' }); return false }

  if (firstErr) {
    scrollTarget.value = ''
    setTimeout(() => { scrollTarget.value = firstErr }, 30)
    uni.showToast({ title: '请完善标红项', icon: 'none' })
    return false
  }
  return true
}

// ───────── 组装 payload ─────────
function buildPayload() {
  // images：主图置首 + 其余轮播（去重）
  const cover = form.mainImage || form.carousel[0] || ''
  const rest = form.carousel.filter((u) => u !== cover)
  const images = cover ? [cover, ...rest] : form.carousel.slice()
  const price = form.multiSku
    ? (skuMatrix.value.map((r) => Number(r.price)).filter((n) => n > 0).sort((a, b) => a - b)[0] || 0)
    : Number(form.price)
  const stock = form.multiSku ? totalStock.value : Number(form.stock)
  return {
    title: form.title.trim(),
    intro: form.intro.trim(),
    detail: buildDetail(),
    images,
    price,
    originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
    stock,
    categoryId: form.categoryId,
    tags: form.tags,
  }
}

// 保存商品主体后，同步 SKU（先删旧再加新·店铺身份）
async function syncSkus(pid: string) {
  if (!form.multiSku) {
    // 关闭多规格：删除所有历史 SKU
    for (const s of originalSkus.value) {
      try { await merchantBackendApi.deleteSku(s.id) } catch { /* 忽略单条失败 */ }
    }
    originalSkus.value = []
    return
  }
  // 简化 diff：清掉历史全部，再按当前矩阵新增（矩阵行数有限·可接受）
  for (const s of originalSkus.value) {
    try { await merchantBackendApi.deleteSku(s.id) } catch { /* ignore */ }
  }
  const created: MerchantProductSku[] = []
  for (const row of skuMatrix.value) {
    const sku = await merchantBackendApi.addSku(pid, {
      specs: row.combo,
      price: Number(row.price),
      stock: Number(row.stock) || 0,
    })
    created.push(sku)
  }
  originalSkus.value = created
}

// ───────── 提交（保存并上架 / 存草稿） ─────────
async function persist(): Promise<string> {
  const payload = buildPayload()
  if (isEdit.value) {
    await merchantBackendApi.updateProduct(productId.value, payload)
    return productId.value
  } else {
    const created = await merchantBackendApi.createProduct(payload)
    productId.value = created.id
    return created.id
  }
}

async function onSubmit() {
  if (submitting.value) return
  if (!validate()) return
  submitting.value = true
  try {
    const pid = await persist()
    await syncSkus(pid)
    uni.showToast({ title: isEdit.value ? '已保存' : '已提交审核', icon: 'success' })
    setTimeout(() => goBack(), 700)
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function onSaveDraft() {
  if (savingDraft.value || submitting.value) return
  // 草稿放宽校验：仅要求标题
  if (!form.title.trim()) { uni.showToast({ title: '请至少填写商品标题', icon: 'none' }); errFields.title = true; return }
  savingDraft.value = true
  try {
    const pid = await persist()
    await syncSkus(pid)
    uni.showToast({ title: '草稿已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    savingDraft.value = false
  }
}
</script>

<style lang="scss" scoped>
$paper: #FAF8F5;
$card: #FFFFFF;
$red: #C41E3A;
$gold: #C9A96E;
$ink: #2C2C2C;
$ink2: #6E6E73;
$ink3: #9A9A9A;
$line: #ECE7E0;
$wash: #F5F1EB;

.pe-page { min-height: 100vh; background: $paper; }

/* 顶栏 */
.pe-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50;
  background: rgba(250, 248, 245, 0.96); border-bottom: 1px solid $line; }
.pe-nav-inner { height: 88rpx; display: flex; align-items: center; padding: 0 30rpx; }
.pe-nav-ic { width: 68rpx; height: 68rpx; border-radius: 50%; background: $card; border: 1px solid $line;
  display: flex; align-items: center; justify-content: center; }
.pe-nav-ttl { flex: 1; text-align: center; font-size: 34rpx; font-weight: 700; color: $ink;
  font-family: "Songti SC", "STSong", serif; margin: 0 12rpx; }
.pe-nav-draft { border: 1px solid rgba(196, 30, 58, 0.3); border-radius: 999px; padding: 10rpx 22rpx;
  background: rgba(196, 30, 58, 0.05); }
.pe-nav-draft-txt { font-size: 24rpx; color: $red; font-weight: 600; }

.pe-scroll { height: 100vh; box-sizing: border-box; }
.pe-body { padding: 24rpx 40rpx; }

/* 区块卡 */
.pe-sec { background: $card; border-radius: 18px; margin-bottom: 28rpx; overflow: hidden;
  border: 1px solid $line; box-shadow: 0 2rpx 12rpx rgba(80, 60, 40, 0.05); }
.pe-sec.err { border-color: $red; }
.pe-sh { display: flex; align-items: center; justify-content: space-between; padding: 26rpx 30rpx 18rpx; }
.pe-sh-l { display: flex; align-items: center; }
.pe-idx { width: 42rpx; height: 42rpx; border-radius: 12rpx; background: $red; color: #fff;
  font-size: 24rpx; font-weight: 700; text-align: center; line-height: 42rpx;
  font-family: "Songti SC", serif; margin-right: 16rpx; }
.pe-sh-n { font-size: 30rpx; font-weight: 700; color: $ink; font-family: "Songti SC", serif; }
.pe-req { font-size: 20rpx; color: $red; border: 1px solid rgba(196, 30, 58, 0.3);
  border-radius: 8rpx; padding: 2rpx 12rpx; margin-left: 12rpx; }
.pe-tip { font-size: 20rpx; color: $ink3; }
.pe-tip.tip-err { color: $red; }
.pe-sb { padding: 8rpx 30rpx 30rpx; }

/* 上传占位 */
.pe-up { border: 1.5px dashed #D8CFC2; background: $wash; border-radius: 14px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; }
.pe-up.err { border-color: $red; background: rgba(196, 30, 58, 0.04); }
.pe-up-main { width: 240rpx; height: 240rpx; }
.pe-up-t { font-size: 24rpx; color: $ink2; margin-top: 10rpx; }
.pe-up-s { font-size: 18rpx; color: $ink3; margin-top: 4rpx; }
.pe-up-detail { height: 108rpx; margin-top: 8rpx; }
.pe-up-detail.dis { opacity: 0.5; }
.pe-up-detail-t { font-size: 26rpx; color: $ink2; }

/* 主图 */
.pe-main-wrap { width: 240rpx; height: 240rpx; border-radius: 14px; overflow: hidden; position: relative;
  border: 1px solid $line; }
.pe-main-img { width: 100%; height: 100%; }
.pe-main-del { position: absolute; top: 8rpx; right: 8rpx; width: 44rpx; height: 44rpx; border-radius: 50%;
  background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; }

/* 报错行 */
.pe-errline { display: flex; align-items: center; gap: 8rpx; margin-top: 14rpx; }
.pe-errline-t { font-size: 22rpx; color: $red; }

/* 注释条 */
.pe-anno { font-size: 20rpx; color: $red; background: rgba(196, 30, 58, 0.05);
  border: 1px solid rgba(196, 30, 58, 0.18); border-radius: 12rpx; padding: 14rpx 18rpx;
  margin-top: 18rpx; line-height: 1.55; }
.pe-anno.noborder { color: $ink2; background: $wash; border-color: $line; }

/* 输入 */
.pe-inp { width: 100%; box-sizing: border-box; height: 84rpx; background: $wash; border: 1px solid $line;
  border-radius: 12px; padding: 0 26rpx; font-size: 26rpx; color: $ink; margin-bottom: 18rpx;
  display: flex; align-items: center; }
.pe-inp.err { border: 1.5px solid $red; background: rgba(196, 30, 58, 0.04); }
.pe-ph { color: $ink3; }
.pe-textarea { width: 100%; box-sizing: border-box; height: 140rpx; background: $wash; border: 1px solid $line;
  border-radius: 12px; padding: 18rpx 26rpx; font-size: 26rpx; color: $ink; margin-bottom: 18rpx; }

/* 类目选择 */
.pe-select { justify-content: space-between; }
.pe-select-val { font-size: 26rpx; color: $ink; }
.pe-select-ph { font-size: 26rpx; color: $ink3; }
.pe-fee-tip { display: flex; align-items: center; gap: 8rpx; font-size: 20rpx; color: $ink3;
  margin: -6rpx 0 18rpx; }

/* 标签 */
.pe-tags-row { display: flex; flex-wrap: wrap; align-items: center; margin-top: 4rpx; }
.pe-chip { display: inline-flex; align-items: center; gap: 6rpx; border: 1px solid $line; border-radius: 999px;
  padding: 8rpx 20rpx; font-size: 22rpx; color: $ink2; margin: 0 12rpx 12rpx 0; background: $card; }
.pe-chip.add { border-style: dashed; color: $gold; border-color: $gold; }
.pe-chip.on { background: rgba(196, 30, 58, 0.06); border-color: rgba(196, 30, 58, 0.25); color: $red; }
.pe-chip-add-t { font-size: 22rpx; color: $gold; }
.pe-chip-x { color: $red; font-size: 24rpx; }
.pe-tag-input-row { display: flex; gap: 14rpx; margin-top: 8rpx; }
.pe-tag-input { flex: 1; margin-bottom: 0; }
.pe-tag-add-btn { width: 120rpx; height: 84rpx; background: $red; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; }
.pe-tag-add-btn.disabled { opacity: 0.4; }
.pe-tag-add-t { font-size: 26rpx; color: #fff; }

/* 缩略图（轮播） */
.pe-thumb-grid { display: flex; flex-wrap: wrap; gap: 22rpx 24rpx; }
.pe-thumb { width: 150rpx; height: 150rpx; border-radius: 12px; position: relative; overflow: hidden;
  border: 1px solid $line; background: $wash; }
.pe-thumb-img { width: 100%; height: 100%; }
.pe-badge { position: absolute; top: 8rpx; left: 8rpx; background: $red; color: #fff; font-size: 18rpx;
  font-weight: 600; padding: 3rpx 12rpx; border-radius: 8rpx; z-index: 2; }
.pe-thumb-del { position: absolute; top: 6rpx; right: 6rpx; width: 40rpx; height: 40rpx; border-radius: 50%;
  background: rgba(0, 0, 0, 0.55); display: flex; align-items: center; justify-content: center; z-index: 3; }
.pe-thumb-sort { position: absolute; bottom: 6rpx; right: 6rpx; display: flex; gap: 6rpx; z-index: 3; }
.pe-thumb-mv { width: 40rpx; height: 40rpx; border-radius: 8rpx; background: rgba(0, 0, 0, 0.5);
  display: flex; align-items: center; justify-content: center; }
.pe-thumb-mv.dis { opacity: 0.3; }
.pe-addbox { width: 150rpx; height: 150rpx; border: 1.5px dashed #D8CFC2; border-radius: 12px;
  background: $wash; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.pe-addbox-s { font-size: 18rpx; color: $ink3; margin-top: 4rpx; }

/* 详情图行 */
.pe-drow { display: flex; gap: 18rpx; align-items: flex-start; margin-bottom: 16rpx; }
.pe-dimg { flex: 1; border-radius: 12px; border: 1px solid $line; background: $wash; }
.pe-drow-ops { display: flex; flex-direction: column; gap: 10rpx; padding-top: 4rpx; }
.pe-drow-mv { width: 56rpx; height: 56rpx; border-radius: 10rpx; background: $wash; border: 1px solid $line;
  display: flex; align-items: center; justify-content: center; }
.pe-drow-mv.dis { opacity: 0.35; }
.pe-drow-mv.del { border-color: rgba(196, 30, 58, 0.3); background: rgba(196, 30, 58, 0.05); }

/* 价格与库存输入 */
.pe-price-inp { justify-content: flex-start; gap: 10rpx; }
.pe-price-inp.key { border: 1.5px solid $gold; background: #FFFDF8; }
.pe-price-inp.err { border: 1.5px solid $red; background: rgba(196, 30, 58, 0.04); }
.pe-price-lb { font-size: 26rpx; color: $ink2; flex: none; }
.pe-price-lb.strong { color: $ink; font-weight: 700; }
.pe-price-cny { font-size: 26rpx; color: $ink3; flex: none; }
.pe-price-cny.red { color: $red; font-weight: 700; }
.pe-price-field { flex: 1; height: 84rpx; font-size: 28rpx; color: $ink; }
.pe-price-field.strong { color: $red; font-weight: 700; }
.pe-price-hint { font-size: 20rpx; color: $ink3; flex: none; }

/* 开关 */
.pe-swline { display: flex; justify-content: space-between; align-items: center; padding: 12rpx 0; }
.pe-sw-lb { font-size: 26rpx; color: $ink; }
.pe-switch { transform: scale(0.85); }
.pe-divln { border-top: 1px dashed $line; margin: 6rpx 0 20rpx; }

/* SKU 规格定义 */
.pe-sku-h { font-size: 24rpx; font-weight: 700; color: $ink; display: block; margin-bottom: 16rpx; }
.pe-spec-def { background: $wash; border: 1px solid $line; border-radius: 12px; padding: 18rpx;
  margin-bottom: 16rpx; }
.pe-spec-name-row { display: flex; align-items: center; gap: 12rpx; }
.pe-spec-name { flex: 1; margin-bottom: 0; background: $card; }
.pe-spec-del { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.pe-spec-vals { display: flex; flex-wrap: wrap; align-items: center; margin-top: 14rpx; }
.pe-spec-val-input { width: 120rpx; height: 60rpx; background: $card; border: 1px dashed $gold;
  border-radius: 999px; padding: 0 18rpx; font-size: 22rpx; color: $ink; margin-bottom: 12rpx; }
.pe-add-spec { display: flex; align-items: center; justify-content: center; gap: 8rpx; height: 76rpx;
  border: 1.5px dashed $gold; border-radius: 12px; margin-bottom: 8rpx; }
.pe-add-spec-t { font-size: 24rpx; color: $gold; }

/* SKU 矩阵 */
.pe-sku-matrix-h { display: flex; justify-content: space-between; align-items: center;
  margin: 20rpx 0 14rpx; }
.pe-sku-scroll-hint { font-size: 18rpx; color: $ink3; }
.pe-skuwrap { width: 100%; border: 1px solid $line; border-radius: 12px; white-space: nowrap; }
.pe-sku-table { display: inline-block; min-width: 100%; }
.pe-sku-tr { display: flex; }
.pe-sku-tr.head { background: $wash; }
.pe-sku-td { width: 150rpx; flex: none; padding: 14rpx 10rpx; font-size: 22rpx; color: $ink2;
  text-align: center; border-bottom: 1px solid $line; border-right: 1px solid $line;
  display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.pe-sku-tr.head .pe-sku-td { font-weight: 700; color: $ink; font-size: 20rpx; }
.pe-sku-td.combo { width: 190rpx; font-weight: 600; color: $ink; }
.pe-sku-tr:last-child .pe-sku-td { border-bottom: 0; }
.pe-sku-td:last-child { border-right: 0; }
.pe-sku-cell { width: 120rpx; height: 56rpx; background: $card; border: 1px solid $gold; border-radius: 8rpx;
  text-align: center; font-size: 24rpx; color: $ink; font-weight: 600; }
.pe-sku-cell.err { border-color: $red; background: rgba(196, 30, 58, 0.05); }
.pe-sku-img { width: 64rpx; height: 64rpx; border-radius: 8rpx; }
.pe-sku-imgadd { font-size: 34rpx; color: $gold; }

/* 自动区间 / 汇总盒 */
.pe-autobox { border: 1px solid $gold; border-radius: 12px; padding: 20rpx 24rpx;
  background: #FDF9F0; display: flex; justify-content: space-between; align-items: center; margin-top: 18rpx; }
.pe-autobox-l { font-size: 22rpx; color: $ink2; }
.pe-autobox-b { font-family: "Songti SC", serif; color: $red; font-size: 30rpx; font-weight: 700; }

/* 预览悬浮按钮 */
.pe-fab { position: fixed; right: 36rpx; bottom: 190rpx; background: $ink; border-radius: 999px;
  padding: 18rpx 30rpx; display: flex; align-items: center; gap: 10rpx; z-index: 55;
  box-shadow: 0 8rpx 22rpx rgba(0, 0, 0, 0.28); }
.pe-fab-t { font-size: 26rpx; color: #fff; font-weight: 600; }

/* 底部操作栏 */
.pe-foot { position: fixed; left: 0; right: 0; bottom: 0; display: flex; gap: 24rpx;
  padding: 20rpx 40rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(250, 248, 245, 0.96); border-top: 1px solid $line; z-index: 60; }
.pe-btn { flex: 1; height: 88rpx; border-radius: 999px; display: flex; align-items: center;
  justify-content: center; gap: 12rpx; font-size: 28rpx; font-weight: 600; }
.pe-btn.ghost { background: $card; border: 1px solid $line; color: $ink2; }
.pe-btn.pri { background: $red; color: #fff; box-shadow: 0 6rpx 16rpx rgba(196, 30, 58, 0.3); }
.pe-btn.pri.loading { opacity: 0.7; }
.pe-btn text { color: inherit; }
.pe-btn.ghost text { color: $ink2; }
.pe-btn.pri text { color: #fff; }
.pe-spin { width: 30rpx; height: 30rpx; border: 4rpx solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff; border-radius: 50%; animation: pe-spin 0.7s linear infinite; }
@keyframes pe-spin { to { transform: rotate(360deg); } }

/* 状态页 */
.pe-state { display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 24rpx; padding: 120rpx 48rpx; }
.pe-state-txt { font-size: 26rpx; color: $ink3; text-align: center; }
.pe-state-btn { margin-top: 8rpx; border: 1px solid $line; padding: 16rpx 48rpx; border-radius: 999px; }
.pe-state-btn-txt { font-size: 26rpx; color: $ink; }

/* 类目弹层 */
.pe-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); z-index: 100;
  display: flex; align-items: flex-end; }
.pe-sheet { width: 100%; background: $card; border-radius: 24rpx 24rpx 0 0; padding: 30rpx;
  padding-bottom: calc(30rpx + env(safe-area-inset-bottom)); }
.pe-sheet-title { font-size: 30rpx; font-weight: 700; color: $ink; text-align: center; display: block;
  margin-bottom: 20rpx; font-family: "Songti SC", serif; }
.pe-sheet-list { max-height: 50vh; }
.pe-sheet-item { display: flex; align-items: center; justify-content: space-between; padding: 26rpx 8rpx;
  border-bottom: 1px solid $line; font-size: 28rpx; color: $ink; }
.pe-sheet-item.active { color: $red; }
.pe-sheet-fee { font-size: 22rpx; color: $ink3; }

/* ═══ 态D 预览覆盖层 ═══ */
.pe-preview { position: fixed; inset: 0; z-index: 200; background: $paper; display: flex; flex-direction: column; }
.pe-pv-nav { background: rgba(44, 44, 44, 0.98); display: flex; align-items: center; justify-content: space-between;
  padding-left: 30rpx; padding-right: 30rpx; }
.pe-pv-ttl { font-size: 28rpx; color: #fff; padding: 24rpx 0; }
.pe-pv-close { border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 999px; padding: 8rpx 22rpx;
  background: rgba(255, 255, 255, 0.1); }
.pe-pv-close-t { font-size: 24rpx; color: #fff; }
.pe-pv-scroll { flex: 1; height: 0; }
.pe-pv-hero { width: 100%; height: 600rpx; position: relative; background: $wash; }
.pe-pv-hero-img { width: 100%; height: 100%; }
.pe-pv-hero-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  color: $ink3; font-size: 26rpx; }
.pe-pv-badge { top: 28rpx; left: 28rpx; }
.pe-pv-dots { position: absolute; bottom: 24rpx; left: 0; right: 0; display: flex; justify-content: center; gap: 12rpx; }
.pe-pv-dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: rgba(0, 0, 0, 0.2); }
.pe-pv-dot.on { background: $red; }
.pe-pv-info { background: $card; padding: 30rpx 40rpx; border-bottom: 1px solid $line; }
.pe-pv-price-row { display: flex; align-items: baseline; gap: 16rpx; }
.pe-pv-price { font-family: "Songti SC", serif; font-size: 48rpx; font-weight: 700; color: $red; }
.pe-pv-origin { font-size: 26rpx; color: $ink3; text-decoration: line-through; }
.pe-pv-title { display: block; font-size: 30rpx; font-weight: 600; color: $ink; margin-top: 16rpx; }
.pe-pv-intro { display: block; font-size: 24rpx; color: $ink2; margin-top: 10rpx; line-height: 1.5; }
.pe-pv-spec { background: $card; padding: 24rpx 40rpx; margin-top: 16rpx; border-bottom: 1px solid $line;
  font-size: 24rpx; color: $ink2; }
.pe-pv-detail { padding: 30rpx 40rpx; }
.pe-pv-detail-hd { display: block; text-align: center; font-size: 22rpx; color: $ink3; margin-bottom: 24rpx; }
.pe-pv-detail-imgs { display: flex; flex-direction: column; gap: 0; }
.pe-pv-detail-img { width: 100%; display: block; }
.pe-pv-detail-empty { display: block; text-align: center; font-size: 24rpx; color: $ink3; padding: 40rpx 0; }
</style>
