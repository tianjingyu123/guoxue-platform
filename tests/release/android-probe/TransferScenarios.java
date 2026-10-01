package cn.rebu.resourceprobe;

import cn.rebu.resource.*;
import java.io.*;
import java.net.*;
import java.util.concurrent.*;

/** Android 实际工作队列与取消控制器；连接阻塞使用明确的替身。 */
public final class TransferScenarios {
    private static void check(boolean value, String message) { if (!value) throw new AssertionError(message); }
    private static final class BlockedConnection extends HttpURLConnection {
        final CountDownLatch disconnected = new CountDownLatch(1);
        BlockedConnection() throws Exception { super(new URL("https://fixture.example.invalid")); }
        public void disconnect() { disconnected.countDown(); }
        public boolean usingProxy() { return false; }
        public void connect() { }
    }
    public static void run() {
        new Thread(() -> {
            try {
                java.lang.reflect.Field field=ResourceRuntime.class.getDeclaredField("worker");field.setAccessible(true);ExecutorService worker=(ExecutorService)field.get(null);
                for(String action:new String[]{"cancel","session","unhealthy","busy"}){
                    CountDownLatch entered=new CountDownLatch(1),release=new CountDownLatch(1),done=new CountDownLatch(2);
                    boolean[] rejected={false},control={false};
                    worker.execute(()->{entered.countDown();try{release.await(3,TimeUnit.SECONDS);}catch(InterruptedException ignored){}});
                    check(entered.await(2,TimeUnit.SECONDS),"队列阻塞夹具未进入");
                    ResourceRuntime.dispatch("activate","{}",result->{rejected[0]=result.contains("\"ok\":false")&&result.contains("取消");done.countDown();});
                    ResourceRuntime.dispatch(action,action.equals("busy")?"{\"activities\":{\"upload\":true}}":action.equals("session")?"{\"token\":\"\"}":"{}",result->{control[0]=result.contains("\"ok\":true");done.countDown();});
                    release.countDown();check(done.await(4,TimeUnit.SECONDS)&&rejected[0]&&control[0],"取消未越过资源队列:"+action);
                    ProbeApplication.event("TRANSFER_QUEUE_CANCEL",action+" rejectedOld=true,control=true");
                }
                ResourceRuntime.dispatch("busy","{\"activities\":{}}",result->{});
                ResourceTransfer transfer=new ResourceTransfer();BlockedConnection cancellation=new BlockedConnection();long ticket=transfer.ticket();
                try(ResourceTransfer.Task task=transfer.begin(cancellation,ticket,2000)){
                    transfer.cancel();check(cancellation.disconnected.await(1,TimeUnit.SECONDS),"连接未收到取消");boolean rejected=false;try{task.check();}catch(InterruptedIOException expected){rejected=true;}check(rejected,"旧传输票据未失效");
                }
                ProbeApplication.event("TRANSFER_ABORT","oldRejected=true,disconnect=true");
                BlockedConnection deadline=new BlockedConnection();long began=android.os.SystemClock.elapsedRealtime();boolean expired=false;
                try(ResourceTransfer.Task task=transfer.begin(deadline,transfer.ticket(),250)){
                    check(deadline.disconnected.await(2,TimeUnit.SECONDS),"截止时限未断连接");try{task.check();}catch(SocketTimeoutException expected){expired=true;}check(expired,"到期连接仍被接受");
                }
                ProbeApplication.event("TRANSFER_DEADLINE","expired=true,elapsedMs="+(android.os.SystemClock.elapsedRealtime()-began));
                ProbeApplication.event("TRANSFER_DONE","groups=3,transportSynthetic=true");
            }catch(Throwable error){ProbeApplication.event("TRANSFER_FAILED",error.getClass().getSimpleName()+":"+error.getMessage());}
        },"probe-transfer").start();
    }
}
