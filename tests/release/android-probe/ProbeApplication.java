package cn.rebu.resourceprobe;
import android.app.Application;
import android.os.SystemClock;
import android.system.Os;
import android.system.OsConstants;
import android.util.Log;
import cn.rebu.resource.*;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.PublicKey;
import java.util.*;
/** 独立测试包：真实 Android 文件与 WebView；冷启动网络准入为明确合成回调，不替代 DCloud。 */
public final class ProbeApplication extends Application {
    public static ResourceStore store;
    public static File runtime;
    public static String error;
    public static final String TAG = "REBU_RESOURCE_PROBE";
    public void onCreate() {
        super.onCreate(); long began = SystemClock.elapsedRealtime();
        try {
            if (getSharedPreferences("probe", 0).getBoolean("portable", false)) System.setProperty("rebu.resource.crypto", "bc");
            event("CRYPTO_MODE", System.getProperty("rebu.resource.crypto", "platform"));
            ResourceRuntime.boot(this);
            JSONObject config = new JSONObject(read(getAssets().open("rebu-resource-native.json")));
            Map<String, String> identity = new TreeMap<>(); JSONObject own = config.getJSONObject("identity"); for (Iterator<String> it = own.keys(); it.hasNext();) { String key = it.next(); identity.put(key, own.get(key).toString()); }
            Map<String, PublicKey> roots = new HashMap<>(); roots.put("probe-root", ResourceStore.publicKey(config.getJSONObject("publicRoots").getString("probe-root")));
            int suite = getSharedPreferences("probe", 0).getInt("suite", 0);
            File root = new File(getFilesDir(), "suite-" + suite + "/core-fixture");
            runtime = new File(getFilesDir(), "suite-" + suite + "/apps/__UNI__REBUPROBE/www");
            CompleteBaseMigration.migrate(root, identity, Collections.singletonList(getFilesDir()), target -> {
                copyAssets("apps/__UNI__REBUPROBE/www", target);
                if (!"__UNI__REBUPROBE".equals(new JSONObject(read(new FileInputStream(new File(target, "manifest.json")))).getString("id"))) throw new SecurityException("完整包 appid 不匹配");
            }, name -> {
                sync(root); sync(runtime.getParentFile());
                String kill = getSharedPreferences("probe", 0).getString("baseKillAt", "");
                if (name.equals(kill)) { getSharedPreferences("probe", 0).edit().putString("baseKillAt", "").commit(); event("BASE_KILL_AT", name); android.os.Process.killProcess(android.os.Process.myPid()); }
                event(name, "complete-base");
            });
            if (!runtime.exists() && !new File(runtime.getParentFile(), "rebu-resource-previous").exists()) copyAssets("apps/__UNI__REBUPROBE/www", runtime);
            store = new ResourceStore(root, identity, roots, Collections.singleton("https://resources.example.invalid"), name -> {
                sync(root); if (store != null && store.runtimeParent() != null) sync(store.runtimeParent());
                String kill = getSharedPreferences("probe", 0).getString("killAt", "");
                if (name.equals(kill)) { getSharedPreferences("probe", 0).edit().putString("killAt", "").commit(); event("KILL_AT", name); android.os.Process.killProcess(android.os.Process.myPid()); }
                if (name.equals("RECOVERED_BEFORE_JS")) event("RECOVERED_BEFORE_JS", "verified-backup");
            }, (directory, release) -> { if (!release.text("runtimeAppId").equals(new JSONObject(read(new FileInputStream(new File(directory, "manifest.json")))).getString("id"))) throw new SecurityException("appid不匹配"); });
            if (!store.bound()) store.bindRuntime(runtime, getFilesDir());
            store.boot(release -> !getSharedPreferences("probe", 0).getBoolean("denyOffer", false));
            File journal = new File(root, "journal.properties"); Properties state = new Properties(); try (InputStream in = new FileInputStream(journal)) { state.load(in); }
            if (state.getProperty("completeBaseArchive") != null) {
                File archive = new File(runtime.getParentFile(), state.getProperty("completeBaseArchive"));
                event("BASE_ARCHIVE", "kept=" + archive.isDirectory() + ",previous=" + new File(archive.getPath() + "-previous").isDirectory());
            }
            event("BEFORE_WEBVIEW", "phase=" + store.phase() + ",version=" + store.version() + ",ms=" + (SystemClock.elapsedRealtime() - began) + ",nativeBuild=" + own.getInt("nativeBuild"));
        } catch (Exception failure) { error = failure.getClass().getSimpleName(); event("BOOT_REFUSED", error); }
    }
    public void copyAssets(String name, File target) throws IOException {
        String[] children = getAssets().list(name);
        if (children != null && children.length > 0) { if (!target.isDirectory() && !target.mkdirs()) throw new IOException("测试目录创建失败"); for (String child : children) copyAssets(name + "/" + child, new File(target, child)); }
        else try (InputStream in = getAssets().open(name); FileOutputStream out = new FileOutputStream(target)) { byte[] bytes = new byte[8192]; int n; while ((n = in.read(bytes)) > 0) out.write(bytes, 0, n); out.getFD().sync(); }
    }
    public static String read(InputStream input) throws IOException { try (InputStream in = input; ByteArrayOutputStream bytes = new ByteArrayOutputStream()) { byte[] buffer = new byte[8192]; int n; while ((n = in.read(buffer)) > 0) { if (bytes.size() + n > 1000000) throw new IOException("测试输入超限"); bytes.write(buffer, 0, n); } return bytes.toString("UTF-8"); } }
    public static void event(String type, String detail) { Log.i(TAG, type + " " + detail); }
    private static void sync(File directory) throws IOException { try { if (!directory.isDirectory()) return; FileDescriptor fd = Os.open(directory.getPath(), OsConstants.O_RDONLY, 0); try { Os.fsync(fd); } finally { Os.close(fd); } } catch (Exception failure) { throw new IOException("真实目录同步失败", failure); } }
}
