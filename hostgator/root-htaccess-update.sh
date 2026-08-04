#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Update the ROOT .htaccess on HostGator to support /aistore/
# Run this ONCE via SSH to update the existing root .htaccess
# ═══════════════════════════════════════════════════════════
# The existing root .htaccess has:
#   RewriteRule ^api/(.*)$ /api.cgi/$1 [QSA,L,E=PATH_INFO:/$1]
# We need to ensure /aistore/ requests are NOT caught by this rule
# and are instead handled by the nested /aistore/.htaccess
# ═══════════════════════════════════════════════════════════

HOME="${HOME:-/home1/luca2490}"
HTACCESS="$HOME/public_html/.htaccess"

if [ ! -f "$HTACCESS" ]; then
  echo "Creating root .htaccess..."
  cat > "$HTACCESS" << 'EOF'
# b'AI'tcoin + AI Store — HostGator Root .htaccess

<IfModule mod_rewrite.c>
  RewriteEngine On

  # b'AI'tcoin API routing (catches /api/* EXCEPT /aistore/*)
  RewriteCond %{REQUEST_URI} !^/aistore
  RewriteRule ^api/(.*)$ /api.cgi/$1 [QSA,L,E=PATH_INFO:/$1]
</IfModule>

# Security headers
<IfModule mod_headers.c>
  Header set X-Frame-Options "DENY"
  Header set X-Content-Type-Options "nosniff"
</IfModule>

# Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json
</IfModule>

# Cache
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType application/pdf "access plus 1 month"
</IfModule>

ErrorDocument 404 /index.html
EOF
  echo "Done. Root .htaccess created."
  exit 0
fi

# Check if /aistore exclusion already exists
if grep -q 'aistore' "$HTACCESS"; then
  echo "Root .htaccess already has aistore exclusion."
else
  echo "Updating root .htaccess to exclude /aistore/ from b'AI'tcoin API rule..."
  # Backup original
  cp "$HTACCESS" "${HTACCESS}.bak.$(date +%Y%m%d%H%M%S)"
  # Add exclusion before the api rewrite rule
  sed -i '/RewriteRule.*api\.cgi.*PATH_INFO/i\  RewriteCond %{REQUEST_URI} !^/aistore' "$HTACCESS"
  echo "Done. Backup saved as ${HTACCESS}.bak.*"
fi
