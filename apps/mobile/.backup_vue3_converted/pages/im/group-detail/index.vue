<template>
  <view class="min-h-screen bg-background">
    <!-- ============ 加载骨架屏 ============ -->
    <view v-if="loading" class="p-4 space-y-4">
      <view class="h-12 bg-muted rounded-lg" />
      <view class="h-48 bg-muted rounded-2xl" />
      <view class="h-32 bg-muted rounded-2xl" />
      <view class="h-48 bg-muted rounded-2xl" />
      <view class="h-24 bg-muted rounded-2xl" />
    </view>

    <!-- ============ 错误状态 ============ -->
    <view v-else-if="error" class="flex flex-col items-center justify-center min-h-screen px-8">
      <text class="text-5xl mb-4">😵</text>
      <text class="text-base text-muted-foreground text-center">{{ error }}</text>
      <view
        @click="loadData"
        class="mt-6 px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg"
      >
        重新加载
      </view>
    </view>

    <!-- ============ 空状态 ============ -->
    <view v-else-if="!group" class="flex flex-col items-center justify-center min-h-screen px-8">
      <text class="text-5xl mb-4"></text>
      <text class="text-base text-muted-foreground text-center">未找到群聊信息</text>
      <view @click="goBack" class="mt-6 px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg">
        返回
      </view>
    </view>

    <!-- ============ 主内容 ============ -->
    <template v-else>
      <!-- 顶部导航 -->
      <view class="sticky top-0 z-10 bg-white border-b border-border">
        <view class="flex items-center px-4 h-12 gap-3">
          <view @click="goBack" class="p-1 -ml-1">
            <text class="text-xl text-foreground">&#x2190;</text>
          </view>
          <text class="text-base font-semibold text-foreground">群聊设置</text>
          <view class="flex-1" />
        </view>
      </view>

      <scroll-view scroll-y class="flex-1" style="height: calc(100vh - 48px);">
        <!-- ============ 群信息头部 ============ -->
        <view class="bg-white rounded-2xl mx-4 mt-4 p-5 border border-border">
          <view class="flex items-center gap-4">
            <!-- 群头像 -->
            <view
              class="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-lg"
              :class="group.avatar ? '' : 'bg-gradient-to-br from-primary to-[#E74C3C]'"
            >
              <image v-if="group.avatar" :src="group.avatar" class="w-full h-full rounded-2xl" />
              <text v-else>{{ group.name[0] }}</text>
            </view>

            <!-- 群名称 + ID -->
            <view class="flex-1 min-w-0">
              <view class="flex items-center gap-2">
                <text class="text-lg font-bold text-foreground truncate">{{ group.name }}</text>
                <!-- 编辑群公告权限图标 -->
                <text
                  v-if="permissions?.canUpdateNotice"
                  class="text-muted-foreground text-xs"
                >&#x270E;</text>
              </view>
              <view class="flex items-center gap-1.5 mt-1">
                <text class="text-xs text-muted-foreground">群号: {{ group.id }}</text>
                <text @click="handleCopyGroupId" class="text-primary text-xs">&#x1F4CB;</text>
              </view>
              <view class="flex items-center gap-3 mt-2">
                <text class="text-xs text-muted-foreground">{{ group.memberCount }}人</text>
                <text class="text-xs text-muted-foreground">{{ group.category }}</text>
                <text class="text-xs text-muted-foreground">创建于 {{ group.createdAt }}</text>
              </view>
            </view>

            <!-- 二维码按钮 -->
            <view
              @click="handleShowQrcode"
              class="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
            >
              <text class="text-sm text-ink-soft">&#x1F4F1;</text>
            </view>
          </view>

          <!-- 统计行 -->
          <view class="flex items-center justify-around mt-4 pt-4 border-t border-[#F0EBE5]">
            <view class="text-center">
              <text class="text-base font-bold text-foreground block">{{ group.memberCount }}</text>
              <text class="text-[10px] text-muted-foreground">成员</text>
            </view>
            <view class="text-center">
              <text class="text-base font-bold text-foreground block">{{ group.posts }}</text>
              <text class="text-[10px] text-muted-foreground">讨论</text>
            </view>
            <view class="text-center">
              <text class="text-base font-bold text-foreground block">{{ group.photos }}</text>
              <text class="text-[10px] text-muted-foreground">图片</text>
            </view>
            <view class="text-center">
              <text class="text-base font-bold text-foreground block">{{ group.files }}</text>
              <text class="text-[10px] text-muted-foreground">文件</text>
            </view>
          </view>
        </view>

        <!-- ============ 群成员 ============ -->
        <view class="bg-white rounded-2xl mx-4 mt-4 border border-border overflow-hidden">
          <view class="flex items-center justify-between px-4 py-3.5 border-b border-[#F0EBE5]">
            <view class="flex items-center gap-2">
              <text class="text-base">&#x1F465;</text>
              <text class="text-sm font-semibold text-foreground">群成员</text>
              <text class="text-xs text-muted-foreground">({{ members.length }})</text>
            </view>
            <view class="flex items-center gap-2">
              <view
                @click="showAllMembers = true"
                class="px-2.5 py-1 rounded-full bg-muted text-ink-soft text-[10px] font-medium"
              >
                查看全部
              </view>
              <view
                v-if="permissions?.canInvite"
                @click="inviteMember"
                class="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium"
              >
                + 邀请
              </view>
            </view>
          </view>
          <!-- 成员头像网格 -->
          <view class="grid grid-cols-5 gap-3 p-4">
            <view
              v-for="m in displayedMembers"
              :key="m.id"
              class="flex flex-col items-center gap-1"
              @click="onMemberClick(m)"
            >
              <view class="relative">
                <view
                  class="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-medium overflow-hidden"
                  :class="avatarBg(m.role)"
                >
                  <image v-if="m.avatar" :src="m.avatar" class="w-full h-full" />
                  <text v-else>{{ m.displayName[0] }}</text>
                </view>
                <!-- 在线状态圆点 -->
                <view
                  class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                  :class="m.online ? 'bg-green-500' : 'bg-gray-300'"
                />
                <!-- 角色徽章 -->
                <text
                  v-if="m.role === 'owner'"
                  class="absolute -top-1 -right-1 text-[10px]"
                >&#x1F451;</text>
                <text
                  v-else-if="m.role === 'admin'"
                  class="absolute -top-1 -right-1 text-[10px]"
                >&#x2B50;</text>
              </view>
              <text class="text-[10px] text-foreground text-center line-clamp-1 w-14">{{
                m.displayName
              }}</text>
            </view>

            <!-- 邀请入口 -->
            <view
              v-if="permissions?.canInvite"
              class="flex flex-col items-center gap-1"
              @click="inviteMember"
            >
              <view
                class="w-12 h-12 rounded-full border-2 border-dashed border-[#D0C8BD] flex items-center justify-center"
              >
                <text class="text-lg text-muted-foreground">+</text>
              </view>
              <text class="text-[10px] text-muted-foreground">邀请</text>
            </view>
          </view>
        </view>

        <!-- ============ 群公告 ============ -->
        <view
          v-if="group.notice"
          class="bg-white rounded-2xl mx-4 mt-4 border border-border overflow-hidden"
        >
          <view
            class="flex items-center justify-between px-4 py-3.5"
            @click="noticeExpanded = !noticeExpanded"
          >
            <view class="flex items-center gap-2">
              <text class="text-base">&#x1F4CB;</text>
              <text class="text-sm font-semibold text-foreground">群公告</text>
            </view>
            <view class="flex items-center gap-2">
              <text
                v-if="permissions?.canUpdateNotice"
                class="text-primary text-xs"
                @click.stop="editNotice"
              >编辑</text>
              <text class="text-xs text-muted-foreground">
                {{ noticeExpanded ? '收起' : '展开' }}
                {{ noticeExpanded ? '&#x25B2;' : '&#x25BC;' }}
              </text>
            </view>
          </view>
          <view
            v-if="noticeExpanded"
            class="px-4 pb-4 border-t border-[#F0EBE5] pt-3"
          >
            <text class="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{{
              group.notice.content
            }}</text>
            <text class="text-[10px] text-muted-foreground block mt-2">
              发布于 {{ group.notice.publishedAt }} · 由 {{ group.notice.publisher }}
            </text>
          </view>
        </view>

        <!-- ============ 我的设置 ============ -->
        <view class="bg-white rounded-2xl mx-4 mt-4 border border-border overflow-hidden">
          <view class="px-4 py-3.5 border-b border-[#F0EBE5]">
            <view class="flex items-center gap-2">
              <text class="text-base">&#x2699;</text>
              <text class="text-sm font-semibold text-foreground">我的设置</text>
            </view>
          </view>

          <!-- 我在本群的昵称 -->
          <view class="flex items-center justify-between px-4 py-3.5 border-b border-[#F0EBE5]">
            <text class="text-sm text-foreground">我在本群的昵称</text>
            <template v-if="editingNickname">
              <view class="flex items-center gap-1.5">
                <input
                  v-model="nicknameInput"
                  class="w-28 h-7 px-2 text-xs border border-border rounded-md bg-white text-foreground"
                  maxlength="20"
                  placeholder="请输入昵称"
                  @confirm="handleSaveNickname"
                />
                <text
                  @click="handleSaveNickname"
                  class="text-sm text-primary"
                >&#x2713;</text>
                <text
                  @click="cancelEditNickname"
                  class="text-sm text-muted-foreground"
                >&#x2715;</text>
              </view>
            </template>
            <template v-else>
              <view
                @click="startEditNickname"
                class="flex items-center gap-1"
              >
                <text class="text-xs text-muted-foreground">{{ settings.myNickname || '未设置' }}</text>
                <text class="text-xs text-muted-foreground">&#x203A;</text>
              </view>
            </template>
          </view>

          <!-- 消息免打扰 -->
          <view class="flex items-center justify-between px-4 py-3.5 border-b border-[#F0EBE5]">
            <view class="flex items-center gap-2">
              <text class="text-base">{{ settings.isMuted ? '&#x1F515;' : '&#x1F514;' }}</text>
              <text class="text-sm text-foreground">消息免打扰</text>
            </view>
            <switch color="#C41E3A" :checked="settings.isMuted" @change="handleToggleMute" />
          </view>

          <!-- 置顶聊天 -->
          <view class="flex items-center justify-between px-4 py-3.5">
            <view class="flex items-center gap-2">
              <text class="text-base">{{ settings.isPinned ? '&#x1F4CD;' : '&#x1F4CC;' }}</text>
              <text class="text-sm text-foreground">置顶聊天</text>
            </view>
            <switch color="#C41E3A" :checked="settings.isPinned" @change="handleTogglePin" />
          </view>
        </view>

        <!-- ============ 清空聊天记录 ============ -->
        <view class="bg-white rounded-2xl mx-4 mt-4 border border-border overflow-hidden">
          <view @click="clearChat" class="px-4 py-3.5">
            <text class="text-sm text-muted-foreground">清空聊天记录</text>
          </view>
        </view>

        <!-- ============ 退出 / 解散群聊 ============ -->
        <view class="mx-4 mt-4 mb-8">
          <!-- 群主显示 解散 -->
          <view
            v-if="group.myRole === 'owner'"
            @click="showDismissConfirm = true"
            class="py-3.5 bg-white rounded-2xl border border-border text-center"
          >
            <text class="text-primary text-sm font-medium">&#x1F5D1; 解散群聊</text>
          </view>
          <!-- 成员显示 退出 -->
          <view
            v-else
            @click="showQuitConfirm = true"
            class="py-3.5 bg-white rounded-2xl border border-border text-center"
          >
            <text class="text-red-500 text-sm font-medium">&#x1F6AA; 退出群聊</text>
          </view>
        </view>
      </scroll-view>

      <!-- ============================================================ -->
      <!-- 二维码底部弹出层 -->
      <!-- ============================================================ -->
      <view
        v-if="showQrcode"
        class="fixed inset-0 z-50 flex items-end justify-center"
        @click="showQrcode = false"
      >
        <view class="absolute inset-0 bg-black/40" />
        <view
          class="relative bg-white rounded-t-2xl w-full px-6 pb-8 pt-5"
          @click.stop
        >
          <!-- 拖拽条 -->
          <view class="w-10 h-1 bg-[#E8E0D5] rounded-full mx-auto mb-5" />
          <text class="text-base font-semibold text-foreground text-center block">群二维码</text>

          <view class="flex flex-col items-center py-6">
            <!-- 二维码占位 -->
            <view class="w-44 h-44 bg-white rounded-xl p-3 shadow-lg border border-border">
              <image
                v-if="qrcodeUrl"
                :src="qrcodeUrl"
                class="w-full h-full"
                mode="aspectFit"
              />
              <view v-else class="w-full h-full flex items-center justify-center bg-background rounded-lg">
                <text class="text-5xl">&#x1F4F1;</text>
              </view>
            </view>
            <text class="text-sm text-muted-foreground mt-4">扫一扫，加入群聊</text>
            <text class="text-xs text-muted-foreground mt-1">二维码7天内有效</text>
          </view>

          <view
            @click="showQrcode = false"
            class="py-2.5 rounded-lg bg-muted text-sm font-medium text-center text-foreground"
          >
            关闭
          </view>
        </view>
      </view>

      <!-- ============================================================ -->
      <!-- 全部成员底部弹出层 -->
      <!-- ============================================================ -->
      <view
        v-if="showAllMembers"
        class="fixed inset-0 z-50 flex items-end justify-center"
        @click="showAllMembers = false"
      >
        <view class="absolute inset-0 bg-black/40" />
        <view
          class="relative bg-white rounded-t-2xl w-full max-h-[70vh] flex flex-col"
          @click.stop
        >
          <!-- 拖拽条 -->
          <view class="w-10 h-1 bg-[#E8E0D5] rounded-full mx-auto my-3" />
          <view class="px-5 py-2 border-b border-[#F0EBE5]">
            <text class="text-base font-semibold text-foreground">群成员 ({{ members.length }})</text>
          </view>

          <scroll-view scroll-y class="flex-1 px-2">
            <view
              v-for="m in members"
              :key="m.id"
              class="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted"
              @click="onMemberClick(m)"
            >
              <view class="flex items-center gap-3 flex-1 min-w-0">
                <view class="relative">
                  <view
                    class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm overflow-hidden"
                    :class="avatarBg(m.role)"
                  >
                    <image v-if="m.avatar" :src="m.avatar" class="w-full h-full" />
                    <text v-else>{{ m.displayName[0] }}</text>
                  </view>
                  <!-- 在线状态 -->
                  <view
                    class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                    :class="m.online ? 'bg-green-500' : 'bg-gray-300'"
                  />
                </view>
                <view class="flex-1 min-w-0">
                  <view class="flex items-center gap-1.5">
                    <text class="text-sm font-medium text-foreground truncate">{{
                      m.displayName
                    }}</text>
                    <text
                      v-if="m.role === 'owner'"
                      class="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent"
                    >群主</text>
                    <text
                      v-else-if="m.role === 'admin'"
                      class="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary"
                    >管理员</text>
                  </view>
                  <text v-if="m.remark && m.remark !== m.displayName" class="text-[10px] text-muted-foreground">
                    {{ m.displayName }}
                  </text>
                </view>
              </view>

              <!-- 成员管理按钮 -->
              <view
                v-if="
                  group.myRole === 'owner' &&
                  m.id !== group.myMemberId &&
                  m.role !== 'owner'
                "
                @click.stop="openMemberAction(m)"
                class="w-7 h-7 rounded-full bg-muted flex items-center justify-center ml-2 shrink-0"
              >
                <text class="text-xs text-ink-soft font-bold">&#x22EE;</text>
              </view>
            </view>
          </scroll-view>

          <view class="px-5 py-3 border-t border-[#F0EBE5]">
            <view
              @click="showAllMembers = false"
              class="py-2.5 rounded-lg bg-muted text-sm font-medium text-center text-foreground"
            >
              关闭
            </view>
          </view>
        </view>
      </view>

      <!-- ============================================================ -->
      <!-- 成员管理操作底部弹出层 -->
      <!-- ============================================================ -->
      <view
        v-if="showMemberAction && actionMember"
        class="fixed inset-0 z-50 flex items-end justify-center"
        @click="showMemberAction = false"
      >
        <view class="absolute inset-0 bg-black/40" />
        <view
          class="relative bg-white rounded-t-2xl w-full px-6 pb-8 pt-3"
          @click.stop
        >
          <view class="w-10 h-1 bg-[#E8E0D5] rounded-full mx-auto mb-4" />
          <!-- 成员信息预览 -->
          <view class="flex items-center gap-3 mb-4 pb-4 border-b border-[#F0EBE5]">
            <view
              class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm"
              :class="avatarBg(actionMember.role)"
            >
              <image v-if="actionMember.avatar" :src="actionMember.avatar" class="w-full h-full rounded-full" />
              <text v-else>{{ actionMember.displayName[0] }}</text>
            </view>
            <view>
              <text class="text-sm font-semibold text-foreground block">{{ actionMember.displayName }}</text>
              <text class="text-[10px] text-muted-foreground">{{ roleLabel(actionMember.role) }}</text>
            </view>
          </view>

          <!-- 设为/取消管理员 -->
          <view
            v-if="group.myRole === 'owner' && actionMember.role !== 'owner'"
            @click="handleToggleAdmin(actionMember)"
            class="flex items-center gap-3 py-3.5 border-b border-[#F0EBE5]"
          >
            <text class="text-base">&#x1F6E1;</text>
            <text class="text-sm text-foreground">
              {{ actionMember.role === 'admin' ? '取消管理员' : '设为管理员' }}
            </text>
          </view>

          <!-- 转让群主 -->
          <view
            v-if="group.myRole === 'owner' && actionMember.role !== 'owner'"
            @click="handleTransferClick(actionMember)"
            class="flex items-center gap-3 py-3.5 border-b border-[#F0EBE5]"
          >
            <text class="text-base">&#x1F451;</text>
            <text class="text-sm text-foreground">转让群主</text>
          </view>

          <!-- 移除成员 -->
          <view
            v-if="group.myRole === 'owner' && actionMember.role !== 'owner'"
            @click="handleRemoveClick(actionMember)"
            class="flex items-center gap-3 py-3.5"
          >
            <text class="text-base">&#x1F5D1;</text>
            <text class="text-sm text-primary">移除成员</text>
          </view>

          <view
            @click="showMemberAction = false"
            class="mt-4 py-2.5 rounded-lg bg-muted text-sm font-medium text-center text-foreground"
          >
            取消
          </view>
        </view>
      </view>

      <!-- ============================================================ -->
      <!-- 退出群聊确认弹窗 -->
      <!-- ============================================================ -->
      <view
        v-if="showQuitConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center"
        @click="showQuitConfirm = false"
      >
        <view class="absolute inset-0 bg-black/40" />
        <view
          class="relative bg-white rounded-2xl w-72 p-6 mx-4"
          @click.stop
        >
          <text class="text-base font-semibold text-foreground text-center block">退出群聊</text>
          <text class="text-sm text-ink-soft text-center block mt-2 leading-relaxed">
            确定要退出群聊「{{ group.name }}」吗？退出后将不再接收此群消息。
          </text>
          <view class="flex gap-3 mt-5">
            <view
              @click="showQuitConfirm = false"
              class="flex-1 py-2.5 rounded-lg bg-muted text-sm font-medium text-center text-foreground"
            >
              取消
            </view>
            <view
              @click="handleQuit"
              class="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium text-center"
            >
              退出
            </view>
          </view>
        </view>
      </view>

      <!-- ============================================================ -->
      <!-- 解散群聊确认弹窗 -->
      <!-- ============================================================ -->
      <view
        v-if="showDismissConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center"
        @click="showDismissConfirm = false"
      >
        <view class="absolute inset-0 bg-black/40" />
        <view
          class="relative bg-white rounded-2xl w-72 p-6 mx-4"
          @click.stop
        >
          <text class="text-base font-semibold text-foreground text-center block">解散群聊</text>
          <text class="text-sm text-ink-soft text-center block mt-2 leading-relaxed">
            确定要解散群聊「{{ group.name }}」吗？解散后所有成员将被移出，此操作不可撤销。
          </text>
          <view class="flex gap-3 mt-5">
            <view
              @click="showDismissConfirm = false"
              class="flex-1 py-2.5 rounded-lg bg-muted text-sm font-medium text-center text-foreground"
            >
              取消
            </view>
            <view
              @click="handleDismiss"
              class="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium text-center"
            >
              解散
            </view>
          </view>
        </view>
      </view>

      <!-- ============================================================ -->
      <!-- 转让群主确认弹窗 -->
      <!-- ============================================================ -->
      <view
        v-if="showTransferConfirm && transferTarget"
        class="fixed inset-0 z-50 flex items-center justify-center"
        @click="showTransferConfirm = false"
      >
        <view class="absolute inset-0 bg-black/40" />
        <view
          class="relative bg-white rounded-2xl w-72 p-6 mx-4"
          @click.stop
        >
          <text class="text-base font-semibold text-foreground text-center block">转让群主</text>
          <text class="text-sm text-ink-soft text-center block mt-2 leading-relaxed">
            确定要将群主转让给「{{ transferTarget.displayName }}」吗？转让后您将成为普通成员。
          </text>
          <view class="flex gap-3 mt-5">
            <view
              @click="showTransferConfirm = false"
              class="flex-1 py-2.5 rounded-lg bg-muted text-sm font-medium text-center text-foreground"
            >
              取消
            </view>
            <view
              @click="handleTransfer"
              class="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium text-center"
            >
              确认转让
            </view>
          </view>
        </view>
      </view>

      <!-- ============================================================ -->
      <!-- 移除成员确认弹窗 -->
      <!-- ============================================================ -->
      <view
        v-if="showRemoveConfirm && removeTarget"
        class="fixed inset-0 z-50 flex items-center justify-center"
        @click="showRemoveConfirm = false"
      >
        <view class="absolute inset-0 bg-black/40" />
        <view
          class="relative bg-white rounded-2xl w-72 p-6 mx-4"
          @click.stop
        >
          <text class="text-base font-semibold text-foreground text-center block">移除成员</text>
          <text class="text-sm text-ink-soft text-center block mt-2 leading-relaxed">
            确定要将「{{ removeTarget.displayName }}」移出群聊吗？
          </text>
          <view class="flex gap-3 mt-5">
            <view
              @click="showRemoveConfirm = false"
              class="flex-1 py-2.5 rounded-lg bg-muted text-sm font-medium text-center text-foreground"
            >
              取消
            </view>
            <view
              @click="handleRemoveMember"
              class="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium text-center"
            >
              移除
            </view>
          </view>
        </view>
      </view>

      <!-- ============================================================ -->
      <!-- 成员详情弹窗（点击成员头像） -->
      <!-- ============================================================ -->
      <view
        v-if="selectedMember"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click="selectedMember = null"
      >
        <view
          class="bg-white rounded-2xl w-72 p-6 text-center mx-4"
          @click.stop
        >
          <view
            class="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3 overflow-hidden"
            :class="avatarBg(selectedMember.role)"
          >
            <image v-if="selectedMember.avatar" :src="selectedMember.avatar" class="w-full h-full" />
            <text v-else>{{ selectedMember.displayName[0] }}</text>
          </view>
          <text class="text-base font-semibold text-foreground block">{{ selectedMember.displayName }}</text>
          <text class="text-xs text-muted-foreground block mt-1">{{ roleLabel(selectedMember.role) }}</text>
          <text class="text-xs text-muted-foreground block mt-3">{{ selectedMember.bio }}</text>
          <view class="flex gap-3 mt-5">
            <view
              @click="selectedMember = null"
              class="flex-1 py-2.5 rounded-lg bg-muted text-sm font-medium text-center"
            >
              关闭
            </view>
            <view
              @click="sendMessage"
              class="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium text-center"
            >
              发消息
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

// ============================================================
// 类型定义
// ============================================================

/** 群成员 */
interface GroupMember {
  id: number
  name: string
  displayName: string
  remark: string
  role: 'owner' | 'admin' | 'member'
  bio: string
  avatar: string
  online: boolean
}

/** 群详情 */
interface GroupDetail {
  id: number
  name: string
  avatar: string
  memberCount: number
  category: string
  createdAt: string
  myRole: 'owner' | 'admin' | 'member'
  myMemberId: number
  posts: number
  photos: number
  files: number
  notice: GroupNotice | null
}

/** 群公告 */
interface GroupNotice {
  content: string
  publisher: string
  publishedAt: string
}

/** 个人设置 */
interface GroupSettings {
  isMuted: boolean
  isPinned: boolean
  isSaved: boolean
  showNick: boolean
  myNickname: string
}

/** 权限 */
interface GroupPermissions {
  canUpdateNotice: boolean
  canInvite: boolean
  canRemoveMember: boolean
  canSetAdmin: boolean
  canTransfer: boolean
}

// ============================================================
// 权限计算 — 根据用户角色推导可见/可用操作
// ============================================================
function computePermissions(role: 'owner' | 'admin' | 'member'): GroupPermissions {
  const isOwner = role === 'owner'
  const isAdmin = role === 'admin'
  const isManager = isOwner || isAdmin
  return {
    canUpdateNotice: isManager,
    canInvite: isManager,
    canRemoveMember: isManager,
    canSetAdmin: isOwner,
    canTransfer: isOwner,
  }
}

// ============================================================
// 响应式状态
// ============================================================

const loading = ref(true)
const error = ref<string | null>(null)

const group = ref<GroupDetail | null>(null)
const settings = reactive<GroupSettings>({
  isMuted: false,
  isPinned: false,
  isSaved: true,
  showNick: true,
  myNickname: '',
})
const members = ref<GroupMember[]>([])
const permissions = computed<GroupPermissions | null>(() =>
  group.value ? computePermissions(group.value.myRole) : null
)

// 公告展开
const noticeExpanded = ref(false)

// 昵称编辑
const editingNickname = ref(false)
const nicknameInput = ref('')

// 二维码
const showQrcode = ref(false)
const qrcodeUrl = ref('')

// 全部成员列表
const showAllMembers = ref(false)

// 成员管理操作
const showMemberAction = ref(false)
const actionMember = ref<GroupMember | null>(null)

// 转让 / 移除目标
const transferTarget = ref<GroupMember | null>(null)
const removeTarget = ref<GroupMember | null>(null)

// 确认弹窗
const showQuitConfirm = ref(false)
const showDismissConfirm = ref(false)
const showTransferConfirm = ref(false)
const showRemoveConfirm = ref(false)

// 成员详情弹窗
const selectedMember = ref<GroupMember | null>(null)

// ============================================================
// 计算属性
// ============================================================

/** 首页最多展示 10 个成员 */
const displayedMembers = computed(() => members.value.slice(0, 10))

// ============================================================
// 模拟 API 调用 — 对接真实接口时替换为实际 API
// ============================================================

/**
 * 加载群数据
 * @remarks 对接真实 API 时改为：
 *   const [groupRes, settingsRes, membersRes] = await Promise.all([
 *     getGroupDetail(groupId),
 *     getGroupSettings(groupId),
 *     getGroupMembers(groupId),
 *   ])
 */
function loadData() {
  loading.value = true
  error.value = null

  // ---- 模拟异步请求 ----
  setTimeout(() => {
    try {
      group.value = {
        id: 888888,
        name: '国学堂交流群',
        avatar: '',
        memberCount: 128,
        category: '国学文化圈',
        createdAt: '2024-01-15',
        myRole: 'owner',
        myMemberId: 1,
        posts: 1568,
        photos: 342,
        files: 89,
        notice: {
          content:
            '欢迎加入国学堂交流群！本群旨在传播中华优秀传统文化，交流学习心得。请遵守以下群规：\n' +
            '1. 禁止发广告和政治敏感内容\n' +
            '2. 文明交流，互相尊重\n' +
            '3. 鼓励分享国学知识和学习资源\n' +
            '4. 每周六晚8点有线上共修活动，欢迎参加。',
          publisher: '周易大师',
          publishedAt: '2024-06-01',
        },
      }

      settings.isMuted = false
      settings.isPinned = false
      settings.isSaved = true
      settings.showNick = true
      settings.myNickname = ''

      members.value = [
        { id: 1, name: '周易大师', displayName: '周易大师', remark: '', role: 'owner', bio: '国学传承人，专注易学二十载', avatar: '', online: true },
        { id: 2, name: '张玄风', displayName: '张玄风', remark: '', role: 'admin', bio: '紫微斗数研究者', avatar: '', online: true },
        { id: 3, name: '李玄机', displayName: '李玄机', remark: '', role: 'admin', bio: '易经文化推广者', avatar: '', online: false },
        { id: 4, name: '王阳明', displayName: '王阳明', remark: '', role: 'member', bio: '心学爱好者', avatar: '', online: true },
        { id: 5, name: '赵国学', displayName: '赵国学', remark: '', role: 'member', bio: '传统文化学习者', avatar: '', online: false },
        { id: 6, name: '孙子墨', displayName: '孙子墨', remark: '', role: 'member', bio: '书法爱好者', avatar: '', online: true },
        { id: 7, name: '周文王', displayName: '周文王', remark: '', role: 'member', bio: '易经研习者', avatar: '', online: true },
        { id: 8, name: '孔夫子', displayName: '孔夫子', remark: '', role: 'member', bio: '儒家思想研习', avatar: '', online: false },
        { id: 9, name: '司马迁', displayName: '司马迁', remark: '', role: 'member', bio: '历史爱好者', avatar: '', online: true },
        { id: 10, name: '韩非子', displayName: '韩非子', remark: '', role: 'member', bio: '法家思想研究', avatar: '', online: false },
        { id: 11, name: '朱熹', displayName: '朱熹', remark: '', role: 'member', bio: '理学研究', avatar: '', online: true },
        { id: 12, name: '王羲之', displayName: '王羲之', remark: '', role: 'member', bio: '书法艺术', avatar: '', online: false },
        { id: 13, name: '李清照', displayName: '李清照', remark: '', role: 'member', bio: '诗词爱好者', avatar: '', online: true },
        { id: 14, name: '陶渊明', displayName: '陶渊明', remark: '', role: 'member', bio: '隐逸文化', avatar: '', online: false },
      ]

      loading.value = false
    } catch (e) {
      error.value = '加载失败，请重试'
      loading.value = false
    }
  }, 500)
}

// ============================================================
// 界面操作
// ============================================================

function goBack() {
  uni.navigateBack()
}

function roleLabel(role: string): string {
  return role === 'owner' ? '群主' : role === 'admin' ? '管理员' : '群成员'
}

/**
 * 根据角色返回不同的头像背景色
 */
function avatarBg(role: string): string {
  if (role === 'owner') return 'bg-gradient-to-br from-accent to-[#B8944E]'
  if (role === 'admin') return 'bg-gradient-to-br from-primary to-[#E74C3C]'
  return 'bg-gradient-to-br from-[#999] to-[#777]'
}

// ---- 复制群号 ----
function handleCopyGroupId() {
  uni.setClipboardData({
    data: String(group.value?.id ?? ''),
    success() {
      uni.showToast({ title: '群号已复制', icon: 'none' })
    },
  })
}

// ---- 昵称编辑 ----
function startEditNickname() {
  nicknameInput.value = settings.myNickname
  editingNickname.value = true
}

function cancelEditNickname() {
  editingNickname.value = false
  nicknameInput.value = settings.myNickname
}

/**
 * 保存群昵称
 * @remarks 对接 API: updateMyGroupNickname(groupId, nicknameInput)
 */
function handleSaveNickname() {
  if (!nicknameInput.value.trim()) {
    uni.showToast({ title: '昵称不能为空', icon: 'none' })
    return
  }
  settings.myNickname = nicknameInput.value.trim()
  editingNickname.value = false
  uni.showToast({ title: '昵称已更新', icon: 'success' })
}

// ---- 开关设置 ----
/**
 * 切换消息免打扰
 * @remarks 对接 API: updateGroupSettings(groupId, { isMuted: !settings.isMuted })
 */
function handleToggleMute() {
  settings.isMuted = !settings.isMuted
  uni.showToast({ title: settings.isMuted ? '已开启消息免打扰' : '已开启消息通知', icon: 'none' })
}

/**
 * 切换置顶聊天
 * @remarks 对接 API: updateGroupSettings(groupId, { isPinned: !settings.isPinned })
 */
function handleTogglePin() {
  settings.isPinned = !settings.isPinned
  uni.showToast({ title: settings.isPinned ? '已置顶' : '已取消置顶', icon: 'none' })
}

// ---- 邀请成员 ----
function inviteMember() {
  uni.navigateTo({ url: `/pages/im/invite-members/index?groupId=${groupId.value}` })
}

// ---- 编辑公告 ----
function editNotice() {
  uni.navigateTo({ url: `/pages/im/group-detail/edit-notice/index?groupId=${groupId.value}` })
}

// ---- 清空聊天 ----
function clearChat() {
  uni.showModal({
    title: '清空聊天记录',
    content: '确定要清空所有聊天记录吗？此操作不可恢复。',
    success: (res) => {
      if (res.confirm) {
        uni.showToast({ title: '已清空', icon: 'success' })
      }
    },
  })
}

// ---- 退出群聊 ----
/**
 * @remarks 对接 API: quitGroup(groupId)
 */
function handleQuit() {
  showQuitConfirm.value = false
  uni.showToast({ title: '已退出群聊', icon: 'success' })
  setTimeout(() => uni.navigateBack(), 800)
}

// ---- 解散群聊 ----
/**
 * @remarks 对接 API: dismissGroup(groupId)
 */
function handleDismiss() {
  showDismissConfirm.value = false
  uni.showToast({ title: '群聊已解散', icon: 'success' })
  setTimeout(() => uni.navigateBack(), 800)
}

// ---- 成员点击 ----
function onMemberClick(m: GroupMember) {
  selectedMember.value = m
}

function sendMessage() {
  uni.showToast({ title: '模拟发送消息', icon: 'none' })
  selectedMember.value = null
}

// ---- 成员管理（群主专属） ----
function openMemberAction(m: GroupMember) {
  actionMember.value = m
  showMemberAction.value = true
}

/**
 * 设为/取消管理员
 * @remarks 对接 API: toggleGroupAdmin(groupId, memberId, !isCurrentlyAdmin)
 */
function handleToggleAdmin(m: GroupMember) {
  const isCurrentlyAdmin = m.role === 'admin'
  m.role = isCurrentlyAdmin ? 'member' : 'admin'
  showMemberAction.value = false
  actionMember.value = null
  uni.showToast({ title: isCurrentlyAdmin ? '已取消管理员' : '已设为管理员', icon: 'success' })
}

/**
 * 点击转让群主
 */
function handleTransferClick(m: GroupMember) {
  transferTarget.value = m
  showMemberAction.value = false
  actionMember.value = null
  showTransferConfirm.value = true
}

/**
 * 确认转让群主
 * @remarks 对接 API: transferGroupOwner(groupId, transferTarget.id)
 */
function handleTransfer() {
  if (!transferTarget.value) return
  // 模拟转让
  if (group.value) {
    group.value.myRole = 'member'
    // 更新本地成员角色
    const targetMember = members.value.find((m) => m.id === transferTarget.value!.id)
    const oldOwner = members.value.find((m) => m.id === group.value!.myMemberId)
    if (targetMember) targetMember.role = 'owner'
    if (oldOwner) oldOwner.role = 'member'
  }
  showTransferConfirm.value = false
  transferTarget.value = null
  uni.showToast({ title: '群主已转让', icon: 'success' })
}

/**
 * 点击移除成员
 */
function handleRemoveClick(m: GroupMember) {
  removeTarget.value = m
  showMemberAction.value = false
  actionMember.value = null
  showRemoveConfirm.value = true
}

/**
 * 确认移除成员
 * @remarks 对接 API: removeGroupMember(groupId, removeTarget.id)
 */
function handleRemoveMember() {
  if (!removeTarget.value) return
  members.value = members.value.filter((m) => m.id !== removeTarget.value!.id)
  showRemoveConfirm.value = false
  removeTarget.value = null
  uni.showToast({ title: '已移除成员', icon: 'success' })
}

// ---- 二维码 ----
/**
 * @remarks 对接 API: generateGroupQrcode(groupId) → { qrcodeUrl }
 * 实际接入时用 wxbarcode 或后端返回的图片 URL
 */
function handleShowQrcode() {
  // 模拟二维码 URL
  qrcodeUrl.value = ''
  showQrcode.value = true
}

// ============================================================
// 生命周期
// ============================================================

onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* 由 Tailwind 处理，此处仅保留必要重置 */
</style>
