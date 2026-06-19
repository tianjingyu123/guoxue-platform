// API 基础配置
const API_BASE = '/api/v1'

// 通用请求函数
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }
  
  return response.json()
}

// 系统API
export const systemApi = {
  getBanners: (position?: 'home' | 'splash' | 'discover') => 
    request<Banner[]>(`/system/banners${position ? `?position=${position}` : ''}`),
  getConfig: () => request<{ data: SystemConfig }>('/system/config'),
}

// 推荐API
export const recommendApi = {
  getScene: (scene: string) => request<{ data: any[] }>(`/recommend/scene/${scene}`),
  personalized: (params?: { page?: number; pageSize?: number }) => 
    request<{ data: any[]; total: number }>(`/recommend/personalized?page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  defaultInterests: () =>
    request<InterestTag[]>('/recommend/default-interests'),
  setInterests: (tagIds: string[]) =>
    request<{ success: boolean }>('/recommend/interests', {
      method: 'POST',
      body: JSON.stringify({ tagIds }),
    }),
}

// AI API
export const aiApi = {
  smartFeed: (params?: { page?: number; pageSize?: number }) => 
    request<{ data: FeedItem[]; total: number }>(`/ai/smart-feed?page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  markNotInterested: (itemId: string) => 
    request<{ success: boolean }>('/ai/not-interested', {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    }),
  polish: (content: string) => request<{ polished: string; changes: string[] }>('/ai/polish', {
    method: 'POST',
    body: JSON.stringify({ content }),
  }),
  optimizeTitle: (title: string, content: string) => request<{ suggestions: string[] }>('/ai/optimize-title', {
    method: 'POST',
    body: JSON.stringify({ title, content }),
  }),
  suggestTags: (content: string) => request<{ tags: string[] }>('/ai/suggest-tags', {
    method: 'POST',
    body: JSON.stringify({ content }),
  }),
  generateCover: (prompt: string) => request<{ imageUrl: string }>('/ai/generate-cover', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  }),
}

// 小程序首页API
export const miniApi = {
  home: () => request<{ banners: Banner[]; quickEntries: QuickEntry[]; feeds: FeedItem[] }>('/mini/home'),
}

// 课程API
export const courseApi = {
  list: (params?: { category?: string; page?: number; pageSize?: number; sort?: string }) =>
    request<{ data: Course[]; total: number }>(`/courses?category=${params?.category || ''}&page=${params?.page || 1}&pageSize=${params?.pageSize || 20}&sort=${params?.sort || 'recommend'}`),
  getCategories: () => request<CourseCategory[]>('/courses/categories'),
  detail: (id: string) => request<CourseDetail>(`/courses/${id}`),
  chapters: (id: string) => request<Chapter[]>(`/courses/${id}/chapters`),
  getRating: (id: string) => request<{ average: number; count: number; distribution: number[] }>(`/courses/${id}/rating`),
  getReviews: (id: string, params?: { page?: number; pageSize?: number }) =>
    request<{ data: CourseReview[]; total: number }>(`/courses/${id}/reviews?page=${params?.page || 1}&pageSize=${params?.pageSize || 10}`),
  checkAccess: (id: string) => request<{ hasAccess: boolean; progress?: number }>(`/courses/${id}/access`),
  purchase: (id: string) => request<{ orderId: string; payUrl: string }>(`/courses/${id}/purchase`, { method: 'POST' }),
  myProgress: (id: string) => request<CourseProgress>(`/courses/${id}/my-progress`),
  getQuestions: (id: string, params?: { page?: number; pageSize?: number }) =>
    request<{ data: CourseQuestion[]; total: number }>(`/courses/${id}/questions?page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  askQuestion: (id: string, content: string, chapterId?: string) =>
    request<CourseQuestion>(`/courses/${id}/questions`, {
      method: 'POST',
      body: JSON.stringify({ content, chapterId }),
    }),
  chapterContent: (chapterId: string) =>
    request<ChapterContent>(`/courses/chapters/${chapterId}`),
  updateProgress: (courseId: string, lessonId: string, progress: number, duration: number) =>
    request<{ success: boolean }>(`/courses/${courseId}/progress`, {
      method: 'POST',
      body: JSON.stringify({ lessonId, progress, duration }),
    }),
  addNote: (courseId: string, data: { lessonId: string; content: string; timestamp?: number }) =>
    request<CourseNote>(`/courses/${courseId}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getWorkRequirement: (chapterId: string) =>
    request<WorkRequirement>(`/courses/chapters/${chapterId}/work`),
  submitWork: (chapterId: string, content: string, images: string[]) =>
    request<{ success: boolean; workId: string }>(`/courses/chapters/${chapterId}/work`, {
      method: 'POST',
      body: JSON.stringify({ content, images }),
    }),
  getWorks: (courseId: string, chapterId?: string) =>
    request<WorkResult[]>(`/courses/${courseId}/works${chapterId ? `?chapterId=${chapterId}` : ''}`),
  getWorkDetail: (workId: string) =>
    request<WorkResult>(`/courses/works/${workId}`),
  // 讲师端API
  getPendingWorks: (courseId: string, params?: { page?: number; pageSize?: number; status?: string }) =>
    request<{ data: WorkSubmission[]; total: number }>(`/courses/${courseId}/works/pending?page=${params?.page || 1}&pageSize=${params?.pageSize || 20}&status=${params?.status || 'all'}`),
  reviewWork: (workId: string, data: { score: number; comment: string; suggestions?: string[]; status: 'graded' | 'returned' }) =>
    request<{ success: boolean }>(`/courses/works/${workId}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  batchReviewWorks: (workIds: string[], data: { score: number; comment: string }) =>
    request<{ success: boolean; count: number }>('/courses/works/batch-review', {
      method: 'POST',
      body: JSON.stringify({ workIds, ...data }),
    }),
  certificate: (courseId: string) =>
    request<Certificate>(`/courses/${courseId}/certificate`),
  complete: (courseId: string) =>
    request<{ success: boolean; certificateId: string }>(`/courses/${courseId}/complete`, { method: 'POST' }),
  myCourses: (params?: { status?: 'learning' | 'completed'; page?: number; pageSize?: number }) =>
    request<{ data: MyCourse[]; total: number }>(`/courses/my?status=${params?.status || ''}&page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  getUserValidCourses: () =>
    request<MyCourse[]>('/courses/my/valid'),
  dashboard: () =>
    request<LearningDashboard>('/courses/my/dashboard'),
}

// 商城API
export const shopApi = {
  myCoupons: (params?: { available?: boolean }) =>
    request<Coupon[]>(`/shop/my-coupons${params?.available ? '?available=true' : ''}`),
  products: (params?: { category?: string; page?: number; pageSize?: number; sort?: string }) =>
    request<{ data: Product[]; total: number }>(`/shop/products?category=${params?.category || ''}&page=${params?.page || 1}&pageSize=${params?.pageSize || 20}&sort=${params?.sort || 'recommend'}`),
  categoryTree: () => request<ProductCategory[]>('/shop/categories'),
  productDetail: (id: string) => request<ProductDetail>(`/shop/products/${id}`),
  listReviews: (id: string, params?: { page?: number; pageSize?: number }) =>
    request<{ data: ProductReview[]; total: number; average: number }>(`/shop/products/${id}/reviews?page=${params?.page || 1}&pageSize=${params?.pageSize || 10}`),
  addToCart: (productId: string, skuId: string, quantity: number) =>
    request<{ success: boolean; cartCount: number }>('/shop/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, skuId, quantity }),
    }),
  homeBanners: () => request<ShopBanner[]>('/shop/banners'),
  categoryProducts: (categoryId: string, params?: { page?: number; pageSize?: number }) =>
    request<{ data: Product[]; total: number }>(`/shop/categories/${categoryId}/products?page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  getCart: () => request<CartData>('/shop/cart'),
  updateCartItem: (itemId: string, quantity: number) =>
    request<{ success: boolean }>(`/shop/cart/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    }),
  removeCartItem: (itemId: string) =>
    request<{ success: boolean }>(`/shop/cart/${itemId}`, { method: 'DELETE' }),
  clearCart: () => request<{ success: boolean }>('/shop/cart', { method: 'DELETE' }),
  batchRemoveCartItems: (itemIds: string[]) =>
    request<{ success: boolean }>('/shop/cart/batch-remove', {
      method: 'POST',
      body: JSON.stringify({ itemIds }),
    }),
  listAddresses: () => request<ShippingAddress[]>('/shop/addresses'),
  createOrder: (data: CreateOrderData) =>
    request<{ orderId: string; payUrl?: string }>('/shop/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  calcOrderPrice: (data: { itemIds: string[]; couponId?: string; addressId?: string }) =>
    request<OrderPriceResult>('/shop/orders/calc-price', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteAddress: (id: string) =>
    request<{ success: boolean }>(`/shop/addresses/${id}`, { method: 'DELETE' }),
  setDefaultAddress: (id: string) =>
    request<{ success: boolean }>(`/shop/addresses/${id}/default`, { method: 'POST' }),
  createAddress: (data: Omit<ShippingAddress, 'id'>) =>
    request<{ success: boolean; id: string }>('/shop/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAddress: (id: string, data: Partial<ShippingAddress>) =>
    request<{ success: boolean }>(`/shop/addresses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  listCoupons: () => request<CouponCenter[]>('/shop/coupons/center'),
  claimCoupon: (id: string) =>
    request<{ success: boolean }>(`/shop/coupons/${id}/claim`, { method: 'POST' }),
  applyAfterSale: (orderId: string, data: AfterSaleApplication) =>
    request<{ success: boolean; afterSaleId: string }>(`/shop/orders/${orderId}/after-sale`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  afterSaleDetail: (id: string) => request<AfterSaleDetail>(`/shop/after-sales/${id}`),
  cancelAfterSale: (id: string) =>
    request<{ success: boolean }>(`/shop/after-sales/${id}/cancel`, { method: 'POST' }),
  applyExchange: (orderId: string, data: ExchangeApplication) =>
    request<{ success: boolean; exchangeId: string }>(`/shop/orders/${orderId}/exchange`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  exchangeDetail: (id: string) => request<ExchangeDetail>(`/shop/exchanges/${id}`),
  getOrderProducts: (orderId: string) => request<OrderProduct[]>(`/shop/orders/${orderId}/products`),
  myAfterSales: (params?: { status?: string; page?: number; pageSize?: number }) =>
    request<{ data: AfterSaleListItem[]; total: number }>(`/shop/after-sales/my?status=${params?.status || ''}&page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  getLogistics: (orderId: string) => request<LogisticsDetail>(`/shop/orders/${orderId}/logistics`),
  myOrders: (params?: { status?: string; page?: number; pageSize?: number }) =>
    request<{ data: OrderListItem[]; total: number }>(`/shop/orders/my?status=${params?.status || ''}&page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  orderDetail: (id: string) => request<OrderDetail>(`/shop/orders/${id}`),
  cancelOrder: (id: string, reason?: string) =>
    request<{ success: boolean }>(`/shop/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  confirmReceive: (id: string) =>
    request<{ success: boolean }>(`/shop/orders/${id}/confirm`, { method: 'POST' }),
  buyAgain: (id: string) =>
    request<{ success: boolean; cartCount: number }>(`/shop/orders/${id}/buy-again`, { method: 'POST' }),
}

// 发票API
export const invoiceApi = {
  getApplicableOrders: () => request<InvoiceOrder[]>('/invoices/applicable-orders'),
  myInvoices: (params?: { status?: string; page?: number; pageSize?: number }) =>
    request<{ data: Invoice[]; total: number }>(`/invoices/my?status=${params?.status || ''}&page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  apply: (data: InvoiceApplication) =>
    request<{ success: boolean; invoiceId: string }>('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  detail: (id: string) => request<InvoiceDetail>(`/invoices/${id}`),
  download: (id: string) => request<{ downloadUrl: string }>(`/invoices/${id}/download`),
}

// 纠纷申诉API
export const disputeApi = {
  create: (data: DisputeApplication) =>
    request<{ success: boolean; disputeId: string }>('/disputes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  detail: (id: string) => request<DisputeDetail>(`/disputes/${id}`),
  myDisputes: (params?: { status?: string; page?: number; pageSize?: number }) =>
    request<{ data: DisputeListItem[]; total: number }>(`/disputes/my?status=${params?.status || ''}&page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  addEvidence: (disputeId: string, data: { type: string; description: string; images: string[] }) =>
    request<{ success: boolean }>(`/disputes/${disputeId}/evidence`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  cancel: (id: string) =>
    request<{ success: boolean }>(`/disputes/${id}/cancel`, { method: 'POST' }),
}

// 钱包/交易记录API
export const walletApi = {
  getBalance: () => request<WalletBalance>('/wallet/balance'),
  getTransactions: (params?: { type?: string; month?: string; page?: number; pageSize?: number }) =>
    request<{ data: WalletTransaction[]; total: number }>(`/wallet/transactions?type=${params?.type || ''}&month=${params?.month || ''}&page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  getTransactionDetail: (id: string) => request<WalletTransactionDetail>(`/wallet/transactions/${id}`),
  getPointsRecords: (params?: { type?: string; month?: string; page?: number; pageSize?: number }) =>
    request<{ data: PointsRecord[]; total: number }>(`/wallet/points?type=${params?.type || ''}&month=${params?.month || ''}&page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  getBillSummary: (period: string) => request<BillSummary>(`/wallet/bill?period=${period}`),
  exportBill: (period: string) => request<{ downloadUrl: string }>(`/wallet/bill/export?period=${period}`),
}

// 直播API
export const liveApi = {
  rooms: (params?: { status?: string; page?: number; pageSize?: number }) =>
    request<{ data: LiveRoom[]; total: number }>(`/live/rooms?status=${params?.status || ''}&page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  roomDetail: (id: string) => request<LiveRoomDetail>(`/live/rooms/${id}`),
  subscribe: (id: string) => request<{ success: boolean }>(`/live/rooms/${id}/subscribe`, { method: 'POST' }),
  unsubscribe: (id: string) => request<{ success: boolean }>(`/live/rooms/${id}/unsubscribe`, { method: 'POST' }),
  sendGift: (roomId: string, giftId: string, count: number) =>
    request<{ success: boolean }>(`/live/rooms/${roomId}/gift`, {
      method: 'POST',
      body: JSON.stringify({ giftId, count }),
    }),
  sendMessage: (roomId: string, message: string) =>
    request<{ success: boolean }>(`/live/rooms/${roomId}/message`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  createRoom: (data: CreateLiveRoomData) =>
    request<{ success: boolean; roomId: string }>('/live/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateRoom: (id: string, data: Partial<CreateLiveRoomData>) =>
    request<{ success: boolean }>(`/live/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getCategories: () => request<LiveCategory[]>('/live/categories'),
  getStreamConfig: (roomId: string) => request<StreamConfig>(`/live/rooms/${roomId}/stream-config`),
  checkStreamStatus: (roomId: string) => request<StreamStatus>(`/live/rooms/${roomId}/stream-status`),
  book: (roomId: string) => request<{ success: boolean; bookedCount: number }>(`/live/rooms/${roomId}/book`, { method: 'POST' }),
  unbook: (roomId: string) => request<{ success: boolean; bookedCount: number }>(`/live/rooms/${roomId}/unbook`, { method: 'POST' }),
  getSlides: (roomId: string) => request<LiveSlide[]>(`/live/rooms/${roomId}/slides`),
  applyMic: (roomId: string) => request<{ success: boolean; queuePosition: number }>(`/live/rooms/${roomId}/mic/apply`, { method: 'POST' }),
  cancelMic: (roomId: string) => request<{ success: boolean }>(`/live/rooms/${roomId}/mic/cancel`, { method: 'POST' }),
  getQuestions: (roomId: string, status?: string) => request<LiveQuestion[]>(`/live/rooms/${roomId}/questions?status=${status || ''}`),
  askQuestion: (roomId: string, content: string, isPublic: boolean) =>
    request<{ success: boolean; questionId: string }>(`/live/rooms/${roomId}/questions`, {
      method: 'POST',
      body: JSON.stringify({ content, isPublic }),
    }),
  getHostStats: () => request<HostLiveStats>('/live/host/stats'),
  getHostRooms: (params?: { page?: number; pageSize?: number }) =>
    request<{ data: HostLiveRoom[]; total: number }>(`/live/host/rooms?page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  getHostTrend: (days?: number) => request<HostLiveTrend[]>(`/live/host/trend?days=${days || 30}`),
}

// 短视频API
export const videoApi = {
  list: (params?: { page?: number; pageSize?: number; category?: string }) =>
    request<{ data: ShortVideo[]; total: number; hasMore: boolean }>(`/videos?page=${params?.page || 1}&pageSize=${params?.pageSize || 10}&category=${params?.category || ''}`),
  detail: (id: string) => request<ShortVideo>(`/videos/${id}`),
  like: (id: string) => request<{ success: boolean; likes: number }>(`/videos/${id}/like`, { method: 'POST' }),
  unlike: (id: string) => request<{ success: boolean; likes: number }>(`/videos/${id}/unlike`, { method: 'POST' }),
  collect: (id: string) => request<{ success: boolean }>(`/videos/${id}/collect`, { method: 'POST' }),
  uncollect: (id: string) => request<{ success: boolean }>(`/videos/${id}/uncollect`, { method: 'POST' }),
  getComments: (id: string, page?: number) => request<{ data: VideoComment[]; total: number }>(`/videos/${id}/comments?page=${page || 1}`),
  addComment: (id: string, content: string, parentId?: string) =>
    request<{ success: boolean; commentId: string }>(`/videos/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentId }),
    }),
  getUploadSignature: () => request<VideoUploadSignature>('/videos/upload-signature'),
  create: (data: CreateVideoData) =>
    request<{ success: boolean; videoId: string }>('/videos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  searchProducts: (keyword: string) => request<VideoProduct[]>(`/videos/products/search?keyword=${keyword}`),
}

// 搜索API
export const searchApi = {
  hot: () => request<HotSearch[]>('/search/hot'),
  history: () => request<string[]>('/search/history'),
  clearHistory: () => request<{ success: boolean }>('/search/history', { method: 'DELETE' }),
  suggest: (keyword: string) => request<SearchSuggestion[]>(`/search/suggest?keyword=${keyword}`),
  search: (params: SearchParams) =>
    request<SearchResult>(`/search?keyword=${params.keyword}&type=${params.type || 'all'}&page=${params.page || 1}&pageSize=${params.pageSize || 20}`),
  aiSearch: (keyword: string) => request<AISearchResult>(`/search/ai?keyword=${keyword}`),
  semanticSearch: (keyword: string) => request<SemanticSearchResult>(`/search/semantic?keyword=${keyword}`),
  transcribe: (audioBlob: Blob) => {
    const formData = new FormData()
    formData.append('audio', audioBlob)
    return fetch('/api/search/transcribe', { method: 'POST', body: formData })
      .then(res => res.json() as Promise<TranscribeResult>)
  },
}

// 付费问答API
export const questionApi = {
  list: (params?: { status?: string; circleId?: string; page?: number; pageSize?: number }) =>
    request<{ data: Question[]; total: number }>(`/questions?status=${params?.status || ''}&circleId=${params?.circleId || ''}&page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  detail: (id: string) => request<QuestionDetail>(`/questions/${id}`),
  ask: (data: AskQuestionData) =>
    request<{ success: boolean; questionId: string }>('/questions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  answer: (id: string, content: string, isPublic: boolean) =>
    request<{ success: boolean }>(`/questions/${id}/answer`, {
      method: 'POST',
      body: JSON.stringify({ content, isPublic }),
    }),
  pay: (id: string) => request<{ success: boolean; paymentUrl?: string }>(`/questions/${id}/pay`, { method: 'POST' }),
  rate: (id: string, rating: number, comment?: string) =>
    request<{ success: boolean }>(`/questions/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    }),
  myQuestions: (params?: { type?: 'asked' | 'answered'; page?: number }) =>
    request<{ data: Question[]; total: number }>(`/questions/my?type=${params?.type || 'asked'}&page=${params?.page || 1}`),
  peek: (id: string) => request<{ success: boolean; answer: string }>(`/questions/${id}/peek`, { method: 'POST' }),
  reject: (id: string, reason: string) =>
    request<{ success: boolean }>(`/questions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  getPeekUsers: (id: string) => request<PeekUser[]>(`/questions/${id}/peek-users`),
}

// 悬赏API
export const bountyApi = {
  list: (params?: { status?: string; page?: number; pageSize?: number }) =>
    request<{ data: Bounty[]; total: number }>(`/bounties?status=${params?.status || ''}&page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  detail: (id: string) => request<BountyDetail>(`/bounties/${id}`),
  create: (data: CreateBountyData) =>
    request<{ success: boolean; bountyId: string }>('/bounties', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  answer: (id: string, content: string) =>
    request<{ success: boolean; answerId: string }>(`/bounties/${id}/answers`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  accept: (bountyId: string, answerId: string) =>
    request<{ success: boolean }>(`/bounties/${bountyId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ answerId }),
    }),
  myBounties: (params?: { type?: 'posted' | 'answered'; page?: number }) =>
    request<{ data: Bounty[]; total: number }>(`/bounties/my?type=${params?.type || 'posted'}&page=${params?.page || 1}`),
  claim: (id: string) => request<{ success: boolean }>(`/bounties/${id}/claim`, { method: 'POST' }),
  settle: (id: string) => request<{ success: boolean }>(`/bounties/${id}/settle`, { method: 'POST' }),
  refund: (id: string) => request<{ success: boolean }>(`/bounties/${id}/refund`, { method: 'POST' }),
  likeAnswer: (bountyId: string, answerId: string) =>
    request<{ success: boolean; likes: number }>(`/bounties/${bountyId}/answers/${answerId}/like`, { method: 'POST' }),
}

// 支付方式API
export const paymentMethodApi = {
  list: () => request<PaymentMethod[]>('/payment-methods'),
  add: (type: string, data: Record<string, string>) =>
    request<{ success: boolean; methodId: string }>('/payment-methods', {
      method: 'POST',
      body: JSON.stringify({ type, ...data }),
    }),
  setDefault: (id: string) =>
    request<{ success: boolean }>(`/payment-methods/${id}/default`, { method: 'POST' }),
  remove: (id: string) =>
    request<{ success: boolean }>(`/payment-methods/${id}`, { method: 'DELETE' }),
}

// 支付API
export const payApi = {
  jsapiPay: (orderId: string, payMethod: string) =>
    request<PaymentParams>(`/pay/jsapi`, {
      method: 'POST',
      body: JSON.stringify({ orderId, payMethod }),
    }),
  queryPaymentStatus: (orderId: string) =>
    request<PaymentStatus>(`/pay/status/${orderId}`),
  cancelPayment: (orderId: string) =>
    request<{ success: boolean }>(`/pay/${orderId}/cancel`, { method: 'POST' }),
}

// 营销活动API
export const marketingApi = {
  flashSales: () => request<FlashSale[]>('/marketing/flash-sales'),
  groupBuys: () => request<GroupBuy[]>('/marketing/group-buys'),
  flashSaleDetail: (id: string) => request<FlashSaleDetail>(`/marketing/flash-sales/${id}`),
  groupBuyDetail: (id: string) => request<GroupBuyDetail>(`/marketing/group-buys/${id}`),
  joinGroupBuy: (groupId: string) =>
    request<{ success: boolean; orderId: string }>(`/marketing/group-buys/${groupId}/join`, { method: 'POST' }),
  createGroupBuy: (productId: string) =>
    request<{ success: boolean; groupId: string; shareUrl: string }>('/marketing/group-buys', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    }),
  myGroupBuys: () => request<MyGroupBuy[]>('/marketing/group-buys/my'),
}

// 价格计算API
export const pricingApi = {
  calcPrice: (data: { productId: string; productType: string; couponId?: string }) =>
    request<PriceCalcResult>('/pricing/calc', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createOrder: (data: { productId: string; productType: string; couponId?: string; payMethod: string }) =>
    request<{ orderId: string; payUrl: string; payParams?: any }>('/pricing/order', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// 上传API
export const uploadApi = {
  images: (files: File[]) => {
    const formData = new FormData()
    files.forEach(file => formData.append('images', file))
    return fetch(`${API_BASE}/upload/images`, {
      method: 'POST',
      body: formData,
    }).then(res => res.json()) as Promise<{ urls: string[] }>
  },
}

// 圈子API
export const circleApi = {
  list: (params?: { category?: string; page?: number; pageSize?: number }) =>
    request<{ data: Circle[]; total: number }>(`/circles?category=${params?.category || ''}&page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  my: () => request<Circle[]>('/circles/my'),
  getRanking: () => request<Circle[]>('/circles/ranking'),
  detail: (id: string) => request<CircleDetail>(`/circles/${id}`),
  join: (id: string) => request<{ success: boolean }>(`/circles/${id}/join`, { method: 'POST' }),
  leave: (id: string) => request<{ success: boolean }>(`/circles/${id}/leave`, { method: 'POST' }),
  posts: (id: string, params?: { page?: number; pageSize?: number; type?: 'all' | 'featured' }) =>
    request<{ data: CirclePost[]; total: number }>(`/circles/${id}/posts?page=${params?.page || 1}&pageSize=${params?.pageSize || 20}&type=${params?.type || 'all'}`),
  getAnnouncement: (id: string) => request<{ content: string; updatedAt: string }>(`/circles/${id}/announcement`),
  listMembers: (id: string, params?: { page?: number; pageSize?: number }) =>
    request<{ data: CircleMember[]; total: number }>(`/circles/${id}/members?page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  getJoinStatus: (id: string) => request<CircleJoinStatus>(`/circles/${id}/join-status`),
  preview: (id: string) => request<CirclePreview>(`/circles/${id}/preview`),
  getPostDetail: (circleId: string, postId: string) => request<CirclePostDetail>(`/circles/${circleId}/posts/${postId}`),
  // 圈子管理API
  update: (id: string, data: Partial<CircleDetail>) =>
    request<{ success: boolean }>(`/circles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateMemberRole: (circleId: string, memberId: string, role: 'admin' | 'member') =>
    request<{ success: boolean }>(`/circles/${circleId}/members/${memberId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
  removeMember: (circleId: string, memberId: string) =>
    request<{ success: boolean }>(`/circles/${circleId}/members/${memberId}`, { method: 'DELETE' }),
  setAnnouncement: (id: string, content: string) =>
    request<{ success: boolean }>(`/circles/${id}/announcement`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),
  toggleEssence: (circleId: string, postId: string) =>
    request<{ success: boolean; isEssence: boolean }>(`/circles/${circleId}/posts/${postId}/essence`, { method: 'POST' }),
  toggleTop: (circleId: string, postId: string) =>
    request<{ success: boolean; isPinned: boolean }>(`/circles/${circleId}/posts/${postId}/top`, { method: 'POST' }),
  deletePost: (circleId: string, postId: string) =>
    request<{ success: boolean }>(`/circles/${circleId}/posts/${postId}`, { method: 'DELETE' }),
  getStats: (id: string) => request<CircleStats>(`/circles/${id}/stats`),
  // 入圈申请相��
  listJoinRequests: (id: string, params?: { status?: 'pending' | 'approved' | 'rejected'; page?: number; pageSize?: number }) =>
    request<{ data: JoinRequest[]; total: number }>(`/circles/${id}/join-requests?status=${params?.status || 'pending'}&page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  approveJoinRequest: (circleId: string, requestId: string) =>
    request<{ success: boolean }>(`/circles/${circleId}/join-requests/${requestId}/approve`, { method: 'POST' }),
  rejectJoinRequest: (circleId: string, requestId: string, reason?: string) =>
    request<{ success: boolean }>(`/circles/${circleId}/join-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  batchApproveRequests: (circleId: string, requestIds: string[]) =>
    request<{ success: boolean; count: number }>(`/circles/${circleId}/join-requests/batch-approve`, {
      method: 'POST',
      body: JSON.stringify({ requestIds }),
    }),
  // 公告相关
  listAnnouncements: (id: string) => request<Announcement[]>(`/circles/${id}/announcements`),
  markAnnouncementRead: (circleId: string, announcementId: string) =>
    request<{ success: boolean }>(`/circles/${circleId}/announcements/${announcementId}/read`, { method: 'POST' }),
  // 邀请码相关
  generateInviteCode: (id: string, maxUses: number) =>
    request<InviteCode>(`/circles/${id}/invite-codes`, {
      method: 'POST',
      body: JSON.stringify({ maxUses }),
    }),
  listMyInviteCodes: (id: string) => request<InviteCode[]>(`/circles/${id}/invite-codes`),
  getInvitationStats: (id: string) => request<InvitationStats>(`/circles/${id}/invitation-stats`),
  disableInviteCode: (circleId: string, codeId: string) =>
    request<{ success: boolean }>(`/circles/${circleId}/invite-codes/${codeId}/disable`, { method: 'POST' }),
  deleteInviteCode: (circleId: string, codeId: string) =>
    request<{ success: boolean }>(`/circles/${circleId}/invite-codes/${codeId}`, { method: 'DELETE' }),
  // 知识库相关
  listKnowledge: (id: string, params?: { status?: 'confirmed' | 'pending'; page?: number; pageSize?: number; keyword?: string }) =>
    request<{ data: KnowledgeItem[]; total: number }>(`/circles/${id}/knowledge?status=${params?.status || 'confirmed'}&page=${params?.page || 1}&pageSize=${params?.pageSize || 20}&keyword=${params?.keyword || ''}`),
  confirmKnowledge: (circleId: string, knowledgeId: string) =>
    request<{ success: boolean }>(`/circles/${circleId}/knowledge/${knowledgeId}/confirm`, { method: 'POST' }),
  ignoreKnowledge: (circleId: string, knowledgeId: string) =>
    request<{ success: boolean }>(`/circles/${circleId}/knowledge/${knowledgeId}/ignore`, { method: 'POST' }),
  // 连麦预约相关
  getExperts: (id: string) => request<Expert[]>(`/circles/${id}/experts`),
  getExpertSlots: (circleId: string, expertId: string, date: string) =>
    request<TimeSlot[]>(`/circles/${circleId}/experts/${expertId}/slots?date=${date}`),
  createBooking: (circleId: string, data: { expertId: string; date: string; slotId: string; topic: string; duration: number }) =>
    request<{ bookingId: string; orderId: string; payUrl?: string }>(`/circles/${circleId}/bookings`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// 圈主数据��板API
export const circleDashboardApi = {
  overview: (circleId: string) => request<CircleDashboardOverview>(`/circles/${circleId}/dashboard/overview`),
  trends: (circleId: string, days?: number) => request<CircleTrend[]>(`/circles/${circleId}/dashboard/trends?days=${days || 30}`),
  topContributors: (circleId: string, limit?: number) => request<Contributor[]>(`/circles/${circleId}/dashboard/contributors?limit=${limit || 5}`),
  hotContent: (circleId: string, limit?: number) => request<HotPost[]>(`/circles/${circleId}/dashboard/hot-content?limit=${limit || 5}`),
  churnWarning: (circleId: string) => request<ChurnWarning[]>(`/circles/${circleId}/dashboard/churn-warning`),
  revenueBreakdown: (circleId: string) => request<RevenueBreakdown>(`/circles/${circleId}/dashboard/revenue`),
}

// 话题API
export const topicApi = {
  detail: (id: string) => request<Topic>(`/topics/${id}`),
  posts: (id: string, params?: { sort?: 'latest' | 'hot'; page?: number; pageSize?: number }) =>
    request<{ data: TopicPost[]; total: number }>(`/topics/${id}/posts?sort=${params?.sort || 'latest'}&page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  follow: (id: string) => request<{ success: boolean; followed: boolean }>(`/topics/${id}/follow`, { method: 'POST' }),
  hot: () => request<Topic[]>('/topics/hot'),
}

// 内容创作API
export const contentApi = {
  create: (data: CreateContentData) =>
    request<{ id: string; success: boolean }>('/contents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<CreateContentData>) =>
    request<{ success: boolean }>(`/contents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getDraft: (id?: string) => request<DraftContent | null>(`/contents/draft${id ? `?id=${id}` : ''}`),
  saveDraft: (data: CreateContentData) =>
    request<{ draftId: string }>('/contents/draft', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMyCircles: () => request<{ id: string; name: string; cover: string }[]>('/contents/my-circles'),
  // 投稿审核相关
  mySubmissions: (params?: { status?: 'pending' | 'approved' | 'rejected'; page?: number; pageSize?: number }) =>
    request<{ data: Submission[]; total: number }>(`/contents/submissions?status=${params?.status || ''}&page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  resubmit: (id: string) => request<{ success: boolean }>(`/contents/${id}/resubmit`, { method: 'POST' }),
  drafts: () => request<DraftContent[]>('/contents/drafts'),
  // 创作者相关
  myContents: (params?: { page?: number; pageSize?: number; status?: string }) =>
    request<{ data: MyContent[]; total: number }>(`/contents/my?page=${params?.page || 1}&pageSize=${params?.pageSize || 20}&status=${params?.status || ''}`),
  deleteContent: (id: string) => request<{ success: boolean }>(`/contents/${id}`, { method: 'DELETE' }),
}

// 收益API
export const revenueApi = {
  summary: () => request<RevenueSummary>('/revenue/summary'),
  trends: (days?: number) => request<RevenueTrend[]>(`/revenue/trends?days=${days || 30}`),
  withdraw: (amount: number) => request<{ success: boolean; withdrawId: string }>('/revenue/withdraw', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  }),
}

// 智能体Bot API
export const botApi = {
  circleBots: (circleId: string) => request<CircleBot[]>(`/circles/${circleId}/bots`),
  botDetail: (botId: string) => request<CircleBotDetail>(`/bots/${botId}`),
  chat: (botId: string, message: string, sessionId?: string) =>
    request<{ reply: string; sessionId: string }>(`/bots/${botId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
    }),
}

// 内容互动API
export const interactionApi = {
  like: (contentId: string, contentType: string) => 
    request<{ success: boolean; liked: boolean }>('/interaction/like', {
      method: 'POST',
      body: JSON.stringify({ contentId, contentType }),
    }),
  collect: (contentId: string, contentType: string) => 
    request<{ success: boolean; collected: boolean }>('/interaction/collect', {
      method: 'POST',
      body: JSON.stringify({ contentId, contentType }),
    }),
}

// 认证API
export const authApi = {
  getProfile: () => request<UserProfile>('/auth/profile'),
  updateProfile: (data: Partial<UserProfile>) => 
    request<UserProfile>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  followUser: (userId: string) =>
    request<{ success: boolean; followed: boolean }>('/auth/follow', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
}

// 内容API
export const contentsApi = {
  detail: (id: string) => request<ContentDetail>(`/contents/${id}`),
  poemAppreciation: (id: string) => request<PoemAppreciation>(`/contents/${id}/appreciation`),
  related: (id: string) => request<FeedItem[]>(`/contents/${id}/related`),
}

// 互动API（评论/点赞/收藏）
export const interactApi = {
  toggleLike: (contentId: string, contentType: string) =>
    request<{ success: boolean; liked: boolean; count: number }>('/interact/like', {
      method: 'POST',
      body: JSON.stringify({ contentId, contentType }),
    }),
  toggleCollect: (contentId: string, contentType: string) =>
    request<{ success: boolean; collected: boolean; count: number }>('/interact/collect', {
      method: 'POST',
      body: JSON.stringify({ contentId, contentType }),
    }),
  comments: (contentId: string, params?: { page?: number; pageSize?: number }) =>
    request<{ data: Comment[]; total: number }>(`/interact/comments/${contentId}?page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`),
  addComment: (contentId: string, content: string, replyTo?: string) =>
    request<Comment>('/interact/comments', {
      method: 'POST',
      body: JSON.stringify({ contentId, content, replyTo }),
    }),
  shareContent: (contentId: string) =>
    request<{ shareUrl: string; posterUrl: string }>(`/interact/share/${contentId}`),
}

// 类型定义
export interface Banner {
  id: string
  image: string
  title: string
  link: string
  linkType: 'page' | 'url' | 'mini_program'
}

export interface QuickEntry {
  id: string
  name: string
  icon: string
  link: string
  badge?: string
}

export interface FeedItem {
  id: string
  type: 'course' | 'article' | 'video' | 'live' | 'product' | 'circle' | 'ebook' | 'post'
  title: string
  cover?: string
  coverRatio?: '3:4' | '4:3' | '16:9'
  author?: string
  authorAvatar?: string
  price?: number
  originalPrice?: number
  likes?: number
  comments?: number
  views?: number
  isLiked?: boolean
  isCollected?: boolean
  [key: string]: any
}

export interface SystemConfig {
  appName: string
  version: string
  announcement?: string
}

export interface InterestTag {
  id: string
  name: string
  category: string
  icon: string
}

export interface UserProfile {
  id: string
  username: string
  nickname?: string
  avatar?: string
  phone?: string
  email?: string
  interests?: string[]
  createdAt: string
}

export interface ContentDetail {
  id: string
  type: 'article' | 'poem' | 'classic' | 'video'
  title: string
  content: string
  cover?: string
  author: {
    id: string
    name: string
    avatar: string
    title?: string
    followers: number
    isFollowed: boolean
  }
  publishedAt: string
  views: number
  likes: number
  collects: number
  comments: number
  isLiked: boolean
  isCollected: boolean
  tags?: string[]
  relatedCircle?: {
    id: string
    name: string
    cover: string
    members: number
  }
}

export interface PoemAppreciation {
  id: string
  translation: string
  annotation: string
  appreciation: string
  authorIntro: string
}

export interface Comment {
  id: string
  content: string
  author: {
    id: string
    name: string
    avatar: string
  }
  createdAt: string
  likes: number
  isLiked: boolean
  replies?: Comment[]
  replyCount?: number
}

export interface Course {
  id: string
  title: string
  cover: string
  instructor: {
    id: string
    name: string
    avatar: string
    title?: string
  }
  price: number
  originalPrice: number
  students: number
  rating: number
  chapters: number
  category: string
  tag?: string
  isFree: boolean
}

export interface CourseCategory {
  id: string
  name: string
  icon?: string
}

export interface CourseDetail extends Course {
  description: string
  objectives: string[]
  suitable: string[]
  outline: Chapter[]
  reviews: CourseReview[]
  isEnrolled: boolean
  progress?: number
}

export interface Chapter {
  id: string
  title: string
  duration: number
  isFree: boolean
  isCompleted?: boolean
  lessons?: Lesson[]
}

export interface Lesson {
  id: string
  title: string
  duration: number
  isFree: boolean
  isCompleted?: boolean
  videoUrl?: string
}

export interface CourseReview {
  id: string
  user: {
    id: string
    name: string
    avatar: string
  }
  rating: number
  content: string
  createdAt: string
}

export interface CourseProgress {
  courseId: string
  completedLessons: string[]
  totalLessons: number
  progressPercent: number
  lastLesson?: {
    id: string
    chapterId: string
    title: string
  }
  studyTime: number
}

export interface CourseQuestion {
  id: string
  content: string
  author: {
    id: string
    name: string
    avatar: string
  }
  chapterTitle?: string
  createdAt: string
  answers: number
  isAnswered: boolean
}

export interface CourseNote {
  id: string
  content: string
  chapterId: string
  chapterTitle: string
  lessonId?: string
  lessonTitle?: string
  timestamp?: number
  createdAt: string
}

export interface ChapterContent {
  id: string
  title: string
  courseId: string
  courseTitle: string
  videoUrl: string
  duration: number
  currentProgress?: number
  nextLesson?: {
    id: string
    title: string
    chapterId: string
  }
  prevLesson?: {
    id: string
    title: string
    chapterId: string
  }
}

export interface WorkRequirement {
  id: string
  title: string
  description: string
  chapterTitle: string
  courseTitle: string
  deadline?: string
  maxImages: number
  minWords: number
}

export interface WorkResult {
  id: string
  chapterId: string
  chapterTitle: string
  courseId: string
  courseTitle: string
  content: string
  images: string[]
  submittedAt: string
  status: 'pending' | 'graded' | 'returned'
  score?: number
  maxScore: number
  teacherComment?: string
  suggestions?: string[]
  gradedAt?: string
  gradedBy?: {
    id: string
    name: string
    avatar: string
  }
  canResubmit: boolean
}

export interface WorkSubmission {
  id: string
  student: {
    id: string
    name: string
    avatar: string
  }
  chapterId: string
  chapterTitle: string
  content: string
  images: string[]
  submittedAt: string
  status: 'pending' | 'graded' | 'returned'
  wordCount: number
}

export interface Certificate {
  id: string
  courseId: string
  courseName: string
  studentName: string
  studentAvatar: string
  completedAt: string
  certificateNo: string
  qrCodeUrl: string
  instructor: string
  totalHours: number
  score?: number
}

export interface Coupon {
  id: string
  name: string
  type: 'discount' | 'amount' | 'percent'
  value: number
  minAmount: number
  maxDiscount?: number
  expireAt: string
  scope: string[]
  isAvailable: boolean
  status?: 'unused' | 'used' | 'expired'
  usedAt?: string
}

export interface CouponCenter {
  id: string
  name: string
  type: 'discount' | 'amount' | 'percent'
  value: number
  minAmount: number
  maxDiscount?: number
  expireAt: string
  scope: string[]
  stock: number
  claimed: number
  isClaimed: boolean
}
  
export interface PriceCalcResult {
  originalPrice: number
  discountAmount: number
  finalPrice: number
  couponUsed?: {
    id: string
    name: string
    discount: number
  }
}

export interface MyCourse {
  id: string
  title: string
  cover: string
  instructor: {
    id: string
    name: string
    avatar: string
  }
  totalLessons: number
  completedLessons: number
  progressPercent: number
  status: 'learning' | 'completed'
  lastStudyAt?: string
  lastLesson?: {
    id: string
    title: string
  }
  certificateId?: string
  purchasedAt: string
}

export interface LearningDashboard {
  totalMinutes: number
  totalCourses: number
  totalNotes: number
  totalWorks: number
  streak: number
  weeklyMinutes: number
  trend: { date: string; minutes: number }[]
  recentRecords: {
    courseId: string
    courseTitle: string
    cover: string
    lessonTitle: string
    studyAt: string
    duration: number
    progress: number
  }[]
}

export interface Circle {
  id: string
  name: string
  cover: string
  description: string
  category: string
  members: number
  posts: number
  isJoined: boolean
  todayActive?: number
  rank?: number
}

export interface CircleDetail extends Circle {
  createdAt: string
  owner: {
    id: string
    name: string
    avatar: string
  }
  rules?: string[]
  announcement?: string
  tags?: string[]
}

export interface CirclePost {
  id: string
  content: string
  images?: string[]
  author: {
    id: string
    name: string
    avatar: string
    title?: string
  }
  createdAt: string
  likes: number
  comments: number
  isLiked: boolean
  isPinned?: boolean
}

export interface CircleMember {
  id: string
  name: string
  avatar: string
  title?: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
  posts: number
}

export interface CircleJoinStatus {
  isJoined: boolean
  isPaid: boolean
  price: number
  originalPrice?: number
  membershipDays?: number
  discount?: string
}

export interface CirclePreview {
  circle: CircleDetail
  featuredPosts: {
    id: string
    content: string
    author: { name: string; avatar: string }
    likes: number
    comments: number
    preview: string
  }[]
  joinStatus: CircleJoinStatus
}

export interface CirclePostDetail {
  id: string
  circleId: string
  circleName: string
  content: string
  images?: string[]
  author: {
    id: string
    name: string
    avatar: string
    title?: string
    isFollowed: boolean
  }
  createdAt: string
  likes: number
  collects: number
  comments: number
  shares: number
  isLiked: boolean
  isCollected: boolean
  isPinned?: boolean
}

export interface Topic {
  id: string
  name: string
  description: string
  cover?: string
  posts: number
  followers: number
  isFollowed: boolean
  createdAt: string
}

export interface TopicPost {
  id: string
  type: 'post' | 'article'
  content: string
  images?: string[]
  author: {
    id: string
    name: string
    avatar: string
  }
  createdAt: string
  likes: number
  comments: number
  isLiked: boolean
  source?: {
    type: 'circle' | 'article'
    id: string
    name: string
  }
}

export interface CircleStats {
  totalMembers: number
  newMembersToday: number
  totalPosts: number
  newPostsToday: number
  activeMembers: number
  essencePosts: number
}

export interface JoinRequest {
  id: string
  user: {
    id: string
    name: string
    avatar: string
    bio?: string
  }
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  processedAt?: string
  rejectReason?: string
}

export interface Announcement {
  id: string
  circleId: string
  circleName: string
  title: string
  content: string
  isPinned: boolean
  isRead: boolean
  readCount: number
  publishedAt: string
  author: {
    id: string
    name: string
    avatar: string
  }
}

export interface InviteCode {
  id: string
  code: string
  maxUses: number
  usedCount: number
  status: 'active' | 'disabled' | 'expired'
  createdAt: string
  expiresAt?: string
  usedBy?: { id: string; name: string; avatar: string; usedAt: string }[]
}

export interface InvitationStats {
  totalInvited: number
  usedCodes: number
  pendingCodes: number
  thisWeek: number
}

export interface KnowledgeItem {
  id: string
  title: string
  summary: string
  content: string
  source: {
    type: 'post' | 'article' | 'manual'
    id?: string
    name: string
  }
  status: 'confirmed' | 'pending' | 'ignored'
  tags?: string[]
  createdAt: string
  confirmedAt?: string
}

export interface Expert {
  id: string
  name: string
  avatar: string
  title: string
  specialty: string[]
  pricePerMinute: number
  rating: number
  sessions: number
  available: boolean
}

export interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  available: boolean
  duration: number
}

export interface CircleDashboardOverview {
  totalMembers: number
  membersGrowth: number
  activeMembers: number
  activeGrowth: number
  totalPosts: number
  postsGrowth: number
  totalRevenue: number
  revenueGrowth: number
}

export interface CircleTrend {
  date: string
  members: number
  posts: number
  active: number
  revenue: number
}

export interface Contributor {
  id: string
  name: string
  avatar: string
  posts: number
  likes: number
  rank: number
}

export interface HotPost {
  id: string
  title: string
  author: string
  views: number
  likes: number
  comments: number
}

export interface ChurnWarning {
  id: string
  name: string
  avatar: string
  lastActive: string
  daysSilent: number
  totalPosts: number
}

export interface RevenueBreakdown {
  total: number
  items: {
    name: string
    value: number
    percent: number
    color: string
  }[]
}

export interface CreateContentData {
  type: 'post' | 'article'
  title: string
  content: string
  cover?: string
  images?: string[]
  circleId?: string
  tags?: string[]
  topics?: string[]
}

export interface DraftContent extends CreateContentData {
  id: string
  updatedAt: string
}

export interface Submission {
  id: string
  title: string
  type: 'post' | 'article'
  cover?: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  reviewedAt?: string
  rejectReason?: string
  targetPosition?: string
  views?: number
  likes?: number
}

export interface MyContent {
  id: string
  type: 'post' | 'article'
  title: string
  cover?: string
  status: 'published' | 'draft' | 'reviewing' | 'rejected'
  publishedAt?: string
  views: number
  likes: number
  comments: number
  revenue: number
}

export interface RevenueSummary {
  totalRevenue: number
  thisMonth: number
  lastMonth: number
  pendingWithdraw: number
  withdrawn: number
  breakdown: { name: string; value: number }[]
}

export interface RevenueTrend {
  date: string
  revenue: number
  type: string
}

export interface CircleBot {
  id: string
  name: string
  avatar: string
  description: string
  category: string
  chats: number
  likes: number
  isOfficial: boolean
  createdAt: string
}

export interface CircleBotDetail extends CircleBot {
  greeting: string
  capabilities: string[]
  examples: string[]
  creator: {
    id: string
    name: string
    avatar: string
  }
}

export interface Product {
  id: string
  name: string
  cover: string
  price: number
  originalPrice: number
  sales: number
  rating: number
  category: string
  tags?: string[]
  isNew?: boolean
  isHot?: boolean
}

export interface ProductCategory {
  id: string
  name: string
  icon: string
  children?: ProductCategory[]
}

export interface ProductDetail extends Product {
  images: string[]
  description: string
  specs: { name: string; value: string }[]
  stock: number
  shipping: string
  reviews: number
  skus: ProductSku[]
}

export interface ProductSku {
  id: string
  name: string
  attrs: { name: string; value: string }[]
  price: number
  originalPrice: number
  stock: number
  image?: string
}

export interface ProductReview {
  id: string
  user: { id: string; name: string; avatar: string }
  rating: number
  content: string
  images?: string[]
  skuName?: string
  createdAt: string
  likes: number
}

export interface ShopBanner {
  id: string
  image: string
  title: string
  link: string
  linkType: 'product' | 'category' | 'activity' | 'url'
}

export interface CartData {
  items: CartItem[]
  totalCount: number
  totalAmount: number
}

export interface CartItem {
  id: string
  productId: string
  productName: string
  productCover: string
  skuId: string
  skuName: string
  price: number
  originalPrice: number
  quantity: number
  stock: number
  selected: boolean
}

export interface ShippingAddress {
  id: string
  name: string
  phone: string
  province: string
  city: string
  district: string
  address: string
  isDefault: boolean
}

export interface CreateOrderData {
  itemIds: string[]
  addressId: string
  couponId?: string
  payMethod: string
  remark?: string
}

export interface OrderPriceResult {
  itemsAmount: number
  shippingFee: number
  couponDiscount: number
  totalAmount: number
  couponUsed?: { id: string; name: string }
}

export interface PaymentMethod {
  id: string
  type: 'wechat' | 'alipay' | 'bank_card'
  name: string
  icon: string
  account: string
  isDefault: boolean
  bindTime: string
  bankName?: string
  cardType?: 'debit' | 'credit'
}

export interface PaymentParams {
  payMethod: string
  orderId: string
  amount: number
  expireTime: string
  payUrl?: string
  appId?: string
  timeStamp?: string
  nonceStr?: string
  package?: string
  signType?: string
  paySign?: string
}

export interface PaymentStatus {
  orderId: string
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired'
  paidAt?: string
  failReason?: string
}

export interface FlashSale {
  id: string
  title: string
  startTime: string
  endTime: string
  status: 'upcoming' | 'ongoing' | 'ended'
  products: {
    id: string
    name: string
    cover: string
    price: number
    originalPrice: number
    stock: number
    sold: number
  }[]
}

export interface FlashSaleDetail extends FlashSale {
  description: string
  rules: string[]
}

export interface GroupBuy {
  id: string
  title: string
  cover: string
  price: number
  originalPrice: number
  minMembers: number
  currentMembers: number
  endTime: string
  status: 'ongoing' | 'success' | 'failed'
}

export interface GroupBuyDetail extends GroupBuy {
  description: string
  members: { id: string; name: string; avatar: string; joinedAt: string }[]
  rules: string[]
}

export interface MyGroupBuy {
  id: string
  productId: string
  productName: string
  productCover: string
  price: number
  status: 'pending' | 'success' | 'failed'
  members: { id: string; name: string; avatar: string }[]
  minMembers: number
  currentMembers: number
  endTime: string
  createdAt: string
  isOwner: boolean
}

export interface AfterSaleApplication {
  type: 'refund_only' | 'refund_with_return'
  reason: string
  amount: number
  description?: string
  images?: string[]
}

export interface AfterSaleDetail {
  id: string
  orderId: string
  orderNo: string
  type: 'refund_only' | 'refund_with_return'
  status: 'pending' | 'approved' | 'rejected' | 'refunding' | 'completed' | 'cancelled'
  reason: string
  amount: number
  description?: string
  images?: string[]
  product: {
    id: string
    name: string
    cover: string
    skuName: string
    price: number
    quantity: number
  }
  timeline: {
    status: string
    title: string
    description?: string
    time: string
    isCurrent: boolean
  }[]
  logistics?: {
    company: string
    trackingNo: string
    address: string
  }
  rejectReason?: string
  createdAt: string
  canCancel: boolean
}

export interface ExchangeApplication {
  productId: string
  reason: string
  exchangeType: 'same' | 'different'
  newSkuId?: string
  description?: string
  images?: string[]
  addressId: string
}

export interface ExchangeDetail {
  id: string
  orderId: string
  orderNo: string
  status: 'pending' | 'approved' | 'shipping' | 'received' | 'completed' | 'rejected' | 'cancelled'
  reason: string
  exchangeType: 'same' | 'different'
  description?: string
  images?: string[]
  originalProduct: OrderProduct
  newProduct?: OrderProduct
  pickupAddress: ShippingAddress
  deliveryAddress: ShippingAddress
  timeline: { status: string; title: string; description?: string; time: string; isCurrent: boolean }[]
  logistics?: { type: 'pickup' | 'delivery'; company: string; trackingNo: string }[]
  rejectReason?: string
  createdAt: string
  canCancel: boolean
}

export interface OrderProduct {
  id: string
  productId: string
  name: string
  cover: string
  skuId: string
  skuName: string
  price: number
  quantity: number
  skus?: ProductSku[]
}

export interface AfterSaleListItem {
  id: string
  orderId: string
  orderNo: string
  type: 'refund_only' | 'refund_with_return'
  status: 'pending' | 'approved' | 'rejected' | 'refunding' | 'completed' | 'cancelled'
  amount: number
  reason: string
  product: {
    id: string
    name: string
    cover: string
    skuName: string
  }
  createdAt: string
  canCancel: boolean
}

export interface LogisticsDetail {
  orderId: string
  orderNo: string
  company: string
  companyLogo?: string
  companyPhone?: string
  trackingNo: string
  status: 'pending' | 'picked' | 'in_transit' | 'delivering' | 'delivered' | 'signed'
  estimatedDelivery?: string
  courierName?: string
  courierPhone?: string
  receiver: {
    name: string
    phone: string
    address: string
  }
  tracks: {
    status: string
    description: string
    time: string
    location?: string
    coordinates?: { lat: number; lng: number }
    isCurrent: boolean
  }[]
}

export interface InvoiceOrder {
  orderId: string
  orderNo: string
  amount: number
  createdAt: string
  productName: string
}

export interface InvoiceApplication {
  orderIds: string[]
  type: 'personal' | 'company'
  title: string
  taxNumber?: string
  amount: number
  email: string
  phone?: string
  remark?: string
}

export interface Invoice {
  id: string
  type: 'personal' | 'company'
  title: string
  taxNumber?: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  email: string
  createdAt: string
  completedAt?: string
  rejectReason?: string
}

export interface InvoiceDetail extends Invoice {
  orders: { orderNo: string; amount: number; productName: string }[]
  invoiceNo?: string
  downloadUrl?: string
}

export interface DisputeApplication {
  orderId: string
  type: 'not_received' | 'not_as_described' | 'quality_issue' | 'other'
  description: string
  images: string[]
  expectation: string
}

export interface DisputeDetail {
  id: string
  orderId: string
  orderNo: string
  type: 'not_received' | 'not_as_described' | 'quality_issue' | 'other'
  status: 'pending' | 'processing' | 'resolved' | 'rejected' | 'cancelled'
  description: string
  images: string[]
  expectation: string
  order: {
    productName: string
    productCover: string
    amount: number
    createdAt: string
  }
  timeline: {
    status: string
    title: string
    description?: string
    time: string
    isCurrent: boolean
  }[]
  resolution?: string
  rejectReason?: string
  createdAt: string
  canCancel: boolean
}

export interface DisputeListItem {
  id: string
  orderId: string
  orderNo: string
  type: 'not_received' | 'not_as_described' | 'quality_issue' | 'other'
  status: 'pending' | 'processing' | 'resolved' | 'rejected' | 'cancelled'
  productName: string
  productCover: string
  createdAt: string
}

export interface OrderListItem {
  id: string
  orderNo: string
  status: 'pending_pay' | 'pending_ship' | 'pending_receive' | 'completed' | 'cancelled' | 'after_sale'
  totalAmount: number
  payAmount: number
  createdAt: string
  paidAt?: string
  shippedAt?: string
  completedAt?: string
  products: {
    id: string
    name: string
    cover: string
    skuName: string
    price: number
    quantity: number
  }[]
  canCancel: boolean
  canConfirm: boolean
  canReview: boolean
  hasAfterSale: boolean
}

export interface OrderDetail extends OrderListItem {
  address: ShippingAddress
  payMethod?: string
  logistics?: {
    company: string
    trackingNo: string
    status: string
  }
  coupon?: { name: string; discount: number }
  remark?: string
  cancelReason?: string
}

export interface WalletBalance {
  coin: number
  points: number
  frozen: number
}

export interface WalletTransaction {
  id: string
  type: 'income' | 'expense'
  category: 'purchase' | 'refund' | 'reward' | 'recharge' | 'withdraw' | 'transfer' | 'other'
  title: string
  description: string
  amount: number
  balance: number
  createdAt: string
  orderId?: string
  orderNo?: string
}

export interface WalletTransactionDetail extends WalletTransaction {
  remark?: string
  relatedInfo?: {
    type: string
    id: string
    name: string
  }
}

export interface PointsRecord {
  id: string
  type: 'income' | 'expense'
  category: 'sign_in' | 'purchase' | 'exchange' | 'reward' | 'expire' | 'other'
  title: string
  description: string
  points: number
  balance: number
  createdAt: string
  expireAt?: string
}

export interface BillSummary {
  period: string
  periodType: 'month' | 'year'
  totalIncome: number
  totalExpense: number
  balance: number
  categories: BillCategory[]
}

export interface BillCategory {
  category: string
  name: string
  icon: string
  color: string
  amount: number
  percent: number
  type: 'income' | 'expense'
  count: number
  items: {
    id: string
    title: string
    amount: number
    createdAt: string
  }[]
}

export interface LiveRoom {
  id: string
  title: string
  cover: string
  status: 'live' | 'preview' | 'replay'
  host: {
    id: string
    name: string
    avatar: string
    followers: number
  }
  viewers: number
  likes: number
  startTime?: string
  endTime?: string
  duration?: number
  category: string
  tags?: string[]
  isSubscribed?: boolean
  isBooked?: boolean
  bookedCount?: number
  estimatedDuration?: number
}

export interface LiveRoomDetail extends LiveRoom {
  description: string
  playUrl?: string
  replayUrl?: string
  gifts: LiveGift[]
  messages: LiveMessage[]
}

export interface LiveGift {
  id: string
  name: string
  icon: string
  price: number
}

export interface LiveMessage {
  id: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  type: 'text' | 'gift' | 'system'
  giftInfo?: { name: string; icon: string; count: number }
  createdAt: string
}

export interface CreateLiveRoomData {
  title: string
  cover: string
  startTime: string
  type: 'knowledge' | 'ecommerce'
  categoryId: string
  description?: string
  tags?: string[]
  isPublic: boolean
}

export interface LiveCategory {
  id: string
  name: string
  icon?: string
}

export interface StreamConfig {
  roomId: string
  roomTitle: string
  streamUrl: string
  streamKey: string
  playUrl: string
  recommendedSettings: {
    resolution: string
    bitrate: string
    fps: string
    encoder: string
  }
}

export interface StreamStatus {
  roomId: string
  isStreaming: boolean
  startTime?: string
  duration?: number
  viewers?: number
  bitrate?: number
  fps?: number
}

export interface LiveSlide {
  id: string
  pageNum: number
  imageUrl: string
  isCurrent: boolean
}

export interface LiveQuestion {
  id: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  isPublic: boolean
  status: 'pending' | 'answered'
  answer?: string
  answeredAt?: string
  createdAt: string
}

export interface HostLiveStats {
  totalViews: number
  totalRevenue: number
  avgDuration: number
  fansGrowth: number
  totalRooms: number
  totalGifts: number
  viewsGrowthRate: number
  revenueGrowthRate: number
}

export interface HostLiveRoom {
  id: string
  title: string
  cover: string
  status: 'live' | 'ended' | 'preview'
  startTime: string
  endTime?: string
  duration: number
  views: number
  peakViewers: number
  likes: number
  gifts: number
  revenue: number
}

export interface HostLiveTrend {
  date: string
  views: number
  revenue: number
  duration: number
}

export interface ShortVideo {
  id: string
  videoUrl: string
  coverUrl: string
  title: string
  description?: string
  duration: number
  author: {
    id: string
    name: string
    avatar: string
    isFollowed: boolean
  }
  likes: number
  comments: number
  shares: number
  isLiked: boolean
  isCollected: boolean
  product?: {
    id: string
    name: string
    cover: string
    price: number
  }
  tags?: string[]
  createdAt: string
}

export interface VideoComment {
  id: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  likes: number
  isLiked: boolean
  replies?: VideoComment[]
  replyCount: number
  createdAt: string
}

export interface VideoUploadSignature {
  uploadUrl: string
  key: string
  token: string
  expireAt: string
}

export interface CreateVideoData {
  videoUrl: string
  coverUrl: string
  title: string
  description?: string
  tags?: string[]
  productId?: string
  isPublic: boolean
}

export interface VideoProduct {
  id: string
  name: string
  cover: string
  price: number
}

export interface HotSearch {
  id: string
  keyword: string
  heat: number
  isNew?: boolean
  isHot?: boolean
}

export interface SearchSuggestion {
  keyword: string
  type: 'history' | 'hot' | 'suggest'
  count?: number
}

export interface SearchParams {
  keyword: string
  type?: 'all' | 'content' | 'circle' | 'course' | 'product' | 'user'
  page?: number
  pageSize?: number
}

export interface SearchResult {
  keyword: string
  total: number
  contents: SearchContentItem[]
  circles: SearchCircleItem[]
  courses: SearchCourseItem[]
  products: SearchProductItem[]
  users: SearchUserItem[]
}

export interface SearchContentItem {
  id: string
  type: 'article' | 'post' | 'video'
  title: string
  summary: string
  cover?: string
  author: { id: string; name: string; avatar: string }
  likes: number
  comments: number
  createdAt: string
}

export interface SearchCircleItem {
  id: string
  name: string
  cover: string
  description: string
  memberCount: number
  postCount: number
}

export interface SearchCourseItem {
  id: string
  title: string
  cover: string
  price: number
  originalPrice?: number
  teacher: string
  studentCount: number
  rating: number
}

export interface SearchProductItem {
  id: string
  name: string
  cover: string
  price: number
  originalPrice?: number
  sales: number
}

export interface SearchUserItem {
  id: string
  name: string
  avatar: string
  bio?: string
  followers: number
  isFollowed: boolean
}

export interface AISearchResult {
  summary: string
  keyPoints: string[]
  relatedQuestions: string[]
  sources: { title: string; url: string; type: string }[]
}

export interface SemanticSearchResult {
  results: {
    id: string
    type: string
    title: string
    content: string
    score: number
    highlight: string
  }[]
  relatedKeywords: string[]
}

export interface TranscribeResult {
  success: boolean
  text: string
  confidence: number
  alternatives?: string[]
}

export interface Question {
  id: string
  title: string
  content: string
  price: number
  status: 'pending' | 'answered' | 'expired' | 'refunded'
  asker: {
    id: string
    name: string
    avatar: string
  }
  answerer?: {
    id: string
    name: string
    avatar: string
    title?: string
  }
  answerPreview?: string
  isPublic: boolean
  isPaid: boolean
  viewCount: number
  likeCount: number
  circleId?: string
  circleName?: string
  createdAt: string
  answeredAt?: string
  expireAt: string
}

export interface QuestionDetail extends Question {
  answer?: string
  rating?: number
  ratingComment?: string
  tags?: string[]
}

export interface AskQuestionData {
  title: string
  content: string
  price: number
  answererId: string
  circleId?: string
  isPublic: boolean
  expireDays: number
}

export interface PeekUser {
  id: string
  name: string
  avatar: string
  peekedAt: string
}

export interface Bounty {
  id: string
  title: string
  description: string
  amount: number
  status: 'open' | 'answered' | 'resolved' | 'expired' | 'cancelled'
  poster: {
    id: string
    name: string
    avatar: string
  }
  answerCount: number
  viewCount: number
  category?: string
  tags?: string[]
  createdAt: string
  expireAt: string
  resolvedAt?: string
}

export interface BountyDetail extends Bounty {
  content: string
  answers: BountyAnswer[]
  acceptedAnswerId?: string
}

export interface BountyAnswer {
  id: string
  content: string
  author: {
    id: string
    name: string
    avatar: string
    title?: string
  }
  likes: number
  isLiked: boolean
  isAccepted: boolean
  createdAt: string
}

export interface CreateBountyData {
  title: string
  description: string
  content: string
  amount: number
  category?: string
  tags?: string[]
  expireDays: number
}

// ========== 重新导出新 API 模块 ==========
// 这些是新创建的 API 函数，从 lib/api/ 目录下的模块导出
export * from './api/history'
export * from './api/messages'
export * from './api/points'
export * from './api/search'
export * from './api/user'
export * from './api/wallet'
export * from './api/bookings'
export * from './api/comments'
export * from './api/likes'
export * from './api/blacklist'
export * from './api/downloads'
export * from './api/admin'
export * from './api/operator'
export * from './api/station'
export * from './api/user-profile'
export * from './api/earnings'
export * from './api/creator-revenue'
export * from './api/invite'
export * from './api/vip'
export * from './api/achievements'
export * from './api/bots'
export * from './api/ai-cover'
export * from './api/circle-bots'
export * from './api/customer-service'
export * from './api/station-home'
export * from './api/materials'
export * from './api/team'
export * from './api/station-live'
export * from './api/station-assistant'
export * from './api/station-config'
export * from './api/im'
export * from './api/bank-cards'
export * from './api/tools'
