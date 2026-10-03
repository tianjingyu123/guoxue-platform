import cn.rebu.resource.ResourceStore;
import java.io.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;
import java.util.zip.*;

/** 独立 JVM 进程验证真实 Java 文件/签名/启动恢复；不冒充 Android/DCloud 正式基座验收。 */
public final class NativeRecoveryProbe {
    private static final Map<String, String> ID = new HashMap<>();
    static { for (String[] item : new String[][]{{"applicationId","rebu"},{"productId","rebu"},{"platform","android"},{"channelId","xiaomi"},{"packageName","test.rebu.probe"},{"runtimeAppId","__TEST_APP"},{"nativeBuild","253"},{"nativeFingerprint",String.join("", Collections.nCopies(64,"a"))}}) ID.put(item[0], item[1]); }
    private static String pem(PublicKey key) { return "-----BEGIN PUBLIC KEY-----\n" + Base64.getEncoder().encodeToString(key.getEncoded()) + "\n-----END PUBLIC KEY-----"; }
    private static String sign(String input, PrivateKey key) throws Exception { Signature signer = Signature.getInstance("Ed25519"); signer.initSign(key); signer.update(input.getBytes(StandardCharsets.UTF_8)); return Base64.getEncoder().encodeToString(signer.sign()); }
    private static void check(boolean value, String message) { if (!value) throw new AssertionError(message); }
    interface Action { void run() throws Exception; }
    private static void rejects(Action action) throws Exception { try { action.run(); } catch (Exception expected) { return; } throw new AssertionError("应当拒绝"); }
    private static final class Fixture {
        File root, sandbox, runtime, file;
        KeyPair rootKey, releaseKey;
        ResourceStore store;
        Fixture() throws Exception {
            sandbox = Files.createTempDirectory("rebu-native-proof-").toFile(); root = new File(sandbox,"private"); runtime = new File(sandbox,"apps/__TEST_APP/www"); runtime.mkdirs(); Files.write(new File(runtime,"manifest.json").toPath(), "{\"id\":\"__TEST_APP\"}".getBytes(StandardCharsets.UTF_8)); Files.write(new File(runtime,"app-service.js").toPath(), "known healthy".getBytes(StandardCharsets.UTF_8));
            rootKey = KeyPairGenerator.getInstance("Ed25519").generateKeyPair(); releaseKey = KeyPairGenerator.getInstance("Ed25519").generateKeyPair();
            store = make(root, rootKey.getPublic(), name -> {}); store.bindRuntime(runtime, sandbox);
            Files.write(new File(root,"probe-root-public.pem").toPath(), pem(rootKey.getPublic()).getBytes(StandardCharsets.UTF_8));
            Map<String, Object> grant = new TreeMap<>(); grant.put("schemaVersion",1L); grant.put("kind","resource-key"); grant.put("applicationId","rebu"); grant.put("keyId","test-key"); grant.put("publicKeyPem",pem(releaseKey.getPublic())); grant.put("rootKeyId","test-root"); grant.put("issuedAt",Instant.now().minusSeconds(30).toString()); grant.put("expiresAt",Instant.now().plusSeconds(3600).toString());
            store.authorizeKey(grant, sign(ResourceStore.canonical(grant), rootKey.getPrivate()));
            file = new File(root,"download-probe.tmp"); try (ZipOutputStream zip = new ZipOutputStream(new FileOutputStream(file))) { for (String name : Arrays.asList("manifest.json","app-service.js")) { zip.putNextEntry(new ZipEntry(name)); zip.write((name.equals("manifest.json") ? "{\"id\":\"__TEST_APP\"}" : "this is invalid JavaScript !!!").getBytes(StandardCharsets.UTF_8)); zip.closeEntry(); } }
        }
        ResourceStore.Release release(long version, Map<String, Object> changes) throws Exception {
            Map<String, Object> values = new TreeMap<>(); values.putAll(ID); values.remove("nativeBuild"); values.put("schemaVersion",1L); values.put("releaseId","test-resource-" + version); values.put("resourceVersion",version); values.put("minNativeBuild",253L); values.put("maxNativeBuild",253L); values.put("byteLength",file.length()); values.put("sha256",ResourceStore.sha(file)); values.put("keyId","test-key"); values.put("issuedAt",Instant.now().minusSeconds(10).toString()); values.put("expiresAt",Instant.now().plusSeconds(3600).toString()); values.put("changeType","web-resources"); values.put("downloadUrl","https://resources.example.invalid/test.wgt"); values.putAll(changes);
            return new ResourceStore.Release(values, sign(ResourceStore.canonical(values), releaseKey.getPrivate()));
        }
    }
    private static ResourceStore make(File root, PublicKey key, ResourceStore.Checkpoint checkpoint) throws Exception { return new ResourceStore(root, ID, Collections.singletonMap("test-root",key), Collections.singleton("https://resources.example.invalid"), checkpoint); }
    public static void main(String[] args) throws Exception {
        if (args.length > 0 && args[0].equals("node-signature")) {
            PublicKey publicRoot = ResourceStore.publicKey(new String(Base64.getDecoder().decode(args[1]), StandardCharsets.UTF_8));
            Map<String, Object> grant = new TreeMap<>(); grant.put("schemaVersion", 1L); grant.put("kind", "resource-key"); grant.put("applicationId", "rebu"); grant.put("keyId", "node-key"); grant.put("rootKeyId", "test-root"); grant.put("publicKeyPem", new String(Base64.getDecoder().decode(args[2]), StandardCharsets.UTF_8)); grant.put("issuedAt", args[3]); grant.put("expiresAt", args[4]);
            ResourceStore cross = make(Files.createTempDirectory("rebu-node-java-proof-").toFile(), publicRoot, name -> {});
            cross.authorizeKey(grant, args[5]);
            System.out.println("{\"nodeJavaRootSignature\":true}"); return;
        }
        if (args.length > 0) {
            File root = new File(args[0]); PublicKey key = ResourceStore.publicKey(new String(Files.readAllBytes(new File(root,"probe-root-public.pem").toPath()), StandardCharsets.UTF_8));
            ResourceStore store = make(root,key,name -> { if (name.equals(args[1])) Runtime.getRuntime().halt(91); });
            store.boot(release -> true); return;
        }
        int groups = 0;
        Fixture f = new Fixture(); ResourceStore.Release release = f.release(1, Collections.emptyMap());
        f.store.stage(f.file, release); f.store.requestActivation(); check(f.store.boot(r -> true),"冷启动未切换"); check(f.store.version() == 1,"资源版本未切换");
        // 故意不运行任何新 JS/健康确认；另一次 native boot 必须恢复健康文件。
        ResourceStore restarted = make(f.root,f.rootKey.getPublic(),name -> {}); restarted.boot(r -> true); check(restarted.version() == 0,"坏 JS 未回退"); check(new String(Files.readAllBytes(new File(f.runtime,"app-service.js").toPath()),StandardCharsets.UTF_8).equals("known healthy"),"健康旧资源损坏"); groups++;
        for (String point : Arrays.asList("JOURNAL_SYNCED","OLD_MOVED","NEW_MOVED","PENDING_HEALTH")) {
            Fixture crash = new Fixture(); crash.store.stage(crash.file,crash.release(1,Collections.emptyMap())); crash.store.requestActivation();
            Process child = new ProcessBuilder(new File(System.getProperty("java.home"),"bin/java.exe").getPath(),"-cp",System.getProperty("java.class.path"),"NativeRecoveryProbe",crash.root.getPath(),point).inheritIO().start(); check(child.waitFor() == 91,"未到达真实进程中止点");
            ResourceStore recovered = make(crash.root,crash.rootKey.getPublic(),name -> {}); recovered.boot(r -> true); check(recovered.version() == 0,"杀进程后未恢复"); check(new File(crash.runtime,"manifest.json").exists(),"运行目录丢失");
        } groups++;
        Fixture integrity = new Fixture(); ResourceStore.Release valid = integrity.release(1,Collections.emptyMap());
        byte[] original = Files.readAllBytes(integrity.file.toPath()); Files.write(integrity.file.toPath(),new byte[]{1,2,3}); rejects(() -> integrity.store.stage(integrity.file,valid)); Files.write(integrity.file.toPath(),original); integrity.store.stage(integrity.file,valid); integrity.store.requestActivation();
        try (OutputStream out = new FileOutputStream(new File(integrity.root,"release-" + valid.text("sha256") + ".wgt"),true)) { out.write(1); }
        check(!integrity.store.boot(r -> true) && integrity.store.version() == 0,"暂存包篡改被激活"); groups++;
        Fixture conditions = new Fixture();
        for (Map<String, Object> change : Arrays.<Map<String,Object>>asList(Collections.singletonMap("channelId","huawei"),Collections.singletonMap("nativeFingerprint",String.join("",Collections.nCopies(64,"b"))),Collections.singletonMap("minNativeBuild",254L),Collections.singletonMap("expiresAt",Instant.now().minusSeconds(1).toString()))) rejects(() -> conditions.store.validate(conditions.release(1,change)));
        ResourceStore.Release wrongSig = conditions.release(1,Collections.emptyMap()); rejects(() -> conditions.store.validate(new ResourceStore.Release(wrongSig.fields,Base64.getEncoder().encodeToString(new byte[64])))); groups++;
        Fixture offline = new Fixture(); offline.store.stage(offline.file,offline.release(1,Collections.emptyMap())); offline.store.requestActivation(); check(!offline.store.boot(r -> { throw new IOException("断网"); }) && offline.store.version() == 0,"断网仍切换"); groups++;
        Fixture revoked = new Fixture(); revoked.store.stage(revoked.file,revoked.release(1,Collections.emptyMap())); revoked.store.requestActivation(); revoked.store.replaceTrust(Collections.emptyList(),Collections.emptyList()); check(!revoked.store.boot(r -> true),"撤销公钥仍激活"); groups++;
        Fixture healthy = new Fixture(); ResourceStore.Release good = healthy.release(1,Collections.emptyMap()); healthy.store.stage(healthy.file,good); healthy.store.requestActivation(); healthy.store.boot(r -> true); healthy.store.healthy(good.text("releaseId")); healthy.store.boot(r -> false); check(healthy.store.version() == 1,"健康版本错误回退"); healthy.store.unhealthy(); healthy.store.boot(r -> false); check(healthy.store.version() == 0,"健康后崩溃不能恢复"); groups++;
        Fixture repeated = new Fixture(); ResourceStore.Release repeatedRelease = repeated.release(1,Collections.emptyMap()); repeated.store.stage(repeated.file,repeatedRelease); repeated.store.requestActivation(); repeated.store.boot(r -> true); repeated.store.healthy(repeatedRelease.text("releaseId"));
        Process repeatedCrash = new ProcessBuilder(new File(System.getProperty("java.home"),"bin/java.exe").getPath(),"-cp",System.getProperty("java.class.path"),"NativeRecoveryProbe",repeated.root.getPath(),"STATE_SYNCED").inheritIO().start(); check(repeatedCrash.waitFor() == 91,"已确认版本的新进程未中止");
        ResourceStore secondCrashBoot = make(repeated.root,repeated.rootKey.getPublic(),name -> {}); secondCrashBoot.boot(r -> false); check(secondCrashBoot.version() == 0,"已确认版本连续未健康启动没有回退"); groups++;
        Fixture changedBase = new Fixture(); Map<String, String> otherIdentity = new HashMap<>(ID); otherIdentity.put("nativeBuild", "254"); rejects(() -> new ResourceStore(changedBase.root, otherIdentity, Collections.singletonMap("test-root", changedBase.rootKey.getPublic()), Collections.singleton("https://resources.example.invalid"), name -> {})); groups++;
        Fixture corruptBackup = new Fixture(); corruptBackup.store.stage(corruptBackup.file,corruptBackup.release(1,Collections.emptyMap())); corruptBackup.store.requestActivation(); corruptBackup.store.boot(r -> true); Files.write(new File(corruptBackup.runtime.getParentFile(),"rebu-resource-previous/app-service.js").toPath(),"corrupt".getBytes(StandardCharsets.UTF_8)); rejects(() -> make(corruptBackup.root,corruptBackup.rootKey.getPublic(),name -> {}).boot(r -> true)); groups++;
        System.out.println("{\"passedGroups\":" + groups + ",\"runtime\":\"JVM\",\"androidVerified\":false}");
    }
}
