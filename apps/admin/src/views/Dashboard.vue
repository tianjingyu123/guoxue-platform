<template>
  <div>
    <h3>仪表盘</h3>
    <el-row :gutter="16">
      <el-col :span="6">
        <el-card><div class="stat">内容总数<br/><b>--</b></div></el-card>
      </el-col>
      <el-col :span="6">
        <el-card><div class="stat">用户总数<br/><b>--</b></div></el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.stat { text-align: center; font-size: 14px; color: #999; }
.stat b { font-size: 28px; color: #333; display: block; margin-top: 8px; }
</style>
