function runEnterpriseEngine() {
  // 0. CIRCUIT BREAKER CHECK
  if (CircuitBreaker.isOpen()) return;

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return; 

  try {
    var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
    if (!sheetId) throw new Error("SHEET_ID missing.");

    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName(CONFIG.SHEETS.DATA);
    if (!sheet) {
      console.log("Sheet not found: " + CONFIG.SHEETS.DATA);
      return;
    }

    var data = sheet.getDataRange().getValues();
    
    // 1. IDENTIFY CANDIDATES
    var candidates = [];
    for (var i = 1; i < data.length; i++) { // Skip header
      var row = data[i];
      // Check Campaign
      if (row[CONFIG.COLS.CAMPAIGN] !== CONFIG.ACTIVE_CAMPAIGN) continue;
      
      // Check Status (Must be empty)
      if (row[CONFIG.COLS.STATUS] === "" && row[CONFIG.COLS.EMAIL] && row[CONFIG.COLS.EMAIL].indexOf("@") > -1) {
        candidates.push(i + 1); // 1-based index
        if (candidates.length >= CONFIG.BATCH.SIZE) break;
      }
    }

    if (candidates.length === 0) return;

    // 2. LOCK (The "Commitment")
    // Mark as PROCESSING so no other execution picks them up
    candidates.forEach(function(r) {
      sheet.getRange(r, CONFIG.COLS.STATUS + 1).setValue("PROCESSING...");
    });
    SpreadsheetApp.flush(); // FORCE WRITE

    // 3. EXECUTE
    var processedCount = 0;
    
    candidates.forEach(function(rowIndex) {
      if (CircuitBreaker.isOpen()) return; // Stop if breaker trips mid-batch

      try {
        // Re-read row data to be safe (Optimized: Get just this row)
        var rowValues = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
        
        var email = rowValues[CONFIG.COLS.EMAIL];
        var address = rowValues[CONFIG.COLS.ADDRESS];
        var name = rowValues[CONFIG.COLS.NAME];
        var hailSize = rowValues[CONFIG.COLS.HAIL_SIZE];

        // RULE ENGINE STRATEGY
        var strategy = determineStrategy({ hailSize: hailSize });
        
        var subject = strategy.subject
          .replace("{{ADDRESS}}", address)
          .replace("{{NAME}}", name)
          .replace("{{HAIL_SIZE}}", hailSize);
          
        var opener = strategy.opener
          .replace("{{ADDRESS}}", address)
          .replace("{{NAME}}", name)
          .replace("{{HAIL_SIZE}}", hailSize);

        var link = CONFIG.LINKS.BASE_FORM + encodeURIComponent(address);
        
        // Generate HTML
        var html = NotificationService.getEmailContent({
          name: name,
          opener: opener,
          link: link,
          address: address,
          logo: CONFIG.LINKS.LOGO
        });

        // Send
        NotificationService.sendEmail(email, subject, html);

        // 4. COMMIT SUCCESS
        sheet.getRange(rowIndex, CONFIG.COLS.STATUS + 1).setValue("SENT: " + new Date().toISOString());
        
        // Success record
        CircuitBreaker.recordSuccess();
        processedCount++;

        // Delay
        if (processedCount < candidates.length) {
           Utilities.sleep(Math.floor(Math.random() * (CONFIG.BATCH.MAX_DELAY_MS - CONFIG.BATCH.MIN_DELAY_MS) + CONFIG.BATCH.MIN_DELAY_MS));
        }

      } catch (e) {
        // 5. ROLLBACK / ERROR
        sheet.getRange(rowIndex, CONFIG.COLS.STATUS + 1).setValue("ERROR");
        sheet.getRange(rowIndex, CONFIG.COLS.ERRORS + 1).setValue(e.message);
        
        Utils.log("ERROR", "Failed row " + rowIndex, e.message);
        CircuitBreaker.recordFailure(e.message);
      }
    });

    Utils.log("INFO", "Batch Complete. Sent " + processedCount + " emails.");

  } catch (e) {
    Utils.log("CRITICAL", "Engine Failure", e.stack);
  } finally {
    lock.releaseLock();
  }
}

function determineStrategy(rowObject) {
  // Find the first rule that matches
  for (var i = 0; i < CONFIG.RULES.length; i++) {
    if (CONFIG.RULES[i].condition(rowObject)) {
      return CONFIG.RULES[i];
    }
  }
  return CONFIG.RULES[CONFIG.RULES.length - 1]; // Return last (default)
}
