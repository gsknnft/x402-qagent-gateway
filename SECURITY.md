# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities via:

**Email:** security@x402-qagent.dev (if available)  
**OR GitHub Security Advisory:** https://github.com/gsknnft/x402-qagent-gateway/security/advisories/new

### What to Include

Please include the following information:

1. **Type of vulnerability** (e.g., authentication bypass, injection, privilege escalation)
2. **Affected component** (package, file, function)
3. **Steps to reproduce** (detailed)
4. **Impact assessment** (potential damage, exploit scenario)
5. **Suggested fix** (if known)
6. **Your contact information** (for follow-up)

### Response Timeline

- **Acknowledgment:** Within 48 hours
- **Initial assessment:** Within 7 days
- **Status update:** Every 7 days until resolved
- **Fix timeline:** Depends on severity (see below)

### Severity Levels

| Severity | Response Time | Description |
|----------|---------------|-------------|
| **Critical** | 24-48 hours | Actively exploitable, severe impact |
| **High** | 3-7 days | Exploitable with significant impact |
| **Medium** | 14-30 days | Limited exploitability or impact |
| **Low** | 30-90 days | Minor impact or difficult to exploit |

---

## Security Considerations

### For Developers Using This Project

#### 1. Private Key Management

**⚠️ CRITICAL: Never hardcode private keys in source code**

```typescript
// ❌ NEVER do this
const privateKey = 'sk_abc123...'

// ✅ Use environment variables
const privateKey = process.env.PRIVATE_KEY

// ✅ Better: Use HSM or key management service
const privateKey = await keyVault.getSecret('agent-private-key')
```

**Best Practices:**
- Use environment variables (`.env` files)
- Never commit `.env` files (add to `.gitignore`)
- Use key management services (AWS KMS, Azure Key Vault)
- Rotate keys regularly
- Use different keys for dev/staging/production

#### 2. Payment Verification

**⚠️ CRITICAL: Always verify payments on-chain**

```typescript
// ❌ NEVER trust client-provided receipts without verification
app.post('/api/service', (req, res) => {
  const receipt = req.body.receipt
  // Don't just trust this!
  return processService(receipt)
})

// ✅ Verify on Solana blockchain
app.post('/api/service', async (req, res) => {
  const receipt = req.body.receipt
  
  // Verify transaction exists and is valid
  const isValid = await client.verify(receipt)
  if (!isValid) {
    return res.status(402).json({ error: 'Invalid payment' })
  }
  
  // Check amount matches expected price
  if (receipt.amount < REQUIRED_AMOUNT) {
    return res.status(402).json({ error: 'Insufficient payment' })
  }
  
  // Process service
  return processService(receipt)
})
```

**Verification Checklist:**
- [ ] Transaction exists on-chain
- [ ] Transaction is confirmed
- [ ] Amount is correct
- [ ] Vendor address is correct
- [ ] Signature is valid
- [ ] No replay attacks (check used signatures)

#### 3. Budget Enforcement

**⚠️ IMPORTANT: Enforce budget caps strictly**

```typescript
// ✅ Use BudgetManager to prevent overspending
const budget = new BudgetManager(1000000, {
  cap: 1000000,
  window: 3600,
  autoReset: true
})

// Reserve before spending
const reserved = await budget.reserve(amount, actionId)
if (!reserved) {
  throw new Error('Budget exhausted')
}

try {
  const result = await executeAction()
  await budget.commit(actionId, actualCost)
} catch (error) {
  await budget.release(actionId)
  throw error
}
```

**Budget Security:**
- Use reservation system to prevent race conditions
- Implement hard caps (not just soft warnings)
- Monitor for unusual spending patterns
- Set up alerts for budget thresholds
- Audit budget usage regularly

#### 4. Vendor Allowlisting

**⚠️ IMPORTANT: Restrict vendors to prevent malicious services**

```typescript
// ✅ Use vendor allowlist
const policy = {
  allowedVendors: [
    'TrustedVendor1Address',
    'TrustedVendor2Address'
  ],
  // Only these vendors are permitted
}

const engine = new PolicyEngine(policy)

// Check before paying
const canPay = await engine.canSpend(amount, vendorAddress)
if (!canPay) {
  throw new Error('Vendor not allowed')
}
```

**Vendor Security:**
- Maintain allowlist of trusted vendors
- Verify vendor identities (KYC if required)
- Monitor vendor behavior and SLA
- Implement reputation system
- Review vendor list regularly

#### 5. Rate Limiting

**⚠️ IMPORTANT: Prevent abuse and DoS attacks**

```typescript
// ✅ Implement rate limits
const policy = {
  rateLimits: {
    'VendorAddress': 10,  // Max 10 requests per window
  },
  budgetWindow: 3600  // Per hour
}
```

**Rate Limiting Best Practices:**
- Set per-vendor limits
- Set global limits
- Implement exponential backoff on failures
- Monitor for suspicious patterns
- Use distributed rate limiting in production

#### 6. Input Validation

**⚠️ IMPORTANT: Validate all inputs**

```typescript
import { isValidAddress, isValidSignature } from '@x402-qagent/middleware'

// ✅ Validate inputs
function validatePaymentRequest(request: PaymentRequest): void {
  if (!isValidAddress(request.vendor)) {
    throw new Error('Invalid vendor address')
  }
  
  if (request.amount <= 0 || request.amount > MAX_AMOUNT) {
    throw new Error('Invalid amount')
  }
  
  if (!request.endpoint.startsWith('https://')) {
    throw new Error('Endpoint must use HTTPS')
  }
  
  // Validate endpoint is from allowed domain
  const url = new URL(request.endpoint)
  if (!ALLOWED_DOMAINS.includes(url.hostname)) {
    throw new Error('Endpoint domain not allowed')
  }
}
```

**Validation Checklist:**
- [ ] Address format validation
- [ ] Amount range checks
- [ ] Signature format validation
- [ ] URL/endpoint validation
- [ ] String length limits
- [ ] Type checking

#### 7. Telemetry Privacy

**⚠️ IMPORTANT: Protect sensitive data in telemetry**

```typescript
// ❌ Don't log sensitive data
await telemetry.emit({
  type: 'payment.settled',
  payload: {
    privateKey: '...',  // NEVER!
    receipt: fullReceipt
  }
})

// ✅ Sanitize telemetry data
await telemetry.emit({
  type: 'payment.settled',
  payload: {
    receiptSignature: receipt.signature,
    amount: receipt.amount,
    // Omit sensitive fields
  }
})
```

**Privacy Best Practices:**
- Never log private keys or secrets
- Sanitize PII (personally identifiable information)
- Use correlation IDs instead of user IDs
- Encrypt telemetry in transit
- Implement data retention policies

#### 8. Network Security

**⚠️ IMPORTANT: Secure network communications**

```typescript
// ✅ Always use HTTPS
const endpoint = 'https://vendor.example.com/api'  // Not http://

// ✅ Verify SSL certificates
const response = await fetch(endpoint, {
  // Default: rejectUnauthorized = true
})

// ✅ Set timeouts
const response = await fetch(endpoint, {
  signal: AbortSignal.timeout(30000)  // 30 second timeout
})
```

**Network Security:**
- Use HTTPS for all communications
- Verify SSL/TLS certificates
- Set request timeouts
- Implement retry with backoff
- Use connection pooling
- Monitor for network anomalies

#### 9. Error Handling

**⚠️ IMPORTANT: Don't leak information in errors**

```typescript
// ❌ Don't expose internal details
catch (error) {
  res.status(500).json({
    error: error.stack,  // Leaks implementation details
    query: sqlQuery      // Leaks internal structure
  })
}

// ✅ Generic error messages for clients
catch (error) {
  logger.error('Payment failed', { error, context })  // Log internally
  res.status(500).json({
    error: 'Payment processing failed'  // Generic message
  })
}
```

**Error Handling Best Practices:**
- Log detailed errors internally
- Return generic errors to clients
- Don't expose stack traces in production
- Use error codes instead of messages
- Implement error monitoring

#### 10. Dependency Security

**⚠️ IMPORTANT: Keep dependencies updated**

```bash
# Regular security audits
pnpm audit

# Fix vulnerabilities
pnpm audit fix

# Update dependencies
pnpm update

# Check for outdated packages
pnpm outdated
```

**Dependency Security:**
- Run `pnpm audit` regularly
- Keep dependencies updated
- Review dependency licenses
- Use lock files (`pnpm-lock.yaml`)
- Monitor security advisories
- Use tools like Snyk or Dependabot

---

## Production Security Checklist

Before deploying to production:

### Infrastructure
- [ ] Use HTTPS/TLS for all endpoints
- [ ] Implement firewall rules
- [ ] Enable DDoS protection
- [ ] Use VPN for sensitive operations
- [ ] Implement intrusion detection
- [ ] Set up logging and monitoring

### Application
- [ ] Environment variables for secrets
- [ ] No hardcoded credentials
- [ ] Input validation on all endpoints
- [ ] Rate limiting implemented
- [ ] Error handling doesn't leak info
- [ ] Dependencies audited and updated

### Keys & Credentials
- [ ] Private keys in HSM or key vault
- [ ] Separate keys for each environment
- [ ] Key rotation policy in place
- [ ] Access control for key access
- [ ] Backup and recovery procedures

### Payment Security
- [ ] On-chain payment verification
- [ ] Vendor allowlisting enabled
- [ ] Budget caps enforced
- [ ] Rate limits configured
- [ ] Payment audit logging
- [ ] Fraud detection monitoring

### Monitoring
- [ ] Real-time alerts for anomalies
- [ ] Budget threshold alerts
- [ ] Failed payment monitoring
- [ ] SLA violation alerts
- [ ] Security event logging
- [ ] Performance monitoring

### Compliance
- [ ] GDPR compliance (if applicable)
- [ ] AML/KYC requirements met
- [ ] Data retention policies
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Incident response plan

---

## Known Security Limitations

### Current Demo Limitations

1. **Simulated Payments**
   - Demo uses simulated X402 client
   - No real blockchain verification
   - **Production:** Use real X402 facilitator

2. **In-Memory Storage**
   - Budget state stored in memory
   - **Production:** Use persistent database

3. **No Authentication**
   - Demo has no auth on endpoints
   - **Production:** Implement OAuth/JWT

4. **Single-Node**
   - Demo runs on single process
   - **Production:** Use distributed architecture

### Mitigations

For production use:
- Implement real X402 facilitator integration
- Use persistent database (PostgreSQL, TimescaleDB)
- Add authentication and authorization
- Deploy on scalable infrastructure
- Implement proper key management
- Set up monitoring and alerting

---

## Security Updates

### Staying Informed

- **GitHub Security Advisories:** https://github.com/gsknnft/x402-qagent-gateway/security/advisories
- **npm Security Advisories:** https://www.npmjs.com/advisories
- **Solana Security:** https://github.com/solana-labs/solana/security

### Notification

Security updates will be announced via:
- GitHub Security Advisories
- GitHub Releases (for critical fixes)
- Project README (for general updates)

---

## Responsible Disclosure

We believe in responsible disclosure and will:

1. **Acknowledge** your report within 48 hours
2. **Investigate** the vulnerability promptly
3. **Provide updates** on remediation progress
4. **Credit** you in the security advisory (if desired)
5. **Coordinate** public disclosure timing

We ask that you:

1. **Give us time** to fix the issue before public disclosure
2. **Do not exploit** the vulnerability
3. **Do not disclose** the vulnerability publicly until fixed
4. **Provide details** to help us reproduce and fix

---

## Security Best Practices Summary

### For Agent Developers

✅ **DO:**
- Use environment variables for secrets
- Verify payments on-chain
- Implement budget caps and limits
- Use vendor allowlisting
- Validate all inputs
- Log security events
- Keep dependencies updated
- Use HTTPS everywhere
- Implement rate limiting
- Handle errors securely

❌ **DON'T:**
- Hardcode private keys
- Trust client-provided data
- Expose internal errors
- Log sensitive information
- Use HTTP for sensitive data
- Skip input validation
- Ignore security warnings
- Deploy without monitoring

---

## Additional Resources

- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **CWE Top 25:** https://cwe.mitre.org/top25/
- **Solana Security Best Practices:** https://docs.solana.com/security
- **Node.js Security Best Practices:** https://nodejs.org/en/docs/guides/security/

---

## Contact

For security-related questions or concerns:
- **Security Issues:** Use GitHub Security Advisory
- **General Questions:** Open a GitHub Discussion
- **Urgent Matters:** Email security@x402-qagent.dev (if available)

---

**Last Updated:** November 2025  
**Security Policy Version:** 1.0
