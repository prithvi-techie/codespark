
/* ==========================================
   CODE SPARK SMART CANTEEN
   Menu, Cart, Orders and Staff Dashboard
========================================== */

const menuItems = [
    {
        id: 1,
        name: "Classic Burger",
        description: "Crispy, cheesy and full of flavour.",
        price: 60,
        emoji: "🍔",
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=80",
        available: true
    },
    {
        id: 2,
        name: "Margherita Pizza",
        description: "Cheesy pizza with a golden crust.",
        price: 100,
        emoji: "🍕",
        image: "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=700&q=80",
        available: true
    },
    {
        id: 3,
        name: "French Fries",
        description: "Golden, crispy and perfectly salted.",
        price: 40,
        emoji: "🍟",
        image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=700&q=80",
        available: true
    },
    {
        id: 4,
        name: "Veg Sandwich",
        description: "Fresh veggies in toasted bread.",
        price: 50,
        emoji: "🥪",
        image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=700&q=80",
        available: true
    },
    {
        id: 5,
        name: "Cold Coffee",
        description: "Chilled, creamy and refreshing.",
        price: 45,
        emoji: "🥤",
        image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=700&q=80",
        available: true
    },
    {
        id: 6,
        name: "Chocolate Brownie",
        description: "A rich chocolate treat for your break.",
        price: 55,
        emoji: "🍫",
        image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=700&q=80",
        available: true
    }
];

let cart = [];
let orders = [];
let nextOrderNumber = 1001;
let toastTimer;

function money(amount) {
    return "₹" + amount;
}

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2600);
}

/* WELCOME POPUP */

function closeWelcome() {
    const popup = document.getElementById("welcome-popup");
    if (popup) popup.style.display = "none";
}

function exploreMenu() {
    closeWelcome();
    document.getElementById("menu-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeWelcome();
});

/* MENU */

function renderMenu() {
    const menu = document.getElementById("menu");

    menu.innerHTML = menuItems.map(item => `
        <article class="food-card">
            <img
                class="food-image"
                src="${item.image}"
                alt="${item.name}"
                loading="lazy"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';"
            >
            <div class="food-emoji food-fallback" style="display:none">
                ${item.emoji}
            </div>
            <div>
                <h3>${item.name}</h3>
                <p>${item.description}</p>
                <span class="price">${money(item.price)}</span>
                <span class="${item.available ? "available" : "unavailable"}">
                    ${item.available ? "● Available" : "● Currently unavailable"}
                </span>
                <div style="margin-top:13px">
                    <button
                        onclick="addToCart(${item.id})"
                        ${item.available ? "" : "disabled"}
                    >
                        ${item.available ? "+ Add to Cart" : "Unavailable"}
                    </button>
                </div>
            </div>
        </article>
    `).join("");
}

/* CART */

function addToCart(itemId) {
    const item = menuItems.find(food => food.id === itemId);

    if (!item || !item.available) {
        showToast("Sorry, this item is currently unavailable.");
        return;
    }

    const existing = cart.find(entry => entry.id === itemId);

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1
        });
    }

    renderCart();
    showToast(item.name + " added to your cart!");
}

function changeQuantity(itemId, change) {
    const entry = cart.find(item => item.id === itemId);
    if (!entry) return;

    const menuItem = menuItems.find(item => item.id === itemId);

    if (change > 0 && menuItem && !menuItem.available) {
        showToast("This item is no longer available.");
        return;
    }

    entry.quantity += change;

    if (entry.quantity <= 0) {
        cart = cart.filter(item => item.id !== itemId);
    }

    renderCart();
}

function getCartTotal() {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getCartCount() {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function renderCart() {
    const cartItems = document.getElementById("cart-items");
    const cartCount = document.getElementById("cart-count");
    const sideCount = document.getElementById("cart-count-side");
    const total = document.getElementById("total");

    cartCount.textContent = getCartCount();
    sideCount.textContent = getCartCount() + (getCartCount() === 1 ? " item" : " items");
    total.textContent = money(getCartTotal());

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <span>🛍️</span>
                <strong>Your cart is empty</strong>
                <p>Add something delicious!</p>
            </div>`;
        return;
    }

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div>
                <strong>${item.name}</strong>
                <small>${money(item.price)} each</small>
            </div>
            <div class="cart-controls">
                <button onclick="changeQuantity(${item.id}, -1)" aria-label="Decrease ${item.name}">−</button>
                <span>${item.quantity}</span>
                <button onclick="changeQuantity(${item.id}, 1)" aria-label="Increase ${item.name}">+</button>
            </div>
        </div>
    `).join("");
}

function showCart() {
    document.getElementById("cart-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

/* PLACE ORDER */

function placeOrder() {
    if (cart.length === 0) {
        showToast("Your cart is empty. Add food first!");
        return;
    }

    const unavailableItem = cart.find(cartItem => {
        const menuItem = menuItems.find(item => item.id === cartItem.id);
        return !menuItem || !menuItem.available;
    });

    if (unavailableItem) {
        showToast(unavailableItem.name + " is unavailable. Remove it from your cart.");
        return;
    }

    const order = {
        number: nextOrderNumber++,
        items: cart.map(item => ({ ...item })),
        total: getCartTotal(),
        status: "New",
        createdAt: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        })
    };

    orders.unshift(order);
    cart = [];

    renderCart();
    renderOrders();
    renderDashboard();

    showToast("Order #" + order.number + " placed successfully!");
    document.getElementById("orders-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

/* ORDER TRACKING */

function renderOrders() {
    const container = document.getElementById("orders");

    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                Your placed orders will appear here.
            </div>`;
        return;
    }

    container.innerHTML = orders.map(order => `
        <article class="order-card">
            <h3>Order #${order.number}</h3>
            <p>Placed at ${order.createdAt}</p>
            <p><strong>Items:</strong> ${order.items.map(item =>
                `${item.name} × ${item.quantity}`
            ).join(", ")}</p>
            <p><strong>Total:</strong> ${money(order.total)}</p>
            <span class="status-pill">${statusEmoji(order.status)} ${order.status}</span>
        </article>
    `).join("");
}

function statusEmoji(status) {
    const icons = {
        "New": "🆕",
        "Preparing": "👨‍🍳",
        "Ready": "✅",
        "Collected": "📦"
    };

    return icons[status] || "📦";
}

/* STAFF DASHBOARD */

function renderDashboard() {
    const activeOrders = orders.filter(order => order.status !== "Collected");

    document.getElementById("active-count").textContent = activeOrders.length;
    document.getElementById("new-count").textContent =
        orders.filter(order => order.status === "New").length;
    document.getElementById("preparing-count").textContent =
        orders.filter(order => order.status === "Preparing").length;
    document.getElementById("ready-count").textContent =
        orders.filter(order => order.status === "Ready").length;
    document.getElementById("collected-count").textContent =
        orders.filter(order => order.status === "Collected").length;

    const rushLevel = document.getElementById("rush-level");
    const rushDot = document.getElementById("rush-dot");

    if (activeOrders.length >= 10) {
        rushLevel.textContent = "High Rush";
        rushDot.textContent = "🔴";
    } else if (activeOrders.length >= 5) {
        rushLevel.textContent = "Medium Rush";
        rushDot.textContent = "🟡";
    } else {
        rushLevel.textContent = "Low Rush";
        rushDot.textContent = "🟢";
    }

    renderStaffMenu();
    renderStaffOrders();
}

function renderStaffMenu() {
    const container = document.getElementById("staff-menu");

    container.innerHTML = menuItems.map(item => `
        <div class="staff-menu-item">
            <div>
                <strong>${item.emoji} ${item.name}</strong>
                <p>${money(item.price)} · ${item.available ? "Available" : "Unavailable"}</p>
            </div>
            <button onclick="toggleAvailability(${item.id})">
                ${item.available ? "Mark Unavailable" : "Mark Available"}
            </button>
        </div>
    `).join("");
}

function toggleAvailability(itemId) {
    const item = menuItems.find(food => food.id === itemId);
    if (!item) return;

    item.available = !item.available;

    renderMenu();
    renderDashboard();

    showToast(item.name + (item.available ? " is now available." : " is now unavailable."));
}

function renderStaffOrders() {
    const container = document.getElementById("staff-orders");

    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                No orders to manage yet. Place a test order above!
            </div>`;
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="staff-order-item">
            <div>
                <strong>Order #${order.number} · ${money(order.total)}</strong>
                <p>${order.items.map(item =>
                    `${item.name} × ${item.quantity}`
                ).join(", ")}</p>
                <p>Current status: ${statusEmoji(order.status)} ${order.status}</p>
            </div>
            <select aria-label="Update status for order ${order.number}"
                onchange="updateOrderStatus(${order.number}, this.value)">
                <option value="New" ${order.status === "New" ? "selected" : ""}>New</option>
                <option value="Preparing" ${order.status === "Preparing" ? "selected" : ""}>Preparing</option>
                <option value="Ready" ${order.status === "Ready" ? "selected" : ""}>Ready</option>
                <option value="Collected" ${order.status === "Collected" ? "selected" : ""}>Collected</option>
            </select>
        </div>
    `).join("");
}

function updateOrderStatus(orderNumber, newStatus) {
    const validStatuses = ["New", "Preparing", "Ready", "Collected"];

    if (!validStatuses.includes(newStatus)) return;

    const order = orders.find(item => item.number === orderNumber);
    if (!order) return;

    order.status = newStatus;

    renderOrders();
    renderDashboard();

    showToast("Order #" + orderNumber + " updated to " + newStatus + ".");
}

/* START THE WEBSITE */

function initApp() {
    renderMenu();
    renderCart();
    renderOrders();
    renderDashboard();
}

initApp();
