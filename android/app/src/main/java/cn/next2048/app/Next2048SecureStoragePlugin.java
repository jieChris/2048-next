package cn.next2048.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;

@CapacitorPlugin(name = "Next2048SecureStorage")
public class Next2048SecureStoragePlugin extends Plugin {
    private SecureStorage storage;

    @Override
    public void load() {
        storage = new SecureStorage(getContext());
    }

    @PluginMethod
    public void get(PluginCall call) {
        try {
            String value = storage.get(call.getString("key"));
            JSObject result = new JSObject();
            result.put("value", value == null ? JSONObject.NULL : value);
            call.resolve(result);
        } catch (SecureStorage.SecureStorageException error) {
            reject(call, error);
        }
    }

    @PluginMethod
    public void set(PluginCall call) {
        try {
            storage.set(call.getString("key"), call.getString("value"));
            call.resolve();
        } catch (SecureStorage.SecureStorageException error) {
            reject(call, error);
        }
    }

    @PluginMethod
    public void delete(PluginCall call) {
        try {
            storage.delete(call.getString("key"));
            call.resolve();
        } catch (SecureStorage.SecureStorageException error) {
            reject(call, error);
        }
    }

    private static void reject(PluginCall call, SecureStorage.SecureStorageException error) {
        call.reject("Secure storage operation failed", error.getCode(), error);
    }
}
