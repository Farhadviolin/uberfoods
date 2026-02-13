# PR-5 Backup and Restore Implementation

## Backup Strategy

### Automated Daily Backups
**Schedule**: Daily at 02:00 UTC
**Retention**: 7 days rolling window
**Components**:
- PostgreSQL database (pg_dump custom format)
- Redis RDB snapshot
- Backup manifest with metadata

### Backup Contents
**Database**:
- All tables and data
- Indexes and constraints
- Sequences and defaults
- Custom functions (if any)

**Redis**:
- All cached data
- Session information
- Rate limiting state
- WebSocket adapter state

## Restore Procedure

### Point-in-Time Recovery
```bash
# List available backups
./backend/scripts/backup/backup-restore.sh list

# Verify backup integrity
./backend/scripts/backup/backup-restore.sh verify uberfoods_backup_20251221_230000

# Restore to new database
./backend/scripts/backup/backup-restore.sh restore uberfoods_backup_20251221_230000
```

### Recovery Time Objective (RTO)
- **Database Restore**: <15 minutes for 100GB database
- **Redis Restore**: <5 minutes
- **Application Recovery**: <10 minutes (after DB ready)

### Recovery Point Objective (RPO)
- **Database**: <5 minutes (WAL shipping could reduce this)
- **Redis**: <1 minute (AOF every second)
- **Application State**: Immediate (stateless design)

## Verification Scripts

### Backup Integrity Check
```bash
# Verify backup can be restored
./backend/scripts/backup/backup-restore.sh verify <backup_name>

# Check returns:
# ✅ Manifest valid JSON
# ✅ Backup file exists and readable
# ✅ PostgreSQL can list contents
# ✅ File size reasonable
```

### Restore Smoke Test
**Automated Checks After Restore**:
1. Database connection successful
2. Basic queries execute
3. Row counts match expectations
4. API health endpoint responds
5. Basic business logic works

**Example Output**:
```
Orders count in restored database: 75000
✅ API health check passed
✅ Smoke test completed
```

## Disaster Recovery Scenarios

### Complete Data Center Loss
1. **Infrastructure**: Provision new environment (Terraform)
2. **Database**: Restore from latest backup
3. **Redis**: Restore from backup or start fresh
4. **Application**: Deploy from CI/CD
5. **Data**: Apply any missing transactions (if WAL available)

### Database Corruption
1. **Stop Application**: Prevent further corruption
2. **Identify Corruption**: Check PostgreSQL logs
3. **Point-in-Time Recovery**: Restore to last good backup + replay WAL
4. **Verify Integrity**: Run consistency checks
5. **Resume Operations**: Bring application back online

### Redis Memory Exhaustion
1. **Scale Redis**: Increase memory limits
2. **Data Cleanup**: Remove expired keys
3. **Cluster Redis**: Implement Redis Cluster for horizontal scaling
4. **Backup Strategy**: Ensure RDB/AOF backups working

## Backup Testing

### Monthly DR Drills
- Restore backup to isolated environment
- Run full test suite against restored data
- Verify business logic correctness
- Measure restore time vs RTO targets

### Continuous Verification
- Daily backup integrity checks
- Automated restore tests in CI/CD
- Alert on backup failures
- Size and content validation

## Security Considerations

### Encryption
- **At Rest**: Database encrypted (if using RDS)
- **In Transit**: TLS for all connections
- **Backup Files**: Encrypted before storage

### Access Control
- **Backup Creation**: Automated service account
- **Restore Operations**: Restricted to SRE team
- **Audit Logging**: All backup/restore operations logged

## Monitoring & Alerting

### Backup Health
```
backup_success: 1  # Gauge: 1 if last backup successful
backup_age_seconds: 86400  # Age of latest backup
backup_size_bytes: 1073741824  # Size of latest backup
```

### Restore Metrics
```
restore_duration_seconds: 900  # Time to restore
restore_success: 1  # 1 if restore successful
data_loss_seconds: 300  # Data lost in restore
```

### Alerts
- Backup failed (critical)
- Backup older than 25 hours (warning)
- Restore test failed (critical)
- Backup size anomaly (warning)