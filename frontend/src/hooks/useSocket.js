import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { audioManager } from "../utils/audio.js";

const WATCHLIST_KEY = "relay_watchlist";

function loadWatchlist() {
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveWatchlist(list) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
}

export function useSocket() {
  const socketRef = useRef(null);
  const selfRef = useRef(null);
  const peersRef = useRef([]);
  const [connected, setConnected] = useState(false);
  const [signal, setSignal] = useState("offline");
  const [self, setSelf] = useState(null);
  const [joinError, setJoinError] = useState(null);
  const [peers, setPeers] = useState([]);
  const [channelMessages, setChannelMessages] = useState([]);
  const [directMessages, setDirectMessages] = useState({});
  const [broadcasts, setBroadcasts] = useState([]);
  const [initialBroadcastCutoff, setInitialBroadcastCutoff] = useState(Infinity);
  const [board, setBoard] = useState([]);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const [incidents, setIncidents] = useState([]);
  const [timers, setTimers] = useState([]);

  const [watchlist, setWatchlistState] = useState(loadWatchlist);
  const watchlistRef = useRef(loadWatchlist());

  const [tripwireAlert, setTripwireAlert] = useState(null);

  const checkTripwires = useCallback((text, from) => {
    const wl = watchlistRef.current;
    if (!wl.length) return;
    const lower = text.toLowerCase();
    const hit = wl.find((w) => lower.includes(w.toLowerCase()));
    if (hit) {
      setTripwireAlert({ keyword: hit, text, from, ts: Date.now() });
      if (audioManager?.playLock) audioManager.playLock();
    }
  }, []);

  useEffect(() => {
    const socket = io("/", {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 800,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setSignal("strong");
      setReconnectAttempts(0);
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setSignal("offline");
    });

    socket.io.on("reconnect_attempt", (n) => {
      setSignal("weak");
      setReconnectAttempts(n);
    });

    socket.on("join:ack", (data) => {
      selfRef.current = { username: data.username, deviceIcon: data.deviceIcon };
      setSelf({ username: data.username, deviceIcon: data.deviceIcon });
      setJoinError(null);
      audioManager.playLock();
      setChannelMessages(
        (data.channelHistory || []).map((m) => ({
          from: m.from_user,
          text: m.text,
          timestamp: m.timestamp,
        }))
      );
      const historicalBroadcasts = (data.broadcasts || []).map((b) => ({
        from: b.from_user,
        text: b.text,
        timestamp: b.timestamp,
      }));
      setBroadcasts(historicalBroadcasts);
      const cutoff =
        historicalBroadcasts.length > 0
          ? historicalBroadcasts[historicalBroadcasts.length - 1].timestamp
          : Date.now() / 1000;
      setInitialBroadcastCutoff(cutoff);
      setBoard(
        (data.board || []).map((p) => ({
          id: p.id,
          from: p.from_user,
          type: p.type,
          item: p.item,
          timestamp: p.timestamp,
        }))
      );
      setIncidents(
        (data.incidents || []).map((i) => ({
          id: i.id,
          from: i.from_user,
          title: i.title,
          body: i.body,
          severity: i.severity,
          timestamp: i.timestamp,
        }))
      );
      setTimers(data.timers || []);
    });

    socket.on("join:error", (data) => {
      setJoinError(data.message);
    });

    socket.on("presence:update", (list) => {
      const oldOnline = peersRef.current.filter(p => p.status === "online" && p.username !== selfRef.current?.username);
      const newOnline = list.filter(p => p.status === "online" && p.username !== selfRef.current?.username);
      if (newOnline.length > oldOnline.length && selfRef.current) {
        audioManager.playPeerOnline();
      }
      peersRef.current = list;
      setPeers(list);
    });

    socket.on("queue:sync", (data) => {
      const byPeer = {};
      (data.messages || []).forEach((m) => {
        const key = m.from;
        byPeer[key] = byPeer[key] || [];
        byPeer[key].push(m);
      });
      setDirectMessages((prev) => {
        const next = { ...prev };
        Object.entries(byPeer).forEach(([peer, msgs]) => {
          next[peer] = [...(next[peer] || []), ...msgs].sort((a, b) => a.timestamp - b.timestamp);
        });
        return next;
      });
    });

    socket.on("message:channel", (msg) => {
      setChannelMessages((prev) => [...prev, msg]);
      checkTripwires(msg.text, msg.from);
      if (selfRef.current) {
        if (msg.from === selfRef.current.username) {
          audioManager.playMsgSent();
        } else {
          audioManager.playMsgRecv();
        }
      }
    });

    socket.on("message:direct", (msg) => {
      setDirectMessages((prev) => {
        const peer = msg.from === selfRef.current?.username ? msg.to : msg.from;
        const next = { ...prev };
        const existing = next[peer] || [];
        if (existing.some((m) => m.timestamp === msg.timestamp && m.text === msg.text && m.from === msg.from)) {
          return prev;
        }
        next[peer] = [...existing, msg];
        return next;
      });
      if (selfRef.current && msg.from !== selfRef.current.username) {
        checkTripwires(msg.text, msg.from);
      }
      if (selfRef.current) {
        if (msg.from === selfRef.current.username) {
          audioManager.playMsgSent();
        } else {
          audioManager.playMsgRecv();
        }
      }
    });

    socket.on("broadcast:emergency", (msg) => {
      setBroadcasts((prev) => [...prev, msg]);
      checkTripwires(msg.text, msg.from);
      audioManager.startAlarm();
    });

    socket.on("board:post", (post) => {
      setBoard((prev) => [post, ...prev]);
      if (selfRef.current && post.from !== selfRef.current.username) {
        audioManager.playMsgRecv();
      }
    });

    socket.on("board:resolved", ({ postId }) => {
      setBoard((prev) => prev.filter((p) => p.id !== postId));
      audioManager.playMsgSent();
    });

    socket.on("incident:post", (entry) => {
      setIncidents((prev) => [...prev, {
        id: entry.id,
        from: entry.from,
        title: entry.title,
        body: entry.body,
        severity: entry.severity,
        timestamp: entry.timestamp,
      }]);
      if (selfRef.current && entry.from !== selfRef.current.username) {
        audioManager.playMsgRecv();
      }
    });

    socket.on("timer:create", (timer) => {
      setTimers((prev) => [...prev, timer]);
    });

    socket.on("timer:delete", ({ id }) => {
      setTimers((prev) => prev.filter((t) => t.id !== id));
    });

    socket.on("timer:expire", ({ id }) => {
      setTimers((prev) => prev.filter((t) => t.id !== id));
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const join = useCallback((username, deviceIcon) => {
    socketRef.current?.emit("join", { username, deviceIcon });
  }, []);

  const sendChannelMessage = useCallback(
    (text) => {
      if (!self) return;
      const timestamp = Date.now() / 1000;
      socketRef.current?.emit("message:channel", { from: self.username, text, timestamp });
    },
    [self]
  );

  const sendDirectMessage = useCallback(
    (to, text) => {
      if (!self) return;
      const timestamp = Date.now() / 1000;
      setDirectMessages((prev) => {
        const next = { ...prev };
        next[to] = [...(next[to] || []), { from: self.username, to, text, timestamp }];
        return next;
      });
      socketRef.current?.emit("message:direct", { to, from: self.username, text, timestamp });
    },
    [self]
  );

  const sendBroadcast = useCallback(
    (text) => {
      if (!self) return;
      const timestamp = Date.now() / 1000;
      socketRef.current?.emit("broadcast:emergency", { from: self.username, text, timestamp });
    },
    [self]
  );

  const postBoard = useCallback(
    (type, item) => {
      if (!self) return;
      const timestamp = Date.now() / 1000;
      socketRef.current?.emit("board:post", { from: self.username, type, item, timestamp });
    },
    [self]
  );

  const resolveBoard = useCallback((postId) => {
    socketRef.current?.emit("board:resolve", { postId });
  }, []);

  const postIncident = useCallback(
    (title, body, severity) => {
      if (!self) return;
      const timestamp = Date.now() / 1000;
      socketRef.current?.emit("incident:post", {
        from: self.username,
        title,
        body,
        severity,
        timestamp,
      });
    },
    [self]
  );

  const createTimer = useCallback(
    (label, durationSeconds) => {
      if (!self) return;
      const endsAt = Date.now() / 1000 + durationSeconds;
      socketRef.current?.emit("timer:create", {
        createdBy: self.username,
        label,
        endsAt,
      });
    },
    [self]
  );

  const deleteTimer = useCallback((id) => {
    socketRef.current?.emit("timer:delete", { id });
  }, []);

  const expireTimer = useCallback((id) => {
    socketRef.current?.emit("timer:expire", { id });
  }, []);

  const setWatchlist = useCallback((newList) => {
    watchlistRef.current = newList;
    setWatchlistState(newList);
    saveWatchlist(newList);
  }, []);

  const dismissTripwireAlert = useCallback(() => {
    setTripwireAlert(null);
  }, []);

  const updateCrisisStatus = useCallback(
    (status, note) => {
      if (!self) return;
      socketRef.current?.emit("status:update", {
        from: self.username,
        status,
        note,
      });
    },
    [self]
  );

  return {
    connected,
    signal,
    reconnectAttempts,
    self,
    joinError,
    peers,
    channelMessages,
    directMessages,
    broadcasts,
    initialBroadcastCutoff,
    board,
    incidents,
    timers,
    watchlist,
    tripwireAlert,
    join,
    sendChannelMessage,
    sendDirectMessage,
    sendBroadcast,
    postBoard,
    resolveBoard,
    postIncident,
    createTimer,
    deleteTimer,
    expireTimer,
    setWatchlist,
    dismissTripwireAlert,
    updateCrisisStatus,
  };
}
