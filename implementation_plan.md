# Role 3 Rework + nsfwjs + Role 1↔3 Wiring

## Goal

Bring Role 3 (Moderation Service) up to the updated spec, add the `nsfwjs` client-side pre-check in the frontend, wire Role 1's backend to call Role 3's endpoints, and add the missing DB schema columns — **without modifying any existing Role 1 or Role 2 logic**.

> [!IMPORTANT]
> **Scope boundary:** We only touch Role 3 files, add new integration code, and add `nsfwjs` to the frontend composer. We do NOT rewrite `postController.js`, `PostComposer.jsx`, or any other existing Role 1 files — we add to them minimally to wire in the new services.

---

## Open Questions

> [!IMPORTANT]
> **Q1 — SwinV2 ONNX model availability:** The spec says models should be pre-converted and placed in `models/swinv2_deepfake/model.onnx`. Do you already have this ONNX file, or should I include the conversion script (`scripts/convert_to_onnx.py`) that downloads `haywoodsloan/ai-image-detector-deploy` from HuggingFace and exports it to ONNX? This requires `torch`, `transformers`, and `optimum` as one-time-only dependencies.

> [!IMPORTANT]
> **Q2 — NudeNet ONNX path:** NudeNet v3 ships its own bundled ONNX model. The spec mentions `models/nsfw_nudenet/detector.onnx` but the current `nsfw.py` uses `NudeDetector()` which auto-locates its bundled model. Should I keep the current approach (simpler, already working) or rewrite to load from a custom path?

> [!WARNING]
> **Q3 — Schema migration:** The plan adds columns to `posts` and creates a `reports` table. These will be run via a new `schema_update_v3.sql` migration script. Should I auto-run this against your Supabase, or just create the SQL file for you to run manually in the Supabase SQL Editor?

---

## Proposed Changes

### Component 1 — DB Schema Migration

#### [NEW] [schema_update_v3.sql](file:///E:/SENTINEL_HACKATHON/backend/supabase/schema_update_v3.sql)

Add missing columns to `posts` table and create the `reports` table:

```sql
-- Add moderation fields to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_moderation_status TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_labels TEXT[] DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS deepfake_confidence FLOAT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS deepfake_model_version TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    target_type TEXT NOT NULL CHECK (target_type IN ('account', 'post')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'nudity', '18+', 'misleading')),
    reporter_id TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'actioned')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Component 2 — Moderation Service: Deepfake Rewrite

#### [MODIFY] [deepfake.py](file:///E:/SENTINEL_HACKATHON/moderation_service/deepfake.py)

**Complete rewrite.** Delete all SigLIP2, YOLOv8n-face, affine-warp, and face-crop code. Replace with:

- Load `models/swinv2_deepfake/model.onnx` via `onnxruntime.InferenceSession` (lazy-loaded, CPU)
- Load `preprocessor_config.json` for image resize/normalize params
- Single-pass whole-image classification (no face detection)
- Return `{ deepfake_confidence, deepfake_model_version: "swinv2-haywoodsloan-v1", labels }` 
- Threshold: `Fake > 65%` → `labels += "ai_generated_image"`

#### [MODIFY] [app.py](file:///E:/SENTINEL_HACKATHON/moderation_service/app.py)

- Update `ModerateImageResponse` to include `deepfake_model_version: str` field
- Update the pipeline step 3 comment from "Steps 3-4" to "Step 3: SwinV2"
- Pass `deepfake_model_version` through to response

#### [MODIFY] [requirements.txt](file:///E:/SENTINEL_HACKATHON/moderation_service/requirements.txt)

Remove `transformers`, `torch`, `ultralytics`. Final list:
```
fastapi
uvicorn[standard]
python-dotenv
httpx
onnxruntime
nudenet
opencv-python-headless
c2pa-python
numpy
Pillow
supabase
```

(Added `supabase` for the DB layer rewrite below.)

---

### Component 3 — Moderation Service: Live DB Layer

#### [MODIFY] [db.py](file:///E:/SENTINEL_HACKATHON/moderation_service/db.py)

Replace stub implementation with real Supabase calls:

- Initialize `supabase` client from env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- `update_post()` → `supabase.table("posts").update(fields).eq("id", post_id).execute()`
- `update_account()` → `supabase.table("users").update(fields).eq("id", account_id).execute()`
- `get_account()` → `supabase.table("users").select("*").eq("id", account_id).single().execute()`
- `insert_report()` → `supabase.table("reports").insert(data).execute()`
- `count_open_reports()` → count query on `reports` table
- All other functions similarly converted
- Keep print-based logging alongside real queries

---

### Component 4 — ONNX Conversion Script

#### [NEW] [convert_to_onnx.py](file:///E:/SENTINEL_HACKATHON/scripts/convert_to_onnx.py)

One-time-use script. CLI args: `--model swinv2_deepfake` (or `nsfw_nudenet`).

For `swinv2_deepfake`:
1. `pip install torch transformers optimum onnx` (documented, not in service requirements)
2. Load `haywoodsloan/ai-image-detector-deploy` via `AutoModelForImageClassification`
3. Export via `optimum-cli export onnx` or programmatic export
4. Save to `models/swinv2_deepfake/model.onnx` + `preprocessor_config.json`

---

### Component 5 — nsfwjs Client-Side Pre-Check (Frontend)

#### [MODIFY] [PostComposer.jsx](file:///E:/SENTINEL_HACKATHON/frontend/src/components/PostComposer.jsx)

Minimal changes to existing file — add pre-upload NSFW check:

- Import `nsfwjs` (loaded from CDN or npm)
- When user selects an image file, run `nsfwjs.load()` → `model.classify(img)` on a canvas
- If any explicit class (`Porn`, `Hentai`) confidence > 50%, show an error toast and **block the upload** (don't submit the form)
- If `Sexy` confidence > 70%, show a warning but allow submission
- The model loads once (lazy-loaded on first file selection), cached in a ref

> [!NOTE]
> This is a **client-side gate only** — the authoritative check remains NudeNet on the server. nsfwjs is a lightweight pre-check to save bandwidth and give instant feedback.

A new npm dependency needs installing:
```bash
cd frontend && npm install nsfwjs @tensorflow/tfjs
```

---

### Component 6 — Role 1 Backend → Role 3 Wiring

#### [NEW] [moderationService.js](file:///E:/SENTINEL_HACKATHON/backend/services/moderationService.js)

New service file that calls Role 3 endpoints:

```js
// POST to http://localhost:8002/moderate/image
export async function moderateImage(postId, imageUrl) { ... }

// POST to http://localhost:8002/moderate/account-score  
export async function moderateAccountScore(accountId) { ... }

// POST to http://localhost:8002/report
export async function createReport(targetType, targetId, reason, reporterId) { ... }
```

Uses `axios` (already a backend dependency). Falls back gracefully if moderation service is offline.

#### [MODIFY] [postController.js](file:///E:/SENTINEL_HACKATHON/backend/controllers/postController.js)

**Minimal change** — in the async post-response moderation block (lines 40-70), add a call to the moderation service alongside the existing AI orchestrator call:

- After inserting the post, if `req.file` exists, also call `moderateImage(newPost.id, mediaUrl)` 
- This runs non-blocking alongside the existing orchestrator call
- The moderation service writes results directly to the DB via its own Supabase connection

#### [MODIFY] [userController.js](file:///E:/SENTINEL_HACKATHON/backend/controllers/userController.js)

**Minimal change** — in `toggleFollow()`, after inserting a follow, fire-and-forget call to `moderateAccountScore(followingId)`:

```js
// After follow insert, trigger moderation score recompute
moderateAccountScore(followingId).catch(err => 
    console.warn('[Moderation] Account score recompute failed:', err.message)
);
```

---

## Verification Plan

### Automated Tests
```bash
# Existing moderation tests (should still pass with updated deepfake module)
cd moderation_service && pytest tests/ -v

# Manual curl tests for the 3 endpoints
curl -X POST http://localhost:8002/moderate/image -H "Content-Type: application/json" \
  -d '{"post_id":"test-123","image_url":"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/24701-nature-702.jpg/800px-24701-nature-702.jpg"}'
```

### Manual Verification
1. **nsfwjs pre-check**: Select a safe image in the composer — should upload normally. (Testing with explicit images would require NSFW test data.)
2. **End-to-end flow**: Create a post with an image → verify that the moderation service is called → check Supabase `posts` table for updated `image_moderation_status`, `image_labels`, `deepfake_confidence` columns.
3. **Follow → account-score**: Follow a user → verify the moderation service `/moderate/account-score` endpoint was called (visible in moderation service terminal logs).
4. **Schema**: Verify new columns exist in Supabase via the Table Editor.

---

## File Summary

| Action | File | Component |
|--------|------|-----------|
| **NEW** | `backend/supabase/schema_update_v3.sql` | DB Schema |
| **REWRITE** | `moderation_service/deepfake.py` | SwinV2 ONNX deepfake |
| **MODIFY** | `moderation_service/app.py` | Add `deepfake_model_version` to response |
| **REWRITE** | `moderation_service/db.py` | Live Supabase instead of stubs |
| **MODIFY** | `moderation_service/requirements.txt` | Remove torch/transformers/ultralytics, add supabase |
| **NEW** | `scripts/convert_to_onnx.py` | One-time model conversion |
| **MODIFY** | `frontend/src/components/PostComposer.jsx` | nsfwjs client-side gate |
| **NEW** | `backend/services/moderationService.js` | Role 3 API client |
| **MODIFY** | `backend/controllers/postController.js` | Wire in `moderateImage()` call |
| **MODIFY** | `backend/controllers/userController.js` | Wire in `moderateAccountScore()` on follow |
