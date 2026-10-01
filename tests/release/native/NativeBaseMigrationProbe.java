package cn.rebu.resource;
import java.io.*;
import java.nio.file.*;
import java.util.*;
/** JVM 子进程强制退出测试，仅验证文件事务；实际 Android 证据单列。 */
public final class NativeBaseMigrationProbe {
 static final Map<String,String> OLD = identity("1"), NEW = identity("2");
 static Map<String,String> identity(String version) { Map<String,String> own = new TreeMap<>(); own.put("nativeBuild", version); own.put("runtimeAppId","__UNI__BASETEST"); return own; }
 static void fixture(File base) throws Exception {
  File root=new File(base,"state"), www=new File(base,"apps/__UNI__BASETEST/www"), previous=new File(www.getParentFile(),"rebu-resource-previous"); root.mkdirs(); www.mkdirs(); previous.mkdirs();
  Files.write(new File(www,"manifest.json").toPath(), "{}".getBytes("UTF-8")); Files.write(new File(www,"index.html").toPath(), "old-wgt".getBytes("UTF-8")); Files.write(new File(previous,"index.html").toPath(),"old-base".getBytes("UTF-8"));
  Files.write(new File(base,"historical-orders.txt").toPath(),"untouched".getBytes("UTF-8"));
  Properties state=new Properties(); state.setProperty("nativeIdentity",ResourceStore.canonical(OLD)); state.setProperty("runtime",www.getCanonicalPath()); state.setProperty("version","7"); state.setProperty("phase","PENDING_HEALTH"); state.setProperty("queued","true");
  try(FileOutputStream out=new FileOutputStream(new File(root,"journal.properties"))){state.store(out,null);}
 }
 static boolean migrate(File base,String halt) throws Exception {
  return CompleteBaseMigration.migrate(new File(base,"state"),NEW,Collections.singletonList(base),target->{target.mkdirs();Files.write(new File(target,"manifest.json").toPath(),"{}".getBytes("UTF-8"));Files.write(new File(target,"index.html").toPath(),"signed-apk-base2".getBytes("UTF-8"));}, point->{if(point.equals(halt)) Runtime.getRuntime().halt(77);});
 }
 static void verify(File base) throws Exception {
  if(!"signed-apk-base2".equals(new String(Files.readAllBytes(new File(base,"apps/__UNI__BASETEST/www/index.html").toPath()),"UTF-8"))) throw new Exception("新基线未建立");
  Properties state=new Properties();try(InputStream in=new FileInputStream(new File(base,"state/journal.properties"))){state.load(in);}
  if(!ResourceStore.canonical(NEW).equals(state.getProperty("nativeIdentity"))||!"0".equals(state.getProperty("version"))||!"HEALTHY".equals(state.getProperty("phase"))||state.containsKey("queued"))throw new Exception("旧日志被沿用");
  File archive=new File(base,"apps/__UNI__BASETEST/"+state.getProperty("completeBaseArchive"));
  if(!"old-wgt".equals(new String(Files.readAllBytes(new File(archive,"index.html").toPath()),"UTF-8"))||!new File(archive+"-previous/index.html").isFile()||!"untouched".equals(new String(Files.readAllBytes(new File(base,"historical-orders.txt").toPath()),"UTF-8")))throw new Exception("历史资源丢失");
 }
 public static void main(String[] args)throws Exception{
  if(args.length>0){migrate(new File(args[0]),args[1]);return;}
  for(String point:Arrays.asList("BASE_JOURNAL_SYNCED","BASE_OLD_MOVED","BASE_NEW_MOVED","BASE_PREVIOUS_MOVED","BASE_COMMITTED")){
   File base=Files.createTempDirectory("rebu-base-migration-").toFile();fixture(base);
   String java=new File(System.getProperty("java.home"),"bin/java").getPath();
   Process child=new ProcessBuilder(java,"-cp",System.getProperty("java.class.path"),NativeBaseMigrationProbe.class.getName(),base.getPath(),point).inheritIO().start();
   if(child.waitFor()!=77)throw new Exception("未在检查点退出："+point);
   migrate(base,"");verify(base);if(migrate(base,""))throw new Exception("同基座重复迁移");System.out.println("完整包强制退出恢复通过："+point);
  }
  File base=Files.createTempDirectory("rebu-base-confinement-").toFile();fixture(base);
  try{CompleteBaseMigration.migrate(new File(base,"state"),NEW,Collections.singletonList(new File(base,"wrong")),target->{throw new Exception("不应解包");},point->{});throw new Exception("越界未拒绝");}catch(SecurityException expected){}
  System.out.println("完整包目录越界拒绝通过；不读取或删除业务数据");
 }
}
