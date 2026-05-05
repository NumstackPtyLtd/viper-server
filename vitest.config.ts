import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
      exclude: [
        'src/index.ts',
        'src/server.ts',
        'src/container.ts',
        'src/app.ts',
        'src/shared/**',
        'src/infrastructure/ai/**',
        'src/infrastructure/vcs/**',
        'src/infrastructure/config/EnvConfig.ts',
        'src/domain/ports/**',
        'src/domain/events/DomainEvent.ts',
        'src/application/dto/**',
        'src/application/ports/**',
        'src/presentation/api/routes/**',
        'vitest.config.ts',
      ],
    },
  },
})
