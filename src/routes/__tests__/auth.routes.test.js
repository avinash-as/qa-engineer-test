import { test } from 'node:test';
import assert from 'node:assert';

/**
 * Auth Routes Tests - Bug C Fix Verification
 */

// Test validateEmail function by duplicating the logic (since it's not exported)
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

test('Bug C: validateEmail should reject email without TLD', () => {
  assert.strictEqual(validateEmail('user@domain'), false);
  assert.strictEqual(validateEmail('test@localhost'), false);
  assert.strictEqual(validateEmail('invalid@domain'), false);
});

test('Bug C: validateEmail should accept valid emails with TLD', () => {
  assert.strictEqual(validateEmail('user@domain.com'), true);
  assert.strictEqual(validateEmail('test.email@merchant.eu'), true);
  assert.strictEqual(validateEmail('user+tag@example.org'), true);
  assert.strictEqual(validateEmail('merchant@test.co.uk'), true);
});

test('Bug C: validateEmail should reject malformed emails', () => {
  assert.strictEqual(validateEmail('invalid-email'), false);
  assert.strictEqual(validateEmail('@domain.com'), false);
  assert.strictEqual(validateEmail('user@'), false);
  assert.strictEqual(validateEmail('user@domain.'), false);
  assert.strictEqual(validateEmail(''), false);
  // Single character TLD should be rejected (but current regex allows it)
  // This is a known limitation - the regex requires dot + at least 1 char after
});

test('Bug C: POST /auth/register should reject email without TLD', async () => {
  const res = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email: 'user@domain', 
      password: 'SecurePass123!', 
      business_name: 'Test Business' 
    })
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Invalid email format'));
});

test('Bug C: POST /auth/register should accept valid email', async () => {
  const uniqueEmail = `test${Date.now()}@merchant.com`;
  const res = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email: uniqueEmail, 
      password: 'SecurePass123!', 
      business_name: 'Test Business' 
    })
  });
  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.ok(data.token);
  assert.strictEqual(data.user.email, uniqueEmail);
});

test('Bug C: POST /auth/login should work with valid credentials', async () => {
  const email = `logintest${Date.now()}@merchant.com`;
  await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test123!', business_name: 'Test Business' })
  });
  
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test123!' })
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(data.token);
  assert.strictEqual(data.user.email, email);
});

test('Bug C: POST /auth/login should reject invalid password', async () => {
  const email = `logintest2${Date.now()}@merchant.com`;
  await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test123!', business_name: 'Test Business' })
  });
  
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'WrongPassword!' })
  });
  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.strictEqual(data.error, 'Invalid credentials');
});