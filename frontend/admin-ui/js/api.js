/**
 * api.js - Frontend API Service & Contract Adapter
 * 
 * Seamlessly connects Student UI and Admin Dashboard to the Express/Node.js backend,
 * supporting both local development (http://localhost:5000/api) and production deployments
 * on Render (backend) and Vercel (frontend).
 */

const isNodeEnv = typeof window === 'undefined';

// Determine Base API URL dynamically
function resolveApiBaseUrl() {
  if (isNodeEnv) {
    return 'http://localhost:5000/api';
  }

  // 1. URL search parameter override (e.g. ?backend=https://your-backend.onrender.com/api)
  try {
    const params = new URLSearchParams(window.location.search);
    const paramUrl = params.get('backend') || params.get('api');
    if (paramUrl) {
      localStorage.setItem('codespark_api_base_url', paramUrl.replace(/\/+$/, ''));
      return paramUrl.replace(/\/+$/, '');
    }
  } catch (e) {}

  // 2. LocalStorage override
  try {
    const saved = localStorage.getItem('codespark_api_base_url');
    if (saved) return saved.replace(/\/+$/, '');
  } catch (e) {}

  // 3. Global window config if provided
  if (window.__CANTEEN_API_BASE_URL__) {
    return window.__CANTEEN_API_BASE_URL__.replace(/\/+$/, '');
  }

  // 4. Default based on host (localhost dev vs Render production)
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal) {
    return 'http://localhost:5000/api';
  }

  // Production Render default (or fallback to relative /api if proxied)
  return 'https://smart-canteen-backend-gd1j.onrender.com/api';
}

export const API_CONFIG = {
  BASE_URL: resolveApiBaseUrl(),
  // In Node test runner, keep mock active. In browser, connect to real backend by default!
  USE_MOCK: isNodeEnv,
  STAFF_TOKEN: 'codespark-staff-secret-2026',
  REQUEST_TIMEOUT_MS: 8000
};

// Default Initial Menu Data (conforming to API_CONTRACT.md GET /menu)
export const INITIAL_MENU_ITEMS = [
  {
    id: "item_101",
    name: "Veg Grilled Sandwich",
    description: "Crispy grilled bread packed with garden fresh veggies and house herbs",
    price: 50,
    available: true,
    category: "Snacks",
    image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "item_102",
    name: "Paneer Cheese Burger",
    description: "Tender spiced paneer patty with cheddar cheese and fresh lettuce",
    price: 85,
    available: true,
    category: "Burgers",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "item_103",
    name: "Masala Dosa",
    description: "Golden crispy crepe filled with tempered spiced potato smash & coconut chutney",
    price: 60,
    available: true,
    category: "South Indian",
    image: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "item_104",
    name: "Cold Coffee Shake",
    description: "Thick chilled brewed espresso blend with rich cream and chocolate drizzle",
    price: 45,
    available: true,
    category: "Beverages",
    image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "item_105",
    name: "Samosa Chaat",
    description: "Two crushed crisp samosas topped with tangy chole, curd and mint chutney",
    price: 40,
    available: false, // Intentionally marked unavailable for test
    category: "Snacks",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "item_106",
    name: "Hakka Noodles",
    description: "Wok-tossed noodles with shredded cabbage, bell peppers and spring onions",
    price: 75,
    available: true,
    category: "Chinese",
    image: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=60"
  }
];

export const INITIAL_MOCK_ORDERS = [
  {
    orderNumber: "ORD-1001",
    status: "Preparing",
    items: [
      { itemId: "item_101", name: "Veg Grilled Sandwich", price: 50, quantity: 2, subtotal: 100 }
    ],
    total: 100,
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString()
  },
  {
    orderNumber: "ORD-1002",
    status: "New",
    items: [
      { itemId: "item_104", name: "Cold Coffee Shake", price: 45, quantity: 1, subtotal: 45 }
    ],
    total: 45,
    createdAt: new Date(Date.now() - 1000 * 60 * 6).toISOString()
  },
  {
    orderNumber: "ORD-1003",
    status: "Ready",
    items: [
      { itemId: "item_102", name: "Paneer Cheese Burger", price: 85, quantity: 1, subtotal: 85 }
    ],
    total: 85,
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString()
  },
  {
    orderNumber: "ORD-1000",
    status: "Collected",
    items: [
      { itemId: "item_103", name: "Masala Dosa", price: 60, quantity: 1, subtotal: 60 }
    ],
    total: 60,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString()
  }
];

const STORAGE_KEYS = {
  MENU: 'codespark_menu_cache_v1',
  ORDERS: 'codespark_orders_cache_v1',
  MY_ORDERS: 'codespark_my_order_numbers_v1'
};

function initializeMockDb() {
  if (typeof localStorage !== 'undefined') {
    if (!localStorage.getItem(STORAGE_KEYS.MENU)) {
      localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(INITIAL_MENU_ITEMS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_MOCK_ORDERS));
    }
  }
}

initializeMockDb();

/**
 * Calculates rush level based on active order count.
 * Rules:
 *  - Low: 0-4 active orders
 *  - Medium: 5-9 active orders
 *  - High: 10+ active orders
 * Active order = any status !== 'Collected'
 */
export function calculateRush(orders) {
  const activeOrders = Array.isArray(orders) 
    ? orders.filter(o => o.status !== 'Collected') 
    : [];
  const activeCount = activeOrders.length;
  let rushLevel = 'Low';

  if (activeCount >= 10) {
    rushLevel = 'High';
  } else if (activeCount >= 5) {
    rushLevel = 'Medium';
  } else {
    rushLevel = 'Low';
  }

  return { activeCount, rushLevel };
}

// Helper: Fetch with timeout
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = API_CONFIG.REQUEST_TIMEOUT_MS } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

// Helper: Staff Auth Headers
function getStaffHeaders() {
  const token = (typeof localStorage !== 'undefined' && localStorage.getItem('codespark_staff_token')) 
    || API_CONFIG.STAFF_TOKEN;
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Staff-Token': token
  };
}

/**
 * API Client Object
 */
export const Api = {
  setBaseUrl(url) {
    API_CONFIG.BASE_URL = url.replace(/\/+$/, '');
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('codespark_api_base_url', API_CONFIG.BASE_URL);
    }
  },

  getBaseUrl() {
    return API_CONFIG.BASE_URL;
  },

  /**
   * GET /api/menu
   */
  async getMenu() {
    if (API_CONFIG.USE_MOCK) {
      const raw = localStorage.getItem(STORAGE_KEYS.MENU);
      const items = raw ? JSON.parse(raw) : INITIAL_MENU_ITEMS;
      return { items };
    }

    try {
      const res = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/menu`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Failed to fetch menu (HTTP ${res.status})`);
      }
      return await res.json();
    } catch (err) {
      // In browser, if backend is temporarily unreachable, fallback to cached menu
      console.warn('Backend /menu unreachable, reading local cache:', err.message);
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.MENU) : null;
      const items = raw ? JSON.parse(raw) : INITIAL_MENU_ITEMS;
      return { items };
    }
  },

  /**
   * POST /api/orders
   */
  async placeOrder(orderPayload) {
    if (!orderPayload || !Array.isArray(orderPayload.items) || orderPayload.items.length === 0) {
      throw new Error("Order payload must contain at least one item.");
    }

    if (API_CONFIG.USE_MOCK) {
      await new Promise(r => setTimeout(r, 60));
      const menuRaw = localStorage.getItem(STORAGE_KEYS.MENU);
      const menu = menuRaw ? JSON.parse(menuRaw) : INITIAL_MENU_ITEMS;
      const menuMap = new Map(menu.map(i => [i.id, i]));

      const validatedItems = [];
      let total = 0;

      for (const itemReq of orderPayload.items) {
        const menuItem = menuMap.get(itemReq.itemId);
        if (!menuItem) {
          throw new Error(`Item ${itemReq.itemId} not found in canteen menu.`);
        }
        if (!menuItem.available) {
          const err = new Error(`Item "${menuItem.name}" is currently sold out and unavailable.`);
          err.code = "ITEM_UNAVAILABLE";
          throw err;
        }
        if (typeof itemReq.quantity !== 'number' || itemReq.quantity <= 0) {
          throw new Error(`Invalid quantity for item "${menuItem.name}".`);
        }

        const subtotal = menuItem.price * itemReq.quantity;
        total += subtotal;

        validatedItems.push({
          itemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: itemReq.quantity,
          subtotal
        });
      }

      const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
      const allOrders = ordersRaw ? JSON.parse(ordersRaw) : [];
      const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

      const newOrder = {
        orderNumber,
        status: "New",
        items: validatedItems,
        total,
        createdAt: new Date().toISOString()
      };

      allOrders.unshift(newOrder);
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(allOrders));
      Api.rememberMyOrder(orderNumber);

      return { order: newOrder };
    }

    const res = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const err = new Error(errData?.error?.message || `Failed to place order (HTTP ${res.status})`);
      err.code = errData?.error?.code;
      throw err;
    }

    const data = await res.json();
    if (data.order && data.order.orderNumber) {
      Api.rememberMyOrder(data.order.orderNumber);
    }
    return data;
  },

  /**
   * GET /api/orders/:orderNumber
   */
  async getOrder(orderNumber) {
    if (!orderNumber) throw new Error("Order number is required");

    if (API_CONFIG.USE_MOCK) {
      const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
      const allOrders = ordersRaw ? JSON.parse(ordersRaw) : [];
      const found = allOrders.find(o => o.orderNumber.toUpperCase() === orderNumber.toUpperCase());
      if (!found) {
        const err = new Error(`Order ${orderNumber} not found.`);
        err.code = 'ORDER_NOT_FOUND';
        throw err;
      }
      return { order: found };
    }

    const res = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/orders/${encodeURIComponent(orderNumber)}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const err = new Error(errData?.error?.message || `Order not found (HTTP ${res.status})`);
      err.code = errData?.error?.code;
      throw err;
    }
    return await res.json();
  },

  /**
   * GET /api/rush (Public rush and active orders count)
   */
  async getRushInfo() {
    if (API_CONFIG.USE_MOCK) {
      const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
      const allOrders = ordersRaw ? JSON.parse(ordersRaw) : [];
      return calculateRush(allOrders);
    }

    try {
      const res = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/rush`);
      if (res && res.ok) {
        const data = await res.json();
        return {
          activeCount: data.activeCount || 0,
          rushLevel: data.rushLevel || 'Low',
          orders: data.orders || []
        };
      }
    } catch (e) {
      console.warn('Backend /rush unreachable, calculating locally:', e.message);
    }

    const ordersRaw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.ORDERS) : null;
    const allOrders = ordersRaw ? JSON.parse(ordersRaw) : [];
    return calculateRush(allOrders);
  },

  /**
   * GET /api/staff/orders/active (Staff Active Orders & Rush)
   */
  async getActiveOrders() {
    if (API_CONFIG.USE_MOCK) {
      const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
      const allOrders = ordersRaw ? JSON.parse(ordersRaw) : [];
      const activeOrders = allOrders.filter(o => o.status !== 'Collected');
      const rush = calculateRush(allOrders);
      return {
        orders: activeOrders,
        activeCount: rush.activeCount,
        rushLevel: rush.rushLevel
      };
    }

    const res = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/staff/orders/active`, {
      headers: getStaffHeaders()
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to fetch active orders (HTTP ${res.status})`);
    }

    return await res.json();
  },

  /**
   * PATCH /api/staff/orders/:orderNumber/status
   */
  async updateOrderStatus(orderNumber, status) {
    if (API_CONFIG.USE_MOCK) {
      this._mockSetOrderStatus(orderNumber, status);
      return { order: { orderNumber, status } };
    }

    const res = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/staff/orders/${encodeURIComponent(orderNumber)}/status`, {
      method: 'PATCH',
      headers: getStaffHeaders(),
      body: JSON.stringify({ status })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to update order status (HTTP ${res.status})`);
    }

    return await res.json();
  },

  /**
   * PATCH /api/staff/menu/:itemId/availability
   */
  async setItemAvailability(itemId, available) {
    if (API_CONFIG.USE_MOCK) {
      this._mockSetItemAvailability(itemId, available);
      return { item: { id: itemId, available } };
    }

    const res = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/staff/menu/${encodeURIComponent(itemId)}/availability`, {
      method: 'PATCH',
      headers: getStaffHeaders(),
      body: JSON.stringify({ available })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to update availability (HTTP ${res.status})`);
    }

    return await res.json();
  },

  /**
   * POST /api/staff/menu
   */
  async addMenuItem(itemData) {
    if (!itemData || !itemData.name || typeof itemData.price !== 'number') {
      throw new Error("Item name and numeric price are required.");
    }

    if (API_CONFIG.USE_MOCK) {
      const raw = localStorage.getItem(STORAGE_KEYS.MENU);
      const items = raw ? JSON.parse(raw) : INITIAL_MENU_ITEMS;

      const newItem = {
        id: `item_${Date.now()}`,
        name: itemData.name.trim(),
        description: (itemData.description || '').trim(),
        price: Math.max(0, itemData.price),
        category: (itemData.category || 'Snacks').trim(),
        available: Boolean(itemData.available !== false),
        image: itemData.image || ''
      };

      items.push(newItem);
      localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(items));
      return { item: newItem };
    }

    const res = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/staff/menu`, {
      method: 'POST',
      headers: getStaffHeaders(),
      body: JSON.stringify(itemData)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'Failed to add food item');
    }

    return await res.json();
  },

  /**
   * DELETE /api/staff/menu/:itemId
   */
  async removeMenuItem(itemId) {
    if (!itemId) throw new Error("Item ID is required");

    if (API_CONFIG.USE_MOCK) {
      const raw = localStorage.getItem(STORAGE_KEYS.MENU);
      const items = raw ? JSON.parse(raw) : INITIAL_MENU_ITEMS;
      const filtered = items.filter(i => i.id !== itemId);
      localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(filtered));
      return { success: true };
    }

    const res = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/staff/menu/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
      headers: getStaffHeaders()
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'Failed to remove food item');
    }

    return await res.json();
  },

  /**
   * Local history tracking
   */
  rememberMyOrder(orderNumber) {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.MY_ORDERS) || '[]');
      if (!existing.includes(orderNumber)) {
        existing.unshift(orderNumber);
        localStorage.setItem(STORAGE_KEYS.MY_ORDERS, JSON.stringify(existing));
      }
    } catch (e) {
      console.warn("Could not save order number to local history:", e);
    }
  },

  getMyOrderNumbers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.MY_ORDERS) || '[]');
    } catch (e) {
      return [];
    }
  },

  /**
   * Mock & Test helpers
   */
  _mockSetOrderStatus(orderNumber, newStatus) {
    if (typeof localStorage === 'undefined') return;
    const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    const allOrders = ordersRaw ? JSON.parse(ordersRaw) : [];
    const idx = allOrders.findIndex(o => o.orderNumber === orderNumber);
    if (idx !== -1) {
      allOrders[idx].status = newStatus;
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(allOrders));
    }
  },

  _mockSetItemAvailability(itemId, available) {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEYS.MENU);
    const items = raw ? JSON.parse(raw) : INITIAL_MENU_ITEMS;
    const item = items.find(i => i.id === itemId);
    if (item) {
      item.available = available;
      localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(items));
    }
  },

  _mockSetActiveOrderCount(count) {
    if (typeof localStorage === 'undefined') return;
    const list = [];
    for (let i = 1; i <= count; i++) {
      list.push({
        orderNumber: `ORD-TEST-${1000 + i}`,
        status: i % 3 === 0 ? "Ready" : i % 2 === 0 ? "Preparing" : "New",
        items: [{ itemId: "item_101", name: "Veg Sandwich", price: 50, quantity: 1, subtotal: 50 }],
        total: 50,
        createdAt: new Date().toISOString()
      });
    }
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(list));
  }
};
