# Viper Server

AI-powered code reviewer for GitLab merge requests. Powered by Claude.

## Quick Start

```bash
# Clone
git clone https://github.com/NumstackPtyLtd/viper-server.git
cd viper-server

# Install
npm install

# Configure
cp .env.example .env
# Edit .env: GITLAB_TOKEN, GITLAB_WEBHOOK_SECRET, ANTHROPIC_API_KEY

# Run
npm run dev
```

## Docker

```bash
docker compose up
```

Or build manually:

```bash
docker build -t viper-server .
docker run -p 3000:3000 --env-file .env viper-server
```

## How It Works

1. GitLab sends a webhook when a merge request is opened/updated
2. Viper fetches the diff and sends it to Claude for review
3. Claude returns structured findings (critical, warning, suggestion, praise)
4. Viper posts a summary comment and inline comments on the MR

## Per-Repo Configuration

Drop a `.viper.yml` in your repo root:

```yaml
version: 1

review:
  style:
    tone: friendly        # strict | friendly | concise
    focus:
      - security
      - performance
    language: English

  rules:
    - "Never use any type"
    - "Prefer early returns"

  ignore:
    - "*.lock"
    - "dist/**"

  max_comments: 20
  auto_resolve: true
```

## Architecture

Clean Architecture with strict layer boundaries:

```
Presentation -> Application -> Domain <- Infrastructure
(Hono routes)  (use cases)    (entities)  (Claude, GitLab)
```

The server is designed to be extended by a cloud overlay for multi-org, billing, and dashboard features. See `src/server.ts` for the public API.

## Tech Stack

- **Runtime**: Node.js 22 + TypeScript
- **Framework**: Hono
- **AI**: Anthropic Claude
- **VCS**: GitLab (GitHub planned)
- **Testing**: Vitest

## Licence

MIT
# Test
