package cn.next2048.app;

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.CapConfig;
import com.getcapacitor.Logger;
import org.json.JSONException;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        configureInsetsPolicy();
        registerPlugin(Next2048SecureStoragePlugin.class);
        registerPlugin(Next2048SystemHapticsPlugin.class);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        super.onCreate(savedInstanceState);
    }

    private void configureInsetsPolicy() {
        config = CapConfig.loadDefault(this);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            return;
        }

        try {
            config
                .getPluginConfiguration("SystemBars")
                .getConfigJSON()
                .put("insetsHandling", "disable");
        } catch (JSONException error) {
            Logger.error("Unable to apply the legacy Android insets policy", error);
        }
    }
}
