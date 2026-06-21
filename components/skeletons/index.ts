/**
 * 骨架屏组件统一导出
 * 
 * 使用示例：
 * import { CourseCardSkeleton, ArticleCardSkeleton } from '@/components/skeletons'
 */

// 从 common/skeleton-loader.tsx 重新导出（主要骨架屏库）
export {
  Skeleton,
  CourseCardSkeleton,
  ArticleCardSkeleton,
  ProductCardSkeleton,
  CircleCardSkeleton,
  UserCardSkeleton,
  CommentSkeleton,
  HomeFeedSkeleton,
  CourseDetailSkeleton,
  ProductDetailSkeleton,
  LoadMoreSkeleton,
} from '@/components/common/skeleton-loader'

// 额外的骨架屏组件
export { FeedSkeleton } from '@/components/feed-skeleton'

// 从 skeleton.tsx 导出更多组件
export {
  CardSkeleton,
  ArticleListSkeleton,
  UserInfoSkeleton,
  WaterfallSkeleton,
  HomeSkeleton,
  DetailSkeleton,
  ListSkeleton,
} from '@/components/skeleton'
