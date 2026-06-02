import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import type { Container } from '@infrastructure/config/container.js';

export async function buildServer(_container: Container): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  await server.register(helmet);
  await server.register(cors, { origin: true });

  // TODO: register routes
  //   await server.register(authRoutes, { prefix: '/auth' });
  //   await server.register(credentialsRoutes, { prefix: '/credentials' });
  //   await server.register(publicRoutes);

  server.get('/health', async () => ({ status: 'ok' }));

  return server;
}
