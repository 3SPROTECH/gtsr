import { createApp } from './app.js';
import { connectDb, disconnectDb } from './config/db.js';
import { env } from './config/env.js';

const app = createApp();

connectDb()
  .then(() => {
    const server = app.listen(env.port, () => {
      console.log(`✅ GTSR API listening on http://localhost:${env.port}`);
      console.log(`   env: ${env.nodeEnv}`);
    });

    const shutdown = async (signal) => {
      console.log(`\n${signal} received - shutting down`);
      server.close(async () => {
        await disconnectDb();
        process.exit(0);
      });
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  })
  .catch((err) => {
    console.error('❌ Failed to start API:', err);
    process.exit(1);
  });
