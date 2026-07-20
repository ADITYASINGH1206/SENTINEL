from fastapi import FastAPI, File, UploadFile
import time

app = FastAPI(title="Sentinel AI Orchestrator")

@app.post("/verify-media")
async def verify_media(file: UploadFile = File(...)):
    # Simulate a quick processing delay
    time.sleep(1.5)
    
    return {
        "is_fake": False,
        "confidence": 0.95,
        "reasoning": "Metadata authentic"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
