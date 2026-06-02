/**
 * Application entrypoint.
 *
 * Responsibilities:
 *   1. Load and validate environment configuration
 *   2. Wire dependencies (manual DI — see infrastructure/config/container.ts)
 *   3. Start the HTTP server
 *   4. Handle graceful shutdown
 */

import { loadEnv } from '@infrastructure/config/env.js';
import { buildContainer } from '@infrastructure/config/container.js';
import { buildServer } from '@infrastructure/http/server.js';

async function main() {
  const env = loadEnv();
  const container = await buildContainer(env);
  const server = await buildServer(container);

  const shutdown = async (signal: string) => {
    server.log.info({ signal }, 'shutting down');
    await server.close();
    await container.dispose();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await server.listen({ port: env.PORT, host: env.HOST });
  server.log.info({ port: env.PORT }, 'server ready');
}

main().catch((err) => {
  console.error('fatal startup error', err);
  process.exit(1);
});
