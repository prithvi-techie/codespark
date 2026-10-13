/**
 * app.js - Main Controller for Student Canteen UI
 */

import { Api, calculateRush } from './api.js';
import { Cart } from './cart.js';
import { MenuRenderer } from './menu.js';
import { OrdersManager } from './orders.js';

class StudentApp {
  constructor() {
    this.menuItems = [];
    this.menuRenderer = null;
    this.ordersManager = null;
    this.currentOrderSuccess = null;
  }

  async init() {
    this.setupElements();
    this.setupTabs();
    this.setupCartUI();
    this.setupOrderModal();

    // Initialize Order Tracker (Strictly Read-Only)
    this.ordersManager = new OrdersManager(
      document.getElementById('orders-list-container'),
      () => this.refreshRushDisplay()
    );
    this.ordersManager.init();

    // Initialize Menu Renderer
    this.menuRenderer = new MenuRenderer(
      document.getElementById('menu-grid'),
      (item) => this.handleAddToCart(item)
    );

    // Setup Category Filter Chips
    this.setupCategoryFilters();

    // Fetch initial menu & rush info
    await this.loadMenu();
    await this.refreshRushDisplay();

    // Auto-refresh menu and rush every 4 seconds to sync live admin updates
    this.refreshTimer = setInterval(() => {
      this.loadMenu();
      this.refreshRushDisplay();
    }, 4000);

    // Subscribe Cart changes to re-render cart sidebar and sync menu cards
    Cart.subscribe(() => {
      this.renderCart();
      if (this.menuRenderer) {
        this.menuRenderer.render();
      }
    });

    this.renderCart();
  }

  setupElements() {
    this.elements = {
      menuGrid: document.getElementById('menu-grid'),
      cartItemsList: document.getElementById('cart-items-list'),
      cartSubtotal: document.getElementById('cart-subtotal'),
      cartTotal: document.getElementById('cart-total'),
      cartCountBadge: document.getElementById('cart-count-badge'),
      cartItemsCount: document.getElementById('cart-items-count'),
      btnCheckout: document.getElementById('btn-checkout'),
      btnClearCart: document.getElementById('btn-clear-cart'),
      rushLevelBadge: document.getElementById('rush-level-badge'),
      rushTextNav: document.getElementById('rush-text-nav'),
      rushLevelHero: document.getElementById('rush-level-hero'),
      rushCountHero: document.getElementById('rush-count-hero'),
      toastContainer: document.getElementById('toast-container'),
      orderModal: document.getElementById('order-confirmation-modal'),
      modalOrderNumber: document.getElementById('modal-order-number'),
      modalOrderTotal: document.getElementById('modal-order-total'),
      modalItemsSummary: document.getElementById('modal-items-summary'),
      btnModalTrack: document.getElementById('btn-modal-track'),
      btnModalClose: document.getElementById('btn-modal-close'),
      categoryChips: document.querySelectorAll('.category-chip'),
      // Floating corner cart and popup modal
      floatingCartBtn: document.getElementById('floating-cart-btn'),
      floatingCartCount: document.getElementById('floating-cart-count'),
      cartPopupModal: document.getElementById('cart-popup-modal'),
      btnCloseCartPopup: document.getElementById('btn-close-cart-popup'),
      cartPopupItemsCount: document.getElementById('cart-popup-items-count'),
      cartPopupItemsList: document.getElementById('cart-popup-items-list'),
      cartPopupSubtotal: document.getElementById('cart-popup-subtotal'),
      cartPopupTotal: document.getElementById('cart-popup-total'),
      btnPopupCheckout: document.getElementById('btn-popup-checkout')
    };

    const brandHome = document.getElementById('brand-home-link');
    if (brandHome) {
      brandHome.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Floating corner cart popup events
    if (this.elements.floatingCartBtn) {
      this.elements.floatingCartBtn.addEventListener('click', () => {
        this.openCartPopup();
      });
    }

    if (this.elements.btnCloseCartPopup) {
      this.elements.btnCloseCartPopup.addEventListener('click', () => {
        this.closeCartPopup();
      });
    }

    if (this.elements.cartPopupModal) {
      this.elements.cartPopupModal.addEventListener('click', (e) => {
        if (e.target === this.elements.cartPopupModal) {
          this.closeCartPopup();
        }
      });
    }

    if (this.elements.btnPopupCheckout) {
      this.elements.btnPopupCheckout.addEventListener('click', () => {
        this.closeCartPopup();
        this.handleCheckout();
      });
    }
  }

  setupTabs() {
    const navButtons = document.querySelectorAll('.nav-btn[data-tab]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });
  }

  switchTab(tabName) {
    document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(section => {
      section.classList.toggle('active', section.id === `tab-${tabName}`);
    });

    // If switching to orders tab, refresh active orders
    if (tabName === 'orders' && this.ordersManager) {
      this.ordersManager.refreshActiveOrders();
    }
  }

  setupCategoryFilters() {
    this.elements.categoryChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.elements.categoryChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const category = chip.getAttribute('data-category');
        if (this.menuRenderer) {
          this.menuRenderer.filterByCategory(category);
        }
      });
    });
  }

  async loadMenu() {
    try {
      const data = await Api.getMenu();
      this.menuItems = data.items || [];
      if (this.menuRenderer) {
        this.menuRenderer.setItems(this.menuItems);
      }

      // Check if any item in student's current cart has become unavailable
      const newlyUnavailable = Cart.syncWithMenu(this.menuItems);
      if (newlyUnavailable.length > 0) {
        const itemNames = newlyUnavailable.map(i => `"${i.name}"`).join(', ');
        this.showToast(`Notice: ${itemNames} just became unavailable and cannot be checked out.`, 'warning');
      }
    } catch (err) {
      console.error('Menu load failure:', err);
      this.showToast('Unable to load canteen menu. Please try again.', 'error');
    }
  }

  async refreshRushDisplay() {
    try {
      const rush = await Api.getRushInfo();
      this.updateRushUI(rush.activeCount, rush.rushLevel);
    } catch (err) {
      console.warn('Rush calculation error:', err);
    }
  }

  updateRushUI(activeCount, rushLevel) {
    // Header mini badge: show only rush level (High, Medium, or Low)
    if (this.elements.rushLevelBadge && this.elements.rushTextNav) {
      this.elements.rushLevelBadge.className = `rush-badge-widget rush-${rushLevel.toLowerCase()}`;
      this.elements.rushTextNav.textContent = `${rushLevel} Rush`;
    }

    // Hero banner rush display: show only rush level (High, Medium, or Low)
    if (this.elements.rushLevelHero) {
      this.elements.rushLevelHero.textContent = `${rushLevel} Rush`;
      this.elements.rushLevelHero.style.color =
        rushLevel === 'High' ? 'var(--rush-high)' :
        rushLevel === 'Medium' ? 'var(--rush-medium)' : 'var(--rush-low)';
    }
    if (this.elements.rushCountHero) {
      this.elements.rushCountHero.style.display = 'none';
      this.elements.rushCountHero.textContent = '';
    }
  }

  handleAddToCart(item) {
    if (!item.available) {
      this.showToast(`"${item.name}" is currently sold out and cannot be added.`, 'error');
      return;
    }
    const result = Cart.addItem(item);
    if (result.success) {
      this.showToast(`Added ${item.name} to cart`, 'success');
    } else {
      this.showToast(result.reason, 'error');
    }
  }

  setupCartUI() {
    if (this.elements.btnClearCart) {
      this.elements.btnClearCart.addEventListener('click', () => {
        if (Cart.isEmpty()) return;
        if (confirm("Are you sure you want to clear your cart?")) {
          Cart.clear();
          this.showToast("Cart cleared", "info");
        }
      });
    }

    if (this.elements.btnCheckout) {
      this.elements.btnCheckout.addEventListener('click', () => {
        this.handleCheckout();
      });
    }
  }

  renderCart() {
    const items = Cart.items;
    const totalCount = Cart.getItemCount();
    const subtotal = Cart.getSubtotal();
    const total = Cart.getTotal();

    // Update Badges & Counters (Nav badge + Floating Corner badge)
    if (this.elements.cartCountBadge) {
      this.elements.cartCountBadge.textContent = totalCount;
      this.elements.cartCountBadge.style.display = totalCount > 0 ? 'inline-block' : 'none';
    }
    if (this.elements.floatingCartCount) {
      this.elements.floatingCartCount.textContent = totalCount;
      this.elements.floatingCartCount.style.display = totalCount > 0 ? 'flex' : 'none';
    }
    if (this.elements.cartItemsCount) {
      this.elements.cartItemsCount.textContent = `(${totalCount})`;
    }
    if (this.elements.cartPopupItemsCount) {
      this.elements.cartPopupItemsCount.textContent = `(${totalCount})`;
    }
    if (this.elements.cartSubtotal) {
      this.elements.cartSubtotal.textContent = `₹${subtotal}`;
    }
    if (this.elements.cartPopupSubtotal) {
      this.elements.cartPopupSubtotal.textContent = `₹${subtotal}`;
    }
    if (this.elements.cartTotal) {
      this.elements.cartTotal.textContent = `₹${total}`;
    }
    if (this.elements.cartPopupTotal) {
      this.elements.cartPopupTotal.textContent = `₹${total}`;
    }

    // Checkout button state for main page cart
    const hasUnavailable = Cart.hasUnavailableItems();
    const updateCheckoutBtn = (btn) => {
      if (!btn) return;
      if (Cart.isEmpty()) {
        btn.disabled = true;
        btn.textContent = "Cart is Empty";
      } else if (hasUnavailable) {
        btn.disabled = true;
        btn.textContent = "Remove Sold Out Items";
      } else {
        btn.disabled = false;
        btn.textContent = `Place Order • ₹${total}`;
      }
    };

    updateCheckoutBtn(this.elements.btnCheckout);
    updateCheckoutBtn(this.elements.btnPopupCheckout);

    // Render items list in both containers if present
    const containers = [this.elements.cartItemsList, this.elements.cartPopupItemsList].filter(Boolean);
    containers.forEach(container => {
      this.renderCartItemsInto(container, items);
    });
  }

  openCartPopup() {
    if (this.elements.cartPopupModal) {
      this.elements.cartPopupModal.classList.add('active');
    }
  }

  closeCartPopup() {
    if (this.elements.cartPopupModal) {
      this.elements.cartPopupModal.classList.remove('active');
    }
  }

  renderCartItemsInto(container, items) {
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `
        <div class="cart-empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
          </svg>
          <p>Your cart is empty.</p>
          <span style="font-size:0.8rem;color:var(--text-light);">Select food items from the menu</span>
        </div>
      `;
      return;
    }

    container.innerHTML = '';

    items.forEach(item => {
      const row = document.createElement('div');
      row.className = `cart-item ${!item.available ? 'item-unavailable-alert' : ''}`;

      // Left info
      const info = document.createElement('div');
      info.className = 'cart-item-info';

      const nameEl = document.createElement('div');
      nameEl.className = 'cart-item-name';
      nameEl.textContent = item.name;

      if (!item.available) {
        const unavailTag = document.createElement('span');
        unavailTag.style.cssText = 'color:#ef4444;font-size:0.75rem;font-weight:700;margin-left:4px;';
        unavailTag.textContent = '(Sold Out)';
        nameEl.appendChild(unavailTag);
      }

      const priceUnit = document.createElement('div');
      priceUnit.className = 'cart-item-price-unit';
      priceUnit.textContent = `₹${item.price} each`;

      info.appendChild(nameEl);
      info.appendChild(priceUnit);

      // Controls
      const controls = document.createElement('div');
      controls.className = 'cart-item-controls';

      const qtyCtrl = document.createElement('div');
      qtyCtrl.className = 'card-qty-control';

      const decBtn = document.createElement('button');
      decBtn.className = 'qty-btn';
      decBtn.textContent = '−';
      decBtn.title = 'Decrease quantity';
      decBtn.addEventListener('click', () => Cart.decrementItem(item.id));

      const qtySpan = document.createElement('span');
      qtySpan.className = 'qty-number';
      qtySpan.textContent = item.quantity;

      const incBtn = document.createElement('button');
      incBtn.className = 'qty-btn';
      incBtn.textContent = '+';
      incBtn.title = 'Increase quantity';
      if (!item.available) {
        incBtn.disabled = true;
        incBtn.style.opacity = '0.4';
      }
      incBtn.addEventListener('click', () => {
        if (item.available) {
          Cart.incrementItem(item.id);
        } else {
          this.showToast(`Cannot increase "${item.name}" because it is currently sold out.`, 'error');
        }
      });

      qtyCtrl.appendChild(decBtn);
      qtyCtrl.appendChild(qtySpan);
      qtyCtrl.appendChild(incBtn);

      const itemTotal = document.createElement('span');
      itemTotal.className = 'cart-item-total';
      itemTotal.textContent = `₹${item.price * item.quantity}`;

      controls.appendChild(qtyCtrl);
      controls.appendChild(itemTotal);

      row.appendChild(info);
      row.appendChild(controls);
      container.appendChild(row);
    });
  }

  async handleCheckout() {
    if (Cart.isEmpty()) {
      this.showToast("Your cart is empty. Please add items before checking out.", "error");
      return;
    }

    if (Cart.hasUnavailableItems()) {
      const badItems = Cart.getUnavailableItems().map(i => `"${i.name}"`).join(', ');
      this.showToast(`Cannot place order: ${badItems} is currently unavailable. Please remove it from your cart.`, "error");
      return;
    }

    const payload = Cart.toOrderPayload();

    try {
      this.elements.btnCheckout.disabled = true;
      this.elements.btnCheckout.textContent = "Placing Order...";

      const res = await Api.placeOrder(payload);

      if (res && res.order) {
        // Clear cart on successful order creation
        Cart.clear();

        // Add order to tracking manager
        this.ordersManager.addOrder(res.order);

        // Update rush indicator
        await this.refreshRushDisplay();

        // Show confirmation modal
        this.showOrderConfirmation(res.order);
      }
    } catch (err) {
      console.error("Order placement failed:", err);
      this.showToast(err.message || "Failed to place order. Please try again.", "error");
    } finally {
      this.renderCart();
    }
  }

  setupOrderModal() {
    if (this.elements.btnModalClose) {
      this.elements.btnModalClose.addEventListener('click', () => {
        this.elements.orderModal.classList.remove('active');
      });
    }

    if (this.elements.btnModalTrack) {
      this.elements.btnModalTrack.addEventListener('click', () => {
        this.elements.orderModal.classList.remove('active');
        this.switchTab('orders');
      });
    }
  }

  showOrderConfirmation(order) {
    if (!this.elements.orderModal) return;

    this.elements.modalOrderNumber.textContent = order.orderNumber;
    this.elements.modalOrderTotal.textContent = `₹${order.total}`;

    // Item summary preview
    if (this.elements.modalItemsSummary && order.items) {
      this.elements.modalItemsSummary.innerHTML = '';
      order.items.forEach(it => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:4px;';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${it.quantity}x ${it.name}`;
        const priceSpan = document.createElement('span');
        priceSpan.textContent = `₹${it.subtotal || (it.price * it.quantity)}`;
        row.appendChild(nameSpan);
        row.appendChild(priceSpan);
        this.elements.modalItemsSummary.appendChild(row);
      });
    }

    this.elements.orderModal.classList.add('active');
  }

  showToast(message, type = 'info') {
    if (!this.elements.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const text = document.createElement('span');
    text.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:none;border:none;cursor:pointer;color:inherit;font-weight:bold;margin-left:8px;';
    closeBtn.onclick = () => toast.remove();

    toast.appendChild(text);
    toast.appendChild(closeBtn);

    this.elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }
}

// Instantiate and boot app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new StudentApp();
  app.init();
  // Expose on window for manual console testing if desired
  window.__studentApp = app;
});
