import {apiGet,apiPost,apiPut} from '@/utils/request'
import {APP_CLIENT_KEY,APP_APPLICATION_ID} from '@/lib/app-distribution'
export type BrandRow={id:string;[key:string]:unknown}
export type BrandContext={applicationId:string;applicationSubject:string;tradingSubject:string;brand:{name:string;themeColor:string};templateId:string;operatingStatus:string}
export type BrandPage={items:BrandRow[];nextCursor?:string|null;total?:number;page?:number}
function ready(){if(!APP_CLIENT_KEY)throw new Error('本安装渠道尚未登记品牌入口，请联系维护人员')}
const get=<T>(path:string)=>{ready();return apiGet<T>('/managed/brand'+path)}
const post=<T>(path:string,body:unknown)=>{ready();return apiPost<T>('/managed/brand'+path,body)}
export const brandKey=()=> 'brand-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,14)
export const brandApi={
  async context(){const row=await get<BrandContext>('/context');if(row.applicationId!==APP_APPLICATION_ID)throw new Error('品牌入口与本安装应用登记不符');return row},
  products:()=>get<BrandRow[]>('/products'),courses:()=>get<BrandRow[]>('/courses'),
  orders:(cursor='')=>get<BrandPage>('/orders'+(cursor?'?cursor='+encodeURIComponent(cursor):'')),
  productOrder:(body:{productId:string;quantity:number;addressId:string;requestKey:string})=>post<BrandRow>('/orders',body),
  courseOrder:(courseId:string,requestKey:string)=>post<BrandRow>('/orders/courses',{courseId,requestKey}),
  chapters:(id:string)=>get<BrandRow[]>('/courses/'+encodeURIComponent(id)+'/chapters'),
  chapter:(id:string,chapterId:string)=>get<BrandRow>('/courses/'+encodeURIComponent(id)+'/chapters/'+encodeURIComponent(chapterId)),
  progress:(id:string)=>get<BrandRow[]>('/courses/'+encodeURIComponent(id)+'/progress'),
  saveProgress:(id:string,chapterId:string)=>{ready();return apiPut('/managed/brand/courses/'+encodeURIComponent(id)+'/chapters/'+encodeURIComponent(chapterId)+'/progress',{progress:100})},
  cancel:(id:string)=>post<BrandRow>('/orders/'+encodeURIComponent(id)+'/cancel',{}),confirm:(id:string)=>post<BrandRow>('/orders/'+encodeURIComponent(id)+'/confirm',{}),
  apply:(id:string,type:string,reason:string)=>post<BrandRow>('/orders/'+encodeURIComponent(id)+'/after-sale',{type,reason}),
  aftersales:(id:string,page=1)=>get<BrandPage>('/orders/'+encodeURIComponent(id)+'/after-sales?page='+page),
  cancelAfterSale:(id:string)=>post<BrandRow>('/after-sales/'+encodeURIComponent(id)+'/cancel',{}),
  logistics:(id:string,company:string,logisticsNo:string)=>post<BrandRow>('/after-sales/'+encodeURIComponent(id)+'/return-logistics',{company,logisticsNo}),
}
