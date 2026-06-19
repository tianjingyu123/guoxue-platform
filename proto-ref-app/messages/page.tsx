import { redirect } from "next/navigation"

// 旧消息中心已统一收敛到新 IM 会话列表
export default function LegacyMessagesPage() {
  redirect("/im/conversations")
}
