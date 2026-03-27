# NewLevelHub Web Frontend

Frontend repository for NewLevelHub based on Next.js (App Router), TypeScript, ESLint and Prettier.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env.local
```

3. Start local server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` - run development server
- `npm run build` - build production bundle
- `npm run start` - run production server locally
- `npm run lint` - run ESLint
- `npm run format` - format code with Prettier
- `npm run format:check` - validate formatting

## CI/CD to Staging

Workflow file: `.github/workflows/frontend-staging.yml`

Pipeline triggers on push to `develop` or `main` and performs:

1. `npm ci`
2. `npm run lint`
3. `npm run build`
4. SSH deploy to staging server:
   - pull latest code
   - checkout branch
   - run `docker compose -f docker-compose.staging.yml up -d --build --remove-orphans`

### Required GitHub secrets

- `STAGING_HOST` - staging VPS host/IP
- `STAGING_USER` - SSH user
- `STAGING_SSH_KEY` - private key for deploy user
- `STAGING_APP_PATH` - absolute path on server (example: `/opt/newlevelhub/web`)
- `STAGING_REPO_SSH_URL` - git SSH URL (example: `git@github.com:org/NewLevelHub-Web-Frontend.git`)

## Staging server requirements

- Docker and Docker Compose plugin installed
- SSH access for deploy user
- Deploy user has access to repository over SSH
- Incoming traffic to frontend port is open (or proxied by Nginx)

## Done criteria mapping for DEV-29

- Repo scaffolded with Next.js + TypeScript + ESLint + Prettier.
- CI/CD workflow prepared for automatic staging deploy on push to `develop/main`.
- Docker-based staging runtime config added in `Dockerfile` and `docker-compose.staging.yml`.

Manual steps outside codebase still required:

- Create repository in your Git provider and grant access to both developers.
- Add secrets in repository settings.
- Prepare staging VPS and configure public URL/domain (and optionally Nginx reverse proxy).
