# Native.js 使用固定类名和回调接口，必须保留公共桥接入口。
-keep class cn.rebu.resource.ResourceRuntime {
    public static void boot(android.app.Application);
    public static void dispatch(java.lang.String, java.lang.String, cn.rebu.resource.ResourceRuntime$Callback);
}
-keep interface cn.rebu.resource.ResourceRuntime$Callback {
    public void onResult(java.lang.String);
}
# Ed25519 兼容分支通过反射加载，不允许改名或移除。
-keep class org.bouncycastle.crypto.** { *; }
-keep class org.bouncycastle.math.** { *; }
-keep class org.bouncycastle.util.** { *; }
