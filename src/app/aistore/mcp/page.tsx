/**
 * Bridge: /aistore/mcp — fail-soft re-export
 */

import McpCatalogPage from "../../../../mcp/src/app/aistore/mcp/page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "MCP Catalog — Nexus AI-OS Store",
  description:
    "Model Context Protocol servers distributed as .aipkg packages. Acquire MCPs to extend any agent's toolbox.",
};

export default McpCatalogPage;
