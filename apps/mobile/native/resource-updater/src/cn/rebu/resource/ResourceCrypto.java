package cn.rebu.resource;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.X509EncodedKeySpec;
import java.util.*;
/** Ed25519 仍使用同一算法；旧 Android 采用固定摘要的 BC 轻量验签，不注册全局 provider。 */
public final class ResourceCrypto {
    private static final byte[] SPKI = new byte[] {48,42,48,5,6,3,43,101,112,3,33,0};
    private static boolean forcePortable() { return "bc".equals(System.getProperty("rebu.resource.crypto")); }
    public static PublicKey publicKey(String pem) throws Exception {
        if (pem == null || !pem.matches("-----BEGIN PUBLIC KEY-----\\r?\\n[A-Za-z0-9+/=\\r\\n]+-----END PUBLIC KEY-----\\r?\\n?")) throw new GeneralSecurityException("仅接受 SPKI 公钥");
        byte[] encoded = Base64.getDecoder().decode(pem.replaceAll("-----[A-Z ]+-----|\\s", ""));
        if (encoded.length != 44 || !Arrays.equals(SPKI, Arrays.copyOf(encoded, 12))) throw new GeneralSecurityException("公钥不是标准 Ed25519 SPKI");
        if (!forcePortable()) try { return KeyFactory.getInstance("Ed25519").generatePublic(new X509EncodedKeySpec(encoded)); } catch (NoSuchAlgorithmException unavailable) { /* API 26-32 使用轻量实现 */ }
        return new PublicKey() {
            public String getAlgorithm() { return "Ed25519"; }
            public String getFormat() { return "X.509"; }
            public byte[] getEncoded() { return encoded.clone(); }
        };
    }
    public static boolean verify(String message, String signature, PublicKey key) throws Exception {
        if (key == null) return false;
        byte[] data = message.getBytes(StandardCharsets.UTF_8), sig = Base64.getDecoder().decode(signature);
        if (sig.length != 64) return false;
        if (!forcePortable()) try {
            Signature verifier = Signature.getInstance("Ed25519"); verifier.initVerify(key); verifier.update(data); return verifier.verify(sig);
        } catch (NoSuchAlgorithmException | InvalidKeyException unavailable) { /* 无平台算法时转固定依赖；不把验签失败改成成功 */ }
        byte[] encoded = key.getEncoded();
        if (encoded.length != 44 || !Arrays.equals(SPKI, Arrays.copyOf(encoded, 12))) return false;
        Class<?> parameters = Class.forName("org.bouncycastle.crypto.params.Ed25519PublicKeyParameters");
        Object publicKey = parameters.getConstructor(byte[].class, int.class).newInstance(Arrays.copyOfRange(encoded, 12, 44), 0);
        Class<?> signerType = Class.forName("org.bouncycastle.crypto.signers.Ed25519Signer");
        Object signer = signerType.getConstructor().newInstance();
        signerType.getMethod("init", boolean.class, Class.forName("org.bouncycastle.crypto.CipherParameters")).invoke(signer, false, publicKey);
        signerType.getMethod("update", byte[].class, int.class, int.class).invoke(signer, data, 0, data.length);
        return (Boolean)signerType.getMethod("verifySignature", byte[].class).invoke(signer, sig);
    }
}
