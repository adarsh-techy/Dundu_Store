# Velora — E-Commerce System Specification

## Technology Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native |
| Web (User-facing) | React.js |
| Admin / Super Admin | React.js + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | PostgreSQL |
| Authentication | JWT + Google OAuth |
| OTP | WhatsApp / SMS OTP |

---

## 1. User Side (Mobile App + Website)

### 1.1 Authentication

- Login
- Signup
- OTP Login
- Google Login
- Forgot Password

---

### 1.2 Home

- Banner Slider
- Categories
- New Arrivals
- Trending Products
- Offers

---

### 1.3 Product Features

#### Product Details

- Multiple Images
- Size Selection
- Color Selection
- Reviews & Ratings
- Related Products

---

### 1.4 Cart

- Add to Cart
- Update Quantity
- Remove Product

---

### 1.5 Checkout

- Address Management
- Coupon Apply
- Payment Selection

---

### 1.6 Orders

- Place Order
- Track Order
- Order History
- Cancel Order
- Return Request

---

### 1.7 Profile

- Edit Profile
- Saved Addresses
- Wishlist
- Notifications

---

## 2. Super Admin Panel (Web)

### 2.1 Dashboard

- Total Sales
- Total Orders
- Total Users
- Revenue Graph
- Recent Orders

---

### 2.2 Product Management

#### Add Product — Fields

| Field | Field |
|---|---|
| Product Category | Product Name |
| Brand Name | Description |
| Material | Type |
| Gender | Age Group |
| Size | Color |
| Price | Offer Price |
| Stock | SKU |
| Product Images | — |

#### Product Controls

- Edit Product
- Delete Product
- Hide Product
- Mark as Featured
- Mark as Offer Product

---

### 2.3 Category Management

- Women
- Kids
- Newborn
- Maternity

---

### 2.4 Order Control

| Status | Actions |
|---|---|
| Pending | Update Status |
| Packed | Update Status |
| Shipped | Update Status |
| Delivered | Download Invoice |
| Cancelled | — |
| Returned | Approve / Reject |

#### Order Features

- Order Status Update
- Invoice Download
- Return Approval

---

### 2.5 Cart Control

- View Active Carts
- Abandoned Cart Tracking

---

### 2.6 User Control

- User List
- Block User
- Order History per User
- Address Details

---

### 2.7 Admin Management

- Add Admin
- Role & Permissions
- Branch Access Control

---

## 3. Admin Panel (Store / Branch Level)

### 3.1 Billing Features

- Barcode Scan
- QR Scan Billing
- Generate Invoice
- Print Bill
- Daily Sales Report

### 3.2 Payment Methods

- UPI
- Cash
- Card
- Online Payment

---

## 4. WhatsApp Notification System

### 4.1 Provider Options

- WhatsApp Business Platform by Meta
- Twilio WhatsApp API

---

### 4.2 User Notifications

#### Order Notifications

- Order Confirmed
- Order Packed
- Order Shipped
- Delivered
- Cancelled

#### Payment Notifications

- Payment Success
- Payment Failed

#### Offers & Marketing

- Festival Offers
- Coupon Codes
- New Arrivals
- Flash Sales

#### OTP

- WhatsApp OTP Verification

#### Cart Reminder

> Example: *"You left items in your cart at Velora"*

---

### 4.3 Admin Alerts

- New Order Alert
- Low Stock Alert
- Return Request Alert

---

## 5. Payment Gateways

- Razorpay
- Cashfree
- PhonePe Payment Gateway

---

## 6. Recommended Future Features

- Loyalty Points
- Referral System
- Wallet
- AI Product Suggestions
- Multi-language Support
- Live Delivery Tracking
- Vendor Panel

---

## 7. System Role Hierarchy

```
Super Admin
  └── Full system control — all panels, all data

Admin (Branch Level)
  └── Billing + Orders + Store Operations

User
  └── Shopping + Orders + Tracking
```
