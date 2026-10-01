package cn.rebu.resource;

import android.app.Application;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.system.Os;
import android.system.OsConstants;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import java.util.concurrent.*;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import java.nio.file.*;

/** Android 原生适配：可信身份来自完整包 assets/安装证书，不能由 WGT 自报。 */
public final class ResourceRuntime {
    public interface Callback { void onResult(String json); }
    private static final ExecutorService worker = Executors.newSingleThreadExecutor();
    private static final ResourceTransfer transfer = new ResourceTransfer();
    private static ResourceStore store;
    private static JSONObject config;
    private static Application app;
    private static ResourceStore.Release pending;
    private static boolean bootCompleted;
    private static File root;
    private static JSONObject activities = new JSONObject();
    private static final long started = android.os.SystemClock.elapsedRealtime();
    public static synchronized void boot(Application application) {
        if (Build.VERSION.SDK_INT < 26 || !mainProcess(application)) return;
        app = application; root = new File(app.getFilesDir(), "rebu-resource-update");
        try {
            config = new JSONObject(read(app.getAssets().open("rebu-resource-native.json"), 32000));
            boolean enabled = config.optBoolean("enabled", false);
            if (!enabled && !new File(root, "journal.properties").isFile()) return;
            JSONObject identity = config.getJSONObject("identity");
            PackageInfo pkg = app.getPackageManager().getPackageInfo(app.getPackageName(), Build.VERSION.SDK_INT >= 28 ? android.content.pm.PackageManager.GET_SIGNING_CERTIFICATES : android.content.pm.PackageManager.GET_SIGNATURES);
            byte[] certificate = Build.VERSION.SDK_INT >= 28 ? pkg.signingInfo.getApkContentsSigners()[0].toByteArray() : pkg.signatures[0].toByteArray();
            StringBuilder digest = new StringBuilder(); for (byte b : MessageDigest.getInstance("SHA-256").digest(certificate)) digest.append(String.format("%02x", b & 255));
            long installedBuild = Build.VERSION.SDK_INT >= 28 ? pkg.getLongVersionCode() : pkg.versionCode;
            if (!app.getPackageName().equals(identity.getString("packageName")) || installedBuild != identity.getLong("nativeBuild") || !digest.toString().equals(config.getString("signingCertificateSha256"))) throw new SecurityException("完整包签名或构建不匹配");
            Map<String, String> own = new HashMap<>(); for (Iterator<String> it = identity.keys(); it.hasNext();) { String key = it.next(); own.put(key, identity.get(key).toString()); }
            File data = new File(app.getApplicationInfo().dataDir), external = app.getExternalFilesDir(null);
            CompleteBaseMigration.migrate(root, own, Arrays.asList(data, external == null ? null : external.getParentFile()), target -> {
                copyCompleteBase("apps/" + identity.getString("runtimeAppId") + "/www", target);
                JSONObject manifest = new JSONObject(read(new FileInputStream(new File(target, "manifest.json")), 1024 * 1024));
                if (!identity.getString("runtimeAppId").equals(manifest.optString("id"))) throw new SecurityException("完整 APK 的 appid 不匹配");
            }, name -> syncBaseDirectories());
            if (!enabled) return;
            if (Arrays.asList("oppo", "honor", "samsung", "google-play", "app-store").contains(identity.getString("channelId"))) throw new SecurityException("当前原生桥接 WGT 方案按商店条款禁用");
            Map<String, PublicKey> roots = new HashMap<>(); JSONObject pins = config.getJSONObject("publicRoots"); for (Iterator<String> it = pins.keys(); it.hasNext();) { String id = it.next(); roots.put(id, ResourceStore.publicKey(pins.getString(id))); }
            Set<String> origins = new HashSet<>(); JSONArray hosts = config.getJSONArray("resourceOrigins"); for (int i = 0; i < hosts.length(); i++) origins.add(hosts.getString(i));
            store = new ResourceStore(root, own, roots, origins, name -> syncDirectories(), (directory, release) -> {
                JSONObject manifest = new JSONObject(read(new FileInputStream(new File(directory, "manifest.json")), 1024 * 1024));
                if (!release.text("runtimeAppId").equals(manifest.optString("id"))) throw new SecurityException("WGT 内部 appid 不匹配");
            });
            File busy = new File(root, "activities.json"); if (busy.isFile()) activities = new JSONObject(read(new FileInputStream(busy), 2000));
            store.boot(release -> {
                if (activities.length() > 0 || activeMicrophone()) return false;
                String query = "?clientKey=" + URLEncoder.encode(config.getString("clientKey"), "UTF-8") + "&nativeBuild=" + identity.getLong("nativeBuild") + "&resourceVersion=" + store.version();
                JSONObject response = new JSONObject(get(config.getString("apiBase") + "/system/resources/check" + query));
                JSONObject body = response.optJSONObject("data"); if (body == null) body = response;
                JSONObject offered = body.optJSONObject("update");
                return offered != null && offered.getString("signature").equals(release.signature) && ResourceStore.canonical(values(offered.getJSONObject("manifest"))).equals(release.canonical());
            });
            bootCompleted = true;
        } catch (Exception error) {
            bootCompleted = false;
            // 恢复事务未完成时不能让引擎继续加载不确定资源；保留现场供下次原生恢复。
            boolean incomplete = root != null && new File(root, "journal.properties").exists();
            if (incomplete) android.os.Process.killProcess(android.os.Process.myPid());
            /* 不打印证书、令牌或服务器内容 */
        }
    }
    private static void copyCompleteBase(String name, File target) throws Exception {
        String[] children = app.getAssets().list(name);
        if (children != null && children.length > 0) {
            if (!target.isDirectory() && !target.mkdirs()) throw new IOException("完整 APK 基线目录不可写");
            for (String child : children) { if (!child.matches("[a-zA-Z0-9._@-]+")) throw new SecurityException("APK 资源文件名不符合安全路径"); copyCompleteBase(name + "/" + child, new File(target, child)); }
        } else {
            try (InputStream in = app.getAssets().open(name); FileOutputStream out = new FileOutputStream(target)) { byte[] bytes = new byte[32768]; int count; while ((count = in.read(bytes)) != -1) out.write(bytes, 0, count); out.getFD().sync(); }
        }
    }
    private static void syncBaseDirectories() throws IOException {
        try {
        Properties state = new Properties(); try (InputStream in = new FileInputStream(new File(root, "journal.properties"))) { state.load(in); }
        List<File> directories = new ArrayList<>(); directories.add(root);
        if (state.getProperty("runtime") != null) directories.add(new File(state.getProperty("runtime")).getParentFile());
        for (File directory : directories) { FileDescriptor fd = Os.open(directory.getPath(), OsConstants.O_RDONLY, 0); try { Os.fsync(fd); } finally { Os.close(fd); } }
        } catch (Exception failure) { throw new IOException("完整包迁移目录同步失败", failure); }
    }
    private static boolean mainProcess(Application application) {
        if (Build.VERSION.SDK_INT >= 28) return application.getPackageName().equals(Application.getProcessName());
        android.app.ActivityManager manager = (android.app.ActivityManager)application.getSystemService(Context.ACTIVITY_SERVICE);
        List<android.app.ActivityManager.RunningAppProcessInfo> processes = manager.getRunningAppProcesses();
        if (processes != null) for (android.app.ActivityManager.RunningAppProcessInfo process : processes) if (process.pid == android.os.Process.myPid()) return application.getPackageName().equals(process.processName);
        return false;
    }
    private static void syncDirectories() throws IOException {
        try { List<File> directories = new ArrayList<>(); if (root != null) directories.add(root); if (store != null && store.runtimeParent() != null) directories.add(store.runtimeParent()); for (File directory : directories) if (directory.isDirectory()) { FileDescriptor fd = Os.open(directory.getPath(), OsConstants.O_RDONLY, 0); try { Os.fsync(fd); } finally { Os.close(fd); } } } catch (Exception error) { throw new IOException("状态目录同步失败", error); }
    }
    private static boolean activeMicrophone() { return app != null && !((AudioManager)app.getSystemService(Context.AUDIO_SERVICE)).getActiveRecordingConfigurations().isEmpty(); }
    public static void dispatch(String action, String json, Callback callback) {
        // 取消信号先越过工作队列；旧请求即使随后返回，也不能继续暂存或排队。
        boolean cancel = Arrays.asList("cancel", "session", "unhealthy").contains(action);
        if ("busy".equals(action)) try { cancel = new JSONObject(json).getJSONObject("activities").length() > 0; } catch (JSONException ignored) { }
        if (cancel) transfer.cancel();
        final long ticket = transfer.ticket();
        worker.execute(() -> {
            JSONObject result = new JSONObject();
            try { result.put("ok", true); result.put("value", execute(action, new JSONObject(json), ticket)); }
            catch (Exception error) { try { result.put("ok", false); result.put("message", error.getMessage()); } catch (JSONException ignored) { } }
            String output = result.toString(); new Handler(Looper.getMainLooper()).post(() -> callback.onResult(output));
        });
    }
    private static Object execute(String action, JSONObject args, long ticket) throws Exception {
        if (!bootCompleted || store == null) throw new IllegalStateException("原生启动钩子、完整包身份或恢复未通过");
        if (!Arrays.asList("identity", "recoveryContract", "journal", "critical", "cancel", "session", "busy", "unhealthy", "discard").contains(action)) transfer.check(ticket);
        switch (action) {
            case "identity": { JSONObject value = new JSONObject(config.getJSONObject("identity").toString()); value.put("resourceVersion", store.version()).put("activeReleaseId", store.releaseId()); return value; }
            case "recoveryContract": return new JSONObject().put("beforeJavascript", bootCompleted && store.bound()).put("atomicSwitch", store.bound()).put("verifiedBuild", config.getJSONObject("identity").getString("nativeFingerprint"));
            case "bindRuntime": {
                File runtime = new File(args.getString("path")); File data = new File(app.getApplicationInfo().dataDir); File external = app.getExternalFilesDir(null);
                File parent = runtime.getCanonicalPath().startsWith(data.getCanonicalPath() + File.separator) ? data : external == null ? data : external.getParentFile();
                store.bindRuntime(runtime, parent); return true;
            }
            case "replaceTrust": { JSONArray keys = args.getJSONArray("keys"); List<Map<String, Object>> authorizations = new ArrayList<>(); List<String> signatures = new ArrayList<>(); for (int i = 0; i < keys.length(); i++) { JSONObject key = keys.getJSONObject(i); authorizations.add(values(key.getJSONObject("payload"))); signatures.add(key.getString("signature")); } store.replaceTrust(authorizations, signatures); return true; }
            case "verifySignature": { JSONObject manifest = new JSONObject(args.getString("canonical")); pending = new ResourceStore.Release(values(manifest), args.getString("signature")); if (!pending.text("keyId").equals(args.getString("keyId"))) throw new SecurityException("公钥身份不符"); store.validate(pending); return true; }
            case "download": if (pending == null || !pending.text("downloadUrl").equals(args.getString("url")) || pending.number("byteLength") != args.getLong("bytes") || !pending.text("releaseId").equals(args.getString("releaseId"))) throw new SecurityException("下载参数不属于已验签清单"); return store.download(pending, transfer, ticket).getPath();
            case "verifyFile": { ResourceStore.Release release = pending != null ? pending : store.staged(); if (release == null || !release.text("sha256").equals(args.getString("sha256")) || release.number("byteLength") != args.getLong("bytes")) return false; store.verifyFile(new File(args.getString("path")), release); return true; }
            case "stage": { if (pending == null) throw new SecurityException("尚未验签"); File stage = store.stage(new File(args.getString("path")), pending); JSONObject manifest = new JSONObject(read(new FileInputStream(new File(stage, "manifest.json")), 1024 * 1024)); if (!pending.text("runtimeAppId").equals(manifest.optString("id"))) throw new SecurityException("WGT 内部 appid 不匹配"); return new File(root, "release-" + pending.text("sha256") + ".wgt").getPath(); }
            case "discard": { File file = new File(args.getString("path")).getCanonicalFile(); if (!file.getParentFile().equals(root.getCanonicalFile()) || !file.getName().startsWith("download-")) throw new SecurityException("临时文件清理越界"); file.delete(); return true; }
            case "journal": { ResourceStore.Release release = store.staged(); if (release == null) return JSONObject.NULL; return new JSONObject().put("state", store.phase().equals("PENDING_HEALTH") ? "PENDING_HEALTH" : "STAGED").put("release", new JSONObject().put("manifest", new JSONObject(release.fields)).put("signature", release.signature)).put("localPath", new File(root, "release-" + release.text("sha256") + ".wgt").getPath()); }
            case "journalWritten": return store.staged() != null;
            case "activate": if (activities.length() > 0 || activeMicrophone()) return false; store.requestActivation(); return true; // 只排队，下次原生冷启动才切换
            case "healthy": if (android.os.SystemClock.elapsedRealtime() - started < 60000) throw new IllegalStateException("原生健康观察窗口未结束"); store.healthy(args.getString("releaseId")); return true;
            case "unhealthy": store.unhealthy(); return true;
            case "busy": activities = args.getJSONObject("activities"); try (FileOutputStream out = new FileOutputStream(new File(root, "activities.json"))) { out.write(activities.toString().getBytes(StandardCharsets.UTF_8)); out.getFD().sync(); } return true;
            case "critical": { JSONArray busy = new JSONArray(); for (Iterator<String> it = activities.keys(); it.hasNext();) busy.put(it.next()); if (activeMicrophone()) busy.put("recording"); return busy; }
            case "cancel": store.cancelActivation(); return true;
            case "session": saveSession(args.optString("token", "")); store.cancelActivation(); return true;
            default: throw new IllegalArgumentException("未知资源桥接操作");
        }
    }
    private static Map<String, Object> values(JSONObject object) throws JSONException { Map<String, Object> values = new TreeMap<>(); for (Iterator<String> it = object.keys(); it.hasNext();) { String key = it.next(); Object value = object.get(key); if (!(value instanceof String) && !(value instanceof Number)) throw new JSONException("只接受扁平清单"); if (value instanceof Number && ((Number)value).doubleValue() != ((Number)value).longValue()) throw new JSONException("清单数值非整数"); values.put(key, value instanceof Number ? ((Number)value).longValue() : value); } return values; }
    private static SecretKey sessionKey() throws Exception {
        KeyStore keys = KeyStore.getInstance("AndroidKeyStore"); keys.load(null);
        if (!keys.containsAlias("rebu-resource-session")) { KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore"); generator.init(new KeyGenParameterSpec.Builder("rebu-resource-session", KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build()); generator.generateKey(); }
        return (SecretKey)keys.getKey("rebu-resource-session", null);
    }
    private static void saveSession(String token) throws Exception {
        File file = new File(root, "session.enc");
        if (token.isEmpty()) { file.delete(); return; }
        if (token.length() > 8192 || !token.matches("[A-Za-z0-9._-]+")) throw new SecurityException("会话格式非法");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, sessionKey());
        File tmp = new File(root, "session.tmp"); try (DataOutputStream out = new DataOutputStream(new FileOutputStream(tmp))) { out.writeInt(cipher.getIV().length); out.write(cipher.getIV()); out.write(cipher.doFinal(token.getBytes(StandardCharsets.UTF_8))); }
        Files.move(tmp.toPath(), file.toPath(), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
    }
    private static String session() throws Exception { File file = new File(root, "session.enc"); if (!file.exists()) return ""; try (DataInputStream in = new DataInputStream(new FileInputStream(file))) { int length = in.readInt(); if (length != 12 || file.length() > 9000) throw new SecurityException("会话密文非法"); byte[] iv = new byte[length]; in.readFully(iv); byte[] data = new byte[(int)file.length() - 4 - length]; in.readFully(data); Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.DECRYPT_MODE, sessionKey(), new GCMParameterSpec(128, iv)); return new String(cipher.doFinal(data), StandardCharsets.UTF_8); } }
    private static String get(String address) throws Exception {
        URL url = new URL(address); if (!url.getProtocol().equals("https")) throw new SecurityException("准入复检必须HTTPS");
        HttpURLConnection conn = (HttpURLConnection)url.openConnection(); String token = session(); if (!token.isEmpty()) conn.setRequestProperty("Authorization", "Bearer " + token);
        try (ResourceTransfer.Task task = transfer.begin(conn, transfer.ticket(), 6000)) {
            conn.setConnectTimeout(3000); conn.setReadTimeout(3000);
            task.check(); if (conn.getResponseCode() != 200) throw new IOException("准入复检失败");
            try (InputStream input = conn.getInputStream(); ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192]; int n;
                while ((n = input.read(buffer)) != -1) { task.check(); if (bytes.size() + n > 64000) throw new IOException("准入复检响应超限"); bytes.write(buffer, 0, n); }
                task.check(); return bytes.toString("UTF-8");
            }
        }
    }
    private static String read(InputStream input, int limit) throws IOException { try (InputStream in = input; ByteArrayOutputStream bytes = new ByteArrayOutputStream()) { byte[] buffer = new byte[8192]; int n; while ((n = in.read(buffer)) != -1) { if (bytes.size() + n > limit) throw new IOException("原生配置/响应超限"); bytes.write(buffer, 0, n); } return bytes.toString("UTF-8"); } }
}
