import "./ChatWindow.css"

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useMotionTemplate } from "motion/react";
import { Button } from "./ui/stateful-button";
import { IconRadio, IconSend, IconWifi, IconWifiOff, IconUsers, IconChevronDown, IconRefresh, IconPlayerPlay, IconPlayerPause, IconMicrophone, IconTrash, IconCheck } from "@tabler/icons-react";

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const GROUP_WINDOW_SECONDS = 120; // messages from the same sender within this window collapse together

function VoiceNotePlayer({ src }) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    audio.load();

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.error("Audio play failed:", err));
      setPlaying(true);
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current) return;
    const seekTime = parseFloat(e.target.value);
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatAudioTime = (time) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="chw-vn-player">
      <button type="button" className="chw-vn-play-btn" onClick={togglePlay}>
        {playing ? <IconPlayerPause size={18} /> : <IconPlayerPlay size={18} />}
      </button>
      <div className="chw-vn-slider-container">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="chw-vn-slider"
        />
        <div className="chw-vn-time-info">
          <span>{formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

function ChatBackground({ cursorX, cursorY }) {
  const cursorGlow = useMotionTemplate`radial-gradient(180px circle at ${cursorX}% ${cursorY}%, rgba(255,255,255,0.05), transparent 70%)`;

  return (
    <div className="chw-bg-layer" aria-hidden="true">
      <div className="chw-bg-grid" />
      <motion.div
        className="chw-bg-spotlight"
        animate={{ x: ["-4%", "5%", "-3%", "-4%"], y: ["-3%", "4%", "6%", "-3%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div className="chw-bg-cursor-glow" style={{ background: cursorGlow }} />
      <div className="chw-bg-scanline" />
    </div>
  );
}

function LiveSignalIcon({ active }) {
  return (
    <div className="chw-live-icon" title={active ? "Channel active" : "Channel idle"}>
      <svg viewBox="0 0 24 24" fill="none" className="chw-signal-svg">
        <rect x="3" y="16" width="3" height="5" rx="1" className={`chw-sbar chw-sbar-1 ${active ? "chw-sbar-lit" : ""}`} />
        <rect x="8" y="12" width="3" height="9" rx="1" className={`chw-sbar chw-sbar-2 ${active ? "chw-sbar-lit" : ""}`} />
        <rect x="13" y="7" width="3" height="14" rx="1" className={`chw-sbar chw-sbar-3 ${active ? "chw-sbar-lit" : ""}`} />
        <rect x="18" y="3" width="3" height="18" rx="1" className={`chw-sbar chw-sbar-4 ${active ? "chw-sbar-lit" : ""}`} />
      </svg>
    </div>
  );
}

function TypingIndicator({ name }) {
  return (
    <motion.div
      className="chw-bubble-row chw-row-peer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="chw-avatar">{(name || "?").slice(0, 2).toUpperCase()}</div>
      <div className="chw-bubble chw-bubble-peer chw-bubble-typing">
        <span className="chw-typing-dot" />
        <span className="chw-typing-dot" />
        <span className="chw-typing-dot" />
      </div>
    </motion.div>
  );
}

export default function ChatWindow({
  title,
  subtitle,
  messages,
  self,
  onSend,
  onRetry,
  placeholder,
  peerOnline,
  peerTyping = false,
}) {
  const [draft, setDraft] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const feedRef = useRef(null);
  const buttonRef = useRef(null);
  const inputRef = useRef(null);
  const atBottomRef = useRef(true);
  const rootRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const isDM = peerOnline !== undefined;

  const cursorXRaw = useMotionValue(50);
  const cursorYRaw = useMotionValue(50);
  const cursorX = useSpring(cursorXRaw, { damping: 26, stiffness: 80, mass: 0.4 });
  const cursorY = useSpring(cursorYRaw, { damping: 26, stiffness: 80, mass: 0.4 });

  const handlePointerMove = useCallback((e) => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    cursorXRaw.set(((e.clientX - rect.left) / rect.width) * 100);
    cursorYRaw.set(((e.clientY - rect.top) / rect.height) * 100);
  }, [cursorXRaw, cursorYRaw]);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    const el = feedRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setUnseenCount(0);
    setShowJump(false);
  }, []);

  useEffect(() => {
    if (atBottomRef.current) {
      scrollToBottom("auto");
    } else {
      setUnseenCount((c) => c + 1);
      setShowJump(true);
    }
  }, [messages, scrollToBottom]);

  function handleFeedScroll() {
    const el = feedRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottomRef.current = distanceFromBottom < 60;
    if (atBottomRef.current) {
      setShowJump(false);
      setUnseenCount(0);
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;

    mediaRecorderRef.current.onstop = () => {
      const stream = mediaRecorderRef.current.stream;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = () => {
        const base64Data = reader.result;
        onSend(base64Data);
      };
    };

    mediaRecorderRef.current.stop();
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = () => {
      const stream = mediaRecorderRef.current.stream;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    mediaRecorderRef.current.stop();
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    audioChunksRef.current = [];
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
    await new Promise((r) => setTimeout(r, 800));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      buttonRef.current?.click();
    }
  };

  const grouped = useMemo(() => {
    return messages.map((m, i) => {
      const prev = messages[i - 1];
      const sameBurst =
        prev && prev.from === m.from && Math.abs((m.timestamp || 0) - (prev.timestamp || 0)) < GROUP_WINDOW_SECONDS;
      return { ...m, _continued: !!sameBurst };
    });
  }, [messages]);

  return (
    <section className="chw-root" aria-label={title} ref={rootRef} onPointerMove={handlePointerMove}>
      <ChatBackground cursorX={cursorX} cursorY={cursorY} />

      <header className="chw-header">
        <div className="chw-header-left">
          <LiveSignalIcon active={messages.length > 0} />
          <div className="chw-header-text">
            <div className="chw-title">
              <span className="chw-title-prefix">{isDM ? "DIRECT //" : "MESH //"}</span>
              {title}
            </div>
            {subtitle && <div className="chw-subtitle">{subtitle}</div>}
          </div>
        </div>

        <div className="chw-header-right">
          <div className="chw-msg-count">
            <span className="chw-msg-count-val">{messages.length}</span>
            <span className="chw-msg-count-label">TRANSMISSIONS</span>
          </div>

          {isDM ? (
            <div className={`chw-peer-badge ${peerOnline ? "chw-badge-online" : "chw-badge-offline"}`}>
              <span className={`chw-peer-dot ${peerOnline ? "chw-dot-green" : "chw-dot-amber"}`} />
              {peerOnline ? (
                <>
                  <IconWifi size={10} /> DIRECT LINK
                </>
              ) : (
                <>
                  <IconWifiOff size={10} /> QUEUED
                </>
              )}
            </div>
          ) : (
            <div className="chw-peer-badge chw-badge-online">
              <span className="chw-peer-dot chw-dot-green" />
              <IconUsers size={10} /> SECTOR MESH
            </div>
          )}
        </div>
      </header>

      <div className="chw-divider" aria-hidden="true" />

      {/* ── FEED ── */}
      <div className="chw-feed-wrap">
        <div className="chw-feed" ref={feedRef} onScroll={handleFeedScroll}>
          {messages.length === 0 && !peerTyping ? (
            <motion.div className="chw-empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
              <div className="chw-empty-icon" aria-hidden="true">
                <svg viewBox="0 0 48 48" fill="none" width="44" height="44">
                  <circle cx="24" cy="24" r="20" className="chw-empty-ring" strokeWidth="1" opacity="0.2" />
                  <circle cx="24" cy="24" r="13" className="chw-empty-ring" strokeWidth="1" opacity="0.35" />
                  <circle cx="24" cy="24" r="6" className="chw-empty-ring" strokeWidth="1.5" opacity="0.6" />
                  <circle cx="24" cy="24" r="2.5" className="chw-empty-core" opacity="0.9" />
                  <line x1="24" y1="4" x2="24" y2="11" className="chw-empty-ring" strokeWidth="1.5" opacity="0.4" />
                  <line x1="44" y1="24" x2="37" y2="24" className="chw-empty-ring" strokeWidth="1.5" opacity="0.4" />
                  <line x1="4" y1="24" x2="11" y2="24" className="chw-empty-ring" strokeWidth="1.5" opacity="0.4" />
                  <line x1="24" y1="44" x2="24" y2="37" className="chw-empty-ring" strokeWidth="1.5" opacity="0.4" />
                </svg>
              </div>
              <div className="chw-empty-title">Channel is silent.</div>
              <div className="chw-empty-sub">
                {isDM ? `No transmissions exchanged with ${title} yet.` : "No transmissions yet on this sector channel."}
              </div>
              <div className="chw-empty-hint mono">Type below to begin broadcasting.</div>
            </motion.div>
          ) : (
            <div className="chw-messages">
              <AnimatePresence initial={false}>
                {grouped.map((m, i) => {
                  const mine = typeof m.mine === "boolean"
                    ? m.mine
                    : m.from != null && self?.username != null &&
                    String(m.from).trim().toLowerCase() === String(self.username).trim().toLowerCase();
                  const queued = mine && isDM && !peerOnline;
                  const statusEl = mine && isDM ? (
                    queued ? (
                      <span className="chw-tx-queued">
                        ⊘ QUEUED
                        {onRetry && (
                          <button type="button" className="chw-retry-btn" onClick={() => onRetry(m)} title="Retry transmission">
                            <IconRefresh size={10} />
                          </button>
                        )}
                      </span>
                    ) : (
                      <span className="chw-tx-ok">✓ TX</span>
                    )
                  ) : null;

                  return (
                    <motion.div
                      key={m.timestamp + "-" + i}
                      initial={{ opacity: 0, y: 14, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97, y: -6 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className={`chw-bubble-row ${mine ? "chw-row-mine" : "chw-row-peer"} ${m._continued ? "chw-row-continued" : ""}`}
                    >
                      {!mine && <div className="chw-avatar">{m._continued ? "" : (m.from || "?").slice(0, 2).toUpperCase()}</div>}

                      <div className={`chw-bubble ${mine ? "chw-bubble-mine" : "chw-bubble-peer"} ${queued ? "chw-bubble-queued" : ""}`}>
                        {!mine && !m._continued && <div className="chw-sender">{m.from}</div>}
                        {m.text && m.text.startsWith("data:audio/") ? (
                          <VoiceNotePlayer src={m.text} />
                        ) : (
                          <div className="chw-msg-text">{m.text}</div>
                        )}
                        <div className="chw-bubble-foot">
                          <span className="chw-ts">{formatTime(m.timestamp)}</span>
                          {statusEl}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                {peerTyping && <TypingIndicator key="typing" name={title} />}
              </AnimatePresence>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showJump && (
            <motion.button
              type="button"
              className="chw-jump-btn mono"
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              onClick={() => scrollToBottom()}
            >
              <IconChevronDown size={13} />
              {unseenCount > 0 ? `${unseenCount} new` : "Jump to latest"}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── INPUT BAR ── */}
      <div className="chw-input-area">
        <form className="chw-form" onSubmit={handleSubmit}>
          {isRecording ? (
            <motion.div
              className="chw-input-shell chw-recording-shell"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="chw-recording-indicator">
                <span className="chw-recording-dot" />
                <span className="chw-recording-label mono">RECORDING VOICENOTE // {formatTimer(recordingTime)}</span>
              </div>
              <div style={{ flex: 1 }} />
              <div className="chw-recording-actions">
                <button type="button" className="chw-rec-action-btn chw-rec-cancel" onClick={cancelRecording} title="Cancel recording">
                  <IconTrash size={16} />
                </button>
                <button type="button" className="chw-rec-action-btn chw-rec-confirm" onClick={stopAndSendRecording} title="Send voice note">
                  <IconCheck size={16} />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="chw-input-shell"
              animate={{
                borderColor: isFocused ? "rgba(14,240,251,0.35)" : "rgba(255,255,255,0.06)",
              }}
              transition={{ duration: 0.2 }}
            >
              <div className="chw-freq-label mono">
                <IconRadio size={11} />
                <span>{isDM ? "DIRECT" : "144.800"}</span>
              </div>
              <div className="chw-input-divider" />
              <input
                ref={inputRef}
                className="chw-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || "Transmit to sector…"}
                maxLength={500}
                autoComplete="off"
                aria-label="Message input"
              />
              {draft.length > 0 && <span className="chw-char-count">{500 - draft.length}</span>}
              
              <button
                type="button"
                className="chw-mic-btn"
                onClick={startRecording}
                title="Record voice note"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--chw-text-dim)",
                  padding: "6px",
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  marginRight: "4px"
                }}
                onMouseOver={(e) => e.currentTarget.style.color = "var(--chw-teal)"}
                onMouseOut={(e) => e.currentTarget.style.color = "var(--chw-text-dim)"}
              >
                <IconMicrophone size={16} />
              </button>

              <Button ref={buttonRef} type="button" className="chw-send-btn" onClick={handleSubmit} disabled={!draft.trim()}>
                <IconSend size={13} />
                Send
              </Button>
            </motion.div>
          )}

          <div className="chw-input-status mono">
            <span>{isRecording ? "Transmitter active — speaking into microphone" : isDM ? `Routing via mesh to ${title}` : "Broadcasting to all nodes in sector"}</span>
            {!isRecording && draft.length > 400 && <span className="chw-char-warn">{500 - draft.length} chars remaining</span>}
          </div>
        </form>
      </div>
    </section>
  );
}