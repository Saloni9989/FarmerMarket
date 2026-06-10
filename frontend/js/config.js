// API Configuration
// Automatically switches between local and production
const CONFIG = {
  API_BASE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://YOUR-RENDER-APP-NAME.onrender.com/api',
  UPLOADS_BASE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://YOUR-RENDER-APP-NAME.onrender.com'
};

// API Helper
const api = {
  async request(method, endpoint, data = null, isFormData = false) {
    const token = localStorage.getItem('km_token');
    const headers = {};

    if (!isFormData) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = {
      method,
      headers,
      body: data ? (isFormData ? data : JSON.stringify(data)) : undefined
    };

    try {
      const res = await fetch(`${CONFIG.API_BASE}${endpoint}`, config);
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Request failed');
      return result;
    } catch (err) {
      throw err;
    }
  },

  get: (endpoint) => api.request('GET', endpoint),
  post: (endpoint, data, isFormData) => api.request('POST', endpoint, data, isFormData),
  put: (endpoint, data) => api.request('PUT', endpoint, data),
  delete: (endpoint) => api.request('DELETE', endpoint)
};

// Toast notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    info: 'fas fa-info-circle',
    warning: 'fas fa-exclamation-triangle'
  };

  toast.className = `toast show ${type}`;
  toast.innerHTML = `<i class="${icons[type]}"></i> ${message}`;

  setTimeout(() => {
    toast.className = 'toast';
    toast.innerHTML = '';
  }, 3500);
}

// Format currency
function formatPrice(price) {
  return `₹${parseFloat(price).toFixed(2)}`;
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

// Generate star rating HTML
function generateStars(rating, count = 0) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= full) stars += '<i class="fas fa-star"></i>';
    else if (i === full + 1 && half) stars += '<i class="fas fa-star-half-alt"></i>';
    else stars += '<i class="far fa-star"></i>';
  }
  return `<span class="stars">${stars}</span><span class="rating-count">(${count})</span>`;
}

// Get product image URL
function getImageUrl(imagePath) {
  if (!imagePath) return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop';
  if (imagePath.startsWith('http')) return imagePath;
  return `${CONFIG.UPLOADS_BASE}${imagePath}`;
}

// Category icons and colors
const CATEGORIES = {
  vegetables: { icon: '🥦', label: 'Vegetables', color: '#4caf50' },
  fruits: { icon: '🍎', label: 'Fruits', color: '#ff5722' },
  dairy: { icon: '🥛', label: 'Dairy', color: '#2196f3' },
  grains: { icon: '🌾', label: 'Grains', color: '#ff9800' },
  spices: { icon: '🌶️', label: 'Spices', color: '#f44336' },
  herbs: { icon: '🌿', label: 'Herbs', color: '#8bc34a' },
  pulses: { icon: '🫘', label: 'Pulses', color: '#795548' },
  oilseeds: { icon: '🌻', label: 'Oilseeds', color: '#ffc107' },
  flowers: { icon: '🌸', label: 'Flowers', color: '#e91e63' },
  other: { icon: '🛒', label: 'Other', color: '#9e9e9e' }
};

// Scroll to top navbar effect
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    if (window.scrollY > 50) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  }
});

function toggleMenu() {
  const links = document.getElementById('navLinks');
  if (links) links.classList.toggle('open');
}

function toggleUserDropdown() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) dropdown.classList.toggle('show');
}

document.addEventListener('click', (e) => {
  const menu = document.querySelector('.user-menu');
  if (menu && !menu.contains(e.target)) {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.remove('show');
  }
});

function handleSearch() {
  const q = document.getElementById('navSearch')?.value;
  if (q?.trim()) window.location.href = `products.html?search=${encodeURIComponent(q)}`;
}

document.getElementById('navSearch')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSearch();
});
