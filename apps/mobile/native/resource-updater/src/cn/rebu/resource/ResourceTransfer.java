package cn.rebu.resource;

import java.io.*;
import java.net.HttpURLConnection;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;

/** 独立于资源串行队列的取消信号；截止时间使用单调时钟。 */
public final class ResourceTransfer {
    private static final ScheduledExecutorService aborts = Executors.newSingleThreadScheduledExecutor(task -> {
        Thread thread = new Thread(task, "rebu-resource-transfer-abort"); thread.setDaemon(true); return thread;
    });
    private final AtomicLong generation = new AtomicLong();
    private final Set<Task> active = new HashSet<>();
    public long ticket() { return generation.get(); }
    public void check(long ticket) throws IOException {
        if (ticket != generation.get()) throw new InterruptedIOException("资源流程已取消");
    }
    public void cancel() {
        generation.incrementAndGet();
        // 先使旧流程失效，断连接不占用调用方或资源事务队列。
        synchronized (active) { for (Task task : active) aborts.execute(task.connection::disconnect); }
    }
    public Task begin(HttpURLConnection connection, long ticket, long budgetMs) throws IOException {
        if (budgetMs <= 0 || budgetMs > 120000) throw new IllegalArgumentException("资源网络总时限非法");
        connection.setInstanceFollowRedirects(false);
        connection.setConnectTimeout((int)Math.min(15000, budgetMs));
        connection.setReadTimeout((int)Math.min(30000, budgetMs));
        Task task = new Task(connection, ticket, budgetMs);
        synchronized (active) { check(ticket); active.add(task); }
        task.alarm = aborts.schedule(connection::disconnect, budgetMs, TimeUnit.MILLISECONDS);
        return task;
    }
    public final class Task implements AutoCloseable {
        private final HttpURLConnection connection;
        private final long ticket, deadline;
        private ScheduledFuture<?> alarm;
        private Task(HttpURLConnection connection, long ticket, long budgetMs) {
            this.connection = connection; this.ticket = ticket;
            deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(budgetMs);
        }
        public void check() throws IOException {
            ResourceTransfer.this.check(ticket);
            if (System.nanoTime() - deadline >= 0) throw new java.net.SocketTimeoutException("资源网络总时限已到");
        }
        public void close() {
            if (alarm != null) alarm.cancel(false);
            synchronized (active) { active.remove(this); }
            connection.disconnect();
        }
    }
}
