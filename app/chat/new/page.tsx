import { redirect } from "next/navigation"

// 旧发起聊天已统一收敛到新 IM 通讯录
export default function LegacyChatNewPage() {
  redirect("/im/contacts")
}
