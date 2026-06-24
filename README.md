# SR Follow-ups Playbook — multilingual live version

This is a static GitHub Pages interface connected to a live Google Sheet.

## Data source

The app reads from `config.js` and uses only these sheets:

- `Master Table - SR Follow up` → English
- `Italian - Master Table - SR Fol` → Italian
- `French - Master Table - SR Foll` → French
- `German - Master Table - SR Foll` → German

The first three workbook sheets are not used.

## Required live setup

1. Upload the master workbook to Google Drive.
2. Open it with Google Sheets.
3. Share it as `Anyone with the link` → `Viewer`.
4. Copy the Google Sheet ID from the URL.
5. Paste it into `config.js` in `spreadsheetId`.
6. Upload all files in this ZIP to the GitHub repository root.
7. Enable GitHub Pages from the `main` branch and `/root` folder.

## Column logic

The interface reads headers dynamically. `Action` is displayed before `Time`.

## Files

- `index.html`
- `styles.css`
- `script.js`
- `config.js`
- `.nojekyll`
- `verification.json`
- `README.md`
