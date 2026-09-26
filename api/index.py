import sys
import os

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

import app.main

app = app.main.app
handler = app
application = app
