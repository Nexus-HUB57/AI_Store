#!/usr/bin/env python3
"""FTP/SFTP Connection Diagnostic for HostGator.
Reads CREDENCIAIS_HOSTGATOR from env and tests all connection methods.
"""
import os
import sys
import re
import json
import socket
import ftplib

F = "/tmp/diag.txt"
R = []


def L(m=""):
    R.append(m)
    print(m)


def clean_val(v):
    if not v:
        return ""
    v = re.sub(
        r"^(Host|Port|User|Pass|Password|Senha|Servidor|Usuario|Login|Username):\s*",
        "",
        v,
        flags=re.I,
    )
    return v.strip().strip('"').strip("'")


def parse(raw):
    try:
        c = json.loads(raw)
        return {
            "host": clean_val(str(c.get("host", c.get("hostname", c.get("servidor", ""))))),
            "user": clean_val(str(c.get("user", c.get("username", c.get("usuario", ""))))),
            "pwd": clean_val(str(c.get("password", c.get("pass", c.get("senha", ""))))),
            "port": clean_val(str(c.get("port", c.get("porta", "21")))),
        }
    except Exception as e:
        L(f"JSON parse failed: {e}")

    kv = {}
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        for sep in [": ", ":", "= ", "="]:
            if sep in line:
                k, v = line.split(sep, 1)
                kv[k.strip().lower()] = v.strip()
                break

    L(f"KV keys: {list(kv.keys())}")
    m = {
        "host": ["host", "hostname", "servidor", "ftp", "server"],
        "user": ["user", "username", "usuario", "login"],
        "pwd": ["password", "pass", "senha"],
        "port": ["port", "porta"],
    }
    r = {}
    for key, aliases in m.items():
        for a in aliases:
            if a in kv:
                r[key] = clean_val(kv[a])
                break
    if r.get("host") and r.get("user") and r.get("pwd"):
        if "port" not in r:
            r["port"] = "21"
        return r
    return None


def main():
    raw = os.environ.get("HG_CREDS", "").strip()
    L(f"Secret length: {len(raw)}")
    L(f"Lines: {len(raw.splitlines())}")
    L(f"Starts with JSON: {raw.strip().startswith('{')}")
    L(f"First 150: {repr(raw[:150])}")
    L("")

    if not raw:
        L("ERROR: Secret is empty")
        sys.exit(1)

    creds = parse(raw)
    if not creds:
        L("PARSING FAILED")
        sys.exit(1)

    host = creds["host"]
    port = int(re.sub(r"\D", "", str(creds["port"])) or "21")
    user = creds["user"]
    pwd = creds["pwd"]
    L(f"Parsed: HOST={host} PORT={port} USER={user} PASS_LEN={len(pwd)}")

    L("")
    L("=== DNS ===")
    try:
        ips = socket.getaddrinfo(host, None)
        for ip in ips[:5]:
            L(f"  {ip[4][0]}")
    except Exception as e:
        L(f"  {e}")

    L("")
    L("=== TCP Ports ===")
    for tp, lb in [(21, "FTP"), (22, "SSH"), (2222, "Alt SSH"), (990, "FTPS")]:
        try:
            s = socket.socket()
            s.settimeout(5)
            r = s.connect_ex((host, tp))
            s.close()
            L(f"  {tp:5} ({lb:14}): {\"OPEN\" if r == 0 else f\"CLOSED/{r}\"}")
        except Exception as e:
            L(f"  {tp:5} ({lb:14}): {e}")

    L("")
    L("=== FTP Tests ===")

    L(f"1. Plain FTP {host}:{port}")
    try:
        ftp = ftplib.FTP()
        ftp.connect(host, port, timeout=15)
        L(f"   Connected: {ftp.getwelcome()[:80]}")
        ftp.login(user, pwd)
        L(f"   Login OK, PWD={ftp.pwd()}")
        ftp.quit()
        L(f"   SUCCESS")
    except Exception as e:
        L(f"   FAILED: {type(e).__name__}: {e}")

    L(f"2. FTP-TLS {host}:{port}")
    try:
        ftps = ftplib.FTP_TLS()
        ftps.connect(host, port, timeout=15)
        L(f"   Connected")
        ftps.login(user, pwd)
        L(f"   Login OK")
        ftps.prot_p()
        L(f"   TLS ON")
        ftps.quit()
        L(f"   SUCCESS")
    except Exception as e:
        L(f"   FAILED: {type(e).__name__}: {e}")

    for sp in [22, 2222]:
        L(f"3. SFTP {host}:{sp}")
        try:
            import paramiko
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            ssh.connect(host, port=sp, username=user, password=pwd, timeout=15, banner_timeout=15)
            L(f"   SSH OK")
            sftp = ssh.open_sftp()
            L(f"   SFTP OK, files={sftp.listdir('.')[:10]}")
            sftp.close()
            ssh.close()
            L(f"   SUCCESS")
        except ImportError:
            L(f"   paramiko N/A")
        except Exception as e:
            L(f"   FAILED: {type(e).__name__}: {e}")

    L("")
    L("=== Complete ===")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        L(f"UNHANDLED ERROR: {type(e).__name__}: {e}")
    finally:
        with open(F, "w") as f:
            f.write("\n".join(R))
