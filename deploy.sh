#!/bin/bash
# ==============================================================================
# NIYAT E-Commerce VPS Zero-Downtime Deployment Script
# Usage: ./deploy.sh
# ==============================================================================

set -e # Exit immediately on error

echo "🚀 [1/5] Pulling latest code from git..."
git pull origin main

echo "📦 [2/5] Installing dependencies..."
npm install --legacy-peer-deps

echo "🏗️  [3/5] Building Next.js production application..."
npm run build

echo "📁 [4/5] Ensuring uploads directory permissions..."
mkdir -p public/uploads/products public/uploads/banners public/uploads/categories
chmod -R 775 public/uploads

echo "🔄 [5/5] Reloading PM2 process (Zero Downtime)..."
pm2 reload ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs

echo "✅ Deployment completed successfully! NIYAT E-Commerce is live."

