# Sentinel — Free-Tier Deployment Plan & Operator Manual (Hackathon)

This assumes the Phase 1 local build (all four services running on
`localhost`, working end to end) is validated first. Everything below is
the Phase 2 rollout the original build spec deferred — **scoped entirely to
free tiers**, since this is for a hackathon showcase, not paid production
hosting. Every platform below (Vercel, Render, Hugging Face Spaces,
Supabase) has a genuine $0 tier that's enough to demo on. The trade-off is
cold starts when a service has been idle — Part 6 below is a warm-up
checklist built specifically to neutralize that on demo day.

---

## Part 1 — Where each service goes, and why

| Service | Local port | Deploy to | Why |
|---|---|---|---|
| Frontend (Vite + React) | 5173 | **Vercel** | Static/SPA build, zero-config Vite support, free tier, instant CDN + preview URLs per commit. |
| Backend (Express + Web3 relayer) | 8000 | **Render** (Web Service) | Needs a persistent, always-listening process (holds the relayer wallet key, signs transactions) — not a good fit for short-lived serverless functions. |
| Role 2 — AI Orchestrator (FastAPI + LangChain) | 5000 | **Hugging Face Spaces** (Docker SDK) | I/O-bound (calls Gemini/Groq/OpenAI), no heavy local compute — HF's free CPU tier is plenty and it's the natural home for an ML-labeled service. |
| Role 3 — Moderation Service (FastAPI + ONNX) | 8002 | **Hugging Face Spaces** (Docker SDK) | CPU-bound (NudeNet, SwinV2, C2PA). HF's free CPU Basic tier (2 vCPU / **16 GB RAM**) is more generous than any competitor's free tier for this workload — see Part 2. |
| Database | — | **Supabase** (already hosted) | No change — you're already on it. |
| Smart contract | — | **Sepolia testnet** (already deployed) | No change for Phase 2. Moving to a mainnet L2 (Base/Polygon) is a separate, later decision — not part of this plan. |

**Decision carried over from the earlier fix spec: Role 2 and Role 3 stay
as two separate services/Spaces.** Different resource profiles (network-bound
LLM calls vs. CPU-bound ONNX inference), independent scaling, and fault
isolation — a crash or slowdown in one must not take down the other.

---

## Part 2 — Reality check: can SwinV2 run on affordable hosting?

Checked against the actual model card for
`haywoodsloan/ai-image-detector-deploy`:

- **~0.2B parameters** (195–200M), shipped as a 781 MB fp32 `safetensors`
  file. This is a mid-sized vision transformer — not a small model, but
  nowhere near LLM-scale. It's comparable in size to a BERT-large.
- NudeNet and the C2PA reader are both lightweight by comparison (NudeNet's
  ONNX file is tens of MB; C2PA is a manifest read, not a model).

**Verdict: yes, it's realistic on CPU — with two conditions.**

1. **Quantize the ONNX export to int8** (`onnxruntime.quantization.quantize_dynamic`)
   as part of `scripts/convert_to_onnx.py`. This roughly halves-to-quarters
   both the file size (~200–250 MB instead of 781 MB) and CPU inference
   time, with negligible accuracy loss for a classification head. This is
   a small addition to the existing conversion script, not a new component.
2. **Treat image moderation as async, not a blocking call the user waits
   on** — which is already how the pipeline is designed (`Post` starts
   `pending`, the UI can show a "moderation in progress" state, results
   land seconds later). This matters because CPU inference for a model
   this size realistically lands somewhere in the **low-single-digit
   seconds per image** on 2 vCPUs, not milliseconds — do not architect the
   UI to block post-submission on this response.

**Hardware fit:** HF Spaces' free **CPU Basic** tier (2 vCPU, 16 GB RAM) has
enough headroom to load SwinV2 + NudeNet + C2PA in memory simultaneously —
16 GB is generous for a ~250 MB–1 GB model footprint. The realistic
constraint isn't RAM, it's **cold start**: free-tier Spaces sleep after
inactivity, and reloading a ~250 MB–780 MB model on wake adds noticeably to
the first request after a sleep. Budget for this explicitly (see cost tiers
below) rather than being surprised by it.

**If it's still too slow after quantization:** the next step up is HF's
`CPU Upgrade` tier (8 vCPU / 32 GB, $0.03/hr ≈ $22/month if left running
continuously) before reaching for a GPU tier — a GPU (from $0.40/hr,
≈$288/month continuous) is very unlikely to be worth it for a 200M-param
classifier and would be over-engineering for this model size.

**Deployment nuance carried over from the existing Role 3 spec:** models
must still load from a local file via `onnxruntime.InferenceSession(...)`,
never downloaded from the Hub at request time. On HF Spaces this means the
converted `.onnx` files ship *inside the Space's own git repo* (via
Git-LFS/Xet, same as any large file on the Hub) and get baked into the
Docker image at build time — the existing `nsfw.py` / `deepfake.py` loading
code needs zero changes, only the model files need to be committed to the
Space repo.

---

## Part 3 — Cost: $0/month, all four services

| Service | Free plan | The catch |
|---|---|---|
| Frontend (Vercel) | Hobby — free forever, no card needed. ToS restricts it to non-commercial/personal use, which a hackathon demo is. | None that matters here. |
| Backend (Render) | Free Web Service — 512 MB RAM, 0.1 CPU | Sleeps after 15 min idle, ~30–60s cold start on next request |
| Role 2 (HF Spaces) | CPU Basic — 2 vCPU / 16 GB RAM | Sleeps when idle; wakes on the next hit |
| Role 3 (HF Spaces) | CPU Basic — 2 vCPU / 16 GB RAM | Same sleep behavior, plus a bigger model to reload on wake (Part 2) |
| Database (Supabase) | Free — 500 MB DB, 1 GB storage | Auto-pauses after 7 days with zero API requests |

**Total: $0.** The only real cost is cold starts on services that have been
idle — none of these free tiers charge for compute, they just spin down
when unused and take a beat to spin back up. That's exactly what Part 6
(Demo Day Checklist) is for: wake everything a few minutes before you go up,
and cold starts never happen in front of the judges.

If HF ever blocks Docker Space creation on a brand-new account (it has done
this occasionally for anti-abuse reasons), a free PRO trial or the $9/mo
PRO plan removes that block — worth knowing, but not something to pay for
unless you actually hit it.

---

## Part 4 — Required addition before going public: lock down Role 2 / Role 3

Locally, `POST /analyze/text` and `POST /moderate/image` are only reachable
on `localhost` — nothing stops a random caller today because nothing *can*
reach them. Once they have public HF Spaces URLs, anyone who finds the URL
can call them directly: Role 2 racks up your LLM API bill, Role 3 eats your
free CPU quota. This is a small, required addition — not a new feature:

1. Add one shared-secret env var (e.g. `INTERNAL_API_KEY`) as a **secret**
   on both HF Spaces and on the Render backend.
2. In `ai-orchestrator/app.py` and `moderation_service/app.py`, add a tiny
   FastAPI dependency that checks an `X-Internal-Key` header against that
   env var on every route, 401s if missing/wrong.
3. In the backend's outgoing calls to Role 2 / Role 3 (`services/aiService.js`),
   send that header.

This is the minimum viable protection — it is not Turnstile or Upstash
(those stay Phase-2-later per the original spec), just enough to stop
Role 2/3 from being open to the entire internet the moment they get a
public URL.

---

## Part 5 — Step-by-step rollout

### Step 0 — Pre-deploy checklist
- [ ] `scripts/convert_to_onnx.py` updated to also emit int8-quantized
      `.onnx` files (Part 2).
- [ ] Quantized model files committed to the Role 3 repo/folder that will
      become the Space repo.
- [ ] `INTERNAL_API_KEY` check added to Role 2 and Role 3 (Part 4).
- [ ] Confirm every `.env.example` in each service lists every variable
      it actually needs — you'll be re-entering all of these as secrets on
      each platform.
- [ ] Confirm CORS on the Express backend currently allows `*` or
      `localhost:5173` only — you'll need to change this to the real
      Vercel domain in Step 4.

### Step 1 — Deploy Role 3 (Moderation Service) to Hugging Face Spaces
1. Create a Hugging Face account if you don't have one, at huggingface.co.
2. New Space → SDK: **Docker** → hardware: **CPU Basic** (free) to start.
   *(Note: HF has occasionally required a PRO account, $9/mo, to create a
   compute-backed Docker Space, depending on account status — if Space
   creation is blocked on your account, PRO removes the block and is cheap
   insurance either way.)*
3. Push `moderation_service/` (including the quantized `models/` files) as
   the Space's repo content — same Dockerfile you already have, just
   confirm it listens on `0.0.0.0` and on the port HF expects (`7860` by
   default; check the Docker Spaces doc's `app_port` setting if you need a
   different one).
4. In Space Settings → Variables and secrets: add `INTERNAL_API_KEY` and
   any Supabase credentials `db.py` needs, as **secrets** (never variables).
5. Wait for the build to finish, then hit `https://<you>-<space>.hf.space/moderate/image`
   with a test image and confirm a real response (not a 401/500).

### Step 2 — Deploy Role 2 (AI Orchestrator) to Hugging Face Spaces
1. New Space → Docker → CPU Basic.
2. Push `ai-orchestrator/` as the repo content.
3. Add secrets: `INTERNAL_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`,
   `OPENAI_API_KEY`, plus whatever `config.py` requires.
4. Confirm build succeeds, then hit `/api/v1/analyze/text` with a test
   payload.

### Step 3 — Deploy the Backend to Render
1. Create a Render account, connect your GitHub repo.
2. New → Web Service → point at the `backend/` folder (Node/Express).
3. Set the start command to whatever currently runs it locally
   (e.g. `node server.js` / `npm start`).
4. Environment → add every backend secret: Supabase URL/key, the relayer
   wallet **private key**, `NETWORK_RPC_URL`, `CONTRACT_ADDRESS`,
   `INTERNAL_API_KEY`, and two new ones — `ROLE2_SERVICE_URL` and
   `ROLE3_SERVICE_URL` — pointing at the two `*.hf.space` URLs from Steps
   1–2 (replacing the old `localhost:5000` / `localhost:8002`).
5. Pick the **Free** instance type.
6. Deploy, then hit `https://<your-backend>.onrender.com/api/v1/posts`
   (or any known-good route) to confirm it's live.

### Step 4 — Deploy the Frontend to Vercel
1. Create a Vercel account, import the GitHub repo, framework preset:
   **Vite**.
2. Environment variables: point `VITE_API_BASE_URL` (or whatever the
   frontend's `services/api.js` reads) at the Render backend URL from
   Step 3. Add Supabase URL/anon key as `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_ANON_KEY`.
3. Deploy. Vercel gives you a `*.vercel.app` URL immediately.
4. **Go back to the Render backend's CORS config** and replace the
   placeholder origin with this real Vercel URL. Redeploy the backend.

### Step 5 — Wire it together and verify
- [ ] Load the Vercel frontend URL, connect a wallet, log in.
- [ ] Create a text-only post → confirm Role 2 fields populate on the post.
- [ ] Create an image-only post → confirm Role 3 fields populate.
- [ ] Create a text **and** image post → confirm **both** sets of fields
      populate (this is the fix from the earlier dispatch-bug spec —
      verify it end-to-end in the deployed environment, not just locally).
- [ ] Manually hit Role 2 / Role 3 URLs *without* the `X-Internal-Key`
      header and confirm you get a 401, not a real response.

### Step 6 — Post-deploy smoke test
- Time a cold request to Role 3 right after it's been idle, so you know
  your real worst-case latency going into demo day.
- Confirm Supabase project isn't paused (check dashboard).
- Confirm the relayer wallet on Render has testnet ETH for gas on Sepolia.

Once this passes, do the deploy once and don't touch it again until demo
day — re-deploys reset the sleep timers on everything and you'll just be
re-warming services you already warmed. Go straight to Part 6 below on the
day itself.

---

## Part 6 — Demo Day Checklist (do this 10–15 minutes before you present)

Every service above is free-tier and sleeps when idle. This is the one
sequence that matters on the day — it wakes everything in the right order
before anyone's watching.

1. **Ping Role 3 first — it's the slowest to wake** (loads the biggest
   model). Hit `https://<you>-role3-space.hf.space/moderate/image` with any
   test image, or just open the Space URL in a browser tab and wait for it
   to respond.
2. **Ping Role 2** the same way — `https://<you>-role2-space.hf.space/api/v1/analyze/text`.
3. **Load the Render backend URL directly** (any known-good route) to wake
   it — don't rely on the frontend's first request to do this, since that
   request would time out waiting on a cold backend *and* cold Role 2/3
   simultaneously.
4. **Load the Vercel frontend** and do one full create-post cycle yourself
   (text + image) — this both confirms everything actually still works and
   keeps all three backend services warm right up until you present.
5. **Check the relayer wallet's Sepolia ETH balance** — if it's run dry
   since your last test, on-chain actions (register/verdict/claim) will
   fail live. Top up from a Sepolia faucet if needed.
6. **Check Supabase isn't paused** (dashboard → project status).
7. If your demo slot isn't immediately after this warm-up, **do one more
   lightweight ping to each service every 10 minutes** while waiting — free
   HF/Render tiers sleep after ~15 minutes idle, so a single warm-up done
   too early can go cold again if there's a queue before you present.

**Backup plan:** free tiers can still have an off day (platform-side
hiccup, unexpected build issue). Have a 60–90 second screen recording of a
full working demo ready as a fallback so a rare cold-start or platform
blip doesn't cost you the whole slot.

---

## Part 7 — Operator Manual: connecting each platform

### Hugging Face
- **Account:** huggingface.co → Sign Up, verify email.
- **Create a Space:** Spaces tab → *Create new Space* → pick SDK **Docker**
  → pick hardware (CPU Basic to start).
- **Push code:** a Space is just a git repo. Either use the web UI's
  drag-and-drop uploader for a first pass, or `git remote add space
  https://huggingface.co/spaces/<you>/<space-name>` and `git push space main`
  for ongoing updates — every push triggers an automatic rebuild.
- **Secrets:** Space page → Settings → *Variables and secrets* → add each
  key. Secrets are write-only after saving (you can't view them again, only
  overwrite) — keep your own copy in a password manager.
- **Logs:** Space page → *Logs* tab, separate Build logs and Run logs —
  check Build logs first if a deploy fails.
- **Waking a sleeping Space:** just visiting its URL wakes it; there's no
  manual "start" button needed on free tier, only a **Restart** if it's
  stuck.
- **Upgrading hardware:** Space Settings → *Hardware* → pick a tier from
  the list in Part 3. Billing is per-second while running; pause the Space
  when not needed to stop the meter.

### Vercel
- **Account:** vercel.com → Sign Up with GitHub (recommended — enables
  auto-deploy on push).
- **Import project:** Dashboard → *Add New* → *Project* → select the repo
  → Vercel auto-detects Vite; confirm build command (`npm run build`) and
  output directory (`dist`) if it doesn't guess right.
- **Environment variables:** Project → Settings → *Environment Variables* —
  add one at a time, choose which environments (Production/Preview/
  Development) each applies to.
- **Redeploying:** every `git push` to your default branch auto-deploys to
  production; every push to any other branch/PR gets its own preview URL.
- **Custom domain:** Project → Settings → *Domains* → add your domain,
  follow the DNS records it gives you.
- **Note:** Hobby plan is free but its ToS restricts it to non-commercial,
  personal projects — see Part 3 for when to move to Pro.

### Render
- **Account:** render.com → Sign Up (no credit card required for the free
  tier).
- **New Web Service:** Dashboard → *New* → *Web Service* → connect the
  GitHub repo → point *Root Directory* at `backend/` if it's a monorepo.
- **Environment variables:** Service → *Environment* tab → add each key —
  this is where the relayer private key and all API keys/URLs go.
- **Redeploying:** auto-deploys on push by default (toggle in Settings if
  you want manual deploys instead).
- **Logs:** Service page → *Logs* tab, live-tails by default.
- **Sleep behavior (free tier only):** spins down after 15 minutes idle,
  ~30–60s cold start on the next request. Upgrade to Starter ($7/mo) to
  remove this entirely.

### Supabase (already set up — just confirming, no change needed)
- Dashboard → your project → *Settings* → *API* to re-find the URL/anon
  key you're already using in the frontend/backend env vars above.
- If a free-tier project shows "Paused" after a quiet period: dashboard →
  *Restore*. Consider a scheduled GitHub Action (a simple `curl` to any
  API route, every 3 days) if you want to avoid this during active testing,
  or move to Pro ($25/mo) once real users depend on it.

### Troubleshooting quick reference
| Symptom | Likely cause | Fix |
|---|---|---|
| First request after a while is very slow, then fine | Free-tier cold start (Render/HF Spaces both do this) | Expected on Tier A; upgrade that specific service if unacceptable |
| Frontend gets CORS errors calling the backend | Render backend's CORS origin doesn't match the Vercel URL | Update backend CORS config, redeploy |
| Role 2/3 calls fail with 401 | `INTERNAL_API_KEY` mismatch or missing header | Confirm the same value is set as a secret on both the HF Space and the Render backend |
| Post with text+image only shows one set of results | The dispatch-bug fix wasn't deployed / didn't take | Re-check `postController.js` against the earlier fix spec, redeploy backend |
| Supabase calls suddenly fail | Free-tier project auto-paused after 7 days idle | Restore from dashboard; add a keep-alive ping or move to Pro |
