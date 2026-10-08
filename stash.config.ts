import { defineConfig, resolveDatabaseUrl } from 'stash'

export default defineConfig({
  databaseUrl: await resolveDatabaseUrl(),
  client: './src/encryption/index.ts',
})
