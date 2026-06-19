import { redirect } from "next/navigation"

// 旧投稿页已合并到 /mine/submissions（含草稿/审核中/已发布/未通过完整状态管理）
export default function SubmissionsRedirectPage() {
  redirect("/mine/submissions")
}
