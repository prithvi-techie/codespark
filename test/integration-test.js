/**
 * Full-Stack End-to-End Integration Verification Test
 * 
 * Verifies live HTTP communication between:
 * - Student UI API methods
 * - Staff / Admin UI API methods
 * - Express Backend REST endpoints & MongoDB database
 */

import assert from 'node:assert/strict';

// Mock localStorage for node environment
const mockStorage = new Map();
global.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear()
};

async function runIntegration() {
  console.log("======================================================");
  console.log("  Full End-to-End Integration Test (Student + Admin + Backend) ");
  console.log("======================================================\n");

  // 1. Import backend and start on dynamic test port
  const { app } = await import('../backend/server.js');
  const { connectDB, disconnectDB } = await import('../backend/config/db.js');
  const { seedInitialDataIfNeeded } = await import('../backend/seed.js');

  await connectDB();
  await seedInitialDataIfNeeded();

  const server = app.listen(0);
  const port = server.address().port;
  const liveBaseUrl = `http://localhost:${port}/api`;

  console.log(`Live test backend running at: ${liveBaseUrl}\n`);

  // 2. Import frontend API adapter and point it directly to the live backend!
  const { Api, calculateRush, API_CONFIG } = await import('../frontend/student-ui/js/api.js');
  Api.setBaseUrl(liveBaseUrl);
  API_CONFIG.USE_MOCK = false; // Force REAL HTTP requests to backend

  let passed = 0;
  function pass(desc) {
    console.log(`  ✔ [PASS] ${desc}`);
    passed++;
  }

  try {
    // Step 1: Student loads menu
    console.log("--- Step 1: Student loads live canteen menu ---");
    const menuRes = await Api.getMenu();
    assert.ok(Array.isArray(menuRes.items));
    assert.ok(menuRes.items.length >= 4);
    pass(`Retrieved ${menuRes.items.length} menu items from backend`);

    const sandwich = menuRes.items.find(i => i.name.includes("Sandwich") && i.available);
    const unavail = menuRes.items.find(i => !i.available);
    assert.ok(sandwich, "Found available sandwich");
    assert.ok(unavail, "Found unavailable item for testing");
    pass("Found available and unavailable menu items");

    // Step 2: Student places order
    console.log("\n--- Step 2: Student places an order ---");
    const orderPayload = {
      items: [{ itemId: sandwich.id, quantity: 2 }]
    };
    const orderRes = await Api.placeOrder(orderPayload);
    assert.ok(orderRes.order);
    assert.match(orderRes.order.orderNumber, /^(\d+\/\d{4}|ORD-\d+)$/);
    assert.equal(orderRes.order.status, "New");
    assert.equal(orderRes.order.total, sandwich.price * 2);
    const orderNumber = orderRes.order.orderNumber;
    pass(`Order created successfully: ${orderNumber} (Total: ₹${orderRes.order.total})`);

    // Step 3: Student tracks order
    console.log("\n--- Step 3: Student tracks live order ---");
    const trackRes = await Api.getOrder(orderNumber);
    assert.equal(trackRes.order.orderNumber, orderNumber);
    assert.equal(trackRes.order.status, "New");
    pass(`Order tracking verified: ${orderNumber} is "${trackRes.order.status}"`);

    // Step 4: Admin views active orders & rush level
    console.log("\n--- Step 4: Admin views active orders in Kitchen Dashboard ---");
    const staffActive = await Api.getActiveOrders();
    assert.ok(Array.isArray(staffActive.orders));
    const foundAdminOrder = staffActive.orders.find(o => o.orderNumber === orderNumber);
    assert.ok(foundAdminOrder, "Admin saw student's order in kitchen queue");
    pass(`Kitchen active count: ${staffActive.activeCount}, Rush level: "${staffActive.rushLevel}"`);

    // Step 5: Admin updates status: New -> Preparing -> Ready -> Collected
    console.log("\n--- Step 5: Admin progresses order lifecycle ---");
    await Api.updateOrderStatus(orderNumber, "Preparing");
    let checkStatus = await Api.getOrder(orderNumber);
    assert.equal(checkStatus.order.status, "Preparing");
    pass(`Order updated to Preparing`);

    await Api.updateOrderStatus(orderNumber, "Ready");
    checkStatus = await Api.getOrder(orderNumber);
    assert.equal(checkStatus.order.status, "Ready");
    pass(`Order updated to Ready`);

    await Api.updateOrderStatus(orderNumber, "Collected");
    checkStatus = await Api.getOrder(orderNumber);
    assert.equal(checkStatus.order.status, "Collected");
    pass(`Order updated to Collected`);

    // Step 6: Verify collected order is excluded from active orders
    console.log("\n--- Step 6: Verify rush updates after Collected ---");
    const staffActiveAfter = await Api.getActiveOrders();
    const stillActive = staffActiveAfter.orders.find(o => o.orderNumber === orderNumber);
    assert.equal(stillActive, undefined, "Collected order is excluded from active orders");
    pass("Collected order is excluded from active order queue");

    // Step 7: Student attempts to order unavailable item
    console.log("\n--- Step 7: Unavailable item rejection ---");
    await assert.rejects(
      async () => {
        await Api.placeOrder({ items: [{ itemId: unavail.id, quantity: 1 }] });
      },
      (err) => {
        assert.ok(err.message.includes("unavailable") || err.code === "ITEM_UNAVAILABLE");
        return true;
      }
    );
    pass("Backend safely rejected order with unavailable item");

    // Step 8: Admin marks item available, student orders, admin marks unavailable
    console.log("\n--- Step 8: Admin toggles food availability ---");
    await Api.setItemAvailability(unavail.id, true);
    const updatedMenu = await Api.getMenu();
    const itemNowAvail = updatedMenu.items.find(i => i.id === unavail.id);
    assert.equal(itemNowAvail.available, true);
    pass("Admin marked item Available");

    // Student can order it now!
    const orderNowValid = await Api.placeOrder({ items: [{ itemId: unavail.id, quantity: 1 }] });
    assert.ok(orderNowValid.order);
    pass(`Student successfully ordered newly available item (${orderNowValid.order.orderNumber})`);

    // Admin marks it Sold Out again
    await Api.setItemAvailability(unavail.id, false);
    pass("Admin marked item Sold Out again");

    // Step 9: Admin Food Management (Add & Remove item)
    console.log("\n--- Step 9: Admin adds and deletes a menu item ---");
    const newDish = await Api.addMenuItem({
      name: "Chocolate Walnut Brownie",
      description: "Warm fudgy brownie with roasted walnuts",
      price: 65,
      category: "Beverages",
      available: true
    });
    assert.ok(newDish.item && newDish.item.id);
    pass(`Admin added new food item: "${newDish.item.name}" (ID: ${newDish.item.id})`);

    const delRes = await Api.removeMenuItem(newDish.item.id);
    assert.equal(delRes.success, true);
    pass("Admin deleted food item successfully");

    console.log("\n======================================================");
    console.log(`  ALL ${passed} INTEGRATION CHECKS PASSED PERFECTLY!`);
    console.log("======================================================\n");
  } finally {
    server.close();
    await disconnectDB();
  }
}

runIntegration().catch(err => {
  console.error("Integration test failed:", err);
  process.exit(1);
});
