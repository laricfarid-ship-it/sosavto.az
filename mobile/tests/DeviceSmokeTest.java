package az.sosavto.app;
import android.graphics.Bitmap;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.core.app.ActivityScenario;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import java.util.concurrent.*;
import java.io.*;
@RunWith(AndroidJUnit4.class)
public class DeviceSmokeTest {
    private String evaluate(ActivityScenario<MainActivity> scenario,String script)throws Exception{
        CompletableFuture<String> result=new CompletableFuture<>();scenario.onActivity(a->a.getBridge().getWebView().evaluateJavascript(script,result::complete));return result.get(5,TimeUnit.SECONDS);
    }
    private void screenshot(String name)throws Exception{
        android.os.ParcelFileDescriptor command=InstrumentationRegistry.getInstrumentation().getUiAutomation().executeShellCommand("screencap -p /data/local/tmp/sosavto-"+name+".png");
        try(InputStream input=new android.os.ParcelFileDescriptor.AutoCloseInputStream(command)){while(input.read()!=-1){}}
    }
    @Test public void homepageAndNativeSettings()throws Exception{
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            boolean ready=false;for(int i=0;i<90;i++){if("true".equals(evaluate(scenario,"!!(document.querySelector('#sa-device-settings') && document.querySelector('#sa-bottom') && document.querySelector('.categories'))"))){ready=true;break;}Thread.sleep(500);}
            screenshot("01-launch");assertTrue("Live home and packaged Android UI did not load",ready);assertEquals("false",evaluate(scenario,"document.documentElement.scrollWidth>innerWidth+1"));
            evaluate(scenario,"document.querySelector('[data-theme-toggle]')?.click();true");Thread.sleep(500);screenshot("02-theme");
            evaluate(scenario,"document.querySelector('#sa-device-settings').click();true");Thread.sleep(500);assertEquals("true",evaluate(scenario,"document.querySelector('#sa-device-dialog').open"));for(int i=0;i<20;i++){if("true".equals(evaluate(scenario,"document.querySelector('[data-state]').textContent.includes('bağlıdır')")))break;Thread.sleep(250);}
            assertEquals("true",evaluate(scenario,"document.querySelector('[data-state]').textContent.includes('bağlıdır')"));screenshot("03-settings");
            evaluate(scenario,"document.querySelector('[data-delete]').click();true");assertEquals("false",evaluate(scenario,"document.querySelector('[data-deletion]').hidden"));screenshot("04-deletion-request");
            evaluate(scenario,"document.querySelector('#sa-device-dialog').close();document.querySelector('#results')?.scrollIntoView();true");Thread.sleep(500);screenshot("05-listings");
        }
    }
}
