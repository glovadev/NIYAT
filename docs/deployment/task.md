# NIYAT E-Commerce (niyatuae.com) VPS Deployment Task Checklist & Commands

Run these commands in order on your VPS (logged in as `devuser` with `sudo` privileges).

> **Architecture Overview:**  
> NIYAT is a full-stack **Next.js 15 (App Router)** e-commerce platform with Server-Side Rendering (SSR), API routes, MongoDB Atlas integration, and Razorpay checkout.  
>
> **Multi-Site Coexistence on This VPS:**  
> Since your VPS already hosts **NC-Electro**, **NE-Dhanya**, and **Darikana Kitchen** (which occupy ports `3000–3003`, `3005`, `3006`, and `8080`), **NIYAT runs on Port `3007`**.  
>
> **Serving Approach:**  
> - **Node Service (Port 3007):** Next.js runs as a managed `systemd` daemon (`niyat.service`) or via PM2 on port `3007`.  
> - **Nginx Reverse Proxy:** Routes `https://niyatuae.com` and `https://www.niyatuae.com` to `localhost:3007`.  
> - **Direct Static Image Delivery:** Nginx serves product/banner uploads directly from `/var/www/niyatuae.com/public/uploads/` with 30-day client caching, completely bypassing Node.js for maximum performance.

---

## 1. DNS Configuration
Before configuring the server, add the following **A Records** in your domain DNS manager (Hostinger, Cloudflare, GoDaddy, Namecheap, etc.) for `niyatuae.com`:

- [ ] **A Record:** `@` &rarr; `<YOUR_VPS_IP>` (Apex domain: `niyatuae.com`)
- [ ] **A Record:** `www` &rarr; `<YOUR_VPS_IP>` (Subdomain: `www.niyatuae.com`)

*Verify DNS propagation from your terminal before generating SSL certificates:*
```bash
dig +short niyatuae.com
dig +short www.niyatuae.com
```

---

## 2. Server Dependencies Check
Verify that the VPS has Node.js (v18+ or v20+), npm, Nginx, and Certbot ready:

- [ ] **Verify Core Packages & Runtimes**
  ```bash
  # Check Node and npm
  node -v
  npm -v

  # Check Nginx and Certbot
  nginx -v
  certbot --version
  ```

---

## 3. Directory Structure Setup

- [ ] **Create Web Directory Hierarchy**
  ```bash
  # Create application directory
  sudo mkdir -p /var/www/niyatuae.com
  sudo chown -R devuser:devuser /var/www/niyatuae.com
  ```

- [ ] **Create Uploads Storage Folders with Correct Permissions**
  ```bash
  mkdir -p /var/www/niyatuae.com/public/uploads/products
  mkdir -p /var/www/niyatuae.com/public/uploads/banners
  mkdir -p /var/www/niyatuae.com/public/uploads/categories
  chmod -R 775 /var/www/niyatuae.com/public/uploads
  ```

---

## 4. Application Deployment (Next.js 15)

- [ ] **Clone Repository**
  ```bash
  cd /var/www/niyatuae.com

  # Clone repo using SSH (Recommended)
  git clone git@github.com:glovadev/NIYAT.git .

  # (Alternative: using HTTPS)
  # git clone https://github.com/glovadev/NIYAT.git .
  ```

- [ ] **Create Production Environment File (`.env.local`)**
  ```bash
  nano /var/www/niyatuae.com/.env.local
  ```
  *Paste your production configuration:*
  ```env
  # Environment & URLs
  NODE_ENV=production
  PORT=3007
  SITE_URL=https://niyatuae.com
  NEXT_PUBLIC_APP_URL=https://niyatuae.com
  NEXTAUTH_URL=https://niyatuae.com

  # MongoDB Atlas Database
  MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.lwyl6xq.mongodb.net/niyat_ecommerce?retryWrites=true&w=majority

  # Security Token (Generate a random 32-character secret)
  JWT_SECRET=c2e8a10948fb9274e1d35a8bc720f491c12e845763901baef4829104c8f51234

  # Razorpay Payments (Live Keys)
  RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
  RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
  NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
  RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret_here

  # Media Storage Upload Directory (Permanent on VPS)
  UPLOAD_DIR=/var/www/niyatuae.com/public/uploads
  ```
  *(Press `Ctrl+O`, `Enter`, and `Ctrl+X` to save and exit).*

- [ ] **Install Dependencies & Build Production Bundle**
  ```bash
  cd /var/www/niyatuae.com

  # Install dependencies
  npm install --legacy-peer-deps

  # Build the Next.js production bundle
  npm run build
  ```

- [ ] **Verify Build Output**
  ```bash
  # Confirm the .next directory exists
  ls -la /var/www/niyatuae.com/.next
  ```

---

## 5. Systemd Service Setup (Port 3007)

Running NIYAT as a systemd service ensures it automatically starts on system boots, auto-restarts if a process crashes, and isolates logs.

- [ ] **Create Systemd Service File**
  ```bash
  sudo nano /etc/systemd/system/niyat.service
  ```
  *Paste the service configuration:*
  ```ini
  [Unit]
  Description=NIYAT Royal Apothecary E-Commerce Service
  After=network.target

  [Service]
  Type=simple
  User=devuser
  WorkingDirectory=/var/www/niyatuae.com
  ExecStart=/usr/bin/npm run start -- -p 3007
  Restart=always
  RestartSec=5
  Environment=NODE_ENV=production
  Environment=PORT=3007

  # Memory & Resource Constraints
  MemoryMax=1G
  StandardOutput=journal
  StandardError=journal

  [Install]
  WantedBy=multi-user.target
  ```

- [ ] **Enable & Start NIYAT Service**
  ```bash
  sudo systemctl daemon-reload
  sudo systemctl enable niyat
  sudo systemctl start niyat
  ```

- [ ] **Verify Service is Active on Port 3007**
  ```bash
  # Check status
  sudo systemctl status niyat --no-pager

  # Verify local port binding
  curl -I http://127.0.0.1:3007
  ```

---

## 6. Nginx Configuration

- [ ] **Create Nginx Server Block**
  ```bash
  sudo nano /etc/nginx/sites-available/niyatuae.com
  ```
  *Paste the Nginx configuration:*
  ```nginx
  # Rate limiting zone for API protection
  limit_req_zone $binary_remote_addr zone=niyat_api_limit:10m rate=20r/s;

  server {
      listen 80;
      listen [::]:80;
      server_name niyatuae.com www.niyatuae.com;

      # Allow high-resolution image uploads up to 25MB
      client_max_body_size 25M;

      # Gzip compression
      gzip on;
      gzip_vary on;
      gzip_min_length 1024;
      gzip_proxied any;
      gzip_comp_level 6;
      gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss image/svg+xml;

      # 1. Direct high-speed static delivery for uploaded product/banner images
      location /uploads/ {
          root /var/www/niyatuae.com/public;
          expires 30d;
          add_header Cache-Control "public, max-age=2592000, immutable";
          access_log off;
          try_files $uri =404;
      }

      # 2. Next.js Static Assets (_next/static)
      location /_next/static/ {
          alias /var/www/niyatuae.com/.next/static/;
          expires 365d;
          add_header Cache-Control "public, max-age=31536000, immutable";
          access_log off;
      }

      # 3. Rate-limited API endpoints (Checkout, Auth, Payments)
      location /api/ {
          limit_req zone=niyat_api_limit burst=30 nodelay;

          proxy_pass http://127.0.0.1:3008;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
          proxy_read_timeout 60s;
      }

      # 4. Storefront SSR & Admin Dashboard (Reverse Proxy to Port 3007)
      location / {
          proxy_pass http://127.0.0.1:3007;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
          proxy_cache_bypass $http_upgrade;
          proxy_read_timeout 60s;
      }
  }
  ```

- [ ] **Enable Site & Test Nginx Configuration**
  ```bash
  sudo ln -sf /etc/nginx/sites-available/niyatuae.com /etc/nginx/sites-enabled/
  sudo nginx -t
  sudo systemctl reload nginx
  ```

---

## 7. Generate SSL Certificate with Let's Encrypt (Certbot)

Once DNS is pointed to your VPS IP and Nginx is answering:

- [ ] **Request and Install SSL Certificate**
  ```bash
  sudo certbot --nginx -d niyatuae.com -d www.niyatuae.com
  ```
  *(Select option to automatically redirect HTTP to HTTPS when prompted).*

- [ ] **Verify Auto-Renewal Configuration**
  ```bash
  sudo certbot renew --dry-run
  ```

---

## 8. Verification & Health Checks

- [ ] **Test Live Storefront in Browser**
  - **Homepage:** `https://niyatuae.com`
  - **Shop Catalog:** `https://niyatuae.com/shop`
  - **Product Page (Desktop & Mobile):** `https://niyatuae.com/products/24k-gold-whitening-cream`
  - **Cart & Checkout Flow:** Test adding items to bag and opening checkout.
  - **Admin Backoffice:** `https://niyatuae.com/admin/products`
  - **Image Upload:** Upload a product photo to confirm it saves into `/var/www/niyatuae.com/public/uploads/` and loads directly without errors.

- [ ] **Monitor Application Logs if Needed**
  ```bash
  # Check live Node application logs
  sudo journalctl -u niyat -f

  # Check Nginx error and access logs
  sudo tail -n 50 -f /var/log/nginx/error.log
  sudo tail -n 50 -f /var/log/nginx/access.log
  ```

---

## 9. Ongoing Updates (1-Step Redeployment)

Whenever you push new code to `https://github.com/glovadev/NIYAT.git`:

```bash
cd /var/www/niyatuae.com

# 1. Pull latest code
git pull origin main

# 2. Install any newly added packages
npm install --legacy-peer-deps

# 3. Build optimized production bundle
npm run build

# 4. Restart the service
sudo systemctl restart niyat
```
*(Your store reloads in ~1 second with all product databases and uploaded photos completely intact!)*

