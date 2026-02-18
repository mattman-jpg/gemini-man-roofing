function doPost(e) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return ContentService.createTextOutput(JSON.stringify({status: "busy"}));

  try {
    // 1. Security Check
    // You must send "key": "YOUR_SECRET_KEY" in your JSON payload from the website
    if (!Utils.isAuthenticated(e)) {
      return ContentService.createTextOutput(JSON.stringify({error: "Unauthorized"})).setMimeType(ContentService.MimeType.JSON);
    }

    var params = JSON.parse(e.postData.contents);
    var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
    if (!sheetId) throw new Error("SHEET_ID missing.");

    var ss = SpreadsheetApp.openById(sheetId);
    var timestamp = new Date();

    // 2. Route by Type
    if (params.type === 'commercial') {
      var sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);
      if (!sheet) { sheet = ss.insertSheet(CONFIG.SHEETS.LEADS); }
      sheet.appendRow([timestamp, params.name, params.phone, params.company, "Commercial", "Web"]);
      
      NotificationService.sendSMS(null, "🏢 COMMERCIAL LEAD: " + params.company);
      
    } else if (params.type === 'referral') {
      var sheet = ss.getSheetByName(CONFIG.SHEETS.REFERRALS);
      if (!sheet) { sheet = ss.insertSheet(CONFIG.SHEETS.REFERRALS); }
      sheet.appendRow([timestamp, params.referrer, params.ref_phone, params.neighbor, params.address]);
      
      NotificationService.sendEmail(PropertiesService.getScriptProperties().getProperty('OWNER_EMAIL'), "New Referral", "Referrer: " + params.referrer);
    } else {
      // Standard
      var sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);
      if (!sheet) { sheet = ss.insertSheet(CONFIG.SHEETS.LEADS); }
      sheet.appendRow([timestamp, params.name, params.phone, params.zip, "Residential", "Web"]);
      
      NotificationService.sendSMS(null, "🏠 NEW LEAD: " + params.name + " in " + params.zip);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Utils.log("ERROR", "WebHook Failed", error.message);
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
