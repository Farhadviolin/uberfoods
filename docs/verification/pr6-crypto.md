# PR-6 Crypto Service Implementation

## Configuration
**Environment Variable**: `ARCHIVE_ENC_KEY` (64-character hex string)
**Algorithm**: AES-256-GCM (Authenticated Encryption)
**Key Generation**: `node -e "console.log(require('./src/common/crypto/crypto.service').generateKey())"`

## Usage Examples
```typescript
// Encrypt sensitive audit payload
const encrypted = cryptoService.encrypt(JSON.stringify({
  userId: 'user_123',
  action: 'password_changed',
  ipAddress: '192.168.1.100'
}));

// Decrypt for verification
const decrypted = cryptoService.decrypt(encrypted);
```

## Encrypted Format
**Structure**: `v1:iv:authTag:encryptedData`
- `v1`: Version identifier
- `iv`: 128-bit initialization vector (hex)
- `authTag`: GCM authentication tag (hex)
- `encryptedData`: AES-encrypted payload (hex)

## Example
```
v1:a1b2c3d4e5f678901234567890abcdef:fedcba0987654321fedcba0987654321:encryptedpayloadhex...
```

## Key Management
**Storage**: Environment variable (not in code/config files)
**Rotation**: Future enhancement - versioned keys with migration
**Backup**: Encrypted key material stored separately from data

## Fail-Safe Behavior
- **Encryption Disabled**: Plaintext storage (no data loss)
- **Invalid Key**: Encryption disabled with error logging
- **Decryption Failure**: Return encrypted data (prevent data loss)
- **Version Mismatch**: Return data as-is (backward compatibility)

## Integration Points
**Audit Ledger**: Payload encryption before database storage
**Archive Sink**: Encrypt before writing to external storage
**Future**: API response encryption, database field-level encryption

## Security Considerations
- **Key Never Logged**: Encryption keys never appear in logs
- **IV Uniqueness**: Each encryption uses unique random IV
- **Authentication**: GCM provides both confidentiality and integrity
- **No Padding Oracles**: GCM mode immune to padding attacks

## Performance Impact
- **Encryption**: ~1-2ms per operation
- **Decryption**: ~1-2ms per operation
- **Memory**: Minimal additional memory usage
- **Scalability**: Crypto operations are CPU-bound but fast