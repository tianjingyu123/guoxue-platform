package cn.rebu.resource;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.security.*;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.*;
import java.util.zip.*;

/** 原生资源事务。启动恢复不依赖 JS；运行时目录须由完整包第一次健康启动绑定。 */
public final class ResourceStore {
    public interface OfferCheck { boolean allowed(Release release) throws Exception; }
    public interface Checkpoint { void reached(String name) throws IOException; }
    public interface GenerationCheck { void validate(File directory, Release release) throws Exception; }
    public static final class Release {
        public final SortedMap<String, Object> fields;
        public final String signature;
        public Release(Map<String, Object> values, String signature) { this.fields = new TreeMap<>(values); this.signature = signature; }
        public String text(String key) { return String.valueOf(fields.get(key)); }
        public long number(String key) { return ((Number) fields.get(key)).longValue(); }
        public String canonical() { return ResourceStore.canonical(fields); }
    }
    private final File root;
    private final Map<String, String> identity;
    private final Map<String, PublicKey> roots;
    private final Set<String> origins;
    private final Properties state = new Properties();
    private final Checkpoint checkpoint;
    private final GenerationCheck generationCheck;
    public ResourceStore(File root, Map<String, String> identity, Map<String, PublicKey> roots, Set<String> origins, Checkpoint checkpoint) throws Exception {
        this(root, identity, roots, origins, checkpoint, (directory, release) -> {});
    }
    public ResourceStore(File root, Map<String, String> identity, Map<String, PublicKey> roots, Set<String> origins, Checkpoint checkpoint, GenerationCheck generationCheck) throws Exception {
        this.root = root.getCanonicalFile(); this.identity = identity; this.roots = roots; this.origins = origins; this.checkpoint = checkpoint;
        this.generationCheck = generationCheck;
        if (!root.isDirectory() && !root.mkdirs()) throw new IOException("资源状态目录不可写");
        File journal = new File(root, "journal.properties");
        if (journal.exists()) try (InputStream input = new FileInputStream(journal)) { state.load(input); }
        String ownIdentity = canonical(identity);
        if (state.getProperty("nativeIdentity") != null && !ownIdentity.equals(state.getProperty("nativeIdentity"))) throw new SecurityException("完整包基线已改变，需要独立验证资源状态迁移，拒绝沿用旧基座日志");
        state.setProperty("nativeIdentity", ownIdentity);
    }
    public static String canonical(Map<String, ?> fields) {
        StringBuilder out = new StringBuilder("{");
        for (String key : new TreeSet<>(fields.keySet())) { if (out.length() > 1) out.append(','); Object value = fields.get(key); out.append(quote(key)).append(':').append(value instanceof Number ? value.toString() : quote(String.valueOf(value))); }
        return out.append('}').toString();
    }
    private static String quote(String value) {
        StringBuilder out = new StringBuilder("\"");
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (c == '\\' || c == '"') out.append('\\').append(c);
            else if (c == '\n') out.append("\\n"); else if (c == '\r') out.append("\\r"); else if (c == '\t') out.append("\\t"); else if (c == '\b') out.append("\\b"); else if (c == '\f') out.append("\\f");
            else if (c < 32 || (Character.isHighSurrogate(c) && (i + 1 == value.length() || !Character.isLowSurrogate(value.charAt(i + 1)))) || (Character.isLowSurrogate(c) && (i == 0 || !Character.isHighSurrogate(value.charAt(i - 1))))) out.append(String.format("\\u%04x", (int)c));
            else out.append(c);
        }
        return out.append('"').toString();
    }
    public static PublicKey publicKey(String pem) throws Exception { return ResourceCrypto.publicKey(pem); }
    private static boolean signature(String canonical, String encoded, PublicKey key) throws Exception { return ResourceCrypto.verify(canonical, encoded, key); }
    public synchronized void authorizeKey(Map<String, Object> authorization, String sig) throws Exception {
        if (!Long.valueOf(1).equals(((Number)authorization.get("schemaVersion")).longValue()) || !"resource-key".equals(authorization.get("kind")) || !identity.get("applicationId").equals(authorization.get("applicationId")) || !signature(canonical(authorization), sig, roots.get(String.valueOf(authorization.get("rootKeyId"))))) throw new SecurityException("公钥根授权无效");
        validTime(String.valueOf(authorization.get("issuedAt")), String.valueOf(authorization.get("expiresAt")));
        String id = String.valueOf(authorization.get("keyId"));
        if (!id.matches("[a-z][a-z0-9._-]{1,79}")) throw new SecurityException("公钥标识非法");
        publicKey(String.valueOf(authorization.get("publicKeyPem")));
        Properties data = new Properties(); for (Map.Entry<String, Object> entry : authorization.entrySet()) data.setProperty(entry.getKey(), String.valueOf(entry.getValue())); data.setProperty("signature", sig);
        save(new File(root, "key-" + id + ".properties"), data);
    }
    private PublicKey trustedKey(String id) throws Exception {
        if (!id.matches("[a-z][a-z0-9._-]{1,79}")) throw new SecurityException("公钥标识非法");
        Properties data = new Properties(); try (InputStream input = new FileInputStream(new File(root, "key-" + id + ".properties"))) { data.load(input); }
        Map<String, Object> values = new TreeMap<>(); for (String key : data.stringPropertyNames()) if (!key.equals("signature")) values.put(key, key.equals("schemaVersion") ? Long.parseLong(data.getProperty(key)) : data.getProperty(key));
        if (!identity.get("applicationId").equals(values.get("applicationId")) || !signature(canonical(values), data.getProperty("signature"), roots.get(data.getProperty("rootKeyId")))) throw new SecurityException("缓存公钥被篡改");
        validTime(data.getProperty("issuedAt"), data.getProperty("expiresAt"));
        return publicKey(data.getProperty("publicKeyPem"));
    }
    public synchronized void replaceTrust(List<Map<String, Object>> keys, List<String> signatures) throws Exception {
        // 逐条验证根授权；完整响应处理成功后撤销遗漏项。失败不会视为刷新成功。
        Set<String> ids = new HashSet<>();
        for (int i = 0; i < keys.size(); i++) { authorizeKey(keys.get(i), signatures.get(i)); ids.add(String.valueOf(keys.get(i).get("keyId"))); }
        for (File file : root.listFiles()) if (file.getName().startsWith("key-") && file.getName().endsWith(".properties") && !ids.contains(file.getName().substring(4, file.getName().length() - 11))) file.delete();
    }
    private static void validTime(String issued, String expires) { long now = System.currentTimeMillis(), a = Instant.parse(issued).toEpochMilli(), b = Instant.parse(expires).toEpochMilli(); if (a > now + 60000 || b <= now || b <= a) throw new SecurityException("授权过期或尚未生效"); }
    public synchronized void validate(Release release) throws Exception {
        Set<String> expected = new HashSet<>(Arrays.asList("schemaVersion", "releaseId", "productId", "applicationId", "platform", "channelId", "packageName", "runtimeAppId", "resourceVersion", "minNativeBuild", "maxNativeBuild", "nativeFingerprint", "downloadUrl", "byteLength", "sha256", "keyId", "issuedAt", "expiresAt", "changeType"));
        if (!release.fields.keySet().equals(expected) || release.number("schemaVersion") != 1 || !release.text("platform").equals("android") || !release.text("changeType").equals("web-resources")) throw new SecurityException("资源协议或字段不正确");
        for (String key : Arrays.asList("productId", "applicationId", "platform", "channelId", "packageName", "runtimeAppId", "nativeFingerprint")) if (!Objects.equals(identity.get(key), release.text(key))) throw new SecurityException("安装身份或原生基座不匹配");
        long build = Long.parseLong(identity.get("nativeBuild"));
        if (build < release.number("minNativeBuild") || build > release.number("maxNativeBuild") || release.number("resourceVersion") <= version() || release.number("byteLength") <= 0 || release.number("byteLength") > 100L * 1024 * 1024 || !release.text("sha256").matches("[a-f0-9]{64}") || !release.text("releaseId").matches("[a-zA-Z0-9._-]{1,100}")) throw new SecurityException("资源版本或范围非法");
        validTime(release.text("issuedAt"), release.text("expiresAt"));
        if (Instant.parse(release.text("expiresAt")).toEpochMilli() - Instant.parse(release.text("issuedAt")).toEpochMilli() > 7L * 86400000) throw new SecurityException("清单有效期超过上限");
        URL url = new URL(release.text("downloadUrl"));
        if (!url.getProtocol().equals("https") || url.getUserInfo() != null || url.getRef() != null || !origins.contains(origin(url))) throw new SecurityException("资源域名未获授权");
        if (!signature(release.canonical(), release.signature, trustedKey(release.text("keyId")))) throw new SecurityException("资源签名无效");
    }
    private static String origin(URL url) { return url.getProtocol() + "://" + url.getHost() + (url.getPort() == -1 || url.getPort() == 443 ? "" : ":" + url.getPort()); }
    public synchronized long version() { return Long.parseLong(state.getProperty("version", "0")); }
    public synchronized String releaseId() { return state.getProperty("activeRelease", ""); }
    public synchronized String phase() { return state.getProperty("phase", "HEALTHY"); }
    public File temporary(String id) throws Exception { if (!id.matches("[a-zA-Z0-9._-]{1,100}")) throw new SecurityException("资源标识非法"); return new File(root, "download-" + id + ".tmp"); }
    public File download(Release release) throws Exception {
        ResourceTransfer transfer = new ResourceTransfer(); return download(release, transfer, transfer.ticket());
    }
    public File download(Release release, ResourceTransfer transfer, long ticket) throws Exception {
        transfer.check(ticket); validate(release); transfer.check(ticket); File target = temporary(release.text("releaseId"));
        HttpURLConnection connection = (HttpURLConnection)new URL(release.text("downloadUrl")).openConnection();
        try (ResourceTransfer.Task task = transfer.begin(connection, ticket, 120000)) {
            task.check(); if (connection.getResponseCode() != 200) throw new IOException("资源下载失败或重定向被拒绝");
            try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(target)) {
                byte[] buffer = new byte[32768]; long size = 0; int count;
                while ((count = input.read(buffer)) != -1) { task.check(); size += count; if (size > release.number("byteLength")) throw new SecurityException("下载体积超出清单"); output.write(buffer, 0, count); }
                task.check(); output.getFD().sync();
            }
            task.check(); verifyFile(target, release); task.check(); return target;
        } catch (Exception error) { target.delete(); throw error; }
    }
    public synchronized void verifyFile(File file, Release release) throws Exception { confined(file); if (file.length() != release.number("byteLength") || !sha(file).equals(release.text("sha256"))) throw new SecurityException("资源包被篡改或截断"); }
    public static String sha(File file) throws Exception { MessageDigest hash = MessageDigest.getInstance("SHA-256"); try (InputStream input = new FileInputStream(file)) { byte[] b = new byte[32768]; int count; while ((count = input.read(b)) != -1) hash.update(b, 0, count); } StringBuilder out = new StringBuilder(); for (byte b : hash.digest()) out.append(String.format("%02x", b & 255)); return out.toString(); }
    static String treeHash(File directory) throws Exception {
        SortedMap<String, String> files = new TreeMap<>(); collectHashes(directory.getCanonicalFile(), directory, files);
        MessageDigest hash = MessageDigest.getInstance("SHA-256"); hash.update(canonical(files).getBytes(StandardCharsets.UTF_8));
        StringBuilder out = new StringBuilder(); for (byte b : hash.digest()) out.append(String.format("%02x", b & 255)); return out.toString();
    }
    private static void collectHashes(File base, File file, SortedMap<String, String> files) throws Exception {
        File actual = file.getCanonicalFile(); if (!actual.equals(base) && !actual.getPath().startsWith(base.getPath() + File.separator)) throw new SecurityException("健康资源目录存在越界链接");
        if (file.isDirectory()) { for (File child : file.listFiles()) collectHashes(base, child, files); }
        else { if (files.size() >= 10000) throw new SecurityException("健康资源文件数超限"); files.put(base.toPath().relativize(actual.toPath()).toString().replace('\\', '/'), sha(actual)); }
    }
    private void confined(File file) throws IOException { if (!file.getCanonicalPath().startsWith(root.getPath() + File.separator)) throw new SecurityException("文件越出私有资源目录"); }
    public synchronized File stage(File file, Release release) throws Exception {
        validate(release); verifyFile(file, release);
        File generation = new File(root, "gen-" + release.number("resourceVersion") + "-" + release.text("sha256").substring(0, 16));
        if (generation.exists()) remove(generation);
        if (!generation.mkdir()) throw new IOException("无法创建暂存目录");
        long expanded = 0; Set<String> names = new HashSet<>();
        try (ZipInputStream zip = new ZipInputStream(new FileInputStream(file))) {
            ZipEntry entry; byte[] buffer = new byte[32768];
            while ((entry = zip.getNextEntry()) != null) {
                String name = entry.getName(); File dest = new File(generation, name).getCanonicalFile();
                if (names.size() >= 10000 || name.contains("\\") || name.startsWith("/") || name.contains(":") || Arrays.asList(name.split("/")).contains("..") || !dest.getPath().startsWith(generation.getCanonicalPath() + File.separator) || !names.add(name.toLowerCase(Locale.ROOT)) || name.matches("(?i).*\\.(so|dex|jar|aar|apk|ipa|hap|hsp|dll|exe|dylib)$") || name.matches("(?i)(.*/)?(nativeplugins|AndroidManifest\\.xml)(/.*)?")) throw new SecurityException("资源包含危险路径或原生文件");
                if (entry.isDirectory()) { dest.mkdirs(); continue; }
                dest.getParentFile().mkdirs();
                try (FileOutputStream output = new FileOutputStream(dest)) { int count; while ((count = zip.read(buffer)) != -1) { expanded += count; if (expanded > 300L * 1024 * 1024) throw new SecurityException("解压体积超限"); output.write(buffer, 0, count); } output.getFD().sync(); }
            }
        } catch (Exception error) { remove(generation); throw error; }
        if (!names.contains("manifest.json")) { remove(generation); throw new SecurityException("资源 manifest 缺失"); }
        try { generationCheck.validate(generation, release); } catch (Exception error) { remove(generation); cancelActivation(); throw error; }
        File archive = new File(root, "release-" + release.text("sha256") + ".wgt");
        if (!file.getCanonicalFile().equals(archive.getCanonicalFile())) copy(file, archive);
        Properties data = new Properties(); for (Map.Entry<String, Object> entry : release.fields.entrySet()) data.setProperty("m." + entry.getKey(), String.valueOf(entry.getValue())); data.setProperty("signature", release.signature); save(new File(root, "staged.properties"), data);
        state.setProperty("staged", generation.getName()); state.setProperty("archive", archive.getName()); saveState(); return generation;
    }
    public synchronized Release staged() throws Exception {
        if (state.getProperty("staged") == null) return null;
        Properties data = new Properties(); try (InputStream input = new FileInputStream(new File(root, "staged.properties"))) { data.load(input); }
        Map<String, Object> values = new TreeMap<>(); Set<String> numeric = new HashSet<>(Arrays.asList("schemaVersion", "resourceVersion", "minNativeBuild", "maxNativeBuild", "byteLength"));
        for (String key : data.stringPropertyNames()) if (key.startsWith("m.")) { String name = key.substring(2); values.put(name, numeric.contains(name) ? Long.parseLong(data.getProperty(key)) : data.getProperty(key)); }
        return new Release(values, data.getProperty("signature"));
    }
    public synchronized void bindRuntime(File runtime, File allowedParent) throws Exception {
        File actual = runtime.getCanonicalFile();
        if (!actual.getPath().startsWith(allowedParent.getCanonicalPath() + File.separator) || !actual.getPath().replace('\\', '/').endsWith("/apps/" + identity.get("runtimeAppId") + "/www") || !new File(actual, "manifest.json").isFile()) throw new SecurityException("运行目录不符合完整包身份或尚未释放资源");
        String old = state.getProperty("runtime"); if (old != null && !old.equals(actual.getPath())) throw new SecurityException("运行目录不可重绑定");
        state.setProperty("runtime", actual.getPath()); saveState();
    }
    public synchronized boolean bound() { return state.getProperty("runtime") != null; }
    public synchronized File runtimeParent() { return bound() ? new File(state.getProperty("runtime")).getParentFile() : null; }
    public synchronized void requestActivation() throws Exception { if (!bound() || staged() == null) throw new IllegalStateException("资源尚未暂存或未绑定完整包"); state.setProperty("queued", "true"); saveState(); }
    public synchronized void cancelActivation() throws Exception { state.remove("queued"); saveState(); }
    /** 必须从 Application.onCreate 同步调用，完成恢复后框架才可以读取 www。 */
    public synchronized boolean boot(OfferCheck checker) throws Exception {
        if (!bound()) return false;
        File runtime = new File(state.getProperty("runtime")), previous = new File(runtime.getParentFile(), "rebu-resource-previous");
        String phase = state.getProperty("phase", "HEALTHY");
        // 已确认版本之后的每次启动仍须重新确认健康；未确认即再次启动则恢复旧资源。
        if (phase.equals("HEALTHY") && version() > 0 && previous.exists()) {
            if (Integer.parseInt(state.getProperty("bootAttempts", "0")) > 0) { phase = "PENDING_HEALTH"; state.setProperty("phase", phase); saveState(); }
            else { state.setProperty("bootAttempts", "1"); saveState(); }
        }
        if (!phase.equals("HEALTHY")) {
            File recovery = previous.exists() ? previous : runtime;
            String expected = state.getProperty("previousTreeHash");
            if (expected == null || !recovery.isDirectory() || !expected.equals(treeHash(recovery))) throw new SecurityException("健康回退资源丢失或被篡改，不能加载不确定文件");
            if (previous.exists()) { if (runtime.exists()) remove(runtime); rename(previous, runtime); }
            else if (!runtime.exists()) throw new IOException("恢复时缺少健康资源");
            state.setProperty("version", state.getProperty("previousVersion", "0")); state.setProperty("activeRelease", state.getProperty("previousRelease", "")); state.setProperty("phase", "HEALTHY"); state.setProperty("bootAttempts", "0"); state.remove("queued"); state.remove("staged"); saveState(); checkpoint.reached("RECOVERED_BEFORE_JS"); return false;
        }
        if (!"true".equals(state.getProperty("queued"))) return false;
        Release release = staged();
        try { validate(release); if (!checker.allowed(release)) { cancelActivation(); return false; } stage(new File(root, state.getProperty("archive")), release); } catch (Exception error) { cancelActivation(); return false; }
        File staged = new File(root, state.getProperty("staged")); confined(staged);
        // 在同一运行目录父路径准备资源；跨文件系统不把 rename 的失败当作成功。
        File next = new File(runtime.getParentFile(), "rebu-resource-next"); if (next.exists()) remove(next); copy(staged, next);
        if (previous.exists()) remove(previous);
        state.setProperty("previousVersion", Long.toString(version())); state.setProperty("previousRelease", releaseId()); state.setProperty("previousTreeHash", treeHash(runtime)); state.setProperty("phase", "SWITCHING"); saveState(); checkpoint.reached("JOURNAL_SYNCED");
        rename(runtime, previous); checkpoint.reached("OLD_MOVED"); rename(next, runtime); checkpoint.reached("NEW_MOVED");
        state.setProperty("version", Long.toString(release.number("resourceVersion"))); state.setProperty("activeRelease", release.text("releaseId")); state.setProperty("phase", "PENDING_HEALTH"); state.remove("queued"); saveState(); checkpoint.reached("PENDING_HEALTH"); return true;
    }
    public synchronized void healthy(String id) throws Exception { if (id.isEmpty() || !id.equals(releaseId())) return; state.setProperty("phase", "HEALTHY"); state.setProperty("bootAttempts", "0"); state.remove("staged"); saveState(); }
    public synchronized void unhealthy() throws Exception { if (!releaseId().isEmpty() && new File(new File(state.getProperty("runtime")).getParentFile(), "rebu-resource-previous").exists()) { state.setProperty("phase", "PENDING_HEALTH"); saveState(); } }
    private void saveState() throws Exception { save(new File(root, "journal.properties"), state); checkpoint.reached("STATE_SYNCED"); }
    private static void save(File target, Properties properties) throws Exception { File tmp = new File(target.getPath() + ".tmp"); try (FileOutputStream out = new FileOutputStream(tmp)) { properties.store(out, "原生资源状态"); out.getFD().sync(); } Files.move(tmp.toPath(), target.toPath(), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING); }
    private static void rename(File from, File to) throws IOException { if (!from.renameTo(to)) throw new IOException("原子资源移动失败"); }
    private void remove(File file) throws IOException { File canonical = file.getCanonicalFile(); String runtime = state.getProperty("runtime"); if (!canonical.getPath().startsWith(root.getPath() + File.separator) && (runtime == null || !canonical.getPath().startsWith(new File(runtime).getParentFile().getCanonicalPath() + File.separator))) throw new SecurityException("删除越界"); if (file.isDirectory()) for (File child : file.listFiles()) remove(child); if (!file.delete()) throw new IOException("无法清理自有资源文件"); }
    private static void copy(File from, File to) throws Exception { if (from.isDirectory()) { if (!to.mkdir()) throw new IOException("暂存目标不可写"); for (File child : from.listFiles()) copy(child, new File(to, child.getName())); } else { try (InputStream in = new FileInputStream(from); FileOutputStream out = new FileOutputStream(to)) { byte[] b = new byte[32768]; int n; while ((n = in.read(b)) != -1) out.write(b, 0, n); out.getFD().sync(); } } }
}
