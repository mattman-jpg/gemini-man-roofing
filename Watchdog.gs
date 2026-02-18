/**
 * WATCHDOG MONITOR
 * Runs hourly to check system health.
 */
function runWatchdog() {
  try {
      var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
      var configSheet = ss.getSheetByName(CONFIG.SHEETS.CONFIG);
      
      // 1. Check Heartbeat (Cell Z1)
      var heartbeatCell = configSheet.getRange("Z1");
      var lastRun = new Date(heartbeatCell.getValue());
      var now = new Date();
      var diffMinutes = (now - lastRun) / 1000 / 60;
      
      if (diffMinutes > 45) { // Threshold: 45 mins (since engine runs every 15)
        MailApp.sendEmail(
          PropertiesService.getScriptProperties().getProperty('OWNER_EMAIL'), 
          "🚨 SYSTEM DOWN: Hailstorm Engine Stalled", 
          "The engine has not run for " + Math.round(diffMinutes) + " minutes. Last heartbeat: " + lastRun + ". Please check triggers and logs."
        );
      }
      
      // 2. Check Queue Depth
      var queueSheet = ss.getSheetByName(CONFIG.SHEETS.QUEUE);
      // Rough estimate of pending jobs
      var pending = 0;
      if (queueSheet.getLastRow() > 1) {
          var statuses = queueSheet.getRange("E2:E" + queueSheet.getLastRow()).getValues();
          pending = statuses.filter(function(r) { return r[0] === "PENDING"; }).length;
      }
      
      if (pending > 100) {
        MailApp.sendEmail(
          PropertiesService.getScriptProperties().getProperty('OWNER_EMAIL'), 
          "⚠️ QUEUE BACKLOG ALERT", 
          "There are " + pending + " pending jobs. We might be hitting rate limits or the consumer is too slow."
        );
      }
      
  } catch (e) {
      console.error("Watchdog Failed", e);
  }
}
