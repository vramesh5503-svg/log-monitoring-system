"""
Development server launcher.

Run with:
    python run.py

Or directly with uvicorn:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host     = "0.0.0.0",
        port     = 8000,
        reload   = True,          # auto-reload on file changes (dev only)
        log_level= "info",
    )
