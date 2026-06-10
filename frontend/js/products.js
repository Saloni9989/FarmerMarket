let currentPage = 1;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', () => {
  // Read URL params
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  const search = params.get('search');

  if (category) {
    const radio = document.querySelector(`input[name="category"][value="${category}"]`);
    if (radio) radio.checked = true;
    document.getElementById('pageTitle').textContent = CATEGORIES[category]?.label || 'Products';
  }
  if (search) {
    document.getElementById('navSearch').value = search;
    document.getElementById('pageTitle').textContent = `Search: "${search}"`;
  }

  // Add event listeners to filters
  document.querySelectorAll('input[name="category"]').forEach(r => r.addEventListener('change', () => { currentPage = 1; loadProducts(); }));
  document.getElementById('organicFilter')?.addEventListener('change', () => { currentPage = 1; loadProducts(); });

  loadProducts();
});

function getFilters() {
  const params = new URLSearchParams(window.location.search);
  const catRadio = document.querySelector('input[name="category"]:checked');

  return {
    category: catRadio?.value || params.get('category') || '',
    isOrganic: document.getElementById('organicFilter')?.checked || false,
    minPrice: document.getElementById('minPrice')?.value || '',
    maxPrice: document.getElementById('maxPrice')?.value || '',
    sort: document.getElementById('sortFilter')?.value || '-createdAt',
    search: document.getElementById('navSearch')?.value || params.get('search') || '',
    page: currentPage,
    limit: 12
  };
}

async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading products...</div>';

  const f = getFilters();
  let queryParts = [];

  if (f.category) queryParts.push(`category=${f.category}`);
  if (f.isOrganic) queryParts.push(`isOrganic=true`);
  if (f.minPrice) queryParts.push(`minPrice=${f.minPrice}`);
  if (f.maxPrice) queryParts.push(`maxPrice=${f.maxPrice}`);
  if (f.sort) queryParts.push(`sort=${f.sort}`);
  if (f.search) queryParts.push(`search=${encodeURIComponent(f.search)}`);
  queryParts.push(`page=${f.page}`, `limit=${f.limit}`);

  try {
    const data = await api.get(`/products?${queryParts.join('&')}`);
    totalPages = data.pages || 1;

    const countEl = document.getElementById('productCount');
    if (countEl) countEl.textContent = `${data.total || 0} products`;

    if (data.products && data.products.length > 0) {
      grid.innerHTML = data.products.map(p => createProductCard(p)).join('');
    } else {
      grid.innerHTML = `<div class="empty-state">
        <i class="fas fa-search"></i>
        <h3>No products found</h3>
        <p>Try changing filters or search terms</p>
      </div>`;
    }

    renderPagination();
    updateActiveFilters(f);
  } catch (err) {
    // Use demo data on error
    const demoImport = getDemoProducts();
    grid.innerHTML = demoImport.map(p => createProductCard(p)).join('');
    document.getElementById('productCount').textContent = `${demoImport.length} products`;
  }
}

function applyFilters() {
  currentPage = 1;
  loadProducts();
}

function clearFilters() {
  document.querySelectorAll('input[name="category"]')[0].checked = true;
  document.getElementById('organicFilter').checked = false;
  document.getElementById('minPrice').value = '';
  document.getElementById('maxPrice').value = '';
  document.getElementById('sortFilter').value = '-createdAt';
  document.getElementById('navSearch').value = '';
  currentPage = 1;
  window.history.pushState({}, '', 'products.html');
  document.getElementById('pageTitle').textContent = 'All Products';
  loadProducts();
}

function toggleFilters() {
  document.getElementById('filtersSidebar').classList.toggle('open');
}

function renderPagination() {
  const pag = document.getElementById('pagination');
  if (!pag || totalPages <= 1) { if (pag) pag.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
    <i class="fas fa-chevron-left"></i>
  </button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      html += `<span style="padding:0 6px;color:var(--text-light)">...</span>`;
    }
  }

  html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
    <i class="fas fa-chevron-right"></i>
  </button>`;

  pag.innerHTML = html;
}

function goToPage(page) {
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  loadProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateActiveFilters(f) {
  const container = document.getElementById('activeFilters');
  if (!container) return;

  let chips = '';
  if (f.category) chips += `<span class="filter-chip">${CATEGORIES[f.category]?.label} <button onclick="removeFilter('category')"><i class="fas fa-times"></i></button></span>`;
  if (f.isOrganic) chips += `<span class="filter-chip">Organic <button onclick="removeFilter('organic')"><i class="fas fa-times"></i></button></span>`;
  if (f.search) chips += `<span class="filter-chip">Search: ${f.search} <button onclick="removeFilter('search')"><i class="fas fa-times"></i></button></span>`;

  container.innerHTML = chips;
}

function removeFilter(type) {
  if (type === 'category') document.querySelectorAll('input[name="category"]')[0].checked = true;
  if (type === 'organic') document.getElementById('organicFilter').checked = false;
  if (type === 'search') { document.getElementById('navSearch').value = ''; window.history.pushState({}, '', 'products.html'); }
  currentPage = 1;
  loadProducts();
}

function createProductCard(p) {
  const farmer = p.farmer;
  const farmerName = farmer?.user?.name || farmer?.farmName || 'Local Farmer';
  const img = getImageUrl(p.images?.[0]);
  const isOutOfStock = p.availableQuantity === 0;

  return `
    <div class="product-card">
      <div class="product-img" onclick="window.location.href='product-detail.html?id=${p._id}'" style="cursor:pointer">
        <img src="${img}" alt="${p.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop'">
        <div class="product-actions-overlay">
          <button class="action-btn" title="View Details"><i class="fas fa-eye"></i></button>
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

function addToCart(event, productJson) {
  event.stopPropagation();
  try {
    const product = JSON.parse(productJson);
    Cart.add(product);
  } catch(e) {
    showToast('Could not add to cart', 'error');
  }
}

function getDemoProducts() {
  return [
    { _id: 'd1', name: 'Fresh Tomatoes', category: 'vegetables', price: 40, unit: 'kg', isOrganic: true, availableQuantity: 50, images: ['https://images.unsplash.com/photo-1546094096-0df4bcabd337?w=400&auto=format&fit=crop'], rating: { average: 4.5, count: 23 }, farmer: { user: { name: 'Rajesh Kumar' } } },
    { _id: 'd2', name: 'Organic Spinach', category: 'vegetables', price: 30, unit: 'bundle', isOrganic: true, availableQuantity: 30, images: ['https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&auto=format&fit=crop'], rating: { average: 4.2, count: 15 }, farmer: { user: { name: 'Priya Sharma' } } },
    { _id: 'd3', name: 'Alphonso Mangoes', category: 'fruits', price: 200, unit: 'dozen', isOrganic: false, availableQuantity: 20, images: ['https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=400&auto=format&fit=crop'], rating: { average: 4.8, count: 42 }, farmer: { user: { name: 'Suresh Patil' } } },
    { _id: 'd4', name: 'Fresh Milk', category: 'dairy', price: 60, unit: 'litre', isOrganic: false, availableQuantity: 100, images: ['https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop'], rating: { average: 4.6, count: 56 }, farmer: { user: { name: 'Anita Devi' } } },
    { _id: 'd5', name: 'Basmati Rice', category: 'grains', price: 120, unit: 'kg', isOrganic: true, availableQuantity: 200, images: ['https://images.unsplash.com/photo-1536304993881-ff86e0c9f5cf?w=400&auto=format&fit=crop'], rating: { average: 4.4, count: 31 }, farmer: { user: { name: 'Harpreet Singh' } } },
    { _id: 'd6', name: 'Red Carrots', category: 'vegetables', price: 35, unit: 'kg', isOrganic: false, availableQuantity: 60, images: ['https://images.unsplash.com/photo-1447175008436-054170c2e979?w=400&auto=format&fit=crop'], rating: { average: 4.1, count: 18 }, farmer: { user: { name: 'Mohan Lal' } } },
    { _id: 'd7', name: 'Turmeric Powder', category: 'spices', price: 180, unit: 'kg', isOrganic: true, availableQuantity: 40, images: ['https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&auto=format&fit=crop'], rating: { average: 4.7, count: 27 }, farmer: { user: { name: 'Savita Reddy' } } },
    { _id: 'd8', name: 'Fresh Paneer', category: 'dairy', price: 280, unit: 'kg', isOrganic: false, availableQuantity: 15, images: ['https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&auto=format&fit=crop'], rating: { average: 4.3, count: 19 }, farmer: { user: { name: 'Ramesh Yadav' } } },
    { _id: 'd9', name: 'Green Chillies', category: 'vegetables', price: 25, unit: 'kg', isOrganic: false, availableQuantity: 45, images: ['https://images.unsplash.com/photo-1526346698789-22fd84314424?w=400&auto=format&fit=crop'], rating: { average: 4.0, count: 12 }, farmer: { user: { name: 'Mahesh Nair' } } },
    { _id: 'd10', name: 'Organic Honey', category: 'other', price: 350, unit: 'kg', isOrganic: true, availableQuantity: 25, images: ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&auto=format&fit=crop'], rating: { average: 4.9, count: 38 }, farmer: { user: { name: 'Beena Thomas' } } },
    { _id: 'd11', name: 'Cauliflower', category: 'vegetables', price: 45, unit: 'piece', isOrganic: false, availableQuantity: 30, images: ['https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=400&auto=format&fit=crop'], rating: { average: 4.2, count: 16 }, farmer: { user: { name: 'Deepak Verma' } } },
    { _id: 'd12', name: 'Coriander Seeds', category: 'spices', price: 150, unit: 'kg', isOrganic: true, availableQuantity: 50, images: ['https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&auto=format&fit=crop'], rating: { average: 4.5, count: 22 }, farmer: { user: { name: 'Lalita Kumari' } } }
  ];
}
