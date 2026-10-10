import crypto from 'crypto';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjIiLCJlbWFpbCI6InRlc3Q0QG1lcmNoYW50LmNvbSIsInR5cGUiOiJtZXJjaGFudCIsImlhdCI6MTc5MTYwODYxMywiZXhwIjoxNzkxNjk1MDEzfQ.QUTq95wXlj3Zgctu-2mKxPDcRinp8_vIiR63GvwuhmQ';

// Test Bug F: Duplicate table order for same table
console.log('=== Bug F Test: Duplicate table order ===');
const res1 = await fetch('http://localhost:3000/api/table-orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    merchant_id: '2', 
    table_number: 10, 
    items: [{ name: 'Burger', price: 15.00, quantity: 2 }] 
  })
});
console.log('First order - Status:', res1.status);
const data1 = await res1.json();
console.log('First order - ID:', data1.data.id);

const res2 = await fetch('http://localhost:3000/api/table-orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    merchant_id: '2', 
    table_number: 10, 
    items: [{ name: 'Pizza', price: 20.00, quantity: 1 }] 
  })
});
console.log('Second order - Status:', res2.status);
const data2 = await res2.json();
console.log('Second order - Response:', JSON.stringify(data2, null, 2));

// Test Bug G: Duplicate e-invoice submission
console.log('\n=== Bug G Test: Duplicate e-invoice submission ===');
const res3 = await fetch('http://localhost:3000/api/einvoice/submit', {
  method: 'POST',
  headers: { 
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ invoice_id: 'inv_001', customer_siret: '12345678901234' })
});
console.log('First submission - Status:', res3.status);
const data3 = await res3.json();
console.log('First submission - Response:', JSON.stringify(data3, null, 2));

const res4 = await fetch('http://localhost:3000/api/einvoice/submit', {
  method: 'POST',
  headers: { 
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ invoice_id: 'inv_001', customer_siret: '12345678901234' })
});
console.log('Second submission - Status:', res4.status);
const data4 = await res4.json();
console.log('Second submission - Response:', JSON.stringify(data4, null, 2));