// 全平台统一卡片库
// 一套数据 + 一个基础卡 + 有限的位置变体(variant)
// variant: feed(瀑布流/网格) | list(横向) | rail(横滑) | rank(榜单)

export * from "./primitives"
export { ProductCard, type ProductCardData } from "./product-card"
export { CourseCard, type CourseCardData } from "./course-card"
export { LiveCard, type LiveCardData } from "./live-card"
export { AgentCard, type AgentCardData } from "./agent-card"
export { ClassicCard, type ClassicCardData } from "./classic-card"
export { VideoCard, type VideoCardData } from "./video-card"
