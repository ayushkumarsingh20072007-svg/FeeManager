import os
import sys
import shutil

# Add backend directory to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Prepare writable SQLite database in /tmp for Vercel Serverless environment
tmp_db = "/tmp/agent40.db"
if os.environ.get("VERCEL"):
    if not os.path.exists(tmp_db):
        source_db = os.path.join(BACKEND_DIR, "agent40.db")
        if not os.path.exists(source_db):
            source_db = os.path.join(BASE_DIR, "agent40.db")
        if os.path.exists(source_db):
            try:
                shutil.copyfile(source_db, tmp_db)
            except Exception as err:
                print(f"[Vercel] Warning: could not copy pre-seeded database: {err}")
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp_db}"

from app.main import app

# ASGI callable for Vercel
handler = app
