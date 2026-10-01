package cn.rebu.resourceprobe;

import android.content.Context;
import cn.rebu.resource.*;
import javax.net.ssl.*;
import java.io.*;
import java.net.*;
import java.security.*;
import java.security.cert.CertificateFactory;
import java.util.*;
import java.util.concurrent.*;
import org.json.*;

/** 仅独立探针进程信任临时回环证书，仍校验证书链和主机名；不改变产品信任库。 */
public final class TlsScenarios {
    private static void check(boolean value,String message){if(!value)throw new AssertionError(message);}
    private static Map<String,Object> values(JSONObject object)throws Exception{Map<String,Object> result=new TreeMap<>();for(Iterator<String> it=object.keys();it.hasNext();){String key=it.next();Object value=object.get(key);result.put(key,value instanceof Number?((Number)value).longValue():value);}return result;}
    private static ResourceStore.Release release(Context context,String route)throws Exception{JSONObject signed=new JSONObject(ProbeApplication.read(context.getAssets().open(route+".json")));return new ResourceStore.Release(values(signed.getJSONObject("manifest")),signed.getString("signature"));}
    public static void run(Context context){new Thread(()->{
        SSLSocketFactory original=HttpsURLConnection.getDefaultSSLSocketFactory();ExecutorService service=Executors.newSingleThreadExecutor();
        try{
            KeyStore trust=KeyStore.getInstance(KeyStore.getDefaultType());trust.load(null);
            try(InputStream input=context.getAssets().open("tls-fixture-public.pem")){trust.setCertificateEntry("loopback-fixture",CertificateFactory.getInstance("X.509").generateCertificate(input));}
            TrustManagerFactory tm=TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());tm.init(trust);SSLContext tls=SSLContext.getInstance("TLS");tls.init(null,tm.getTrustManagers(),new SecureRandom());HttpsURLConnection.setDefaultSSLSocketFactory(tls.getSocketFactory());
            JSONObject config=new JSONObject(ProbeApplication.read(context.getAssets().open("rebu-resource-native.json")));Map<String,String> identity=new TreeMap<>();JSONObject own=config.getJSONObject("identity");for(Iterator<String> it=own.keys();it.hasNext();){String key=it.next();identity.put(key,own.get(key).toString());}
            Map<String,PublicKey> roots=new HashMap<>();roots.put("probe-root",ResourceStore.publicKey(config.getJSONObject("publicRoots").getString("probe-root")));
            File root=new File(context.getFilesDir(),"tls-fixture-"+System.nanoTime());ResourceStore store=new ResourceStore(root,identity,roots,new HashSet<>(Arrays.asList("https://127.0.0.1:58843","https://127.0.0.1:58844","https://localhost:58843")),name->{});
            JSONObject grant=new JSONObject(ProbeApplication.read(context.getAssets().open("grant.json")));store.authorizeKey(values(grant.getJSONObject("payload")),grant.getString("signature"));
            int groups=0;long canceledMs=0,deadlineMs=0;
            for(String route:new String[]{"tls-normal","tls-redirect","tls-short","tls-oversize","tls-wrongcert","tls-wronghost"}){
                ResourceStore.Release release=release(context,route);
                if(route.equals("tls-normal")){File file=store.download(release);check(ResourceStore.sha(file).equals(release.text("sha256")),"TLS正常文件哈希错误");check(file.delete(),"TLS正常临时文件未清理");}
                else{boolean rejected=false;try{store.download(release);}catch(Exception expected){rejected=true;if(route.equals("tls-wrongcert")||route.equals("tls-wronghost")){boolean tlsFailure=false;for(Throwable cause=expected;cause!=null;cause=cause.getCause()){if(cause instanceof SSLHandshakeException || cause instanceof SSLPeerUnverifiedException || cause instanceof java.security.cert.CertificateException)tlsFailure=true;}check(tlsFailure,"证书/主机名拒绝必须由TLS校验导致:"+expected);ProbeApplication.event("TLS_REJECT",route+" type="+expected.getClass().getName());}}check(rejected,"TLS异常响应未拒绝:"+route);check(!store.temporary(route).exists(),"TLS异常临时包残留");}
                groups++;ProbeApplication.event("TLS_CASE",route+" passed=true");
            }
            ResourceTransfer transfer=new ResourceTransfer();long ticket=transfer.ticket();ResourceStore.Release cancellation=release(context,"tls-cancel");Future<File> downloading=service.submit(()->store.download(cancellation,transfer,ticket));
            boolean entered=false;long waitUntil=System.nanoTime()+TimeUnit.SECONDS.toNanos(15);
            while(System.nanoTime()<waitUntil){HttpsURLConnection status=(HttpsURLConnection)new URL("https://127.0.0.1:58843/status").openConnection();status.setConnectTimeout(3000);status.setReadTimeout(3000);try{String body=ProbeApplication.read(status.getInputStream());if(body.contains("\"cancelStarted\":true")){entered=true;break;}}finally{status.disconnect();}Thread.sleep(150);}
            check(entered,"TLS取消请求未到服务端");long began=System.nanoTime();transfer.cancel();boolean rejected=false;
            try{downloading.get(35,TimeUnit.SECONDS);}catch(ExecutionException expected){rejected=true;}canceledMs=TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-began);
            check(rejected&&!store.temporary("tls-cancel").exists(),"TLS取消后未失败或遗留文件");check(store.staged()==null&&store.version()==0,"TLS取消改变资源状态");groups++;ProbeApplication.event("TLS_CASE","tls-cancel passed=true,elapsedMs="+canceledMs);
            HttpURLConnection conn=(HttpURLConnection)new URL("https://127.0.0.1:58843/tls-trickle").openConnection();int received=0;long beganDeadline=System.nanoTime();boolean expired=false;
            try(ResourceTransfer.Task task=transfer.begin(conn,transfer.ticket(),3000)){task.check();check(conn.getResponseCode()==200,"TLS慢响应状态错误");try(InputStream input=conn.getInputStream()){while(input.read()!=-1){received++;task.check();}task.check();}}
            catch(IOException expected){expired=true;}
            deadlineMs=TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-beganDeadline);check(expired&&received>=2&&deadlineMs<6500,"TLS零碎响应总时限未验证:"+deadlineMs+",bytes="+received);groups++;
            ProbeApplication.event("TLS_DONE",new JSONObject().put("groups",groups).put("cancelMs",canceledMs).put("trickleMs",deadlineMs).put("trickleBytes",received).put("certificateValidation",true).put("hostnameValidation",true).put("businessRequests",false).toString());
        }catch(Throwable error){ProbeApplication.event("TLS_FAILED",error.getClass().getSimpleName()+":"+error.getMessage());}
        finally{service.shutdownNow();HttpsURLConnection.setDefaultSSLSocketFactory(original);}
    },"probe-tls").start();}
}
