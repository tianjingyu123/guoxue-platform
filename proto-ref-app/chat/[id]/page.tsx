import { redirect } from "next/navigation"

// 旧单聊页已统一收敛到新 IM 单聊页
export default async function LegacyChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/im/chat/${id}`)
}
