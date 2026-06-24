/*
SR Follow-ups Playbook live configuration.

Required before publishing:
1. Upload the workbook to Google Drive.
2. Open it with Google Sheets.
3. Share it as: Anyone with the link → Viewer.
4. Paste the Google Sheet ID below.

The app reads only these four sheets:
- Master Table - SR Follow up
- Italian - Master Table - SR Fol
- French - Master Table - SR Foll
- German - Master Table - SR Foll
*/

window.PLAYBOOK_CONFIG = {
  spreadsheetId: "PASTE_GOOGLE_SHEET_ID_HERE",
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
