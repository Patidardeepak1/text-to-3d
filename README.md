# 3DForge AI

3DForge AI turns a written description into a 3D model you can orbit in the browser and download as a GLB.

The backend sends the prompt to the [Tripo API](https://developers.tripo3d.ai/en/docs/quick-start), polls the task, downloads the GLB before the link expires, and serves it to a React Three Fiber viewer. A separate development mode can load a labeled sample model when you do not have an API key. That sample is never presented as AI output.

## Features

- Prompt validation in the browser and again on the server
- Asynchronous text-to-3D generation with status polling and cancellation
- Interactive viewer: orbit, zoom, pan, reset, auto-rotate, wireframe, grid, background, fullscreen
- Automatic centering and scaling for models of different sizes
- Download of the actual generated `.glb`
- Session history in `localStorage`
- Rate limiting, Helmet, CORS, and centralized errors that do not leak provider secrets

## Demo

Real generation needs a [Tripo API key](https://platform.tripo3d.ai) in the backend environment. Without that key the API returns a clear configuration error. With `AI_PROVIDER=demo`, the UI loads the Khronos Duck sample and labels it **Development Demo Model**.

## Screenshots

Capture these after the app is running locally:

1. Hero and prompt composer on the dark landing screen
2. Generation status while a model is queued
3. The 3D viewer with a completed model
4. The model information panel and download action
5. The same flow on a narrow viewport

## Architecture

```mermaid
flowchart LR
  Browser[React viewer] --> API[Express API]
  API --> Provider[TextTo3DProvider]
  Provider --> Tripo[Tripo API v3.1]
  Tripo --> GLB[GLB file]
  GLB --> Store[Local model store]
  Store --> Browser
```

The rest of the backend depends on `TextTo3DProvider`, not on Tripo-specific types. Replacing the model means adding another class under `backend/src/services/ai/` and selecting it from configuration.

The browser polls `GET /api/v1/generations/:id` about every 2.5 seconds. Each poll asks Tripo for the real task status. When the task succeeds, the server downloads `output.model_url` immediately, because those links expire after about 5 minutes.

## Tech stack

Frontend: React, Vite, TypeScript, Tailwind CSS, React Three Fiber, Three.js, Drei, Framer Motion, Lucide, React Hook Form, Zod, TanStack Query.

Backend: Node.js, Express, TypeScript, Zod, Helmet, CORS, express-rate-limit.

AI: Tripo OpenAPI, default model `v3.1-20260211`.

## Project structure

```text
frontend/src
  components/ui
  components/layout
  components/generation
  components/model-viewer
  pages
  hooks
  services
  lib
  types
backend/src
  controllers
  routes
  services/ai
  middleware
  validators
  utils
  types
  config
```

## How it works

1. The composer checks length and whitespace.
2. `POST /api/v1/generations` validates the prompt again and submits it to Tripo’s text-to-model endpoint.
3. The response is `queued` with a generation id.
4. The browser polls until Tripo reports `success`.
5. The server downloads the GLB from an allow-listed `tripo3d.ai` or `tripo3d.com` host, then stores it.
6. The viewer loads `GET /api/v1/generations/:id/model`.
7. Download uses `GET /api/v1/generations/:id/download` and a sanitized filename such as `cyberpunk-motorcycle.glb`.

## AI model

**Tripo v3.1** (`v3.1-20260211`) through `POST https://openapi.tripo3d.ai/v3/generation/text-to-model`.

The request sends the prompt and model id. Tripo returns a `task_id`. The server polls `GET /v3/tasks/{task_id}` until `status` is `success`, then downloads `output.model_url`. Textured runs use the Tripo API credit balance, which is separate from free credits on the Tripo Studio website.

The development sample is the Khronos Duck glTF model, licensed CC BY 4.0. See `backend/assets/demo/ATTRIBUTION.txt`.

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | API port. Default `4000`. |
| `NODE_ENV` | No | `development`, `test`, or `production`. |
| `CORS_ORIGIN` | Yes in production | Comma-separated frontend origins, or `*`. |
| `PUBLIC_BASE_URL` | No | Public API origin, if you want it recorded for the host. |
| `AI_PROVIDER` | No | `tripo` (default), `fal`, or `demo`. |
| `TRIPO_API_KEY` | Yes for Tripo | Tripo API key. Server only. |
| `TRIPO_MODEL` | No | Default `v3.1-20260211`. |
| `FAL_KEY` | Yes for fal | fal.ai API key. Server only. Used when `AI_PROVIDER=fal`. |
| `FAL_MODEL_ID` | No | Default `tripo3d/h3.1/text-to-3d`. |
| `FAL_INPUT_JSON` | No | Extra JSON object merged into the fal request body. Cannot set `prompt`. |
| `DEMO_DELAY_MS` | No | Delay before the sample model is marked ready. |
| `RATE_LIMIT_WINDOW_MS` | No | Generation window. Default 15 minutes. |
| `RATE_LIMIT_MAX` | No | Generation posts per IP per window. Default `8`. |
| `STORAGE_DIR` | No | Where GLB files are stored. Default `data`. |

### Frontend (`frontend/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | Yes in production | Backend origin with no trailing slash. Empty in local dev so Vite proxies `/api`. |
| `VITE_GITHUB_URL` | No | Repository URL for the header link. Hidden when empty. |

Never put `TRIPO_API_KEY` or `FAL_KEY` in a `VITE_` variable. The browser only talks to this API.

## Local development

Use two terminals from the repository root.

### Frontend setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

### Backend setup

```bash
cd backend
npm install
copy .env.example .env
```

Edit `backend/.env` and set `TRIPO_API_KEY`. To exercise the viewer without credits:

```text
AI_PROVIDER=demo
```

```bash
npm run dev
```

### Running locally

- App: http://localhost:5173
- API: http://localhost:4000/api/v1/health

The Vite dev server proxies `/api` to port 4000, so leave `VITE_API_URL` empty locally.

## API documentation

### `GET /api/v1/health`

```json
{ "success": true, "data": { "status": "ok", "provider": "tripo", "configured": true, "demo": false } }
```

### `GET /api/v1/meta`

Public provider label, whether a key is configured, and whether demo mode is on. The key itself is never returned.

### `POST /api/v1/generations`

```json
{ "prompt": "A futuristic cyberpunk motorcycle" }
```

While the job is running, the API responds with `202`:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "processing",
    "modelUrl": null,
    "format": null
  }
}
```

Statuses: `queued`, `processing`, `completed`, `failed`, `cancelled`.

### `GET /api/v1/generations/:id`

Returns the same generation object. When Tripo finishes, this request downloads the GLB and then returns `status: "completed"` with `modelUrl`, `downloadUrl`, `fileSize`, and `generationTimeMs`.

### `POST /api/v1/generations/:id/cancel`

Cancels a queued or in-progress job when the provider still allows it. The Tripo text-to-model flow does not expose cancel.

### `GET /api/v1/generations/:id/model`

Streams the GLB or GLTF inline.

### `GET /api/v1/generations/:id/download`

Same file as an attachment. The filename is a sanitized slug of the prompt.

### Errors

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Your prompt is too short." }
}
```

Prompts must be 8–1024 characters after trimming.

## Deployment

The frontend is set up for Vercel. The backend is set up for Render. Railway works with the same start command. No deployment was performed here because no host credentials were available.

### Frontend on Vercel

1. Import the repository.
2. Set the root directory to `frontend`.
3. Framework preset: Vite.
4. Set `VITE_API_URL` to the deployed API origin, for example `https://3dforge-api.onrender.com`.
5. Optionally set `VITE_GITHUB_URL`.

`frontend/vercel.json` rewrites client routes to `index.html`.

### Backend on Render

`render.yaml` describes a Node web service with root directory `backend`.

1. Create a Render web service from this repo, or apply `render.yaml`.
2. Build command: `npm install && npm run build`.
3. Start command: `npm start`.
4. Health check: `/api/v1/health`.
5. Set `TRIPO_API_KEY`, `CORS_ORIGIN` to the Vercel origin, `AI_PROVIDER=tripo`, and `NODE_ENV=production`.

The disk on Render’s free instance is ephemeral. Generated files disappear when the service restarts. A durable bucket would be the next storage step.

### Docker

```bash
docker build -t 3dforge-api backend
docker run -p 4000:4000 -e TRIPO_API_KEY=your-key -e CORS_ORIGIN=https://your-app.vercel.app 3dforge-api
```

Do not bake the API key into the image.

## Troubleshooting

- **“Add TRIPO_API_KEY”** — `AI_PROVIDER=tripo` and the key is empty. Add it to `backend/.env` and restart the API.
- **CORS error in production** — `CORS_ORIGIN` must be the exact frontend origin, including `https`.
- **Viewer says the model could not be loaded** — the file was not a GLB/GLTF, or it was deleted after a server restart.
- **Generation stays on “Waiting in queue” or “Generating 3D model”** — Tripo is still working. Progress is shown when Tripo sends it. A typical model takes about 10–120 seconds.
- **Demo model appears in production** — `AI_PROVIDER` is `demo`. Set it back to `tripo`.

## Future improvements

- Durable object storage and a small database so jobs survive restarts and multiple instances
- Verified fal webhooks for deployments with a stable public URL
- Account system and server-side history
- Thumbnail capture from the viewer when the provider does not return a preview
- Additional providers behind the same `TextTo3DProvider` interface

## License

Application code is released under the MIT License. See `LICENSE`.

The development sample model remains under the Khronos CC BY 4.0 license. See `backend/assets/demo/ATTRIBUTION.txt`.
