package cn.rebu.resource;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;

/** 完整 APK 基座更新：只读已验证安装包 assets；保留旧资源和日志，事务完成后才允许 JS。 */
public final class CompleteBaseMigration {
    public interface Loader { void extract(File target) throws Exception; }
    private CompleteBaseMigration() {}
    public static boolean migrate(File root, Map<String, String> identity, List<File> privateParents, Loader loader, ResourceStore.Checkpoint checkpoint) throws Exception {
        File journal = new File(root, "journal.properties");
        if (!journal.isFile()) return false;
        Properties state = read(journal);
        String target = ResourceStore.canonical(identity), old = state.getProperty("nativeIdentity");
        if (target.equals(old) && !"BASE_REPLACING".equals(state.getProperty("phase"))) return false;
        if (old == null) throw new SecurityException("缺少旧完整包身份");
        String path = state.getProperty("runtime");
        // 尚未绑定任何运行资源时仍留下旧日志快照，再安全建立新原生身份。
        if (path == null) {
            if (!"HEALTHY".equals(state.getProperty("phase", "HEALTHY")) || Long.parseLong(state.getProperty("version", "0")) != 0 || state.getProperty("queued") != null) throw new SecurityException("旧资源日志缺少运行目录");
            save(new File(root, "base-before-" + hash(old) + ".properties"), state);
            Properties reset = reset(target, null); save(journal, reset); checkpoint.reached("BASE_COMMITTED"); return true;
        }
        File runtime = new File(path).getCanonicalFile(), parent = runtime.getParentFile();
        boolean confined = false;
        for (File allowed : privateParents) if (allowed != null && runtime.getPath().startsWith(allowed.getCanonicalPath() + File.separator)) confined = true;
        if (!confined || !runtime.getPath().replace('\\', '/').endsWith("/apps/" + identity.get("runtimeAppId") + "/www")) throw new SecurityException("旧资源目录越界或 appid 改变，拒绝猜测 SDK 状态");
        File next = new File(parent, "rebu-base-next-" + hash(target));
        if (!"BASE_REPLACING".equals(state.getProperty("phase"))) {
            // 从当前已验证签名 APK 提取，不从旧 JS 或网络取得完整包基线。
            if (next.exists()) remove(next, parent);
            loader.extract(next);
            if (!new File(next, "manifest.json").isFile()) throw new SecurityException("完整包基线缺少 manifest");
            String newHash = ResourceStore.treeHash(next);
            save(new File(root, "base-before-" + hash(old) + ".properties"), state);
            state.setProperty("baseTarget", target); state.setProperty("baseTreeHash", newHash);
            state.setProperty("baseArchive", "rebu-base-old-" + hash(old));
            if (runtime.exists()) state.setProperty("baseOldHash", ResourceStore.treeHash(runtime));
            else if (!new File(parent, "rebu-resource-previous").isDirectory()) throw new SecurityException("旧基线及回退均缺失");
            state.setProperty("phase", "BASE_REPLACING"); save(journal, state); checkpoint.reached("BASE_JOURNAL_SYNCED");
        }
        if (!target.equals(state.getProperty("baseTarget")) || !state.getProperty("baseArchive", "").matches("rebu-base-old-[a-f0-9]{24}")) throw new SecurityException("未完成事务不属于本安装基座");
        File archive = new File(parent, state.getProperty("baseArchive"));
        String expected = state.getProperty("baseTreeHash"), oldHash = state.getProperty("baseOldHash");
        if (expected == null) throw new SecurityException("完整包基线摘要缺失");
        if (!runtime.exists() || !expected.equals(ResourceStore.treeHash(runtime))) {
            if (runtime.exists()) {
                if (oldHash == null || !oldHash.equals(ResourceStore.treeHash(runtime)) || archive.exists()) throw new SecurityException("旧运行资源改变或归档冲突");
                move(runtime, archive); checkpoint.reached("BASE_OLD_MOVED");
            } else if (oldHash != null && (!archive.isDirectory() || !oldHash.equals(ResourceStore.treeHash(archive)))) throw new SecurityException("完整包迁移缺少旧资源归档");
            if (!next.isDirectory() || !expected.equals(ResourceStore.treeHash(next))) {
                if (next.exists()) remove(next, parent);
                loader.extract(next);
                if (!expected.equals(ResourceStore.treeHash(next))) throw new SecurityException("当前 APK 基线摘要不一致");
            }
            move(next, runtime); checkpoint.reached("BASE_NEW_MOVED");
        }
        // 旧 WGT 回退目录单独归档，不能在新完整包内作为健康回退再次启用。
        File previous = new File(parent, "rebu-resource-previous"), archivedPrevious = new File(parent, state.getProperty("baseArchive") + "-previous");
        if (previous.exists()) {
            if (archivedPrevious.exists()) throw new SecurityException("旧回退资源归档冲突");
            move(previous, archivedPrevious); checkpoint.reached("BASE_PREVIOUS_MOVED");
        }
        if (!expected.equals(ResourceStore.treeHash(runtime))) throw new SecurityException("新基线最终校验失败");
        Properties reset = reset(target, runtime.getPath());
        reset.setProperty("completeBaseTreeHash", expected); reset.setProperty("completeBaseArchive", archive.getName());
        save(journal, reset); checkpoint.reached("BASE_COMMITTED"); return true;
    }
    private static Properties reset(String identity, String runtime) {
        Properties state = new Properties(); state.setProperty("nativeIdentity", identity); state.setProperty("phase", "HEALTHY");
        state.setProperty("version", "0"); state.setProperty("bootAttempts", "0");
        if (runtime != null) state.setProperty("runtime", runtime); return state;
    }
    private static Properties read(File file) throws Exception { Properties state = new Properties(); try (InputStream in = new FileInputStream(file)) { state.load(in); } return state; }
    private static void save(File file, Properties state) throws Exception {
        File tmp = new File(file.getParentFile(), file.getName() + ".tmp");
        try (FileOutputStream out = new FileOutputStream(tmp)) { state.store(out, null); out.getFD().sync(); }
        Files.move(tmp.toPath(), file.toPath(), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
    }
    private static void move(File from, File to) throws Exception { Files.move(from.toPath(), to.toPath(), StandardCopyOption.ATOMIC_MOVE); }
    private static String hash(String text) throws Exception { byte[] bytes = MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)); StringBuilder out = new StringBuilder(); for (int i = 0; i < 12; i++) out.append(String.format("%02x", bytes[i] & 255)); return out.toString(); }
    private static void remove(File file, File allowed) throws Exception {
        File actual = file.getCanonicalFile();
        if (!actual.getPath().startsWith(allowed.getCanonicalPath() + File.separator)) throw new SecurityException("暂存清理越界");
        if (file.isDirectory()) { File[] files = file.listFiles(); if (files == null) throw new IOException("暂存目录不可读"); for (File child : files) remove(child, allowed); }
        if (!file.delete()) throw new IOException("暂存清理失败");
    }
}
