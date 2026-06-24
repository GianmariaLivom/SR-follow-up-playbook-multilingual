/*
SR Follow-ups Playbook live configuration.
Source: native Google Sheet, using verified sheet GIDs and sheet-name fallback.
*/

window.PLAYBOOK_CONFIG = {
  spreadsheetId: "1KQsHscGA8OhX8eUNQMvlA4G4K1IZv4XWJ9KX1eOoHMI",
  range: "A:K",
  flowOrder: ["Before Showroom", "Follow up", "Future"],
  languages: {
    it: {
      label: "Italian",
      sheetNames: ["Italian - Master Table - SR Fol"],
      gid: "1500932613"
    },
    en: {
      label: "English",
      sheetNames: ["Master Table - SR Follow up"],
      gid: "1411724643"
    },
    fr: {
      label: "French",
      sheetNames: ["French - Master Table - SR Foll"],
      gid: "343677981"
    },
    de: {
      label: "German",
      sheetNames: ["German - Master Table - SR Foll"],
      gid: "1136156832"
    }
  }
};
