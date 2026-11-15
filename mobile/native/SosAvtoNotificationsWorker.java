package az.sosavto.app;

import android.app.*;
import android.content.*;
import android.os.Build;
import android.webkit.CookieManager;
import androidx.annotation.NonNull;
import androidx.core.app.*;
import androidx.work.*;
import org.json.*;
import java.net.*;
import java.io.*;
import java.util.*;

/** Reads existing account notifications. No new backend, paid API, or session copy. */
public class SosAvtoNotificationsWorker extends Worker {
    public SosAvtoNotificationsWorker(@NonNull Context context,@NonNull WorkerParameters params){super(context,params);}
    private JSONObject read(String path,String cookie)throws Exception{
        HttpURLConnection connection=(HttpURLConnection)new URL("https://sosavto.az/api/"+path).openConnection();
        connection.setConnectTimeout(10000);connection.setReadTimeout(10000);connection.setInstanceFollowRedirects(false);connection.setRequestProperty("Cookie",cookie);
        try{if(connection.getResponseCode()!=200)return null;
            try(InputStream input=connection.getInputStream();ByteArrayOutputStream bytes=new ByteArrayOutputStream()){
                byte[] buffer=new byte[4096];int n;while((n=input.read(buffer))!=-1){bytes.write(buffer,0,n);if(bytes.size()>262144)throw new IOException("Response too large");}
                return new JSONObject(bytes.toString("UTF-8"));
            }
        }finally{connection.disconnect();}
    }
    @NonNull @Override public Result doWork(){
        Context context=getApplicationContext();SharedPreferences prefs=context.getSharedPreferences(SosAvtoDevicePlugin.PREFS,0);
        if(!prefs.getBoolean("enabled",false)||!NotificationManagerCompat.from(context).areNotificationsEnabled())return Result.success();
        String cookie=CookieManager.getInstance().getCookie("https://sosavto.az");if(cookie==null||!cookie.contains("sosavto_session="))return Result.success();
        try{
            JSONObject me=read("me",cookie);if(me==null||me.isNull("user"))return Result.success();
            String user=me.getJSONObject("user").getString("id");JSONObject response=read("notifications",cookie);if(response==null)return Result.success();
            JSONArray notifications=response.getJSONArray("notifications");String key="seen_"+user;boolean initialized=prefs.contains(key);
            Set<String> seen=new HashSet<>(prefs.getStringSet(key,Collections.emptySet())),current=new HashSet<>();boolean fresh=false;
            for(int i=0;i<notifications.length();i++){JSONObject item=notifications.getJSONObject(i);String id=item.getString("id");current.add(id);if(initialized&&!seen.contains(id)&&item.isNull("read_at"))fresh=true;}
            // Check the live cookie again, so signing out during this request cannot display an old account's notification.
            if(!Objects.equals(cookie,CookieManager.getInstance().getCookie("https://sosavto.az"))||!prefs.getBoolean("enabled",false))return Result.success();
            if(fresh){
                NotificationManager manager=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
                if(Build.VERSION.SDK_INT>=26)manager.createNotificationChannel(new NotificationChannel("account","Elan və qiymət bildirişləri",NotificationManager.IMPORTANCE_DEFAULT));
                Intent intent=new Intent(context,MainActivity.class).putExtra("openNotifications",true).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
                PendingIntent pending=PendingIntent.getActivity(context,1001,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
                Notification notification=new NotificationCompat.Builder(context,"account").setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle("SosAvto").setContentText("Yeni bildirişiniz var. Tətbiqdən baxın.").setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setContentIntent(pending).setAutoCancel(true).build();
                NotificationManagerCompat.from(context).notify(1001,notification);
            }
            prefs.edit().putStringSet(key,current).apply();return Result.success();
        }catch(Exception error){return Result.retry();}
    }
}
