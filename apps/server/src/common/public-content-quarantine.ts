/**
 * 公开内容精确隔离清单。
 *
 * 仅收录已经通过生产只读审计确认的后台联调记录；严禁按标题、价格或作者模糊过滤，
 * 避免误伤用户真实内容。规则只接入公共列表、推荐和搜索，详情与后台管理入口继续保留，
 * 便于运营侧复核、下架或删除。新增/移除条目必须附带生产证据并经过主进程复核。
 */
export const PUBLIC_QUARANTINED_IDS = {
  product: [
    "b51c983b-2dbe-4afb-88f1-23ecc1f7885c",
    "5b860c4e-0443-411c-91e2-b041e822c837",
    "627d99be-c83b-44fb-905f-1f2fd6e19a2d",
    "42bcbc44-f1d1-4f29-ab2e-8202f6b0b0d2",
  ],
  course: [
    "ecd4351b-a400-4a84-89c1-b9196b90d9fb",
    "a1fcc69e-2d54-428b-8b96-43cf2c25bc26",
    "ac731f0a-28b2-4f6e-bb44-1f4912df9717",
    "d2f4bde8-f5b9-4ac4-a41c-2401db76dc4d",
    "9dbd1ca3-d741-4923-9f0d-4bd46c0c9db5",
    "c42459b2-04f6-45e5-902d-fefcad62c3f0",
    "ec7017b1-cb1b-4478-9773-7ecbc7bda9bf",
    "a7bc3f2c-6bc1-4877-ad8d-f36d1be215cf",
    "04db938d-a0cc-450c-b6fe-c2d71ee07984",
    "08256525-5af0-437e-89c2-c801d9e2ec7f",
    "658b71ae-8c10-452c-af4f-59e68fa4d623",
  ],
  video: [
    "c8ebccac-0253-4a37-a1f0-9b411a4912c7",
    "ba5bfb1e-bd79-4558-8839-ce946b06f40b",
    "f278cf9a-13ff-4bff-a447-809bd14888e6",
    "d8d6fe05-8c87-4d9a-a2c2-02a4d9d87087",
    "338640de-c2e4-4ea6-979a-85bb02c0279b",
    "cec62c69-92a9-4b9e-beda-f4295345e9d4",
    "19e34a5b-4a9c-440f-a295-d92b780d7233",
    "afcfa54e-fe31-43a5-9b01-228616543b3e",
  ],
  circle: [
    "ee88c589-0cf1-43a0-920f-a33f865e0660",
    "4c3c8ad2-17be-4433-b430-16e9122dd174",
    "35f11f51-3df6-4982-a055-ba5b0a7c4edb",
    "c3f1d4bb-ab86-4fa2-b9d0-ecc850f0a783",
  ],
  article: [
    "94caeb7c-370e-45b4-9036-3a70675ed9a8",
    "ad3f1479-9a0e-46de-91f1-5590d1d3dd61",
    "dddf248a-b1ee-4696-99e9-2c7ecd5d4831",
  ],
  post: [
    "6e01e181-86a8-4c8e-9da4-a52c38349d35",
    "42227388-1d53-4e9f-8690-c6e6fcde3349",
    "a82138da-39a4-4661-a457-289022f5d091",
    "3a1bc4bd-db7f-4bd7-ae54-e7fa76414d3d",
    "62260726-38b5-4ba7-baab-5da224758336",
  ],
} as const;

export type PublicQuarantineType = keyof typeof PUBLIC_QUARANTINED_IDS;

/** 发布验收夹具的保留前缀。任何带此前缀的标题都不得进入公开内容流。 */
export const PUBLIC_QA_TITLE_PREFIX = "QA_";

const PUBLIC_QUARANTINED_ID_SETS: Record<PublicQuarantineType, ReadonlySet<string>> = {
  product: new Set(PUBLIC_QUARANTINED_IDS.product),
  course: new Set(PUBLIC_QUARANTINED_IDS.course),
  video: new Set(PUBLIC_QUARANTINED_IDS.video),
  circle: new Set(PUBLIC_QUARANTINED_IDS.circle),
  article: new Set(PUBLIC_QUARANTINED_IDS.article),
  post: new Set(PUBLIC_QUARANTINED_IDS.post),
};

/** 返回可安全传给 Prisma `notIn` 的可变数组副本。 */
export function publicQuarantinedIds(type: PublicQuarantineType): string[] {
  return [...PUBLIC_QUARANTINED_IDS[type]];
}

/** 判断统一信封/搜索结果是否命中公开隔离清单。未知类型一律放行（fail-open）。 */
export function isPublicContentQuarantined(type: string, id: string): boolean {
  const normalizedType = type.trim().toLowerCase() as PublicQuarantineType;
  const set = PUBLIC_QUARANTINED_ID_SETS[normalizedType];
  return set?.has(id) ?? false;
}

/** 精确识别发布验收夹具；仅匹配保留前缀，不按普通英文标题做模糊拦截。 */
export function isPublicQaFixtureTitle(title?: string | null): boolean {
  return String(title || "").trim().toUpperCase().startsWith(PUBLIC_QA_TITLE_PREFIX);
}
