# Sentinel — Full Build Spec (Web3 Twitter/X-style Platform)

System Role: You are an expert full-stack and ML systems engineer. Build exactly
what is specified below, for the role indicated. Do not add features, models,
or libraries not listed here.

## 0. Shared Data Model (all roles read/write this)

```
Account { id, wallet_address, username, bio, created_at,
          follower_count, following_count, spam_score,
          status: active | flagged | suspended }

Post    { id, account_id, text, media_urls[], created_at,
          ai_text_label, ai_text_confidence,
          image_moderation_status, image_labels[],
          visibility: public | labeled | blocked }

Follow  { follower_id, followee_id, created_at }

Report  { id, target_type: account|post, target_id,
          reason: spam|nudity|18+|misleading,
          reporter_id, status: open|reviewed|actioned, created_at }
```

Postgres for all four tables. Every role reads/writes against this schema —
do not invent a parallel schema per role.

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
- NSFW/explicit detection: NudeNet v3 (ONNX Runtime, CPU)
- AI-generated / deepfake image detection: `prithivMLmods/deepfake-detector-model-v1`
  (SigLIP2 image classifier)
- Facial deepfake fallback: `yolov8n-face.pt` (confidence threshold 0.25) +
  OpenCV `cv2.warpAffine`
- Provenance: `c2pa-python`, read-only
- Spam scoring: hand-written weighted heuristic (no external model for v1)
- Serving: FastAPI, CPU, `device="cpu"` explicit on every model load, debug
  `print()` at each pipeline phase

### Execution pipeline — `POST /moderate/image { post_id, image_url }`
Sequential, early-exit:
1. **NudeNet** on the image. Explicit-anatomy label confidence `>60%` →
   `status: blocked`, halt. Confidence 18–60% or suggestive-only labels →
   `labels += "sensitive_content"`, continue.
2. **c2pa.Reader** on the image. Manifest found → `labels += "disclosed_ai_content"`.
   Continue regardless of result — never halt or block on this step.
3. **prithivMLmods/deepfake-detector-model-v1** on the full image. `Fake`
   confidence `>65%` → `labels += "ai_generated_image"`, record
   `deepfake_confidence`.
4. **YOLOv8n-face** (conf 0.25) on the image. If keypoints found: affine-warp
   to level eyes, crop with 20% margin. If keypoints fail: fall back to
   standard box crop. Run cropped face(s) through the same deepfake model;
   take the max confidence between full-image and face-level results as the
   final `deepfake_confidence`.
5. Return `{ status: allowed|blocked, labels[], deepfake_confidence, disclosed_ai_content: bool }`.
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
- `moderation_service/nsfw.py` — NudeNet wrapper
- `moderation_service/deepfake.py` — SigLIP2 model + YOLOv8n-face crop logic
- `moderation_service/provenance.py` — c2pa-python wrapper
- `moderation_service/spam_score.py` — heuristic scoring logic
- `moderation_service/reports.py` — report queue + routing
- `moderation_service/requirements.txt` — must include `onnxruntime`,
  `transformers`, `ultralytics`, `opencv-python-headless`, `c2pa-python`
- `python -m venv venv && pip install -r requirements.txt`

---

## Cross-Role API Contract

```
Role 1 → Role 2:  POST /analyze/text        { post_id, text }
               →  { ai_text_label, ai_text_confidence, misleading_label, sources[] }

Role 1 → Role 3:  POST /moderate/image       { post_id, image_url }
               →  { status, labels[], deepfake_confidence, disclosed_ai_content }

Role 1 → Role 3:  POST /moderate/account-score  { account_id }
               →  { score, band, signals }

Any → Role 3:     POST /report               { target_type, target_id, reason, reporter_id }
               →  { report_id, routed_to }
```