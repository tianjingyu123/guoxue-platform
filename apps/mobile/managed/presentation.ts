import {parseClientPresentation,type ClientPresentation,type PresentationBlock} from '@guoxue/shared/client-presentation'
import {managedCall,ManagedClientError,type ManagedKind} from './client'

const entryKinds:Record<string,ManagedKind>={mall:'product',course:'course',circles:'circle',circle:'circle',agent:'agent'}
export const managedEntryKind=(id:string)=>entryKinds[id]
/** 沿用共享协议，只渲染已随包编译的文字和入口组件；不执行HTML或任意链接。 */
export async function managedLayout():Promise<ClientPresentation|undefined>{
  const env=import.meta.env,build=String(env.VITE_MANAGED_BUILD||''),resource=String(env.VITE_MANAGED_RESOURCE||'')
  if(!/^\d{1,15}$/.test(build)||!/^\d{1,15}$/.test(resource))return undefined
  try{
    const response=await managedCall<{config:unknown}>('/presentation','GET',undefined,{'x-native-build':build,'x-resource-version':resource,'x-client-capabilities':'presentation-v1'})
    return response.config?parseClientPresentation(response.config,false):undefined
  }catch(error){if(error instanceof ManagedClientError&&error.status===401)throw error;return undefined}
}
export function managedLayoutKinds(layout:ClientPresentation|undefined,kinds:ManagedKind[]):ManagedKind[]{
  return kinds.map((kind,index)=>{const rule=layout?.entries.find(row=>managedEntryKind(row.id)===kind);return{kind,index:rule?.order??index,visible:rule?.visible!==false}}).filter(row=>row.visible).sort((a,b)=>a.index-b.index).map(row=>row.kind)
}
export function managedLayoutBlocks(layout:ClientPresentation|undefined,kind:ManagedKind,kinds:ManagedKind[]):PresentationBlock[]{
  const enabled=(id:string)=>kinds.includes(managedEntryKind(id)),surface=kind==='product'?'shop':kind
  return [...(layout?.pages.home||[]),...(layout?.pages[surface]||[])].filter(row=>['notice','richtext','entry-grid'].includes(row.type)&&(!row.targetEntryId||enabled(row.targetEntryId))).map(row=>({...row,entries:row.entries.filter(enabled)})).filter(row=>row.type!=='entry-grid'||row.entries.length>0)
}
