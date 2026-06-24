/*
SR Follow-ups Playbook live configuration.
Source: normal Google Sheet URL.
*/

window.PLAYBOOK_CONFIG = {
  spreadsheetId: "1eHu8ubYMewWz2GucQqpLhTgaRbVwllVB",
  range: "A:K",
  flowOrder: ["Before Showroom", "Follow up", "Future"],
  languages: {
    it: {
      label: "Italian",
      sheetNames: ["Italian - Master Table - SR Fol", "Italian Master Table SR follow-up"],
      gid: ""
    },
    en: {
      label: "English",
      sheetNames: ["Master Table - SR Follow up", "Master Table SR follow-up"],
      gid: ""
    },
    fr: {
      label: "French",
      sheetNames: ["French - Master Table - SR Foll", "French Master Table SR follow-up"],
      gid: ""
    },
    de: {
      label: "German",
      sheetNames: ["German - Master Table - SR Foll", "German Master Table SR follow-up"],
      gid: ""
    }
  }
};
