/// <reference types="@dcloudio/types/html5plus" />
/** 各端文件接口各自适配；不把复制到剪贴板当作保存完整退出文件。 */
export async function readManagedImage(path:string){
  let dataBase64='';
  // #ifdef H5
  const blob=await (await fetch(path)).blob();
  if(blob.size>512*1024)throw new Error('请选择不超过512KB的PNG/JPEG图片');
  dataBase64=await new Promise<string>((done,reject)=>{const reader=new FileReader();reader.onload=()=>done(String(reader.result).split(',')[1]||'');reader.onerror=()=>reject(new Error('图片读取失败'));reader.readAsDataURL(blob)});
  // #endif
  // #ifdef MP-WEIXIN
  dataBase64=await new Promise<string>((done,reject)=>uni.getFileSystemManager().readFile({filePath:path,encoding:'base64',success:result=>done(String(result.data)),fail:()=>reject(new Error('图片读取失败'))}));
  // #endif
  // #ifdef APP-PLUS
  dataBase64=await new Promise<string>((done,reject)=>plus.io.resolveLocalFileSystemURL(path,entry=>(entry as unknown as PlusIoFileEntry).file(file=>{const reader=new plus.io.FileReader();reader.onloadend=()=>done(String(reader.result).split(',')[1]||'');reader.onerror=()=>reject(new Error('图片读取失败'));reader.readAsDataURL(file)},()=>reject(new Error('图片读取失败'))),()=>reject(new Error('图片读取失败'))));
  // #endif
  const contentType=dataBase64.startsWith('iVBORw0KGgo')?'image/png':dataBase64.startsWith('/9j/')?'image/jpeg':'';
  if(!contentType||!dataBase64||dataBase64.length>700000)throw new Error('请选择不超过512KB的PNG/JPEG图片');
  return {contentType,dataBase64};
}
export async function saveManagedJson(name:string,text:string){
  if(!/^managed-[a-zA-Z0-9_-]+\.json$/.test(name))throw new Error('退出文件名无效');
  let saved='';
  // #ifdef H5
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);saved='已提交浏览器下载：'+name;
  // #endif
  // #ifdef MP-WEIXIN
  const wxRuntime=(globalThis as unknown as {wx?:{env:{USER_DATA_PATH:string}}}).wx;
  if(!wxRuntime?.env.USER_DATA_PATH)throw new Error('当前小程序无法保存，请使用本应用H5退出入口');
  const filePath=wxRuntime.env.USER_DATA_PATH+'/'+Date.now()+'-'+name;
  await new Promise<void>((done,reject)=>uni.getFileSystemManager().writeFile({filePath,data:text,encoding:'utf8',success:()=>done(),fail:()=>reject(new Error('文件保存失败，请检查本地空间或使用本应用H5退出入口'))}));saved='已保存至小程序本地文件：'+filePath;
  // #endif
  // #ifdef APP-PLUS
  const target=Date.now()+'-'+name;
  await new Promise<void>((done,reject)=>plus.io.resolveLocalFileSystemURL('_doc/',entry=>(entry as PlusIoDirectoryEntry).getFile(target,{create:true,exclusive:true},file=>file.createWriter(writer=>{writer.onwrite=()=>done();writer.onerror=()=>reject(new Error('退出文件写入失败'));writer.write(text)},()=>reject(new Error('退出文件写入失败'))),()=>reject(new Error('退出文件建立失败'))),()=>reject(new Error('当前App无法保存，请使用本应用H5退出入口'))));saved='已保存至App文档目录：'+target;
  // #endif
  if(!saved)throw new Error('当前渠道尚未适配文件保存，请使用本应用H5退出入口');
  return saved;
}
