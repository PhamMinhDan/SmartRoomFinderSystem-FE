const ENCRYPTION_KEY = 'SmartRoom@Secret$@Key2024!AES256';

// ─────────────────────────────────────────────────────────────────────────────

export class ChatCrypto {
  // Cache CryptoKey để không import lại mỗi lần
  private static _key: CryptoKey | null = null;

  // ── Import key một lần ─────────────────────────────────────────────────────

  private static async getKey(): Promise<CryptoKey> {
    if (this._key) return this._key;

    const rawKey = new TextEncoder().encode(ENCRYPTION_KEY);
    this._key = await crypto.subtle.importKey(
      'raw',
      rawKey,
      { name: 'AES-CBC' },
      false, // không export được key
      ['encrypt', 'decrypt'],
    );
    return this._key;
  }

  static async encrypt(plainText: string): Promise<string> {
    if (!plainText) return plainText;

    const key = await this.getKey();

    // IV ngẫu nhiên 16 bytes
    const iv = crypto.getRandomValues(new Uint8Array(16));

    const encoded = new TextEncoder().encode(plainText);
    const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, encoded);

    // Ghép IV + CipherText
    const combined = new Uint8Array(16 + cipherBuf.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuf), 16);

    return btoa(String.fromCharCode(...combined));
  }

  static async decrypt(cipherBase64: string): Promise<string> {
    if (!cipherBase64) return cipherBase64;

    const key = await this.getKey();

    const combined = Uint8Array.from(atob(cipherBase64), (c) => c.charCodeAt(0));

    if (combined.length <= 16) throw new Error('Dữ liệu mã hóa quá ngắn.');

    const iv = combined.slice(0, 16);
    const cipherBytes = combined.slice(16);

    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, cipherBytes);

    return new TextDecoder().decode(plainBuf);
  }

  static async safeDecrypt(input: string): Promise<string> {
    if (!input) return '';
    try {
      return await this.decrypt(input);
    } catch {
      return input;
    }
  }
}
