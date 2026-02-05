# ArcPP Web

A web application for exploring the **Archaeal Proteome Project (ArcPP)** dataset — browse proteins, view peptide coverage plots, PSM counts by dataset, and modification data for *Haloferax volcanii*.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) (included with Docker Desktop)
- A MongoDB Atlas connection string (provided separately)

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/ManojT0108/ArcPPWeb.git
cd ArcPPWeb

# 2. Create the environment file
cp server/.env.example server/.env
# Edit server/.env and set your MONGO_URI

# 3. Start everything
docker compose up --build
```

Open **http://localhost** in your browser.

That's it. Redis auto-seeds with all protein and PSM data on first startup (~5 seconds).

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client     │────>│   Server     │────>│   Redis      │
│  React/Nginx │     │  Express.js  │     │  Cache       │
│  Port 80     │     │  Port 5000   │     │  Port 6379   │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                     ┌──────┴───────┐
                     │  MongoDB     │
                     │  Atlas       │
                     └──────────────┘
```

| Service | Description | Exposed Port |
|---------|-------------|-------------|
| `arcpp-client` | React frontend served by Nginx | 80 |
| `arcpp-server` | Express.js REST API | 5001 |
| `arcpp-redis` | Redis cache (PSM data + protein summaries) | 6379 |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home page — searchable protein table with coverage, PSM counts, modifications |
| `/plot/:hvoId` | Protein detail — peptide coverage plot, sequence viewer, PSMs by dataset chart |
| `/datasets` | Dataset overview with charts |

## Environment Variables

Create `server/.env` from the example:

```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ArcPP?retryWrites=true&w=majority
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=5001
```

Only `MONGO_URI` needs to be filled in. The other values are defaults used for local development. Inside Docker, `REDIS_HOST` is overridden to `redis` automatically via `docker-compose.yml`.

## Project Structure

```
arcpp-web/
├── client/                  # React frontend
│   ├── src/
│   │   ├── pages/           # HomePage, ProteinPlotPage, DatasetsPage
│   │   ├── components/      # NavBar, ProteinTable, GlassCard, charts, etc.
│   │   └── constants/       # Modification filters and colors
│   ├── Dockerfile
│   └── nginx.conf
├── server/                  # Express.js backend
│   ├── routes/              # API routes (proteins, species, datasets, plot, health)
│   ├── services/            # Redis services (PSM, protein summary, ID resolver)
│   ├── model/               # Mongoose models (proteins, peptides, datasets)
│   ├── utils/               # Constants, species filter, merge intervals
│   ├── scripts/             # Redis seed and export scripts
│   ├── data/                # Redis seed JSON files (~4 MB)
│   ├── Dockerfile
│   └── entrypoint.sh        # Seeds Redis then starts server
└── docker-compose.yml
```

## How Redis Auto-Seeding Works

On first startup, the server automatically loads ~6000 keys into Redis from bundled JSON seed files:

- **3069** PSM-by-dataset entries (`psms:*` keys)
- **2907** protein summary entries (`protein:summary:*` keys)

On subsequent restarts, seeding is skipped (detected via a `seed:version` sentinel key). This eliminates the need for any manual data loading steps.

## Stopping and Cleanup

```bash
# Stop all services
docker compose down

# Stop and wipe all data (Redis volume)
docker compose down -v
```
