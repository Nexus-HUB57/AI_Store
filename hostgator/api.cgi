#!/usr/bin/env python3
"""
AI Store CGI Gateway — HostGator Compatible

Boots the Next.js standalone server on first request and proxies all subsequent
requests to it. Same proven pattern as the b'AI'tcoin api.cgi.

Trigger: https://www.mybait.org/aistore/api.cgi/...
"""
import os
import sys
import json
import time
import signal
import subprocess
import traceback
from http.client import HTTPConnection
from urllib.parse import urlparse

# ═══════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════
HOME = os.environ.get('HOME', '/home1/luca2490')
INSTALL_DIR = os.path.join(HOME, 'aistore-api')
NODE_BIN = os.path.join(INSTALL_DIR, 'node-v20.18.0-linux-x64', 'bin', 'node')
SERVER_DIR = os.path.join(INSTALL_DIR, 'standalone')
SERVER_JS = os.path.join(SERVER_DIR, 'server.js')
PIDFILE = os.path.join(INSTALL_DIR, 'server.pid')
LOGFILE = os.path.join(INSTALL_DIR, 'server.log')
SERVER_PORT = 18446
STARTUP_TIMEOUT = 25
MAX_PROXY_TIMEOUT = 30

# ═══════════════════════════════════════════════════════
# Logging to stderr (HostGator error_log)
# ═══════════════════════════════════════════════════════
import logging
logging.basicConfig(
    stream=sys.stderr,
    level=logging.INFO,
    format='[aistore-cgi] %(asctime)s %(levelname)s: %(message)s',
    datefmt='%H:%M:%S'
)
log = logging.getLogger('aistore-cgi')

# ═══════════════════════════════════════════════════════
# HTTP Response Helpers
# ═══════════════════════════════════════════════════════
def respond_json(data, status=200):
    """Send a JSON HTTP response."""
    body = json.dumps(data, default=str).encode('utf-8')
    sys.stdout.write('Status: %d\n' % status)
    sys.stdout.write('Content-Type: application/json\n')
    sys.stdout.write('Content-Length: %d\n' % len(body))
    sys.stdout.write('Access-Control-Allow-Origin: *\n')
    sys.stdout.write('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\n')
    sys.stdout.write('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token, X-Moltbook-Identity\n')
    sys.stdout.write('X-Powered-By: AI-Store-CGI-Gateway\n')
    sys.stdout.write('X-Frame-Options: DENY\n')
    sys.stdout.write('\n')
    sys.stdout.flush()
    os.write(sys.stdout.fileno(), body)


def respond_error(msg, status=503):
    respond_json({"error": msg, "timestamp": time.time()}, status=status)


# ═══════════════════════════════════════════════════════
# Server Manager
# ═══════════════════════════════════════════════════════
def is_server_running():
    """Check if the Node.js server process is alive."""
    if not os.path.exists(PIDFILE):
        return False
    try:
        with open(PIDFILE, 'r') as f:
            pid = int(f.read().strip())
        os.kill(pid, 0)
        return True
    except (ValueError, ProcessLookupError, PermissionError, OSError):
 # Stale PID file
        try:
            os.unlink(PIDFILE)
        except:
            pass
        return False


def start_server():
    """Start the Next.js standalone server in background."""
    if is_server_running():
        log.info('Server already running (PID from %s)', PIDFILE)
        return True

    # Ensure directories exist
    os.makedirs(INSTALL_DIR, exist_ok=True)

    # Check for Node.js binary
    if not os.path.exists(NODE_BIN):
        log.error('Node.js not found at %s', NODE_BIN)
        log.info('Run setup_aistore.sh first to install Node.js')
        return False

    # Check for standalone server
    if not os.path.exists(SERVER_JS):
        log.error('server.js not found at %s', SERVER_JS)
        return False

    try:
        log.info('Starting server: %s %s (port %d)', NODE_BIN, SERVER_JS, SERVER_PORT)
        env = os.environ.copy()
        env['PATH'] = os.path.dirname(NODE_BIN) + ':' + env.get('PATH', '')
        env['PORT'] = str(SERVER_PORT)
        env['HOSTNAME'] = '127.0.0.1'
        env['NODE_ENV'] = 'production'
        env['NEXT_PUBLIC_BASE_PATH'] = '/aistore'
        env['DATABASE_URL'] = 'file:' + os.path.join(INSTALL_DIR, 'db', 'custom.db')
        env['SESSION_SECRET'] = os.environ.get('SESSION_SECRET', 'nexus-aistore-hg-prod-session')
        env['BAITCOIN_SERVER_URL'] = 'http://127.0.0.1:18445'
        env['PULSAR_INTERVAL_MS'] = '30000'
        env['PYTHONPATH'] = SERVER_DIR

        with open(LOGFILE, 'a') as log_f:
            log_f.write('\n--- [%s] Starting AI Store server ---\n' % time.strftime('%Y-%m-%d %H:%M:%S'))
            proc = subprocess.Popen(
                [NODE_BIN, SERVER_JS],
                cwd=SERVER_DIR,
                env=env,
                stdout=log_f,
                stderr=log_f,
                start_new_session=True,
            )
        with open(PIDFILE, 'w') as f:
            f.write(str(proc.pid))
        log.info('Server started with PID %d', proc.pid)
        return True
    except Exception as e:
        log.error('Failed to start server: %s', e)
        return False


def wait_for_server(timeout=STARTUP_TIMEOUT):
    """Wait until the server is responding."""
    log.info('Waiting for server on port %d (timeout %ds)...', SERVER_PORT, timeout)
    start = time.time()
    while time.time() - start < timeout:
        try:
            conn = HTTPConnection('127.0.0.1', SERVER_PORT, timeout=3)
            conn.request('GET', '/aistore/api/health')
            resp = conn.getresponse()
            body = resp.read()
            conn.close()
            if resp.status == 200:
                log.info('Server responding (%d bytes)', len(body))
                return True
        except (ConnectionRefusedError, OSError):
            pass
        time.sleep(1)
    log.warning('Server not responding after %ds', timeout)
    return False


# ═══════════════════════════════════════════════════════
# Request Proxy
# ═══════════════════════════════════════════════════════
def proxy_request():
    """Forward the CGI request to the local Next.js server."""
    request_method = os.environ.get('REQUEST_METHOD', 'GET')
    path_info = os.environ.get('PATH_INFO', '/')
    query_string = os.environ.get('QUERY_STRING', '')
    content_type = os.environ.get('CONTENT_TYPE', 'application/json')
    content_length = int(os.environ.get('CONTENT_LENGTH', 0))

    # Read request body if present
    body = sys.stdin.read(content_length) if content_length > 0 else ''

    # Build target path (with /aistore basePath)
    target_path = '/aistore' + path_info
    if query_string:
        target_path += '?' + query_string

    log.info('Proxying %s %s', request_method, target_path)

    try:
        conn = HTTPConnection('127.0.0.1', SERVER_PORT, timeout=MAX_PROXY_TIMEOUT)
        headers = {}
        if content_type:
            headers['Content-Type'] = content_type

        # Forward essential headers
        cookie = os.environ.get('HTTP_COOKIE', '')
        if cookie:
            headers['Cookie'] = cookie
        csrf_token = os.environ.get('HTTP_X_CSRF_TOKEN', '')
        if csrf_token:
            headers['X-CSRF-Token'] = csrf_token
        auth = os.environ.get('HTTP_AUTHORIZATION', '')
        if auth:
            headers['Authorization'] = auth
        moltbook = os.environ.get('HTTP_X_MOLTBOOK_IDENTITY', '')
        if moltbook:
            headers['X-Moltbook-Identity'] = moltbook

        # For SSE (Pulsar), increase timeout significantly
        is_sse = path_info and '/api/pulsar' in path_info
        timeout = 300 if is_sse else MAX_PROXY_TIMEOUT

        conn = HTTPConnection('127.0.0.1', SERVER_PORT, timeout=timeout)
        conn.request(request_method, target_path, body=body, headers=headers)
        resp = conn.getresponse()
        resp_body = resp.read()
        resp_headers = resp.getheaders()
        conn.close()

        # Forward response
        sys.stdout.write('Status: %d\n' % resp.status)
        skip_headers = {'transfer-encoding', 'connection', 'server', 'keep-alive'}
        for name, value in resp_headers:
            if name.lower() not in skip_headers:
                sys.stdout.write('%s: %s\n' % (name, value))
        sys.stdout.write('X-Powered-By: AI-Store-CGI-Gateway\n')
        sys.stdout.write('Access-Control-Allow-Origin: *\n')
        sys.stdout.write('\n')
        sys.stdout.flush()
        os.write(sys.stdout.fileno(), resp_body)

    except Exception as e:
        log.error('Proxy error: %s', e)
        respond_error('API proxy error: %s' % str(e), 502)


# ═══════════════════════════════════════════════════════
# Main CGI Entry
# ═══════════════════════════════════════════════════════
def main():
    try:
        # Handle CORS preflight
        if os.environ.get('REQUEST_METHOD') == 'OPTIONS':
            sys.stdout.write('Status: 204\n')
            sys.stdout.write('Content-Type: text/plain\n')
            sys.stdout.write('Access-Control-Allow-Origin: *\n')
            sys.stdout.write('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\n')
            sys.stdout.write('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token, X-Moltbook-Identity\n')
            sys.stdout.write('Access-Control-Max-Age: 86400\n')
            sys.stdout.write('\n')
            sys.stdout.flush()
            return

        # Ensure server is running
        if not is_server_running():
            if not start_server():
                respond_error('Server failed to start. Run setup_aistore.sh first.', 500)
                return
            if not wait_for_server():
                respond_error('Server starting up. Retry in %ds.' % STARTUP_TIMEOUT, 503)
                return

        # Proxy the request
        proxy_request()

    except Exception as e:
        log.error('CGI error: %s\n%s', e, traceback.format_exc())
        respond_error('Internal error: %s' % str(e), 500)


if __name__ == '__main__':
    main()
