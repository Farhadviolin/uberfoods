#!/usr/bin/env node

/**
 * Basic Security Audit Script for UberFoods
 * Checks for common security issues and best practices
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecurityAuditor {
  constructor() {
    this.issues = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      info: []
    };
    this.score = 100;
  }

  addIssue(severity, category, description, file = null, line = null, recommendation = null) {
    const issue = {
      category,
      description,
      file,
      line,
      recommendation
    };

    this.issues[severity].push(issue);

    // Adjust score based on severity
    const penalties = { critical: 25, high: 15, medium: 8, low: 3, info: 0 };
    this.score = Math.max(0, this.score - penalties[severity]);
  }

  async auditFile(filePath, content) {
    const filename = path.basename(filePath);

    // Check for hardcoded secrets
    if (content.includes('password') || content.includes('secret') || content.includes('key')) {
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('password') || line.includes('secret') || line.includes('key')) {
          if (line.includes('=') && !line.includes('process.env') && !line.includes('VITE_')) {
            this.addIssue('high', 'Hardcoded Secrets',
              'Potential hardcoded secret found',
              filePath, index + 1,
              'Use environment variables for secrets');
          }
        }
      });
    }

    // Check for SQL injection vulnerabilities (basic)
    if (content.includes('query(') || content.includes('$query')) {
      if (content.includes('${') && !content.includes('prisma.')) {
        this.addIssue('critical', 'SQL Injection',
          'Potential SQL injection vulnerability detected',
          filePath, null,
          'Use parameterized queries or ORM methods');
      }
    }

    // Check for insecure HTTP usage
    if (content.includes('http://') && !content.includes('localhost') && !content.includes('127.0.0.1')) {
      this.addIssue('medium', 'Insecure HTTP',
        'HTTP URLs found instead of HTTPS',
        filePath, null,
        'Use HTTPS in production');
    }

    // Check for missing input validation
    if (content.includes('@Body()') || content.includes('@Param(')) {
      if (!content.includes('@UsePipes') && !content.includes('ValidationPipe')) {
        this.addIssue('medium', 'Input Validation',
          'Missing input validation',
          filePath, null,
          'Use ValidationPipe or class-validator decorators');
      }
    }

    // Check for CORS configuration
    if (filename.includes('main.ts') || filename.includes('app.module.ts')) {
      if (!content.includes('CORS') && !content.includes('cors')) {
        this.addIssue('low', 'CORS Configuration',
          'CORS configuration not found',
          filePath, null,
          'Configure CORS properly for production');
      }
    }
  }

  async auditEnvironmentVariables() {
    // Check for .env files
    const envFiles = ['.env', '.env.production', '.env.local', '.env.development'];

    for (const envFile of envFiles) {
      if (fs.existsSync(envFile)) {
        try {
          const content = fs.readFileSync(envFile, 'utf8');

          // Check for weak passwords
          if (content.includes('PASSWORD') || content.includes('SECRET')) {
            const lines = content.split('\n');
            lines.forEach((line, index) => {
              if (line.includes('=') && (line.includes('password') || line.includes('secret'))) {
                const value = line.split('=')[1]?.trim();
                if (value && value.length < 12 && !value.includes('${')) {
                  this.addIssue('high', 'Weak Secrets',
                    'Potentially weak password/secret detected',
                    envFile, index + 1,
                    'Use strong, randomly generated secrets with 32+ characters');
                }
              }
            });
          }

          this.addIssue('info', 'Environment File',
            `Environment file found: ${envFile}`,
            envFile, null,
            'Ensure this file is not committed to version control');
        } catch (error) {
          this.addIssue('medium', 'File Access',
            `Could not read environment file: ${envFile}`,
            envFile, null,
            'Check file permissions');
        }
      }
    }
  }

  async auditDependencies() {
    // Check package.json for vulnerable dependencies
    const packageFiles = [
      'package.json',
      'backend/package.json',
      'frontend/customer-web/package.json',
      'frontend/admin-panel/package.json',
      'frontend/restaurant-web/package.json',
      'frontend/driver-app/package.json'
    ];

    for (const packageFile of packageFiles) {
      if (fs.existsSync(packageFile)) {
        try {
          const content = fs.readFileSync(packageFile, 'utf8');
          const packageJson = JSON.parse(content);

          // Check for known vulnerable packages (basic check)
          const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
          const vulnerablePackages = ['express-graphql', 'mongoose', 'request'];

          for (const [name, version] of Object.entries(dependencies)) {
            if (vulnerablePackages.some(vuln => name.includes(vuln))) {
              this.addIssue('high', 'Vulnerable Dependencies',
                `Potentially vulnerable package found: ${name}@${version}`,
                packageFile, null,
                'Update to latest secure version or replace with secure alternative');
            }
          }

          // Check for missing security-related packages
          const securityPackages = ['helmet', 'express-rate-limit', 'joi', 'class-validator'];
          const missingSecurity = securityPackages.filter(pkg => !dependencies[pkg]);

          if (missingSecurity.length > 0) {
            this.addIssue('medium', 'Missing Security Packages',
              `Missing recommended security packages: ${missingSecurity.join(', ')}`,
              packageFile, null,
              'Install and configure security packages');
          }

        } catch (error) {
          this.addIssue('low', 'Package Analysis',
            `Could not parse package.json: ${packageFile}`,
            packageFile, null,
            'Check JSON syntax');
        }
      }
    }
  }

  async auditCodebase() {
    const scanDirectories = [
      'backend/src',
      'frontend/customer-web/src',
      'frontend/admin-panel/src',
      'frontend/restaurant-web/src',
      'frontend/driver-app/src'
    ];

    for (const dir of scanDirectories) {
      if (!fs.existsSync(dir)) continue;

      const walkDirectory = (currentPath) => {
        const items = fs.readdirSync(currentPath);

        for (const item of items) {
          const fullPath = path.join(currentPath, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'dist') {
            walkDirectory(fullPath);
          } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.js') || item.endsWith('.tsx') || item.endsWith('.jsx'))) {
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              this.auditFile(fullPath, content);
            } catch (error) {
              this.addIssue('low', 'File Access',
                `Could not read file: ${fullPath}`,
                fullPath, null,
                'Check file permissions');
            }
          }
        }
      };

      walkDirectory(dir);
    }
  }

  async runAudit() {
    console.log('🔒 Starting Security Audit...');
    console.log('─'.repeat(50));

    // Run all audit checks
    await this.auditEnvironmentVariables();
    await this.auditDependencies();
    await this.auditCodebase();

    return this.generateReport();
  }

  generateReport() {
    const totalIssues = Object.values(this.issues).flat().length;

    console.log('\n📊 SECURITY AUDIT RESULTS');
    console.log('═'.repeat(50));
    console.log(`🔢 Security Score: ${this.score}/100`);
    console.log(`📋 Total Issues Found: ${totalIssues}`);

    const severityColors = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵',
      info: 'ℹ️'
    };

    Object.entries(this.issues).forEach(([severity, issues]) => {
      if (issues.length > 0) {
        console.log(`\n${severityColors[severity]} ${severity.toUpperCase()} (${issues.length} issues):`);
        console.log('─'.repeat(40));

        issues.forEach((issue, index) => {
          console.log(`${index + 1}. ${issue.category}: ${issue.description}`);
          if (issue.file) {
            console.log(`   📁 File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
          }
          if (issue.recommendation) {
            console.log(`   💡 Recommendation: ${issue.recommendation}`);
          }
        });
      }
    });

    console.log('\n🎯 SECURITY ASSESSMENT');
    console.log('─'.repeat(50));

    if (this.score >= 90) {
      console.log('✅ EXCELLENT: Very secure codebase');
    } else if (this.score >= 80) {
      console.log('🟢 GOOD: Secure with minor issues');
    } else if (this.score >= 70) {
      console.log('🟡 FAIR: Some security improvements needed');
    } else if (this.score >= 60) {
      console.log('🟠 CONCERNING: Multiple security issues found');
    } else {
      console.log('🔴 CRITICAL: Significant security vulnerabilities detected');
    }

    console.log('\n📝 RECOMMENDATIONS');
    console.log('─'.repeat(50));
    console.log('1. Address all CRITICAL and HIGH severity issues immediately');
    console.log('2. Implement proper input validation and sanitization');
    console.log('3. Use environment variables for all secrets');
    console.log('4. Regular dependency updates and security scans');
    console.log('5. Implement rate limiting and CORS policies');
    console.log('6. Use HTTPS in production');
    console.log('7. Implement proper authentication and authorization');

    return {
      score: this.score,
      totalIssues,
      issues: this.issues,
      assessment: this.score >= 90 ? 'EXCELLENT' :
                  this.score >= 80 ? 'GOOD' :
                  this.score >= 70 ? 'FAIR' :
                  this.score >= 60 ? 'CONCERNING' : 'CRITICAL'
    };
  }
}

// Run the audit
async function main() {
  try {
    const auditor = new SecurityAuditor();
    const results = await auditor.runAudit();

    // Exit with appropriate code
    if (results.assessment === 'EXCELLENT' || results.assessment === 'GOOD') {
      console.log('\n✅ Security audit passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Security audit found issues!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Security audit failed with error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = SecurityAuditor;
