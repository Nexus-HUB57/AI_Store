#!/usr/bin/env python3
"""
AI Store CGI Gateway — HostGator Compatible

Auto-installs Node.js if needed, boots the Next.js standalone server,
and proxies all subsequent requests to it.
"""
import os
import sys
import json
import time
import subprocess
import traceback
from http.client import HTTPConnection

HOME = os.environ.get('HOME', '/home1/luca2490')
INSTALL_DIR = os.path.join(HOME, 'aistore-api')
NODE_DIR = os.path.join(INSTALL_DIR, 'node-v20.18.0-linux-x64')
NODE_BIN = os.path.join(NODE_DIR, 'bin', 'node')
SERVER_DIR = os.path.join(INSTALL_DIR, 'standalone')
SERVER_JS = os.path.join(SERVER_DIR, 'server.js')
PIDFILE = os.path.join(INSTALL_DIR, 'server.pid')
LOGFILE = os.path.join(INSTALL_DIR, 'server.log')
SERVER_PORT = 18446
STARTUP_TIMEOUT = 25
MAX_PROXY_TIMEOUT = 30

import logging
logging.basicConfig(stream=sys.stderr, level=logging.INFO, format='[aistore] %(asctime)s %(levelname)s: %(message)s', datefmt='%H:%M:%S')
log = logging.getLogger('aistore')

def respond_json(data, status=200):
    body = json.dumps(data, default=str).encode('utf-8')
    sys.stdout.write('Status: %d\n' % status)
    sys.stdout.write('Content-Type: application/json\n')
    sys.stdout.write('Content-Length: %d\n' % len(body))
    origin = os.environ.get('HTTP_ORIGIN', '')
    allowed = ('https://www.mybait.org', 'https://mybait.org', 'http://localhost:3000')
    cors_origin = origin if origin.rstrip('/') in allowed else 'https://www.mybait.org'
    sys.stdout.write('Access-Control-Allow-Origin: %s\n' % cors_origin)
    sys.stdout.write('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\n')
    sys.stdout.write('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token, X-Moltbook-Identity\n')
    sys.stdout.write('Access-Control-Allow-Credentials: true\n')
    sys.stdout.write('X-Frame-Options: DENY\n')
    sys.stdout.write('\n')
    sys.stdout.flush()
    os.write(sys.stdout.fileno(), body)

def respond_error(msg, status=503):
    respond_json({"error": msg, "timestamp": time.time()}, status=status)

def is_server_running():
    if not os.path.exists(PIDFILE): return False
    try:
        with open(PIDFILE, 'r') as f: pid = int(f.read().strip())
        os.kill(pid, 0)
        return True
    except: 
        # Stale PID file — clean up
        try: os.unlink(PIDFILE)
        except: pass
        return False

def kill_orphan_processes():
    """Kill any leftover Node.js processes on our port to free up process slots.
    HostGator shared hosting has a 25-process limit per user.
    b'AI'tcoin uses port 18445, AI Store uses port 18446.
    """
    try:
        import subprocess
        # Find processes listening on our port
        result = subprocess.run(
            ['fuser', str(SERVER_PORT) + '/tcp'],
            capture_output=True, text=True, timeout=5
        )
        if result.stdout.strip():
            pids = result.stdout.strip().split()
            for pid in pids:
                try:
                    os.kill(int(pid), 15)  # SIGTERM
                    log.info('Killed orphan process %s on port %d', pid, SERVER_PORT)
                except ProcessLookupError:
                    pass
                except PermissionError:
                    pass
    except Exception as e:
        log.warning('Could not check orphan processes: %s', e)

def install_nodejs():
    """Download and install Node.js 20 LTS."""
    if os.path.exists(NODE_BIN):
        return True
    
    log.info('Installing Node.js v20.18.0...')
    os.makedirs(INSTALL_DIR, exist_ok=True)
    
    node_url = 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.xz'
    tar_path = os.path.join(INSTALL_DIR, 'node.tar.xz')
    
    try:
        import urllib.request
        log.info('Downloading Node.js...')
        urllib.request.urlretrieve(node_url, tar_path)
        
        log.info('Extracting Node.js...')
        import tarfile
        with tarfile.open(tar_path, 'r:xz') as tar:
            tar.extractall(path=INSTALL_DIR)
        os.unlink(tar_path)
        
        if os.path.exists(NODE_BIN):
            log.info('Node.js installed: %s', NODE_BIN)
            return True
        else:
            log.error('Node.js binary not found after extraction')
            return False
    except Exception as e:
        log.error('Node.js install failed: %s', e)
        return False

def setup_server():
    """Extract codebase and install dependencies."""
    codebase_path = os.path.join(HOME, 'public_html', 'aistore-codebase.tar.gz')
    if not os.path.exists(codebase_path):
        log.error('Codebase tarball not found at %s', codebase_path)
        return False
    
    os.makedirs(SERVER_DIR, exist_ok=True)
    os.makedirs(os.path.join(INSTALL_DIR, 'db'), exist_ok=True)
    
    log.info('Extracting codebase to %s...', SERVER_DIR)
    try:
        import tarfile
        with tarfile.open(codebase_path, 'r:gz') as tar:
            tar.extractall(path=SERVER_DIR)
        log.info('Codebase extracted')
    except Exception as e:
        log.error('Extraction failed: %s', e)
        return False
    
    # Copy DB to persistent location
    src_db = os.path.join(SERVER_DIR, 'db', 'custom.db')
    dst_db = os.path.join(INSTALL_DIR, 'db', 'custom.db')
    if os.path.exists(src_db) and not os.path.exists(dst_db):
        import shutil
        shutil.copy2(src_db, dst_db)
        log.info('Database copied to %s', dst_db)
    
    # Generate Prisma client
    prisma_dir = os.path.join(SERVER_DIR, 'prisma')
    if os.path.exists(os.path.join(prisma_dir, 'schema.prisma')):
        log.info('Generating Prisma client...')
        env = os.environ.copy()
        env['PATH'] = os.path.dirname(NODE_BIN) + ':' + env.get('PATH', '')
        env['DATABASE_URL'] = 'file:' + dst_db
        try:
            subprocess.run(
                [os.path.join(NODE_DIR, 'bin', 'npx'), 'prisma', 'generate', '--datasource-provider', 'sqlite'],
                cwd=SERVER_DIR, env=env, capture_output=True, timeout=60
            )
            log.info('Prisma client generated')
        except Exception as e:
            log.warning('Prisma generate issue (may work at runtime): %s', e)
    
    return True

def start_server():
    if is_server_running():
        log.info('Server already running')
        return True
    
    # Clean up any orphan processes on our port first
    kill_orphan_processes()
    
    if not os.path.exists(NODE_BIN):
        if not install_nodejs():
            return False
    
    if not os.path.exists(SERVER_JS):
        if not setup_server():
            return False
    
    try:
        env = os.environ.copy()
        env['PATH'] = os.path.dirname(NODE_BIN) + ':' + env.get('PATH', '')
        env['PORT'] = str(SERVER_PORT)
        env['HOSTNAME'] = '127.0.0.1'
        env['NODE_ENV'] = 'production'
        env['NEXT_PUBLIC_BASE_PATH'] = '/aistore'
        env['DATABASE_URL'] = 'file:' + os.path.join(INSTALL_DIR, 'db', 'custom.db')
        secret = os.environ.get('SESSION_SECRET', '')
        if not secret or len(secret) < 16:
            log.error('SESSION_SECRET not set or too short — refusing to start')
            return False
        env['SESSION_SECRET'] = secret
        env['BAITCOIN_SERVER_URL'] = 'http://127.0.0.1:18445'
        env['PULSAR_INTERVAL_MS'] = '30000'
        
        os.makedirs(INSTALL_DIR, exist_ok=True)
        with open(LOGFILE, 'a') as lf:
            lf.write('\n--- [%s] Starting AI Store ---\n' % time.strftime('%Y-%m-%d %H:%M:%S'))
            proc = subprocess.Popen(
                [NODE_BIN, SERVER_JS],
                cwd=SERVER_DIR, env=env,
                stdout=lf, stderr=lf,
                start_new_session=True,
            )
        with open(PIDFILE, 'w') as f:
            f.write(str(proc.pid))
        log.info('Server started PID %d', proc.pid)
        return True
    except Exception as e:
        log.error('Start failed: %s', e)
        return False

def wait_for_server(timeout=STARTUP_TIMEOUT):
    log.info('Waiting for server on :%d...', SERVER_PORT)
    start = time.time()
    while time.time() - start < timeout:
        try:
            conn = HTTPConnection('127.0.0.1', SERVER_PORT, timeout=3)
            conn.request('GET', '/aistore/api/health')
            resp = conn.getresponse()
            body = resp.read()
            conn.close()
            if resp.status == 200:
                log.info('Server ready (%d bytes)', len(body))
                return True
        except: pass
        time.sleep(2)
    log.warning('Server not ready after %ds', timeout)
    return False

def proxy_request():
    method = os.environ.get('REQUEST_METHOD', 'GET')
    path_info = os.environ.get('PATH_INFO', '/')
    query = os.environ.get('QUERY_STRING', '')
    ctype = os.environ.get('CONTENT_TYPE', '')
    clen = int(os.environ.get('CONTENT_LENGTH', 0))
    body = sys.stdin.read(clen) if clen > 0 else ''
    
    target = '/aistore' + path_info
    if query: target += '?' + query
    
    log.info('Proxy %s %s', method, target)
    
    try:
        is_sse = '/api/pulsar' in path_info
        timeout = 300 if is_sse else MAX_PROXY_TIMEOUT
        conn = HTTPConnection('127.0.0.1', SERVER_PORT, timeout=timeout)
        headers = {}
        if ctype: headers['Content-Type'] = ctype
        for h, env_k in [('Cookie', 'HTTP_COOKIE'), ('X-CSRF-Token', 'HTTP_X_CSRF_TOKEN'),
                          ('Authorization', 'HTTP_AUTHORIZATION'), ('X-Moltbook-Identity', 'HTTP_X_MOLTBOOK_IDENTITY')]:
            v = os.environ.get(env_k, '')
            if v: headers[h] = v
        
        conn.request(method, target, body=body, headers=headers)
        resp = conn.getresponse()
        resp_body = resp.read()
        resp_headers = resp.getheaders()
        conn.close()
        
        sys.stdout.write('Status: %d\n' % resp.status)
        skip = {'transfer-encoding', 'connection', 'server', 'keep-alive'}
        for name, value in resp_headers:
            if name.lower() not in skip:
                sys.stdout.write('%s: %s\n' % (name, value))
        origin = os.environ.get('HTTP_ORIGIN', '')
        allowed = ('https://www.mybait.org', 'https://mybait.org', 'http://localhost:3000')
        cors_origin = origin if origin.rstrip('/') in allowed else 'https://www.mybait.org'
        sys.stdout.write('Access-Control-Allow-Origin: %s\n' % cors_origin)
        sys.stdout.write('Access-Control-Allow-Credentials: true\n')
        sys.stdout.write('\n')
        sys.stdout.flush()
        os.write(sys.stdout.fileno(), resp_body)
    except Exception as e:
        log.error('Proxy error: %s', e)
        respond_error('Proxy error: %s' % str(e), 502)

def main():
    try:
        if os.environ.get('REQUEST_METHOD') == 'OPTIONS':
            sys.stdout.write('Status: 204\nContent-Type: text/plain\n')
            origin = os.environ.get('HTTP_ORIGIN', '')
            allowed = ('https://www.mybait.org', 'https://mybait.org', 'http://localhost:3000')
            cors_origin = origin if origin.rstrip('/') in allowed else 'https://www.mybait.org'
            sys.stdout.write('Access-Control-Allow-Origin: %s\n' % cors_origin)
            sys.stdout.write('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\n')
            sys.stdout.write('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token, X-Moltbook-Identity\n')
            sys.stdout.write('Access-Control-Allow-Credentials: true\n')
            sys.stdout.write('Access-Control-Max-Age: 86400\n\n')
            sys.stdout.flush()
            return
        
        if not is_server_running():
            if not start_server():
                respond_error('Server setup failed. Check server.log.', 500)
                return
            if not wait_for_server():
                respond_error('Server starting. Retry in 30s.', 503)
                return
        
        proxy_request()
    except Exception as e:
        log.error('CGI error: %s', e)
        respond_error('Internal error: %s' % str(e), 500)

if __name__ == '__main__':
    main()
