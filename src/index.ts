#!/usr/bin/env node

import { CodeGuidanceMCPServer } from './mcp-server.js';

async function main(): Promise<void> {
  const server = new CodeGuidanceMCPServer();
  await server.run();
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
