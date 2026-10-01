package cn.rebu.resourceprobe;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.*;
import cn.rebu.resource.*;
import org.json.*;
import java.io.*;
import java.util.*;
/** 只操作 cn.rebu.resourceprobe 私有目录，不包含支付、账号或真实业务请求。 */
public final class ProbeActivity extends Activity {
    public void onCreate(Bundle state) {
        super.onCreate(state);
        runScenario();
    }
    public void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent); setIntent(intent); runScenario();
    }
    private void runScenario() {
        String scenario = getIntent().getStringExtra("scenario"); if (scenario == null) scenario = "show";
        try {
            if (ProbeApplication.error != null) throw new IllegalStateException(ProbeApplication.error);
            ProbeApplication application = (ProbeApplication)getApplication();
            if (scenario.startsWith("prepare-")) {
                String kind = scenario.substring(8); if (!Arrays.asList("bad", "good", "wrong-base", "cross-channel", "expired").contains(kind)) throw new SecurityException("未知测试包");
                JSONObject grant = new JSONObject(ProbeApplication.read(getAssets().open("grant.json")));
                ProbeApplication.store.replaceTrust(Collections.singletonList(values(grant.getJSONObject("payload"))), Collections.singletonList(grant.getString("signature")));
                JSONObject signed = new JSONObject(ProbeApplication.read(getAssets().open(kind + ".json")));
                ResourceStore.Release release = new ResourceStore.Release(values(signed.getJSONObject("manifest")), signed.getString("signature"));
                File archive = ProbeApplication.store.temporary("fixture-" + kind); application.copyAssets(kind + ".wgt", archive);
                ProbeApplication.store.stage(archive, release); ProbeApplication.store.requestActivation();
                getSharedPreferences("probe", 0).edit().putString("killAt", getIntent().getStringExtra("killAt") == null ? "" : getIntent().getStringExtra("killAt")).putBoolean("denyOffer", getIntent().getBooleanExtra("denyOffer", false)).commit();
                ProbeApplication.event("PREPARED", kind);
            } else if (scenario.equals("tamper-archive")) {
                ResourceStore.Release release = ProbeApplication.store.staged();
                int suite = getSharedPreferences("probe", 0).getInt("suite", 0);
                try (FileOutputStream out = new FileOutputStream(new File(getFilesDir(), "suite-" + suite + "/core-fixture/release-" + release.text("sha256") + ".wgt"))) { out.write(new byte[] {1,2,3}); out.getFD().sync(); }
                ProbeApplication.event("TAMPERED", "staged-archive");
            } else if (scenario.equals("base-upgrade")) {
                try (FileOutputStream out = new FileOutputStream(new File(getFilesDir(), "synthetic-user-data.txt"))) { out.write("preserved-probe-data".getBytes("UTF-8")); out.getFD().sync(); }
                getSharedPreferences("probe", 0).edit().putString("baseKillAt", getIntent().getStringExtra("killAt") == null ? "" : getIntent().getStringExtra("killAt")).commit(); ProbeApplication.event("BASE_UPGRADE_PREPARED", "test-apk");
            } else if (scenario.equals("keystore-read")) {
                java.lang.reflect.Method reader = ResourceRuntime.class.getDeclaredMethod("session"); reader.setAccessible(true);
                boolean decrypted = "synthetic-probe-token".equals(reader.invoke(null));
                boolean data = "preserved-probe-data".equals(ProbeApplication.read(new FileInputStream(new File(getFilesDir(), "synthetic-user-data.txt"))));
                ProbeApplication.event("UPGRADE_USER_DATA", "sessionDecrypted=" + decrypted + ",dataPreserved=" + data);
            }
            else if (scenario.equals("new-suite")) { int suite = getSharedPreferences("probe", 0).getInt("suite", 0) + 1; getSharedPreferences("probe", 0).edit().putInt("suite", suite).putBoolean("denyOffer", false).putString("killAt", "").commit(); ProbeApplication.event("NEW_SUITE", Integer.toString(suite)); }
            else if (scenario.equals("portable")) { getSharedPreferences("probe", 0).edit().putBoolean("portable", true).commit(); ProbeApplication.event("PORTABLE_NEXT_BOOT", "bc"); }
            else if (scenario.equals("keystore")) {
                // 完整包升级保持既有绑定，独立核心夹具换套件不应改变原生绑定路径。
                Properties nativeJournal = new Properties();
                File journalFile = new File(getFilesDir(), "rebu-resource-update/journal.properties");
                if (journalFile.isFile()) try (FileInputStream input = new FileInputStream(journalFile)) { nativeJournal.load(input); }
                String boundPath = nativeJournal.getProperty("runtime", ProbeApplication.runtime.getPath());
                ResourceRuntime.dispatch("bindRuntime", new JSONObject().put("path", boundPath).toString(), result -> {
                    ProbeApplication.event("NATIVE_BIND", result);
                    ResourceRuntime.dispatch("session", "{\"token\":\"synthetic-probe-token\"}", saved -> {
                        boolean encrypted = new File(getFilesDir(), "rebu-resource-update/session.enc").isFile();
                        boolean decrypted = false;
                        try { java.lang.reflect.Method reader = ResourceRuntime.class.getDeclaredMethod("session"); reader.setAccessible(true); decrypted = "synthetic-probe-token".equals(reader.invoke(null)); } catch (Exception ignored) { }
                        ProbeApplication.event("ANDROID_KEYSTORE", "saved=" + saved.contains("\"ok\":true") + ",encrypted=" + encrypted + ",decrypted=" + decrypted);
                        ResourceRuntime.dispatch("healthy", "{\"releaseId\":\"probe\"}", early -> ProbeApplication.event("HEALTH_WINDOW", "earlyRejected=" + early.contains("\"ok\":false")));
                        ResourceRuntime.dispatch("busy", "{\"activities\":{\"payment\":true,\"live\":true,\"recording\":true,\"upload\":true}}", busy -> ResourceRuntime.dispatch("activate", "{}", blocked -> ProbeApplication.event("BUSY_GUARD", "rejected=" + blocked.contains("\"value\":false"))));
                    });
                });
            }
            WebView view = new WebView(this); view.getSettings().setJavaScriptEnabled(true); view.getSettings().setAllowFileAccess(true); view.addJavascriptInterface(new Signals(), "Probe");
            view.setWebViewClient(new WebViewClient() { public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) { return true; } });
            view.setWebChromeClient(new WebChromeClient() { public boolean onConsoleMessage(ConsoleMessage message) { if (message.messageLevel() == ConsoleMessage.MessageLevel.ERROR) { ProbeApplication.event("JS_ERROR", "bad-js"); try { ProbeApplication.store.unhealthy(); } catch (Exception ignored) {} } return true; } });
            setContentView(view); view.loadUrl("file://" + new File(ProbeApplication.runtime, "index.html").getPath());
        } catch (Exception failure) { ProbeApplication.event("SCENARIO_REFUSED", scenario + " " + failure.getClass().getSimpleName()); android.widget.TextView label = new android.widget.TextView(this); label.setText("测试拒绝：" + scenario); setContentView(label); }
    }
    public final class Signals {
        @JavascriptInterface public void signal(String value) { if (value.matches("[a-z-]{1,40}")) ProbeApplication.event("JS_READY", value); }
        @JavascriptInterface public void healthy() { try { ProbeApplication.store.healthy(ProbeApplication.store.releaseId()); ProbeApplication.event("FIXTURE_HEALTH", "core-acknowledged"); } catch (Exception failure) { ProbeApplication.event("HEALTH_REFUSED", failure.getClass().getSimpleName()); } }
    }
    private static Map<String, Object> values(JSONObject source) throws Exception { Map<String, Object> out = new TreeMap<>(); for (Iterator<String> it = source.keys(); it.hasNext();) { String key = it.next(); Object value = source.get(key); out.put(key, value instanceof Number ? ((Number)value).longValue() : value.toString()); } return out; }
}
