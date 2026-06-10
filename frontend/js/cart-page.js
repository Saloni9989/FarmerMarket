document.addEventListener('DOMContentLoaded', () => {
  renderCart();
  prefillUserAddress();

  // Set min date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateInput = document.getElementById('deliveryDate');
  if (dateInput) dateInput.min = tomorrow.toISOString().split('T')[0];
});

function renderCart() {
  const items = Cart.get();
  const cartLayout = document.getElementById('cartLayout');
  const emptyCart = document.getElementById('emptyCart');
  const cartItemsDiv = document.getElementById('cartItems');

  if (items.length === 0) {
    if (cartLayout) cartLayout.style.display = 'none';
    if (emptyCart) emptyCart.style.display = 'block';
    return;
  }

  if (cartLayout) cartLayout.style.display = 'grid';
  if (emptyCart) emptyCart.style.display = 'none';

  cartItemsDiv.innerHTML = items.map(item => `
    <div class="cart-item" id="item-${item._id}">
      <img class="cart-item-img" src="${getImageUrl(item.image)}" alt="${item.name}"
        onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop'">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-farmer"><i class="fas fa-user-circle"></i> ${item.farmerName || 'Local Farmer'}</div>
        <div class="cart-item-price">₹${item.price} <span class="cart-item-unit">per ${item.unit}</span></div>
      </div>
      <div class="cart-item-actions">
        <div class="quantity-control">
          <button class="qty-btn" onclick="changeQty('${item._id}', ${item.quantity - 1})"><i class="fas fa-minus"></i></button>
          <span class="qty-display">${item.quantity}</span>
          <button class="qty-btn" onclick="changeQty('${item._id}', ${item.quantity + 1})"><i class="fas fa-plus"></i></button>
        </div>
        <div style="font-size:14px;font-weight:600;color:var(--text-dark)">₹${(item.price * item.quantity).toFixed(2)}</div>
        <button class="remove-btn" onclick="removeFromCart('${item._id}')"><i class="fas fa-trash"></i> Remove</button>
      </div>
    </div>
  `).join('');

  updateSummary();
}

function changeQty(id, qty) {
  if (qty < 1) {
    removeFromCart(id);
    return;
  }
  Cart.updateQty(id, qty);
  renderCart();
}

function removeFromCart(id) {
  Cart.remove(id);
  renderCart();
  showToast('Item removed from cart', 'info');
}

function updateSummary() {
  const items = Cart.get();
  const subtotal = items.reduce((s, i) => s + (i.price * i.quantity), 0);
  const delivery = subtotal > 500 ? 0 : 40;
  const total = subtotal + delivery;

  document.getElementById('summarySubtotal').textContent = `₹${subtotal.toFixed(2)}`;
  document.getElementById('summaryDelivery').textContent = delivery === 0 ? 'FREE' : `₹${delivery.toFixed(2)}`;
  document.getElementById('summaryTotal').textContent = `₹${total.toFixed(2)}`;
}

async function prefillUserAddress() {
  if (!Auth.isLoggedIn()) return;
  try {
    const data = await api.get('/auth/me');
    const user = data.user;
    if (document.getElementById('deliveryName')) document.getElementById('deliveryName').value = user.name || '';
    if (document.getElementById('deliveryPhone')) document.getElementById('deliveryPhone').value = user.phone || '';
    if (user.address) {
      if (document.getElementById('deliveryStreet')) document.getElementById('deliveryStreet').value = user.address.street || '';
      if (document.getElementById('deliveryCity')) document.getElementById('deliveryCity').value = user.address.city || '';
      if (document.getElementById('deliveryState')) document.getElementById('deliveryState').value = user.address.state || '';
      if (document.getElementById('deliveryPincode')) document.getElementById('deliveryPincode').value = user.address.pincode || '';
    }
  } catch(e) { /* skip */ }
}

function proceedToCheckout() {
  if (!Auth.isLoggedIn()) {
    showToast('Please login to continue', 'warning');
    setTimeout(() => window.location.href = 'login.html', 1200);
    return;
  }
  const user = Auth.getUser();
  if (user.role === 'farmer') {
    showToast('Farmers cannot place orders. Please use a consumer account.', 'warning');
    return;
  }
  document.getElementById('checkoutModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  document.getElementById('checkoutModal').style.display = 'none';
  document.body.style.overflow = '';
}

async function placeOrder(e) {
  e.preventDefault();
  const btn = document.getElementById('placeOrderBtn');
  const btnText = document.getElementById('placeOrderText');
  btn.disabled = true;
  btnText.textContent = 'Placing order...';

  const items = Cart.get();
  const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || 'cod';

  const orderData = {
    items: items.map(i => ({ product: i._id, quantity: i.quantity })),
    deliveryAddress: {
      name: document.getElementById('deliveryName').value,
      phone: document.getElementById('deliveryPhone').value,
      street: document.getElementById('deliveryStreet').value,
      city: document.getElementById('deliveryCity').value,
      state: document.getElementById('deliveryState').value,
      pincode: document.getElementById('deliveryPincode').value
    },
    deliverySlot: {
      date: document.getElementById('deliveryDate').value,
      timeSlot: document.getElementById('deliverySlot').value
    },
    paymentMethod,
    notes: document.getElementById('orderNotes').value
  };

  try {
    const data = await api.post('/orders', orderData);
    Cart.clear();
    closeCheckout();
    showToast(`Order ${data.order.orderNumber} placed successfully!`, 'success');
    setTimeout(() => window.location.href = 'consumer-dashboard.html', 1500);
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
    btnText.textContent = 'Place Order';
  }
}

// Close modal on overlay click
document.getElementById('checkoutModal')?.addEventListener('click', function(e) {
  if (e.target === this) closeCheckout();
});
