let allFarmers = [];
let currentState = '';
let currentMethod = '';
let currentPage = 1;

document.addEventListener('DOMContentLoaded', () => {
  loadFarmers();
});

async function loadFarmers() {
  const grid = document.getElementById('farmersGrid');
  grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading farmers...</div>';

  try {
    const params = [];
    if (currentState) params.push(`state=${encodeURIComponent(currentState)}`);
    if (currentMethod) params.push(`method=${currentMethod}`);
    params.push(`page=${currentPage}`, 'limit=12');

    const data = await api.get(`/farmers?${params.join('&')}`);
    allFarmers = data.farmers || [];

    const count = document.getElementById('farmersCount');
    if (count) count.textContent = `${data.total || allFarmers.length} farmers found`;

    if (allFarmers.length === 0) {
      grid.innerHTML = `<div class="empty-state"><i class="fas fa-tractor"></i><h3>No farmers found</h3><p>Try different filters</p></div>`;
    } else {
      renderFarmers(allFarmers);
    }

    renderPagination(data.pages || 1);
  } catch(e) {
    renderFarmers(getDemoFarmers());
  }
}

function renderFarmers(farmers) {
  const grid = document.getElementById('farmersGrid');
  grid.innerHTML = farmers.map(f => createFarmerCard(f)).join('');
}

function createFarmerCard(f) {
  const user = f.user || {};
  const loc = f.farmLocation || {};
  const methods = (f.farmingMethods || []).slice(0, 2);
  const crops = (f.cropTypes || []).slice(0, 3);

  return `
    <div class="farmer-profile-card">
      <div class="farmer-card-cover"></div>
      <div class="farmer-card-avatar">
        ${f.profileImage ? `<img src="${getImageUrl(f.profileImage)}" alt="${user.name}">` : '<i class="fas fa-user"></i>'}
      </div>
      <div class="farmer-card-body">
        <div class="farmer-card-name">${user.name || 'Farmer'}</div>
        <div class="farmer-card-farm"><i class="fas fa-leaf"></i> ${f.farmName || ''}</div>
        <div class="farmer-card-location"><i class="fas fa-map-marker-alt"></i> ${loc.district ? loc.district + ', ' : ''}${loc.state || 'India'}</div>
        <div class="farmer-card-tags">
          ${methods.map(m => `<span class="tag tag-method">${m}</span>`).join('')}
          ${crops.map(c => `<span class="tag tag-crop">${CATEGORIES[c]?.icon || ''} ${c}</span>`).join('')}
        </div>
        <div class="farmer-card-rating">${generateStars(f.rating?.average || 0, f.rating?.count || 0)}</div>
        <div class="farmer-card-actions">
          <a href="farmer-profile.html?id=${f._id}" class="btn-view-farmer">View Profile</a>
          <a href="products.html?farmer=${f._id}" class="btn-view-products">Products</a>
        </div>
      </div>
    </div>
  `;
}

function searchFarmers() {
  const q = document.getElementById('farmerSearch').value.toLowerCase();
  if (!q) { renderFarmers(allFarmers); return; }
  const filtered = allFarmers.filter(f =>
    (f.farmName || '').toLowerCase().includes(q) ||
    (f.user?.name || '').toLowerCase().includes(q) ||
    (f.farmLocation?.state || '').toLowerCase().includes(q) ||
    (f.farmLocation?.district || '').toLowerCase().includes(q)
  );
  renderFarmers(filtered);
}

function filterByState(state, btn) {
  document.querySelectorAll('.filter-chips:first-child .fchip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentState = state;
  currentPage = 1;
  loadFarmers();
}

function filterByMethod(method, btn) {
  document.querySelectorAll('.filter-chips:last-child .fchip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentMethod = method;
  currentPage = 1;
  loadFarmers();
}

function renderPagination(totalPages) {
  const pag = document.getElementById('pagination');
  if (!pag || totalPages <= 1) { if (pag) pag.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
  pag.innerHTML = html;
}

function goToPage(page) {
  if (page < 1) return;
  currentPage = page;
  loadFarmers();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getDemoFarmers() {
  return [
    { _id: 'f1', farmName: 'Green Fields Farm', farmingMethods: ['organic', 'natural'], cropTypes: ['vegetables', 'fruits'], farmLocation: { district: 'Nashik', state: 'Maharashtra' }, rating: { average: 4.6, count: 34 }, user: { name: 'Rajesh Kumar' } },
    { _id: 'f2', farmName: 'Konkan Orchards', farmingMethods: ['conventional'], cropTypes: ['fruits', 'spices'], farmLocation: { district: 'Ratnagiri', state: 'Maharashtra' }, rating: { average: 4.8, count: 52 }, user: { name: 'Suresh Patil' } },
    { _id: 'f3', farmName: 'Punjab Fields', farmingMethods: ['organic'], cropTypes: ['grains', 'pulses'], farmLocation: { district: 'Amritsar', state: 'Punjab' }, rating: { average: 4.4, count: 28 }, user: { name: 'Harpreet Singh' } },
    { _id: 'f4', farmName: 'Gau Mata Dairy', farmingMethods: ['natural'], cropTypes: ['dairy'], farmLocation: { district: 'Anand', state: 'Gujarat' }, rating: { average: 4.7, count: 61 }, user: { name: 'Anita Devi' } },
    { _id: 'f5', farmName: 'Deccan Spice Farm', farmingMethods: ['organic'], cropTypes: ['spices', 'herbs'], farmLocation: { district: 'Guntur', state: 'Andhra Pradesh' }, rating: { average: 4.5, count: 22 }, user: { name: 'Ravi Reddy' } },
    { _id: 'f6', farmName: 'Hill Garden Farm', farmingMethods: ['natural', 'organic'], cropTypes: ['vegetables', 'fruits'], farmLocation: { district: 'Shimla', state: 'Himachal Pradesh' }, rating: { average: 4.9, count: 41 }, user: { name: 'Mohan Thakur' } }
  ];
}
