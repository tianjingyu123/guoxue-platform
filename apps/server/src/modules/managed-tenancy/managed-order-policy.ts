import {ForbiddenException} from "@nestjs/common";
import {PrismaClient} from "@prisma/client";

// PostgreSQL16 的 pg_get_expr 规范形式；未知策略或不同语义一律拒绝启动。
export const managedOrderInsertExpression=`((status = 'PENDING'::"OrderStatus") OR ((type = 'COURSE'::"OrderType") AND (status = 'PAID'::"OrderStatus") AND ("payMethod" = 'FREE'::text) AND (amount = (0)::numeric) AND ("payAmount" = (0)::numeric) AND ("paidAt" IS NOT NULL) AND (EXISTS ( SELECT 1 FROM "Course" c WHERE ((c.id = "Order"."targetId") AND (c.price = (0)::numeric) AND (c."deletedAt" IS NULL) AND (c."auditStatus" = 'APPROVED'::text))))))`;
export const managedOrderUpdateUsing=`(status = 'PENDING'::"OrderStatus")`;
export const managedOrderUpdateCheck=`(status = 'CANCELLED'::"OrderStatus")`;
const normalize=(value:string|null)=>value?.replace(/\s+/g," ").trim();
export async function verifyManagedOrderPolicies(db:PrismaClient){
  const identities=await db.$queryRaw<Array<{secured:boolean}>>`SELECT (c.relrowsecurity AND (c.relforcerowsecurity OR NOT pg_has_role(current_user,c.relowner,'MEMBER'))) secured FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='Order'`;
  const policies=await db.$queryRaw<Array<{name:string;cmd:string;permissive:boolean;using:string|null;check:string|null;exact_role:boolean}>>`SELECT p.polname name,p.polcmd::text cmd,p.polpermissive permissive,pg_get_expr(p.polqual,p.polrelid) "using",pg_get_expr(p.polwithcheck,p.polrelid) "check",(p.polroles=ARRAY[(SELECT oid FROM pg_roles WHERE rolname=current_user)]) exact_role
    FROM pg_policy p WHERE p.polrelid='"Order"'::regclass AND p.polcmd IN ('a','w','*') AND EXISTS(SELECT 1 FROM unnest(p.polroles) role(oid) WHERE role.oid=0 OR pg_has_role(current_user,role.oid,'MEMBER'))`;
  const insert=policies.find(row=>row.name==="managed_order_runtime_insert"),update=policies.find(row=>row.name==="managed_order_runtime_cancel");
  if(identities[0]?.secured!==true||policies.length!==2||!insert?.exact_role||!insert.permissive||insert.cmd!=="a"||insert.using!==null||normalize(insert.check)!==managedOrderInsertExpression||!update?.exact_role||!update.permissive||update.cmd!=="w"||normalize(update.using)!==managedOrderUpdateUsing||normalize(update.check)!==managedOrderUpdateCheck)throw new ForbiddenException("客户订单行策略缺失、被绕过或允许未经验证的支付状态");
}
