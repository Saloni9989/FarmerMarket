document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) { window.location.href = 'login.html'; return; }
  const user = Auth.getUser();
  if (user.role !== 'admin') { window.location.href = 'index.html'; return; }

  document.getElementById('sidebarName').textContent = user.name;
  document.getElementById('userName').textContent = user.name.split(' ')[0];

  loadOverview();
});

function showTab(tabName, link) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.getElementById(`tab-${tabName}`)?.classList.add('active');
  if (link) link.classList.add('active');

  if (tabName === 'farmers') loadAdminFarmers('', document.querySelector('.order-filter.active'));
  if (tabName === 'consumers') loadAdminConsumers();
  if (tabName === 'products') loadAdminProducts();
  if (tabName === 'orders') loadAdminOrders('', document.querySelector('.order-filter.active'));
}

async function loadOverview() {
  try {
    const data = await api.get('/admin/dashboard');
    const s = data.stats;

    document.getElementById('sTotalFarmers').textContent = s.totalFarmers || 0;
    document.getElementById('sTotalUsers').textContent = s.totalUsers || 0;
    document.getElementById('sTotalOrders').textContent = s.totalOrders || 0;
    document.getElementById('sTotalRevenue').textContent = `₹${(s.totalRevenue || 0).toLocaleString('en-IN')}`;

    // Pending farmers
    const pf = document.getElementById('pendingFarmersList');
    const pending = data.pendingFarmers || [];
    if (pending.length === 0) {
      pf.innerHTML = `<p style="color:var(--text-light);font-size:14px;padding:20px;text-align:center">No pending approvals</p>`;
    } else {
      pf.innerHTML = pending.map(f => renderApprovalCard(f)).join('');
    }

    // Recent orders
    const ro = document.getElementById('adminRecentOrders');
    const orders = data.recentOrders || [];
    ro.innerHTML = orders.map(o => `
      <div class="approval-card">
        <div class="approval-card-header">
          <div class="approval-card-name">#${o.orderNumber || o._id.slice(-8).toUpperCase()}</div>
          <span class="order-status status-${o.status}">${o.status}</span>
        </div>
        <div class="approval-card-meta">${o.consumer?.name || 'Customer'} • ₹${o.totalAmount?.toFixed(2)} • ${formatDate(o.createdAt)}</div>
      </div>
    `).join('');
  } catch(e) {
    showToast('Could not load dashboard: ' + e.message, 'error');
  }
}

function renderApprovalCard(f) {
  const user = f.user || {};
  const location = f.farmLocation || {};
  return `
    <div class="approval-card">
      <div class="approval-card-header">
        <div>
          <div class="approval-card-name">${f.farmName || 'Farm'}</div>
          <span class="verified-badge badge-${f.verificationStatus}">${f.verificationStatus}</span>
        </div>
      </div>
      <div class="approval-card-meta">
        <i class="fas fa-user"></i> ${user.name || 'Farmer'} • ${user.email || ''}<br>
        <i class="fas fa-map-marker-alt"></i> ${location.district || ''} ${location.state || ''}<br>
        <i class="fas fa-leaf"></i> ${(f.cropTypes || []).join(', ')}
      </div>
      <div class="approval-actions">
        <button class="btn-approve" onclick="verifyFarmer('${f._id}', 'approved')"><i class="fas fa-check"></i> Approve</button>
        <button class="btn-reject" onclick="verifyFarmer('${f._id}', 'rejected')"><i class="fas fa-times"></i> Reject</button>
      </div>
    </div>
  `;
}

async function verifyFarmer(farmerId, status) {
  const note = status === 'rejected' ? prompt('Rejection reason (optional):') : '';
  try {
    await api.put(`/admin/farmers/${farmerId}/verify`, { status, note });
    showToast(`Farmer ${status} successfully`, 'success');
    loadOverview();
    if (document.getElementById('tab-farmers').classList.contains('active')) {
      loadAdminFarmers();
    }
  } catch(e) {
    showToast(e.message, 'error');
  }
}

async function loadAdminFarmers(status = '', btn = null) {
  if (btn) {
    document.querySelectorAll('#tab-farmers .order-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  const container = document.getElementById('farmersList');
  container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

  try {
    const endpoint = status ? `/admin/farmers?status=${status}` : '/admin/farmers';
    const data = await api.get(endpoint);
    const farmers = data.farmers || [];

    if (farmers.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-tractor"></i><h3>No farmers found</h3></div>`;
      return;
    }

    container.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr>
            <th>Farm Name</th><th>Farmer</th><th>Location</th><th>Crops</th><th>Status</th><th>Joined</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${farmers.map(f => `
              <tr>
                <td><strong>${f.farmName || 'N/A'}</strong></td>
                <td>${f.user?.name || 'N/A'}<br><small style="color:var(--text-light)">${f.user?.email || ''}</small></td>
                <td>${f.farmLocation?.district || ''} ${f.farmLocation?.state || ''}</td>
                <td>${(f.cropTypes || []).join(', ')}</td>
                <td><span class="verified-badge badge-${f.verificationStatus}">${f.verificationStatus}</span></td>
                <td>${formatDate(f.createdAt)}</td>
                <td>
                  ${f.verificationStatus === 'pending' ? `
                    <button class="btn-sm btn-info" onclick="verifyFarmer('${f._id}','approved')">Approve</button>
                    <button class="btn-sm btn-danger" onclick="verifyFarmer('${f._id}','rejected')">Reject</button>
                  ` : f.verificationStatus === 'approved' ? `
                    <button class="btn-sm btn-danger" onclick="verifyFarmer('${f._id}','rejected')">Revoke</button>
                  ` : `
                    <button class="btn-sm btn-info" onclick="verifyFarmer('${f._id}','approved')">Re-Approve</button>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch(e) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Could not load farmers</h3></div>`;
  }
}

async function loadAdminConsumers() {
  const container = document.getElementById('consumersList');
  container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

  try {
    const data = await api.get('/admin/users?role=consumer');
    const users = data.users || [];

    container.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr>
            <th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Joined</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td><strong>${u.name}</strong></td>
                <td>${u.email}</td>
                <td>${u.phone || 'N/A'}</td>
                <td><span class="verified-badge ${u.isActive ? 'badge-approved' : 'badge-rejected'}">${u.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>${formatDate(u.createdAt)}</td>
                <td><button class="btn-sm ${u.isActive ? 'btn-danger' : 'btn-info'}" onclick="toggleUser('${u._id}', this)">${u.isActive ? 'Deactivate' : 'Activate'}</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch(e) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Could not load users</h3></div>`;
  }
}

async function toggleUser(userId, btn) {
  try {
    const data = await api.put(`/admin/users/${userId}/toggle`);
    showToast(`User ${data.user.isActive ? 'activated' : 'deactivated'}`, 'success');
    loadAdminConsumers();
  } catch(e) {
    showToast(e.message, 'error');
  }
}

async function loadAdminProducts() {
  const container = document.getElementById('adminProductsList');
  container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

  try {
    const data = await api.get('/admin/products');
    const products = data.products || [];

    container.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr>
            <th>Product</th><th>Farmer</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td><strong>${p.name}</strong> ${p.isOrganic ? '<span style="font-size:11px;color:var(--primary)">🌿 Organic</span>' : ''}</td>
                <td>${p.farmer?.user?.name || 'N/A'}</td>
                <td>${CATEGORIES[p.category]?.icon || ''} ${p.category}</td>
                <td>₹${p.price}/${p.unit}</td>
                <td>${p.availableQuantity} ${p.unit}</td>
                <td><span class="verified-badge ${p.isAvailable ? 'badge-approved' : 'badge-rejected'}">${p.isAvailable ? 'Active' : 'Inactive'}</span></td>
                <td><button class="btn-sm ${p.isAvailable ? 'btn-danger' : 'btn-info'}" onclick="toggleProduct('${p._id}', this)">${p.isAvailable ? 'Disable' : 'Enable'}</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch(e) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Could not load products</h3></div>`;
  }
}

async function toggleProduct(productId, btn) {
  try {
    const data = await api.put(`/admin/products/${productId}/toggle`);
    showToast(`Product ${data.product.isAvailable ? 'enabled' : 'disabled'}`, 'success');
    loadAdminProducts();
  } catch(e) {
    showToast(e.message, 'error');
  }
}

async function loadAdminOrders(status = '', btn = null) {
  if (btn) {
    document.querySelectorAll('#tab-orders .order-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  const container = document.getElementById('adminOrdersList');
  container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

  try {
    const endpoint = status ? `/admin/orders?status=${status}` : '/admin/orders';
    const data = await api.get(endpoint);
    const orders = data.orders || [];

    container.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr>
            <th>Order #</th><th>Customer</th><th>Items</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th>
          </tr></thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td><strong>${o.orderNumber || o._id.slice(-8).toUpperCase()}</strong></td>
                <td>${o.consumer?.name || 'N/A'}<br><small style="color:var(--text-light)">${o.consumer?.email || ''}</small></td>
                <td>${o.items?.length || 0} item(s)</td>
                <td><strong>₹${o.totalAmount?.toFixed(2)}</strong></td>
                <td><span style="text-transform:uppercase;font-size:11px">${o.paymentMethod || 'COD'}</span></td>
                <td><span class="order-status status-${o.status}">${o.status}</span></td>
                <td>${formatDate(o.createdAt)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch(e) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Could not load orders</h3></div>`;
  }
}
