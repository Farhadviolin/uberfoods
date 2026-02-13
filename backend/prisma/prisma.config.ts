import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './schema.prisma',
  migrations: {
    directory: './migrations',
  },
  datasource: {
    url: {
      env: 'DATABASE_URL',
    },
  },
  generator: {
    client: {
      provider: 'prisma-client-js',
    },
  },
});