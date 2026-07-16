# Relay — Demo Walkthrough

This is a step-by-step walkthrough for running, demoing, and understanding **Relay**, a post-silence communication platform. It's meant to complement the main `README.md` with a hands-on script you can follow from a cold clone to a full live demo across multiple devices.

> **Premise:** the internet, cell networks, and every cloud service are down. Relay turns one machine into a local rendezvous point — a Flask + Socket.IO server — that any device on the same LAN/wifi can join to message, coordinate, and broadcast emergencies. Nothing in this app calls out to the internet. Once the frontend is loaded once, everything (presence, chat history, offline queue, needs board) runs off a single SQLite file next to the backend.

---

## 1. What you're demoing

| Piece | What it proves |
|---|---|
| Callsign join, no accounts | No auth infrastructure needed — there's none left to authenticate against |
| Live presence | Peers show online/offline/last-seen without a cloud presence service |
| Direct 1:1 messaging | Real-time WebSocket messaging, server-local only |
| Shared Network Channel | Broadcast-style coordination channel for the whole LAN |
| Store-and-forward relay | Messages to an offline peer queue server-side and deliver the instant that peer reconnects |
| Emergency Broadcast | One-tap alert that overrides every connected screen with a red banner + tone |
| Needs & Resources Board | A "Have / Need" bulletin for civic coordination, not just chat |
| Network Map | An honest hub-topology visualization of who's reachable |

---

## 2. Prerequisites

- Python 3.10+
- Node 18+
- Two or more devices on the same wifi network (a laptop + a phone is enough)

Check versions before you start:

```bash
python3 --version
node --version
```

---

## 3. Clone and install

```bash
git clone https://github.com/ssshauryaaa/relay.git
cd relay
```

```bash
cd backend
pip install -r requirements.txt
cd ../frontend
npm install
cd ..
```

---

## 4. Two ways to run it

### Option A — Development mode (hot reload, two terminals)

Use this while you're actively working on the app.

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

### Option B — Single-port demo build (recommended for showing the app to others)

This is the simplest thing to point a judge's or friend's phone at, since everything is served from one Flask process on one port.

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

> **Tip for the actual demo:** turn off internet/data entirely on all devices and leave only wifi (LAN) active. Relay doesn't notice the difference — that's the whole point.

---

## 5. Walkthrough script

Follow this sequence with at least two devices connected to demonstrate the full feature set.

### Step 1 — Join
On each device, open the LAN URL and pick a callsign. No email, password, or OAuth screen — just a name and a device marker.

### Step 2 — Presence
Check the peer list. Devices should show as **online** the moment they join, and flip to **offline / last-seen** if a device closes the tab or drops its socket.

### Step 3 — Direct messaging
Pick another connected callsign and send a 1:1 message. It should arrive on the other device instantly over the WebSocket connection — no polling, no delay.

### Step 4 — Shared Network Channel
Send a message to the Network Channel instead of a specific peer. Every connected device should see it — this is the "whole-network coordination" channel, distinct from 1:1 DMs.

### Step 5 — Store-and-forward (the offline queue)
This is the feature that proves Relay isn't just a simple chat relay:

1. Disconnect one device (close the tab, or turn off its wifi).
2. From another device, send that peer a direct message.
3. Reconnect the offline device.
4. The queued message should deliver automatically the moment it reconnects — no refresh needed.

### Step 6 — Emergency Broadcast
From any device, trigger the Emergency Broadcast. Every connected screen should immediately show a red banner override and play a short synthesized tone. This is intentionally unauthenticated and unrated-limited — by design, since there's no "authority" left to gate it, though that's also a known limitation (see below).

### Step 7 — Needs & Resources Board
Post a "Have" and a "Need" from two different devices (e.g., "Have: water purification tablets" / "Need: insulin"). Confirm both show up on the shared board for every peer — this is what makes Relay a civic coordination tool rather than just a chat app.

### Step 8 — Network Map
Open the Network Map view. It should render as a **hub/star topology** — every device connected to the central relay server — rather than a fabricated mesh. This honesty is intentional: Relay is a hub relay, not true peer-to-peer.

---

## 6. Architecture at a glance

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
- **Identity:** callsign only, no accounts.
- **Storage:** a single SQLite file (`backend/relay.db`), created on first run. No cloud database, no remote ORM connection.
- **Assets:** system font stack (no Google Fonts / CDN font fetch), inline SVG/Unicode icons, and in production the built frontend (`frontend/dist`) is served directly by Flask — everything comes from one process on one machine.

---

## 7. Folder structure

```
relay/
├── backend/
│   ├── app.py              # Flask + SocketIO entrypoint
│   ├── models.py            # SQLite data layer
│   ├── sockets.py           # Socket.IO event handlers
│   ├── requirements.txt
│   └── relay.db              # created on first run
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/useSocket.js
│   │   ├── App.jsx
│   │   ├── app.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 8. Pre-demo checklist

Run through this before showing Relay to anyone:

- [ ] Two or more devices on the same wifi can message each other with internet fully disabled — only LAN active
- [ ] Disconnecting and reconnecting a client delivers its queued messages
- [ ] Emergency broadcast reaches all connected clients instantly and is visually unmistakable
- [ ] The app doesn't break if a client refreshes mid-session
- [ ] Mobile viewport looks clean, not just desktop

---

## 9. Known limitations (worth mentioning in a demo)

- **Hub relay, not a true mesh.** Every message passes through the one Flask server; if that machine goes down, the network goes down with it. A WebRTC data-channel version (server used only for signaling, then direct browser-to-browser) is the natural next step but isn't implemented here.
- **Single relay per LAN.** No discovery or federation between multiple Relay servers on different networks.
- **No encryption beyond what the LAN provides**, at rest or in transit. Fine for a local coordination tool, not a substitute for a security-audited messenger.
- **Emergency broadcast has no rate limiting.** Anyone on the network can send one; there's no moderation layer, by design — but that also means it can be spammed.
- **Presence depends on a clean socket disconnect.** A device that loses power or force-quits may briefly still show "online" until the socket times out.

---

## 10. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Other devices can't reach the LAN URL | Check your machine's firewall isn't blocking port 5000; confirm all devices are on the *same* wifi network (not a guest network with client isolation enabled) |
| Frontend loads but nothing connects | In dev mode, confirm both the Flask backend (`:5000`) and Vite server (`:5173`) are running at the same time |
| Messages don't appear after rebuild | Make sure you ran `npm run build` in `frontend/` before starting `python app.py` for the single-port demo — Flask serves the built `dist/` folder, not the dev server |
| `relay.db` seems stale / demo state is messy | Stop the server and delete `backend/relay.db`, then restart — it's recreated fresh on next launch |#   r e l a y 0  
 #   r e l a y 0  
 