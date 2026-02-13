# PR-7 Key Rotation Service Implementation

## Overview
The key rotation service provides secure key lifecycle management for encryption operations, ensuring that encryption keys can be rotated without data loss or service disruption.

## Key Architecture

### Key Storage
- **Primary Key**: Active key for new encryptions
- **Previous Keys**: Retained for decrypting existing data
- **Key Versions**: Each key has unique ID and metadata
- **Expiration**: Keys retained for 1 year after rotation

### Key Format
- **Algorithm**: AES-256 (32 bytes / 64 hex characters)
- **Generation**: Cryptographically secure random bytes
- **Storage**: Hex-encoded strings in environment variables

## Environment Configuration

### Current Key
```bash
ARCHIVE_ENC_KEY=64-character-hex-string
```

### Previous Keys (for decryption)
```bash
ARCHIVE_PREVIOUS_KEYS=key1-hex,key2-hex,key3-hex
```

## Rotation Process

### Phase 1: Dry Run
```bash
npm run security:rotate-keys:dry
```
- Generates new key without applying changes
- Analyzes impact (how many encryptions would use new key)
- Provides preview of rotation effects

### Phase 2: Application
```bash
npm run security:rotate-keys:apply -- --key=<new-key-hex>
```
- Makes new key active for encryption
- Keeps old key for decryption
- Requires application restart
- Logs rotation event to audit ledger

### Phase 3: Cleanup
- Old keys automatically expire after retention period
- Manual cleanup removes expired keys
- Audit trail maintains decryption capability

## Key States

### Active Key
- Used for all new encryption operations
- Only one active key at a time
- Identified by `currentKeyId`

### Previous Keys
- Retained for decrypting existing data
- Multiple previous keys supported
- Expiration date prevents indefinite retention

### Expired Keys
- Removed from active key ring
- Historical data may become undecryptable
- Logged for compliance purposes

## Security Considerations

### Key Generation
- **CSPRNG**: Cryptographically secure pseudo-random number generator
- **Entropy**: Sufficient entropy for 256-bit keys
- **Uniqueness**: Each key rotation generates unique key

### Key Storage
- **Environment Variables**: No hardcoded keys in code
- **Access Control**: Restricted environment access
- **Auditing**: Key operations logged to audit ledger

### Key Lifecycle
- **Rotation Frequency**: 90 days recommended
- **Emergency Rotation**: Immediate rotation for compromised keys
- **Backup**: Keys backed up separately from data

## Integration Points

### Crypto Service
```typescript
// Encryption uses current key
const encrypted = cryptoService.encrypt(data);

// Decryption tries all available keys
const decrypted = cryptoService.decrypt(encryptedData);
```

### Audit Ledger
```typescript
// Key rotation events logged
await auditLedger.appendEntry(
  'system',
  'key-rotation-service',
  'key.rotated',
  'security',
  rotationId,
  { newKeyId, previousKeyId, timestamp: new Date() }
);
```

## Monitoring & Alerts

### Key Health Metrics
```
crypto_keys_total: 3
crypto_keys_active: 1
crypto_key_rotation_days_since: 45
crypto_decryption_failures_total: 0
```

### Alert Conditions
- Key rotation overdue (>90 days)
- Decryption failures (>0 in 1 hour)
- Key loading errors
- Invalid key formats

## Testing & Verification

### Unit Tests
- ✅ Key generation produces valid 256-bit keys
- ✅ Encryption/decryption round-trip works
- ✅ Multiple key versions supported
- ✅ Key expiration handling

### Integration Tests
- ✅ Application restart preserves key access
- ✅ Audit logging captures rotation events
- ✅ Metrics report correct key status
- ✅ Emergency rotation works

## Disaster Recovery

### Key Loss Scenarios
- **Current Key Lost**: Generate new key, re-encrypt recent data
- **Previous Key Lost**: Data encrypted with lost key becomes inaccessible
- **All Keys Lost**: Complete data recovery from backups

### Recovery Process
1. Identify affected data range
2. Restore keys from secure backup
3. Re-encrypt data with new keys if needed
4. Update application configuration
5. Validate decryption works

## Compliance Integration

### Encryption Standards
- **FIPS 140-2**: Cryptographic module validation
- **NIST Guidelines**: Key management best practices
- **Industry Standards**: PCI DSS, SOX compliance

### Audit Requirements
- **Key Operations**: All key lifecycle events logged
- **Access Logging**: Who accessed keys and when
- **Compliance Reports**: Key rotation status for audits

## Future Enhancements

### Hardware Security Modules (HSM)
- Physical key storage devices
- Tamper-resistant key operations
- FIPS 140-2 Level 3 compliance

### Key Distribution
- Distributed key management across regions
- Key synchronization mechanisms
- Multi-region encryption consistency

### Automated Rotation
- Scheduled automatic key rotation
- Zero-downtime rotation processes
- Integration with secrets management systems