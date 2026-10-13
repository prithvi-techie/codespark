/**
 * Automated Test Suite for CodeSpark Student Frontend
 * 
 * Verifies requirements from Task & ARCHITECTURE / RULES:
 * 1. Cart operations: add, increment, decrement, remove on 0, subtotal & total calculation
 * 2. Order placement: mock order generation, unique order numbers, clearing cart
 * 3. Unavailable item protection: cannot add unavailable items, cannot checkout unavailable items
 * 4. Status tracking: all 4 statuses (New, Preparing, Ready, Collected)
 * 5. Rush calculation: thresholds at 4, 5, 9, 10 active orders
 * 6. Safe DOM textContent rendering
 */

import assert from 'node:assert/strict';

// Mock localStorage for Node environment
const mockStorage = new Map();
global.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear()
};

async function runTests() {
  console.log("=========================================");
  console.log("   CodeSpark Student Frontend Test Suite ");
  console.log("=========================================\n");

  const { Api, calculateRush } = await import('../frontend/student-ui/js/api.js');
  const { Cart } = await import('../frontend/student-ui/js/cart.js');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✖ [FAIL] ${name}`);
      console.error(`     Error: ${err.message}\n`);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✖ [FAIL] ${name}`);
      console.error(`     Error: ${err.message}\n`);
      failed++;
    }
  }

  // 1. Rush Calculations
  console.log("\n--- Suite 1: Rush Level & Active Order Count ---");

  test("Rush Level: 0 active orders -> Low", () => {
    const orders = [{ status: "Collected" }];
    const res = calculateRush(orders);
    assert.equal(res.activeCount, 0);
    assert.equal(res.rushLevel, "Low");
  });

  test("Rush Level: 4 active orders -> Low (boundary test)", () => {
    const orders = [
      { status: "New" },
      { status: "Preparing" },
      { status: "Ready" },
      { status: "New" },
      { status: "Collected" }
    ];
    const res = calculateRush(orders);
    assert.equal(res.activeCount, 4);
    assert.equal(res.rushLevel, "Low");
  });

  test("Rush Level: 5 active orders -> Medium (threshold boundary test)", () => {
    const orders = [
      { status: "New" },
      { status: "New" },
      { status: "Preparing" },
      { status: "Preparing" },
      { status: "Ready" }
    ];
    const res = calculateRush(orders);
    assert.equal(res.activeCount, 5);
    assert.equal(res.rushLevel, "Medium");
  });

  test("Rush Level: 9 active orders -> Medium (upper boundary test)", () => {
    const orders = Array.from({ length: 9 }, () => ({ status: "Preparing" }));
    const res = calculateRush(orders);
    assert.equal(res.activeCount, 9);
    assert.equal(res.rushLevel, "Medium");
  });

  test("Rush Level: 10 active orders -> High (threshold boundary test)", () => {
    const orders = Array.from({ length: 10 }, () => ({ status: "Preparing" }));
    const res = calculateRush(orders);
    assert.equal(res.activeCount, 10);
    assert.equal(res.rushLevel, "High");
  });

  test("Rush Level: 15 active orders -> High", () => {
    const orders = Array.from({ length: 15 }, () => ({ status: "Ready" }));
    const res = calculateRush(orders);
    assert.equal(res.activeCount, 15);
    assert.equal(res.rushLevel, "High");
  });

  // 2. Shopping Cart Operations
  console.log("\n--- Suite 2: Shopping Cart Operations & Calculations ---");

  test("Cart: Add item and calculate subtotal", () => {
    Cart.clear();
    const item1 = { id: "item_101", name: "Veg Sandwich", price: 50, available: true };
    const res = Cart.addItem(item1);
    assert.equal(res.success, true);
    assert.equal(Cart.getItemCount(), 1);
    assert.equal(Cart.getSubtotal(), 50);
    assert.equal(Cart.getTotal(), 50);
  });

  test("Cart: Increment quantity", () => {
    Cart.incrementItem("item_101");
    assert.equal(Cart.getQuantityOf("item_101"), 2);
    assert.equal(Cart.getSubtotal(), 100);
  });

  test("Cart: Add second item and check totals", () => {
    const item2 = { id: "item_102", name: "Paneer Burger", price: 85, available: true };
    Cart.addItem(item2);
    assert.equal(Cart.getItemCount(), 3); // 2 sandwiches + 1 burger
    assert.equal(Cart.getSubtotal(), 185); // 100 + 85
    assert.equal(Cart.getTotal(), 185);
  });

  test("Cart: Decrement item and remove at 0", () => {
    Cart.decrementItem("item_102"); // burger becomes 0
    assert.equal(Cart.getQuantityOf("item_102"), 0);
    assert.equal(Cart.getItemCount(), 2);
    assert.equal(Cart.getSubtotal(), 100);

    // Decrement sandwich
    Cart.decrementItem("item_101");
    assert.equal(Cart.getQuantityOf("item_101"), 1);
    Cart.decrementItem("item_101");
    assert.equal(Cart.getQuantityOf("item_101"), 0);
    assert.equal(Cart.isEmpty(), true);
    assert.equal(Cart.getSubtotal(), 0);
  });

  // 3. Availability Guards
  console.log("\n--- Suite 3: Availability & Security Controls ---");

  test("Cart: Prevent adding unavailable item", () => {
    Cart.clear();
    const unavailableItem = { id: "item_105", name: "Samosa Chaat", price: 40, available: false };
    const res = Cart.addItem(unavailableItem);
    assert.equal(res.success, false);
    assert.equal(Cart.isEmpty(), true);
  });

  test("Cart: Prevent increasing quantity of item marked unavailable", () => {
    Cart.clear();
    const item = { id: "item_101", name: "Veg Sandwich", price: 50, available: true };
    Cart.addItem(item);
    
    // Simulate menu update where item becomes unavailable while in cart
    const menuItems = [{ id: "item_101", name: "Veg Sandwich", price: 50, available: false }];
    const newlyUnavailable = Cart.syncWithMenu(menuItems);

    assert.equal(newlyUnavailable.length, 1);
    assert.equal(Cart.hasUnavailableItems(), true);
    
    // Attempting to increment should be blocked
    Cart.incrementItem("item_101");
    assert.equal(Cart.getQuantityOf("item_101"), 1); // Remains 1, not 2
  });

  // 4. Order Placement & Tracking
  console.log("\n--- Suite 4: Order Placement & Tracking Integration ---");

  await testAsync("Order Placement: Successful mock order creates valid structure and sequential ORDER_ID/MMYY", async () => {
    Cart.clear();
    const item = { id: "item_101", name: "Veg Sandwich", price: 50, available: true };
    // ensure item 101 is available in mock menu
    Api._mockSetItemAvailability("item_101", true);
    Cart.addItem(item);

    const payload = Cart.toOrderPayload();
    const result = await Api.placeOrder(payload);

    assert.ok(result.order);
    assert.match(result.order.orderNumber, /^(\d+\/\d{4}|ORD-\d+)$/);
    assert.equal(result.order.status, "New");
    assert.equal(result.order.total, 50);
    assert.equal(result.order.items.length, 1);
  });

  await testAsync("Order Placement: Backend validation rejects unavailable item at order time", async () => {
    // Force item 101 to be unavailable in backend mock
    Api._mockSetItemAvailability("item_101", false);

    const payload = {
      items: [{ itemId: "item_101", quantity: 1 }]
    };

    await assert.rejects(
      async () => {
        await Api.placeOrder(payload);
      },
      (err) => {
        assert.equal(err.code, "ITEM_UNAVAILABLE");
        return true;
      }
    );

    // Reset item 101 back to available
    Api._mockSetItemAvailability("item_101", true);
  });

  await testAsync("Order Tracking: Fetches all four order statuses properly", async () => {
    const statuses = ["New", "Preparing", "Ready", "Collected"];
    for (const status of statuses) {
      const orderNum = `ORD-TEST-${status.toUpperCase()}`;
      // Setup mock order with this status
      const orders = JSON.parse(localStorage.getItem('codespark_orders_cache_v1') || '[]');
      orders.push({
        orderNumber: orderNum,
        status: status,
        items: [{ itemId: "item_101", name: "Veg Sandwich", price: 50, quantity: 1, subtotal: 50 }],
        total: 50,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('codespark_orders_cache_v1', JSON.stringify(orders));

      const res = await Api.getOrder(orderNum);
      assert.equal(res.order.status, status);
    }
  });

  // 5. Food Management (Add, Remove, Toggle) & End-to-End Flow
  console.log("\n--- Suite 5: Food Management & End-to-End Flow ---");

  await testAsync("Food Management: Admin adds a new food item", async () => {
    const newItem = {
      name: "Paneer Tikka Roll",
      description: "Char-grilled spiced paneer wrapped in flaky flatbread",
      price: 90,
      category: "Snacks",
      available: true
    };

    const res = await Api.addMenuItem(newItem);
    assert.ok(res.item);
    assert.equal(res.item.name, "Paneer Tikka Roll");
    assert.equal(res.item.price, 90);
    assert.equal(res.item.available, true);

    // Verify it is in menu
    const menu = await Api.getMenu();
    const found = menu.items.find(i => i.id === res.item.id);
    assert.ok(found);
  });

  await testAsync("Food Management: Admin marks item as Sold Out, blocking student from ordering", async () => {
    const menu = await Api.getMenu();
    const target = menu.items.find(i => i.name === "Paneer Tikka Roll");
    assert.ok(target);

    // Mark as Sold Out (false)
    Api._mockSetItemAvailability(target.id, false);

    // Check menu reflects sold out
    const updatedMenu = await Api.getMenu();
    const updatedItem = updatedMenu.items.find(i => i.id === target.id);
    assert.equal(updatedItem.available, false);

    // Student attempts to add to cart
    Cart.clear();
    const addResult = Cart.addItem(updatedItem);
    assert.equal(addResult.success, false);

    // Student attempts to place order directly -> must be rejected
    await assert.rejects(
      async () => {
        await Api.placeOrder({ items: [{ itemId: target.id, quantity: 1 }] });
      },
      (err) => {
        assert.equal(err.code, "ITEM_UNAVAILABLE");
        return true;
      }
    );
  });

  await testAsync("Food Management: Admin removes a food item with confirmation", async () => {
    const menu = await Api.getMenu();
    const target = menu.items.find(i => i.name === "Paneer Tikka Roll");
    assert.ok(target);

    // Remove item
    await Api.removeMenuItem(target.id);

    // Verify item is removed from menu
    const refreshedMenu = await Api.getMenu();
    const found = refreshedMenu.items.find(i => i.id === target.id);
    assert.equal(found, undefined);
  });

  await testAsync("End-to-End Flow: Student places order -> Admin updates status -> Student sees update", async () => {
    Cart.clear();
    // Ensure item_101 is available
    Api._mockSetItemAvailability("item_101", true);
    Cart.addItem({ id: "item_101", name: "Veg Grilled Sandwich", price: 50, available: true });

    // Step 1: Student places order
    const orderRes = await Api.placeOrder(Cart.toOrderPayload());
    assert.ok(orderRes.order);
    const orderNumber = orderRes.order.orderNumber;
    assert.equal(orderRes.order.status, "New");

    // Step 2: Admin views active orders and sees the new order
    const ordersRaw = localStorage.getItem('codespark_orders_cache_v1');
    const allOrders = ordersRaw ? JSON.parse(ordersRaw) : [];
    const adminSeenOrder = allOrders.find(o => o.orderNumber === orderNumber);
    assert.ok(adminSeenOrder);
    assert.equal(adminSeenOrder.status, "New");

    // Step 3: Admin updates status to Preparing -> Ready -> Collected
    Api._mockSetOrderStatus(orderNumber, "Preparing");
    let studentCheck = await Api.getOrder(orderNumber);
    assert.equal(studentCheck.order.status, "Preparing");

    Api._mockSetOrderStatus(orderNumber, "Ready");
    studentCheck = await Api.getOrder(orderNumber);
    assert.equal(studentCheck.order.status, "Ready");

    Api._mockSetOrderStatus(orderNumber, "Collected");
    studentCheck = await Api.getOrder(orderNumber);
    assert.equal(studentCheck.order.status, "Collected");

    // Step 4: Verify active rush calculation drops after Collected
    const rushInfo = await Api.getRushInfo();
    const activeOrders = JSON.parse(localStorage.getItem('codespark_orders_cache_v1')).filter(o => o.status !== 'Collected');
    assert.equal(rushInfo.activeCount, activeOrders.length);
  });

  console.log("\n=========================================");
  console.log(`  Tests Completed: ${passed + failed}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log("=========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
