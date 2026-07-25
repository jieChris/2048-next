package cn.next2048.app;

import android.app.Activity;
import android.os.Build;
import android.view.HapticFeedbackConstants;
import android.view.View;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Next2048SystemHaptics")
public class Next2048SystemHapticsPlugin extends Plugin {
    @PluginMethod
    public void impact(PluginCall call) {
        String kind = call.getString("kind", "merge");
        Integer feedback = feedbackConstant(kind);
        if (feedback == null) {
            call.reject("Unsupported haptic kind", "invalid_kind");
            return;
        }
        Activity activity = getActivity();
        if (activity == null || activity.getWindow() == null) {
            call.reject("Haptic view unavailable", "view_unavailable");
            return;
        }
        activity.runOnUiThread(() -> {
            View view = activity.getWindow().getDecorView();
            JSObject result = new JSObject();
            result.put("performed", view.performHapticFeedback(feedback));
            call.resolve(result);
        });
    }

    private static Integer feedbackConstant(String kind) {
        if ("merge".equals(kind)) return HapticFeedbackConstants.KEYBOARD_TAP;
        if ("milestone".equals(kind)) {
            return Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                ? HapticFeedbackConstants.CONFIRM
                : HapticFeedbackConstants.VIRTUAL_KEY;
        }
        if ("finish".equals(kind)) return HapticFeedbackConstants.LONG_PRESS;
        return null;
    }
}
