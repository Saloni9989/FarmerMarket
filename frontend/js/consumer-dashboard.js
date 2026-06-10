document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) { window.location.href = 'login.html'; return; }
  const user = Auth.getUser();
  if (user.role === 'farmer') { window.location.href = 'farmer-dashboard.html'; return; }
  if (user.role === 'admin') { window.location.href = 'admin-dashboard.html'; return; }

  // Set user name in sidebar
  document.getElementById('sidebarName').textContent = user.name;

  loadOverview();
  loadOrders();
  loadProfileData();

  // Handle hash navigation
  const hash = window.location.hash;
  if (hash === '#orders') showTab('orders', document.querySelector('[onclick*="orders"]'));
});

function showTab(tabName, link) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.getElementById(`tab-${tabName}`)?.classList.add('active');
  if (link) link.classList.add('active');

  if (tabName === 'orders') loadOrders();
  if (tabName === 'profile') loadProfileData();
  if (tabName === 'address') loadAddressData();
}

async function loadOverview() {
  try {
    const data = await api.get('/orders/my-orders?limit=50');
    const orders = data.orders || [];

    document.getElementById('totalOrders').textContent = orders.length;
    document.getElementById('deliveredOrders').textContent = orders.filter(o => o.status === 'delivered').length;
    document.getElementById('pendingOrders').textContent = orders.filter(o => ['placed','confirmed','processing','dispatched'].includes(o.status)).length;
    document.getElementById('cancelledOrders').textContent = orders.filter(o => o.status === 'cancelled').length;

    const recent = orders.slice(0, 5);
    const container = document.getElementById('recentOrdersList');
    if (recent.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-box"></i><h3>No orders yet</h3><p>Start shopping to place your first order</p><a href="products.html" class="btn-primary" style="display:inline-flex;margin-top:16px">Shop Now</a></div>`;
    } else {
      container.innerHTML = recent.map(o => renderOrderCard(o)).join('');
    }
  } catch (e) {
    document.getElementById('recentOrdersList').innerHTML = `<p style="color:var(--text-light);text-align:center;padding:20px">Could not load orders. <a href="products.html">Start Shopping</a></p>`;
  }
}

let currentOrderFilter = '';

async function loadOrders(status = currentOrderFilter) {
  currentOrderFilter = status;
  const container = document.getElementById('ordersList');
  container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

  try {
    const endpoint = status ? `/orders/my-orders?status=${status}` : '/orders/my-orders';
    const data = await api.get(endpoint);
    const orders = data.orders || [];

    if (orders.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-box"></i><h3>No orders found</h3><p>No orders with this status</p></div>`;
    } else {
      container.innerHTML = orders.map(o => renderOrderCard(o)).join('');
    }
  } catch(e) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Could not load orders</h3></div>`;
  }
}

function filterOrders(status, btn) {
  document.querySelectorAll('.order-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadOrders(status);
}

function renderOrderCard(order) {
  const items = order.items || [];
  const statusClass = `status-${order.status}`;

  return `
    <div class="order-card">
      <div class="order-header">
        <div>
          <div class="order-number">Order #${order.orderNumber || order._id.slice(-8).toUpperCase()}</div>
          <div class="order-date">${formatDate(order.createdAt)}</div>
        </div>
        <span class="order-status ${statusClass}">${order.status}</span>
      </div>
      <div class="order-items">
        ${items.slice(0, 3).map(item => `
          <div class="order-item-row">
            <img class="order-item-img" src="${getImageUrl(item.image)}" alt="${item.name}"
              onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&auto=format&fit=crop'">
            <div class="order-item-name">${item.name}</div>
            <div class="order-item-qty">x${item.quantity} ${item.unit}</div>
            <div class="order-item-price">₹${(item.price * item.quantity).toFixed(2)}</div>
          </div>
        `).join('')}
        ${items.length > 3 ? `<p style="font-size:12px;color:var(--text-light);padding:8px 0">+${items.length - 3} more items</p>` : ''}
      </div>
      <div class="order-footer">
        <div class="order-total">Total: ₹${order.totalAmount?.toFixed(2)}</div>
        <div class="order-actions">
          ${['placed','confirmed'].includes(order.status) ? `<button class="btn-sm btn-danger" onclick="cancelOrder('${order._id}')">Cancel</button>` : ''}
          ${order.status === 'delivered' && !order.isReviewed ? `<button class="btn-sm btn-info" onclick="openReview('${order._id}')">Review</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

async function cancelOrder(orderId) {
  if (!confirm('Are you sure you want to cancel this order?')) return;
  try {
    await api.put(`/orders/${orderId}/cancel`, { cancelReason: 'Cancelled by customer' });
    showToast('Order cancelled successfully', 'success');
    loadOverview();
    loadOrders();
  } catch(e) {
    showToast(e.message, 'error');
  }
}

function openReview(orderId) {
  const comment = prompt('Share your experience with this order:');
  if (!comment) return;
  const rating = parseInt(prompt('Rate your experience (1-5):') || '5');
  if (rating < 1 || rating > 5) { showToast('Rating must be between 1-5', 'error'); return; }
  submitReview(orderId, rating, comment);
}

async function submitReview(orderId, rating, comment) {
  try {
    await api.post('/reviews', { orderId, rating, comment });
    showToast('Review submitted! Thank you.', 'success');
    loadOrders();
  } catch(e) {
    showToast(e.message, 'error');
  }
}

async function loadProfileData() {
  try {
    const data = await api.get('/auth/me');
    const u = data.user;
    document.getElementById('profileName').value = u.name || '';
    document.getElementById('profileEmail').value = u.email || '';
    document.getElementById('profilePhone').value = u.phone || '';
  } catch(e) {}
}

async function loadAddressData() {
  try {
    const data = await api.get('/auth/me');
    const addr = data.user.address || {};
    document.getElementById('addrStreet').value = addr.street || '';
    document.getElementById('addrCity').value = addr.city || '';
    document.getElementById('addrState').value = addr.state || '';
    document.getElementById('addrPincode').value = addr.pincode || '';
  } catch(e) {}
}

async function updateProfile(e) {
  e.preventDefault();
  try {
    await api.put('/auth/profile', {
      name: document.getElementById('profileName').value,
      phone: document.getElementById('profilePhone').value
    });
    const user = Auth.getUser();
    user.name = document.getElementById('profileName').value;
    localStorage.setItem('km_user', JSON.stringify(user));
    document.getElementById('sidebarName').textContent = user.name;
    showToast('Profile updated successfully', 'success');
  } catch(e) {
    showToast(e.message, 'error');
  }
}

async function updateAddress(e) {
  e.preventDefault();
  try {
    await api.put('/auth/profile', {
      address: {
        street: document.getElementById('addrStreet').value,
        city: document.getElementById('addrCity').value,
        state: document.getElementById('addrState').value,
        pincode: document.getElementById('addrPincode').value
      }
    });
    showToast('Address saved successfully', 'success');
  } catch(e) {
    showToast(e.message, 'error');
  }
}

async function changePassword(e) {
  e.preventDefault();
  try {
    await api.put('/auth/change-password', {
      currentPassword: document.getElementById('currentPwd').value,
      newPassword: document.getElementById('newPwd').value
    });
    showToast('Password changed successfully', 'success');
    document.getElementById('currentPwd').value = '';
    document.getElementById('newPwd').value = '';
  } catch(e) {
    showToast(e.message, 'error');
  }
}
