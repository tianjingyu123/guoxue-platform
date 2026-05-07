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
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
