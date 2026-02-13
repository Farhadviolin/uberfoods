# PR-7 Dependency Management Policy

## Lockfile Strategy

### package-lock.json (Backend)
- **Strategy**: Exact version pinning for production dependencies
- **Update Process**: Manual review and testing for major updates
- **CI/CD**: Lockfile integrity verification
- **Storage**: Committed to version control

### package-lock.json (Frontend)
- **Strategy**: Exact version pinning with automated patch updates
- **Update Process**: Automated Dependabot PRs for patches
- **CI/CD**: Lockfile integrity verification
- **Storage**: Committed to version control

## Registry Security

### Allowed Registries
- **Primary**: npmjs.org (public registry)
- **Secondary**: None (no private registries)
- **Verification**: Package signatures validated by npm

### Registry Configuration
```json
{
  "registry": "https://registry.npmjs.org/",
  "save-exact": true,
  "audit": true,
  "fund": false
}
```

## Dependency Approval Process

### New Dependencies
1. **Security Review**: Automated scanning with SAST tools
2. **License Check**: Approved license compatibility
3. **Maintenance**: Active maintenance and update frequency
4. **Alternatives**: Consider smaller, focused alternatives

### Update Process
1. **Patch Updates**: Automated via Dependabot (security fixes)
2. **Minor Updates**: Manual review and testing
3. **Major Updates**: Full regression testing and security audit

## Vulnerability Management

### Automated Scanning
- **Frequency**: Daily CI/CD scans
- **Tools**: npm audit, Snyk, OWASP Dependency Check
- **Severity Threshold**: Block on high/critical vulnerabilities

### Remediation Process
1. **Detection**: Automated alerts on new vulnerabilities
2. **Assessment**: Security team impact analysis
3. **Remediation**: Update to patched versions or implement mitigations
4. **Verification**: Re-scan and confirm fix

## Dependency Scanners

### Primary Tools
- **npm audit**: Built-in npm vulnerability scanning
- **Snyk**: Advanced vulnerability and license scanning
- **OWASP Dependency Check**: Comprehensive SCA scanning

### CI/CD Integration
```yaml
- name: Security Scan
  run: |
    npm audit --audit-level high
    npm run security:sbom
    npm run security:sast
```

## Frozen Lockfile Policy

### Development
- **Lockfile**: Committed and updated with dependency changes
- **Integrity**: SHA256 checksum verification in CI/CD
- **Conflicts**: Resolved by updating to latest compatible versions

### Production
- **Lockfile**: Exact reproduction of tested versions
- **Deployment**: Docker builds use committed lockfile
- **Updates**: Require full testing cycle before deployment

## License Compliance

### Approved Licenses
- MIT, BSD-2-Clause, BSD-3-Clause, Apache-2.0
- ISC, CC0-1.0
- GPL-2.0, GPL-3.0 (with approval)
- LGPL-2.1, LGPL-3.0 (with approval)

### License Scanning
- **Tool**: Licensee or FOSSA
- **Frequency**: On dependency changes
- **Blocking**: Unapproved licenses prevent merge

## Maintenance and Updates

### Dependency Health
- **Outdated Packages**: Monthly review
- **Unmaintained Packages**: Replacement plan for packages without recent updates
- **Security Support**: End-of-life package replacement

### Automation
- **Dependabot**: Automated PRs for dependency updates
- **Renovate**: Alternative automation tool
- **Alerts**: Slack notifications for security updates

## Metrics and Monitoring

### Dependency Metrics
```
dependency_count_total{type="backend"} 234
dependency_count_total{type="frontend"} 156
dependency_vulnerabilities_total{severity="high"} 0
dependency_vulnerabilities_total{severity="critical"} 0
```

### Alert Rules
- New critical vulnerabilities
- License compliance violations
- Dependency count growth >10% month-over-month
- Packages without updates for >1 year