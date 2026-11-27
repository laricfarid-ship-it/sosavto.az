package az.sosavto.app;

import android.Manifest;
import android.os.Build;
import android.graphics.Color;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.*;
import java.util.concurrent.TimeUnit;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(name="SosAvtoDevice", permissions={@Permission(alias="notifications", strings={Manifest.permission.POST_NOTIFICATIONS})})
public class SosAvtoDevicePlugin extends Plugin {
    static final String PREFS="sosavto_device", WORK="sosavto_notifications";
    private boolean trusted(PluginCall call) {
        java.util.concurrent.CompletableFuture<String> urlResult=new java.util.concurrent.CompletableFuture<>();
        getActivity().runOnUiThread(()->urlResult.complete(getBridge().getWebView().getUrl()));
        String url=null;try{url=urlResult.get(2,TimeUnit.SECONDS);}catch(Exception ignored){}
        if(url!=null&&url.startsWith("https://sosavto.az/"))return true;
        call.reject("İcazə verilməyən səhifə.");return false;
    }
    @PluginMethod public void setTheme(PluginCall call) {
        if(!trusted(call))return;
        boolean dark=call.getBoolean("dark",false);
        getActivity().runOnUiThread(()->{
            android.view.Window w=getActivity().getWindow();
            WindowInsetsControllerCompat controller=new WindowInsetsControllerCompat(w,w.getDecorView());
            controller.setAppearanceLightStatusBars(!dark);controller.setAppearanceLightNavigationBars(!dark);
            w.setStatusBarColor(Color.parseColor(dark?"#0f141b":"#f5f7fa"));
            w.setNavigationBarColor(Color.parseColor(dark?"#0f141b":"#f5f7fa"));call.resolve();
        });
    }
    @PluginMethod public void notificationStatus(PluginCall call) {
        if(!trusted(call))return;
        JSObject result=new JSObject();result.put("enabled",getContext().getSharedPreferences(PREFS,0).getBoolean("enabled",false)&&NotificationManagerCompat.from(getContext()).areNotificationsEnabled());call.resolve(result);
    }
    @PluginMethod public void enableNotifications(PluginCall call) {
        if(!trusted(call))return;
        if(Build.VERSION.SDK_INT>=33&&getPermissionState("notifications")!=PermissionState.GRANTED){requestPermissionForAlias("notifications",call,"permissionResult");return;}
        enable(call);
    }
    @PermissionCallback private void permissionResult(PluginCall call) {
        if(getPermissionState("notifications")==PermissionState.GRANTED)enable(call);
        else call.reject("Bildiriş icazəsi verilmədi. Android ayarlarından aktivləşdirə bilərsiniz.");
    }
    private void enable(PluginCall call) {
        if(!NotificationManagerCompat.from(getContext()).areNotificationsEnabled()){call.reject("Android ayarlarında SosAvto bildirişlərinə icazə verin.");return;}
        getContext().getSharedPreferences(PREFS,0).edit().putBoolean("enabled",true).apply();
        Constraints constraints=new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        PeriodicWorkRequest work=new PeriodicWorkRequest.Builder(SosAvtoNotificationsWorker.class,15,TimeUnit.MINUTES).setConstraints(constraints).build();
        WorkManager manager=WorkManager.getInstance(getContext());manager.enqueueUniquePeriodicWork(WORK,ExistingPeriodicWorkPolicy.KEEP,work);
        manager.enqueueUniqueWork(WORK+"_initial",ExistingWorkPolicy.KEEP,new OneTimeWorkRequest.Builder(SosAvtoNotificationsWorker.class).setConstraints(constraints).build());call.resolve();
    }
    @PluginMethod public void disableNotifications(PluginCall call) {
        if(!trusted(call))return;
        getContext().getSharedPreferences(PREFS,0).edit().putBoolean("enabled",false).apply();
        WorkManager.getInstance(getContext()).cancelUniqueWork(WORK);WorkManager.getInstance(getContext()).cancelUniqueWork(WORK+"_initial");NotificationManagerCompat.from(getContext()).cancel(1001);call.resolve();
    }
}
