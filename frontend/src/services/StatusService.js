let listeners = [];
function notifyListeners() {
  listeners.forEach(cb => cb());
}
export const StatusService = {
  getOwnStatus() {
    const data = localStorage.getItem("relay_own_status");
    return data ? JSON.parse(data) : { status: "unknown", note: "", timestamp: Date.now() / 1000 };
  },
  broadcastStatus(status, note) {
    const ownStatus = {
      status, 
      note: note.slice(0, 140),
      timestamp: Date.now() / 1000
    };
    localStorage.setItem("relay_own_status", JSON.stringify(ownStatus));
    notifyListeners();
  },
  getContacts() {
    const data = localStorage.getItem("relay_contacts");
    return data ? JSON.parse(data) : [];
  },
  addContact(name) {
    const contacts = this.getContacts();
    const cleanName = name.trim();
    if (!cleanName || contacts.some(c => c.name.toLowerCase() === cleanName.toLowerCase())) {
      return false;
    }
    contacts.push({ name: cleanName });
    localStorage.setItem("relay_contacts", JSON.stringify(contacts));
    const feed = this.getRawFeed();
    if (!feed.some(entry => entry.name.toLowerCase() === cleanName.toLowerCase())) {
      feed.push({
        name: cleanName,
        status: "unknown",
        note: "Initial status",
        timestamp: Date.now() / 1000
      });
      this.saveRawFeed(feed);
    }
    notifyListeners();
    return true;
  },
  removeContact(name) {
    let contacts = this.getContacts();
    contacts = contacts.filter(c => c.name.toLowerCase() !== name.toLowerCase());
    localStorage.setItem("relay_contacts", JSON.stringify(contacts));
    let feed = this.getRawFeed();
    feed = feed.filter(entry => entry.name.toLowerCase() !== name.toLowerCase());
    this.saveRawFeed(feed);
    notifyListeners();
  },
  getRawFeed() {
    const data = localStorage.getItem("relay_status_feed");
    return data ? JSON.parse(data) : [];
  },
  saveRawFeed(feed) {
    localStorage.setItem("relay_status_feed", JSON.stringify(feed));
  },
  getFeed() {
    const feed = this.getRawFeed();
    return [...feed].sort((a, b) => {
      const aIsHelp = a.status === "help" ? 0 : 1;
      const bIsHelp = b.status === "help" ? 0 : 1;
      if (aIsHelp !== bIsHelp) {
        return aIsHelp - bIsHelp;
      }
      return b.timestamp - a.timestamp;
    });
  },
  subscribeToUpdates(callback) {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(cb => cb !== callback);
    };
  },
  syncNow() {
    const contacts = this.getContacts();
    if (contacts.length === 0) {
      this.addContact("KB9VTS");
      this.addContact("COORD-EAST");
      this.addContact("N6XPR");
    }
    const currentContacts = this.getContacts();
    const mockStatuses = ["safe", "help", "unknown"];
    const mockNotes = {
      safe: [
        "Shelter established, solar backup holding.",
        "All clear in Grid 3A. Plenty of water.",
        "Safe at Base 1. Monitoring frequencies."
      ],
      help: [
        "Need medical supplies. Batteries critical.",
        "Water source contaminated. Requesting filtration units.",
        "Trapped behind roadblock. Clear path needed."
      ],
      unknown: [
        "Signal fading. Out of range.",
        "Relay degraded, trying backup generator.",
        "Awaiting check-in from Sector team."
      ]
    };
    const numUpdates = Math.min(currentContacts.length, Math.floor(Math.random() * 2) + 2); 
    const shuffled = [...currentContacts].sort(() => 0.5 - Math.random());
    const feed = this.getRawFeed();
    for (let i = 0; i < numUpdates; i++) {
      const contact = shuffled[i];
      const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];
      const possibleNotes = mockNotes[randomStatus];
      const randomNote = possibleNotes[Math.floor(Math.random() * possibleNotes.length)];
      const existingIdx = feed.findIndex(entry => entry.name.toLowerCase() === contact.name.toLowerCase());
      const newEntry = {
        name: contact.name,
        status: randomStatus,
        note: randomNote,
        timestamp: Date.now() / 1000
      };
      if (existingIdx !== -1) {
        feed[existingIdx] = newEntry;
      } else {
        feed.push(newEntry);
      }
    }
    this.saveRawFeed(feed);
    notifyListeners();
  }
};
