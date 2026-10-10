import { test, before, after } from 'node:test';
import assert from 'node:assert';

/**
 * Table Order Routes Tests - Bug F Fix Verification
 */

let authToken = '';
let merchantId = '';

before(async () => {
  // Register and login to get auth token
  const email = `tabletest${Date.now()}@merchant.com`;
  const res = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test123!', business_name: 'Test Business' })
  });
  const data = await res.json();
  authToken = data.token;
  
  // Get merchant ID from token (it's in the JWT payload)
  // We'll use the ID from the registration response
  merchantId = data.user.id;
});

test('Bug F: POST /table-orders should reject duplicate pending order for same table', async () => {
  // First order for table 15
  const res1 = await fetch('http://localhost:3000/api/table-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      merchant_id: merchantId, 
      table_number: 15, 
      items: [{ name: 'Burger', price: 15.00, quantity: 2 }] 
    })
  });
  assert.strictEqual(res1.status, 201);
  const data1 = await res1.json();
  assert.ok(data1.data.id);
  
  // Second order for same table (should be rejected)
  const res2 = await fetch('http://localhost:3000/api/table-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      merchant_id: merchantId, 
      table_number: 15, 
      items: [{ name: 'Pizza', price: 20.00, quantity: 1 }] 
    })
  });
  assert.strictEqual(res2.status, 409);
  const data2 = await res2.json();
  assert.ok(data2.error.includes('pending order') || data2.error.includes('already has'));
});

test('POST /table-orders should allow order for different table', async () => {
  // Order for table 16 (different table)
  const res = await fetch('http://localhost:3000/api/table-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      merchant_id: merchantId, 
      table_number: 16, 
      items: [{ name: 'Salad', price: 12.00, quantity: 1 }] 
    })
  });
  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.ok(data.data.id);
});

test('POST /table-orders should allow order after previous one is no longer pending', async () => {
  // First create an order for table 17
  const createRes = await fetch('http://localhost:3000/api/table-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      merchant_id: merchantId, 
      table_number: 17, 
      items: [{ name: 'Soup', price: 8.00, quantity: 1 }] 
    })
  });
  assert.strictEqual(createRes.status, 201);
  const createData = await createRes.json();
  const orderId = createData.data.id;
  
  // Update status to 'served' (no longer pending)
  const updateRes = await fetch(`http://localhost:3000/api/table-orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: 'served' })
  });
  assert.strictEqual(updateRes.status, 200);
  
  // Now new order for same table should be allowed
  const newOrderRes = await fetch('http://localhost:3000/api/table-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      merchant_id: merchantId, 
      table_number: 17, 
      items: [{ name: 'Dessert', price: 6.00, quantity: 1 }] 
    })
  });
  assert.strictEqual(newOrderRes.status, 201);
});

test('POST /table-orders should validate required fields', async () => {
  const res = await fetch('http://localhost:3000/api/table-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      merchant_id: '2' 
      // Missing table_number and items
    })
  });
  assert.strictEqual(res.status, 400);
});

test('POST /table-orders should reject empty items array', async () => {
  const res = await fetch('http://localhost:3000/api/table-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      merchant_id: '2', 
      table_number: 18, 
      items: [] 
    })
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('at least one item'));
});

test('GET /table-orders should return orders for authenticated merchant', async () => {
  const res = await fetch('http://localhost:3000/api/table-orders', {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(Array.isArray(data.data));
});

test('PATCH /table-orders/:id/status should validate status', async () => {
  // Create an order first
  const createRes = await fetch('http://localhost:3000/api/table-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      merchant_id: merchantId, 
      table_number: 19, 
      items: [{ name: 'Coffee', price: 3.00, quantity: 1 }] 
    })
  });
  const createData = await createRes.json();
  const orderId = createData.data.id;
  
  // Try invalid status
  const res = await fetch(`http://localhost:3000/api/table-orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: 'invalid_status' })
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Valid status') || data.error.includes('valid_statuses'));
});

test('PATCH /table-orders/:id/status should update status for valid values', async () => {
  const createRes = await fetch('http://localhost:3000/api/table-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      merchant_id: merchantId, 
      table_number: 20, 
      items: [{ name: 'Tea', price: 2.50, quantity: 1 }] 
    })
  });
  const createData = await createRes.json();
  const orderId = createData.data.id;
  
  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'];
  
  for (const status of validStatuses) {
    const res = await fetch(`http://localhost:3000/api/table-orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.data.status, status);
  }
});