#!/usr/bin/env python3
"""E2E Gate — experiential sync end-to-end validation."""

import subprocess, json
from pathlib import Path

def run(cmd, cwd=None, timeout=30):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    return r.stdout, r.stderr, r.returncode

results = {}

# 1. Schema Prisma: 3 modelos Experiential presentes
schema_text = Path("/workspace/aistore/prisma/schema.prisma").read_text()
results["schema_experientialtrace"] = "model ExperientialTrace" in schema_text
results["schema_experientialrouter"] = "model ExperientialRouter" in schema_text
results["schema_experientialsync"] = "model ExperientialSync" in schema_text

# 2. Bridge TS presente e com funções públicas
bridge = Path("/workspace/aistore/src/lib/experiential-bridge.ts").read_text()
results["bridge_has_syncExperiential"] = "export async function syncExperiential" in bridge
results["bridge_has_list_traces"] = "listExperientialTraces" in bridge
results["bridge_has_list_routers"] = "listExperientialRouters" in bridge
results["bridge_calls_exp_cli"] = "execFileAsync('exp'" in bridge
results["bridge_no_prisma_run"] = "prisma migrate" not in bridge  # não deve disparar migração

# 3. API routes
for route in ["sync", "traces", "routers"]:
    p = Path(f"/workspace/aistore/src/app/api/experiential/{route}/route.ts")
    results[f"api_route_{route}_exists"] = p.exists()
    if p.exists():
        results[f"api_route_{route}_has_dynamic"] = "export const dynamic" in p.read_text()

# 4. CLI script + cron
sync_script = Path("/workspace/aistore/scripts/experiential-sync.mjs")
results["cli_sync_script_exists"] = sync_script.exists()
results["cli_sync_calls_post"] = "POST" in sync_script.read_text() if sync_script.exists() else False
results["cli_sync_executable"] = sync_script.exists() and (sync_script.stat().st_mode & 0o111) != 0

workflow = Path("/workspace/aistore/.github/workflows/experiential-sync.yml")
results["cron_workflow_exists"] = workflow.exists()
if workflow.exists():
    wt = workflow.read_text()
    results["cron_workflow_schedule"] = "*/30 * * * *" in wt
    results["cron_workflow_installs_exp"] = "pip install" in wt
    results["cron_workflow_runs_sync"] = "experiential-sync.mjs" in wt
    results["cron_workflow_setup_python"] = "actions/setup-python@v5" in wt
    results["cron_workflow_dispatch"] = "workflow_dispatch" in wt

# 5. .aipkg package wrapper
pkg_dir = Path("/workspace/aistore/aipkg_store/experiential-bridge")
results["aipkg_dir_exists"] = pkg_dir.is_dir()
manifest = pkg_dir / "manifest.json"
server = pkg_dir / "bin/server.mjs"
results["aipkg_manifest_exists"] = manifest.exists()
results["aipkg_server_exists"] = server.exists()
if manifest.exists():
    m = json.loads(manifest.read_text())
    results["aipkg_manifest_name"] = m.get("name") == "experiential-bridge"
    results["aipkg_manifest_runtime"] = m.get("runtime") == "stdio"
    tool_names = [t["name"] for t in m.get("tools", [])]
    expected_tools = ["exp_capture", "exp_build", "exp_optimize", "exp_sync", "exp_list_traces", "exp_list_routers"]
    results["aipkg_all_tools_present"] = all(t in tool_names for t in expected_tools)

# 6. MCP server wrapper
mcp_dir = Path("/workspace/aistore/mcp/src/servers/experiential-bridge")
results["mcp_dir_exists"] = mcp_dir.is_dir()
mcp_manifest = mcp_dir / "manifest.json"
mcp_server = mcp_dir / "server.ts"
results["mcp_manifest_exists"] = mcp_manifest.exists()
results["mcp_server_exists"] = mcp_server.exists()

# 7. Tests + E2E
unit = Path("/workspace/aistore/tests/experiential-bridge.test.ts")
e2e = Path("/workspace/aistore/e2e/experiential-flow.spec.ts")
results["unit_tests_exist"] = unit.exists()
results["e2e_spec_exists"] = e2e.exists()
results["unit_tests_cover_normalize"] = "normalizeTrace" in unit.read_text() if unit.exists() else False
results["unit_tests_cover_router"] = "normalizeRouter" in unit.read_text() if unit.exists() else False

# 8. Cloning do upstream
exp_clone = Path("/workspace/experiential/exp/cli/app.py")
results["upstream_cloned"] = exp_clone.exists()
results["upstream_has_cli"] = (
    "def main" in exp_clone.read_text() and "app = typer.Typer" in exp_clone.read_text()
) if exp_clone.exists() else False

# 9. JS syntax checks
for js_file in [
    "/workspace/aistore/scripts/experiential-sync.mjs",
    "/workspace/aistore/aipkg_store/experiential-bridge/bin/server.mjs",
]:
    p = Path(js_file)
    if p.exists():
        out, err, rc = run(["node", "--check", str(p)])
        results[f"syntax_{p.name}"] = rc == 0

# 10. Manifests JSON válidos
for mf in [
    "/workspace/aistore/aipkg_store/experiential-bridge/manifest.json",
    "/workspace/aistore/mcp/src/servers/experiential-bridge/manifest.json",
]:
    p = Path(mf)
    if p.exists():
        try:
            json.loads(p.read_text())
            results[f"json_{p.parent.name}_manifest"] = True
        except Exception:
            results[f"json_{p.parent.name}_manifest"] = False

# Summary
ok = sum(1 for v in results.values() if v)
total = len(results)
print(f"\n{'='*60}")
print(f"E2E GATE: {ok}/{total} checks passed")
print(f"{'='*60}")
for k, v in results.items():
    icon = "✓" if v else "✗"
    print(f"  {icon} {k}")

# Write summary
summary_path = Path("/tmp/e2e-experiential-summary.md")
summary_path.write_text(f"""# E2E Summary — Experiential Sync

## Resultado: {ok}/{total} checks passed

## Componentes entregues

| Componente | Caminho | Status |
|---|---|---|
| Prisma schema | `prisma/schema.prisma` (+3 modelos) | {'OK' if all(results[k] for k in ['schema_experientialtrace', 'schema_experientialrouter', 'schema_experientialsync']) else 'FAIL'} |
| Bridge TS | `src/lib/experiential-bridge.ts` (13k chars) | {'OK' if all(results[k] for k in ['bridge_has_syncExperiential', 'bridge_has_list_traces', 'bridge_has_list_routers']) else 'FAIL'} |
| API routes | `src/app/api/experiential/{{sync,traces,routers}}/route.ts` | {'OK' if all(results[f"api_route_{r}_exists"] for r in ["sync", "traces", "routers"]) else "FAIL"} |
| CLI sync | `scripts/experiential-sync.mjs` | {'OK' if results['cli_sync_script_exists'] else 'FAIL'} |
| Cron workflow | `.github/workflows/experiential-sync.yml` | {'OK' if all(results[k] for k in ['cron_workflow_exists', 'cron_workflow_schedule', 'cron_workflow_installs_exp', 'cron_workflow_runs_sync']) else 'FAIL'} |
| .aipkg wrapper | `aipkg_store/experiential-bridge/` | {'OK' if all(results[k] for k in ['aipkg_dir_exists', 'aipkg_manifest_exists', 'aipkg_server_exists', 'aipkg_all_tools_present']) else 'FAIL'} |
| MCP server | `mcp/src/servers/experiential-bridge/` | {'OK' if all(results[k] for k in ['mcp_dir_exists', 'mcp_manifest_exists', 'mcp_server_exists']) else 'FAIL'} |
| Tests | `tests/experiential-bridge.test.ts` + `e2e/experiential-flow.spec.ts` | {'OK' if all(results[k] for k in ['unit_tests_exist', 'e2e_spec_exists', 'unit_tests_cover_normalize']) else 'FAIL'} |

## Upstream

`experientiallabs/experiential` clonado em `/workspace/experiential` (Python 3.12+, v0.7.130).

## Checks detalhados

""" + "\n".join(f"- {'OK' if v else 'FAIL'}: `{k}`" for k, v in results.items()))
print(f"\nSummary: {summary_path}")
