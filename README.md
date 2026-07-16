# 📡 Relay

**When the sky went quiet, the network didn't have to.**

Relay is a next-generation, offline-first communication platform built for the scenario where every piece of digital infrastructure humanity relies on — messaging apps, email, phone calls, social media — has been silently disabled. It turns a single machine into a local rendezvous point that any device on the same wifi/LAN can join, with no accounts, no cloud, and no internet dependency, to message, coordinate, and stay alive together.

Built for **[Event Name]** — *"Humanity's first contact with extraterrestrial life didn't begin with war — it began with silence."*

---

## 1. The Problem

Within hours of first contact, every form of digital communication humanity depends on goes dark. No DMs, no calls, no social feeds, no cloud services of any kind. Panic spreads because coordination — the thing that keeps a crisis from becoming a catastrophe — has no channel left to travel through.

The brief: design and build a next-generation communication platform that lets people communicate, coordinate, and stay connected without any of the old systems.

## 2. Our Answer

Relay doesn't try to rebuild the internet — it assumes it isn't coming back, and builds for what people actually have left: each other, a device, and a local wifi network. One machine runs a lightweight Flask + Socket.IO server; every phone or laptop on the same LAN opens a browser tab and joins with nothing but a callsign. From there, Relay becomes a shared nervous system for the group: live presence, direct and broadcast messaging, a store-and-forward queue for people who drop off and reconnect, a crisis status board, an incident log, keyword alert tripwires, shared countdown timers, and a needs/resources board for civic coordination — all running off a single local SQLite file, with zero calls out to the internet.

If the network the aliens killed was global, centralized, and account-based, Relay is deliberately the opposite: local, disposable, and open to anyone standing in the room.

## 3. Feature Overview

| View | What it does | Why it matters in a silence scenario |
|---|---|---|
| **Join** | Pick a callsign and a device icon — no email, no password, no OAuth | There's no identity provider left to authenticate against |
| **Home / Signal Dashboard** | At-a-glance view of link status, peer count, recent broadcasts, and open needs | One screen tells you the state of the whole local network |
| **Channel** | Network-wide broadcast chat + 1:1 direct messages, with a peer/contacts sidebar | Group coordination and private conversation, both real-time over WebSocket |
| **Store-and-forward** | Messages sent to an offline peer queue on the server and auto-deliver the instant that peer reconnects | People will drop off wifi constantly — messages shouldn't just vanish |
| **Map** | Honest hub/star topology visualization of who's actually reachable | No fake mesh — shows people the real shape of their network |
| **Board** | A "Have / Need" bulletin (e.g. *Have: water purification tablets* / *Need: insulin*) | Turns Relay from a chat app into a civic resource-matching tool |
| **Status** | Each peer broadcasts a crisis status (safe / need help / unknown) with a short note | A silent, low-friction way to do a wellness check across a whole group |
| **Log** | A shared incident log with severity levels (LOW / MED / HIGH / CRITICAL) | A durable, timestamped record of what's happening, for anyone who joins late |
| **Alerts** | Keyword "tripwires" — flag words that trigger an on-screen banner alert when they appear in channel traffic | Surfaces urgent messages automatically instead of relying on everyone reading everything |
| **Timers** | Shared countdown timers (5 min / 10 min / 30 min / 1 hr / custom) visible to the whole network | Coordinates group actions — "meet at the relay point in 15" — without a shared clock service |
| **Emergency Broadcast** | One-tap alert that overrides every connected screen with a red banner + synthesized tone | The one message that has to reach everyone, instantly, no matter what they're doing |
| **Diagnostics / Outbox** | Local + server outbox inspector and connection log, with retry/prioritize/discard controls | Makes an inherently invisible thing — network reliability — visible and debuggable in a demo or a crisis |

## 4. Tech Stack

**Backend** — Python, Flask, Flask-SocketIO (WebSocket transport via `eventlet`), SQLite (single-file, zero-config storage), Gunicorn for production.

**Frontend** — React 18 + Vite, Socket.IO client, Tailwind-oriented utility styling with `class-variance-authority` / `tailwind-merge`, Radix UI primitives, `@tabler/icons-react` for iconography, `motion` for animation, and a custom `dotted-map` powered network topology view.

**Design intent** — dark, radio/terminal-inspired UI (JetBrains Mono / Share Tech Mono type), because this is meant to feel like emergency communications equipment, not a consumer chat app.

## 5. Architecture

```
        ┌──────────────┐
        │   Device A   │
        └──────┬───────┘
               │ WebSocket (Socket.IO)
        ┌──────▼───────┐        ┌──────────────┐
        │ Flask Server │◄──────►│   Device B   │
        │  + Socket.IO │        └──────────────┘
        │  + SQLite    │
        └──────┬───────┘
               │ WebSocket
        ┌──────▼───────┐
        │   Device C   │
        └──────────────┘
```

- **Transport:** Socket.IO over plain WebSocket, client → local Flask server only. No third-party realtime service is involved.
- **Identity:** callsign only, no accounts, no passwords.
- **Storage:** a single SQLite file (`backend/relay.db`), created automatically on first run. No cloud database, no remote ORM connection.
- **Delivery:** every message, broadcast, board post, incident, and timer is persisted server-side, so a peer that reconnects gets fully caught up — not just future messages.
- **Serving:** in production, the built frontend (`frontend/dist`) is served directly by the same Flask process — one machine, one process, one port.

## 6. Getting Started

### Prerequisites

- Python 3.10+
- Node 18+
- Two or more devices on the same wifi network (a laptop + a phone is enough to demo it properly)

```bash
python3 --version
node --version
```

### Clone and install

```bash
git clone https://github.com/ssshauryaaa/relay.git
cd relay

cd backend
pip install -r requirements.txt
cd ../frontend
npm install
cd ..
```

### Option A — Development mode (hot reload, two terminals)

Use this while actively working on the app.

**Terminal 1 — backend:**
```bash
cd backend
python app.py
```
This starts the relay server on `http://0.0.0.0:5000` and prints the LAN URL to open from other devices. `relay.db` (SQLite) is created automatically on first run — no migrations, no setup step.

**Terminal 2 — frontend:**
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173`. The Vite dev server proxies `/socket.io` and `/api` to the Flask backend on port `5000`, so **both terminals need to stay running**.

### Option B — Single-port demo build (recommended for judges)

The simplest thing to point a judge's or friend's phone at, since everything is served from one Flask process on one port.

```bash
cd frontend
npm install
npm run build
cd ../backend
python app.py
```

Then find your machine's LAN IP:
- **Linux:** `hostname -I`
- **macOS:** `ipconfig getifaddr en0`
- **Windows:** `ipconfig`

Open `http://<your-LAN-IP>:5000` from any device on the same wifi network. Every device that opens that URL can join with its own callsign — no install, no account.

> **Tip for the actual demo:** turn off internet/mobile data entirely on all devices and leave only wifi (LAN) active. Relay doesn't notice the difference — that's the whole point.

### Optional — cloud deploy for remote judging

A `render.yaml` is included for deploying Relay to [Render](https://render.com) as a single web service, for cases where a judge can't be on the same LAN. Note this is a convenience for remote demos only — it puts the server back on the internet, which is the opposite of Relay's core premise, so the LAN walkthrough below is the version that actually proves the concept.

---

## 7. Full Demo Walkthrough

Follow this sequence with at least two devices connected to demonstrate the full feature set, in the order that tells the best story.

### Step 1 — Join
On each device, open the LAN URL and pick a callsign and device icon. No email, password, or OAuth screen — just a name.

### Step 2 — Home / Signal Dashboard
Land on the dashboard. It should show link status, connected peer count, recent broadcasts, and open board items at a glance — this is the "state of the network" view.

### Step 3 — Presence
Open the peer list. Devices should show **online** the moment they join, and flip to **offline / last-seen** if a device closes the tab or drops its socket.

### Step 4 — Direct messaging
From the Channel view, pick another connected callsign and send a 1:1 message. It should arrive on the other device instantly over the WebSocket connection — no polling, no delay.

### Step 5 — Network Channel
Send a message to the Network Channel instead of a specific peer. Every connected device should see it — this is the broadcast-style coordination channel, distinct from 1:1 DMs.

### Step 6 — Store-and-forward (the offline queue)
This is the feature that proves Relay isn't just a simple chat relay:
1. Disconnect one device (close the tab, or turn off its wifi).
2. From another device, send that peer a direct message.
3. Reconnect the offline device.
4. The queued message should deliver automatically the moment it reconnects — no refresh needed.

### Step 7 — Needs & Resources Board
Post a "Have" and a "Need" from two different devices (e.g. *Have: water purification tablets* / *Need: insulin*). Confirm both show up on the shared board for every peer.

### Step 8 — Status Board
From the Status view, set a crisis status (e.g. safe / need help) with a short note. Confirm it's visible from another device's peer/status feed — this is a silent, network-wide wellness check.

### Step 9 — Incident Log
Post an incident with a title, body, and severity (LOW / MED / HIGH / CRITICAL). Confirm it appears in order on every device, including one that joins after it was posted.

### Step 10 — Alert Tripwires
Add a keyword to the watchlist (e.g. "medical"). From another device, send a channel message containing that word and confirm the tripwire banner fires automatically for anyone watching that keyword.

### Step 11 — Countdown Timers
Create a shared timer (e.g. "Regroup — 10 min"). Confirm it counts down live on every connected device, not just the one that created it.

### Step 12 — Emergency Broadcast
Trigger the Emergency Broadcast from any device. Every connected screen should immediately show a red banner override and play a short synthesized tone. This is intentionally unauthenticated and unrate-limited — there's no "authority" left to gate it, though that's also a known limitation (see below).

### Step 13 — Network Map
Open the Map view. It should render as a **hub/star topology** — every device connected to the central relay server — rather than a fabricated mesh. This honesty is intentional: Relay is a hub relay, not true peer-to-peer.

### Step 14 — Diagnostics / Outbox
Open Diagnostics to show the local and server-side outbox, plus the connection log. Retry, prioritize, or discard a queued message to demonstrate that message delivery isn't a black box.

---

## 8. Folder Structure

```
relay/
├── backend/
│   ├── app.py              # Flask + SocketIO entrypoint, REST health/peers/incidents endpoints
│   ├── models.py            # SQLite data layer (users, messages, broadcasts, board, incidents, timers)
│   ├── sockets.py           # Socket.IO event handlers (join, messaging, broadcasts, board, incidents, timers, status)
│   ├── requirements.txt
│   └── relay.db              # created on first run
├── frontend/
│   ├── src/
│   │   ├── components/       # SignalDashboard, ChatWindow, NetworkChannelTab, NetworkMap,
│   │   │                     # NeedsBoard, StatusBoardView, IncidentLog, AlertTripwires,
│   │   │                     # CountdownTimers, OutboxLogsView, JoinScreen, PeerList, ui/
│   │   ├── hooks/useSocket.js
│   │   ├── services/StatusService.js
│   │   ├── utils/audio.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── render.yaml
└── README.md
```

---

## 9. Pre-Demo Checklist

- [ ] Two or more devices on the same wifi can message each other with internet fully disabled — only LAN active
- [ ] Disconnecting and reconnecting a client delivers its queued messages
- [ ] Emergency broadcast reaches all connected clients instantly and is visually unmistakable
- [ ] Status, incident log, alerts, and timers all sync correctly across devices
- [ ] The app doesn't break if a client refreshes mid-session
- [ ] Mobile viewport looks clean, not just desktop

---

## 10. Known Limitations

- **Hub relay, not a true mesh.** Every message passes through the one Flask server; if that machine goes down, the network goes down with it. A WebRTC data-channel version (server used only for signaling, then direct browser-to-browser) is the natural next step, not yet implemented.
- **Single relay per LAN.** No discovery or federation between multiple Relay servers on different networks.
- **No encryption beyond what the LAN provides**, at rest or in transit. Fine for a local coordination tool, not a substitute for a security-audited messenger.
- **Emergency broadcast has no rate limiting.** Anyone on the network can send one, with no moderation layer, by design — but that also means it can be spammed.
- **Presence depends on a clean socket disconnect.** A device that loses power or force-quits may briefly still show "online" until the socket times out.

## 11. Roadmap

- WebRTC-based true peer-to-peer fallback when the relay server itself is unreachable
- Multi-hop relay federation across adjacent LANs (bridge devices carrying messages between networks)
- End-to-end encryption for direct messages
- Bluetooth/local-mesh fallback for when wifi infrastructure itself is gone

---

## 12. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Other devices can't reach the LAN URL | Check your machine's firewall isn't blocking port 5000; confirm all devices are on the *same* wifi network (not a guest network with client isolation enabled) |
| Frontend loads but nothing connects | In dev mode, confirm both the Flask backend (`:5000`) and Vite server (`:5173`) are running at the same time |
| Messages don't appear after rebuild | Make sure you ran `npm run build` in `frontend/` before starting `python app.py` for the single-port demo — Flask serves the built `dist/` folder, not the dev server |
| `relay.db` seems stale / demo state is messy | Stop the server and delete `backend/relay.db`, then restart — it's recreated fresh on next launch |

---

*Built for [Event Name] — because when the network goes silent, the people don't have to.*