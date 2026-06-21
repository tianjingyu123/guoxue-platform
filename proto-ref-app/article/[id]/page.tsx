import { redirect } from "next/navigation"

// 旧版文章详情页已统一到 /articles/[id]（功能更完整：评论、AI摘要、语音朗读、内嵌推荐卡等）
// 此处做永久重定向，保证历史链接（首页信息流、话题、搜索、历史等）仍可访问
export default async function LegacyArticleRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/articles/${id}`)
}
