# AI Orchestrator Agent Rules

## Tech Stack
- Python 3.10+, FastAPI, Uvicorn
- AI Framework: LangChain
- External APIs: Hugging Face Inference API / `requests`

## Model & Pipeline Guidelines
- When building out the ensemble detection pipeline, lean into robust supervised and unsupervised learning techniques to classify synthetic artifacts and detect anomalies in the media streams. 
- Do not attempt to download or run multi-gigabyte `.pt` or `.safetensors` files locally. Default to constructing API wrappers around pre-trained models using `requests`.
- The final output of the main verification endpoint must strictly be a JSON object: `{"is_fake": boolean, "confidence": float, "reasoning": string}`.

## Python Standards
- Always use `async def` for FastAPI endpoints to prevent blocking the event loop.
- Load all sensitive keys (Hugging Face tokens, etc.) strictly from a `.env` file using `python-dotenv`. Never hardcode keys.