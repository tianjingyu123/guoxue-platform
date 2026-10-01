import com.android.repository.api.License;
import com.android.repository.api.Repository;
import com.android.repository.api.ProgressIndicatorAdapter;
import com.android.repository.impl.meta.SchemaModuleUtil;
import com.android.sdklib.repository.AndroidSdkHandler;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import javax.xml.bind.JAXBElement;

/** 使用 SDK 实际目录加载器核验许可，避免手工文本对象偏离官方归一化。 */
public final class OfficialLoadedSdkLicenses {
  public static void main(String[] args) throws Exception {
    var progress = new ProgressIndicatorAdapter() {};
    Object loaded;
    try(var stream = Files.newInputStream(Path.of(args[1]))) {
      loaded = SchemaModuleUtil.unmarshal(stream, AndroidSdkHandler.getAllModules(), false, progress, null);
    }
    if(loaded instanceof JAXBElement) loaded = ((JAXBElement<?>)loaded).getValue();
    Repository repository = (Repository)loaded;
    for(License license : repository.getLicense()) {
      if(!license.getId().equals("android-sdk-license") && !license.getId().equals("android-sdk-preview-license")) continue;
      String digest = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(license.getValue().getBytes(StandardCharsets.UTF_8)));
      System.out.println("{\"licenseId\":\""+license.getId()+"\",\"normalizedTextSha256\":\""+digest+"\",\"officialAcceptanceHash\":\""+license.getLicenseHash()+"\",\"accepted\":"+license.checkAccepted(Path.of(args[0]))+",\"mutated\":false,\"method\":\"official SchemaModuleUtil.unmarshal and License.checkAccepted\"}");
    }
  }
}
