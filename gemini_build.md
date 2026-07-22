# Sentinel — Full Build Spec (Web3 Twitter/X-style Platform)

System Role: You are an expert full-stack and ML systems engineer. Build exactly
what is specified below, for the role indicated. Do not add features, models,
or libraries not listed here.

---

## 🧭 CURRENT PHASE: Local-Only Build (No Deployment)

> Added 2026-07-22 — this note overrides any deployment-related instructions
> elsewhere in this file until Phase 2 begins. It applies across all roles.

**Phase 1 (current, this update):**
- Every ML model used anywhere in this project is converted to **ONNX**
  ahead of time and saved to a local `models/` folder on the dev machine.
- Every service loads its model from that local `models/` folder via
  `onnxruntime` — no Hugging Face Hub download at request time, no hosted
  inference API.
- Everything runs locally (`localhost` ports). No cloud deployment work of
  any kind: no Sepolia/L2 contract deployment, no IPFS pinning, no
  Cloudflare Turnstile, no Upstash Redis, no hosted DB requirement beyond
  what's already running. Where a role's spec below still references one of
  these cloud services, treat it as a **Phase 2** item — stub it out or skip
  it rather than building against a live cloud dependency.
- SQL schema changes are in scope for this update where the plan below
  needs them (see Shared Data Model).

**Phase 2 (later — do not start yet):** once the local build works end to
end, this file will be revisited to add the deployment plan (hosting, IPFS,
on-chain anchor network, rate limiting, bot protection, etc.). Do not build
ahead for Phase 2.

---

# 📊 BUILD PROGRESS TRACKER

> Last updated: 2026-07-22

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented & working |
| ⚠️ | Partially implemented / deviation from spec |
| ❌ | Not started / missing |

---

## 0. Shared Data Model

| Item | Status | Notes |
|------|--------|-------|
| `Account` table | ⚠️ | Implemented as `users` in Supabase. Has `id`, `username`, `display_name`, `wallet_address`, `avatar_url`, `cover_url`, `bio`, `created_at`. **Missing spec fields**: `follower_count`, `following_count`, `spam_score`, `status` (active/flagged/suspended). Follows are tracked via a join table instead. |
| `Post` table | ⚠️ | Implemented as `posts`. Has `id`, `user_id`, `content`, `media_url`, `ai_status` (pending/verified/flagged), `impressions_count`, `created_at`. **Missing spec fields**: `ai_text_label`, `ai_text_confidence`, `image_moderation_status`, `image_labels[]`, `visibility` (public/labeled/blocked). Uses `ai_status` instead of `visibility`. |
| `Follow` table | ✅ | Implemented as `follows` with `follower_id`, `following_id`, `created_at`. Matches spec. |
| `Report` table | ❌ | No `reports` table in the Supabase schema. The moderation_service has a stub `db.py` that generates UUIDs but doesn't persist to Postgres. |
| `Comments` table | ✅ | **Extra** — not in spec. Fully working with RLS. |
| `Likes` table | ✅ | **Extra** — not in spec. Fully working with unique constraint. |
| `Reposts` table | ✅ | **Extra** — not in spec. Fully working with unique constraint. |
| `Notifications` table | ✅ | **Extra** — not in spec. Supports like, comment, follow, repost, verification types. |
| `Hashtags` + `post_hashtags` tables | ✅ | **Extra** — not in spec. Used for trending feature. |
| `increment_impression()` RPC | ✅ | **Extra** — Supabase stored function for atomic impression counting. |
| Postgres + RLS policies | ✅ | All tables have RLS enabled with appropriate policies. |
| Schema migration scripts | ✅ | `schema.sql`, `schema_update.sql`, `schema_update_v2.sql` — versioned migrations. |

---

## ROLE 1 — Frontend, Backend, Web3

### Tech Stack Comparison

| Spec Requirement | Actual Implementation | Status |
|------------------|----------------------|--------|
| Next.js 14, App Router, TypeScript | **Vite + React 19 + JSX** (not TypeScript) | ⚠️ Deviation — functional equivalent, not Next.js |
| Tailwind CSS | Tailwind v4 via PostCSS | ✅ |
| wagmi + RainbowKit, SIWE | **ethers.js v6** direct MetaMask integration via custom `Web3Context` | ⚠️ Deviation — no wagmi/RainbowKit/SIWE, but wallet auth works |
| Next.js API routes as BFF | **Express.js v5** separate backend on port 8000 | ⚠️ Deviation — separate server instead of Next.js API routes |
| Postgres (Supabase or Neon) | **Supabase** with `@supabase/supabase-js` | ✅ |
| Cloudflare Turnstile bot protection | ❌ Not implemented | ❌ |
| Upstash Redis rate limiting | ❌ Not implemented | ❌ |
| IPFS media storage (web3.storage/Pinata) | ❌ Placeholder URL used (`via.placeholder.com`) | ❌ |
| nsfwjs client-side pre-check | ❌ Not implemented | ❌ |
| On-chain anchor contract (PostAnchored event) | ⚠️ `SentinelRegistry.sol` deployed — different design (content registration + verification + token rewards), not a simple PostAnchored event | ⚠️ |

### Frontend — Pages (12 pages built)

| Page | File | Status | Notes |
|------|------|--------|-------|
| Home / Feed | `pages/Home.jsx` | ✅ | Feed with post composer, infinite scroll |
| Login | `pages/Login.jsx` | ✅ | Supabase email/password + Google OAuth |
| Register | `pages/Register.jsx` | ✅ | Supabase sign-up with wallet address |
| Profile | `pages/Profile.jsx` | ✅ | Full profile page with edit, avatar, cover, bio, follower/following lists |
| Post Detail | `pages/PostDetail.jsx` | ✅ | Individual post view with comments |
| Notifications | `pages/Notifications.jsx` | ✅ | Real-time notification feed (like, comment, follow, repost) |
| Explore | `pages/Explore.jsx` | ✅ | Discovery/search page |
| Trending | `pages/TrendingPage.jsx` | ✅ | Trending hashtags + high-engagement posts |
| Bookmarks | `pages/Bookmarks.jsx` | ⚠️ | Stub — placeholder component |
| Chat | `pages/Chat.jsx` | ⚠️ | Stub — placeholder component |
| Studio | `pages/Studio.jsx` | ⚠️ | Stub — placeholder component |
| Premium | `pages/Premium.jsx` | ⚠️ | Stub — placeholder component |

### Frontend — Components (8 components built)

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| AppLayout | `components/AppLayout.jsx` | ✅ | Outlet-based layout wrapper |
| Sidebar | `components/Sidebar.jsx` | ✅ | Full navigation sidebar with icons (lucide-react) |
| PostComponents | `components/PostComponents.jsx` | ✅ | Post card with like, comment, repost, impressions, AI status badges |
| PostComposer | `components/PostComposer.jsx` | ✅ | Text + media upload composer |
| Dashboard | `components/Dashboard.jsx` | ✅ | Web3 dashboard — wallet connect, $SNTL balance, trust score, airdrop claim |
| WidgetsPanel | `components/WidgetsPanel.jsx` | ✅ | Right sidebar — trending news, trending hashtags |
| ThemeToggler | `components/ThemeToggler.jsx` | ✅ | Dark/light theme toggle |
| VerifiedBadge | `components/VerifiedBadge.jsx` | ✅ | Verification badge component |

### Frontend — Context & Hooks

| Module | File | Status | Notes |
|--------|------|--------|-------|
| AuthContext | `context/AuthContext.jsx` | ✅ | Supabase auth with auto-upsert of Google OAuth users into `public.users` |
| ThemeContext | `context/ThemeContext.jsx` | ✅ | Dark/light mode state management |
| Web3Context | `context/Web3Context.jsx` | ✅ | MetaMask connection, Sepolia enforcement, contract reads (balanceOf, trustScore, hasClaimedAirdrop), gasless claim via backend relayer |
| useWallet hook | `hooks/useWallet.js` | ✅ | Wallet connection hook |
| useIntersectionObserver | `hooks/useIntersectionObserver.js` | ✅ | Viewport observation for impressions tracking |
| API service | `services/api.js` | ✅ | Axios-based API client for backend calls |
| Supabase client | `supabaseClient.js` | ✅ | Frontend Supabase client initialization |

### Backend — Express.js API (7 route groups)

| Route Group | Files | Status | Notes |
|-------------|-------|--------|-------|
| Posts (`/api/v1/posts`) | `routes/postRoutes.js` + `controllers/postController.js` | ✅ | Create post (with media), get all posts, add comment, get comments, toggle like, toggle repost, increment impressions. AI moderation dispatch to `ai-orchestrator` on media upload. |
| Users (`/api/v1/users`) | `routes/userRoutes.js` + `controllers/userController.js` | ✅ | Update profile, toggle follow, get social counts, get followers/following lists, get user profile. |
| Notifications (`/api/v1/notifications`) | `routes/notificationRoutes.js` + `controllers/notificationController.js` | ✅ | Get notifications, mark all as read. |
| Trending (`/api/v1/trending`) | `routes/trendingRoutes.js` + `controllers/trendingController.js` | ✅ | Aggregate hashtag counts, compute engagement-scored top posts. |
| News (`/api/v1/news`) | `routes/newsRoutes.js` + `controllers/newsController.js` | ✅ | Cascading news fetch (Currents API → NewsData.io → mock fallback) with 15-min in-memory cache. |
| Web3 (`/api/v1/web3`) | `routes/web3Routes.js` + `controllers/web3Controller.js` | ✅ | Register post on-chain, render verdict on-chain, get user Web3 state (balance, trustScore, hasClaimed). |
| Relayer (`/api`) | `routes/relayer.js` | ✅ | Gasless relayer for `verify-content` (register + verdict) and `claim-tokens` (mock gasless airdrop). |

### Backend — Services & Utils

| Module | File | Status | Notes |
|--------|------|--------|-------|
| News cascade service | `services/NewsService.js` | ✅ | Multi-provider news with fallback |
| AI service | `services/aiService.js` | ✅ | Proxy to AI orchestrator |
| Web3 relayer (services) | `services/web3Relayer.js` | ⚠️ | Scaffolding with simulated calls — TODOs for real contract interaction |
| Web3 relayer (utils) | `utils/web3Relayer.js` | ✅ | **Fully functional** — ethers.js v6, reads contract state, relays `registerContent` + `updateVerification` |
| ABI | `utils/abi.js` | ✅ | SentinelRegistry ABI fragment |
| Ethers config | `config/ethers.js` | ✅ | Provider + wallet + contract initialization |
| Auth middleware | `middleware/authMiddleware.js` | ✅ | Supabase JWT verification with mock fallback for dev |
| Supabase client | `supabaseClient.js` | ✅ | Backend Supabase client |

### Smart Contract — `SentinelRegistry.sol`

| Feature | Status | Notes |
|---------|--------|-------|
| ERC20 token (`$SNTL`) | ✅ | Inherits OpenZeppelin `ERC20` — "Sentinel Token" / "SNTL" |
| Airdrop claim (`claimInitialTokens`) | ✅ | 500 $SNTL mint per wallet, one-time claim, initializes trust score to 100 |
| Content registration (`registerContent`) | ✅ | Owner-only, stores `ipfsHash`, `VerificationStatus.PENDING`, `author`, `timestamp` |
| Verdict rendering (`updateVerification`) | ✅ | Owner-only. VERIFIED → mint 50 SNTL + trust +10. FLAGGED → burn 50 SNTL + trust -30. |
| Trust score system | ✅ | On-chain mapping `userTrustScores`, updated on verdicts |
| Events | ✅ | `TokensClaimed`, `ContentRegistered`, `VerdictRendered` |
| Deployed on Sepolia | ✅ | Contract at `0x460DC3605D19B84b76e17Aa59cfe1E2D28479Cc9` |
| Hardhat config | ✅ | `hardhat.config.js` present |

### Spec Deliverables vs Actual (Role 1)

| Spec Deliverable | Actual | Status |
|-----------------|--------|--------|
| `app/page.tsx` — feed, composer, wallet, Turnstile + nsfwjs | `frontend/src/pages/Home.jsx` + `PostComposer.jsx` + `Dashboard.jsx` — feed + composer + wallet. **No** Turnstile or nsfwjs. | ⚠️ |
| `app/api/posts/route.ts` — full pipeline | `backend/controllers/postController.js` — creates post, dispatches to AI orchestrator, triggers web3 relayer. **No** Turnstile/Upstash/IPFS steps. | ⚠️ |
| `app/api/auth/siwe/route.ts` — SIWE | `frontend/src/context/AuthContext.jsx` — Supabase auth (email + Google OAuth). **No SIWE**. | ⚠️ |
| `contracts/PostAnchor.sol` — event-emitting | `smart-contracts/contracts/SentinelRegistry.sol` — richer contract with tokens + trust. Matches spirit. | ✅ |
| `lib/db/schema.ts` | `backend/supabase/schema.sql` + updates — SQL-based, not TypeScript. | ✅ |
| `.env.example` | Present in `moderation_service/` and `ai-orchestrator/`. Backend uses `dotenv`. | ✅ |

---

## ROLE 2 — Text Analysis (AI-generated / Misleading / Fact-Check)

| Item | Status | Notes |
|------|--------|-------|
| `text_service/app.py` — FastAPI | ❌ | **Not built.** No `text_service/` directory exists. |
| `text_service/detector.py` — AI-text detector (`desklib/ai-text-detector-v1.01`) | ❌ | Not implemented. |
| `text_service/factcheck.py` — claim extraction + hybrid retrieval (BM25 + BGE + FAISS) + LLM verdict | ❌ | Not implemented. |
| `text_service/requirements.txt` | ❌ | Not created. |
| `POST /analyze/text` endpoint | ❌ | Not implemented. |
| Cross-role integration: Role 3 forwards `misleading` reports to Role 2 | ⚠️ | Code exists in `moderation_service/reports.py` to forward to `ROLE2_SERVICE_URL`, but the target service doesn't exist. |

**Role 2 Summary: 0% complete — entire text analysis service is unbuilt.**

---

## ROLE 3 — Spam, Abuse & Visual Moderation

> ⚠️ **SPEC CHANGED 2026-07-22** — deepfake detection is being swapped from
> `prithivMLmods/deepfake-detector-model-v1` + YOLOv8n-face/affine-warp to
> `haywoodsloan/ai-image-detector-deploy` (SwinV2), run on the whole image
> only (no face crop step). Models also move to local ONNX files under
> `models/`. Everything below in this tracker still describes the
> **previous** build — rows involving the deepfake model, YOLO, and HF
> Hub-loaded models need rework against the updated spec further down this
> file.

### Moderation Service (`moderation_service/`)

| Module | File | Status | Notes |
|--------|------|--------|-------|
| FastAPI app | `app.py` | ✅ | All 3 endpoints: `/moderate/image`, `/moderate/account-score`, `/report`. Pydantic schemas match cross-role contract. Runs on port 8002. |
| NudeNet NSFW detector | `nsfw.py` | ✅ | NudeNet v3 via ONNX Runtime. Explicit labels defined. Threshold logic: >60% → blocked, 18-60% or suggestive → `sensitive_content`. Lazy-loaded. |
| Deepfake detection | `deepfake.py` | ✅ | `prithivMLmods/deepfake-detector-model-v1` (SigLIP2) on full image + YOLOv8n-face crop. Affine-warp with eye keypoints, 20% margin crop, max(full, face) confidence. >65% → `ai_generated_image`. All CPU, lazy-loaded. |
| C2PA provenance | `provenance.py` | ✅ | `c2pa-python` read-only. Manifest found → `disclosed_ai_content`. Never blocks. |
| Spam scoring | `spam_score.py` | ✅ | Weighted heuristic: 0.40×follow_spam_ratio + 0.25×age_velocity + 0.20×duplicate_ratio + 0.15×report_count_normalized. Bands: <40 clean, 40-75 flagged, >75 auto_suspend. Auto-suspend persists to DB. |
| Report routing | `reports.py` | ✅ | Insert report → `misleading` forwards to Role 2 → other reasons trigger account-score recompute. Returns `{ report_id, routed_to }`. |
| DB access layer | `db.py` | ⚠️ | **Stub implementation** — returns safe defaults, generates UUIDs, logs queries. Not connected to live Supabase/Postgres. Documented SQL queries for Role 0 to implement. |
| `.env.example` | ✅ | HF_TOKEN, ROLE2_SERVICE_URL, SUPABASE credentials, PORT. |
| `requirements.txt` | ✅ | fastapi, uvicorn, python-dotenv, httpx, onnxruntime, nudenet, transformers, torch, ultralytics, opencv-python-headless, c2pa-python, numpy, Pillow. |
| Python venv | ✅ | `venv/` directory present. |

### Test Suite (`moderation_service/tests/`)

| Test File | Status | Notes |
|-----------|--------|-------|
| `conftest.py` | ✅ | Pytest fixtures for FastAPI test client |
| `smoke_test.py` | ✅ | Basic endpoint smoke tests |
| `test_moderate_image.py` | ✅ | Comprehensive image moderation pipeline tests |
| `test_account_score.py` | ✅ | Account scoring heuristic tests |
| `test_report.py` | ✅ | Report creation + routing tests |
| `test_local_image.py` | ✅ | Local image file testing |
| `requirements-test.txt` | ✅ | Test dependencies |

### Moderation Pipeline Compliance

| Pipeline Step | Spec Requirement | Status |
|---------------|-----------------|--------|
| Step 1: NudeNet | Explicit >60% → blocked, halt. 18-60% or suggestive → `sensitive_content`. | ✅ |
| Step 2: c2pa | Manifest found → `disclosed_ai_content`. Never halt. | ✅ |
| Step 3: Full-image deepfake | `prithivMLmods/deepfake-detector-model-v1`. Fake >65% → `ai_generated_image`. | ✅ |
| Step 4: Face-level deepfake | YOLOv8n-face (conf 0.25). Keypoints → affine-warp → crop 20% margin. Max(full, face). | ✅ |
| Step 5: Final verdict | Return `{ status, labels[], deepfake_confidence, disclosed_ai_content }`. Write to Post. | ✅ |
| Sequential early-exit | NudeNet blocked → halt before c2pa/deepfake. | ✅ |
| CPU enforcement | `device="cpu"` on all model loads. | ✅ |
| Debug prints | `print()` at each pipeline phase. | ✅ |

**Role 3 Summary: ~90% complete — all pipeline logic implemented and tested. Only gap is `db.py` uses stubs instead of live Supabase connection.**

---

## AI Orchestrator (`ai-orchestrator/`)

| Item | Status | Notes |
|------|--------|-------|
| `app.py` — FastAPI app | ⚠️ | **Stub/mock only.** Single endpoint `POST /api/v1/analyze` that sleeps 2s and returns `{ is_fake: false, confidence: 0.94, reasoning: "..." }`. No real AI inference. |
| `config.py` — Settings | ✅ | Pydantic-based config with `FASTAPI_PORT`, `NETWORK_RPC_URL`, `CONTRACT_ADDRESS`, `TRUST_SCORE_THRESHOLD`. Validates Ethereum address format. |
| `.env.example` | ✅ | Config template present. |
| `requirements.txt` | ✅ | fastapi, uvicorn, pydantic-settings. |
| Integration with moderation_service | ❌ | Orchestrator does not call moderation_service or text_service. Post controller calls orchestrator directly for media analysis. |

**AI Orchestrator Summary: ~20% complete — config is solid, but the core logic is mocked.**

---

## Cross-Role API Contract

| Contract | Status | Notes |
|----------|--------|-------|
| `Role 1 → Role 2: POST /analyze/text` | ❌ | Role 2 service doesn't exist. Backend's `postController.js` calls the AI orchestrator instead (`/api/v1/analyze`), not the text service. |
| `Role 1 → Role 3: POST /moderate/image` | ⚠️ | Moderation service endpoint fully built & tested. Backend doesn't call it directly — instead calls the AI orchestrator. Integration not wired. |
| `Role 1 → Role 3: POST /moderate/account-score` | ⚠️ | Moderation service endpoint fully built & tested. Backend doesn't call it. |
| `Any → Role 3: POST /report` | ⚠️ | Moderation service endpoint fully built & tested. No frontend or backend caller yet. |

---

## Extra Features (Beyond Spec)

| Feature | Status | Notes |
|---------|--------|-------|
| Google OAuth login | ✅ | Via Supabase Auth |
| Notification system | ✅ | Like, comment, follow, repost triggers with read/unread |
| Hashtag extraction + trending | ✅ | Auto-extract `#tags` from posts, aggregate for trending |
| Impression tracking | ✅ | IntersectionObserver + Supabase RPC |
| News feed widget | ✅ | Cascading API (Currents → NewsData → mock fallback) with caching |
| Dark/light theme | ✅ | ThemeContext + ThemeToggler |
| $SNTL ERC20 token economy | ✅ | Airdrop, mint/burn on verdicts, trust scores |
| Gasless relayer | ✅ | Backend signs transactions on behalf of users |
| Test images | ✅ | Real + AI-generated test images in `images/` directory |

---

## Overall Progress Summary

| Role | Completion | Key Gaps |
|------|-----------|----------|
| **Role 1 — Frontend** | **~80%** | Missing: Turnstile, nsfwjs, IPFS upload. Stubs for Bookmarks/Chat/Studio/Premium. |
| **Role 1 — Backend** | **~75%** | Missing: Turnstile verification, Upstash rate limiting, IPFS upload, wiring to Role 2/3 services. |
| **Role 1 — Web3** | **~90%** | Contract deployed, relayer functional, wallet integration works. Deviation from spec (richer than PostAnchor). |
| **Role 2 — Text Analysis** | **0%** | Entire service unbuilt. |
| **Role 3 — Moderation** | **~90%** | All pipeline logic implemented + tested. DB layer uses stubs. |
| **AI Orchestrator** | **~20%** | Config ready, app is mocked. |
| **Cross-Role Integration** | **~10%** | Contracts defined, endpoints built on Role 3 side, but not wired from Role 1. |
| **Database Schema** | **~70%** | Working schema with extras, but missing spec fields (spam_score, status, visibility, image_labels, etc.) |

---

## 0. Shared Data Model (all roles read/write this)

```
Account { id, wallet_address, username, bio, created_at,
          follower_count, following_count, spam_score,
          status: active | flagged | suspended }

Post    { id, account_id, text, media_urls[], created_at,
          ai_text_label, ai_text_confidence,
          image_moderation_status, image_labels[],
          deepfake_confidence, deepfake_model_version,
          visibility: public | labeled | blocked }

Follow  { follower_id, followee_id, created_at }

Report  { id, target_type: account|post, target_id,
          reason: spam|nudity|18+|misleading,
          reporter_id, status: open|reviewed|actioned, created_at }
```

Postgres for all four tables. Every role reads/writes against this schema —
do not invent a parallel schema per role.

**SQL change (this update):** add `deepfake_confidence FLOAT` and
`deepfake_model_version TEXT` columns to `posts`. `deepfake_model_version`
records which local ONNX model produced the verdict (e.g.
`"swinv2-haywoodsloan-v1"`) — useful while the detector model is being
swapped/tested locally. Write a migration script alongside the existing
`schema_update_v2.sql` rather than editing prior migrations in place.

## Model Serving: Local ONNX Convention (Role 2 & Role 3)

All ML models are converted to ONNX **once**, offline, and saved locally.
No service downloads a model from the Hugging Face Hub (or anywhere else)
at request time — conversion is a one-time setup step; inference loads only
the local `.onnx` file via `onnxruntime`.

```
models/
  ai_text_detector/        # Role 2 — desklib/ai-text-detector-v1.01
    model.onnx
    tokenizer/              # tokenizer files copied alongside, not converted
  nsfw_nudenet/             # Role 3 — NudeNet v3 (ships ONNX already)
    detector.onnx
  swinv2_deepfake/          # Role 3 — haywoodsloan/ai-image-detector-deploy
    model.onnx
    preprocessor_config.json
```

Conversion (one time, per model):
1. Download the model from Hugging Face once, into a local cache.
2. Export to ONNX (`torch.onnx.export` or `optimum-cli export onnx`), with
   dynamic axes for batch size and sequence length/image size.
3. Save the `.onnx` file (plus tokenizer/preprocessor config it needs) under
   the matching `models/<name>/` folder above.
4. Every service loads with `onnxruntime.InferenceSession(<local_path>,
   providers=["CPUExecutionProvider"])` — never `from_pretrained(...)` at
   request time.

New deliverable: `scripts/convert_to_onnx.py` — single script, model name as
a CLI arg, handles all conversions above. Its own requirements (`torch`,
`transformers`, `onnx`, `optimum`) are separate from each service's runtime
`requirements.txt`, which only needs `onnxruntime` plus whatever's needed
for pre/post-processing.

---

## ROLE 1 — Frontend, Backend, Web3

### Tech stack
- Next.js 14, App Router, TypeScript, Tailwind
- Wallet auth: wagmi + RainbowKit, Sign-In With Ethereum (SIWE) for sessions
- API/backend: Next.js API routes as BFF, Postgres (Supabase or Neon)
- Bot protection: Cloudflare Turnstile on post-creation and account-creation
- Rate limiting: Upstash Redis, 5 posts/minute per IP and per account
- Media storage: IPFS (web3.storage or Pinata); store returned CID in `media_urls`
- On-chain anchor: minimal Solidity contract on a low-cost L2 (Base or Polygon)
  that emits `PostAnchored(postId, contentHash)`; `contentHash` = keccak256(text + media CID)

### Execution pipeline
1. Wallet connect → SIWE signature → session issued.
2. Post submission: verify Turnstile token → check Upstash rate limit (429 if
   exceeded) → run `nsfwjs` client-side, block obvious explicit uploads before
   upload → upload media to IPFS → insert `Post` row with `visibility: pending`
   → dispatch parallel async calls to Role 2 `/analyze/text` and Role 3
   `/moderate/image`, `/moderate/account-score` → write returned fields back
   onto the `Post`/`Account` row → anchor `contentHash` on-chain → set
   `visibility` from combined verdict (`blocked` if either role blocks,
   `labeled` if either role labels, else `public`).
3. Feed query excludes `visibility = blocked`; `labeled` posts render with a
   warning banner client-side.

### Deliverables
- `app/page.tsx` — feed, composer, wallet connect, Turnstile + nsfwjs pre-check
- `app/api/posts/route.ts` — Turnstile verify → Upstash check → IPFS upload →
  DB write → dispatch to Role 2/Role 3 → on-chain anchor → visibility update
- `app/api/auth/siwe/route.ts` — SIWE verification, session issuance
- `contracts/PostAnchor.sol` — event-emitting anchor contract
- `lib/db/schema.ts` — Postgres schema (Section 0)
- `.env.example`

---

## ROLE 2 — Text Analysis (AI-generated / Misleading / Fact-Check)

### Tech stack
- AI-generated text detection: `desklib/ai-text-detector-v1.01`
  (DeBERTa-v3-large fine-tune)
- Misleading-content pipeline: claim extraction → hybrid retrieval (BM25 +
  BGE-base embeddings + FAISS index over a fact-check/news evidence corpus) →
  LLM verdict step over retrieved evidence
- Serving: FastAPI, CPU inference (`device="cpu"` explicit on model load)

### Execution pipeline
`POST /analyze/text { post_id, text }`
1. Run `desklib/ai-text-detector-v1.01` → `ai_text_confidence`.
   `>95%` → `ai_text_label = ai_generated` (advisory label; do not auto-action
   the account — write the label and stop).
2. Extract 1–3 factual claims from `text`.
3. Hybrid retrieval (BM25 + BGE + FAISS) over the evidence corpus, per claim.
4. LLM verdict step using retrieved evidence as context →
   `misleading_label: verified | disputed | unverified` + source list.
5. Return `{ ai_text_label, ai_text_confidence, misleading_label, sources[] }`.
6. If `misleading_label = disputed`, also call Role 3's `POST /report` with
   `reason: misleading`, `reporter_id: system`.

### Deliverables
- `text_service/app.py` — FastAPI app, `/analyze/text`
- `text_service/detector.py` — AI-text detector wrapper
- `text_service/factcheck.py` — claim extraction + hybrid retrieval + verdict
- `text_service/requirements.txt`
- `python -m venv venv && pip install -r requirements.txt`

---

## ROLE 3 — Spam, Abuse & Visual Moderation

### Tech stack
- NSFW/explicit detection: NudeNet v3 (ONNX Runtime, CPU), local ONNX file
  at `models/nsfw_nudenet/detector.onnx`. Client-side pre-check with
  `nsfwjs` happens earlier, in Role 1, before upload — this is the
  authoritative server-side check.
- Provenance / AI-watermark detection: `c2pa-python`, read-only — checks for
  an embedded C2PA manifest (e.g. Content Credentials left by AI generation
  tools).
- AI-generated / deepfake image detection: `haywoodsloan/ai-image-detector-deploy`
  (SwinV2 image classifier), converted to ONNX, local file at
  `models/swinv2_deepfake/model.onnx`. Runs on the **whole image only** —
  no face detection, no cropping. This **replaces** the previous
  `prithivMLmods/deepfake-detector-model-v1` (SigLIP2) and the entire
  `yolov8n-face.pt` + OpenCV `cv2.warpAffine` fallback path, which is
  removed — the new model doesn't need face-cropped input.
- Spam scoring: hand-written weighted heuristic (no external model for v1)
- Serving: FastAPI, CPU, `device="cpu"` / `CPUExecutionProvider` explicit on
  every model load, debug `print()` at each pipeline phase. Everything runs
  on `localhost` — see the Phase 1 note at the top of this file.

Full pipeline order across roles: `nsfwjs` (client-side pre-check, Role 1)
→ NudeNet (server-side, this service) → C2PA → SwinV2.

### Execution pipeline — `POST /moderate/image { post_id, image_url }`
Sequential, early-exit. Fixed order: **NudeNet → C2PA → SwinV2**.
1. **NudeNet** on the image. Explicit-anatomy label confidence `>60%` →
   `status: blocked`, halt. Confidence 18–60% or suggestive-only labels →
   `labels += "sensitive_content"`, continue.
2. **c2pa.Reader** on the image. Manifest found → `labels += "disclosed_ai_content"`.
   Continue regardless of result — never halt or block on this step.
3. **SwinV2** (`haywoodsloan/ai-image-detector-deploy`) on the **full,
   uncropped image** — single pass, no face detection, no YOLO, no
   affine-warp. `Fake` confidence `>65%` → `labels += "ai_generated_image"`,
   record `deepfake_confidence` directly from this pass.
4. Return `{ status: allowed|blocked, labels[], deepfake_confidence,
   deepfake_model_version: "swinv2-haywoodsloan-v1", disclosed_ai_content: bool }`.
   Write these fields onto the `Post` row.

### Execution pipeline — `POST /moderate/account-score { account_id }`
Runs on every new follow event and as a daily batch job over all accounts.
1. Compute weighted signals:
   - `follow_spam_ratio` = % of followed accounts with `status != active`
   - `age_velocity` = post count / account age in days (normalized)
   - `duplicate_ratio` = near-duplicate posts via embedding similarity
   - `report_count` = open reports against this account
2. `spam_score = 0.4*follow_spam_ratio + 0.25*age_velocity + 0.2*duplicate_ratio + 0.15*report_count_normalized`
3. Bands: `score < 40 → clean`, `40–75 → flagged_for_review`, `> 75 → auto_suspend`.
4. `auto_suspend` sets `Account.status = suspended`; suspended accounts' posts
   are excluded from all feed queries.
5. Return `{ score, band, signals: {...} }`.

### Execution pipeline — `POST /report { target_type, target_id, reason, reporter_id }`
1. Insert `Report` row, `status: open`.
2. `reason = misleading` → forward payload to Role 2's service.
3. Any other reason → increment `target`'s open report count → trigger
   `account-score` recompute for the associated account.
4. Return `{ report_id, routed_to: "role2" | "role3" }`.

### Deliverables
- `moderation_service/app.py` — FastAPI app: `/moderate/image`,
  `/moderate/account-score`, `/report`
- `moderation_service/nsfw.py` — NudeNet wrapper, loads
  `models/nsfw_nudenet/detector.onnx`
- `moderation_service/deepfake.py` — SwinV2 (`haywoodsloan/ai-image-detector-deploy`)
  wrapper, loads `models/swinv2_deepfake/model.onnx`, whole-image inference
  only. **Delete** all YOLOv8n-face / affine-warp / face-crop code from
  this file — the new model doesn't take a separate face pass.
- `moderation_service/provenance.py` — c2pa-python wrapper
- `moderation_service/spam_score.py` — heuristic scoring logic
- `moderation_service/reports.py` — report queue + routing
- `moderation_service/requirements.txt` — must include `onnxruntime`,
  `c2pa-python`, `opencv-python-headless` (image IO/resizing only), `numpy`,
  `Pillow`. **Remove** `ultralytics` and `transformers` — no longer needed
  at runtime (transformers is only needed once, in the conversion script).
- `python -m venv venv && pip install -r requirements.txt`
- `scripts/convert_to_onnx.py` (shared with Role 2) — one-time conversion of
  NudeNet/SwinV2 into the local `models/` folder; see the Model Serving
  section above.

---

## Cross-Role API Contract

```
Role 1 → Role 2:  POST /analyze/text        { post_id, text }
               →  { ai_text_label, ai_text_confidence, misleading_label, sources[] }

Role 1 → Role 3:  POST /moderate/image       { post_id, image_url }
               →  { status, labels[], deepfake_confidence, deepfake_model_version, disclosed_ai_content }

Role 1 → Role 3:  POST /moderate/account-score  { account_id }
               →  { score, band, signals }

Any → Role 3:     POST /report               { target_type, target_id, reason, reporter_id }
               →  { report_id, routed_to }
```