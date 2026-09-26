import sys
import os
import traceback

# Resolve file and directory paths
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(root_dir, "backend")

# Ensure all relevant paths are on sys.path
for p in [backend_dir, root_dir, current_dir]:
    if p and os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

# Load environment variables if available
try:
    from dotenv import load_dotenv
    for env_path in [os.path.join(root_dir, ".env"), os.path.join(backend_dir, ".env")]:
        if os.path.exists(env_path):
            load_dotenv(env_path)
except ImportError:
    pass

try:
    import app.main
    app = app.main.app
except Exception as e:
    err_tb = traceback.format_exc()
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    app = FastAPI(title="LegalLens AI - Deployment Diagnostic")

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    async def startup_diagnostic(full_path: str):
        return JSONResponse(
            status_code=500,
            content={
                "status": "initialization_failed",
                "error": str(e),
                "path": full_path,
                "traceback": err_tb.splitlines()[-15:],
            },
        )

handler = app
application = app
