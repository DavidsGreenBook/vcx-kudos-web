import sys
import os

# Ensure UTF-8 output on Windows
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import uvicorn

if __name__ == "__main__":
    # Ensure current directory is in sys.path
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    print("=" * 60)
    print("Viettel CX - Peer Recognition Landing Page Server")
    print("URL: http://127.0.0.1:8000")
    print("Swagger Docs: http://127.0.0.1:8000/docs")
    print("=" * 60)
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)

