import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: env('DIRECT_URL'),
  },
  migrations: {
    // We replaced ts-node with tsx here
    seed: 'npx tsx prisma/seed.ts',
  }
});