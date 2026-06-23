import { redirect } from "next/navigation"

// 旧聊天系统已统一收敛到新 IM 会话列表
export default function LegacyChatPage() {
  redirect("/im/conversations")
}
