package cn.next2048.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.security.ProviderException;
import javax.crypto.AEADBadTagException;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class SecureStorage {
    static final String PREFERENCES_NAME = "next2048_secure_storage_v1";
    static final String KEY_ALIAS_SUFFIX = ".secure-storage.v1";

    private static final String KEYSTORE_PROVIDER = "AndroidKeyStore";
    private static final String CIPHER_TRANSFORMATION = "AES/GCM/NoPadding";
    private static final String ENTRY_VERSION = "v1";
    private static final int GCM_TAG_BITS = 128;
    private static final int GCM_TAG_BYTES = GCM_TAG_BITS / 8;
    private static final int GCM_IV_BYTES = 12;
    private static final int AES_KEY_BITS = 256;
    private static final int MAX_KEY_LENGTH = 128;
    private static final int MAX_VALUE_BYTES = 64 * 1024;
    private static final Object KEYSTORE_LOCK = new Object();

    private final Context context;
    private final SharedPreferences preferences;

    SecureStorage(Context context) {
        this.context = context.getApplicationContext();
        this.preferences = this.context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
    }

    synchronized String get(String key) throws SecureStorageException {
        validateKey(key);
        String entry;
        try {
            entry = preferences.getString(key, null);
        } catch (ClassCastException error) {
            throw new SecureStorageException("corrupt_ciphertext", error);
        }
        if (entry == null) return null;

        try {
            SecretKey secretKey = loadExistingKey();
            if (secretKey == null) throw new SecureStorageException("key_invalidated");
            String[] parts = entry.split(":", -1);
            if (parts.length != 3 || !ENTRY_VERSION.equals(parts[0])) {
                throw new SecureStorageException("corrupt_ciphertext");
            }
            byte[] iv = decodeBase64(parts[1]);
            byte[] ciphertext = decodeBase64(parts[2]);
            if (
                iv.length != GCM_IV_BYTES ||
                ciphertext.length < GCM_TAG_BYTES ||
                ciphertext.length > MAX_VALUE_BYTES + GCM_TAG_BYTES
            ) {
                throw new SecureStorageException("corrupt_ciphertext");
            }
            Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_BITS, iv));
            cipher.updateAAD(aadFor(key));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (KeyPermanentlyInvalidatedException error) {
            throw new SecureStorageException("key_invalidated", error);
        } catch (ProviderException error) {
            throw providerFailure(error);
        } catch (AEADBadTagException error) {
            throw new SecureStorageException("decrypt_failed", error);
        } catch (SecureStorageException error) {
            throw error;
        } catch (GeneralSecurityException error) {
            throw new SecureStorageException("secure_storage_unavailable", error);
        }
    }

    synchronized void set(String key, String value) throws SecureStorageException {
        validateKey(key);
        if (value == null) throw new SecureStorageException("invalid_value");
        byte[] plaintext = value.getBytes(StandardCharsets.UTF_8);
        if (plaintext.length > MAX_VALUE_BYTES) throw new SecureStorageException("value_too_large");

        try {
            Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey());
            cipher.updateAAD(aadFor(key));
            byte[] iv = cipher.getIV();
            if (iv == null || iv.length != GCM_IV_BYTES) {
                throw new SecureStorageException("secure_storage_unavailable");
            }
            String entry =
                ENTRY_VERSION +
                ":" +
                Base64.encodeToString(iv, Base64.NO_WRAP) +
                ":" +
                Base64.encodeToString(cipher.doFinal(plaintext), Base64.NO_WRAP);
            commitValue(key, entry);
        } catch (KeyPermanentlyInvalidatedException error) {
            throw new SecureStorageException("key_invalidated", error);
        } catch (ProviderException error) {
            throw providerFailure(error);
        } catch (SecureStorageException error) {
            throw error;
        } catch (GeneralSecurityException error) {
            throw new SecureStorageException("secure_storage_unavailable", error);
        }
    }

    synchronized void delete(String key) throws SecureStorageException {
        validateKey(key);
        commitValue(key, null);
    }

    static String keyAlias(Context context) {
        return context.getPackageName() + KEY_ALIAS_SUFFIX;
    }

    private SecretKey loadExistingKey() throws GeneralSecurityException {
        KeyStore keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER);
        try {
            keyStore.load(null);
        } catch (java.io.IOException error) {
            throw new GeneralSecurityException(error);
        }
        KeyStore.Entry entry = keyStore.getEntry(keyAlias(context), null);
        if (entry == null) return null;
        if (!(entry instanceof KeyStore.SecretKeyEntry)) {
            throw new GeneralSecurityException("Unexpected key entry type");
        }
        return ((KeyStore.SecretKeyEntry) entry).getSecretKey();
    }

    private SecretKey getOrCreateKey() throws GeneralSecurityException, SecureStorageException {
        synchronized (KEYSTORE_LOCK) {
            SecretKey existing = loadExistingKey();
            if (existing != null) return existing;
            if (!preferences.getAll().isEmpty()) {
                throw new SecureStorageException("key_invalidated");
            }

            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE_PROVIDER);
            generator.init(
                new KeyGenParameterSpec.Builder(
                    keyAlias(context),
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
                )
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setRandomizedEncryptionRequired(true)
                    .setKeySize(AES_KEY_BITS)
                    .build()
            );
            return generator.generateKey();
        }
    }

    private void commitValue(String key, String value) throws SecureStorageException {
        Object previous = preferences.getAll().get(key);
        SharedPreferences.Editor editor = preferences.edit();
        if (value == null) editor.remove(key);
        else editor.putString(key, value);
        if (editor.commit()) return;

        SharedPreferences.Editor rollback = preferences.edit();
        if (previous instanceof String) rollback.putString(key, (String) previous);
        else rollback.remove(key);
        rollback.commit();
        throw new SecureStorageException("write_failed");
    }

    private static byte[] aadFor(String key) {
        return (ENTRY_VERSION + ":" + key).getBytes(StandardCharsets.UTF_8);
    }

    private static byte[] decodeBase64(String value) throws SecureStorageException {
        try {
            return Base64.decode(value, Base64.NO_WRAP);
        } catch (IllegalArgumentException error) {
            throw new SecureStorageException("corrupt_ciphertext", error);
        }
    }

    private static SecureStorageException providerFailure(ProviderException error) {
        Throwable current = error;
        while (current != null) {
            if (current instanceof KeyPermanentlyInvalidatedException) {
                return new SecureStorageException("key_invalidated", error);
            }
            current = current.getCause();
        }
        return new SecureStorageException("secure_storage_unavailable", error);
    }

    private static void validateKey(String key) throws SecureStorageException {
        if (key == null || key.length() > MAX_KEY_LENGTH || !key.matches("[A-Za-z0-9._:-]+")) {
            throw new SecureStorageException("invalid_key");
        }
    }

    static final class SecureStorageException extends Exception {
        private final String code;

        SecureStorageException(String code) {
            super(code);
            this.code = code;
        }

        SecureStorageException(String code, Throwable cause) {
            super(code, cause);
            this.code = code;
        }

        String getCode() {
            return code;
        }
    }
}
