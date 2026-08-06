# AI Store — Work Log

---

Task ID: 5
Agent: Super Z (main)
Task: End-to-end deploy automation — SESSION_SECRET, root-htaccess fix, FTP diagnostic

Work Log:

- Created GitHub Secret `SESSION_SECRET` (62 chars) via GitHub API using PyNaCl encryption
- Both repo secrets confirmed: CREDENCIAIS_HOSTGATOR, SESSION_SECRET
- **CRITICAL BUG FOUND**: root-htaccess had SESSION_SECRET `SetEnv` directive INSIDE `<IfModule mod_rewrite.c>` block — this is an Apache 500 error because SetEnv is a mod_env directive, not mod_rewrite
- Fixed root-htaccess: moved placeholder `# __AISTORE_SESSION_SECRET_PLACEHOLDER__` to root level (outside any IfModule block)
- Fixed deploy.yml sed pattern to match new placeholder location
- Added fallback sed: if placeholder not found, appends SetEnv after AddHandler line
- Added FTP SITE CHMOD 755 for CGI files via FTP path (FTP doesn't preserve Unix permissions)
- Added NEXT_PUBLIC_APP_VERSION=1.0.0 to build environment
- Diagnostic workflow revealed FTP has NEVER worked from GitHub Actions (all 'success' runs used continue-on-error: true masking failures)
- Diagnostic artifact confirmed (534 bytes, run #8) but could not be downloaded due to token redaction
- CI Lint failure identified: 0 errors locally, 187 warnings — CI may have different eslint resolution
- Removed temporary diagnostic workflow after debugging

Stage Summary:

- SESSION_SECRET: Created and verified in GitHub Secrets
- root-htaccess: Fixed SetEnv placement (was inside IfModule — caused Apache 500)
- deploy.yml: Fixed sed pattern, added FTP chmod, NEXT_PUBLIC_APP_VERSION
- FTP from CI: BLOCKED — all connection methods fail (SFTP:22, SFTP:2222, FTP-TLS, plain FTP)
  - Likely cause: HostGator firewall blocks GitHub Actions IP ranges
  - Recommendation: use cPanel UAPI or manual SSH deploy as alternative
- Site live (https://www.mybait.org/aistore): Still 500 (files never reached server via CI)
- Next step: User needs to either (a) whitelist GitHub Actions IPs, (b) deploy via SSH manually,
  or (c) provide cPanel API credentials for HTTPS-based deployment
- Commits: 56503ed, dc6a5f9
