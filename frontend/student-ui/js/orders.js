/**
 * orders.js - Order placement, status tracking & lookup for Student UI
 */

import { Api } from './api.js';

// Order Status Steps config in progressive sequence
const ORDER_STATUS_STEPS = ["New", "Preparing", "Ready", "Collected"];

export class OrdersManager {
  constructor(containerElement, onStatusUpdate) {
    this.container = containerElement;
    this.onStatusUpdate = onStatusUpdate;
    this.trackedOrders = new Map();
    this.pollingInterval = null;
  }

  init() {
    this.loadStudentOrders();
    this.startAutoRefresh();
  }

  stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  startAutoRefresh() {
    // Poll active orders every 4 seconds to keep statuses fresh for student
    this.stop();
    this.pollingInterval = setInterval(() => {
      this.refreshActiveOrders();
    }, 4000);
  }

  async loadStudentOrders() {
    const orderNumbers = Api.getMyOrderNumbers();
    if (orderNumbers.length === 0) {
      this.render();
      return;
    }

    for (const num of orderNumbers) {
      try {
        const res = await Api.getOrder(num);
        if (res && res.order) {
          this.trackedOrders.set(res.order.orderNumber, res.order);
        }
      } catch (e) {
        console.warn(`Could not fetch details for order ${num}:`, e);
      }
    }

    this.render();
  }

  async refreshActiveOrders() {
    let hasChanges = false;
    for (const [orderNumber, order] of this.trackedOrders.entries()) {
      if (order.status !== 'Collected') {
        try {
          const res = await Api.getOrder(orderNumber);
          if (res && res.order) {
            if (res.order.status !== order.status) {
              hasChanges = true;
            }
            this.trackedOrders.set(orderNumber, res.order);
          }
        } catch (e) {
          // ignore transient poll errors
        }
      }
    }

    if (hasChanges) {
      this.render();
      if (this.onStatusUpdate) this.onStatusUpdate();
    }
  }

  addOrder(order) {
    if (order && order.orderNumber) {
      this.trackedOrders.set(order.orderNumber, order);
      this.render();
    }
  }

  render() {
    if (!this.container) return;

    if (this.trackedOrders.size === 0) {
      this.container.innerHTML = `
        <div class="empty-state-card">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
          </svg>
          <h3>No Orders Yet</h3>
          <p>You haven't placed any orders today, or enter your Order # above to track live status.</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = '';
    const ordersList = Array.from(this.trackedOrders.values());

    // Sort newest first
    ordersList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    ordersList.forEach(order => {
      const card = document.createElement('div');
      card.className = 'order-card';

      // Card Header
      const header = document.createElement('div');
      header.className = 'order-card-header';

      const title = document.createElement('span');
      title.className = 'order-number-title';
      title.textContent = order.orderNumber;

      const badge = document.createElement('span');
      badge.className = `order-status-badge status-${order.status}`;
      badge.textContent = order.status;

      header.appendChild(title);
      header.appendChild(badge);

      // Status Stepper Visual Tracker
      const stepper = document.createElement('div');
      stepper.className = 'status-tracker-stepper';

      const currentIdx = ORDER_STATUS_STEPS.indexOf(order.status);

      ORDER_STATUS_STEPS.forEach((stepName, idx) => {
        const stepEl = document.createElement('div');
        stepEl.className = 'stepper-step';

        if (idx < currentIdx) {
          stepEl.classList.add('completed');
        } else if (idx === currentIdx) {
          stepEl.classList.add('current');
        }

        const bubble = document.createElement('div');
        bubble.className = 'step-bubble';
        bubble.textContent = idx < currentIdx ? '✓' : (idx + 1);

        const label = document.createElement('span');
        label.className = 'step-label';
        label.textContent = stepName;

        stepEl.appendChild(bubble);
        stepEl.appendChild(label);
        stepper.appendChild(stepEl);
      });

      // Item breakdown
      const itemsList = document.createElement('div');
      itemsList.className = 'order-items-detail';

      if (order.items && order.items.length > 0) {
        order.items.forEach(it => {
          const row = document.createElement('div');
          row.className = 'order-detail-item';

          const nameSpan = document.createElement('span');
          nameSpan.textContent = `${it.quantity}x ${it.name}`;

          const subSpan = document.createElement('span');
          subSpan.textContent = `₹${it.subtotal || (it.price * it.quantity)}`;

          row.appendChild(nameSpan);
          row.appendChild(subSpan);
          itemsList.appendChild(row);
        });
      }

      // Card Footer
      const footer = document.createElement('div');
      footer.className = 'order-card-footer';

      const timeEl = document.createElement('span');
      timeEl.className = 'order-timestamp';
      if (order.createdAt) {
        const d = new Date(order.createdAt);
        timeEl.textContent = `Placed at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        timeEl.textContent = 'Active order';
      }

      const totalEl = document.createElement('span');
      totalEl.className = 'order-total-amount';
      totalEl.textContent = `Total: ₹${order.total}`;

      footer.appendChild(timeEl);
      footer.appendChild(totalEl);

      card.appendChild(header);
      card.appendChild(stepper);
      card.appendChild(itemsList);
      card.appendChild(footer);

      this.container.appendChild(card);
    });
  }
}
