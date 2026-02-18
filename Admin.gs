/**
 * ADMIN UI
 * Adds custom menu to Google Sheets for easy management.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('⚡ Hailstorm Admin')
    .addItem('▶ Run Batch Now', 'runEnterpriseEngine')
    .addSeparator()
    .addItem('⚙️ Setup Environment', 'setupEnterpriseEnvironment')
    .addItem('📜 View System Logs', 'openLogSheet')
    .addSeparator()
    .addSubMenu(ui.createMenu('🛑 Emergency')
        .addItem('Clear Lock', 'clearOneLock')
        .addItem('Stop All Triggers', 'stopAllTriggers'))
    .addToUi();
}

function openLogSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.LOGS);
  if (sheet) ss.setActiveSheet(sheet);
}

function clearOneLock() {
  var lock = LockService.getScriptLock();
  lock.releaseLock();
  SpreadsheetApp.getUi().alert("Script Lock Released (if you held it).");
}

function stopAllTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) { ScriptApp.deleteTrigger(t); });
  SpreadsheetApp.getUi().alert("All Automation Stopped. Run 'Setup Environment' to restart.");
}
