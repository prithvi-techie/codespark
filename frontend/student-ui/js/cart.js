/**
 * cart.js - Shopping Cart state and management for Student UI
 */

const CART_STORAGE_KEY = 'codespark_student_cart_v1';

class CartStore {
  constructor() {
    this.items = []; // Array of { id, name, price, quantity, available, image }
    this.listeners = new Set();
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const data = localStorage.getItem(CART_STORAGE_KEY);
      if (data) {
        this.items = JSON.parse(data);
      }
    } catch (e) {
      console.warn("Could not load cart from storage:", e);
      this.items = [];
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
    } catch (e) {
      console.warn("Could not save cart to storage:", e);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this);
    }
  }

  /**
   * Adds an item to the cart or increments its quantity.
   * Prevents adding unavailable items.
   */
  addItem(product) {
    if (!product || !product.available) {
      return { success: false, reason: "Item is currently unavailable" };
    }

    const existing = this.items.find(i => i.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        available: product.available,
        image: product.image || ''
      });
    }

    this.saveToStorage();
    return { success: true };
  }

  /**
   * Updates an item's quantity.
   * If quantity <= 0, item is removed.
   */
  updateQuantity(productId, quantity) {
    const idx = this.items.findIndex(i => i.id === productId);
    if (idx === -1) return;

    if (quantity <= 0) {
      this.items.splice(idx, 1);
    } else {
      this.items[idx].quantity = Math.floor(quantity);
    }

    this.saveToStorage();
  }

  /**
   * Decrements quantity of an item
   */
  decrementItem(productId) {
    const existing = this.items.find(i => i.id === productId);
    if (!existing) return;
    this.updateQuantity(productId, existing.quantity - 1);
  }

  /**
   * Increments quantity of an item (if available)
   */
  incrementItem(productId) {
    const existing = this.items.find(i => i.id === productId);
    if (!existing) return;
    if (!existing.available) return;
    this.updateQuantity(productId, existing.quantity + 1);
  }

  /**
   * Removes an item completely
   */
  removeItem(productId) {
    this.items = this.items.filter(i => i.id !== productId);
    this.saveToStorage();
  }

  /**
   * Empties cart
   */
  clear() {
    this.items = [];
    this.saveToStorage();
  }

  /**
   * Synchronizes cart availability state against freshly loaded menu data
   * Returns list of items that became unavailable
   */
  syncWithMenu(menuItems) {
    const menuMap = new Map(menuItems.map(m => [m.id, m]));
    const newlyUnavailable = [];

    for (const item of this.items) {
      const live = menuMap.get(item.id);
      if (live) {
        // Update price & availability snapshot
        item.price = live.price;
        if (item.available && !live.available) {
          item.available = false;
          newlyUnavailable.push(item);
        } else {
          item.available = live.available;
        }
      }
    }

    this.saveToStorage();
    return newlyUnavailable;
  }

  /**
   * Checks if cart has any item that is now unavailable
   */
  hasUnavailableItems() {
    return this.items.some(i => !i.available);
  }

  getUnavailableItems() {
    return this.items.filter(i => !i.available);
  }

  getItemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getQuantityOf(productId) {
    const item = this.items.find(i => i.id === productId);
    return item ? item.quantity : 0;
  }

  getSubtotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  getTotal() {
    // No taxes or fees for canteen orders, provisional total = subtotal
    return this.getSubtotal();
  }

  isEmpty() {
    return this.items.length === 0;
  }

  toOrderPayload() {
    return {
      items: this.items.map(i => ({
        itemId: i.id,
        quantity: i.quantity
      }))
    };
  }
}

export const Cart = new CartStore();
