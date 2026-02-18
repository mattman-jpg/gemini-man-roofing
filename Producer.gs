/**
 * PRODUCER (The Finder)
 * Scans for work and pushes to Queue.
 * Runs Hourly.
 */
function runProducer() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;

  try {
    var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
    var dataSheet = ss.getSheetByName(CONFIG.SHEETS.DATA);
    var queueSheet = ss.getSheetByName(CONFIG.SHEETS.QUEUE);

    if (!dataSheet || !queueSheet) {
      CloudLogger.error("CRITICAL: Missing Data or Queue Sheet");
      return;
    }
    
    // 1. Find Unprocessed Rows (Optimized)
    var data = dataSheet.getDataRange().getValues();
    var jobs = [];
    var updates = []; // To mark rows as QUEUED
    
    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        
        // Campaign Check
        if (row[CONFIG.COLS.CAMPAIGN] !== CONFIG.ACTIVE_CAMPAIGN) continue;

        // Check if Status is empty (Ready to process)
        if (row[CONFIG.COLS.STATUS] === "") {
            var payload = {
                name: row[CONFIG.COLS.NAME],
                email: row[CONFIG.COLS.EMAIL],
                address: row[CONFIG.COLS.ADDRESS],
                hailSize: row[CONFIG.COLS.HAIL_SIZE]
            };
            
            jobs.push([
                Utilities.getUuid(), // Job ID
                i + 1,               // Row Index
                "EMAIL_SEND",        // Type
                JSON.stringify(payload),
                "PENDING",
                new Date()
            ]);
            
            // Mark as QUEUED immediately
            updates.push({ r: i + 1, c: CONFIG.COLS.STATUS + 1, v: "QUEUED" });
        }
    }
    
    // 2. Bulk Write to Queue
    if (jobs.length > 0) {
        queueSheet.getRange(queueSheet.getLastRow() + 1, 1, jobs.length, 6).setValues(jobs);
        
        // Bulk Update Statuses
        updates.forEach(function(u) {
            dataSheet.getRange(u.r, u.c).setValue(u.v);
        });
        
        CloudLogger.log("Producer: Enqueued jobs", jobs.length);
    } else {
        console.log("Producer: No new jobs found.");
    }

  } catch (e) {
    CloudLogger.error("Producer Failed", e);
  } finally {
    lock.releaseLock();
  }
}
