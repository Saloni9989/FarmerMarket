# 🌱 Krishi Market - Farmer-to-Consumer Agri Marketplace

A full-stack web application connecting local farmers directly with consumers.

## 🚀 Quick Start

### Prerequisites
- Node.js v16+
- MongoDB (local or MongoDB Atlas)

### Backend Setup

```bash
cd backend
npm install
```

Copy `.env.example` to `.env` and update values:
```
MONGO_URI=mongodb://localhost:27017/krishi_market
JWT_SECRET=your_secret_key_here
PORT=5000
```

Start the server:
```bash
npm run dev     # Development with auto-reload
npm start       # Production
```

Seed demo data:
```bash
node seed.js
```

### Frontend Setup

The frontend is pure HTML/CSS/JS — no build step needed.

**Option 1 - VS Code Live Server:**
Open `frontend/index.html` with Live Server extension.

**Option 2 - Python HTTP server:**
```bash
cd frontend
python -m http.server 3000
```
Then visit http://localhost:3000

**Option 3 - Any static file server:**
Serve the `frontend/` directory.

---

## 👥 Demo Accounts

| Role     | Email                        | Password  |
|----------|------------------------------|-----------|
| Admin    | admin@krishimarket.com       | admin123  |
| Farmer   | farmer@demo.com              | demo123   |
| Consumer | consumer@demo.com            | demo123   |

---

## 📁 Project Structure

```
FarmerMarket/
├── backend/
│   ├── models/          # MongoDB schemas
│   │   ├── User.js
│   │   ├── Farmer.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   └── Review.js
│   ├── routes/          # API routes
│   │   ├── auth.js
│   │   ├── farmers.js
│   │   ├── products.js
│   │   ├── orders.js
│   │   ├── admin.js
│   │   └── reviews.js
│   ├── middleware/
│   │   ├── auth.js      # JWT middleware
│   │   └── upload.js    # File upload
│   ├── server.js
│   ├── seed.js
│   └── .env
│
└── frontend/
    ├── index.html           # Home page
    ├── products.html        # Product listing
    ├── farmers.html         # Farmers listing
    ├── login.html
    ├── register.html
    ├── cart.html
    ├── consumer-dashboard.html
    ├── farmer-dashboard.html
    ├── admin-dashboard.html
    ├── css/
    │   ├── main.css
    │   ├── home.css
    │   ├── products.css
    │   ├── farmers.css
    │   ├── auth.css
    │   ├── cart.css
    │   ├── dashboard.css
    │   ├── farmer-dashboard.css
    │   └── admin.css
    └── js/
        ├── config.js        # API config & utilities
        ├── auth.js          # Auth state management
        ├── cart.js          # Cart management
        ├── home.js
        ├── products.js
        ├── farmers.js
        ├── cart-page.js
        ├── consumer-dashboard.js
        ├── farmer-dashboard.js
        └── admin-dashboard.js
```

---

## 🔌 API Endpoints

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Products
- `GET /api/products` - List products (filters: category, isOrganic, search, price range)
- `GET /api/products/featured` - Featured products
- `GET /api/products/:id` - Product detail
- `POST /api/products` - Create product (farmer)
- `PUT /api/products/:id` - Update product (farmer)
- `DELETE /api/products/:id` - Delete product (farmer)

### Farmers
- `GET /api/farmers` - List approved farmers
- `GET /api/farmers/:id` - Farmer profile
- `POST /api/farmers/register` - Create farmer profile
- `GET /api/farmers/me/dashboard` - Farmer stats

### Orders
- `POST /api/orders` - Place order (consumer)
- `GET /api/orders/my-orders` - Consumer order history
- `GET /api/orders/farmer-orders` - Farmer order management
- `PUT /api/orders/:id/status` - Update order status
- `PUT /api/orders/:id/cancel` - Cancel order

### Admin
- `GET /api/admin/dashboard` - Platform stats
- `GET /api/admin/farmers` - All farmers
- `PUT /api/admin/farmers/:id/verify` - Approve/reject farmer
- `GET /api/admin/orders` - All orders
- `GET /api/admin/users` - All users

---

## ✨ Features

### Consumer
- Browse and search products by category, organic status, price range
- View detailed farmer profiles
- Shopping cart with quantity management
- Checkout with delivery slot selection
- Order tracking with status history
- Rate products and farmers
- Manage profile and delivery addresses

### Farmer
- Register farm profile with location, methods, crops
- Create and manage product listings with images
- Manage orders — confirm, process, dispatch, deliver
- Sales dashboard with revenue analytics

### Admin
- Approve/reject farmer registrations
- Monitor all orders, users, and products
- Platform analytics dashboard
- Enable/disable user accounts and products

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Auth:** JWT tokens
- **File Upload:** Multer
