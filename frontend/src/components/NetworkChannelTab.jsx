import "./NetworkChannelTab.css"

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  IconSearch,
  IconUsers,
  IconSatellite,
  IconMenu2,
  IconX,
  IconAntenna,
  IconCheck,
} from "@tabler/icons-react";

function LiveSignalIcon({ active }) {
  return (
    <div className="nct-signal-icon" title={active ? "Sector activity active" : "Sector quiet"}>
      <svg viewBox="0 0 24 24" fill="none" className="nct-signal-svg">
        <rect x="3" y="16" width="3" height="5" rx="0.5" className={`nct-sbar nct-sbar-1 ${active ? "nct-sbar-lit" : ""}`} />
        <rect x="8" y="12" width="3" height="9" rx="0.5" className={`nct-sbar nct-sbar-2 ${active ? "nct-sbar-lit" : ""}`} />
        <rect x="13" y="7" width="3" height="14" rx="0.5" className={`nct-sbar nct-sbar-3 ${active ? "nct-sbar-lit" : ""}`} />
        <rect x="18" y="3" width="3" height="18" rx="0.5" className={`nct-sbar nct-sbar-4 ${active ? "nct-sbar-lit" : ""}`} />
      </svg>
    </div>
  );
}

function RollingCount({ value }) {
  return (
    <span className="nct-roll" aria-live="polite">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 10, opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          style={{ display: "inline-block" }}
        >
          {value.toLocaleString()}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function SkeletonDirectory() {
  return (
    <div className="nct-skeleton-list">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="nct-skeleton-row" style={{ animationDelay: `${i * 0.08}s` }}>
          <div className="nct-skeleton-avatar nct-shimmer" />
          <div className="nct-skeleton-body">
            <div className="nct-skeleton-title nct-shimmer" />
            <div className="nct-skeleton-text nct-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, sub }) {
  return (
    <div className="nct-empty">
      <div className="nct-empty-pulse-svg">
        <svg viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="16" className="nct-empty-ring" opacity="0.12" />
          <circle cx="20" cy="20" r="10" className="nct-empty-ring" opacity="0.28" />
          <circle cx="20" cy="20" r="5" className="nct-empty-ring" opacity="0.7" />
        </svg>
      </div>
      <div className="nct-empty-title">{title}</div>
      <div className="nct-empty-sub mono">{sub}</div>
    </div>
  );
}

export default function NetworkChannelTab({
  contacts = [],
  channels = [],
  activeId,
  onSelect,
  self,
  networkStatus = "stable", // stable | degraded
  nodeCount = 14204,
  isLoading = false,
}) {
  const [activeTab, setActiveTab] = useState("direct"); // direct | sectors
  const [search, setSearch] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [presence, setPresence] = useState("available"); // available | dnd
  const [presenceMenuOpen, setPresenceMenuOpen] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") setPresenceMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const sortedContacts = useMemo(() => {
    return [...contacts]
      .filter((c) => c.username?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (!!b.isDistress !== !!a.isDistress) return b.isDistress ? 1 : -1;
        if (!!b.online !== !!a.online) return b.online ? 1 : -1;
        return (b.lastMessageAt || 0) - (a.lastMessageAt || 0);
      });
  }, [contacts, search]);

  const sortedChannels = useMemo(() => {
    return [...channels]
      .filter(
        (ch) => ch.name?.toLowerCase().includes(search.toLowerCase()) || ch.frequency?.includes(search)
      )
      .sort((a, b) => !!b.isEmergency - !!a.isEmergency);
  }, [channels, search]);

  const directUnreadCount = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const sectorUnreadCount = channels.reduce((sum, ch) => sum + (ch.unreadCount || 0), 0);
  const distressCount = contacts.filter((c) => c.isDistress).length;

  function handleSelect(id, type) {
    onSelect?.(id, type);
    setIsMobileExpanded(false);
  }

  const formatLastMsgTime = (ts) => {
    if (!ts) return "";
    return new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <button
        className="nct-mobile-toggle"
        onClick={() => setIsMobileExpanded(!isMobileExpanded)}
        aria-label="Toggle network directory"
      >
        {isMobileExpanded ? <IconX size={20} /> : <IconMenu2 size={20} />}
      </button>

      <AnimatePresence>
        {isMobileExpanded && (
          <motion.div
            className="nct-mobile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileExpanded(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`nct-panel ${isMobileExpanded ? "nct-mobile-open" : ""}`}>
        <div className="nct-content-wrapper">
          {/* ── HEADER ── */}
          <header className="nct-header">
            <div className="nct-header-title-row">
              <h2 className="nct-title">
                <span className="nct-title-prefix">NETWORK //</span> DIRECTORY
              </h2>
            </div>
            <div className="nct-health-strip mono">
              <span className={`nct-pulse-dot ${networkStatus === "stable" ? "nct-dot-green" : "nct-dot-amber"}`} />
              <span>
                MESH {networkStatus === "stable" ? "ACTIVE" : "DEGRADED"} · <RollingCount value={nodeCount} /> NODES
              </span>
            </div>
            {distressCount > 0 && (
              <motion.div
                className="nct-distress-banner mono"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <IconAntenna size={12} />
                {distressCount} node{distressCount > 1 ? "s" : ""} broadcasting distress
              </motion.div>
            )}
          </header>

          {/* ── SEARCH ── */}
          <div className="nct-search-box">
            <motion.div
              className="nct-search-shell"
              animate={{
                borderColor: isFocused ? "var(--nct-amber)" : "rgba(255,255,255,0.06)",
                boxShadow: isFocused ? "0 0 0 3px rgba(245,166,35,0.1), 0 4px 12px rgba(0,0,0,0.3)" : "none",
              }}
              transition={{ duration: 0.2 }}
            >
              <IconSearch size={14} className="nct-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="nct-search-input"
                placeholder="Search nodes or sectors…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                aria-label="Search directory"
              />
              <kbd className="nct-kbd-hint mono">⌘K</kbd>
            </motion.div>
            {networkStatus !== "stable" && <div className="nct-search-scan" aria-hidden="true" />}
          </div>

          {/* ── TABS ── */}
          <div className="nct-tabs-container">
            <div className="nct-tabs-list" role="tablist">
              <button
                className={`nct-tab-btn mono ${activeTab === "direct" ? "nct-tab-active" : ""}`}
                onClick={() => setActiveTab("direct")}
                role="tab"
                aria-selected={activeTab === "direct"}
              >
                <span>DIRECT</span>
                <span className={`nct-tab-badge ${directUnreadCount > 0 ? "nct-badge-alert" : ""}`}>{contacts.length}</span>
                {activeTab === "direct" && <motion.div className="nct-tab-underline" layoutId="nct-tab-glow" />}
              </button>
              <button
                className={`nct-tab-btn mono ${activeTab === "sectors" ? "nct-tab-active" : ""}`}
                onClick={() => setActiveTab("sectors")}
                role="tab"
                aria-selected={activeTab === "sectors"}
              >
                <span>SECTORS</span>
                <span className={`nct-tab-badge ${sectorUnreadCount > 0 ? "nct-badge-alert" : ""}`}>{channels.length}</span>
                {activeTab === "sectors" && <motion.div className="nct-tab-underline" layoutId="nct-tab-glow" />}
              </button>
            </div>
          </div>

          {/* ── LISTS ── */}
          <div className="nct-list-viewport">
            {isLoading ? (
              <SkeletonDirectory />
            ) : (
              <AnimatePresence mode="wait">
                {activeTab === "direct" ? (
                  <motion.div
                    key="direct-list"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="nct-items-list"
                    role="listbox"
                  >
                    {sortedContacts.length === 0 ? (
                      <EmptyState title="No nodes discovered" sub="Scanning local sector segment…" />
                    ) : (
                      sortedContacts.map((contact, index) => {
                        const isActive = activeId === contact.id;
                        return (
                          <motion.button
                            key={contact.id}
                            className={`nct-row ${isActive ? "nct-row-active" : ""} ${contact.isDistress ? "nct-row-distress" : ""}`}
                            onClick={() => handleSelect(contact.id, "direct")}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03, duration: 0.22 }}
                            whileHover={{ x: 2 }}
                            role="option"
                            aria-selected={isActive}
                          >
                            <div className="nct-avatar-container">
                              <div className={`nct-avatar ${contact.online ? "nct-avatar-online" : ""}`}>
                                {contact.username?.slice(0, 2).toUpperCase()}
                              </div>
                              <span className={`nct-presence-dot ${contact.isDistress ? "nct-dot-red" : contact.online ? "nct-dot-green" : "nct-dot-amber"}`} />
                            </div>

                            <div className="nct-row-body">
                              <div className="nct-row-meta">
                                <span className="nct-name">
                                  {contact.username}
                                  {contact.isDistress && <span className="nct-sos-tag mono">SOS</span>}
                                </span>
                                <span className="nct-time mono">{formatLastMsgTime(contact.lastMessageAt)}</span>
                              </div>
                              <div className="nct-preview-row">
                                <p className="nct-preview-text">{contact.lastMessage || "No transmissions received"}</p>
                                {contact.hasQueuedOutgoing && !contact.online && (
                                  <span className="nct-queued-tag mono">⊘ QUEUED</span>
                                )}
                              </div>
                            </div>

                            {contact.unreadCount > 0 && (
                              <motion.span
                                className="nct-unread-badge mono"
                                animate={{ scale: [1, 1.25, 1] }}
                                transition={{ duration: 0.35, ease: "easeOut" }}
                              >
                                {contact.unreadCount}
                              </motion.span>
                            )}
                          </motion.button>
                        );
                      })
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="sectors-list"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="nct-items-list"
                    role="listbox"
                  >
                    {sortedChannels.length === 0 ? (
                      <EmptyState title="No sectors synchronized" sub="Sync mesh configurations…" />
                    ) : (
                      sortedChannels.map((channel, index) => {
                        const isActive = activeId === channel.id;
                        return (
                          <motion.button
                            key={channel.id}
                            className={`nct-row ${isActive ? "nct-row-active" : ""} ${channel.isEmergency ? "nct-row-distress" : ""}`}
                            onClick={() => handleSelect(channel.id, "sectors")}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03, duration: 0.22 }}
                            whileHover={{ x: 2 }}
                            role="option"
                            aria-selected={isActive}
                          >
                            <LiveSignalIcon active={channel.isActive} />

                            <div className="nct-row-body">
                              <div className="nct-row-meta">
                                <span className="nct-name">
                                  {channel.name}
                                  <span className="nct-freq mono"> · {channel.frequency}MHz</span>
                                  {channel.isEmergency && <span className="nct-sos-tag mono">SOS</span>}
                                </span>
                                <span className="nct-users-count mono">
                                  <IconUsers size={10} style={{ marginRight: 2 }} />
                                  {channel.memberCount}
                                </span>
                              </div>
                              <p className="nct-preview-text">{channel.lastActivitySnippet || "Static on channel"}</p>
                            </div>

                            {channel.unreadCount > 0 && (
                              <motion.span
                                className="nct-unread-badge mono"
                                animate={{ scale: [1, 1.25, 1] }}
                                transition={{ duration: 0.35, ease: "easeOut" }}
                              >
                                {channel.unreadCount}
                              </motion.span>
                            )}
                          </motion.button>
                        );
                      })
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {/* ── FOOTER / PRESENCE ── */}
          <footer className="nct-footer">
            <div className="nct-self-row">
              <div className="nct-self-avatar">{(self?.username || "OP").slice(0, 2).toUpperCase()}</div>
              <div className="nct-self-info">
                <span className="nct-self-callsign mono">{self?.username || "OPERATOR_00"}</span>

                <div className="nct-presence-menu-wrap">
                  <button
                    className="nct-presence-trigger"
                    onClick={() => setPresenceMenuOpen(!presenceMenuOpen)}
                    aria-expanded={presenceMenuOpen}
                  >
                    <span className={`nct-presence-dot ${presence === "available" ? "nct-dot-green" : "nct-dot-dnd"}`} />
                    <span className="nct-presence-label mono">
                      {presence === "available" ? "AVAILABLE" : "DO NOT DISTURB"}
                    </span>
                  </button>

                  <AnimatePresence>
                    {presenceMenuOpen && (
                      <>
                        <div className="nct-presence-backdrop" onClick={() => setPresenceMenuOpen(false)} />
                        <motion.div
                          className="nct-presence-menu"
                          initial={{ opacity: 0, y: 4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                        >
                          <button
                            className={`nct-menu-item mono ${presence === "available" ? "nct-menu-active" : ""}`}
                            onClick={() => { setPresence("available"); setPresenceMenuOpen(false); }}
                          >
                            <span className="nct-presence-dot nct-dot-green" />
                            <span>AVAILABLE</span>
                            {presence === "available" && <IconCheck size={12} className="nct-menu-check" />}
                          </button>
                          <button
                            className={`nct-menu-item mono ${presence === "dnd" ? "nct-menu-active" : ""}`}
                            onClick={() => { setPresence("dnd"); setPresenceMenuOpen(false); }}
                          >
                            <span className="nct-presence-dot nct-dot-dnd" />
                            <span>DO NOT DISTURB</span>
                            {presence === "dnd" && <IconCheck size={12} className="nct-menu-check" />}
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="nct-footer-sync mono">
              <IconSatellite size={11} />
              <span>SYNC: OK · v2.4.1</span>
            </div>
          </footer>
        </div>
      </aside>
    </>
  );
}