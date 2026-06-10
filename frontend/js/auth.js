// Auth state management
const Auth = {
  getUser() {
    try { return JSON.parse(localStorage.getItem('km_user')); } catch { return null; }
  },
  getToken() { return localStorage.getItem('km_token'); },
  isLoggedIn() { return !!this.getToken(); },
  logout() {
    localStorage.removeItem('km_token');
    localStorage.removeItem('km_user');
    localStorage.removeItem('km_farmer');
    window.location.href = 'index.html';
  },
  save(token, user, farmerProfile = null) {
    localStorage.setItem('km_token', token);
    localStorage.setItem('km_user', JSON.stringify(user));
    if (farmerProfile) localStorage.setItem('km_farmer', JSON.stringify(farmerProfile));
  }
};

function logout() { Auth.logout(); }

// Update navbar based on auth state
function updateNavbar() {
  const user = Auth.getUser();
  const authButtons = document.getElementById('authButtons');
  const userMenu = document.getElementById('userMenu');
  const userName = document.getElementById('userName');
  const dashboardLink = document.getElementById('dashboardLink');
  const profileLink = document.getElementById('profileLink');
  const ordersLink = document.getElementById('ordersLink');

  if (!authButtons || !userMenu) return;

  if (user) {
    authButtons.style.display = 'none';
    userMenu.style.display = 'block';
    if (userName) userName.textContent = user.name.split(' ')[0];

    if (dashboardLink) {
      dashboardLink.style.display = 'block';
      if (user.role === 'farmer') {
        dashboardLink.href = 'farmer-dashboard.html';
        dashboardLink.textContent = 'Dashboard';
      } else if (user.role === 'admin') {
        dashboardLink.href = 'admin-dashboard.html';
        dashboardLink.textContent = 'Admin';
      } else {
        dashboardLink.href = 'consumer-dashboard.html';
        dashboardLink.textContent = 'Dashboard';
      }
    }

    if (profileLink) profileLink.href = user.role === 'farmer' ? 'farmer-dashboard.html' : 'consumer-dashboard.html';
    if (ordersLink) ordersLink.href = user.role === 'farmer' ? 'farmer-dashboard.html#orders' : 'consumer-dashboard.html#orders';
  } else {
    authButtons.style.display = 'flex';
    userMenu.style.display = 'none';
    if (dashboardLink) dashboardLink.style.display = 'none';
  }
}

// Run on every page load
document.addEventListener('DOMContentLoaded', updateNavbar);
