import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { StatusService } from "../services/StatusService";
import { IconUsers, IconUserPlus } from "@tabler/icons-react";
export default function ContactList() {
  const [contacts, setContacts] = useState(StatusService.getContacts());
  const [nameInput, setNameInput] = useState("");
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false });
  function handleMouseMove(e) {
    const r = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 8;
    const y = ((e.clientY - r.top) / r.height - 0.5) * -8;
    setTilt({ x, y, active: true });
  }
  function handleMouseLeave() {
    setTilt({ x: 0, y: 0, active: false });
  }
  useEffect(() => {
    const handleUpdate = () => {
      setContacts(StatusService.getContacts());
    };
    return StatusService.subscribeToUpdates(handleUpdate);
  }, []);
  const handleAdd = (e) => {
    e.preventDefault();
    const cleanName = nameInput.trim().toUpperCase();
    if (!cleanName) return;
    const added = StatusService.addContact(cleanName);
    if (added) {
      setNameInput("");
    } else {
      alert("Callsign is empty or already exists.");
    }
  };
  const handleRemove = (name) => {
    if (confirm(`Stop tracking status for ${name}?`)) {
      StatusService.removeContact(name);
    }
  };
  return (
    <motion.div
      ref={cardRef}
      className="sb-card"
      style={{
        transform: tilt.active
          ? `perspective(800px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) scale(1.015)`
          : "perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)",
        transition: tilt.active ? "transform 0.08s ease-out" : "transform 0.3s ease-out",
        borderColor: tilt.active ? "rgba(14,240,251,0.2)" : undefined,
        boxShadow: tilt.active
          ? "0 12px 30px rgba(0,0,0,0.5), 0 0 20px rgba(14,240,251,0.06)"
          : undefined,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <h2 className="sb-card-title">
        <IconUsers size={13} />
        Monitored Contacts
      </h2>
      <form className="sb-contact-form" onSubmit={handleAdd}>
        <input
          type="text"
          className="sb-contact-input"
          placeholder="Callsign (e.g. WB4TTZ)"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          aria-label="Add contact callsign"
          maxLength={15}
        />
        <button type="submit" className="sb-contact-add-btn">
          Add
        </button>
      </form>
      {contacts.length === 0 ? (
        <div className="sb-empty" style={{ padding: "20px" }}>
          <IconUserPlus size={20} style={{ color: "var(--sb-text-dim)", opacity: 0.6 }} />
          <h3 className="sb-empty-title" style={{ fontSize: "11px" }}>No monitored contacts</h3>
          <p className="sb-empty-desc" style={{ fontSize: "10px" }}>
            Add callsigns above to track their status.
          </p>
        </div>
      ) : (
        <div className="sb-contact-list">
          {contacts.map((contact) => (
            <div key={contact.name} className="sb-contact-item">
              <span className="sb-contact-name">{contact.name}</span>
              <button
                type="button"
                className="sb-contact-remove-btn"
                onClick={() => handleRemove(contact.name)}
                title={`Remove ${contact.name}`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
