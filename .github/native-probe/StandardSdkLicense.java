import com.android.repository.api.License;
import com.android.repository.api.RepoManager;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Element;

/** 只读核对官方 AOSP 镜像引用的现有许可，不接受或写入许可。 */
public final class StandardSdkLicense {
  public static void main(String[] args) throws Exception {
    if(args.length != 2) throw new IllegalArgumentException("仅接收 SDK 和官方目录路径");
    Path sdk = Path.of(args[0]).toRealPath();
    var factory = DocumentBuilderFactory.newInstance();
    factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
    factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
    factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
    var document = factory.newDocumentBuilder().parse(Path.of(args[1]).toFile());
    String id = "android-sdk-license";
    String text = null;
    var licenses = document.getElementsByTagName("license");
    for(int i=0;i<licenses.getLength();i++) {
      Element item = (Element)licenses.item(i);
      if(item.getAttribute("id").equals(id)) {
        if(text != null) throw new IllegalStateException("许可不唯一");
        text = item.getTextContent();
      }
    }
    if(text == null) throw new IllegalStateException("官方目录缺少目标许可");
    String digest = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
    if(!digest.equals("1f8729233617b193fd619213792ae16a41b95d2bbbf525dfe66998252ba68b16")) throw new IllegalStateException("官方许可文本变化");
    for(int api : new int[]{31,32}) {
      boolean found = false;
      var packages = document.getElementsByTagName("remotePackage");
      for(int i=0;i<packages.getLength();i++) {
        Element item = (Element)packages.item(i);
        if(!item.getAttribute("path").equals("system-images;android-"+api+";default;x86_64")) continue;
        if(found) throw new IllegalStateException("官方包不唯一");
        found = true;
        var uses = item.getElementsByTagName("uses-license");
        if(uses.getLength()!=1 || !((Element)uses.item(0)).getAttribute("ref").equals(id)) throw new IllegalStateException("镜像许可不适用");
      }
      if(!found) throw new IllegalStateException("官方目录没有所需 AOSP 包");
    }
    License license = RepoManager.getCommonModule().createLatestFactory().createLicenseType();
    license.setId(id);
    license.setValue(text);
    boolean accepted = license.checkAccepted(sdk);
    System.out.println("{\"licenseId\":\""+id+"\",\"textSha256\":\""+digest+"\",\"officialAcceptanceHash\":\""+license.getLicenseHash()+"\",\"accepted\":"+accepted+",\"mutated\":false,\"packageFlavor\":\"default/x86_64\",\"method\":\"official SDK License.checkAccepted\"}");
    if(!accepted) throw new IllegalStateException("现有许可未接受，停止安装");
  }
}
