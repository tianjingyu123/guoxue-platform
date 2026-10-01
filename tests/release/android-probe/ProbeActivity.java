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
    private WebView healthView;
    protected void onPause() { if (healthView != null) healthView.evaluateJavascript("window.ProbeLifecycle&&ProbeLifecycle.hide()", null); super.onPause(); }
    protected void onResume() { super.onResume(); if (healthView != null) healthView.evaluateJavascript("window.ProbeLifecycle&&ProbeLifecycle.show()", null); }
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
            if (scenario.equals("transfer")) { TransferScenarios.run(); return; }
            if (scenario.equals("tls")) { TlsScenarios.run(application); return; }
            if (scenario.equals("health-status")) { ProbeApplication.event("HEALTH_STATUS", "phase=" + ProbeApplication.store.phase() + ",version=" + ProbeApplication.store.version()); return; }
            if (scenario.equals("health-early")) { ResourceRuntime.dispatch("healthy", new JSONObject().put("releaseId", ProbeApplication.store.releaseId()).toString(), result -> ProbeApplication.event("REAL_HEALTH_EARLY", result)); return; }
            if (scenario.equals("health-error")) { if (healthView != null) healthView.evaluateJavascript("ProbeLifecycle.fail()", null); return; }
            if (scenario.equals("health-cancel")) { java.lang.reflect.Field field = ResourceRuntime.class.getDeclaredField("store"); field.setAccessible(true); field.set(null, ProbeApplication.store); ResourceRuntime.dispatch("cancel", "{}", result -> ProbeApplication.event("REAL_CANCEL", result)); return; }
            if (scenario.startsWith("prepare-")) {
                String kind = scenario.substring(8); if (!Arrays.asList("bad", "good", "wrong-base", "cross-channel", "expired").contains(kind)) throw new SecurityException("未知测试包");
                JSONObject grant = new JSONObject(ProbeApplication.read(getAssets().open("grant.json")));
                ProbeApplication.store.replaceTrust(Collections.singletonList(values(grant.getJSONObject("payload"))), Collections.singletonList(grant.getString("signature")));
                JSONObject signed = new JSONObject(ProbeApplication.read(getAssets().open(kind + ".json")));
                ResourceStore.Release release = new ResourceStore.Release(values(signed.getJSONObject("manifest")), signed.getString("signature"));
                File archive = ProbeApplication.store.temporary("fixture-" + kind); application.copyAssets(kind + ".wgt", archive);
                ProbeApplication.store.stage(archive, release); ProbeApplication.store.requestActivation();
                getSharedPreferences("probe", 0).edit().putString("killAt", getIntent().getStringExtra("killAt") == null ? "" : getIntent().getStringExtra("killAt")).putBoolean("denyOffer", getIntent().getBooleanExtra("denyOffer", false)).putBoolean("healthWindow", getIntent().getBooleanExtra("healthWindow", false)).commit();
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
            else if (scenario.equals("new-suite")) { int suite = getSharedPreferences("probe", 0).getInt("suite", 0) + 1; getSharedPreferences("probe", 0).edit().putInt("suite", suite).putBoolean("denyOffer", false).putBoolean("healthWindow", false).putString("killAt", "").commit(); ProbeApplication.event("NEW_SUITE", Integer.toString(suite)); }
            else if (scenario.equals("portable")) { getSharedPreferences("probe", 0).edit().putBoolean("portable", true).commit(); ProbeApplication.event("PORTABLE_NEXT_BOOT", "bc"); }
            else if (scenario.equals("keystore")) {
                Class<?> bridgeClass = Class.forName("cn.rebu.resource.ResourceRuntime");
                Class<?> callbackClass = Class.forName("cn.rebu.resource.ResourceRuntime$Callback");
                bridgeClass.getMethod("dispatch", String.class, String.class, callbackClass);
                callbackClass.getMethod("onResult", String.class);
                ProbeApplication.event("NATIVE_REFLECTION", "entrypointsRetained=true");
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
            if (getSharedPreferences("probe", 0).getBoolean("healthWindow", false)) {
                // 只在独立宿主把生产健康入口绑定到合成准入的真实资源目录事务。
                java.lang.reflect.Field field = ResourceRuntime.class.getDeclaredField("store"); field.setAccessible(true); field.set(null, ProbeApplication.store);
                ResourceRuntime.dispatch("busy", "{\"activities\":{}}", result -> ProbeApplication.event("HEALTH_BIND", result));
            }
            WebView view = new WebView(this); healthView = getSharedPreferences("probe", 0).getBoolean("healthWindow", false) ? view : null; view.getSettings().setJavaScriptEnabled(true); view.getSettings().setAllowFileAccess(true); view.addJavascriptInterface(new Signals(), "Probe");
            view.setWebViewClient(new WebViewClient() { public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) { return true; } });
            view.setWebChromeClient(new WebChromeClient() { public boolean onConsoleMessage(ConsoleMessage message) { if (message.messageLevel() == ConsoleMessage.MessageLevel.ERROR) { ProbeApplication.event("JS_ERROR", "bad-js"); try { ProbeApplication.store.unhealthy(); } catch (Exception ignored) {} } return true; } });
            setContentView(view); view.loadUrl("file://" + new File(ProbeApplication.runtime, "index.html").getPath());
        } catch (Exception failure) { ProbeApplication.event("SCENARIO_REFUSED", scenario + " " + failure.getClass().getSimpleName()); android.widget.TextView label = new android.widget.TextView(this); label.setText("测试拒绝：" + scenario); setContentView(label); }
    }
    public final class Signals {
        @JavascriptInterface public boolean realHealth() { return getSharedPreferences("probe", 0).getBoolean("healthWindow", false); }
        @JavascriptInterface public String runtimePath() { return ProbeApplication.runtime.getPath(); }
        @JavascriptInterface public String grant() { try { return ProbeApplication.read(getAssets().open("grant.json")); } catch (Exception error) { throw new IllegalStateException("缺少合成授权"); } }
        @JavascriptInterface public void event(String type, double jsTime) { if (Arrays.asList("observe", "pause", "failed").contains(type)) ProbeApplication.event("REAL_HEALTH_JS", type + " jsMs=" + jsTime); }
        @JavascriptInterface public void call(int id, String action, String json) {
            if (!Arrays.asList("bindRuntime", "session", "busy", "replaceTrust", "identity", "healthy", "unhealthy", "cancel").contains(action) || healthView == null) throw new SecurityException("健康宿主操作越界");
            ResourceRuntime.dispatch(action, json, result -> {
                ProbeApplication.event("REAL_HEALTH_NATIVE", "action=" + action + ",ok=" + result.contains("\"ok\":true") + ",phase=" + ProbeApplication.store.phase() + ",version=" + ProbeApplication.store.version());
                if (healthView != null) healthView.evaluateJavascript("probeNativeReply(" + id + "," + JSONObject.quote(result) + ")", null);
            });
        }
        @JavascriptInterface public void signal(String value) { if (value.matches("[a-z-]{1,40}")) ProbeApplication.event("JS_READY", value); }
        @JavascriptInterface public void healthy() { try { ProbeApplication.store.healthy(ProbeApplication.store.releaseId()); ProbeApplication.event("FIXTURE_HEALTH", "core-acknowledged"); } catch (Exception failure) { ProbeApplication.event("HEALTH_REFUSED", failure.getClass().getSimpleName()); } }
    }
    private static Map<String, Object> values(JSONObject source) throws Exception { Map<String, Object> out = new TreeMap<>(); for (Iterator<String> it = source.keys(); it.hasNext();) { String key = it.next(); Object value = source.get(key); out.put(key, value instanceof Number ? ((Number)value).longValue() : value.toString()); } return out; }
}
