# NIYAT E-Commerce Platform — Complete API Design

**Version:** 1.0  
**Date:** October 2026  
**Status:** Implementation specification  
**Related documents:** NIYAT HLD, NIYAT LLD  
**Base URL:** `/api`  
**Architecture:** Next.js App Router Route Handlers + TypeScript + MongoDB/Mongoose

---

## 1. Purpose and design rules

This document defines the REST API surface for NIYAT's skincare store: public catalog, search, checkout, customer accounts, addresses, orders, Razorpay payments, webhooks, reviews, coupons, inventory, Cloudinary uploads, content settings, admin operations, and reports.

### Fixed technical decisions

- Next.js App Router Route Handlers; no separate Express server for v1.
- MongoDB Atlas + Mongoose.
- Firebase Authentication; verify Firebase ID tokens on the server using Firebase Admin SDK.
- Razorpay for online payments; optional Cash on Delivery (COD).
- Cloudinary for product/banner images.
- Resend for transactional email.
- INR only for v1. Store money as integer paise (₹199.00 = `19900`).

### Non-negotiable API rules

1. **The server owns the truth:** never trust client-sent price, discount, tax, shipping, stock, order total, role, payment status, or fulfillment status.
2. **Auth:** verify Firebase ID tokens server-side. Public routes are explicitly marked public; admin routes always enforce a role/permission check.
3. **No card data:** card details are handled by Razorpay Checkout and must never be stored by NIYAT.
4. **Idempotency:** order creation, payment processing, webhooks, inventory changes and refunds must safely handle retries.
5. **Product publication:** the initial six NIYAT products remain drafts until the business supplies and approves actual price, images, ingredients/specifications and claims.
6. **No invented product facts:** API must only return verified fields from approved product records. Do not invent SPF/PA values, ingredients, efficacy claims, certifications or reviews.
7. **Versioning:** v1 uses `/api/...`; introduce `/api/v2` only for breaking changes.
8. **Validation:** validate every request with Zod (or an equivalent schema validator), limit payload sizes, normalize input, and reject unknown fields for sensitive operations.

---

## 2. API conventions

### 2.1 Headers

| Header | Requirement | Purpose |
|---|---|---|
| `Authorization: Bearer <Firebase ID token>` | Optional/Alternative on customer/admin routes | Client-side Identity token verification |
| `Cookie: __session=<Firebase Session Cookie>` | Optional/Recommended for SSR & Server Components | HTTP-only server-side session cookie |
| `X-Guest-Order-Token: <signed JWT>` | Required for guest payment & tracking endpoints | Proof of ownership for guest checkouts |
| `Content-Type: application/json` | Required for JSON writes | Request format |
| `Idempotency-Key: <random UUID>` | Required for order creation, refund creation and inventory adjustment; recommended for payment creation | Safe retries |
| `X-Request-Id` | Optional from client; server creates one if absent | Correlation/tracing |

The server must not trust a client-provided request ID for security decisions. Return the generated/accepted request ID in responses.

### 2.2 Success envelope

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_abc123"
  }
}
```

For lists, `data.items` contains results and `meta.pagination` contains paging details.

### 2.3 Error envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the submitted information.",
    "details": [{ "field": "quantity", "issue": "Must be at least 1" }],
    "requestId": "req_abc123"
  }
}
```

`details` is optional and must not include secrets, internal stack traces, database errors, provider credentials or sensitive personal information.

### 2.4 Status code conventions

| Status | Meaning |
|---|---|
| `200` | Successful read/update/action |
| `201` | Resource created |
| `202` | Accepted for asynchronous processing |
| `204` | Successful delete with no response body, where appropriate |
| `400` | Invalid syntax or request shape |
| `401` | Missing/invalid authentication |
| `403` | Authenticated but not authorized |
| `404` | Not found or not visible to this user |
| `409` | Idempotency conflict, stock conflict or invalid state transition |
| `413` | Request body too large |
| `422` | Valid syntax but invalid business rules |
| `429` | Rate limit exceeded |
| `500` | Unexpected internal error |
| `503` | Dependency temporarily unavailable |

### 2.5 Pagination, sorting and filtering

- Query parameters: `page=1&limit=12`; clamp `limit` to a maximum of 100 (public lists normally max 24).
- Validate `page >= 1`; reject unsupported sort fields rather than passing user input to MongoDB.
- Return `meta.pagination: { page, limit, totalItems, totalPages, hasNextPage, hasPreviousPage }`.
- Never accept raw MongoDB operators or arbitrary field names from clients.

### 2.6 Authentication and roles

| API group | Access |
|---|---|
| Public catalog, categories, published banners/settings, checkout quote, newsletter | Public, rate-limited |
| Order tracking (`/api/orders/track`) | Public with `orderNumber` + phone match OR `X-Guest-Order-Token` |
| `/api/me/**` | Authenticated customer (`Bearer` token or `__session` cookie) |
| Customer orders and cancellation requests | Owner of order; staff/admin permission for administrative views |
| `/api/admin/**` | `STAFF` or `ADMIN` with explicit permission; sensitive operations ADMIN-only |
| `/api/webhooks/**` | Provider signature verification; not Firebase auth |
| Cloudinary signature endpoint | Authenticated admin with media-upload permission |

**Auth mechanism in Next.js App Router:**
- **Server Components & SSR:** React Server Components cannot read `Authorization: Bearer` headers. A login endpoint sets a secure, HTTP-only `__session` cookie using Firebase Admin's `createSessionCookie()`. Server Components read this cookie via `cookies()` for SSR.
- **Route Handlers / API routes:** Route Handlers inspect the `Authorization: Bearer <token>` header first; if absent, they fall back to the `__session` cookie.
- **Guest Orders:** Guest orders issue a signed `guestOrderToken` returned on `POST /api/orders`. The guest client provides this via header `X-Guest-Order-Token` to authorize Razorpay order creation and payment verification.
- Role values come strictly from trusted server-side MongoDB profiles / Firebase custom claims. Firebase Authentication proves identity; it does not automatically grant admin access.

---

## 3. Canonical API inventory

### Public storefront

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness/readiness summary; no secrets |
| `GET` | `/api/products` | Published product list, search and filters |
| `GET` | `/api/products/:slug` | Published product details |
| `GET` | `/api/categories` | Active categories |
| `GET` | `/api/categories/:slug` | Category details and product count |
| `GET` | `/api/banners` | Published homepage/campaign banners |
| `GET` | `/api/site-settings/public` | Public brand/store settings only |
| `POST` | `/api/newsletter` | Subscribe to newsletter with email |
| `GET` | `/api/orders/track` | Track order status by orderNumber & phone / token |
| `POST` | `/api/checkout/validate` | Recalculate and preview a checkout quote |
| `POST` | `/api/coupons/validate` | Validate a coupon against a cart; never reserves it |
| `GET` | `/api/shipping/estimate?postalCode=...` | Estimate serviceability/shipping where configured |
| `POST` | `/api/orders` | Create order from server-priced cart (returns guest token if guest) |
| `POST` | `/api/payments/razorpay/create-order` | Create Razorpay payment attempt |
| `POST` | `/api/payments/razorpay/verify` | Verify checkout signature and reconcile state |
| `POST` | `/api/webhooks/razorpay` | Receive signed Razorpay events |

### Customer account

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/me` | Current profile |
| `PATCH` | `/api/me` | Update allowed profile fields |
| `GET/POST` | `/api/me/addresses` | List/create addresses |
| `PATCH/DELETE` | `/api/me/addresses/:addressId` | Update/delete owned address |
| `GET` | `/api/me/orders` | List own orders (supports pagination) |
| `GET` | `/api/me/orders/:orderId` | Read own order (by ObjectId or orderNumber) |
| `POST` | `/api/me/orders/:orderId/cancel-request` | Request cancellation |
| `GET` | `/api/me/wishlist` | Retrieve customer's saved wishlist products |
| `POST` | `/api/me/wishlist` | Add a product to customer's wishlist |
| `DELETE` | `/api/me/wishlist/:productId` | Remove a product from customer's wishlist |
| `POST` | `/api/products/:productId/reviews` | Submit review for eligible purchased product |
| `GET` | `/api/products/:productId/reviews` | Read approved reviews |

### Admin — catalog, content and reviews

| Method | Endpoint | Purpose |
|---|---|---|
| `GET/POST` | `/api/admin/products` | List/create products |
| `GET/PATCH/DELETE` | `/api/admin/products/:productId` | Read/update/archive product |
| `POST` | `/api/admin/products/:productId/publish` | Publish after validation |
| `POST` | `/api/admin/products/:productId/archive` | Archive product |
| `GET/POST` | `/api/admin/categories` | List/create categories |
| `GET/PATCH/DELETE` | `/api/admin/categories/:categoryId` | Read/update/archive category |
| `GET/POST` | `/api/admin/banners` | List/create banners |
| `PATCH/DELETE` | `/api/admin/banners/:bannerId` | Update/archive banner |
| `GET` | `/api/admin/reviews` | List all reviews for moderation (status filter) |
| `PATCH` | `/api/admin/reviews/:reviewId` | Moderate review (approve/reject) |
| `DELETE` | `/api/admin/reviews/:reviewId` | Delete/purge review record |
| `POST` | `/api/admin/uploads/cloudinary-signature` | Generate constrained upload signature |
| `GET/PATCH` | `/api/admin/settings` | Read/update private store settings |

### Admin — orders, payments and customers

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/admin/dashboard` | Summary metrics |
| `GET` | `/api/admin/orders` | Search/filter orders |
| `GET` | `/api/admin/orders/:orderId` | Order detail and timeline |
| `PATCH` | `/api/admin/orders/:orderId/status` | Valid fulfillment transition |
| `POST` | `/api/admin/orders/:orderId/mark-cod-collected` | Record COD collection |
| `POST` | `/api/admin/orders/:orderId/cancel` | Admin cancellation with reason |
| `POST` | `/api/admin/orders/:orderId/refunds` | Create full/partial refund request |
| `GET` | `/api/admin/payments` | Search payment records |
| `GET` | `/api/admin/customers` | Search customer profiles/orders summary |
| `GET` | `/api/admin/customers/:userId` | Customer detail with permission checks |

### Admin — inventory, coupons and reporting

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/admin/inventory` | Stock by product/SKU |
| `POST` | `/api/admin/inventory/adjustments` | Audited stock adjustment |
| `GET` | `/api/admin/inventory/movements` | Inventory movement ledger |
| `GET/POST` | `/api/admin/coupons` | List/create coupons |
| `GET/PATCH` | `/api/admin/coupons/:couponId` | Read/update coupon |
| `POST` | `/api/admin/coupons/:couponId/disable` | Disable coupon |
| `GET` | `/api/admin/reports/sales` | Sales summary by period |
| `GET` | `/api/admin/reports/products` | Product performance |
| `GET` | `/api/admin/reports/inventory` | Stock/low-stock report |
| `GET` | `/api/admin/reports/export` | Export authorized report as CSV |
| `GET` | `/api/admin/audit-logs` | Search audit events; ADMIN-only |

Some endpoints may be split into smaller Route Handler files during implementation; the contract should remain stable.

---

## 4. Public API specifications

### 4.1 `GET /api/health`

**Access:** Public, rate-limited. Do not disclose versions, database hostnames or secrets.

**Response `200`:**
```json
{
  "success": true,
  "data": { "status": "ok", "dependencies": { "database": "ok" } },
  "meta": { "requestId": "req_abc123" }
}
```

A separate internal readiness check can be protected or restricted by deployment configuration.

### 4.2 `GET /api/products`

**Query:** `page`, `limit`, `q`, `category`, `sort`, `inStock`, `concern`, `skinType` (only if those fields are maintained and approved).

Supported `sort`: `newest`, `price_asc`, `price_desc`, `name_asc`, `popular` (only when a defined metric exists). Search must be bounded and indexed where practical.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "items": [{
      "id": "product_id",
      "name": "Face Wash",
      "slug": "face-wash",
      "shortDescription": "Approved short description",
      "sizeLabel": "100 g",
      "pricePaise": 0,
      "regularPricePaise": 0,
      "currency": "INR",
      "images": [{ "url": "https://...", "alt": "Product packaging", "sortOrder": 0 }],
      "category": { "name": "Face Care", "slug": "face-care" },
      "inStock": false,
      "stockStatus": "OUT_OF_STOCK"
    }],
    "pagination": { "page": 1, "limit": 12, "totalItems": 0, "totalPages": 0 }
  },
  "meta": { "requestId": "req_abc123" }
}
```

The example values are placeholders. Public responses contain only `PUBLISHED` products, approved content and safe fields. Never expose cost price, supplier notes, internal stock movements, draft data or admin metadata.

### 4.3 `GET /api/products/:slug`

Returns the same public product fields plus approved full description, product specifications, how-to-use, warnings, ingredient list, FAQs and approved review summary where supplied by NIYAT. Omit unverified fields; do not fill them with invented claims. Return `404 PRODUCT_NOT_FOUND` for unpublished/archived products.

### 4.4 `GET /api/categories` and `GET /api/categories/:slug`

Return active categories and public metadata only. Category deletion must be prevented when products reference it; use archive/disable instead. The detail route may include a product count but should not expose unpublished products.

### 4.5 `GET /api/banners`

Query: `placement=HOME_HERO|HOME_PROMO|CATEGORY`; optional `limit`.

Return only active banners whose publication window includes the current server time. Do not return draft campaign content or private scheduling notes.

### 4.6 `GET /api/site-settings/public`

Return safe values only, e.g. brand display name, logo URL, enabled payment methods, configured public shipping message, public contact links and social links. Never return API keys, credentials, private email configuration, internal margins or admin user details.

### 4.7 `POST /api/shipping/estimate`

**Request:**
```json
{ "postalCode": "781001", "items": [{ "productId": "product_id", "quantity": 1 }] }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "serviceable": true,
    "shippingFeePaise": 0,
    "estimatedMessage": "Delivery estimate will be confirmed at checkout"
  }
}
```

This is only an estimate. The order-creation service recalculates shipping from current server rules. If no carrier integration exists, use a configured postal-code/serviceability policy and do not promise an exact delivery date.

### 4.8 `POST /api/coupons/validate`

**Request:**
```json
{
  "code": "WELCOME",
  "items": [{ "productId": "product_id", "quantity": 1 }],
  "shippingPostalCode": "781001"
}
```

The server loads product prices, calculates eligible subtotal and checks active dates, minimum spend, usage caps, per-customer limit, product/category restrictions and stacking policy. This endpoint **does not reserve or consume** the coupon.

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "code": "WELCOME",
    "discountPaise": 0,
    "message": "Coupon applied"
  }
}
```

For an invalid coupon, return `200` with `valid: false` for normal user feedback, or `422 COUPON_INVALID` if the frontend uses structured errors consistently. Choose one pattern and use it everywhere; recommended pattern is `200` + `valid:false` for coupon eligibility only.

### 4.9 `POST /api/checkout/validate`

**Access:** Public for guest checkout, with abuse controls; authenticated users may use saved addresses by ID only if ownership is verified.

**Request:**
```json
{
  "items": [{ "productId": "product_id", "quantity": 1 }],
  "couponCode": "WELCOME",
  "shippingAddress": {
    "recipientName": "Customer Name",
    "phone": "9000000000",
    "addressLine1": "House/street",
    "addressLine2": "Optional",
    "city": "City",
    "state": "Assam",
    "postalCode": "781001",
    "country": "IN"
  },
  "paymentMethod": "RAZORPAY"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [{ "productId": "product_id", "name": "Face Wash", "quantity": 1, "unitPricePaise": 0, "lineTotalPaise": 0 }],
    "subtotalPaise": 0,
    "discountPaise": 0,
    "shippingFeePaise": 0,
    "taxPaise": 0,
    "grandTotalPaise": 0,
    "currency": "INR",
    "paymentMethod": "RAZORPAY",
    "warnings": []
  }
}
```

Quote may expire quickly and is not a price lock. Order creation must revalidate products, prices, stock, coupon and shipping. If tax treatment has not been confirmed by the business/accountant, do not invent a rate; use configured rules and block publication/checkout if legally required settings are incomplete.

### 4.10 `POST /api/newsletter`

**Access:** Public, rate-limited (e.g. 5 requests/min per IP).

**Request:**
```json
{
  "email": "customer@example.com"
}
```

**Server actions:**
- Validate email format with Zod and normalize to lowercase.
- Check `NewsletterSubscription` collection.
- If already active, return success without duplicate entries.
- If previously unsubscribed, update status to `ACTIVE` with updated consent timestamp.
- Create new subscription record with `status: ACTIVE`, source `STOREFRONT_FOOTER`, and opt-in timestamp.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "message": "Thank you for subscribing to NIYAT skincare updates."
  },
  "meta": { "requestId": "req_abc123" }
}
```

### 4.11 `GET /api/orders/track`

**Access:** Public, strict rate-limiting to prevent enumeration attacks.

**Query / Header options:**
- `orderNumber`: human-readable order number (e.g. `NIY-2026-000001`) **AND** `phone`: billing/shipping phone number.
- **OR** header `X-Guest-Order-Token`: cryptographic JWT issued during guest order creation.

**Server actions:**
- Match `orderNumber` with customer phone or verified guest token.
- Reject with `404 ORDER_NOT_FOUND` on mismatch (do not reveal whether order number exists with different phone).
- Return sanitized tracking summary only. Mask customer contact info and full address (display City, State only).

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "orderNumber": "NIY-2026-000001",
    "createdAt": "2026-10-20T10:00:00.000Z",
    "fulfilmentStatus": "SHIPPED",
    "paymentStatus": "PAID",
    "items": [
      { "name": "Face Wash", "sizeLabel": "100 g", "quantity": 1 }
    ],
    "destination": { "city": "Guwahati", "state": "Assam" },
    "shipment": {
      "carrier": "BlueDart",
      "trackingNumber": "BD123456789",
      "trackingUrl": "https://carrier.com/track/BD123456789",
      "shippedAt": "2026-10-21T08:30:00.000Z",
      "estimatedDelivery": "2026-10-24"
    }
  },
  "meta": { "requestId": "req_abc123" }
}
```

---

## 5. Customer account APIs

### 5.1 `GET /api/me`

**Auth:** Customer.

Returns Firebase UID, display name, email/phone if available, server-side role and profile timestamps. Do not return Firebase tokens or internal auth claims.

### 5.2 `PATCH /api/me`

**Request:**
```json
{ "displayName": "Customer Name", "phone": "9000000000" }
```

Only explicitly allowed fields may be updated. Never accept `role`, `isAdmin`, `permissions`, `firebaseUid`, account status or verification flags from the client. Phone/email verification must be handled through a trusted verification flow.

### 5.3 Addresses

`GET /api/me/addresses` returns the authenticated customer's addresses.

`POST /api/me/addresses`
```json
{
  "label": "Home",
  "recipientName": "Customer Name",
  "phone": "9000000000",
  "addressLine1": "House/street",
  "addressLine2": "Optional",
  "city": "City",
  "state": "Assam",
  "postalCode": "781001",
  "country": "IN",
  "isDefault": true
}
```

`PATCH /api/me/addresses/:addressId` accepts the same editable fields partially. `DELETE` removes an owned address unless it is referenced as a historical order snapshot (historical order addresses must remain intact). All address operations enforce ownership and validate Indian postal/phone formats without relying solely on client validation.

### 5.4 `GET /api/me/orders`

Query: `page`, `limit`, optional `status`.

Return only orders owned by the authenticated user. Avoid exposing payment provider payloads, internal risk flags or admin-only notes.

### 5.5 `GET /api/me/orders/:orderId`

Return order number, immutable item/price/address snapshots, payment method/status, fulfillment status, tracking summary if available and customer-visible timeline. Parameter `:orderId` accepts either MongoDB `_id` or public `orderNumber`. Do not expose other customers' records even if an ID is guessed.

### 5.6 `POST /api/me/orders/:orderId/cancel-request`

**Request:** `{ "reason": "Changed my mind" }`

Only allow requests in configured eligible states. This is a request, not an unconditional cancellation or refund. Return `409 ORDER_NOT_CANCELLABLE` when the order has progressed beyond the policy. Admin processing must follow the order state machine and refund rules.

### 5.7 `POST /api/products/:productId/reviews`

**Auth:** Customer.

**Request:**
```json
{ "rating": 5, "title": "Optional title", "body": "Review text" }
```

Only permit one review per eligible delivered purchase unless policy allows edits. Validate rating 1–5, length limits and moderation rules. New reviews start `PENDING`; public APIs show only `APPROVED` reviews. Do not generate or seed fake reviews.

### 5.8 `GET /api/products/:productId/reviews`

Query: `page`, `limit`, `sort=recent|rating_desc`. Return approved reviews only, with moderation-safe fields. Add rate limiting and spam prevention on submissions.

### 5.9 Wishlist APIs

**Auth:** Customer (Bearer token or `__session` cookie).

#### `GET /api/me/wishlist`
Returns array of customer's saved products with populated published details (name, slug, size, price, image, inStock). Does not return archived or draft items.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "prod_123",
        "name": "Emergency Whitening Serum",
        "slug": "emergency-whitening-serum",
        "sizeLabel": "3 ml",
        "regularPricePaise": 0,
        "salePricePaise": null,
        "imageUrl": "https://...",
        "inStock": true
      }
    ]
  },
  "meta": { "requestId": "req_abc123" }
}
```

#### `POST /api/me/wishlist`
**Request:**
```json
{
  "productId": "prod_123"
}
```
Validates product exists. Atomically adds `productId` to customer's `UserProfile.wishlist` using `$addToSet` (duplicate-safe).

**Response `200`:**
```json
{
  "success": true,
  "data": { "added": true, "productId": "prod_123" },
  "meta": { "requestId": "req_abc123" }
}
```

#### `DELETE /api/me/wishlist/:productId`
Removes product from customer's `UserProfile.wishlist` using `$pull`.

**Response `200`:**
```json
{
  "success": true,
  "data": { "removed": true, "productId": "prod_123" },
  "meta": { "requestId": "req_abc123" }
}
```

---

## 6. Order creation and checkout lifecycle

### 6.1 `POST /api/orders`

**Access:** Public guest checkout or authenticated customer. Guest flow must use a signed, unguessable guest-order access token/session; never rely on order number alone for later access.

**Required header:** `Idempotency-Key` (UUID or similarly strong random value).

**Request:**
```json
{
  "items": [{ "productId": "product_id", "quantity": 1 }],
  "couponCode": "WELCOME",
  "paymentMethod": "RAZORPAY",
  "shippingAddress": {
    "recipientName": "Customer Name",
    "phone": "9000000000",
    "addressLine1": "House/street",
    "city": "City",
    "state": "Assam",
    "postalCode": "781001",
    "country": "IN"
  },
  "billingAddressSameAsShipping": true,
  "customerNote": "Optional short note"
}
```

Never accept `unitPrice`, `subtotal`, `discount`, `tax`, `shippingFee`, `grandTotal`, `paymentStatus`, `fulfillmentStatus`, `role` or inventory values from the client.

**Server sequence:**
1. Validate request and idempotency key.
2. Resolve customer identity or securely establish guest identity.
3. Load published products from DB; reject duplicates or combine quantities consistently.
4. Validate quantities, active status and stock.
5. Calculate price, discounts, tax and shipping server-side.
6. Check coupon eligibility and usage; reserve/consume according to transaction policy.
7. Create immutable order item/address/price snapshots.
8. Reserve stock atomically or in a MongoDB transaction with a reservation expiry.
9. Create order and idempotency record in one consistent transaction where possible.
10. For Razorpay, return order details and next action; create provider payment order through the dedicated endpoint.
11. For COD, order enters a pending confirmation/review state according to COD policy; do not mark paid.
12. Queue notifications after durable commit; notification failure must not roll back an order.

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_id",
    "orderNumber": "NIY-2026-000001",
    "paymentMethod": "RAZORPAY",
    "paymentStatus": "PENDING",
    "fulfillmentStatus": "PENDING_PAYMENT",
    "amountPaise": 0,
    "currency": "INR",
    "nextAction": "CREATE_RAZORPAY_ORDER",
    "guestOrderToken": "jwt_token_for_guest_orders_only"
  },
  "meta": { "requestId": "req_abc123", "idempotentReplay": false }
}
```

*Note on Guest Orders:* When `userId` is absent (guest checkout), the server generates a signed HMAC-SHA256 JWT `guestOrderToken` containing `{ orderId, orderNumber, phone }` valid for 2 hours. The guest client must send this in the `X-Guest-Order-Token` header for payment creation/verification and order tracking.

A retry with the same key and same request returns the original logical result. Same key with a different request body returns `409 IDEMPOTENCY_KEY_REUSED`. Store a request hash; do not store sensitive payment credentials.

### 6.2 Stock reservation expiry

Use a configurable reservation TTL. Expired unpaid reservations are released by a scheduled job or a safe lazy-expiry process. Payment success and reservation release must be serialized/transactional so stock is not both released and sold. The precise TTL is a business configuration, not a hardcoded client value.

---

## 7. Razorpay payment APIs

### 7.1 `POST /api/payments/razorpay/create-order`

**Auth:** Order owner (via Bearer token or `__session` cookie), OR guest customer verified via `X-Guest-Order-Token` header.  
**Request:** `{ "orderId": "order_id" }`  
**Recommended header:** `Idempotency-Key` per payment attempt.

Server must confirm order eligibility and use the authoritative unpaid amount/currency from the order. Create the Razorpay order using server credentials, store the provider order ID and payment-attempt record, and return only public checkout data.

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_id",
    "razorpayOrderId": "provider_order_id",
    "amountPaise": 0,
    "currency": "INR",
    "keyId": "rzp_public_key_id",
    "prefill": { "name": "Customer Name", "email": "customer@example.com", "contact": "9000000000" }
  }
}
```

`keyId` is the public Razorpay key ID, not the secret. Do not return server secrets. Never create multiple active provider orders for the same attempt unless an explicit retry policy allows it.

### 7.2 `POST /api/payments/razorpay/verify`

**Request:**
```json
{
  "orderId": "order_id",
  "razorpay_order_id": "provider_order_id",
  "razorpay_payment_id": "provider_payment_id",
  "razorpay_signature": "provider_signature"
}
```

Server verifies the signature with the official Razorpay SDK/algorithm and secret, verifies provider order ID matches the saved payment attempt, checks expected amount/currency through trusted provider/order data, and applies the transition idempotently. Client callback alone is not proof of final payment; webhook/provider reconciliation remains authoritative.

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_id",
    "paymentStatus": "PAID",
    "fulfillmentStatus": "CONFIRMED",
    "verified": true
  }
}
```

If provider state is not yet confirmed, return the actual state (for example `PENDING`) rather than claiming payment success. Reject signature mismatch with `422 PAYMENT_VERIFICATION_FAILED`, and log safely without storing secrets.

### 7.3 `POST /api/webhooks/razorpay`

No Firebase token. Read the **raw request body** exactly as received, verify `X-Razorpay-Signature` with the configured webhook secret, and deduplicate by provider event ID. Persist the event receipt before applying effects. Handle events such as payment captured/failed and refund processed only if enabled and supported by current Razorpay integration. Verify event shape against the current provider docs during implementation.

Response: `200` for successfully processed or safely deduplicated events; `5xx` for retryable processing failures. Never trust an unsigned webhook. Never allow duplicate events to double-decrement stock, double-send state transitions, or double-refund.

### 7.4 Payment status reconciliation

Optional endpoint `GET /api/me/orders/:orderId/payment-status` may be added if the client needs polling. It must return only the caller's order's current status. Rate-limit polling and prefer webhook-driven updates. Do not allow the client to set payment status.

### 7.5 COD collection

COD orders are never marked paid at order creation. Admin/staff records collection only after the cash/payment has actually been received. Record amount, collector, time and audit event. Prevent collection amount from exceeding outstanding amount.

### 7.6 Refunds

`POST /api/admin/orders/:orderId/refunds`

**Auth:** ADMIN or explicitly authorized finance role.

**Request:**
```json
{ "amountPaise": 0, "reason": "Customer cancellation", "idempotencyKey": "uuid" }
```

Validate refundable balance against captured payment less prior successful refunds. Create provider refund only for eligible captured Razorpay payments. Store a refund record as pending; mark successful only after provider confirmation/webhook/reconciliation. COD refunds require a separate manually verified workflow and must not call Razorpay. Every refund action is audited.

---

## 8. Admin APIs

All admin endpoints require Firebase ID token verification **and** server-side permission checks. Admin writes must create audit logs with actor UID, action, resource ID, timestamp and safe before/after summaries. Never log passwords, tokens, full payment signatures or secrets.

### 8.1 Products

#### `GET /api/admin/products`

Query: `page`, `limit`, `q`, `status=DRAFT|PUBLISHED|ARCHIVED`, `categoryId`, `inStock`, `sort`.

Return internal fields appropriate to catalog managers, including SKU, cost price only for roles allowed to view costs, stock quantity, and status. Separate permissions for `catalog:read`, `catalog:write`, and `finance:read`.

#### `POST /api/admin/products`

**Request:**
```json
{
  "name": "Face Wash",
  "slug": "face-wash",
  "sku": "NIY-FW-100",
  "shortDescription": "Approved short description",
  "description": "Approved product description",
  "categoryId": "category_id",
  "sizeLabel": "100 g",
  "regularPricePaise": 0,
  "salePricePaise": null,
  "images": [{ "url": "https://res.cloudinary.com/...", "publicId": "niyat/products/face-wash", "alt": "Face Wash product packaging", "sortOrder": 0 }],
  "specifications": {},
  "ingredients": [],
  "howToUse": "",
  "warnings": "",
  "seo": { "title": "", "description": "" },
  "status": "DRAFT"
}
```

Only fields defined by the schema are accepted. Validate Cloudinary URLs/public IDs and ensure images belong to the configured account/folder. SKU and slug must be unique. Cost price and initial stock are separate permission-controlled fields; do not permit a catalog-only user to change cost or stock.

#### `GET /api/admin/products/:productId`

Return product and permitted operational fields.

#### `PATCH /api/admin/products/:productId`

Partial update. Use allowlisted fields; optimistic concurrency (`updatedAt` or version field) recommended to prevent one admin overwriting another's edit. If published product price/content changes, write audit log and preserve existing order snapshots.

#### `DELETE /api/admin/products/:productId`

Soft archive only when referenced by orders. Prefer `POST /archive`. Do not physically delete order-referenced products or historical snapshots.

#### `POST /api/admin/products/:productId/publish`

Server checks required fields, approved imagery, category, positive valid price, availability policy, and any required compliance/product-label information configured for NIYAT. If validation fails, return `422 PRODUCT_NOT_READY_TO_PUBLISH` with safe field-level issues. Publication is an explicit action, not an incidental side effect of editing.

### 8.2 Categories

`GET /api/admin/categories` supports active/draft/archived filters. `POST` creates a category with unique slug and safe SEO fields. `PATCH /api/admin/categories/:categoryId` updates allowlisted fields. `DELETE` should archive/disable and reject if the category is still referenced by active products unless products are reassigned in the same validated workflow.

### 8.3 Banners

`GET /api/admin/banners` supports status/placement filters. `POST` request:
```json
{
  "title": "Campaign title",
  "image": { "url": "https://res.cloudinary.com/...", "publicId": "niyat/banners/campaign", "alt": "Campaign banner" },
  "placement": "HOME_HERO",
  "targetUrl": "/shop",
  "startsAt": "2026-10-20T00:00:00.000Z",
  "endsAt": "2026-11-01T23:59:59.000Z",
  "status": "DRAFT"
}
```

Validate allowed target URLs to prevent open redirects. Use explicit UTC timestamps and publication windows. `PATCH /api/admin/banners/:bannerId` updates fields; delete means archive if history matters.

### 8.4 Cloudinary upload signature

`POST /api/admin/uploads/cloudinary-signature`

**Request:** `{ "resourceType": "image", "folder": "products" }`

The server allowlists resource type and maps the requested folder to a fixed Cloudinary folder such as `niyat/products` or `niyat/banners`. It returns timestamp, signature and cloud name/API key required by the upload SDK; never return the API secret. Enforce MIME type, maximum file size, dimensions if needed, and admin permission. Validate the final upload response server-side before attaching the image to a product/banner. Do not permit arbitrary folder names or uploads from unauthenticated clients.

### 8.5 Orders

#### `GET /api/admin/orders`

Query: `page`, `limit`, `q` (order number/customer contact), `paymentStatus`, `fulfillmentStatus`, `paymentMethod`, `from`, `to`, `sort`. Normalize dates and apply maximum range/limits. Customer PII is shown only to staff with relevant permission.

#### `GET /api/admin/orders/:orderId`

Return order snapshots, payment summary, status timeline, shipping/tracking information and internal notes only when authorized. Do not expose provider secrets/signatures.

#### `PATCH /api/admin/orders/:orderId/status`

**Request:**
```json
{ "status": "PROCESSING", "note": "Optional internal note", "expectedVersion": 3 }
```

Only allow documented transitions. Validate the current state on the server; use atomic compare-and-set/version check. Do not let this endpoint mark an order `PAID` or `REFUNDED`; those states are driven by verified payment/refund events. Return `409 INVALID_STATE_TRANSITION` or `409 VERSION_CONFLICT` when appropriate.

#### `POST /api/admin/orders/:orderId/cancel`

**Request:** `{ "reason": "Out of stock", "notifyCustomer": true }`

Check fulfillment/payment state, release reserved stock exactly once, handle refund workflow if payment was captured, preserve audit history, and notify customer asynchronously. A cancellation of a paid order must not falsely imply that a refund is complete.

#### `POST /api/admin/orders/:orderId/mark-cod-collected`

**Request:** `{ "amountPaise": 0, "collectedAt": "2026-10-14T12:00:00.000Z", "note": "Optional" }`

Permission: `orders:collect-cod` or ADMIN. Validate order is COD, delivered/eligible per policy, amount is positive and not greater than outstanding. Save actor and audit event. Never use this route for online payments.

### 8.6 Customers

`GET /api/admin/customers` supports bounded search by name/email/phone and paging. `GET /api/admin/customers/:userId` returns profile, order summaries and permitted notes. Do not expose Firebase credentials/tokens. Mask phone/email in reports for roles that do not need full details. Customer export requires a specific permission and audit entry.

### 8.7 Dashboard

`GET /api/admin/dashboard?from=...&to=...` returns configured KPIs such as order count, gross order value, captured payments, refunds, net sales definition, low-stock count, pending fulfillment and recent orders. Clearly define each metric; do not label placed order value as revenue if payment has not been captured. Apply finance permissions to financial metrics.

### 8.8 Settings

`GET /api/admin/settings` returns operational settings filtered by permission. `PATCH /api/admin/settings` accepts allowlisted fields only: store display settings, shipping rules, COD enablement, coupon policy, reservation TTL, low-stock threshold, notification toggles, tax settings and public contact links. Secret credentials are environment variables/secret-manager values and must not be editable or readable through this API. High-impact changes require ADMIN permission and an audit log.

### 8.9 Review Moderation

#### `GET /api/admin/reviews`
**Auth:** STAFF or ADMIN with `reviews:read` permission.  
**Query:** `page`, `limit`, `status=PENDING|APPROVED|REJECTED`, `productId`, `sort`.  
Returns submitted customer reviews, author metadata, purchased `orderId`, verified-purchase indicator, rating, review text, and moderation status.

#### `PATCH /api/admin/reviews/:reviewId`
**Auth:** STAFF or ADMIN with `reviews:write` permission.  
**Request:**
```json
{
  "status": "APPROVED",
  "moderationNote": "Verified genuine customer purchase"
}
```
Transitions review status to `APPROVED` or `REJECTED`. Approving a review automatically recalculates the product's public aggregate rating and approved review count. An audit log record is created.

#### `DELETE /api/admin/reviews/:reviewId`
**Auth:** ADMIN only.  
Permanently purges spam, abusive, or fraudulent reviews with recorded administrative reason.

---

## 9. Inventory APIs

### 9.1 `GET /api/admin/inventory`

Query: `page`, `limit`, `q`, `lowStock`, `productId`, `sort`. Return `productId`, SKU, stock on hand, reserved quantity, available quantity, reorder threshold and updated time according to permission. Formula: `available = onHand - reserved`; all quantities must remain non-negative unless an explicitly approved adjustment policy says otherwise.

### 9.2 `POST /api/admin/inventory/adjustments`

**Header:** `Idempotency-Key`.  
**Request:**
```json
{
  "productId": "product_id",
  "quantityDelta": 10,
  "reason": "STOCK_RECEIVED",
  "reference": "Optional supplier/reference ID",
  "note": "Optional explanation"
}
```

Supported reason values should be an enum, e.g. `STOCK_RECEIVED`, `DAMAGED`, `EXPIRED`, `COUNT_CORRECTION`, `RETURN_RESTOCKED`, `OTHER`. Reject zero deltas and any adjustment that would produce invalid stock. High-impact adjustments can require approval. Create an immutable inventory movement record; never edit/delete past movement rows. Inventory adjustment is not a general-purpose direct stock overwrite endpoint.

### 9.3 `GET /api/admin/inventory/movements`

Query: `page`, `limit`, `productId`, `reason`, `from`, `to`, `actorUid`. Return movement ledger and actor/action metadata. Restrict actor UID visibility to ADMIN where appropriate.

### 9.4 Atomic inventory rules

- **Production / Multi-document Transactions:** When running on MongoDB Atlas or a configured Replica Set, wrap order creation, stock reservation, and inventory movement record creation in a single ACID transaction session (`session.withTransaction(...)`).
- **Standalone Local Development Fallback:** If local MongoDB runs without a Replica Set, transactions will fail. The system must use atomic conditional updates as a reliable fallback:
  ```ts
  const res = await Product.updateOne(
    { _id: productId, stockQuantity: { $gte: quantity } },
    { $inc: { stockQuantity: -quantity } }
  );
  if (res.modifiedCount === 0) throw new DomainError("INSUFFICIENT_STOCK");
  ```
  Followed by inserting the `InventoryMovement` with its unique idempotency key.
- Never use client-provided availability.
- Order/payment/webhook retries must not decrement stock more than once.
- Release reservations only once on expiry/cancellation/failure.
- Stock changes require an immutable inventory movement and audit record.

---

## 10. Coupon APIs

### 10.1 `GET /api/admin/coupons`

Query: `page`, `limit`, `q`, `status`, `activeAt`.

### 10.2 `POST /api/admin/coupons`

**Request:**
```json
{
  "code": "WELCOME",
  "type": "PERCENTAGE",
  "value": 10,
  "maxDiscountPaise": 0,
  "minimumSubtotalPaise": 0,
  "startsAt": "2026-10-20T00:00:00.000Z",
  "endsAt": "2026-11-01T23:59:59.000Z",
  "usageLimit": 100,
  "perCustomerLimit": 1,
  "eligibleProductIds": [],
  "eligibleCategoryIds": [],
  "isActive": true,
  "stackable": false
}
```

For `PERCENTAGE`, `value` is a percentage in a bounded range and `maxDiscountPaise` caps the discount. For `FIXED`, value must be explicitly represented as `valuePaise` in the implementation schema; do not mix paise and percentage in one ambiguous field. Coupon codes are normalized (trimmed, case-insensitive) and unique. Usage counters must be concurrency-safe and updated only as part of the successful order workflow.

### 10.3 `GET/PATCH /api/admin/coupons/:couponId`

Read/update allowlisted coupon fields. Avoid modifying historic orders when a coupon changes; order discount snapshot remains immutable. `POST /api/admin/coupons/:couponId/disable` immediately prevents future use without altering existing orders.

---

## 11. Reports and exports

### 11.1 `GET /api/admin/reports/sales?from=...&to=...&groupBy=day`

Returns date buckets and defined financial metrics. Validate maximum date range. Use payment-captured/refund records for payment-based totals, and clearly separate placed orders, captured amount, refunded amount and net captured amount.

### 11.2 `GET /api/admin/reports/products?from=...&to=...`

Returns units sold, order count, gross item value, discounts attributed where available, and return/refund summaries. Product identity and item price come from immutable order snapshots.

### 11.3 `GET /api/admin/reports/inventory`

Returns current stock, reserved stock, available stock, low-stock products and inventory movements in selected range.

### 11.4 `GET /api/admin/reports/export?type=orders&from=...&to=...&format=csv`

Only allowlisted report types and fields. Require export permission, limit row count/date range, audit each export and use `text/csv` with safe filenames. Neutralize spreadsheet formula injection in exported cells (`=`, `+`, `-`, `@` prefixes). Large exports should be generated asynchronously and delivered through a short-lived authorized download link; do not expose a public permanent URL.

### 11.5 Audit logs

`GET /api/admin/audit-logs` is ADMIN-only. Filter by actor, action, resource type/ID and date range. Logs should be append-only from application code and must avoid storing sensitive request bodies or credentials.

---

## 12. Notifications and background processing

Email is a server-side side effect, not a synchronous dependency for checkout success. Use a durable job/outbox record or a retryable queue pattern.

Events that may trigger email:
- order placed/received;
- payment confirmed or failed;
- order status/shipping update;
- cancellation/refund status;
- admin account/security events.

The notification service must be idempotent per event/template/recipient. Resend failure should be retried and logged; it must not duplicate orders or roll back a successful payment. Never send sensitive payment information by email. SMS/WhatsApp are not part of this API unless a provider is selected and separately designed.

Suggested internal-only job handlers (not public API routes):
- `expireStockReservations()`
- `processWebhookEvent(eventId)`
- `sendTransactionalEmail(notificationId)`
- `reconcilePendingPayments()`
- `retryFailedNotifications()`
- `generateReportExport(exportId)`

Protect cron/job endpoints with a deployment secret or invoke them through a trusted queue; never expose an unauthenticated job trigger.

---

## 13. Data validation and limits

| Field | Rule |
|---|---|
| Product ID/order ID/category ID | Valid MongoDB ObjectId format or exact internal ID format |
| Quantity | Integer `1..configuredMaxPerLine`; enforce total line count limit |
| Money | Integer paise, finite, non-negative, bounded by configured business limits |
| Currency | `INR` only for v1 |
| Rating | Integer `1..5` |
| Coupon code | Trimmed, normalized, length-limited, allowlisted characters |
| Phone | Normalize to E.164 or a consistent India format; validate server-side |
| Postal code | Validate format and serviceability rules; don't assume format alone proves serviceability |
| Text | Trim; set field-specific maximum lengths; escape when rendered |
| URLs | HTTPS only for public images; validate Cloudinary host/account and allowlisted redirect destinations |
| Dates | ISO 8601; reject invalid ranges and excessive report windows |
| Uploads | Images only, configured maximum size and dimensions; admin auth required |
| Request body | Set endpoint-specific size limits; reject oversized requests |

Do not allow arbitrary `$where`, MongoDB operators, object paths, file paths, HTML or server-side template input. Use explicit DTOs and map them to database updates; never spread the entire request body into a Mongoose update.

---

## 14. Error code registry

| Code | Typical status | Meaning |
|---|---:|---|
| `VALIDATION_ERROR` | 400 | Invalid request fields |
| `UNAUTHENTICATED` | 401 | Missing/invalid Firebase token |
| `FORBIDDEN` | 403 | Insufficient role/permission |
| `NOT_FOUND` | 404 | Resource not found or not visible |
| `PRODUCT_NOT_FOUND` | 404 | Product unavailable publicly |
| `PRODUCT_NOT_PURCHASABLE` | 422 | Product not published/active |
| `PRODUCT_NOT_READY_TO_PUBLISH` | 422 | Required catalog fields are missing/unapproved |
| `INSUFFICIENT_STOCK` | 409 | Requested quantity unavailable |
| `PRICE_CHANGED` | 409 | Checkout amount changed; refresh quote |
| `COUPON_INVALID` | 422 | Coupon does not qualify |
| `COUPON_LIMIT_REACHED` | 409 | Usage limit reached concurrently |
| `IDEMPOTENCY_KEY_REUSED` | 409 | Same key submitted with different request |
| `ORDER_NOT_FOUND` | 404 | Order unavailable to caller |
| `ORDER_NOT_CANCELLABLE` | 409 | Current order state disallows cancellation |
| `INVALID_STATE_TRANSITION` | 409 | Unsupported order/payment transition |
| `VERSION_CONFLICT` | 409 | Resource changed since read |
| `PAYMENT_CREATION_FAILED` | 503 | Provider order creation unavailable |
| `PAYMENT_VERIFICATION_FAILED` | 422 | Signature/relationship invalid |
| `PAYMENT_NOT_CONFIRMED` | 409 | Provider has not confirmed payment |
| `REFUND_EXCEEDS_BALANCE` | 422 | Requested refund exceeds refundable balance |
| `WEBHOOK_SIGNATURE_INVALID` | 400 | Provider signature invalid |
| `RATE_LIMITED` | 429 | Too many requests |
| `DEPENDENCY_UNAVAILABLE` | 503 | Temporary DB/provider/email failure |
| `INTERNAL_ERROR` | 500 | Unexpected error; generic message only |

Use a consistent mapping and avoid exposing whether a private resource belongs to a different user when that would leak data.

---

## 15. Security requirements per route

1. **Firebase:** use Firebase Admin SDK to verify ID token, expiry, revocation policy and UID. Cache verified identity only according to SDK/security guidance.
2. **RBAC:** role and permissions from trusted server-side profile/configuration. Never accept role from client.
3. **Guest access:** issue unguessable, scoped, expiring guest order access tokens; store a hash if persisted. Do not place tokens in analytics/logs.
4. **Razorpay:** secret and webhook secret only in server environment. Verify checkout signature and webhook raw-body signature. Reconcile amount/currency/provider IDs.
5. **Idempotency:** unique DB index on scope + idempotency key; store request hash and result/resource reference.
6. **MongoDB:** use Mongoose schema validation, explicit query filters, indexes and least-privilege database credentials. Never expose DB errors to clients.
7. **Rate limits:** stricter limits for checkout, coupon validation, reviews, login-related helpers, uploads, search and exports.
8. **CSRF/CORS:** if auth is cookie-based, use CSRF protection and secure SameSite cookies. If using Bearer ID tokens, configure CORS narrowly and do not enable wildcard credentials.
9. **PII:** minimize stored customer data; restrict admin views and exports; mask contact details where possible.
10. **Audit:** audit catalog publication, price changes, stock adjustments, order transitions, refunds, settings, role changes and exports.
11. **Secrets:** use deployment environment/secret manager; never prefix server secrets with `NEXT_PUBLIC_`.
12. **Logs:** redact authorization headers, tokens, payment signatures, full addresses and sensitive provider payloads.
13. **Webhook:** raw-body signature verification, event dedupe, replay-safe processing and safe retry behavior.
14. **Uploads:** signed uploads only, fixed folders, MIME/size checks, server-side asset verification.
15. **Operational:** monitor failed payment/webhook reconciliation, stale reservations, stock conflicts and notification failures.

---

## 16. Recommended implementation folder mapping

```text
src/app/api/
  health/route.ts
  products/route.ts
  products/[slug]/route.ts
  categories/route.ts
  categories/[slug]/route.ts
  banners/route.ts
  site-settings/public/route.ts
  shipping/estimate/route.ts
  coupons/validate/route.ts
  checkout/validate/route.ts
  newsletter/route.ts
  orders/route.ts
  orders/track/route.ts
  payments/razorpay/create-order/route.ts
  payments/razorpay/verify/route.ts
  webhooks/razorpay/route.ts
  me/route.ts
  me/addresses/route.ts
  me/addresses/[addressId]/route.ts
  me/orders/route.ts
  me/orders/[orderId]/route.ts
  me/orders/[orderId]/cancel-request/route.ts
  me/wishlist/route.ts
  me/wishlist/[productId]/route.ts
  products/[productId]/reviews/route.ts
  admin/dashboard/route.ts
  admin/products/route.ts
  admin/products/[productId]/route.ts
  admin/products/[productId]/publish/route.ts
  admin/categories/route.ts
  admin/categories/[categoryId]/route.ts
  admin/orders/route.ts
  admin/orders/[orderId]/route.ts
  admin/orders/[orderId]/status/route.ts
  admin/orders/[orderId]/refunds/route.ts
  admin/reviews/route.ts
  admin/reviews/[reviewId]/route.ts
  admin/inventory/route.ts
  admin/inventory/adjustments/route.ts
  admin/inventory/movements/route.ts
  admin/coupons/route.ts
  admin/coupons/[couponId]/route.ts
  admin/banners/route.ts
  admin/banners/[bannerId]/route.ts
  admin/uploads/cloudinary-signature/route.ts
  admin/settings/route.ts
  admin/reports/sales/route.ts
  admin/reports/products/route.ts
  admin/reports/inventory/route.ts
  admin/reports/export/route.ts
  admin/audit-logs/route.ts

src/lib/api/
  response.ts
  errors.ts
  request-id.ts
  rate-limit.ts
  idempotency.ts
  pagination.ts
src/lib/auth/
  firebase-admin.ts
  require-user.ts
  require-permission.ts
src/schemas/api/
  product.ts
  checkout.ts
  order.ts
  payment.ts
  address.ts
  coupon.ts
  inventory.ts
  admin.ts
src/services/
  product.service.ts
  category.service.ts
  checkout.service.ts
  pricing.service.ts
  order.service.ts
  payment.service.ts
  refund.service.ts
  inventory.service.ts
  coupon.service.ts
  shipping.service.ts
  notification.service.ts
  cloudinary.service.ts
  wishlist.service.ts
  review.service.ts
  newsletter.service.ts
  report.service.ts
  audit.service.ts
```

Route handlers should be thin: parse request, authenticate/authorize, validate DTO, call service, map result/error to response. Business logic and transactions belong in server-only service modules.

---

## 17. Environment variables required

```dotenv
# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development

# MongoDB (server only)
MONGODB_URI=

# Firebase client configuration (public values as provided by Firebase)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server only; use platform secret manager in production)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Razorpay (server secret must not be NEXT_PUBLIC_)
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Resend
RESEND_API_KEY=
EMAIL_FROM=

# Security/operations
CRON_SECRET=
RATE_LIMIT_REDIS_URL=
RATE_LIMIT_REDIS_TOKEN=
```

Only configure rate-limit provider variables if that provider is selected. Validate required variables at startup. Keep `.env.local` out of Git. For Firebase Admin, prefer platform-native service credentials or secret manager when available rather than committing a service-account JSON file.

---

## 18. Testing matrix

### Unit tests
- Price calculation, discount caps, shipping and tax configuration.
- Coupon eligibility and concurrent usage caps.
- State transition validation.
- Permission checks and field allowlists.
- Idempotency key/request-hash handling.
- Inventory reservation/release logic.

### Integration tests
- Public API never returns draft/archived products.
- Customer cannot access another customer's profile, address or order.
- Staff/admin permission boundaries are enforced.
- Invalid/expired Firebase token is rejected.
- Client-supplied price/total/status fields are ignored or rejected.
- Duplicate order key returns the same order; reused key with a different body conflicts.
- Concurrent purchases cannot oversell stock.
- Invalid Razorpay signature is rejected.
- Duplicate webhook does not duplicate payment/order/inventory effects.
- Refund amount cannot exceed refundable balance.
- Upload signature cannot authorize arbitrary folder/type.
- CSV export neutralizes spreadsheet formula injection.

### End-to-end tests
1. Browse published product → add to cart → checkout quote → Razorpay test payment → order confirmed.
2. COD checkout → order pending/confirmed per policy → staff marks collection after delivery.
3. Payment fails → order remains unpaid; reservation expires/releases safely.
4. Customer requests cancellation → admin handles transition/refund correctly.
5. Admin creates draft product → uploads image → validates product → publishes → public API exposes it.
6. Admin adjusts stock → movement ledger/audit record is written.
7. Coupon applied → order snapshot preserves discount even if coupon later changes.
8. Email provider unavailable → order/payment still succeeds and notification is retried.

---

## 19. Build order

1. Shared response/error helpers, request IDs, Zod schemas and Firebase Admin auth.
2. MongoDB connection, models, indexes and seed scripts.
3. Public categories/products/banners/settings APIs.
4. Admin product/category/media APIs and publish validation.
5. Pricing, shipping estimate, coupon validation and checkout quote.
6. Order creation, idempotency and stock reservation.
7. Razorpay create/verify/webhook and reconciliation tests.
8. Customer profile/address/order APIs and guest-order access.
9. Admin fulfillment, COD collection, cancellation and refund workflow.
10. Inventory ledger, coupons, dashboard/reports/CSV export.
11. Resend outbox/retries, monitoring, rate limits and deployment checks.

---

## 20. Decisions to confirm before production

The API intentionally leaves these business decisions configurable rather than inventing values:

- Approved prices, sale prices, SKU values, product images and exact product claims/specifications.
- Shipping fee rules, free-shipping threshold, delivery/serviceability policy and carrier/tracking integration.
- Tax/GST configuration and invoice requirements, confirmed by the business/accountant.
- COD availability, limits, confirmation process and collection policy.
- Coupon stacking, eligibility, refund treatment and usage limits.
- Stock reservation TTL and low-stock thresholds.
- Cancellation/return window, refund policy and who can approve refunds.
- Customer account/guest checkout policy and retention/deletion requirements.
- Staff roles/permissions and whether separate finance/support roles are needed.
- Resend sender domain and notification templates.

**Production release gate:** run security review, payment test-mode flows, webhook replay tests, concurrency tests, privacy/legal review, backups/restore test and a real end-to-end order test before switching Razorpay to live mode.
