/**
 * menu.js - Menu rendering and category handling for Student UI
 */

import { Cart } from './cart.js';

export class MenuRenderer {
  constructor(containerElement, onAddToCart) {
    this.container = containerElement;
    this.onAddToCart = onAddToCart;
    this.items = [];
    this.activeCategory = 'All';
  }

  setItems(items) {
    this.items = items || [];
    this.render();
  }

  filterByCategory(category) {
    this.activeCategory = category;
    this.render();
  }

  render() {
    if (!this.container) return;

    if (!this.items || this.items.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state-card" style="grid-column: 1 / -1;">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
          <h3>No Menu Items Available</h3>
          <p>The canteen is currently refreshing its menu. Please check back shortly.</p>
        </div>
      `;
      return;
    }

    const filtered = this.activeCategory === 'All'
      ? this.items
      : this.items.filter(item => item.category === this.activeCategory);

    this.container.innerHTML = '';

    filtered.forEach(item => {
      const card = document.createElement('article');
      card.className = `menu-card ${item.available ? 'available' : 'unavailable'}`;
      card.setAttribute('data-id', item.id);

      const qtyInCart = Cart.getQuantityOf(item.id);

      // Safe image fallback
      const imageUrl = item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60';

      // Card Image Wrap
      const imageWrap = document.createElement('div');
      imageWrap.className = 'card-image-wrap';

      const img = document.createElement('img');
      img.className = 'card-image';
      img.src = imageUrl;
      img.alt = item.name;
      img.loading = 'lazy';
      img.onerror = () => {
        img.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60';
      };

      const badge = document.createElement('span');
      badge.className = `card-badge ${item.available ? 'badge-available' : 'badge-unavailable'}`;
      badge.textContent = item.available ? 'Available' : 'Sold Out';

      imageWrap.appendChild(img);
      imageWrap.appendChild(badge);

      // Card Body
      const body = document.createElement('div');
      body.className = 'card-body';

      const title = document.createElement('h3');
      title.className = 'card-title';
      title.textContent = item.name;

      const desc = document.createElement('p');
      desc.className = 'card-description';
      desc.textContent = item.description || 'Freshly made in the college canteen';

      // Card Footer
      const footer = document.createElement('div');
      footer.className = 'card-footer';

      const price = document.createElement('span');
      price.className = 'card-price';
      price.textContent = `₹${item.price}`;

      const actionArea = document.createElement('div');
      actionArea.className = 'card-actions';

      if (!item.available) {
        // Disabled button for unavailable items
        const disabledBtn = document.createElement('button');
        disabledBtn.className = 'btn-add-cart';
        disabledBtn.disabled = true;
        disabledBtn.textContent = 'Unavailable';
        disabledBtn.title = 'This item is currently sold out';
        actionArea.appendChild(disabledBtn);
      } else if (qtyInCart > 0) {
        // Show inline quantity modifier if item is already in cart
        const qtyControl = document.createElement('div');
        qtyControl.className = 'card-qty-control';

        const decBtn = document.createElement('button');
        decBtn.className = 'qty-btn';
        decBtn.textContent = '−';
        decBtn.title = 'Decrease quantity';
        decBtn.addEventListener('click', () => {
          Cart.decrementItem(item.id);
        });

        const qtySpan = document.createElement('span');
        qtySpan.className = 'qty-number';
        qtySpan.textContent = qtyInCart;

        const incBtn = document.createElement('button');
        incBtn.className = 'qty-btn';
        incBtn.textContent = '+';
        incBtn.title = 'Increase quantity';
        incBtn.addEventListener('click', () => {
          Cart.incrementItem(item.id);
        });

        qtyControl.appendChild(decBtn);
        qtyControl.appendChild(qtySpan);
        qtyControl.appendChild(incBtn);
        actionArea.appendChild(qtyControl);
      } else {
        // Regular Add button
        const addBtn = document.createElement('button');
        addBtn.className = 'btn-add-cart';
        addBtn.innerHTML = `
          <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add
        `;
        addBtn.addEventListener('click', () => {
          if (this.onAddToCart) {
            this.onAddToCart(item);
          }
        });
        actionArea.appendChild(addBtn);
      }

      footer.appendChild(price);
      footer.appendChild(actionArea);

      body.appendChild(title);
      body.appendChild(desc);
      body.appendChild(footer);

      card.appendChild(imageWrap);
      card.appendChild(body);

      this.container.appendChild(card);
    });
  }
}
