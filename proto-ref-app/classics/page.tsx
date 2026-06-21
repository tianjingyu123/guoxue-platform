import { redirect } from "next/navigation"

// 旧版古籍列表页已废弃，统一重定向到现代化古籍首页
export default function ClassicsPage() {
  redirect("/classics/home")
}
