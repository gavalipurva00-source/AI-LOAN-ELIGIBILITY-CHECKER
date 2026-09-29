/**
 * Google Sheets backend.
 * 1. Create a Google Sheet, then Extensions > Apps Script.
 * 2. Paste this file, Deploy > New deployment > Web app.
 *    Execute as: Me. Who has access: Anyone.
 * 3. Copy the Web app URL into SHEETS_WEBAPP_URL in config.js.
 */
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(data.type)
    || SpreadsheetApp.getActiveSpreadsheet().insertSheet(data.type);
  const keys = Object.keys(data);
  if (sheet.getLastRow() === 0) sheet.appendRow(keys);
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(header.map(h => data[h] !== undefined ? data[h] : ""));
  return ContentService.createTextOutput("ok");
}
