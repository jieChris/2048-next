package cn.next2048.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.security.KeyStore;
import javax.crypto.SecretKey;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class SecureStorageInstrumentedTest {
    private Context context;
    private SecureStorage storage;

    @Before
    public void setUp() throws Exception {
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        clearStorage();
        storage = new SecureStorage(context);
    }

    @After
    public void tearDown() throws Exception {
        clearStorage();
    }

    @Test
    public void writesReadsOverwritesAndDeletesEncryptedValues() throws Exception {
        String key = "auth.access-token";
        String firstValue = "plain-secret-value";
        storage.set(key, firstValue);

        String persisted = context
            .getSharedPreferences(SecureStorage.PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getString(key, null);
        assertNotNull(persisted);
        assertFalse(persisted.equals(firstValue));
        assertFalse(persisted.contains(firstValue));
        assertEquals(firstValue, storage.get(key));

        storage.set(key, firstValue);
        String secondCiphertext = context
            .getSharedPreferences(SecureStorage.PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getString(key, null);
        assertNotEquals(persisted, secondCiphertext);
        assertEquals(firstValue, storage.get(key));

        storage.set(key, "replacement-value");
        assertEquals("replacement-value", storage.get(key));
        storage.delete(key);
        assertNull(storage.get(key));
    }

    @Test
    public void bindsCiphertextToItsLogicalKeyWithAad() throws Exception {
        String firstKey = "auth.access-token";
        String secondKey = "auth.refresh-token";
        storage.set(firstKey, "first-secret");
        storage.set(secondKey, "second-secret");

        android.content.SharedPreferences preferences = context.getSharedPreferences(
            SecureStorage.PREFERENCES_NAME,
            Context.MODE_PRIVATE
        );
        String firstEntry = preferences.getString(firstKey, null);
        String secondEntry = preferences.getString(secondKey, null);
        assertNotNull(firstEntry);
        assertNotNull(secondEntry);
        assertTrue(preferences.edit().putString(firstKey, secondEntry).putString(secondKey, firstEntry).commit());

        assertStorageError("decrypt_failed", () -> storage.get(firstKey));
        assertStorageError("decrypt_failed", () -> storage.get(secondKey));
    }

    @Test
    public void keepsTheAndroidKeystoreMasterKeyNonExportable() throws Exception {
        storage.set("auth.access-token", "secret");
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        KeyStore.Entry entry = keyStore.getEntry(SecureStorage.keyAlias(context), null);
        assertTrue(entry instanceof KeyStore.SecretKeyEntry);
        SecretKey key = ((KeyStore.SecretKeyEntry) entry).getSecretKey();
        assertEquals("AES", key.getAlgorithm());
        assertNull(key.getEncoded());
    }

    @Test
    public void reportsADeletedKeystoreKeyAsInvalidated() throws Exception {
        storage.set("ranked.challenge-reference", "challenge-1");
        deleteMasterKey();

        assertStorageError("key_invalidated", () -> storage.get("ranked.challenge-reference"));
        storage.delete("ranked.challenge-reference");
        assertNull(storage.get("ranked.challenge-reference"));
    }

    @Test
    public void refusesToReplaceAMissingMasterKeyWhileCiphertextSurvives() throws Exception {
        storage.set("auth.access-token", "access-1");
        storage.set("auth.refresh-token", "refresh-1");
        String persistedRefresh = context
            .getSharedPreferences(SecureStorage.PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getString("auth.refresh-token", null);
        deleteMasterKey();

        assertStorageError(
            "key_invalidated",
            () -> storage.set("auth.access-token", "replacement")
        );
        assertEquals(
            persistedRefresh,
            context
                .getSharedPreferences(SecureStorage.PREFERENCES_NAME, Context.MODE_PRIVATE)
                .getString("auth.refresh-token", null)
        );
    }

    @Test
    public void reportsAnUnexpectedPreferenceTypeAsCorruptAndStillAllowsDeletion() throws Exception {
        String key = "auth.access-token";
        assertTrue(
            context
                .getSharedPreferences(SecureStorage.PREFERENCES_NAME, Context.MODE_PRIVATE)
                .edit()
                .putInt(key, 7)
                .commit()
        );

        assertStorageError("corrupt_ciphertext", () -> storage.get(key));
        storage.delete(key);
        assertNull(storage.get(key));
    }

    private void clearStorage() throws Exception {
        if (context != null) {
            context
                .getSharedPreferences(SecureStorage.PREFERENCES_NAME, Context.MODE_PRIVATE)
                .edit()
                .clear()
                .commit();
            deleteMasterKey();
        }
    }

    private void deleteMasterKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        String alias = SecureStorage.keyAlias(context);
        if (keyStore.containsAlias(alias)) keyStore.deleteEntry(alias);
    }

    private void assertStorageError(String expectedCode, StorageOperation operation) throws Exception {
        try {
            operation.run();
            fail("Expected " + expectedCode);
        } catch (SecureStorage.SecureStorageException error) {
            assertEquals(expectedCode, error.getCode());
        }
    }

    @FunctionalInterface
    private interface StorageOperation {
        void run() throws Exception;
    }
}
