package az.sosavto.app;

import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** Presentation is bundled with the APK; requests and sessions keep the live origin. */
public class MainActivity extends BridgeActivity {
    private String appPresentation;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try (java.io.InputStream input = getAssets().open("app-presentation.js")) {
            java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) bytes.write(buffer, 0, count);
            appPresentation = bytes.toString(StandardCharsets.UTF_8.name());
        } catch (IOException error) {
            throw new IllegalStateException("Missing APK presentation asset", error);
        }
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            private void present(WebView view, String url) {
                Uri uri = Uri.parse(url);
                if ("https".equals(uri.getScheme()) && "sosavto.az".equals(uri.getHost())) {
                    view.evaluateJavascript(appPresentation, null);
                }
            }
            @Override
            public void onPageCommitVisible(WebView view, String url) {
                super.onPageCommitVisible(view, url);
                present(view, url);
            }
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                present(view, url);
            }
        });
    }
}
