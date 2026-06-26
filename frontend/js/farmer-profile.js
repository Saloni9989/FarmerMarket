document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const farmerId = params.get('id');

  if (!farmerId) {
    showError();
    return;
  }

  try {
    const data = await api.get(`/farmers/${farmerId}`);
    const farmer = data.farmer;
    const products = data.products || [];

    renderProfile(farmer);
    renderProducts(products, farmerId);
    loadReviews(farmerId);

    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('profileContent').style.display = 'block';
  } catch (err) {
    showError();
  }
});

function renderProfile(farmer) {
  const user = farmer.user || {};
  const loc = farmer.farmLocation || {};

  document.title = `${farmer.farmName || user.name} - Krishi Market`;

  // Avatar
  const avatar = document.getElementById('heroAvatar');
  if (farmer.profileImage) {
    avatar.innerHTML = `<img src="${getImageUrl(farmer.profileImage)}" alt="${user.name}">`;
  }

  // Basic info
  document.getElementById('farmerName').textContent = user.name || 'Farmer';
  document.getElementById('farmName').innerHTML = `<i class="fas fa-leaf"></i> ${farmer.farmName || ''}`;
  document.getElementById('farmerLocation').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${[loc.village, loc.district, loc.state].filter(Boolean).join(', ')}`;

  // Badges
  const badges = document.getElementById('farmerBadges');
  const methods = farmer.farmingMethods || [];
  badges.innerHTML = methods.map(m => `<span class="tag tag-white">${m}</span>`).join('');

  // Stats
  document.getElementById('statRating').textContent = farmer.rating?.average || '0';
  document.getElementById('statReviews').textContent = farmer.rating?.count || '0';

  // Details
  const sizeMap = { small: 'Small (< 5 acres)', medium: 'Medium (5-20 acres)', large: 'Large (> 20 acres)' };
  document.getElementById('farmSize').textContent = sizeMap[farmer.farmSize] || farmer.farmSize || '-';
  document.getElementById('farmFullLocation').textContent = [loc.village, loc.district, loc.state, loc.pincode].filter(Boolean).join(', ') || '-';
  document.getElementById('farmMethods').textContent = (farmer.farmingMethods || []).join(', ') || '-';
  document.getElementById('farmCrops').textContent = (farmer.cropTypes || []).join(', ') || '-';

  const vStatus = farmer.verificationStatus;
  const vBadge = { approved: '✓ Verified Farmer', pending: '⏳ Pending Verification', rejected: '✗ Not Verified' };
  document.getElementById('farmVerification').innerHTML = `<span class="verified-badge badge-${vStatus}">${vBadge[vStatus] || vStatus}</span>`;

  document.getElementById('farmDescription').textContent = farmer.description || 'This farmer has not added a description yet.';

  // Contact
  document.getElementById('contactName').textContent = user.name || '-';
  document.getElementById('contactPhone').textContent = user.phone || 'Not provided';
  document.getElementById('contactEmail').textContent = user.email || '-';
}

function renderProducts(products, farmerId) {
  const grid = document.getElementById('farmerProductsGrid');
  const viewAll = document.getElementById('viewAllProducts');
  viewAll.href = `products.html?farmer=${farmerId}`;

  document.getElementById('statProducts').textContent = products.length;

  if (products.length === 0) {
    grid.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><h3>No products listed yet</h3></div>`;
    return;
  }

  grid.innerHTML = products.map(p => {
    const img = getImageUrl(p.images?.[0]);
    const isOutOfStock = p.availableQuantity === 0;
    return `
      <div class="product-card">
        <div class="product-img" onclick="window.location.href='product-detail.html?id=${p._id}'" style="cursor:pointer">
          <img src="${img}" alt="${p.name}" loading="lazy"
            onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop'">
          ${p.isOrganic ? '<span class="product-badge badge-organic">Organic</span>' : ''}
          ${isOutOfStock ? '<span class="product-badge badge-out">Out of Stock</span>' : ''}
        </div>
        <div class="product-body">
          <div class="product-category">${CATEGORIES[p.category]?.icon || ''} ${p.category}</div>
          <div class="product-name">${p.name}</div>
          <div class="product-rating">${generateStars(p.rating?.average || 0, p.rating?.count || 0)}</div>
          <div class="product-footer">
            <div class="product-price">₹${p.price} <span>/${p.unit}</span></div>
            <button class="add-to-cart" onclick="addToCartFromProfile(event, ${JSON.stringify(JSON.stringify(p))})" ${isOutOfStock ? 'disabled' : ''}>
              <i class="fas fa-cart-plus"></i> Add
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function addToCartFromProfile(event, productJson) {
  event.stopPropagation();
  try {
    const product = JSON.parse(productJson);
    Cart.add(product);
  } catch(e) {
    showToast('Could not add to cart', 'error');
  }
}

async function loadReviews(farmerId) {
  const container = document.getElementById('farmerReviews');
  try {
    const data = await api.get(`/reviews/farmer/${farmerId}`);
    const reviews = data.reviews || [];

    if (reviews.length === 0) {
      container.innerHTML = `<div class="empty-state" style="padding:30px 0"><i class="fas fa-star"></i><h3>No reviews yet</h3><p>Be the first to review this farmer</p></div>`;
      return;
    }

    container.innerHTML = reviews.map(r => `
      <div class="review-card">
        <div class="review-header">
          <div class="reviewer-name"><i class="fas fa-user-circle" style="color:var(--primary)"></i> ${r.consumer?.name || 'Customer'}</div>
          <div class="review-date">${formatDate(r.createdAt)}</div>
        </div>
        <div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
        <div class="review-comment">${r.comment || ''}</div>
      </div>
    `).join('');
  } catch(e) {
    container.innerHTML = `<p style="color:var(--text-light);font-size:14px;padding:20px 0">Could not load reviews</p>`;
  }
}

function showError() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('errorState').style.display = 'block';
}
