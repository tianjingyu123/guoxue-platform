import cn.rebu.resource.*;
import com.sun.net.httpserver.*;
import javax.net.ssl.*;
import java.io.*;
import java.net.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

/** 临时证书只信任本进程的回环 TLS 服务；不修改产品信任库。 */
public final class NativeTransferProbe {
    private static void check(boolean value, String message) { if (!value) throw new AssertionError(message); }
    private static String pem(PublicKey key) { return "-----BEGIN PUBLIC KEY-----\n"+Base64.getEncoder().encodeToString(key.getEncoded())+"\n-----END PUBLIC KEY-----"; }
    private static String sign(Map<String, Object> fields, PrivateKey key) throws Exception { Signature s=Signature.getInstance("Ed25519");s.initSign(key);s.update(ResourceStore.canonical(fields).getBytes(StandardCharsets.UTF_8));return Base64.getEncoder().encodeToString(s.sign()); }
    public static void main(String[] args) throws Exception {
        KeyStore keys=KeyStore.getInstance("PKCS12");try(InputStream in=new FileInputStream(args[0])){keys.load(in,"fixture-only".toCharArray());}
        KeyManagerFactory km=KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());km.init(keys,"fixture-only".toCharArray());
        TrustManagerFactory tm=TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());tm.init(keys);
        SSLContext tls=SSLContext.getInstance("TLS");tls.init(km.getKeyManagers(),tm.getTrustManagers(),new SecureRandom());
        HttpsURLConnection.setDefaultSSLSocketFactory(tls.getSocketFactory());
        HttpsServer server=HttpsServer.create(new InetSocketAddress("127.0.0.1",0),0);server.setHttpsConfigurator(new HttpsConfigurator(tls));
        ExecutorService service=Executors.newCachedThreadPool(task->{Thread thread=new Thread(task);thread.setDaemon(true);return thread;});server.setExecutor(service);
        byte[] body="verified fixture content".getBytes(StandardCharsets.UTF_8);
        CountDownLatch received=new CountDownLatch(1),releaseServer=new CountDownLatch(1);
        server.createContext("/normal",x->{x.sendResponseHeaders(200,body.length);try(OutputStream out=x.getResponseBody()){out.write(body);}});
        server.createContext("/cancel",x->{x.sendResponseHeaders(200,body.length);try(OutputStream out=x.getResponseBody()){out.write(body,0,1);out.flush();received.countDown();try{releaseServer.await(8,TimeUnit.SECONDS);}catch(InterruptedException ignored){}out.write(body,1,body.length-1);}catch(IOException ignored){}});
        server.createContext("/trickle",x->{x.sendResponseHeaders(200,0);try(OutputStream out=x.getResponseBody()){for(int i=0;i<30;i++){out.write('a');out.flush();try{Thread.sleep(80);}catch(InterruptedException ignored){}}}catch(IOException ignored){}});
        server.createContext("/redirect",x->{x.getResponseHeaders().add("Location","/normal");x.sendResponseHeaders(302,-1);x.close();});
        server.createContext("/short",x->{x.sendResponseHeaders(200,1);try(OutputStream out=x.getResponseBody()){out.write('a');}});
        server.start();String origin="https://localhost:"+server.getAddress().getPort();
        File root=Files.createTempDirectory("rebu-transfer-proof-").toFile(),source=new File(root,"fixture.bin");Files.write(source.toPath(),body);
        Map<String,String> identity=new HashMap<>();for(String[] p:new String[][]{{"applicationId","probe"},{"productId","probe"},{"platform","android"},{"channelId","official"},{"packageName","test.transfer"},{"runtimeAppId","__TEST"},{"nativeBuild","1"},{"nativeFingerprint",String.join("",Collections.nCopies(64,"a"))}})identity.put(p[0],p[1]);
        KeyPair key=KeyPairGenerator.getInstance("Ed25519").generateKeyPair();ResourceStore store=new ResourceStore(root,identity,Collections.singletonMap("root",key.getPublic()),Collections.singleton(origin),name->{});
        Map<String,Object> grant=new TreeMap<>();grant.put("schemaVersion",1L);grant.put("kind","resource-key");grant.put("applicationId","probe");grant.put("keyId","test-key");grant.put("rootKeyId","root");grant.put("publicKeyPem",pem(key.getPublic()));grant.put("issuedAt",Instant.now().minusSeconds(5).toString());grant.put("expiresAt",Instant.now().plusSeconds(3600).toString());store.authorizeKey(grant,sign(grant,key.getPrivate()));
        Map<String,Object> fields=new TreeMap<>();fields.putAll(identity);fields.remove("nativeBuild");fields.put("schemaVersion",1L);fields.put("resourceVersion",1L);fields.put("minNativeBuild",1L);fields.put("maxNativeBuild",1L);fields.put("byteLength",(long)body.length);fields.put("sha256",ResourceStore.sha(source));fields.put("keyId","test-key");fields.put("issuedAt",Instant.now().minusSeconds(5).toString());fields.put("expiresAt",Instant.now().plusSeconds(3600).toString());fields.put("changeType","web-resources");
        int groups=0;long canceledMs=0,deadlineMs=0;
        try {
            for(String route:Arrays.asList("normal","redirect","short")){
                fields.put("releaseId",route);fields.put("downloadUrl",origin+"/"+route);ResourceStore.Release release=new ResourceStore.Release(fields,sign(fields,key.getPrivate()));
                if(route.equals("normal")){File file=store.download(release);check(ResourceStore.sha(file).equals(fields.get("sha256")),"正常下载哈希不符");check(file.delete(),"正常夹具未清理");}
                else{boolean rejected=false;try{store.download(release);}catch(Exception expected){rejected=true;}check(rejected,"异常响应未拒绝");check(!store.temporary(route).exists(),"异常响应留下临时包");}groups++;
            }
            fields.put("releaseId","cancel");fields.put("downloadUrl",origin+"/cancel");ResourceStore.Release release=new ResourceStore.Release(fields,sign(fields,key.getPrivate()));
            ResourceTransfer transfer=new ResourceTransfer();long ticket=transfer.ticket();Future<File> download=service.submit(()->store.download(release,transfer,ticket));
            check(received.await(5,TimeUnit.SECONDS),"TLS端未收到下载");long start=System.nanoTime();transfer.cancel();boolean rejected=false;
            try{download.get(3,TimeUnit.SECONDS);}catch(ExecutionException expected){rejected=true;}finally{releaseServer.countDown();}
            canceledMs=TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-start);check(rejected,"取消未终止实际下载");check(!store.temporary("cancel").exists(),"取消后临时包残留");check(store.staged()==null&&store.version()==0,"取消下载改变资源状态");groups++;
            // 同一控制器允许新票据，旧票据不能复活。
            boolean oldRejected=false;try{transfer.check(ticket);}catch(InterruptedIOException expected){oldRejected=true;}check(oldRejected,"旧取消票据被接受");transfer.check(transfer.ticket());groups++;
            HttpURLConnection conn=(HttpURLConnection)new URL(origin+"/trickle").openConnection();long startDeadline=System.nanoTime();boolean bounded=false;
            try(ResourceTransfer.Task task=transfer.begin(conn,transfer.ticket(),400)){
                check(!conn.getInstanceFollowRedirects(),"重定向保护丢失");task.check();check(conn.getResponseCode()==200,"慢响应失败");try(InputStream input=conn.getInputStream()){while(input.read()!=-1)task.check();task.check();}
            }catch(IOException expected){bounded=true;}
            deadlineMs=TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-startDeadline);check(bounded&&deadlineMs<1800,"持续零碎响应绕过总时限:"+deadlineMs);groups++;
            System.out.println("{\"passedGroups\":"+groups+",\"actualLoopbackTls\":true,\"actualResourceStore\":true,\"cancelMs\":"+canceledMs+",\"trickleDeadlineMs\":"+deadlineMs+",\"androidVerified\":false}");
        }finally{releaseServer.countDown();server.stop(0);service.shutdownNow();}
    }
}
