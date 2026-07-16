import "./StatusBoard.css";
import StatusButton from "./StatusButton";
import StatusFeed from "./StatusFeed";
import ContactList from "./ContactList";
export default function StatusBoardView({ peers, self, onUpdateStatus }) {
  return (
    <div className="sb-page">
      <div className="sb-field" aria-hidden="true">
        <div className="sb-field-beam sb-field-beam-a" />
        <div className="sb-field-beam sb-field-beam-b" />
      </div>
      <div className="sb-grid" style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <StatusButton peers={peers} self={self} onUpdateStatus={onUpdateStatus} />
          <ContactList />
        </div>
        <StatusFeed peers={peers} self={self} />
      </div>
    </div>
  );
}
