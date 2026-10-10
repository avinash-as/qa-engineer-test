import { test, before, after } from 'node:test';
import assert from 'node:assert';

/**
 * Payment Routes Tests - Bug A and Bug B Fix Verification
 */

let authToken = '';
let testPaymentId = '';

before(async () => {
  // Register and login to get auth token
  const email = `paytest${Date.now()}@merchant.com`;
  const res = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test123!', business_name: 'Test Business' })
  });
  const data = await res.json();
  authToken = data.token;
});

test('Bug A: GET /api/payments should return amount as number', async () => {
  // Create a payment first
  const createRes = await fetch('http://localhost:3000/api/payments', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      amount: 25.5, 
      currency: 'EUR', 
      customer_email: 'customer@test.com' 
    })
  });
  const createData = await createRes.json();
  testPaymentId = createData.data.id;

  // Get payments list
  const res = await fetch('http://localhost:3000/api/payments', {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  
  assert.strictEqual(data.success, true);
  assert.ok(Array.isArray(data.data));
  assert.ok(data.data.length > 0);
  
  // Bug A fix: amount should be a number, not string
  const payment = data.data.find(p => p.id === testPaymentId);
  assert.ok(payment, 'Created payment should be in list');
  assert.strictEqual(typeof payment.amount, 'number', 'Amount should be a number');
  assert.strictEqual(payment.amount, 25.5);
});

test('Bug A: GET /api/payments/:id should return amount as number', async () => {
  const res = await fetch(`http://localhost:3000/api/payments/${testPaymentId}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  
  assert.strictEqual(data.success, true);
  assert.strictEqual(typeof data.data.amount, 'number', 'Amount should be a number');
  assert.strictEqual(data.data.amount, 25.5);
  assert.strictEqual(data.data.id, testPaymentId);
});

test('Bug A: POST /api/payments should create payment with numeric amount', async () => {
  const res = await fetch('http://localhost:3000/api/payments', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      amount: 100.75, 
      currency: 'EUR', 
      customer_email: 'customer2@test.com' 
    })
  });
  assert.strictEqual(res.status, 201);
  const data = await res.json();
  
  assert.strictEqual(data.success, true);
  assert.strictEqual(typeof data.data.amount, 'number', 'Amount in response should be a number');
  assert.strictEqual(data.data.amount, 100.75);
});

test('Bug B: POST /api/payments should reject amount > €50,000', async () => {
  const res = await fetch('http://localhost:3000/api/payments', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      amount: 999999999, 
      currency: 'EUR', 
      customer_email: 'customer@test.com' 
    })
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('maximum') || data.error.includes('exceeds'));
});

test('Bug B: POST /api/payments should reject amount exactly at €50,001', async () => {
  const res = await fetch('http://localhost:3000/api/payments', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      amount: 50001, 
      currency: 'EUR', 
      customer_email: 'customer@test.com' 
    })
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('maximum') || data.error.includes('exceeds'));
});

test('Bug B: POST /api/payments should accept amount at €50,000 limit', async () => {
  const res = await fetch('http://localhost:3000/api/payments', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      amount: 50000, 
      currency: 'EUR', 
      customer_email: 'customer@test.com' 
    })
  });
  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.data.amount, 50000);
});

test('POST /api/payments should reject negative amount', async () => {
  const res = await fetch('http://localhost:3000/api/payments', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      amount: -50, 
      currency: 'EUR', 
      customer_email: 'customer@test.com' 
    })
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Valid amount'));
});

test('POST /api/payments should reject zero amount', async () => {
  const res = await fetch('http://localhost:3000/api/payments', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      amount: 0, 
      currency: 'EUR', 
      customer_email: 'customer@test.com' 
    })
  });
  assert.strictEqual(res.status, 400);
});

test('POST /api/payments should reject invalid currency', async () => {
  const res = await fetch('http://localhost:3000/api/payments', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      amount: 100, 
      currency: 'BTC', 
      customer_email: 'customer@test.com' 
    })
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('currency'));
});

test('POST /api/payments should reject invalid email', async () => {
  const res = await fetch('http://localhost:3000/api/payments', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      amount: 100, 
      currency: 'EUR', 
      customer_email: 'invalid-email' 
    })
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('email'));
});

test('GET /api/payments should require authentication', async () => {
  const res = await fetch('http://localhost:3000/api/payments');
  assert.strictEqual(res.status, 401);
});