let currentProduct = null;

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId) { showError(); return; }

  try {
    const data = await api.get(`/products/${productId}`);
    currentProduct = data.product;
    const reviews = data.reviews || [];

    renderProduct(currentProduct);
    renderReviews(reviews);

    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('productContent').style.display = 'block';
  } catch (err) {
    // Try demo fallback
    const demo = getDemoProduct(productId);
    if (demo) {
      currentProduct = demo;
      renderProduct(demo);
      renderReviews([]);
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('productContent').style.display = 'block';
    } else {
      showError();
    }
  }
});

function renderProduct(p) {
  const farmer = p.farmer || {};
  const farmerUser = farmer.user || {};

  document.title = `${p.name} - Krishi Market`;
  document.getElementById('breadProduct').textContent = p.name;

  // Images
  const images = p.images?.length ? p.images : ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop'];
  const mainImg = document.getElementById('mainImage');
  mainImg.src = getImageUrl(images[0]);
  mainImg.alt = p.name;

  const thumbs = document.getElementById('thumbImages');
  if (images.length > 1) {
    thumbs.innerHTML = images.map((img, i) => `
      <img class="thumb-img ${i === 0 ? 'active' : ''}" src="${getImageUrl(img)}" alt="${p.name}"
        onclick="switchImage(this, '${getImageUrl(img)}')"
        onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop'">
    `).join('');
  }

  // Organic badge
  if (p.isOrganic) document.getElementById('organicBadge').style.display = 'flex';

  // Category
  document.getElementById('detailCategory').innerHTML = `${CATEGORIES[p.category]?.icon || ''} ${p.category}`;

  // Name
  document.getElementById('detailName').textContent = p.name;

  // Rating
  document.getElementById('detailRating').innerHTML = generateStars(p.rating?.average || 0, p.rating?.count || 0);

  // Price
  document.getElementById('detailPrice').innerHTML = `₹${p.price} <span style="font-size:16px;font-weight:400;color:var(--text-light)">per ${p.unit}</span>`;

  // Stock
  const stockEl = document.getElementById('detailStock');
  const addBtn = document.getElementById('addToCartBtn');
  if (p.availableQuantity === 0) {
    stockEl.textContent = 'Out of Stock';
    stockEl.className = 'detail-stock out-stock';
    addBtn.disabled = true;
  } else if (p.availableQuantity < 10) {
    stockEl.textContent = `Only ${p.availableQuantity} left`;
    stockEl.className = 'detail-stock low-stock';
  } else {
    stockEl.textContent = 'In Stock';
    stockEl.className = 'detail-stock in-stock';
  }

  // Set max qty
  document.getElementById('qtyInput').max = p.availableQuantity || 100;

  // Description
  document.getElementById('detailDescription').textContent = p.description || 'No description available.';

  // Farmer
  const farmerId = farmer._id || farmer;
  document.getElementById('detailFarmer').innerHTML = `
    <div class="detail-farmer-avatar"><i class="fas fa-user"></i></div>
    <div>
      <div class="detail-farmer-name">${farmerUser.name || 'Local Farmer'}</div>
      <div class="detail-farmer-farm">${farmer.farmName || ''}</div>
    </div>
    <i class="fas fa-chevron-right detail-farmer-arrow"></i>
  `;
  document.getElementById('detailFarmer').onclick = () => {
    if (farmerId) window.location.href = `farmer-profile.html?id=${farmerId}`;
  };

  // Meta
  let metaHtml = '';
  if (p.harvestDate) metaHtml += `<span><i class="fas fa-calendar"></i> Harvested: ${formatDate(p.harvestDate)}</span>`;
  if (p.expiryDate) metaHtml += `<span><i class="fas fa-clock"></i> Best before: ${formatDate(p.expiryDate)}</span>`;
  if (p.minOrderQuantity > 1) metaHtml += `<span><i class="fas fa-box"></i> Min order: ${p.minOrderQuantity} ${p.unit}</span>`;
  document.getElementById('detailMeta').innerHTML = metaHtml;

  // Tags
  if (p.tags?.length) {
    document.getElementById('detailTags').innerHTML = p.tags.map(t => `<span class="tag">${t}</span>`).join('');
  }
}

function switchImage(el, src) {
  document.getElementById('mainImage').src = src;
  document.querySelectorAll('.thumb-img').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}

function changeQty(delta) {
  const input = document.getElementById('qtyInput');
  const val = parseInt(input.value) + delta;
  const max = parseInt(input.max) || 100;
  input.value = Math.min(Math.max(1, val), max);
}

function addToCartDetail() {
  if (!currentProduct) return;
  const qty = parseInt(document.getElementById('qtyInput').value) || 1;
  Cart.add(currentProduct, qty);
}

function renderReviews(reviews) {
  const container = document.getElementById('reviewsList');
  if (reviews.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:30px 0"><i class="fas fa-star"></i><h3>No reviews yet</h3><p>Purchase this product to leave a review</p></div>`;
    return;
  }
  container.innerHTML = reviews.map(r => `
    <div class="review-item">
      <div class="review-item-header">
        <div class="reviewer"><i class="fas fa-user-circle"></i> ${r.consumer?.name || 'Customer'} <span class="verified-purchase">Verified Purchase</span></div>
        <span style="font-size:12px;color:var(--text-light)">${formatDate(r.createdAt)}</span>
      </div>
      <div class="review-item-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
      <div class="review-item-text">${r.comment || ''}</div>
    </div>
  `).join('');
}

function showError() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('errorState').style.display = 'block';
}

// Demo fallback data
function getDemoProduct(id) {
  const demos = {
    'd1': { _id: 'd1', name: 'Fresh Tomatoes', category: 'vegetables', price: 40, unit: 'kg', isOrganic: true, availableQuantity: 50, description: 'Fresh hand-picked organic tomatoes.', images: ['https://images.unsplash.com/photo-1546094096-0df4bcabd337?w=600&auto=format&fit=crop'], rating: { average: 4.5, count: 23 }, farmer: { user: { name: 'Rajesh Kumar' }, farmName: 'Green Fields Farm' }, tags: ['fresh', 'organic'] }
  };
  return demos[id] || null;
}
