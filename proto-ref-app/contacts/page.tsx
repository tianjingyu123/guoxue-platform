import { redirect } from "next/navigation"

// 旧通讯录已统一收敛到新 IM 通讯录
export default function LegacyContactsPage() {
  redirect("/im/contacts")
}
