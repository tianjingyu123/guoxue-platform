import { apiPut } from '@/utils/request'

/** 设置或取消当前讲解商品；服务端会校验商品属于本场直播。 */
export async function setFeaturedProduct(roomId: string, productId: string | null) {
  return await apiPut<{ featuredProductId: string | null }>(
    `/live/rooms/${roomId}/featured-product`,
    { productId },
  )
}
