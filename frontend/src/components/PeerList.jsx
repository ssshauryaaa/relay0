import "./PeerList.css";
import { audioManager } from "../utils/audio.js";
import {
  IconRadio,
  IconBroadcast,
  IconCompass,
  IconAnchor,
  IconWifi,
  IconBulb,
  IconMessage,
  IconMap2,
  IconClipboardList,
} from "@tabler/icons-react";

const DEVICE_ICONS = {
  radio: IconRadio,
  lantern: IconBulb,
  compass: IconCompass,
  beacon: IconBroadcast,
  anchor: IconAnchor,
  signal: IconWifi,
};

function timeAgo(ts) {
  if (!ts) return "never";
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const NAV_ITEMS = [
  { key: "channel", label: "Network Channel", Icon: IconMessage },
  { key: "board", label: "Needs & Resources", Icon: IconClipboardList },
  { key: "map", label: "Network Map", Icon: IconMap2 },
];

export default function PeerList({
  peers,
  self,
  activeView,
  activePeer,
  onSelectChannel,
  onSelectPeer,
  onSelectBoard,
  onSelectMap,
  unreadPeers,
}) {
  const others = peers.filter((p) => p.username !== self?.username);
  const onlineCount = others.filter((p) => p.status === "online").length;

  const handleNavClick = (callback) => {
    audioManager.playKeystroke();
    callback();
  };

  const navCallbacks = {
    channel: onSelectChannel,
    board: onSelectBoard,
    map: onSelectMap,
  };

  return (
    <nav className="peer-list" aria-label="Network navigation">
      <div className="peer-list-section">
        {NAV_ITEMS.map(({ key, label, Icon }, i) => {
          const isActive = activeView === key;
          return (
            <button
              key={key}
              className={`nav-row ${isActive ? "nav-row-active active-teal" : ""}`}
              style={{ "--row-i": i }}
              onClick={() => handleNavClick(navCallbacks[key])}
            >
              <span className="nav-row-glyph" aria-hidden="true">
                <Icon size={15} />
              </span>
              <span>{label}</span>
              {isActive && <span className="nav-row-active-dot" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <div className="peer-list-divider">
        <span className="field-label">
          Reachable peers —{" "}
          <span className="peer-online-count">
            {onlineCount > 0 && <span className="peer-online-count-dot" aria-hidden="true" />}
            {onlineCount} online
          </span>
        </span>
      </div>

      <div className="peer-list-scroll">
        {others.length === 0 && (
          <div className="peer-empty">No other devices detected on this network yet.</div>
        )}
        {others.map((peer, i) => {
          const justOffline =
            peer.status === "offline" &&
            peer.lastSeen &&
            Date.now() / 1000 - peer.lastSeen < 30;
          const dotClass =
            peer.status === "online"
              ? "status-online"
              : justOffline
                ? "status-just-offline"
                : "status-offline";

          const DeviceIcon = DEVICE_ICONS[peer.deviceIcon] || IconRadio;
          const isActive = activeView === "dm" && activePeer === peer.username;
          const isUnread = unreadPeers?.has(peer.username);

          return (
            <button
              key={peer.username}
              className={`peer-row ${isActive ? "nav-row-active active-teal" : ""} ${isUnread ? "peer-row-unread" : ""
                }`}
              style={{ "--row-i": i }}
              onClick={() => handleNavClick(() => onSelectPeer(peer.username))}
            >
              <span className={`status-dot ${dotClass}`} />
              <span className="peer-row-glyph" aria-hidden="true">
                <DeviceIcon size={14} />
              </span>
              <span className="peer-row-name">{peer.username}</span>
              {isUnread && <span className="peer-unread" aria-label="unread" />}
              <span className="peer-row-status field-label">
                {peer.status === "online" ? "online" : timeAgo(peer.lastSeen)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}