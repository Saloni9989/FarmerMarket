// Cart management using localStorage
const Cart = {
  get() {
    try { return JSON.parse(localStorage.getItem('km_cart')) || []; } catch { return []; }
  },
  save(cart) {
    localStorage.setItem('km_cart', JSON.stringify(cart));
    this.updateBadge();
  },
  add(product, quantity = 1) {
    const cart = this.get();
    const idx = cart.findIndex(i => i._id === product._id);
    if (idx > -1) {
      cart[idx].quantity = Math.min(cart[idx].quantity + quantity, product.maxOrderQuantity || 100);
    } else {
      cart.push({
        _id: product._id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        image: product.images?.[0] || null,
        farmer: product.farmer?._id || product.farmer,
        farmerName: product.farmer?.user?.name || product.farmer?.farmName || '',
        quantity,
        maxQty: product.maxOrderQuantity || 100,
        availableQty: product.availableQuantity
      });
    }
    this.save(cart);
    showToast(`${product.name} added to cart!`, 'success');
  },
  remove(productId) {
    const cart = this.get().filter(i => i._id !== productId);
    this.save(cart);
  },
  updateQty(productId, quantity) {
    const cart = this.get();
    const idx = cart.findIndex(i => i._id === productId);
    if (idx > -1) {
      if (quantity <= 0) { cart.splice(idx, 1); }
      else { cart[idx].quantity = Math.min(quantity, cart[idx].maxQty); }
    }
    this.save(cart);
  },
  clear() {
    localStorage.removeItem('km_cart');
    this.updateBadge();
  },
  getTotal() {
    return this.get().reduce((sum, i) => sum + (i.price * i.quantity), 0);
  },
  getCount() {
    return this.get().reduce((sum, i) => sum + i.quantity, 0);
  },
  updateBadge() {
    const badge = document.getElementById('cartCount');
    if (badge) {
      const count = this.getCount();
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  }
};

// Initialize cart badge
document.addEventListener('DOMContentLoaded', () => Cart.updateBadge());
