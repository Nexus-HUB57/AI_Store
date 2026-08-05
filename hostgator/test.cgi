#!/usr/bin/env python3
"""Quick CGI diagnostic — returns env vars and system info."""
import os, sys, json

sys.stdout.write('Status: 200\n')
sys.stdout.write('Content-Type: application/json\n')
sys.stdout.write('\n')
sys.stdout.flush()

info = {
    'cgi_working': True,
    'python_version': sys.version.split()[0],
    'python_path': sys.executable,
    'cwd': os.getcwd(),
    'home': os.environ.get('HOME', 'N/A'),
    'script_filename': os.environ.get('SCRIPT_FILENAME', 'N/A'),
    'request_uri': os.environ.get('REQUEST_URI', 'N/A'),
    'path_info': os.environ.get('PATH_INFO', 'N/A'),
    'server_software': os.environ.get('SERVER_SOFTWARE', 'N/A'),
    'document_root': os.environ.get('DOCUMENT_ROOT', 'N/A'),
    'node_exists': os.path.exists('/home1/luca2490/aistore-api/node-v20.18.0-linux-x64/bin/node'),
    'server_exists': os.path.exists('/home1/luca2490/aistore-api/standalone/server.js'),
    'db_exists': os.path.exists('/home1/luca2490/aistore-api/db/custom.db'),
    'codebase_exists': os.path.exists('/home1/luca2490/public_html/aistore-codebase.tar.gz'),
}

sys.stdout.write(json.dumps(info, indent=2))
