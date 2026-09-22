/**
 * Bridge: /aistore/mcp — MCP catalog page
 *
 * Re-exports the canonical page from mcp/src/app/aistore/mcp/page.tsx so that
 * Next.js routes the URL `/aistore/mcp` while the source of truth lives in
 * the mcp/ module (and can be evolved without conflicting with the rest of the
 * store).
 *
 * The original page reads `McpPackage` rows directly from Prisma. The bridge
 * therefore requires the McpPackage table to exist — run `npm run mcp:seed`
 * first if the catalog is empty.
 */

import McpCatalogPage from "../../../../mcp/src/app/aistore/mcp/page";

export const metadata = {
  title: "MCP Catalog — Nexus AI-OS Store",
  description:
    "Model Context Protocol servers distributed as .aipkg packages. Acquire MCPs to extend any agent's toolbox.",
};

export default McpCatalogPage;