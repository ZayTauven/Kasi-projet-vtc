# GitHub Actions Secrets — Kasi

Configure these secrets in **Settings > Secrets and variables > Actions** on your GitHub repository.
They are injected as environment variables at runtime and never written to the image or the repo.

## Deployment (required for `deploy.yml`)

| Secret | Description |
|---|---|
| `DEPLOY_HOST` | IP address or domain name of the production server (e.g. `203.0.113.10` or `kasi.example.com`) |
| `DEPLOY_USER` | SSH user with permission to run `docker compose` on the server (e.g. `deploy`) |
| `DEPLOY_SSH_KEY` | Full PEM content of the private SSH key (RSA 4096 or Ed25519). The matching public key must be in `~/.ssh/authorized_keys` on the server. |

## Runtime environment (injected via docker compose on the server)

These values belong in `/opt/kasi/.env` on the production server, **not** in GitHub Secrets.
They are listed here so the team knows which variables must be present before the first deploy.

| Variable | Description |
|---|---|
| `DB_HOST` | PostgreSQL host (use the Docker service name `postgres` when running inside the compose stack) |
| `DB_USER` | PostgreSQL user |
| `DB_PASS` | PostgreSQL password |
| `DB_NAME` | PostgreSQL database name |
| `CORS_ORIGIN` | Allowed origins in production (e.g. `https://admin.kasi.app`) |
| `MAPBOX_SECRET_TOKEN` | Mapbox secret token used by the backend (if Mapbox is retained after integrations audit) |
| `IMAGE_REGISTRY` | Must be `ghcr.io/<owner>/<repo>` (same value `deploy.yml` pushes to) so `docker compose pull` resolves to the images built by CI/CD. Required before the first `docker compose pull` on the server — without it, compose falls back to the `kasi-local` placeholder and pull will fail. |

> **Note:** Firebase-related variables (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) are also read at runtime.
> Whether to keep or replace Firebase is pending decision by `kasi-integrations-auditor`; add them to `.env` only once the audit concludes.
