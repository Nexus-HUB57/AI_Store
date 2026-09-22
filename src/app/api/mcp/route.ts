/**
 * Bridge: GET/POST /api/mcp
 *
 * Re-exports the canonical implementation from mcp/src/app/api/mcp/route.ts
 * so Next.js picks the route up at the standard src/app/api/mcp/ path while
 * keeping the single source of truth in the mcp/ module.
 *
 * Original (do not edit here):  mcp/src/app/api/mcp/route.ts
 */

export { GET, POST } from "../../../../mcp/src/app/api/mcp/route";