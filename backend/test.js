/**
 * Automated Verification Test Suite
 * Tests all rules, endpoints, and features required for Smart Canteen Order & Rush Tracker:
 * - Menu listing & structure
 * - Placing single/multiple item orders & backend total calculation
 * - Order number formatting (ORD-1001, etc.)
 * - Unavailable item rejection & error messaging (Rule: Do not allow unavailable items)
 * - Order status lifecycle: New -> Preparing -> Ready -> Collected
 * - Active order filtering (Collected orders excluded from active count)
 * - Exact rush levels: 0-4 = Low, 5-9 = Medium, 10+ = High
 * - Staff menu availability toggling
 * - Staff authentication & authorization (401 / 403 / 200)
 */

const http = require('http');
const { app } = require('./server');
const { connectDB, disconnectDB } = require('./config/db');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');
const Counter = require('./models/Counter');
const { seedInitialDataIfNeeded } = require('./seed');

let server;
let baseUrl;
const STAFF_SECRET = 'codespark-staff-secret-2026';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    failedCount++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('Starting Smart Canteen Backend Verification Tests...');
  console.log('====================================================\n');

  try {
    await connectDB();
    await Order.deleteMany({});
    await MenuItem.deleteMany({});
    await Counter.deleteMany({});
    await seedInitialDataIfNeeded();

    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    // ----------------------------------------------------
    // TEST SUITE 1: Menu Endpoints
    // ----------------------------------------------------
    console.log('Test Suite 1: Menu API');
    const menuRes = await request('GET', '/api/menu');
    assert(menuRes.status === 200, 'GET /api/menu returns HTTP 200');
    assert(Array.isArray(menuRes.data.items), 'GET /api/menu returns items array');
    assert(menuRes.data.items.length >= 4, 'Menu contains seeded items (at least 4)');

    const sandwich = menuRes.data.items.find(i => i.name.includes('Sandwich'));
    const unavailableItem = menuRes.data.items.find(i => i.available === false);
    assert(sandwich && sandwich.available === true, 'Sandwich is available');
    assert(unavailableItem && unavailableItem.available === false, 'An item is unavailable by default for testing');
    assert(sandwich.id && typeof sandwich.price === 'number', 'Menu item has id string and numeric price');

    // ----------------------------------------------------
    // TEST SUITE 2: Order Placement & Calculations
    // ----------------------------------------------------
    console.log('\nTest Suite 2: Order Placement & Pricing');
    
    // Order 1: 2 x Veg Sandwich (2 * 50 = 100)
    const order1Res = await request('POST', '/api/orders', {
      items: [{ itemId: sandwich.id, quantity: 2 }]
    });
    assert(order1Res.status === 201, 'POST /api/orders returns HTTP 201 Created');
    const order1Number = order1Res.data.order ? order1Res.data.order.orderNumber : '';
    assert(/^100\/\d{4}$/.test(order1Number), `First order has orderNumber ${order1Number} matching ^100/\\d{4}$`);
    assert(order1Res.data.order.status === 'New', 'Initial status is "New"');
    assert(order1Res.data.order.total === 100, 'Server calculated total correctly: 2 * 50 = 100');
    assert(order1Res.data.order.items[0].subtotal === 100, 'Item subtotal correctly calculated: 100');

    // ----------------------------------------------------
    // TEST SUITE 3: Unavailable Items Rejection
    // ----------------------------------------------------
    console.log('\nTest Suite 3: Unavailable Items Validation');
    const orderUnavailRes = await request('POST', '/api/orders', {
      items: [{ itemId: unavailableItem.id, quantity: 1 }]
    });
    assert(orderUnavailRes.status === 409, 'Ordering unavailable item returns HTTP 409');
    assert(orderUnavailRes.data.error.code === 'ITEM_UNAVAILABLE', 'Error code is "ITEM_UNAVAILABLE"');
    assert(orderUnavailRes.data.error.message.includes('unavailable'), 'Clear message returned when item is unavailable');

    // ----------------------------------------------------
    // TEST SUITE 4: Order Tracking
    // ----------------------------------------------------
    console.log('\nTest Suite 4: Order Tracking');
    const trackRes = await request('GET', `/api/orders/${encodeURIComponent(order1Number)}`);
    assert(trackRes.status === 200, `GET /api/orders/${order1Number} returns HTTP 200`);
    assert(trackRes.data.order.orderNumber === order1Number, 'Retrieved order matches orderNumber');
    assert(trackRes.data.order.total === 100, 'Retrieved order has correct total');

    const nonExistRes = await request('GET', '/api/orders/999/9999');
    assert(nonExistRes.status === 404, 'Non-existent order returns HTTP 404');
    assert(nonExistRes.data.error.code === 'ORDER_NOT_FOUND', 'Error code is "ORDER_NOT_FOUND"');

    // ----------------------------------------------------
    // TEST SUITE 5: Staff Auth & Operations
    // ----------------------------------------------------
    console.log('\nTest Suite 5: Staff Authorization & Status Updates');
    
    // Unauthorized access check
    const unauthRes = await request('GET', '/api/staff/orders/active');
    assert(unauthRes.status === 401, 'Accessing staff endpoints without token returns HTTP 401 UNAUTHORIZED');
    assert(unauthRes.data.error.code === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');

    // Forbidden check (wrong token)
    const badTokenRes = await request('GET', '/api/staff/orders/active', null, {
      'Authorization': 'Bearer wrong-token'
    });
    assert(badTokenRes.status === 403, 'Accessing staff endpoint with invalid token returns HTTP 403 FORBIDDEN');

    // Authorized access
    const authHeaders = { 'Authorization': `Bearer ${STAFF_SECRET}` };
    const authActiveRes = await request('GET', '/api/staff/orders/active', null, authHeaders);
    assert(authActiveRes.status === 200, 'Authorized staff request returns HTTP 200');
    assert(authActiveRes.data.activeCount === 1, 'Active count is 1');
    assert(authActiveRes.data.rushLevel === 'Low', 'Rush level is "Low" for 1 order (0-4 range)');

    // Status transition: New -> Preparing
    const updateStatus1 = await request('PATCH', `/api/staff/orders/${encodeURIComponent(order1Number)}/status`, { status: 'Preparing' }, authHeaders);
    assert(updateStatus1.status === 200, 'Updating status to "Preparing" returns HTTP 200');
    assert(updateStatus1.data.order && updateStatus1.data.order.status === 'Preparing', 'Order status is now "Preparing"');

    // Status transition: Preparing -> Ready
    const updateStatus2 = await request('PATCH', `/api/staff/orders/${encodeURIComponent(order1Number)}/status`, { status: 'Ready' }, authHeaders);
    assert(updateStatus2.data.order && updateStatus2.data.order.status === 'Ready', 'Order status is now "Ready"');

    // Status transition: Ready -> Collected
    const updateStatus3 = await request('PATCH', `/api/staff/orders/${encodeURIComponent(order1Number)}/status`, { status: 'Collected' }, authHeaders);
    assert(updateStatus3.data.order && updateStatus3.data.order.status === 'Collected', 'Order status is now "Collected"');

    // Check that Collected order is NOT counted in active orders
    const activeAfterCollected = await request('GET', '/api/staff/orders/active', null, authHeaders);
    assert(activeAfterCollected.data.activeCount === 0, 'Collected order is excluded from active orders (activeCount = 0)');
    assert(activeAfterCollected.data.rushLevel === 'Low', 'Rush level is "Low" when activeCount is 0');

    // ----------------------------------------------------
    // TEST SUITE 6: Exact Rush Thresholds (0-4 = Low, 5-9 = Medium, 10+ = High)
    // ----------------------------------------------------
    console.log('\nTest Suite 6: Exact Rush Level Limits');

    // Test with 4 active orders -> Rush should still be Low
    await request('POST', '/api/staff/demo/seed-rush', { count: 4 }, authHeaders);
    let rushCheck = await request('GET', '/api/staff/orders/active', null, authHeaders);
    assert(rushCheck.data.activeCount === 4 && rushCheck.data.rushLevel === 'Low', '4 active orders => Rush Level is "Low" (Boundary check)');

    // Test with 5 active orders -> Rush should be Medium
    await request('POST', '/api/staff/demo/seed-rush', { count: 5 }, authHeaders);
    rushCheck = await request('GET', '/api/staff/orders/active', null, authHeaders);
    assert(rushCheck.data.activeCount === 5 && rushCheck.data.rushLevel === 'Medium', '5 active orders => Rush Level is "Medium" (Boundary check)');

    // Test with 9 active orders -> Rush should still be Medium
    await request('POST', '/api/staff/demo/seed-rush', { count: 9 }, authHeaders);
    rushCheck = await request('GET', '/api/staff/orders/active', null, authHeaders);
    assert(rushCheck.data.activeCount === 9 && rushCheck.data.rushLevel === 'Medium', '9 active orders => Rush Level is "Medium" (Boundary check)');

    // Test with 10 active orders -> Rush should be High
    await request('POST', '/api/staff/demo/seed-rush', { count: 10 }, authHeaders);
    rushCheck = await request('GET', '/api/staff/orders/active', null, authHeaders);
    assert(rushCheck.data.activeCount === 10 && rushCheck.data.rushLevel === 'High', '10 active orders => Rush Level is "High" (Boundary check)');

    // Test with 15 active orders -> Rush should be High
    await request('POST', '/api/staff/demo/seed-rush', { count: 15 }, authHeaders);
    rushCheck = await request('GET', '/api/staff/orders/active', null, authHeaders);
    assert(rushCheck.data.activeCount === 15 && rushCheck.data.rushLevel === 'High', '15 active orders => Rush Level is "High"');

    // ----------------------------------------------------
    // TEST SUITE 7: Menu Availability Toggling
    // ----------------------------------------------------
    console.log('\nTest Suite 7: Menu Availability Toggling');
    
    // Make Veg Sandwich unavailable
    const toggleOff = await request('PATCH', `/api/staff/menu/${sandwich.id}/availability`, { available: false }, authHeaders);
    assert(toggleOff.status === 200 && toggleOff.data.item.available === false, 'Staff marked Veg Sandwich unavailable');

    // Attempt to order Veg Sandwich now -> must be rejected!
    const tryOrderSandwich = await request('POST', '/api/orders', {
      items: [{ itemId: sandwich.id, quantity: 1 }]
    });
    assert(tryOrderSandwich.status === 409 && tryOrderSandwich.data.error.code === 'ITEM_UNAVAILABLE', 'Now unavailable Veg Sandwich is rejected with ITEM_UNAVAILABLE');

    // Make Veg Sandwich available again
    const toggleOn = await request('PATCH', `/api/staff/menu/${sandwich.id}/availability`, { available: true }, authHeaders);
    assert(toggleOn.status === 200 && toggleOn.data.item.available === true, 'Staff marked Veg Sandwich available again');

    // Order should succeed now!
    const orderAgain = await request('POST', '/api/orders', {
      items: [{ itemId: sandwich.id, quantity: 1 }]
    });
    assert(orderAgain.status === 201, 'Order succeeds now that Veg Sandwich is available again');
    const orderAgainNum = orderAgain.data.order ? orderAgain.data.order.orderNumber : '';
    assert(/^101\/\d{4}$/.test(orderAgainNum), `Order placement after toggling availability receives sequential ID ${orderAgainNum} (101/MMYY)`);

    // ----------------------------------------------------
    // TEST SUITE 8: Sequential Order ID & Concurrency Safety
    // ----------------------------------------------------
    console.log('\nTest Suite 8: Sequential Order ID & Concurrency Safety');
    const order2Res = await request('POST', '/api/orders', {
      items: [{ itemId: sandwich.id, quantity: 1 }]
    });
    const order3Res = await request('POST', '/api/orders', {
      items: [{ itemId: sandwich.id, quantity: 1 }]
    });
    const num2 = order2Res.data.order ? order2Res.data.order.orderNumber : '';
    const num3 = order3Res.data.order ? order3Res.data.order.orderNumber : '';
    assert(/^102\/\d{4}$/.test(num2), `Next order has sequential ID ${num2} (102/MMYY)`);
    assert(/^103\/\d{4}$/.test(num3), `Next order has sequential ID ${num3} (103/MMYY)`);

    // Concurrency test: place 5 orders in parallel
    const concurrentPromises = Array.from({ length: 5 }, () => 
      request('POST', '/api/orders', { items: [{ itemId: sandwich.id, quantity: 1 }] })
    );
    const concurrentResults = await Promise.all(concurrentPromises);
    const concurrentIds = concurrentResults.map(r => r.data.order?.orderNumber);
    const uniqueIds = new Set(concurrentIds);
    assert(uniqueIds.size === 5, `Concurrent orders produced 5 distinct sequential IDs: ${concurrentIds.join(', ')}`);
    assert(concurrentIds.every(id => /^\d+\/\d{4}$/.test(id)), 'All concurrent IDs match format SEQUENCE/MMYY');

    // ----------------------------------------------------
    // TEST SUMMARY
    // ----------------------------------------------------
    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('====================================================');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
}

runTests();
