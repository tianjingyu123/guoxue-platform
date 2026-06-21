# 最新待迁清单 v2（2026-06-19 深度复核）

**待迁 248 页 = 用户端 187 + 管理端 61**

## 已完成核查结论
- 已完成页修正为 **226**（含补登记30个已实现但漏登记的 operator/classics/ebook 页）
- 累计剔除废弃 79 项：14别名 + 20旧版重复目录 + 19 demo/common/error + 13废弃单数目录 + 7重定向桩页 + (6 legal待定)
- ⚠不可达 = 静态分析未找到入口引用，**需人工确认是否废弃**（也可能是动态拼接入口）

## 用户端 (187)

### /offline (19)
- /offline/checkin (459行)
- /offline/courses (339行)
- /offline/courses/[id] (573行)
- /offline/events (268行)
- /offline/manage (331行)
- /offline/manage/courses (165行)
- /offline/manage/courses/[id] (174行)
- /offline/manage/courses/create (227行)
- /offline/manage/info (152行)
- /offline/manage/marketing (189行)
- /offline/manage/orders (103行)
- /offline/manage/products (116行)
- /offline/manage/students (110行)
- /offline/orders (334行)
- /offline/products (428行)
- /offline/settlements (419行)
- /offline/stations (366行)
- /offline/stations/[id] (485行)
- /offline/teacher-booking (627行)

### /mine (17)
- /mine/achievements (336行)
- /mine/applications (387行)
- /mine/bookings (326行)
- /mine/downloads (546行)
- /mine/edit-profile (331行)
- /mine/follows (235行)
- /mine/heritage-verify (513行)
- /mine/identity-switch (415行)
- /mine/institute (480行)
- /mine/institute/admin (561行)
- /mine/institute/admin/appoint (295行)
- /mine/invite-records (348行)
- /mine/learning-dashboard (356行)
- /mine/memberships (407行)
- /mine/my-courses (421行)
- /mine/role-panels/admin-panel (366行)
- /mine/submissions (305行)

### /competition (13)
- /competition (382行)
- /competition/[id] (381行)
- /competition/[id]/certificate (151行)
- /competition/[id]/dashboard (387行)
- /competition/[id]/judge (282行)
- /competition/[id]/participants (441行)
- /competition/[id]/poster (131行)
- /competition/[id]/promotion-notice (239行)
- /competition/[id]/quiz (496行)
- /competition/[id]/register (277行)
- /competition/[id]/result (231行)
- /competition/[id]/score-detail (407行)
- /competition/archive (250行)

### /videos (11)
- /videos (299行)
- /videos/[id] (549行)
- /videos/creator (525行)
- /videos/creator/analytics (247行)
- /videos/creator/earnings/history (158行)
- /videos/creator/products/add (197行)
- /videos/creator/sales (206行)
- /videos/creator/settings (219行)
- /videos/creator/withdraw (341行)
- /videos/publish (668行)
- /videos/search (148行)

### /settings (10)
- /settings (425行)
- /settings/bindaccount (124行)
- /settings/blacklist (98行)
- /settings/delete-account (408行)
- /settings/notifications (327行)
- /settings/password (306行)
- /settings/payment-methods (93行)
- /settings/payment-password (308行)
- /settings/phone (391行)
- /settings/privacy (290行)

### /im (7)
- /im/add-friend (128行)
- /im/contacts (379行)
- /im/create-group (159行)
- /im/friend-requests (471行)
- /im/group-detail/[id] (645行)  ⚠不可达
- /im/group-list (411行)
- /im/invite (530行)  ⚠不可达

### /legal (6)
- /legal/child-privacy (334行)  ⚠不可达
- /legal/data-collection-list (383行)  ⚠不可达
- /legal/privacy-policy (291行)  ⚠不可达
- /legal/teen-mode-intro (226行)  ⚠不可达
- /legal/third-party-sdk (429行)  ⚠不可达
- /legal/user-agreement (304行)  ⚠不可达

### /bounty (5)
- /bounty (291行)
- /bounty/[id] (447行)
- /bounty/answer (318行)
- /bounty/create (435行)
- /bounty/my (308行)

### /search (5)
- /search/advanced (546行)
- /search/history (344行)
- /search/result (545行)
- /search/trending (108行)
- /search/voice (287行)

### /help (4)
- /help (289行)
- /help/guoxue-design (299行)
- /help/list-demo (192行)
- /help/media-guidelines (651行)

### /points (4)
- /points (336行)
- /points/exchange (238行)
- /points/history (181行)
- /points/tasks (207行)

### /qa (4)
- /qa (292行)
- /qa/[id] (545行)
- /qa/ask (361行)
- /qa/pending (265行)

### /activity (3)
- /activity/[id] (503行)  ⚠不可达
- /activity/calendar (310行)
- /activity/landing (511行)

### /auth (3)
- /auth/recover (77行)
- /auth/recover/email (107行)
- /auth/recover/phone (172行)

### /fortune (3)
- /fortune (308行)
- /fortune/daily (413行)
- /fortune/subscribe (392行)

### /learning (3)
- /learning (286行)
- /learning/achievements (126行)
- /learning/history (109行)

### /notices (3)
- /notices (229行)
- /notices/[id] (284行)
- /notices/upgrade (282行)

### /policy (3)
- /policy/[type] (559行)  ⚠不可达
- /policy/privacy-policy (74行)
- /policy/user-agreement (68行)

### /report (3)
- /report (361行)
- /report/result (364行)
- /report/result/[id] (253行)

### /wallet (3)
- /wallet (272行)
- /wallet/bank-cards (409行)
- /wallet/bill (454行)

### /articles (2)
- /articles (306行)
- /articles/create (734行)

### /coupons (2)
- /coupons (245行)
- /coupons/center (297行)

### /invite (2)
- /invite (354行)  ⚠不可达
- /invite/history (88行)

### /payment (2)
- /payment/result (237行)
- /payment/success (137行)

### /same-city (2)
- /same-city/feed (575行)
- /same-city/nearby-users (476行)

### /seckill (2)
- /seckill (271行)
- /seckill/rules (86行)

### /terms (2)
- /terms (72行)
- /terms/merchant (64行)

### /vip (2)
- /vip (523行)
- /vip/records (113行)

### /withdraw (2)
- /withdraw (268行)
- /withdraw/records (229行)

### /address (1)
- /address (469行)

### /aftersale (1)
- /aftersale/[orderId] (437行)  ⚠不可达

### /ai (1)
- /ai/cover-generate (480行)  ⚠不可达

### /announcements (1)
- /announcements (224行)

### /appeal (1)
- /appeal (425行)  ⚠不可达

### /authors (1)
- /authors (108行)  ⚠不可达

### /become-partner (1)
- /become-partner (152行)

### /booking (1)
- /booking/[expertId] (411行)  ⚠不可达

### /call (1)
- /call/[id] (618行)  ⚠不可达

### /cart (1)
- /cart (573行)

### /check-in (1)
- /check-in (191行)

### /customer-service (1)
- /customer-service (566行)

### /detail (1)
- /detail (537行)  ⚠不可达

### /downloads (1)
- /downloads (394行)

### /experts (1)
- /experts (452行)

### /favorites (1)
- /favorites (335行)

### /flash-sale (1)
- /flash-sale (136行)  ⚠不可达

### /follows (1)
- /follows (196行)

### /history (1)
- /history (239行)

### /interests-guide (1)
- /interests-guide (300行)

### /learn (1)
- /learn/[id] (716行)

### /likes (1)
- /likes (244行)

### /login (1)
- /login/forgot-password (375行)

### /my-circles (1)
- /my-circles (347行)

### /notifications (1)
- /notifications (271行)

### /post (1)
- /post/[id] (579行)

### /poster (1)
- /poster (345行)  ⚠不可达

### /privacy (1)
- /privacy (82行)

### /rankings (1)
- /rankings (306行)

### /reader (1)
- /reader/[id] (611行)  ⚠不可达

### /renew (1)
- /renew (142行)

### /reservations (1)
- /reservations (323行)

### /result (1)
- /result (326行)

### /share (1)
- /share/landing (550行)  ⚠不可达

### /splash (1)
- /splash (247行)

### /tasks (1)
- /tasks/daily (442行)  ⚠不可达

### /teacher-certification (1)
- /teacher-certification (163行)

### /topics (1)
- /topics/[id] (389行)  ⚠不可达

### /user (1)
- /user/[id]/following (219行)  ⚠不可达

### /welcome (1)
- /welcome (127行)

## 管理端 (61)

### /merchant (21)
- /merchant/analytics (321行)
- /merchant/application-status (110行)
- /merchant/apply (585行)
- /merchant/circle-bindding (178行)  ⚠不可达
- /merchant/content-stats (237行)  ⚠不可达
- /merchant/dashboard (322行)
- /merchant/edit-application (189行)
- /merchant/inquiries (282行)
- /merchant/join (389行)
- /merchant/notices (263行)
- /merchant/order-detail (357行)
- /merchant/orders (248行)
- /merchant/pay-deposit (113行)
- /merchant/product-edit (359行)
- /merchant/products (397行)
- /merchant/profile (213行)
- /merchant/revenue (232行)
- /merchant/reviews (227行)
- /merchant/shop-preview (195行)
- /merchant/sign-agreement (103行)
- /merchant/violations (206行)  ⚠不可达

### /institute (14)
- /institute (350行)
- /institute/apply (555行)
- /institute/demands/create (161行)
- /institute/events (449行)
- /institute/events/[id] (234行)
- /institute/instructors (176行)
- /institute/instructors/[id] (253行)
- /institute/member-apply (474行)
- /institute/members (281行)
- /institute/members/[id] (422行)
- /institute/my-tasks (484行)
- /institute/teacher-demand (268行)
- /institute/teacher-demand/create (157行)
- /institute/teacher-pool (283行)

### /manage (6)
- /manage/checkin/[courseId] (372行)
- /manage/course/[id]/analytics (359行)
- /manage/course/[id]/reviews (191行)
- /manage/live (264行)
- /manage/live/[id]/analytics (429行)
- /manage/live/create (334行)

### /earnings (4)
- /earnings (284行)
- /earnings/breakdown (242行)
- /earnings/records (206行)
- /earnings/withdraw (344行)

### /creator (3)
- /creator (402行)  ⚠不可达
- /creator/live/create (904行)
- /creator/revenue (349行)  ⚠不可达

### /admin (2)
- /admin/batch-coupon-send (597行)  ⚠不可达
- /admin/user-audit (553行)

### /bots (2)
- /bots (439行)
- /bots/chat/[id] (580行)

### /content (2)
- /content/[slug] (311行)  ⚠不可达
- /content/community-rules (113行)

### /publish (2)
- /publish (692行)
- /publish/video (445行)

### /design (1)
- /design/illustrations (202行)  ⚠不可达

### /drafts (1)
- /drafts (296行)  ⚠不可达

### /editor (1)
- /editor (717行)

### /teacher (1)
- /teacher/dashboard (340行)

### /verification (1)
- /verification (391行)
