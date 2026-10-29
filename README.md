# SecondChance: a marketplace back end in Node.js, Express and MongoDB

[![CI/CD](https://github.com/engomaressam/backend-nodejs-capstone/actions/workflows/main.yml/badge.svg)](https://github.com/engomaressam/backend-nodejs-capstone/actions/workflows/main.yml)

SecondChance is a site where people give away and pick up second-hand items. This repository holds the back end built for the IBM *JavaScript Back-end Capstone Project*: a REST API for items and search, JWT authentication, a sentiment-analysis microservice for item comments, a static landing site, the React front end provided by the course, and the Docker and CI/CD setup that ties them together.

## What is in here

| Folder | What it is | Stack |
|---|---|---|
| `secondChance-backend/` | The API: items, search, authentication | Express 4, MongoDB driver, JWT, bcrypt, multer uploads, pino logging, express-validator |
| `sentiment/` | Microservice that scores comment text as positive / neutral / negative | Express, `natural` (AFINN sentiment) |
| `secondchancewebsite/` | Static landing site served by Express | Express |
| `secondChance-frontend/` | React front end (provided by the course, wired to this API) | React |
| `docker-compose.yml` | Runs MongoDB, the API, the sentiment service and the site together | Docker |
| `.github/workflows/main.yml` | Lints every service with ESLint (standard style) on each push and pull request | GitHub Actions |

## API

Base URL `http://localhost:3060` when run with Docker Compose.

| Method | Route | Does |
|---|---|---|
| `GET` | `/api/secondchance/items` | list all items |
| `POST` | `/api/secondchance/items` | add an item (multipart, one image via `multer`) |
| `GET` | `/api/secondchance/items/:id` | one item |
| `PUT` | `/api/secondchance/items/:id` | update an item |
| `DELETE` | `/api/secondchance/items/:id` | remove an item |
| `GET` | `/api/secondchance/search?name=&category=&condition=&age_years=` | filtered search |
| `POST` | `/api/auth/register` | create a user; password stored as a bcrypt hash; returns a JWT |
| `POST` | `/api/auth/login` | returns a JWT |
| `PUT` | `/api/auth/update` | update the signed-in user (JWT required) |
| `POST` | `/sentiment` (sentiment service) | `{ "sentiment": "positive" \| "neutral" \| "negative" }` for a text |

Every item route opens the database through one shared `connectToDatabase()` in `models/db.js`, which caches the client across requests.

## Run it

```bash
cp .env.sample .env          # set MONGO_ROOT_PASSWORD and JWT_SECRET
docker compose up --build    # MongoDB + API + sentiment + site
node secondChance-backend/util/import-mongo/index.js   # seed the sample items once
```

Without Docker: `cd secondChance-backend && npm install && npm run dev` with a MongoDB URL in `.env`.

## How it was built

The project was run the way the course asks: as a Kanban board of [14 user stories as GitHub issues](https://github.com/engomaressam/backend-nodejs-capstone/issues?q=is%3Aissue) using the issue template in `.github/ISSUE_TEMPLATE/`, each closed by a commit. The CI workflow runs on every push and the [latest run is green](https://github.com/engomaressam/backend-nodejs-capstone/actions). For grading, the stack ran in Docker on a laptop behind a Cloudflare quick tunnel.

## Author

Omar Essam El Sherbiny: [website](https://omaressam.web.app) · [LinkedIn](https://www.linkedin.com/in/omar-essam-el-sherbiny-b602279b/)

Capstone of the IBM JavaScript Back-end Developer Professional Certificate (October 2026). The skeleton (front end, sample data, issue template) is IBM's course template under the Apache 2.0 licence in `LICENSE`; the API, services, Docker and CI configuration were written for this project.
