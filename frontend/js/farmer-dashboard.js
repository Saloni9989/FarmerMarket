let farmerProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) { window.location.href = 'login.html'; return; }
  const user = Auth.getUser();
  if (user.role !== 'farmer') { window.location.href = 'index.html'; return; }

  document.getElementById('sidebarName').textContent = user.name;

  // Load farmer profile
  try {
    const data = await api.get('/farmers/me/profile');
    farmerProfile = data.farmer;
    updateVerificationBadge(farmerProfile.verificationStatus);
    if (farmerProfile.verificationStatus !== 'approved') {
      document.getElementById('setupBanner').style.display = 'flex';
    }
    populateFarmProfile(farmerProfile);
  } catch(e) {
    document.getElementById('setupBanner').style.display = 'flex';
  }

  loadDashboardStats();
  loadFarmerOrders();
});

function updateVerificationBadge(status) {
  const badge = document.getElementById('verificationBadge');
  const classes = { approved: 'badge-approved', pending: 'badge-pending', rejected: 'badge-rejected' };
  const labels = { approved: '✓ Verified', pending: '⏳ Pending', rejected: '✗ Rejected' };
  badge.className = `verified-badge ${classes[status] || 'badge-pending'}`;
  badge.textContent = labels[status] || 'Pending';
}

function showTab(tabName, link) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.getElementById(`tab-${tabName}`)?.classList.add('active');
  if (link) link.classList.add('active');

  if (tabName === 'products') loadMyProducts();
  if (tabName === 'orders') loadFarmerOrders();
}

async function loadDashboardStats() {
  try {
    const data = await api.get('/farmers/me/dashboard');
    const s = data.stats;
    document.getElementById('statProducts').textContent = s.totalProducts || 0;
    document.getElementById('statOrders').textContent = s.totalOrders || 0;
    document.getElementById('statPending').textContent = s.pendingOrders || 0;
    document.getElementById('statRevenue').textContent = `₹${(s.totalRevenue || 0).toLocaleString('en-IN')}`;

    const orders = data.recentOrders || [];
    const container = document.getElementById('recentOrdersList');
    if (orders.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-bag"></i><h3>No orders yet</h3><p>Orders will appear here once customers start purchasing</p></div>`;
    } else {
      container.innerHTML = orders.map(o => renderFarmerOrderCard(o)).join('');
    }
  } catch(e) {
    document.getElementById('recentOrdersList').innerHTML = `<p style="text-align:center;color:var(--text-light);padding:20px">Could not load dashboard data</p>`;
  }
}

async function loadMyProducts() {
  const container = document.getElementById('myProductsList');
  container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

  try {
    const data = await api.get('/products/farmer/my-products');
    const products = data.products || [];

    if (products.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><h3>No products listed</h3><p>Add your first product to start selling</p><button class="btn-primary" onclick="showTab('add-product',null)" style="margin-top:16px">Add Product</button></div>`;
    } else {
      container.innerHTML = products.map(p => renderProductItem(p)).join('');
    }
  } catch(e) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Could not load products</h3></div>`;
  }
}

function renderProductItem(p) {
  const img = getImageUrl(p.images?.[0]);
  return `
    <div class="product-table-item" id="pitem-${p._id}">
      <img class="product-table-img" src="${img}" alt="${p.name}"
        onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&auto=format&fit=crop'">
      <div>
        <div class="product-table-name">${p.name}</div>
        <div class="product-table-meta">${CATEGORIES[p.category]?.icon || ''} ${p.category} • Stock: ${p.availableQuantity} ${p.unit} ${p.isOrganic ? '• 🌿 Organic' : ''}</div>
        <div style="font-size:12px;color:var(--text-light)">Rating: ${generateStars(p.rating?.average || 0, p.rating?.count || 0)}</div>
      </div>
      <div class="product-table-price">₹${p.price}/${p.unit}</div>
      <label class="toggle-switch" title="${p.isAvailable ? 'Active' : 'Inactive'}">
        <input type="checkbox" ${p.isAvailable ? 'checked' : ''} onchange="toggleProduct('${p._id}', this.checked)">
        <span class="toggle-slider"></span>
      </label>
      <div style="display:flex;gap:8px">
        <button class="btn-sm btn-info" onclick="editProduct('${p._id}')"><i class="fas fa-edit"></i></button>
        <button class="btn-sm btn-danger" onclick="deleteProduct('${p._id}', '${p.name}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `;
}

async function toggleProduct(productId, isAvailable) {
  try {
    await api.put(`/products/${productId}`, { isAvailable });
    showToast(`Product ${isAvailable ? 'enabled' : 'disabled'}`, 'success');
  } catch(e) {
    showToast('Could not update product status', 'error');
  }
}

async function editProduct(productId) {
  try {
    const data = await api.get(`/products/${productId}`);
    const p = data.product;
    document.getElementById('editProductId').value = p._id;
    document.getElementById('pName').value = p.name;
    document.getElementById('pCategory').value = p.category;
    document.getElementById('pPrice').value = p.price;
    document.getElementById('pUnit').value = p.unit;
    document.getElementById('pQty').value = p.availableQuantity;
    document.getElementById('pDescription').value = p.description || '';
    document.getElementById('pOrganic').checked = p.isOrganic;
    document.getElementById('addProductTitle').textContent = 'Edit Product';
    document.getElementById('saveProductText').textContent = 'Update Product';
    showTab('add-product', document.querySelector('[onclick*="add-product"]'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch(e) {
    showToast('Could not load product', 'error');
  }
}

async function deleteProduct(productId, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await api.delete(`/products/${productId}`);
    showToast('Product deleted', 'success');
    loadMyProducts();
  } catch(e) {
    showToast(e.message, 'error');
  }
}

async function saveProduct(e) {
  e.preventDefault();

  if (farmerProfile?.verificationStatus !== 'approved') {
    showToast('Your account must be approved before listing products', 'warning');
    return;
  }

  const btn = document.getElementById('saveProductBtn');
  btn.disabled = true;
  const editId = document.getElementById('editProductId').value;

  const formData = new FormData();
  formData.append('name', document.getElementById('pName').value);
  formData.append('category', document.getElementById('pCategory').value);
  formData.append('price', document.getElementById('pPrice').value);
  formData.append('unit', document.getElementById('pUnit').value);
  formData.append('availableQuantity', document.getElementById('pQty').value);
  formData.append('description', document.getElementById('pDescription').value);
  formData.append('isOrganic', document.getElementById('pOrganic').checked);
  if (document.getElementById('pHarvestDate').value) {
    formData.append('harvestDate', document.getElementById('pHarvestDate').value);
  }

  const files = document.getElementById('pImages').files;
  for (let f of files) formData.append('images', f);

  try {
    if (editId) {
      await api.request('PUT', `/products/${editId}`, formData, true);
      showToast('Product updated successfully', 'success');
    } else {
      await api.request('POST', '/products', formData, true);
      showToast('Product listed successfully', 'success');
    }
    resetProductForm();
    showTab('products', null);
  } catch(e) {
    showToast(e.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

function resetProductForm() {
  document.getElementById('productForm').reset();
  document.getElementById('editProductId').value = '';
  document.getElementById('addProductTitle').textContent = 'Add New Product';
  document.getElementById('saveProductText').textContent = 'Save Product';
}

async function loadFarmerOrders(status = '') {
  const container = document.getElementById('farmerOrdersList');
  if (!container) return;
  container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

  try {
    const endpoint = status ? `/orders/farmer-orders?status=${status}` : '/orders/farmer-orders';
    const data = await api.get(endpoint);
    const orders = data.orders || [];

    if (orders.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-bag"></i><h3>No orders found</h3></div>`;
    } else {
      container.innerHTML = orders.map(o => renderFarmerOrderCard(o)).join('');
    }
  } catch(e) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Could not load orders</h3></div>`;
  }
}

function filterFarmerOrders(status, btn) {
  document.querySelectorAll('.order-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadFarmerOrders(status);
}

function renderFarmerOrderCard(order) {
  const consumer = order.consumer || {};
  const items = order.items || [];
  const statusClass = `status-${order.status}`;

  const nextStatus = {
    placed: 'confirmed',
    confirmed: 'processing',
    processing: 'dispatched',
    dispatched: 'delivered'
  };

  return `
    <div class="order-card">
      <div class="order-header">
        <div>
          <div class="order-number">Order #${order.orderNumber || order._id.slice(-8).toUpperCase()}</div>
          <div class="order-date">${formatDate(order.createdAt)} • ${consumer.name || 'Customer'}</div>
        </div>
        <span class="order-status ${statusClass}">${order.status}</span>
      </div>
      <div class="order-items">
        ${items.slice(0, 3).map(item => `
          <div class="order-item-row">
            <img class="order-item-img" src="${getImageUrl(item.image)}" alt="${item.name}"
              onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'">
            <div class="order-item-name">${item.name}</div>
            <div class="order-item-qty">x${item.quantity} ${item.unit}</div>
            <div class="order-item-price">₹${(item.price * item.quantity).toFixed(2)}</div>
          </div>
        `).join('')}
      </div>
      <div class="order-footer">
        <div>
          <div class="order-total">Total: ₹${order.totalAmount?.toFixed(2)}</div>
          <div style="font-size:12px;color:var(--text-light)">
            ${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''} • ${order.paymentMethod?.toUpperCase()}
          </div>
        </div>
        ${nextStatus[order.status] ? `
          <button class="update-status-btn" onclick="updateOrderStatus('${order._id}', '${nextStatus[order.status]}')">
            Mark as ${nextStatus[order.status]} <i class="fas fa-arrow-right"></i>
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    await api.put(`/orders/${orderId}/status`, { status: newStatus });
    showToast(`Order marked as ${newStatus}`, 'success');
    loadFarmerOrders();
    loadDashboardStats();
  } catch(e) {
    showToast(e.message, 'error');
  }
}

function populateFarmProfile(farmer) {
  if (!farmer) return;
  document.getElementById('fpFarmName').value = farmer.farmName || '';
  document.getElementById('fpFarmSize').value = farmer.farmSize || 'small';
  document.getElementById('fpDistrict').value = farmer.farmLocation?.district || '';
  document.getElementById('fpState').value = farmer.farmLocation?.state || '';
  document.getElementById('fpDescription').value = farmer.description || '';

  (farmer.farmingMethods || []).forEach(m => {
    const el = document.querySelector(`.fp-method[value="${m}"]`);
    if (el) el.checked = true;
  });
  (farmer.cropTypes || []).forEach(c => {
    const el = document.querySelector(`.fp-crop[value="${c}"]`);
    if (el) el.checked = true;
  });
}

async function saveFarmProfile(e) {
  e.preventDefault();
  const farmingMethods = [...document.querySelectorAll('.fp-method:checked')].map(el => el.value);
  const cropTypes = [...document.querySelectorAll('.fp-crop:checked')].map(el => el.value);

  const profileData = {
    farmName: document.getElementById('fpFarmName').value,
    farmSize: document.getElementById('fpFarmSize').value,
    farmLocation: {
      district: document.getElementById('fpDistrict').value,
      state: document.getElementById('fpState').value
    },
    farmingMethods,
    cropTypes,
    description: document.getElementById('fpDescription').value
  };

  try {
    if (farmerProfile) {
      await api.put('/farmers/profile', profileData);
      showToast('Farm profile updated successfully', 'success');
    } else {
      await api.post('/farmers/register', profileData);
      showToast('Farm profile created! Awaiting admin approval.', 'success');
    }
  } catch(e) {
    showToast(e.message, 'error');
  }
}
