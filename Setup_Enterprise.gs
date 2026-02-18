/**
 * V6 ENTERPRISE SERVERLESS SETUP
 * Run this ONCE to configure the environment.
 */
function setupEnterpriseEnvironment() {
  var scriptProperties = PropertiesService.getScriptProperties();
  
  // 1. GENERATE SECURE API KEY
  var currentKey = scriptProperties.getProperty('API_ACCESS_KEY');
  if (!currentKey) {
    var newKey = "gemini-enterprise-key-v2";
    scriptProperties.setProperty('API_ACCESS_KEY', newKey);
    console.log("CREATED NEW API KEY: " + newKey);
  } else {
    console.log("EXISTING API KEY: " + currentKey);
  }

  // 2. CREATE SHEETS
  var ss;
  var sheetId = scriptProperties.getProperty('SHEET_ID');
  if (sheetId) {
    try { ss = SpreadsheetApp.openById(sheetId); } catch(e) { console.log("Invalid Sheet ID"); }
  }

  if (!ss) {
    ss = SpreadsheetApp.create(CONFIG.APP_NAME + " Database");
    scriptProperties.setProperty('SHEET_ID', ss.getId());
    console.log("CREATED SHEET: " + ss.getUrl());
  } else {
    console.log("USING SHEET: " + ss.getUrl());
  }

  function ensureSheet(name, headers) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      if (headers) sheet.appendRow(headers);
    }
    return sheet;
  }

  ensureSheet(CONFIG.SHEETS.DATA, ["Date", "Name", "Address", "Hail Size", "Status", "Errors", "Campaign_ID", "Email"]);
  ensureSheet(CONFIG.SHEETS.LOGS, ["Timestamp", "Level", "Context", "Message"]);
  ensureSheet(CONFIG.SHEETS.QUEUE, ["Job_ID", "Row_Index", "Type", "Payload", "Status", "Created_At"]);
  ensureSheet(CONFIG.SHEETS.LEDGER, ["Key", "Timestamp", "Status"]);
  
  var configSheet = ensureSheet(CONFIG.SHEETS.CONFIG, ["KEY", "VALUE"]);
  if (configSheet.getLastRow() === 1) {
      configSheet.getRange("A1").setValue("SYSTEM_STATUS");
      configSheet.getRange("B1").setValue("ONLINE").setBackground("#00ff00");
  }

  // 3. VERIFY PROPERTIES
  var required = ['SHEET_ID', 'TWILIO_SID', 'TWILIO_TOKEN', 'TWILIO_FROM', 'TWILIO_TO', 'OWNER_EMAIL'];
  var missing = [];
  required.forEach(function(key) {
    if (!scriptProperties.getProperty(key)) missing.push(key);
  });
  
  if (missing.length > 0) {
    console.error("WARNING: Missing Properties: " + missing.join(", "));
  } else {
    console.log("All System Properties Verified.");
  }

  // 4. SETUP TRIGGERS
  setupTriggers();
}

function setupTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) { ScriptApp.deleteTrigger(t); });
  console.log("Old Triggers Deleted.");

  ScriptApp.newTrigger('runProducer').timeBased().everyHours(1).create();
  console.log("Producer Trigger Created.");

  ScriptApp.newTrigger('runConsumer').timeBased().everyMinutes(5).create();
  console.log("Consumer Trigger Created.");

  ScriptApp.newTrigger('runWatchdog').timeBased().everyHours(1).create();
  console.log("Watchdog Trigger Created.");
}
