import crypto from 'crypto';

const WEBHOOK_SECRET = 'test-webhook-secret-key';
const body = { payment_id: '3', status: 'completed', event_id: 'evt_123' };
const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(body)).digest('hex');
console.log('Signature:', signature);

// Test Bug D: Valid signature should be accepted
const res = await fetch('http://localhost:3000/api/webhooks/payment-status', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'x-webhook-signature': signature
  },
  body: JSON.stringify(body)
});
console.log('Bug D Test - Valid signature: Status:', res.status);
const data = await res.json();
console.log('Response:', JSON.stringify(data, null, 2));

// Test Bug E: Duplicate webhook with same event_id should be rejected
const res2 = await fetch('http://localhost:3000/api/webhooks/payment-status', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'x-webhook-signature': signature
  },
  body: JSON.stringify(body)
});
console.log('Bug E Test - Duplicate webhook: Status:', res2.status);
const data2 = await res2.json();
console.log('Response:', JSON.stringify(data2, null, 2));

// Test invalid signature
const res3 = await fetch('http://localhost:3000/api/webhooks/payment-status', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'x-webhook-signature': 'invalid-signature'
  },
  body: JSON.stringify({ payment_id: '3', status: 'completed', event_id: 'evt_456' })
});
console.log('Bug D Test - Invalid signature: Status:', res3.status);
const data3 = await res3.json();
console.log('Response:', JSON.stringify(data3, null, 2));