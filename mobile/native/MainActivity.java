package az.sosavto.app;

import android.net.Uri;
import android.os.Bundle;
import android.content.Intent;
import android.view.View;
import android.view.ViewGroup;
import android.widget.*;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** Presentation is bundled with the APK; requests and sessions keep the live origin. */
public class MainActivity extends BridgeActivity {
    private String appPresentation;
    private LinearLayout offline;
    private void hideOffline(){if(offline!=null)offline.setVisibility(View.GONE);}
    private void showOffline(){
        if(offline==null){
            offline=new LinearLayout(this);offline.setOrientation(LinearLayout.VERTICAL);offline.setGravity(android.view.Gravity.CENTER);offline.setPadding(40,40,40,40);offline.setBackgroundColor(android.graphics.Color.rgb(15,20,27));
            TextView title=new TextView(this);title.setText("SosAvto ilə bağlantı alınmadı");title.setTextColor(android.graphics.Color.WHITE);title.setTextSize(21);title.setGravity(android.view.Gravity.CENTER);
            TextView text=new TextView(this);text.setText("İnternet bağlantısını yoxlayın və yenidən cəhd edin.");text.setTextColor(android.graphics.Color.LTGRAY);text.setGravity(android.view.Gravity.CENTER);text.setPadding(0,20,0,20);
            Button retry=new Button(this);retry.setText("Yenidən yoxla");retry.setOnClickListener(v->{hideOffline();bridge.getWebView().reload();});offline.addView(title);offline.addView(text);offline.addView(retry);
            addContentView(offline,new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT));
        }
        offline.setVisibility(View.VISIBLE);offline.bringToFront();
    }
    private void openRequestedScreen(Intent intent){if(intent!=null&&intent.getBooleanExtra("openNotifications",false)){intent.removeExtra("openNotifications");bridge.getWebView().loadUrl("https://sosavto.az/bildirisler.html");}}
    @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);openRequestedScreen(intent);}

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SosAvtoDevicePlugin.class);
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
            private boolean navigationFailed=false;
            @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap favicon){navigationFailed=false;super.onPageStarted(view,url,favicon);}
            private void present(WebView view, String url) {
                Uri uri = Uri.parse(url);
                if ("https".equals(uri.getScheme()) && "sosavto.az".equals(uri.getHost())) {
                    view.evaluateJavascript(appPresentation, null);
                }
            }
            @Override
            public void onPageCommitVisible(WebView view, String url) {
                super.onPageCommitVisible(view, url);
                if(!navigationFailed)hideOffline();
                present(view, url);
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error){super.onReceivedError(view,request,error);if(request.isForMainFrame()){navigationFailed=true;showOffline();}}
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response){super.onReceivedHttpError(view,request,response);if(request.isForMainFrame()&&response.getStatusCode()>=500){navigationFailed=true;showOffline();}}
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                present(view, url);
            }
        });
        openRequestedScreen(getIntent());
    }
}
