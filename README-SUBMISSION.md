# EU Pay QA Engineer Test Assignment - Submission

## Candidate: [Your Name]

## Approach Summary

I approached this assignment systematically by:

1. **Initial Exploration** - Cloned the repository, reviewed all source code to understand the architecture (Express.js API with JWT auth, Socket.IO, in-memory database), and identified the 7 intentional bugs marked in the code comments.

2. **Manual API Testing** - Started the server and tested each endpoint using curl/Node.js scripts to reproduce all 7 bugs:
   - Bug A: Amount returned as string in payment responses
   - Bug B: No maximum amount validation (allowed €999M)
   - Bug C: Email validation accepts `user@domain` without TLD
   - Bug D: Webhook signature verification completely missing
   - Bug E: No idempotency - duplicate webhooks processed multiple times
   - Bug F: Duplicate table orders allowed for same table
   - Bug G: Duplicate e-invoice submissions allowed

3. **Bug Fixing** - Fixed all 7 bugs with production-quality code:
   - Used `parseFloat()` for numeric amount responses
   - Added €50,000 maximum amount validation
   - Strengthened email regex to require TLD
   - Implemented HMAC-SHA256 signature verification with timing-safe comparison
   - Added idempotency using `event_id` tracking
   - Prevented duplicate pending orders per table
   - Blocked duplicate e-invoice submissions

4. **Automated Test Writing** - Wrote 42 comprehensive tests covering:
   - Bug A: 4 tests (amount as number in list, single, create, edge cases)
   - Bug B: 4 tests (reject >50k, reject 50001, accept 50000, negative/zero)
   - Bug C: 7 tests (regex validation, register/login with valid/invalid emails)
   - Bug D: 6 tests (require signature, reject invalid, accept valid, timing attack)
   - Bug E: 5 tests (duplicate event_id, require event_id, missing payment_id, 404)
   - Bug F: 8 tests (duplicate prevention, different tables, status transitions)
   - Bug G: 8 tests (duplicate submission, different invoices, SIRET validation, ownership)

5. **Documentation** - Created professional documentation:
   - `bug-reports.md` - Detailed reproduction steps, impact analysis, root cause
   - `fixes.md` - Code diffs, rationale, testing instructions for each fix
   - `test-plan.md` - 12+ test scenarios for webhook payment flow with security focus

## Key Technical Decisions

- **Signature Verification**: Used `crypto.timingSafeEqual()` with length check to prevent timing attacks
- **Idempotency**: In-memory `processed_webhooks` array (would use Redis in production)
- **Email Validation**: Improved regex while noting production should use RFC 5322 library
- **Amount Type**: `parseFloat()` preserves decimal precision for currency
- **Ownership Checks**: All authenticated endpoints verify `merchant_id` matches JWT user

## Verification

- ✅ All 7 bugs documented in `bug-reports.md`
- ✅ All 7 bugs fixed in source code
- ✅ 42 tests written (exceeds 10 minimum requirement)
- ✅ All tests pass: `npm test` → 42 pass, 0 fail
- ✅ Server starts without errors: `npm start`
- ✅ Bug verification script confirms all bugs fixed

## Files Modified

```
src/routes/auth.routes.js          # Bug C fix
src/routes/payment.routes.js       # Bug A, B fixes
src/routes/webhook.routes.js       # Bug D, E fixes
src/routes/table-order.routes.js   # Bug F fix
src/routes/einvoice.routes.js      # Bug G fix
src/routes/__tests__/auth.routes.test.js          # New tests
src/routes/__tests__/payment.routes.test.js       # New tests
src/routes/__tests__/webhook.routes.test.js       # New tests
src/routes/__tests__/table-order.routes.test.js   # New tests
src/routes/__tests__/einvoice.routes.test.js      # New tests
bug-reports.md                      # Bug documentation
fixes.md                            # Fix documentation
test-plan.md                        # Webhook test plan
README-SUBMISSION.md                # This file
```

## Time Spent

Approximately 5-6 hours total:
- Exploration & manual testing: ~1.5 hours
- Bug fixing: ~1.5 hours
- Test writing: ~2 hours
- Documentation: ~1 hour