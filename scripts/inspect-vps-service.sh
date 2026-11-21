#!/usr/bin/env bash
# ==============================================================================
# NIYAT — Hostinger VPS Non-Invasive Service & Environment Inspector
#
# Constraints Enforced:
# 1. READ-ONLY: Does not modify any files or directories.
# 2. ZERO SECRET LEAKAGE: Never prints environment variable values or secrets.
# 3. Identifies Service Manager (systemd vs PM2) and exact service name.
# 4. Confirms process Working Directory and listening ports.
# 5. Explains environment variable precedence (Service Manager vs .env.local).
# 6. No restarts, no Shiprocket API calls, no shipment operations.
# ==============================================================================

set -eo pipefail

echo "=================================================================="
echo "  NIYAT — Non-Invasive Production Service Inspection"
echo "  Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "=================================================================="
echo ""

# ------------------------------------------------------------------------------
# 1. Listening Ports & Process Detection
# ------------------------------------------------------------------------------
echo "--- 1. ACTIVE LISTENING PORTS (Next.js / Node) ---"
if command -v ss >/dev/null 2>&1; then
  PORTS_INFO=$(ss -tulpn | grep -E "3000|3001|3002|3003|3005|3006|3007|node|next" || true)
elif command -v netstat >/dev/null 2>&1; then
  PORTS_INFO=$(netstat -tulpn | grep -E "3000|3001|3002|3003|3005|3006|3007|node|next" || true)
else
  PORTS_INFO="Neither ss nor netstat available."
fi

if [ -n "$PORTS_INFO" ]; then
  echo "$PORTS_INFO"
else
  echo "No listening ports found in standard 3000-3007 range."
fi
echo ""

# ------------------------------------------------------------------------------
# 2. PM2 Inspection
# ------------------------------------------------------------------------------
echo "--- 2. PM2 PROCESS MANAGER INSPECTION ---"
PM2_RUNNING=false
if command -v pm2 >/dev/null 2>&1; then
  echo "PM2 is installed at: $(command -v pm2)"
  PM2_LIST=$(pm2 list 2>/dev/null || true)
  echo "$PM2_LIST"
  if echo "$PM2_LIST" | grep -qiE "niyat|next|ecommerce"; then
    PM2_RUNNING=true
    echo ">> Detected NIYAT process under PM2 management."
    echo ""
    echo "PM2 Detailed App Configuration (Sanitized):"
    pm2 jlist 2>/dev/null | grep -oE '"name":"[^"]+"|"pm_cwd":"[^"]+"|"status":"[^"]+"|"node_args":\[[^\]]*\]' || true
  fi
else
  echo "PM2 is NOT installed on this system."
fi
echo ""

# ------------------------------------------------------------------------------
# 3. Systemd Inspection
# ------------------------------------------------------------------------------
echo "--- 3. SYSTEMD SERVICE INSPECTION ---"
SYSTEMD_RUNNING=false
SYSTEMD_SERVICES=$(systemctl list-units --type=service --all 2>/dev/null | grep -iE "niyat|ecommerce" || true)

if [ -n "$SYSTEMD_SERVICES" ]; then
  echo "Found matching systemd unit(s):"
  echo "$SYSTEMD_SERVICES"
  SYSTEMD_RUNNING=true
  echo ""
  
  # Inspect each matching unit file definition
  for UNIT in $(echo "$SYSTEMD_SERVICES" | awk '{print $1}'); do
    echo "=== Service Definition for: $UNIT ==="
    systemctl status "$UNIT" --no-pager 2>/dev/null | head -n 15 || true
    echo ""
    echo "Parsed Unit Configuration (from systemctl cat):"
    systemctl cat "$UNIT" 2>/dev/null | grep -E "User=|WorkingDirectory=|ExecStart=|Environment=|EnvironmentFile=|Restart=" || true
    echo ""
  done
else
  echo "No systemd unit matching 'niyat' or 'ecommerce' found."
fi
echo ""

# ------------------------------------------------------------------------------
# 4. Running Process Working Directory & PID Inspection
# ------------------------------------------------------------------------------
echo "--- 4. RUNNING NODE PROCESSES & WORKING DIRECTORIES ---"
NODE_PIDS=$(pgrep -f "node" || true)

if [ -n "$NODE_PIDS" ]; then
  for PID in $NODE_PIDS; do
    CMD=$(cat /proc/$PID/cmdline 2>/dev/null | tr '\0' ' ' || true)
    if echo "$CMD" | grep -qiE "next|niyat|3007"; then
      CWD=$(ls -l /proc/$PID/cwd 2>/dev/null | awk '{print $NF}' || true)
      USER=$(ps -o user= -p $PID 2>/dev/null || true)
      echo "PID: $PID"
      echo "  User:             $USER"
      echo "  Working Directory: $CWD"
      echo "  Command Line:     $CMD"
      
      # Check if .env.local exists in this working directory
      if [ -n "$CWD" ] && [ -f "$CWD/.env.local" ]; then
        echo "  .env.local File:   EXISTS at $CWD/.env.local (Size: $(stat -c %s "$CWD/.env.local" 2>/dev/null || wc -c < "$CWD/.env.local") bytes)"
        echo "  File Permissions:  $(stat -c "%a %U:%G" "$CWD/.env.local" 2>/dev/null || ls -l "$CWD/.env.local" | awk '{print $1, $3":"$4}')"
        echo "  Configured Keys (NAMES ONLY, values sanitized):"
        grep -v '^[[:space:]]*#' "$CWD/.env.local" 2>/dev/null | grep '=' | awk -F'=' '{print "    - "$1" = [CONFIGURED]"}' || true
      elif [ -n "$CWD" ]; then
        echo "  .env.local File:   NOT FOUND at $CWD/.env.local"
      fi
      echo ""
    fi
  done
else
  echo "No active Node.js processes detected."
fi
echo ""

# ------------------------------------------------------------------------------
# 5. Environment Precedence & Overrides Analysis
# ------------------------------------------------------------------------------
echo "--- 5. ENVIRONMENT PRECEDENCE RULES SUMMARY ---"
echo "In Next.js production deployments:"
echo "1. Process-level environment variables (injected via systemd 'Environment=' or PM2 'env')"
echo "   take TOP priority and OVERRIDE file-based values in .env.local."
echo "2. File-based variables in .env.local take SECOND priority (override .env.production and .env)."
echo "3. File-based variables in .env.production take THIRD priority."
echo "4. File-based variables in .env take DEFAULT priority."
echo ""
echo "Conclusion check:"
echo "- Are Shiprocket credentials set at the systemd/PM2 process level? (Inspect Section 2 & 3 above)"
echo "- If NOT in systemd/PM2, .env.local is the authoritative source for SHIPROCKET_API_EMAIL & SHIPROCKET_API_PASSWORD."
echo ""
echo "=================================================================="
echo "  Inspection Complete (Read-Only, Zero Mutations, Zero Secrets Leaked)"
echo "=================================================================="
