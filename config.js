/*
SR Follow-ups Playbook live configuration.
Source: published Google Sheet.
*/

window.PLAYBOOK_CONFIG = {
  spreadsheetId: "e/2PACX-1vQX4MLq0Yc7mPmji_kh8Bg_OH2IY8kpNT8B1R-5grIXR2hfiqVyCZJ9ZIyr6CYhsQ",
  range: "A:K",
  flowOrder: ["Before Showroom", "Follow up", "Future"],
  languages: {
    it: {
      label: "Italian",
      sheetNames: ["Italian - Master Table - SR Fol"],
      gid: ""
    },
    en: {
      label: "English",
      sheetNames: ["Master Table - SR Follow up"],
      gid: ""
    },
    fr: {
      label: "French",
      sheetNames: ["French - Master Table - SR Foll"],
      gid: ""
    },
    de: {
      label: "German",
      sheetNames: ["German - Master Table - SR Foll"],
      gid: ""
    }
  }
};

/*
Allows the app to read a Google Sheet published with a /d/e/... public URL.
Do not remove.
*/
(function () {
  const publishedId = window.PLAYBOOK_CONFIG.spreadsheetId;
  const originalEncodeURIComponent = window.encodeURIComponent;

  window.encodeURIComponent = function (value) {
    if (String(value) === publishedId) {
      return publishedId;
    }
    return originalEncodeURIComponent(value);
  };
})();
