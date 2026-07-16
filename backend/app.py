import os
from flask import Flask, jsonify, send_from_directory
from flask_socketio import SocketIO

import models
from sockets import register_socket_handlers

FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path="")
app.config["SECRET_KEY"] = os.environ.get("RELAY_SECRET_KEY", "relay-local-dev-only")

socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

register_socket_handlers(socketio)

models.init_db()

@app.route("/api/health")
def health():
    return jsonify({"status": "online", "service": "relay-backend"})

@app.route("/api/peers")
def peers():
    return jsonify({"peers": [dict(u) for u in models.all_users()]})

@app.route("/api/incidents")
def get_incidents():
    return jsonify({"incidents": [dict(i) for i in models.all_incidents()]})

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path and os.path.exists(os.path.join(FRONTEND_DIST, path)):
        return send_from_directory(FRONTEND_DIST, path)
    return send_from_directory(FRONTEND_DIST, "index.html")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Relay backend starting on http://0.0.0.0:{port}")
    socketio.run(app, host="0.0.0.0", port=port)
