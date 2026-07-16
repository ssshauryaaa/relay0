import time
from flask_socketio import emit, join_room
import models

def register_socket_handlers(socketio):

    def broadcast_presence():
        users = models.all_users()
        payload = [
            {
                "username": u["username"],
                "deviceIcon": u["device_icon"],
                "status": u["status"],
                "lastSeen": u["last_seen"],
                "crisisStatus": u.get("crisis_status", "unknown"),
                "statusNote": u.get("status_note", ""),
            }
            for u in users
        ]
        socketio.emit("presence:update", payload)

    @socketio.on("connect")
    def handle_connect():
        pass

    @socketio.on("join")
    def handle_join(data):
        from flask import request

        username = (data or {}).get("username", "").strip()
        device_icon = (data or {}).get("deviceIcon", "radio")
        if not username:
            emit("join:error", {"message": "A callsign is required to join the network."})
            return

        existing = models.get_user(username)
        if existing and existing["status"] == "online" and existing["sid"] != request.sid:
            emit("join:error", {"message": "That callsign is already active on the network."})
            return

        models.upsert_user(username, device_icon, "online", request.sid)
        join_room(username)  # private room so we can target this user by username
        join_room("network-channel")

        queued = models.queued_messages_for(username)
        channel_history = models.recent_channel_messages(limit=50)
        broadcasts = models.recent_broadcasts(limit=5)
        board = models.all_board_posts()
        incidents = models.all_incidents()
        timers = models.active_timers()

        emit(
            "join:ack",
            {
                "username": username,
                "deviceIcon": device_icon,
                "channelHistory": channel_history,
                "broadcasts": broadcasts,
                "board": board,
                "incidents": incidents,
                "timers": timers,
            },
        )

        if queued:
            emit(
                "queue:sync",
                {
                    "messages": [
                        {
                            "from": m["from_user"],
                            "to": m["to_user"],
                            "text": m["text"],
                            "timestamp": m["timestamp"],
                        }
                        for m in queued
                    ]
                },
            )
            models.mark_delivered([m["id"] for m in queued])

        broadcast_presence()

    @socketio.on("disconnect")
    def handle_disconnect():
        from flask import request

        user = models.get_user_by_sid(request.sid)
        if user:
            models.set_status(user["username"], "offline")
            broadcast_presence()

    @socketio.on("message:direct")
    def handle_direct_message(data):
        from flask import request

        to_user = (data or {}).get("to", "").strip()
        from_user = (data or {}).get("from", "").strip()
        text = (data or {}).get("text", "").strip()
        timestamp = (data or {}).get("timestamp") or time.time()

        if not (to_user and from_user and text):
            return

        recipient = models.get_user(to_user)
        recipient_online = bool(recipient and recipient["status"] == "online")

        models.save_message("direct", from_user, to_user, text, timestamp, delivered=recipient_online)

        payload = {"from": from_user, "to": to_user, "text": text, "timestamp": timestamp}

        emit("message:direct", payload, room=from_user)

        if recipient_online:
            emit("message:direct", payload, room=to_user)

    @socketio.on("message:channel")
    def handle_channel_message(data):
        from_user = (data or {}).get("from", "").strip()
        text = (data or {}).get("text", "").strip()
        timestamp = (data or {}).get("timestamp") or time.time()

        if not (from_user and text):
            return

        models.save_message("channel", from_user, None, text, timestamp, delivered=True)
        socketio.emit("message:channel", {"from": from_user, "text": text, "timestamp": timestamp}, room="network-channel")

    @socketio.on("broadcast:emergency")
    def handle_broadcast(data):
        from_user = (data or {}).get("from", "").strip()
        text = (data or {}).get("text", "").strip()
        timestamp = (data or {}).get("timestamp") or time.time()

        if not (from_user and text):
            return

        models.save_broadcast(from_user, text, timestamp)
        socketio.emit("broadcast:emergency", {"from": from_user, "text": text, "timestamp": timestamp})

    @socketio.on("board:post")
    def handle_board_post(data):
        from_user = (data or {}).get("from", "").strip()
        post_type = (data or {}).get("type", "").strip()
        item = (data or {}).get("item", "").strip()
        timestamp = (data or {}).get("timestamp") or time.time()

        if not (from_user and post_type in ("have", "need") and item):
            return

        post_id = models.save_board_post(from_user, post_type, item, timestamp)
        socketio.emit(
            "board:post",
            {"id": post_id, "from": from_user, "type": post_type, "item": item, "timestamp": timestamp},
        )

    @socketio.on("board:resolve")
    def handle_board_resolve(data):
        post_id = (data or {}).get("postId")
        if not post_id:
            return
        models.resolve_board_post(post_id)
        socketio.emit("board:resolved", {"postId": post_id})

    @socketio.on("incident:post")
    def handle_incident_post(data):
        from_user = (data or {}).get("from", "").strip()
        title = (data or {}).get("title", "").strip()
        body = (data or {}).get("body", "").strip()
        severity = (data or {}).get("severity", "LOW").strip().upper()
        timestamp = (data or {}).get("timestamp") or time.time()

        if not (from_user and title):
            return
        if severity not in ("LOW", "MED", "HIGH", "CRITICAL"):
            severity = "LOW"

        entry_id = models.add_incident(from_user, title, body, severity, timestamp)
        socketio.emit(
            "incident:post",
            {
                "id": entry_id,
                "from": from_user,
                "title": title,
                "body": body,
                "severity": severity,
                "timestamp": timestamp,
            },
        )

    @socketio.on("timer:create")
    def handle_timer_create(data):
        created_by = (data or {}).get("createdBy", "").strip()
        label = (data or {}).get("label", "").strip()
        ends_at = (data or {}).get("endsAt")
        created_at = time.time()

        if not (created_by and label and ends_at):
            return

        timer_id = models.create_timer(created_by, label, ends_at, created_at)
        socketio.emit(
            "timer:create",
            {
                "id": timer_id,
                "createdBy": created_by,
                "label": label,
                "endsAt": ends_at,
                "createdAt": created_at,
            },
        )

    @socketio.on("timer:delete")
    def handle_timer_delete(data):
        timer_id = (data or {}).get("id")
        if not timer_id:
            return
        models.delete_timer(timer_id)
        socketio.emit("timer:delete", {"id": timer_id})

    @socketio.on("timer:expire")
    def handle_timer_expire(data):
        timer_id = (data or {}).get("id")
        if not timer_id:
            return
        models.expire_timer(timer_id)
        socketio.emit("timer:expire", {"id": timer_id})

    @socketio.on("status:update")
    def handle_status_update(data):
        from_user = (data or {}).get("from", "").strip()
        crisis_status = (data or {}).get("status", "unknown").strip()
        status_note = (data or {}).get("note", "").strip()

        if not from_user:
            return

        models.update_crisis_status(from_user, crisis_status, status_note)
        broadcast_presence()


