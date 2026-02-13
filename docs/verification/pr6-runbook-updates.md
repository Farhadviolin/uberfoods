# PR-6 Runbook Updates - Multi-Region & Enterprise Features

## New Incident Types

### Read Replica Failure
**Detection**: `uberfoods_db_read_replica_healthy: 0`
**Impact**: Read operations use primary DB (higher load, slower responses)
**Response**:
1. Check replica logs: `docker logs uberfoods_postgres_replica`
2. Verify network connectivity between regions
3. Scale up primary DB if load becomes problematic
4. Restore replica or promote new replica
5. Monitor fallback metrics return to 0

### Multi-Region Eventing Issues
**Detection**: `uberfoods_outbox_dual_publish_failure_total` increasing
**Impact**: Events may not reach secondary region
**Response**:
1. Check inter-region network connectivity
2. Verify secondary Redis accessibility
3. Consider disabling dual publishing temporarily: `FEATURE_DUAL_PUBLISH=false`
4. Implement event replay mechanism for missed events
5. Monitor secondary region for data consistency issues

### Audit Ledger Corruption
**Detection**: Chain verification fails
**Impact**: Compliance and audit trail integrity compromised
**Response**:
1. **IMMEDIATE**: Stop all write operations to prevent further corruption
2. Run chain verification: `npm run audit:verify-chain`
3. Identify corruption point and time range
4. Restore from backup if corruption is extensive
5. Notify compliance team and legal
6. Implement additional integrity checks

### Archive Sink Full
**Detection**: `uberfoods_archive_write_errors_total` increasing
**Impact**: Audit archives not being stored externally
**Response**:
1. Check available storage on archive system
2. Scale storage or implement retention cleanup
3. Verify archive retry queue is processing
4. If critical, switch to local-only archiving temporarily
5. Monitor database growth for audit table

## Updated Recovery Procedures

### Cross-Region Failover
**Scenario**: Primary region completely down
**New Steps**:
1. DNS failover to secondary region (if configured)
2. Enable write operations in secondary: `FEATURE_WRITE_GUARD=false`
3. Update region configuration: `ROLE=primary` in secondary
4. Verify read replica promotion if needed
5. Communicate with users about regional failover

### Sharding-Related Issues
**Detection**: Tenant filtering errors in logs
**Response**:
1. Check `FEATURE_REQUIRE_TENANT_FILTER` setting
2. Verify tenant context resolution in problematic requests
3. Temporarily disable tenant guards if causing widespread issues
4. Fix tenant context extraction logic
5. Re-enable guards gradually

### Encryption Key Issues
**Detection**: Crypto operation failures
**Response**:
1. Check `ARCHIVE_ENC_KEY` environment variable
2. Verify key format (64-char hex)
3. Temporarily disable encryption if key compromised: remove `ARCHIVE_ENC_KEY`
4. Generate new key and plan data re-encryption
5. Audit all decryption operations during incident

## Monitoring Enhancements

### New Alerts Added
- Read replica fallback rate > 5/min
- Dual publish failure rate > 1/min
- Audit chain verification failures
- Archive sink write errors > 10/min
- Cross-region latency > 100ms

### Dashboard Updates
- Multi-region status panel
- Tenant distribution metrics
- Archive health indicators
- Encryption status monitoring