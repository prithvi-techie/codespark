/**
 * admin.js - Canteen Staff & Admin Dashboard Controller
 * 
 * Functions:
 * 1. View active orders with order #, food items, quantities, and totals from Backend API
 * 2. Update order status: New -> Preparing -> Ready -> Collected (PATCH /staff/orders/:orderNumber/status)
 * 3. Mark food items Available or Sold Out (PATCH /staff/menu/:itemId/availability)
 * 4. Add & Remove food items (POST /staff/menu, DELETE /staff/menu/:itemId)
 * 5. Monitor real-time active-order count and rush level
 */

import { Api, calculateRush } from './api.js';

class AdminDashboard {
  constructor() {
    this.menuItems = [];
    this.activeOrders = [];
    this.refreshTimer = null;
  }

  async init() {
    this.setupTabs();
    this.setupFoodManagementModal();
    this.setupBackendSettingsBanner();
    await this.loadDashboardData();

    // Auto-refresh orders every 5 seconds to sync live kitchen queue
    this.refreshTimer = setInterval(() => {
      this.loadDashboardData(true);
    }, 5000);
  }

  setupTabs() {
    const tabBtns = document.querySelectorAll('.nav-btn[data-tab]');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = btn.getAttribute('data-tab');

        tabBtns.forEach(b => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.tab-content').forEach(section => {
          section.classList.toggle('active', section.id === `tab-${tab}`);
        });
      });
    });
  }

  setupBackendSettingsBanner() {
    // Allows toggling backend URL or staff token on deployed environments (Vercel -> Render)
    const brandWrapper = document.querySelector('.brand-wrapper');
    if (brandWrapper) {
      brandWrapper.style.cursor = 'pointer';
      brandWrapper.title = 'Click to view / configure Backend API URL';
      brandWrapper.addEventListener('click', () => {
        const currentUrl = Api.getBaseUrl();
        const newUrl = prompt('Backend API URL (Render or Localhost):', currentUrl);
        if (newUrl && newUrl.trim() !== currentUrl) {
          Api.setBaseUrl(newUrl.trim());
          this.showToast('Backend API URL updated to ' + newUrl.trim(), 'success');
          this.loadDashboardData(true);
        }
      });
    }
  }

  setupFoodManagementModal() {
    const modal = document.getElementById('add-food-modal');
    const openBtn = document.getElementById('btn-open-add-food');
    const cancelBtn = document.getElementById('btn-cancel-add-food');
    const form = document.getElementById('add-food-form');
    const fileInput = document.getElementById('food-image-file');
    const previewImg = document.getElementById('food-image-preview');
    const previewPlaceholder = document.getElementById('preview-placeholder');

    let currentImageDataUrl = '';

    if (openBtn && modal) {
      openBtn.addEventListener('click', () => {
        if (form) form.reset();
        currentImageDataUrl = '';
        if (previewImg) {
          previewImg.style.display = 'none';
          previewImg.src = '';
        }
        if (previewPlaceholder) previewPlaceholder.style.display = 'block';
        modal.classList.add('active');
      });
    }

    if (cancelBtn && modal) {
      cancelBtn.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }

    // Image Upload with Live Preview
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            currentImageDataUrl = uploadEvent.target.result;
            if (previewImg) {
              previewImg.src = currentImageDataUrl;
              previewImg.style.display = 'block';
            }
            if (previewPlaceholder) {
              previewPlaceholder.style.display = 'none';
            }
          };
          reader.readAsDataURL(file);
        } else {
          currentImageDataUrl = '';
          if (previewImg) previewImg.style.display = 'none';
          if (previewPlaceholder) previewPlaceholder.style.display = 'block';
        }
      });
    }

    // Handle Form Submit
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('food-name-input');
        const priceInput = document.getElementById('food-price-input');
        const categorySelect = document.getElementById('food-category-select');
        const descInput = document.getElementById('food-desc-input');
        const availCheckbox = document.getElementById('food-avail-checkbox');

        const name = nameInput ? nameInput.value.trim() : '';
        const price = priceInput ? parseFloat(priceInput.value) : 0;
        const category = categorySelect ? categorySelect.value : 'Snacks';
        const description = descInput ? descInput.value.trim() : '';
        const available = availCheckbox ? availCheckbox.checked : true;

        if (!name || isNaN(price) || price < 0) {
          this.showToast('Please enter a valid food name and non-negative price.', 'error');
          return;
        }

        try {
          await Api.addMenuItem({
            name,
            price,
            category,
            description,
            available,
            image: currentImageDataUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'
          });

          this.showToast(`"${name}" added to canteen menu!`, 'success');
          if (modal) modal.classList.remove('active');
          await this.loadDashboardData(true);
        } catch (err) {
          this.showToast('Could not add food item: ' + err.message, 'error');
        }
      });
    }
  }

  async loadDashboardData(silent = false) {
    try {
      // 1. Fetch Menu Items from Backend
      const menuRes = await Api.getMenu();
      this.menuItems = menuRes.items || [];
      this.renderMenuManagement();

      // 2. Fetch Active Orders and Rush Level from Backend
      const activeData = await Api.getActiveOrders();
      this.activeOrders = activeData.orders || [];
      const activeCount = typeof activeData.activeCount === 'number' ? activeData.activeCount : this.activeOrders.length;
      const rushLevel = activeData.rushLevel || 'Low';

      // Update Header Indicator & Queue Statistics
      this.updateRushHeader(activeCount, rushLevel);

      // Render Active Orders List
      this.renderOrders();
    } catch (err) {
      if (!silent) {
        this.showToast('Kitchen data sync warning: ' + err.message, 'error');
      }
    }
  }

  updateRushHeader(activeCount, rushLevel) {
    const badge = document.getElementById('rush-badge');
    const text = document.getElementById('rush-text');
    const countDisplay = document.getElementById('active-orders-count');
    const rushLevelDisplay = document.getElementById('current-rush-level');

    if (badge && text) {
      badge.className = `rush-badge-widget rush-${rushLevel.toLowerCase()}`;
      text.textContent = `Current Rush: ${rushLevel}`;
    }

    if (countDisplay) {
      countDisplay.textContent = activeCount;
    }

    if (rushLevelDisplay) {
      rushLevelDisplay.textContent = `${rushLevel} Rush`;
      rushLevelDisplay.style.color =
        rushLevel === 'High' ? 'var(--rush-high)' :
        rushLevel === 'Medium' ? 'var(--rush-medium)' : 'var(--rush-low)';
    }
  }

  renderOrders() {
    const container = document.getElementById('admin-orders-list');
    if (!container) return;

    if (this.activeOrders.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 13l4 4L19 7"></path>
          </svg>
          <h3>All Caught Up!</h3>
          <p>No active food orders in the kitchen queue right now.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';

    // Sort: Newest orders first
    const sorted = [...this.activeOrders].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    sorted.forEach(order => {
      const card = document.createElement('div');
      card.className = 'order-card';

      // Header: Order # and Current Status
      const header = document.createElement('div');
      header.className = 'order-card-header';

      const title = document.createElement('span');
      title.className = 'order-number-title';
      title.textContent = order.orderNumber;

      const currentStatusBadge = document.createElement('span');
      currentStatusBadge.className = `order-status-badge status-${order.status}`;
      currentStatusBadge.textContent = order.status;

      header.appendChild(title);
      header.appendChild(currentStatusBadge);

      // Order Items Breakdown
      const itemsList = document.createElement('div');
      itemsList.className = 'order-items-detail';

      (order.items || []).forEach(it => {
        const row = document.createElement('div');
        row.className = 'order-detail-item';

        const nameSpan = document.createElement('span');
        nameSpan.style.fontWeight = '600';
        nameSpan.textContent = `${it.quantity} × ${it.name}`;

        const priceSpan = document.createElement('span');
        priceSpan.textContent = `₹${it.subtotal || (it.price * it.quantity)}`;

        row.appendChild(nameSpan);
        row.appendChild(priceSpan);
        itemsList.appendChild(row);
      });

      // Status Update Controls (Staff Only)
      const controlsWrap = document.createElement('div');
      controlsWrap.style.cssText = 'margin: 1rem 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; background: #fff7ed; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #fed7aa;';

      const label = document.createElement('span');
      label.style.cssText = 'font-size: 0.85rem; font-weight: 600; color: var(--text-main);';
      label.textContent = 'Change Order Status:';

      const btnGroup = document.createElement('div');
      btnGroup.style.cssText = 'display: flex; gap: 0.4rem; flex-wrap: wrap;';

      const statuses = ['New', 'Preparing', 'Ready', 'Collected'];

      statuses.forEach(statusOption => {
        const btn = document.createElement('button');
        btn.className = `nav-btn ${order.status === statusOption ? 'active' : ''}`;
        btn.style.cssText = 'padding: 0.3rem 0.65rem; font-size: 0.8rem;';
        btn.textContent = statusOption;

        if (order.status === statusOption) {
          btn.disabled = true;
          btn.style.cursor = 'default';
        } else {
          btn.addEventListener('click', () => {
            this.updateOrderStatus(order.orderNumber, statusOption);
          });
        }

        btnGroup.appendChild(btn);
      });

      controlsWrap.appendChild(label);
      controlsWrap.appendChild(btnGroup);

      // Footer
      const footer = document.createElement('div');
      footer.className = 'order-card-footer';

      const timeEl = document.createElement('span');
      timeEl.className = 'order-timestamp';
      if (order.createdAt) {
        const d = new Date(order.createdAt);
        timeEl.textContent = `Received at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        timeEl.textContent = 'Active order';
      }

      const totalEl = document.createElement('span');
      totalEl.className = 'order-total-amount';
      totalEl.textContent = `Total: ₹${order.total}`;

      footer.appendChild(timeEl);
      footer.appendChild(totalEl);

      card.appendChild(header);
      card.appendChild(itemsList);
      card.appendChild(controlsWrap);
      card.appendChild(footer);

      container.appendChild(card);
    });
  }

  renderMenuManagement() {
    const container = document.getElementById('admin-menu-list');
    if (!container) return;

    container.innerHTML = '';

    this.menuItems.forEach(item => {
      const card = document.createElement('article');
      card.className = `menu-card ${item.available ? 'available' : 'unavailable'}`;
      card.style.display = 'flex';
      card.style.flexDirection = 'column';

      // Card Image Wrap
      const imageWrap = document.createElement('div');
      imageWrap.className = 'card-image-wrap';

      const img = document.createElement('img');
      img.className = 'card-image';
      img.src = item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60';
      img.alt = item.name;
      img.loading = 'lazy';
      img.onerror = () => {
        img.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60';
      };

      const badge = document.createElement('span');
      badge.className = `card-badge ${item.available ? 'badge-available' : 'badge-unavailable'}`;
      badge.textContent = item.available ? 'Food Available' : 'Sold Out';

      imageWrap.appendChild(img);
      imageWrap.appendChild(badge);

      // Card Body
      const body = document.createElement('div');
      body.className = 'card-body';
      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.style.gap = '0.4rem';

      const title = document.createElement('h3');
      title.className = 'card-title';
      title.textContent = item.name;

      const desc = document.createElement('p');
      desc.className = 'card-description';
      desc.textContent = item.description || 'Canteen special';

      const price = document.createElement('div');
      price.className = 'card-price';
      price.textContent = `₹${item.price} • ${item.category || 'Snacks'}`;

      // Actions Area
      const actionsWrap = document.createElement('div');
      actionsWrap.style.cssText = 'display: flex; gap: 0.5rem; margin-top: auto; padding-top: 0.75rem;';

      const toggleBtn = document.createElement('button');
      toggleBtn.className = item.available ? 'btn-modal-action btn-modal-secondary' : 'btn-modal-action btn-modal-primary';
      toggleBtn.style.cssText = 'flex: 1; padding: 0.5rem 0.6rem; font-size: 0.8rem;';
      toggleBtn.textContent = item.available ? 'Mark Sold Out' : 'Mark Available';
      toggleBtn.addEventListener('click', () => {
        this.toggleItemAvailability(item.id, !item.available);
      });

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-modal-action';
      removeBtn.style.cssText = 'padding: 0.5rem 0.75rem; font-size: 0.8rem; background: #fee2e2; color: #dc2626; border: 1px solid #fecaca;';
      removeBtn.textContent = 'Remove';
      removeBtn.title = 'Remove this food item from canteen menu';
      removeBtn.addEventListener('click', () => {
        this.handleRemoveFoodItem(item.id, item.name);
      });

      actionsWrap.appendChild(toggleBtn);
      actionsWrap.appendChild(removeBtn);

      body.appendChild(title);
      body.appendChild(desc);
      body.appendChild(price);
      body.appendChild(actionsWrap);

      card.appendChild(imageWrap);
      card.appendChild(body);

      container.appendChild(card);
    });
  }

  async handleRemoveFoodItem(itemId, itemName) {
    const confirmed = confirm(`Are you sure you want to remove "${itemName}" from the canteen menu?`);
    if (!confirmed) return;

    try {
      await Api.removeMenuItem(itemId);
      this.showToast(`"${itemName}" removed from menu.`, 'info');
      await this.loadDashboardData(true);
    } catch (err) {
      this.showToast('Could not remove food item: ' + err.message, 'error');
    }
  }

  async updateOrderStatus(orderNumber, newStatus) {
    try {
      await Api.updateOrderStatus(orderNumber, newStatus);
      this.showToast(`Order ${orderNumber} updated to ${newStatus}`, 'success');
      await this.loadDashboardData(true);
    } catch (err) {
      this.showToast('Failed to update order status: ' + err.message, 'error');
    }
  }

  async toggleItemAvailability(itemId, newAvailable) {
    try {
      await Api.setItemAvailability(itemId, newAvailable);
      const stateWord = newAvailable ? 'Available' : 'Sold Out';
      this.showToast(`Food item updated to "${stateWord}"`, 'success');
      await this.loadDashboardData(true);
    } catch (err) {
      this.showToast('Failed to update availability: ' + err.message, 'error');
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const admin = new AdminDashboard();
  admin.init();
});
