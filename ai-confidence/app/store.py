import json
import sqlite3
from typing import Any, Dict, Optional

class Store:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init()

    def _conn(self):
        return sqlite3.connect(self.db_path)

    def _init(self):
        with self._conn() as cx:
            cx.execute("""
                CREATE TABLE IF NOT EXISTS runs (
                    run_id TEXT PRIMARY KEY,
                    parent_run_id TEXT,
                    template TEXT,
                    environment TEXT,
                    status TEXT,
                    created_at TEXT,
                    updated_at TEXT,
                    request_json TEXT,
                    answer_text TEXT,
                    confidence_json TEXT
                )
            """)
            cx.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT,
                    type TEXT,
                    created_at TEXT,
                    payload_json TEXT
                )
            """)

    def upsert_run(self, run_id: str, fields: Dict[str, Any]):
        cols = list(fields.keys())
        vals = [fields[c] for c in cols]
        placeholders = ",".join(["?"] * len(cols))
        assignments = ",".join([f"{c}=excluded.{c}" for c in cols])
        
        with self._conn() as cx:
            cx.execute(
                f"""
                INSERT INTO runs (run_id, {",".join(cols)})
                VALUES (?, {placeholders})
                ON CONFLICT(run_id) DO UPDATE SET {assignments}
                """,
                [run_id] + vals
            )

    def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        with self._conn() as cx:
            cur = cx.execute("SELECT * FROM runs WHERE run_id=?", [run_id])
            row = cur.fetchone()
            if not row:
                return None
            
            cols = [d[0] for d in cur.description]
            r = dict(zip(cols, row))
            
            # Deserialize JSON fields
            for k in ["request_json", "confidence_json"]:
                if r.get(k):
                    try:
                        r[k] = json.loads(r[k])
                    except:
                        pass
            return r

    def add_event(self, run_id: str, typ: str, created_at: str, payload: Dict[str, Any]):
        with self._conn() as cx:
            cx.execute(
                "INSERT INTO events (run_id, type, created_at, payload_json) VALUES (?,?,?,?)",
                [run_id, typ, created_at, json.dumps(payload)]
            )
