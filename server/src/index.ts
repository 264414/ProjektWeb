import { createServer } from 'http';
import { config } from './config/env';
import { logger } from './config/logger';
import { prisma } from './lib/prisma';
import { createApp } from './app';

const app = createApp();
const server = createServer(app);

server.listen(config.PORT, () => {
  logger.info(
    {
      port: config.PORT,
      environment: config.NODE_ENV
    },
    'Secure API server started'
  );
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Graceful shutdown started');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Database connection closed');
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
