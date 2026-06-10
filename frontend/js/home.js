document.addEventListener('DOMContentLoaded', async () => {
  loadCategories();
  loadFeaturedProducts();
  loadFeaturedFarmers();
});

function loadCategories() {
  const grid = document.getElementById('categoriesGrid');
  if (!grid) return;

  const cats = Object.entries(CATEGORIES);
  grid.innerHTML = cats.map(([key, cat]) => `
    <a href="products.html?category=${key}" class="category-card">
      <span class="cat-icon">${cat.icon}</span>
      <h4>${cat.label}</h4>
    </a>
  `).join('');
}

async function loadFeaturedProducts() {
  const grid = document.getElementById('featuredProducts');
  if (!grid) return;

  try {
    const data = await api.get('/products/featured');
    if (data.products && data.products.length > 0) {
      grid.innerHTML = data.products.map(p => createProductCard(p)).join('');
    } else {
      grid.innerHTML = `<div class="empty-state">
        <i class="fas fa-seedling"></i>
        <h3>Products coming soon</h3>
        <p>Our farmers are preparing fresh listings</p>
      </div>`;
    }
  } catch (err) {
    grid.innerHTML = getDemoProducts().map(p => createProductCard(p)).join('');
  }
}

async function loadFeaturedFarmers() {
  const grid = document.getElementById('featuredFarmers');
  if (!grid) return;

  try {
    const data = await api.get('/farmers?limit=4');
    if (data.farmers && data.farmers.length > 0) {
      grid.innerHTML = data.farmers.map(f => createFarmerCard(f)).join('');
    } else {
      grid.innerHTML = getDemoFarmers().map(f => createFarmerCard(f)).join('');
    }
  } catch (err) {
    grid.innerHTML = getDemoFarmers().map(f => createFarmerCard(f)).join('');
  }
}

function createProductCard(p) {
  const farmer = p.farmer;
  const farmerName = farmer?.user?.name || farmer?.farmName || 'Local Farmer';
  const img = getImageUrl(p.images?.[0]);
  const isOutOfStock = p.availableQuantity === 0;

  return `
    <div class="product-card">
      <div class="product-img">
        <img src="${img}" alt="${p.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop'">
        <div class="product-actions-overlay">
          <button class="action-btn" onclick="window.location.href='product-detail.html?id=${p._id}'" title="View Details">
            <i class="fas fa-eye"></i>
          </button>
        </div>
        ${p.isOrganic ? '<span class="product-badge badge-organic">Organic</span>' : ''}
        ${isOutOfStock ? '<span class="product-badge badge-out">Out of Stock</span>' : ''}
      </div>
      <div class="product-body">
        <div class="product-category">${CATEGORIES[p.category]?.icon || ''} ${p.category}</div>
        <div class="product-name" title="${p.name}">${p.name}</div>
        <div class="product-farmer"><i class="fas fa-user-circle"></i> ${farmerName}</div>
        <div class="product-rating">${generateStars(p.rating?.average || 0, p.rating?.count || 0)}</div>
        <div class="product-footer">
          <div class="product-price">₹${p.price} <span>/${p.unit}</span></div>
          <button class="add-to-cart" onclick="addToCart(event, ${JSON.stringify(JSON.stringify(p))})" ${isOutOfStock ? 'disabled' : ''}>
            <i class="fas fa-cart-plus"></i> Add
          </button>
        </div>
      </div>
    </div>
  `;
}

function createFarmerCard(f) {
  const user = f.user || {};
  const location = f.farmLocation || {};
  const methods = (f.farmingMethods || []).slice(0, 2);
  const crops = (f.cropTypes || []).slice(0, 2);

  return `
    <a href="farmer-profile.html?id=${f._id}" class="farmer-card" style="text-decoration:none;color:inherit;">
      <div class="farmer-avatar">
        ${f.profileImage ? `<img src="${getImageUrl(f.profileImage)}" alt="${user.name}">` : '<i class="fas fa-user"></i>'}
      </div>
      <div class="farmer-name">${user.name || 'Farmer'}</div>
      <div class="farmer-farm">${f.farmName || ''}</div>
      <div class="farmer-location">
        <i class="fas fa-map-marker-alt"></i>
        ${location.district ? location.district + ', ' : ''}${location.state || 'India'}
      </div>
      <div class="farmer-tags">
        ${methods.map(m => `<span class="tag tag-method">${m}</span>`).join('')}
        ${crops.map(c => `<span class="tag tag-crop">${c}</span>`).join('')}
      </div>
      <div class="product-rating" style="justify-content:center">
        ${generateStars(f.rating?.average || 0, f.rating?.count || 0)}
      </div>
    </a>
  `;
}

function addToCart(event, productJson) {
  event.stopPropagation();
  try {
    const product = JSON.parse(productJson);
    Cart.add(product);
  } catch(e) {
    showToast('Could not add to cart', 'error');
  }
}

// Demo data fallback
function getDemoProducts() {
  return [
    { _id: 'd1', name: 'Fresh Tomatoes', category: 'vegetables', price: 40, unit: 'kg', isOrganic: true, availableQuantity: 50, images: ['https://images.unsplash.com/photo-1546094096-0df4bcabd337?w=400&auto=format&fit=crop'], rating: { average: 4.5, count: 23 }, farmer: { user: { name: 'Rajesh Kumar' }, farmName: 'Green Fields Farm' } },
    { _id: 'd2', name: 'Organic Spinach', category: 'vegetables', price: 30, unit: 'bundle', isOrganic: true, availableQuantity: 30, images: ['https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&auto=format&fit=crop'], rating: { average: 4.2, count: 15 }, farmer: { user: { name: 'Priya Sharma' }, farmName: 'Nature\'s Best' } },
    { _id: 'd3', name: 'Alphonso Mangoes', category: 'fruits', price: 200, unit: 'dozen', isOrganic: false, availableQuantity: 20, images: ['https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=400&auto=format&fit=crop'], rating: { average: 4.8, count: 42 }, farmer: { user: { name: 'Suresh Patil' }, farmName: 'Konkan Orchards' } },
    { _id: 'd4', name: 'Fresh Milk', category: 'dairy', price: 60, unit: 'litre', isOrganic: false, availableQuantity: 100, images: ['https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop'], rating: { average: 4.6, count: 56 }, farmer: { user: { name: 'Anita Devi' }, farmName: 'Gau Mata Dairy' } },
    { _id: 'd5', name: 'Basmati Rice', category: 'grains', price: 120, unit: 'kg', isOrganic: true, availableQuantity: 200, images: ['https://images.unsplash.com/photo-1536304993881-ff86e0c9f5cf?w=400&auto=format&fit=crop'], rating: { average: 4.4, count: 31 }, farmer: { user: { name: 'Harpreet Singh' }, farmName: 'Punjab Fields' } },
    { _id: 'd6', name: 'Red Carrots', category: 'vegetables', price: 35, unit: 'kg', isOrganic: false, availableQuantity: 60, images: ['https://images.unsplash.com/photo-1447175008436-054170c2e979?w=400&auto=format&fit=crop'], rating: { average: 4.1, count: 18 }, farmer: { user: { name: 'Mohan Lal' }, farmName: 'Hill Garden Farm' } },
    { _id: 'd7', name: 'Turmeric Powder', category: 'spices', price: 180, unit: 'kg', isOrganic: true, availableQuantity: 40, images: ['https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&auto=format&fit=crop'], rating: { average: 4.7, count: 27 }, farmer: { user: { name: 'Savita Reddy' }, farmName: 'Spice Garden' } },
    { _id: 'd8', name: 'Fresh Paneer', category: 'dairy', price: 280, unit: 'kg', isOrganic: false, availableQuantity: 15, images: ['https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&auto=format&fit=crop'], rating: { average: 4.3, count: 19 }, farmer: { user: { name: 'Ramesh Yadav' }, farmName: 'Desi Dairy Farm' } }
  ];
}

function getDemoFarmers() {
  return [
    { _id: 'f1', farmName: 'Green Fields Farm', farmingMethods: ['organic', 'natural'], cropTypes: ['vegetables', 'fruits'], farmLocation: { district: 'Nashik', state: 'Maharashtra' }, rating: { average: 4.6, count: 34 }, user: { name: 'Rajesh Kumar' } },
    { _id: 'f2', farmName: 'Konkan Orchards', farmingMethods: ['conventional'], cropTypes: ['fruits', 'spices'], farmLocation: { district: 'Ratnagiri', state: 'Maharashtra' }, rating: { average: 4.8, count: 52 }, user: { name: 'Suresh Patil' } },
    { _id: 'f3', farmName: 'Punjab Fields', farmingMethods: ['organic'], cropTypes: ['grains', 'pulses'], farmLocation: { district: 'Amritsar', state: 'Punjab' }, rating: { average: 4.4, count: 28 }, user: { name: 'Harpreet Singh' } },
    { _id: 'f4', farmName: 'Gau Mata Dairy', farmingMethods: ['natural'], cropTypes: ['dairy'], farmLocation: { district: 'Anand', state: 'Gujarat' }, rating: { average: 4.7, count: 61 }, user: { name: 'Anita Devi' } }
  ];
}
