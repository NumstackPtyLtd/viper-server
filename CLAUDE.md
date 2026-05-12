# Viper Server: AI-Powered Code Reviewer (OSS)

TypeScript | Hono | Clean Architecture | DDD

## Architecture (Non-Negotiable)

Viper follows **Clean Architecture** with strict dependency inversion. Dependencies point inward. Outer layers depend on inner layers via interfaces (ports), never directly.

```
Presentation -> Application -> Domain <- Infrastructure
(routes)       (use cases)    (entities, VOs, ports)   (adapters)
```

### Layer Rules

#### Domain (`src/domain/`)
- **ZERO external dependencies.** No npm imports. No framework code. Pure TypeScript.
- Contains: entities, value objects, domain events, port interfaces
- Entities use private constructors + static `create()` factory methods
- All properties are `private readonly` with public getters
- Value objects are immutable
- Port interfaces define what the domain NEEDS, not how it's provided

#### Application (`src/application/`)
- Contains: use cases, DTOs, application services, port interfaces
- Use cases are single-purpose classes with one `execute()` method
- DTOs are plain interfaces
- Application services contain reusable logic that isn't domain-specific
- Depends on domain ports, NEVER on infrastructure directly

#### Infrastructure (`src/infrastructure/`)
- Contains: adapter implementations for domain ports
- Each adapter lives in its own directory
- External library imports are ONLY allowed here
- Zod schemas for config validation live here

#### Presentation (`src/presentation/`)
- Contains: HTTP routes (Hono), middleware
- Routes are thin: extract DTO from request, call use case, return response
- No business logic in routes

#### Shared (`src/shared/`)
- Cross-cutting concerns ONLY: logger
- Must not import from any other layer

### Dependency Rules (ENFORCED)

| From | Can Import | CANNOT Import |
|---|---|---|
| Domain | Nothing (only std lib) | Application, Infrastructure, Presentation |
| Application | Domain | Infrastructure, Presentation |
| Infrastructure | Domain, Shared | Application (except DTOs), Presentation |
| Presentation | Application, Domain (types only) | Infrastructure |
| Shared | Nothing | Domain, Application, Infrastructure, Presentation |

## Cloud Overlay Pattern

This server is designed to be extended by `viper-cloud` (proprietary):

- **`src/server.ts`**: Public API that cloud imports: `createContainer`, `createApp`, `TenantService`
- **`src/container.ts`**: Accepts optional `TenantService` (defaults to `NoOpTenantService`)
- **`src/app.ts`**: Creates Hono app; cloud can mount additional routes after

Cloud imports: `import { createContainer, createApp } from 'viper-server/server'`

## Extension Points

- **TenantService** port: multi-org isolation (NoOp default, Cloud overrides)
- **VcsProvider** port: add GitHub/Bitbucket adapters
- **AiReviewer** port: swap Claude for OpenAI, etc.
- **ConfigLoader** port: database-backed config
- **EventBus** port: replace LogEventBus with Redis/RabbitMQ

## Commands

```bash
npm run dev          # Watch mode with tsx
npm run build        # TypeScript check (noEmit)
npm start            # Run server
npm test             # Run tests
npm run test:coverage # Coverage report
npm run lint         # tsc --noEmit
```

## Config

Environment validated via Zod in `src/infrastructure/config/EnvConfig.ts`.
Per-repo config via `.viper.yml` loaded from the MR source branch.
Composition root: `src/container.ts`.
