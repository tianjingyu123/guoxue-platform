import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: () => import("../views/Login.vue"),
  },
  {
    path: "/",
    name: "Layout",
    component: () => import("../views/Layout.vue"),
    redirect: "/dashboard",
    children: [
      {
        path: "dashboard",
        name: "Dashboard",
        component: () => import("../views/Dashboard.vue"),
      },
      {
        path: "contents",
        name: "ContentList",
        component: () => import("../views/ContentList.vue"),
      },
      {
        path: "contents/create",
        name: "ContentCreate",
        component: () => import("../views/ContentEdit.vue"),
      },
      {
        path: "contents/:id/edit",
        name: "ContentEdit",
        component: () => import("../views/ContentEdit.vue"),
      },
      {
        path: "bazi",
        name: "BaziPan",
        component: () => import("../views/bazi/BaziPan.vue"),
      },
      {
        path: "courses",
        name: "CourseList",
        component: () => import("../views/courses/CourseList.vue"),
      },
      {
        path: "courses/create",
        name: "CourseCreate",
        component: () => import("../views/courses/CourseEdit.vue"),
      },
      {
        path: "courses/:id/edit",
        name: "CourseEdit",
        component: () => import("../views/courses/CourseEdit.vue"),
      },
      {
        path: "comments",
        name: "CommentList",
        component: () => import("../views/comments/CommentList.vue"),
      },
      {
        path: "reports",
        name: "ReportList",
        component: () => import("../views/reports/ReportList.vue"),
      },
      {
        path: "comments",
        name: "CommentList",
        component: () => import("../views/comments/CommentList.vue"),
      },
      {
        path: "products",
        name: "ProductList",
        component: () => import("../views/shop/ProductList.vue"),
      },
      {
        path: "orders",
        name: "OrderList",
        component: () => import("../views/shop/OrderList.vue"),
      },
      {
        path: "notifications",
        name: "NotificationCenter",
        component: () => import("../views/notifications/NotificationCenter.vue"),
      },
      {
        path: "classics",
        name: "ClassicList",
        component: () => import("../views/classics/ClassicList.vue"),
      },
      {
        path: "circles",
        name: "CircleList",
        component: () => import("../views/circles/CircleList.vue"),
      },
      {
        path: "videos",
        name: "VideoList",
        component: () => import("../views/videos/VideoList.vue"),
      },
      {
        path: "lives",
        name: "LiveList",
        component: () => import("../views/lives/LiveList.vue"),
      },
      {
        path: "users",
        name: "UserList",
        component: () => import("../views/users/UserList.vue"),
      },
      {
        path: "bots",
        name: "BotList",
        component: () => import("../views/bots/BotList.vue"),
      },
      {
        path: "stations",
        name: "StationList",
        component: () => import("../views/offline/StationList.vue"),
      },
      {
        path: "offline-venues",
        name: "OfflineVenueList",
        component: () => import("../views/offline/OfflineVenueList.vue"),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
