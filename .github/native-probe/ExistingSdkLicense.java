import com.android.repository.api.License;
import com.android.repository.api.RepoManager;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Element;

/** 仅用官方SDK API检查宿主已有许可；没有接受或写入操作。 */
public final class ExistingSdkLicense {
    public static void main(String[] args) throws Exception {
        if(args.length!=2) throw new IllegalArgumentException("只接收SDK根目录和官方元数据路径");
        Path sdk=Path.of(args[0]).toRealPath();
        String id="android-sdk-preview-license";
        var factory=DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities",false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities",false);
        var nodes=factory.newDocumentBuilder().parse(Path.of(args[1]).toFile()).getElementsByTagName("license");
        String text=null;
        for(int i=0;i<nodes.getLength();i++){
            Element node=(Element)nodes.item(i);
            if(node.getAttribute("id").equals(id)){if(text!=null)throw new IllegalStateException("目标许可不唯一");text=node.getTextContent();}
        }
        if(text==null)throw new IllegalStateException("未取得官方许可");
        String sha=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
        if(!sha.equals("4812a1e9b8aedc1abc00cfbd39a2b7f40a4e60080dd5de8f717eee2fdc3d686b"))throw new IllegalStateException("待确认许可文本变化");
        License license=RepoManager.getCommonModule().createLatestFactory().createLicenseType();
        license.setId(id);license.setValue(text);
        System.out.println("{\"licenseId\":\""+id+"\",\"textSha256\":\""+sha+"\",\"officialAcceptanceHash\":\""+license.getLicenseHash()+"\",\"accepted\":"+license.checkAccepted(sdk)+",\"mutated\":false,\"method\":\"official SDK License.checkAccepted\"}");
    }
}
