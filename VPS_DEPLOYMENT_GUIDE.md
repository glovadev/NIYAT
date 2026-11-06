# NIYAT E-Commerce — Complete VPS Hosting & Deployment Guide

This guide walks you through deploying your **NIYAT E-Commerce Next.js 15 App** onto any Linux Virtual Private Server (VPS) such as:
- **DigitalOcean** (Droplet - Ubuntu 24.04 or 22.04 LTS)
- **Hostinger VPS**
- **Hetzner Cloud**
- **Linode / Akamai**
- **AWS EC2 / Lightsail**
- **Vultr**

---

## Why VPS is Superior to Vercel for this Store

1. **Persistent Local Image Uploads**: Product, banner, and category photos saved into `public/uploads/` remain **permanently** on your VPS disk. On Vercel, the filesystem is ephemeral and deletes uploaded files on every restart/redeploy.
2. **Direct High-Speed Nginx Delivery**: Nginx delivers images directly from your disk with caching, bypassing Node.js completely for speed.
3. **No Execution Limits**: No 10-second serverless timeout limits on checkout, order processing, or bulk operations.
4. **Fixed Monthly Cost**: Predictable \$4–\$12/month with unlimited traffic, no surprising serverless usage bills.

---

## Architecture Overview

```
[Customer Browser / Mobile]
            │
            ▼
   [Nginx Reverse Proxy]  (Ports 80 & 443 with Free SSL)
      │               │
      │ /uploads/*    │ All Web Pages & API routes
      ▼               ▼
[Disk /public]   [Node.js Next.js 15 via PM2] (Port 3000)
                      │
                      ▼
             [MongoDB Atlas DB]
```

---

## Step 1: Prepare Your VPS (Initial Setup)

Connect to your VPS via SSH from your computer terminal (or PowerShell / PuTTY):

```bash
ssh root@YOUR_VPS_IP
```

### 1.1 Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Node.js 20 LTS & Build Tools
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx build-essential
```

Verify versions:
```bash
node -v   # Should output v20.x.x
npm -v    # Should output v10.x.x
```

### 1.3 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

---

## Step 2: Clone & Configure NIYAT Codebase

### 2.1 Clone Repository into `/var/www/niyat-ecommerce`
```bash
sudo mkdir -p /var/www
cd /var/www
git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git niyat-ecommerce
cd niyat-ecommerce
```

### 2.2 Configure File Permissions for Image Uploads
Ensure Node.js and Nginx can read and write uploaded images:
```bash
sudo mkdir -p public/uploads/products public/uploads/banners public/uploads/categories
sudo chown -R $USER:www-data /var/www/niyat-ecommerce
sudo chmod -R 775 public/uploads
```

### 2.3 Create Production Environment File (`.env.local`)
Create your environment file on the server:
```bash
nano .env.local
```

Paste your production secrets:
```env
# Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.lwyl6xq.mongodb.net/niyat_ecommerce?retryWrites=true&w=majority

# App URLs
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
JWT_SECRET=your_super_strong_random_jwt_secret_key_here

# Payment Gateway (Razorpay Live or Test Keys)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# Production Flag
NODE_ENV=production
PORT=3000
```
Save and exit: press `Ctrl + O`, then `Enter`, then `Ctrl + X`.

---

## Step 3: Build the Application

Install project dependencies and build the optimized Next.js production bundle:

```bash
npm install --legacy-peer-deps
npm run build
```

You should see:
```
✓ Compiled successfully
✓ Generating static pages (24/24)
✓ Finalizing page optimization
```

---

## Step 4: Start Next.js with PM2 (Auto-Restart 24/7)

The project includes an `ecosystem.config.cjs` file configured for clustering and memory limits.

```bash
# Start the app with PM2
pm2 start ecosystem.config.cjs

# Save PM2 state so it restarts automatically on VPS reboot
pm2 save
pm2 startup
```
*(Copy and run the `sudo env PATH=...` command that `pm2 startup` displays if prompted).*

Check running status:
```bash
pm2 status
pm2 logs niyat-store --lines 50
```

---

## Step 5: Configure Nginx as Reverse Proxy

### 5.1 Copy Nginx Config
```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/niyat.conf
```

### 5.2 Edit Domain Name
Open `/etc/nginx/sites-available/niyat.conf`:
```bash
sudo nano /etc/nginx/sites-available/niyat.conf
```
Change `yourdomain.com www.yourdomain.com` to your real domain name (or your VPS IP if you don't have a domain yet).

### 5.3 Enable Site and Test Nginx
```bash
# Enable the site
sudo ln -sf /etc/nginx/sites-available/niyat.conf /etc/nginx/sites-enabled/

# Remove default site if present
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 6: Enable Free SSL (HTTPS) with Certbot

Once your domain's DNS `A` record points to your VPS IP:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

- Enter your email address.
- Agree to Terms of Service.
- Certbot will automatically issue and configure the SSL certificate with automatic renewal!

---

## Step 7: Configure VPS Firewall (Security)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Step 8: How to Deploy Updates in the Future (1-Click)

Whenever you push new code to GitHub, simply SSH into your VPS and run:

```bash
cd /var/www/niyat-ecommerce
chmod +x deploy.sh
./deploy.sh
```

The script will:
1. Pull latest commits from GitHub
2. Install any new dependencies
3. Build the Next.js bundle
4. Ensure upload folder permissions
5. Reload PM2 with **zero downtime**!

