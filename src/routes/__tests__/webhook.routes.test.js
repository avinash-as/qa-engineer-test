import { test, before, after } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';

/**
 * Webhook Routes Tests - Bug D and Bug E Fix Verification
 */

const WEBHOOK_SECRET = 'test-webhook-secret-key';
let authToken = '';
let testPaymentId = '';

function generateSignature(body) {
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
}

before(async () => {
  // Register and login to get auth token
  const email = `webhooktest${Date.now()}@merchant.com`;
  const res = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test123!', business_name: 'Test Business' })
  });
  const data = await res.json();
  authToken = data.token;
  
  // Create a test payment
  const createRes = await fetch('http://localhost:3000/api/payments', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      amount: 50, 
      currency: 'EUR', 
      customer_email: 'customer@test.com' 
    })
  });
  const createData = await createRes.json();
  testPaymentId = createData.data.id;
});

test('Bug D: POST /webhooks/payment-status should require signature', async () => {
  const res = await fetch('http://localhost:3000/api/webhooks/payment-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      payment_id: testPaymentId, 
      status: 'completed', 
      event_id: 'evt_test_1' 
    })
  });
  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.ok(data.error.includes('signature') || data.error.includes('Missing'));
});

test('Bug D: POST /webhooks/payment-status should reject invalid signature', async () => {
  const res = await fetch('http://localhost:3000/api/webhooks/payment-status', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-webhook-signature': 'invalid-signature'
    },
    body: JSON.stringify({ 
      payment_id: testPaymentId, 
      status: 'completed', 
      event_id: 'evt_test_2' 
    })
  });
  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.ok(data.error.includes('Invalid'));
});

test('Bug D: POST /webhooks/payment-status should accept valid signature', async () => {
  const eventId = 'evt_test_3';
  const body = { payment_id: testPaymentId, status: 'completed', event_id: eventId };
  const signature = generateSignature(body);
  
  const res = await fetch('http://localhost:3000/api/webhooks/payment-status', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-webhook-signature': signature
    },
    body: JSON.stringify(body)
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.payment_id, testPaymentId);
  assert.strictEqual(data.new_status, 'completed');
  
  // Verify payment status was updated
  const paymentRes = await fetch(`http://localhost:3000/api/payments/${testPaymentId}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  const paymentData = await paymentRes.json();
  assert.strictEqual(paymentData.data.status, 'completed');
});

test('Bug E: POST /webhooks/payment-status should reject duplicate event_id (idempotency)', async () => {
  const eventId = 'evt_test_4';
  const body = { payment_id: testPaymentId, status: 'failed', event_id: eventId };
  const signature = generateSignature(body);
  
  // First request
  const res1 = await fetch('http://localhost:3000/api/webhooks/payment-status', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-webhook-signature': signature
    },
    body: JSON.stringify(body)
  });
  assert.strictEqual(res1.status, 200);
  const data1 = await res1.json();
  assert.strictEqual(data1.success, true);
  
  // Second request with same event_id
  const res2 = await fetch('http://localhost:3000/api/webhooks/payment-status', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-webhook-signature': signature
    },
    body: JSON.stringify(body)
  });
  assert.strictEqual(res2.status, 200);
  const data2 = await res2.json();
  assert.strictEqual(data2.message, 'Already processed');
  assert.strictEqual(data2.event_id, eventId);
});

test('Bug E: POST /webhooks/payment-status should require event_id', async () => {
  const body = { payment_id: testPaymentId, status: 'pending' }; // No event_id
  const signature = generateSignature(body);
  
  const res = await fetch('http://localhost:3000/api/webhooks/payment-status', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-webhook-signature': signature
    },
    body: JSON.stringify(body)
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('event_id') || data.error.includes('idempotency'));
});

test('POST /webhooks/payment-status should reject missing payment_id', async () => {
  const eventId = 'evt_test_5';
  const body = { status: 'completed', event_id: eventId }; // No payment_id
  const signature = generateSignature(body);
  
  const res = await fetch('http://localhost:3000/api/webhooks/payment-status', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-webhook-signature': signature
    },
    body: JSON.stringify(body)
  });
  assert.strictEqual(res.status, 400);
});

test('POST /webhooks/payment-status should return 404 for non-existent payment', async () => {
  const eventId = 'evt_test_6';
  const body = { payment_id: '99999', status: 'completed', event_id: eventId };
  const signature = generateSignature(body);
  
  const res = await fetch('http://localhost:3000/api/webhooks/payment-status', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-webhook-signature': signature
    },
    body: JSON.stringify(body)
  });
  assert.strictEqual(res.status, 404);
  const data = await res.json();
  assert.ok(data.error.includes('not found'));
});

test('Webhook signature should use timing-safe comparison', async () => {
  // Test that timing attack prevention works (this is more of a smoke test)
  const eventId = 'evt_timing_test';
  const body = { payment_id: testPaymentId, status: 'refunded', event_id: eventId };
  const validSignature = generateSignature(body);
  
  // Valid signature should work
  const res1 = await fetch('http://localhost:3000/api/webhooks/payment-status', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-webhook-signature': validSignature
    },
    body: JSON.stringify(body)
  });
  assert.strictEqual(res1.status, 200);
  
  // Invalid signature of different length should return 401, not 500
  const res2 = await fetch('http://localhost:3000/api/webhooks/payment-status', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-webhook-signature': 'short'
    },
    body: JSON.stringify({ ...body, event_id: 'evt_timing_test_2' })
  });
  assert.strictEqual(res2.status, 401);
});