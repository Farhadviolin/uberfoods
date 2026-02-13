import { EncryptionUtil } from '../encryption.util';
import { ConfigService } from '@nestjs/config';

describe('EncryptionUtil', () => {
  let encryptionUtil: EncryptionUtil;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'ENCRYPTION_KEY') return 'test-encryption-key-32-chars-long!';
        if (key === 'HASH_KEY') return 'test-hash-key-32-chars-for-hmac!';
        return null;
      }),
    } as any;

    encryptionUtil = new EncryptionUtil(configService);
  });

  describe('encrypt', () => {
    it('should encrypt text', () => {
      const plaintext = 'sensitive data';
      const encrypted = encryptionUtil.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(plaintext.length);
    });

    it('should produce different output each time (IV)', () => {
      const plaintext = 'test data';
      const encrypted1 = encryptionUtil.encrypt(plaintext);
      const encrypted2 = encryptionUtil.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted text', () => {
      const plaintext = 'sensitive data';
      const encrypted = encryptionUtil.encrypt(plaintext);
      const decrypted = encryptionUtil.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = 'Test äöü €$@!#%&*()';
      const encrypted = encryptionUtil.encrypt(plaintext);
      const decrypted = encryptionUtil.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw on invalid encrypted data', () => {
      expect(() => {
        encryptionUtil.decrypt('invalid-encrypted-data');
      }).toThrow();
    });
  });

  describe('hash', () => {
    it('should create consistent hash with fixed salt', () => {
      const data = 'password123';
      const salt = 'fixedsalt123';
      const hash1 = encryptionUtil.hash(data, salt);
      const hash2 = encryptionUtil.hash(data, salt);

      expect(hash1).toBe(hash2);
      expect(hash1).toContain('fixedsalt123:');
    });

    it('should create different hash for different data', () => {
      const hash1 = encryptionUtil.hash('password1');
      const hash2 = encryptionUtil.hash('password2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyHash', () => {
    it('should verify correct hash', () => {
      const data = 'password123';
      const hash = encryptionUtil.hash(data);

      const isValid = encryptionUtil.verifyHash(data, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect hash', () => {
      const hash = encryptionUtil.hash('password123');

      const isValid = encryptionUtil.verifyHash('wrongpassword', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask sensitive fields', () => {
      const input = {
        email: 'test@example.com',
        password: 'secret123',
        token: 'abc123def',
        name: 'John Doe'
      };
      const masked = encryptionUtil.maskSensitiveData(input);

      expect(masked.email).toBe('test@example.com'); // email not masked
      expect(masked.password).not.toBe('secret123'); // password should be masked
      expect(masked.token).not.toBe('abc123def'); // token should be masked
      expect(masked.name).toBe('John Doe'); // name not masked
    });

    it('should handle short values', () => {
      const input = { password: 'abc' };
      const masked = encryptionUtil.maskSensitiveData(input);

      expect(masked.password).toBe('***');
    });
  });
});
