import { api } from "./index";
export interface ManagedCustomerSummary {
  id: string;
  name: string;
  mode: "LEASE" | "BRAND";
  operatingStatus: string;
  status: string;
  revision: number;
  endAt: string;
  remindAt: string;
  exportUntil: string;
  downloadTtlSeconds: number;
  tradingSubject: string;
  applications: Array<{ id: string; applicationId: string; applicationSubject: string; enabled: boolean }>;
  audit?: Array<{ id: string; action: string; reason: string; actorId: string; createdAt: string }>;
  deployment?: { state: string; verifiedAt: string | null };
  memberships?: Array<{ userId: string; identityProvider: "LOCAL" | "PLATFORM"; role: string; enabled: boolean }>;
  grant: { modules: string[]; resources: Record<string, string[]>; circleLimit: number };
}
export const managedTenancyApi = {
  list: () => api.get<ManagedCustomerSummary[]>("/admin/managed-customers"),
  detail: (id: string) => api.get<ManagedCustomerSummary>(`/admin/managed-customers/${id}`),
  create: (payload: unknown) => api.post<ManagedCustomerSummary>("/admin/managed-customers", payload),
  renew: (id: string, payload: unknown) => api.post(`/admin/managed-customers/${id}/renew`, payload),
  enable: (id: string, reason: string) => api.post(`/admin/managed-customers/applications/${id}/enable`, { reason }),
  disable: (id: string, reason: string) => api.post(`/admin/managed-customers/applications/${id}/disable`, { reason }),
  verify: (id: string, expectedRevision: number, reason: string) => api.post(`/admin/managed-customers/${id}/verify-deployment`, { expectedRevision, reason }),
  membership: (id: string, payload: unknown) => api.post(`/admin/managed-customers/${id}/membership`, payload),
  grant: (id: string, payload: unknown) => api.post(`/admin/managed-customers/${id}/grant`, payload),
  pendingBrandOrders: (id: string) => api.get<Array<{ id: string; applicationId: string; state: string; createdAt: string }>>(`/admin/managed-brand-orders/${id}/pending`),
  reconcileBrandOrder: (id: string, requestId: string, reason: string) => api.post<{ state: string; orderId: string | null }>(`/admin/managed-brand-orders/${id}/${requestId}/reconcile`, { reason }),
};
