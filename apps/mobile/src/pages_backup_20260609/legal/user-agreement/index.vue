<template>
  <view class="page">
    <view class="nav"><text class="nav-back" @click="goBack">←</text><text class="nav-title">用户协议</text><view style="width:48rpx"/></view>
    <scroll-view scroll-y class="content">
      <view class="meta"><text>版本：v2.1</text><text>生效日期：2024-01-01</text></view>
      <view class="doc">
        <text v-for="s in sections" :key="s.title" class="h2">{{s.title}}</text>
        <text v-for="(p,i) in s.paragraphs" :key="i" class="p">{{p}}</text>
      </view>
      <view style="height:48rpx"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">const sections=[{title:'一、总则',paragraphs:['本协议是您与热卜国学平台之间关于使用平台服务的法律协议。请您仔细阅读本协议，特别是以加粗、下划线形式标注的条款。','您通过注册、登录或使用平台服务，即表示您已充分阅读、理解并接受本协议的全部内容。']},{title:'二、账号注册与使用',paragraphs:['用户应提供真实、准确、完整的注册信息，并对其账号下发生的行为承担法律责任。','用户应妥善保管账号和密码，不得将账号提供给他人使用。']},{title:'三、用户行为规范',paragraphs:['用户不得利用平台从事违法违规行为，包括但不限于：发布违法信息、侵犯他人权益、传播恶意软件等。','对于违规行为，平台有权采取删除内容、限制功能、封禁账号等措施。']},{title:'四、知识产权',paragraphs:['平台上的内容（包括但不限于课程视频、文章、图片等）受知识产权法保护，未经授权不得转载或使用。']},{title:'五、免责声明',paragraphs:['平台不对用户之间的交易承担责任。因不可抗力因素导致的服务中断，平台不承担赔偿责任。']},{title:'六、协议修改',paragraphs:['平台有权根据法律法规变化和运营需要修改本协议，修改后将公示生效。继续使用服务视为接受修改后的协议。']}];function goBack(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh}.nav{display:flex;align-items:center;justify-content:space-between;padding:0 24rpx;height:56px;background:#fff;border-bottom:1px solid #E8E0D5}.nav-back{font-size:36rpx;color:#2C2C2C}.nav-title{font-size:32rpx;font-weight:600}.content{padding:24rpx}.meta{display:flex;gap:32rpx;padding:16rpx 0;font-size:22rpx;color:#999}.doc{}.h2{font-size:30rpx;font-weight:600;color:#2C2C2C;display:block;margin:32rpx 0 12rpx}.p{font-size:26rpx;color:#666;line-height:1.8;margin-bottom:16rpx}</style>
