package cn.next2048.app;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Next2048SystemBars")
public class Next2048SystemBarsPlugin extends Plugin {
    @PluginMethod
    public void setAppearance(PluginCall call) {
        String theme = call.getString("theme");
        if (!"light".equals(theme) && !"dark".equals(theme)) {
            call.reject("Unsupported system bars theme", "invalid_theme");
            return;
        }
        Activity activity = getActivity();
        if (activity == null || activity.getWindow() == null) {
            call.reject("System bars unavailable", "window_unavailable");
            return;
        }
        activity.runOnUiThread(() -> {
            boolean dark = "dark".equals(theme);
            Window window = activity.getWindow();
            window.setNavigationBarColor(Color.parseColor(dark ? "#0e2025" : "#f3ede1"));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowInsetsController controller = window.getInsetsController();
                if (controller != null) {
                    controller.setSystemBarsAppearance(
                        dark ? 0 : WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                        WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                    );
                }
            } else {
                View decor = window.getDecorView();
                int visibility = decor.getSystemUiVisibility();
                visibility = dark
                    ? visibility & ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
                    : visibility | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                decor.setSystemUiVisibility(visibility);
            }
            call.resolve();
        });
    }
}
