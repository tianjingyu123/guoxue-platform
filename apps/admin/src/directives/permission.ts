import type { Directive, DirectiveBinding } from "vue";
import { useAuthStore } from "../store/auth";

const permission: Directive<HTMLElement, string[]> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string[]>) {
    checkPermission(el, binding);
  },
  updated(el: HTMLElement, binding: DirectiveBinding<string[]>) {
    checkPermission(el, binding);
  },
};

function checkPermission(el: HTMLElement, binding: DirectiveBinding<string[]>) {
  const requiredRoles = binding.value;
  if (!requiredRoles || requiredRoles.length === 0) return;

  const auth = useAuthStore();
  if (auth.isSuperAdmin) return;

  const hasAccess = auth.hasRole(...requiredRoles);
  if (!hasAccess) {
    el.style.display = "none";
  } else {
    el.style.display = "";
  }
}

export default permission;
