import sqlite3
import time
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), "relay.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    username      TEXT PRIMARY KEY,
    device_icon   TEXT NOT NULL,
    status        TEXT NOT NULL,            -- 'online' | 'offline'
    last_seen     REAL NOT NULL,
    sid           TEXT,
    crisis_status TEXT DEFAULT 'unknown',
    status_note   TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    kind        TEXT NOT NULL,            -- 'direct' | 'channel'
    from_user   TEXT NOT NULL,
    to_user     TEXT,                     -- NULL for channel messages
    text        TEXT NOT NULL,
    timestamp   REAL NOT NULL,
    delivered   INTEGER DEFAULT 0         -- 0 = queued, 1 = delivered
);

CREATE TABLE IF NOT EXISTS broadcasts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user   TEXT NOT NULL,
    text        TEXT NOT NULL,
    timestamp   REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS board_posts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user   TEXT NOT NULL,
    type        TEXT NOT NULL,            -- 'have' | 'need'
    item        TEXT NOT NULL,
    timestamp   REAL NOT NULL,
    resolved    INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS incident_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user   TEXT NOT NULL,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    severity    TEXT NOT NULL DEFAULT 'LOW',
    timestamp   REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS timers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    created_by  TEXT NOT NULL,
    label       TEXT NOT NULL,
    ends_at     REAL NOT NULL,
    created_at  REAL NOT NULL,
    expired     INTEGER DEFAULT 0
);
"""

@contextmanager
def get_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    try:
        yield db
        db.commit()
    finally:
        db.close()

def init_db():
    with get_db() as db:
        db.executescript(SCHEMA)

def upsert_user(username, device_icon, status, sid):
    with get_db() as db:
        db.execute(
            """INSERT INTO users (username, device_icon, status, last_seen, sid)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(username) DO UPDATE SET
                 device_icon=excluded.device_icon,
                 status=excluded.status,
                 last_seen=excluded.last_seen,
                 sid=excluded.sid""",
            (username, device_icon, status, time.time(), sid),
        )

def set_status(username, status, sid=None):
    with get_db() as db:
        if sid is not None:
            db.execute(
                "UPDATE users SET status=?, last_seen=?, sid=? WHERE username=?",
                (status, time.time(), sid, username),
            )
        else:
            db.execute(
                "UPDATE users SET status=?, last_seen=? WHERE username=?",
                (status, time.time(), username),
            )

def update_crisis_status(username, crisis_status, status_note):
    with get_db() as db:
        db.execute(
            "UPDATE users SET crisis_status=?, status_note=?, last_seen=? WHERE username=?",
            (crisis_status, status_note, time.time(), username),
        )

def get_user_by_sid(sid):
    with get_db() as db:
        row = db.execute("SELECT * FROM users WHERE sid=?", (sid,)).fetchone()
        return dict(row) if row else None

def get_user(username):
    with get_db() as db:
        row = db.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
        return dict(row) if row else None

def all_users():
    with get_db() as db:
        rows = db.execute("SELECT username, device_icon, status, last_seen, crisis_status, status_note FROM users ORDER BY username").fetchall()
        return [dict(r) for r in rows]

def save_message(kind, from_user, to_user, text, timestamp, delivered):
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO messages (kind, from_user, to_user, text, timestamp, delivered) VALUES (?, ?, ?, ?, ?, ?)",
            (kind, from_user, to_user, text, timestamp, 1 if delivered else 0),
        )
        return cur.lastrowid

def queued_messages_for(username):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM messages WHERE kind='direct' AND to_user=? AND delivered=0 ORDER BY timestamp",
            (username,),
        ).fetchall()
        return [dict(r) for r in rows]

def mark_delivered(message_ids):
    if not message_ids:
        return
    with get_db() as db:
        db.executemany("UPDATE messages SET delivered=1 WHERE id=?", [(i,) for i in message_ids])

def recent_channel_messages(limit=50):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM messages WHERE kind='channel' ORDER BY timestamp DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in reversed(rows)]

def recent_direct_messages(user_a, user_b, limit=50):
    with get_db() as db:
        rows = db.execute(
            """SELECT * FROM messages WHERE kind='direct'
               AND ((from_user=? AND to_user=?) OR (from_user=? AND to_user=?))
               ORDER BY timestamp DESC LIMIT ?""",
            (user_a, user_b, user_b, user_a, limit),
        ).fetchall()
        return [dict(r) for r in reversed(rows)]

def save_broadcast(from_user, text, timestamp):
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO broadcasts (from_user, text, timestamp) VALUES (?, ?, ?)",
            (from_user, text, timestamp),
        )
        return cur.lastrowid

def recent_broadcasts(limit=10):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM broadcasts ORDER BY timestamp DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in reversed(rows)]

def save_board_post(from_user, post_type, item, timestamp):
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO board_posts (from_user, type, item, timestamp) VALUES (?, ?, ?, ?)",
            (from_user, post_type, item, timestamp),
        )
        return cur.lastrowid

def all_board_posts():
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM board_posts WHERE resolved=0 ORDER BY timestamp DESC"
        ).fetchall()
        return [dict(r) for r in rows]

def resolve_board_post(post_id):
    with get_db() as db:
        db.execute("UPDATE board_posts SET resolved=1 WHERE id=?", (post_id,))


def add_incident(from_user, title, body, severity, timestamp):
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO incident_log (from_user, title, body, severity, timestamp) VALUES (?, ?, ?, ?, ?)",
            (from_user, title, body, severity, timestamp),
        )
        return cur.lastrowid


def all_incidents(limit=200):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM incident_log ORDER BY timestamp DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in reversed(rows)]


def create_timer(created_by, label, ends_at, created_at):
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO timers (created_by, label, ends_at, created_at) VALUES (?, ?, ?, ?)",
            (created_by, label, ends_at, created_at),
        )
        return cur.lastrowid


def active_timers():
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM timers WHERE expired=0 ORDER BY ends_at ASC"
        ).fetchall()
        return [dict(r) for r in rows]


def expire_timer(timer_id):
    with get_db() as db:
        db.execute("UPDATE timers SET expired=1 WHERE id=?", (timer_id,))


def delete_timer(timer_id):
    with get_db() as db:
        db.execute("DELETE FROM timers WHERE id=?", (timer_id,))

