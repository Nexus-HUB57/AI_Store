#!/bin/bash
# ═══════════════════════════════════════════════════════════
# AI Store Setup — HostGator Shared Hosting
# ═══════════════════════════════════════════════════════════
# Run once via SSH or via the deploy workflow.
# Installs Node.js, extracts the build, generates Prisma client.
# ═══════════════════════════════════════════════════════════
set -e

if [ -z "$HOME" ] || [ "$HOME" = "/" ]; then
    # Fallback for CGI/Non-interactive environments
    CURRENT_PWD=$(pwd)
    if [[ "$CURRENT_PWD" == *"/public_html"* ]]; then
        HOME="${CURRENT_PWD%/public_html*}"
    else
        HOME="/home1/luca2490"
    fi
fi
export HOME
INSTALL="$HOME/aistore-api"
NODE_VERSION="v20.18.0"
NODE_DIR="$INSTALL/node-v20.18.0-linux-x64"
NODE_BIN="$NODE_DIR/bin/node"
NPM_BIN="$NODE_DIR/bin/npm"
STANDALONE_DIR="$INSTALL/standalone"

log() { echo "[SETUP] $(date '+%H:%M:%S') $*"; }

log "=== AI Store Setup Started ==="

# ── Create install directory ──
mkdir -p "$INSTALL"
cd "$INSTALL"
log "Working directory: $INSTALL"

# ── Install Node.js if not present ──
if [ ! -x "$NODE_BIN" ]; then
    log "Installing Node.js $NODE_VERSION..."
    NODE_TAR="node-$NODE_VERSION-linux-x64.tar.xz"
    NODE_URL="https://nodejs.org/dist/$NODE_VERSION/$NODE_TAR"

    if [ -f "$NODE_TAR" ]; then
        log "Using cached $NODE_TAR"
    else
        log "Downloading $NODE_URL..."
        curl -fsSL "$NODE_URL" -o "$NODE_TAR" 2>&1 || {
            log "ERROR: Failed to download Node.js"
            exit 1
        }
    fi

    tar -xJf "$NODE_TAR"
    rm -f "$NODE_TAR"
    log "Node.js installed: $("$NODE_BIN" --version)"
else
    log "Node.js already installed: $("$NODE_BIN" --version)"
fi

# ── Extract codebase if uploaded ──
if [ -f "$HOME/public_html/aistore-codebase.tar.gz" ]; then
    log "Extracting codebase..."
    mkdir -p "$STANDALONE_DIR"
    cd "$STANDALONE_DIR"
    tar xzf "$HOME/public_html/aistore-codebase.tar.gz"
    log "Codebase extracted to $STANDALONE_DIR"
elif [ -f /tmp/aistore-codebase.tar.gz ]; then
    log "Extracting codebase from /tmp..."
    mkdir -p "$STANDALONE_DIR"
    cd "$STANDALONE_DIR"
    tar xzf /tmp/aistore-codebase.tar.gz
    log "Codebase extracted to $STANDALONE_DIR"
fi

# ── Ensure database directory exists ──
mkdir -p "$INSTALL/db"

# ── Copy database if included in codebase ──
if [ -f "$STANDALONE_DIR/db/custom.db" ] && [ ! -f "$INSTALL/db/custom.db" ]; then
    cp "$STANDALONE_DIR/db/custom.db" "$INSTALL/db/custom.db"
    log "Database copied to $INSTALL/db/custom.db"
fi

# ── Install production dependencies in standalone ──
if [ -f "$STANDALONE_DIR/package.json" ]; then
    log "Installing production dependencies..."
    cd "$STANDALONE_DIR"
    PATH="$NODE_DIR/bin:$PATH" "$NPM_BIN" install --production --no-optional 2>&1 | tail -5
    log "Dependencies installed"
fi

# ── Generate Prisma client ──
if [ -d "$STANDALONE_DIR/prisma" ]; then
    log "Generating Prisma client..."
    cd "$STANDALONE_DIR"
    DATABASE_URL="file:$INSTALL/db/custom.db" \
        PATH="$NODE_DIR/bin:$PATH" \
        "$NPM_BIN" exec prisma generate --datasource-provider sqlite 2>&1 || \
        PATH="$NODE_DIR/bin:$PATH" \
        DATABASE_URL="file:$INSTALL/db/custom.db" \
        "$NPM_BIN" exec npx prisma generate --datasource-provider sqlite 2>&1 || true
    log "Prisma client generated"
fi

# ── Verify server.js exists ──
if [ -f "$STANDALONE_DIR/server.js" ]; then
    log "server.js found at $STANDALONE_DIR/server.js"
else
    log "WARNING: server.js not found. The build may not have standalone output."
fi

# ── Patch root .htaccess — NON-DESTRUCTIVE ──
log "Patching root .htaccess (non-destructive)..."
ROOT_HT="$HOME/public_html/.htaccess"

if [ ! -f "$ROOT_HT" ]; then
    log "Creating root .htaccess..."
    cat > "$ROOT_HT" << 'ROOTHT'
# b'AI'tcoin + AI Store — HostGator Root .htaccess
# CAUTION: Do NOT add 'Options +ExecCGI' — causes 500 on shared hosting
AddHandler cgi-script .cgi

<IfModule mod_rewrite.c>
  RewriteEngine On
  # b'AI'tcoin API routing (catches /api/* EXCEPT /aistore/*)
  RewriteCond %{REQUEST_URI} !^/aistore
  RewriteRule ^api/(.*)$ /api.cgi/$1 [QSA,L,E=PATH_INFO:/$1]
</IfModule>

<IfModule mod_headers.c>
  Header set X-Frame-Options "DENY"
  Header set X-Content-Type-Options "nosniff"
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType application/pdf "access plus 1 month"
</IfModule>

ErrorDocument 404 /index.html
ROOTHT
else
    # Non-destructive: only add what's missing, never remove existing rules
    log "Root .htaccess exists — patching safely..."
    cp "$ROOT_HT" "${ROOT_HT}.bak.$(date +%Y%m%d%H%M%S)"

    # Remove 'Options +ExecCGI' if present (causes 500 on shared hosting)
    if grep -q 'Options +ExecCGI' "$ROOT_HT" 2>/dev/null; then
        sed -i '/Options +ExecCGI/d' "$ROOT_HT"
        log "Removed 'Options +ExecCGI' (causes 500 on shared hosting)"
    fi

    # Ensure AddHandler cgi-script is present
    if ! grep -q 'AddHandler cgi-script' "$ROOT_HT" 2>/dev/null; then
        sed -i '1i AddHandler cgi-script .cgi' "$ROOT_HT"
        log "Added 'AddHandler cgi-script .cgi'"
    fi

    # Ensure /aistore exclusion exists before b'AI'tcoin api.cgi rule
    if grep -q 'RewriteRule.*api\.cgi' "$ROOT_HT" 2>/dev/null && ! grep -q '!^/aistore' "$ROOT_HT" 2>/dev/null; then
        sed -i '/RewriteRule.*api\.cgi/i\  RewriteCond %{REQUEST_URI} !^/aistore' "$ROOT_HT"
        log "Added /aistore exclusion to b'AI'tcoin API rule"
    fi
fi

log "Root .htaccess patched safely"

# ── Set permissions ──
chmod +x "$HOME/public_html/aistore/api.cgi" 2>/dev/null || true
chmod +x "$HOME/public_html/api.cgi" 2>/dev/null || true

log "=== AI Store Setup Complete ==="
log ""
log "Install dir:    $INSTALL"
log "Node.js:        $("$NODE_BIN" --version 2>/dev/null || echo 'NOT FOUND')"
log "Server:         $STANDALONE_DIR/server.js"
log "Database:       $INSTALL/db/custom.db"
log "CGI Gateway:    $HOME/public_html/aistore/api.cgi"
log ""
log "The server will auto-start on first request."
log "Visit: https://www.mybait.org/aistore/"
log "Health: https://www.mybait.org/aistore/api/health"