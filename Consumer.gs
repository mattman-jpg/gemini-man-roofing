/**
 * CONSUMER (The Worker)
 * Processes jobs from the Queue.
 * Runs every 5 mins.
 */
function runConsumer() {
  // 1. CHECKS
  try { checkKillSwitch(); } catch(e) { console.warn(e.message); return; }
  if (CircuitBreaker.isOpen()) return;

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;

  try {
    var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
    var queueSheet = ss.getSheetByName(CONFIG.SHEETS.QUEUE);
    
    // HEARTBEAT for Watchdog
    ss.getSheetByName(CONFIG.SHEETS.CONFIG).getRange("Z1").setValue(new Date());

    // 2. Fetch Pending Jobs
    // We only read the first 100 rows to be fast
    var queueData = queueSheet.getRange(2, 1, Math.min(queueSheet.getLastRow() - 1, 100), 6).getValues(); 
    var tasks = [];
    
    for (var i = 0; i < queueData.length; i++) {
        if (queueData[i][4] === "PENDING") { // Column 5 is Status
            tasks.push({ 
                index: i + 2, // Sheet Row Index (2 because we started at row 2)
                payload: JSON.parse(queueData[i][3]) 
            });
            if (tasks.length >= CONFIG.BATCH.SIZE) break;
        }
    }
    
    if (tasks.length === 0) return;

    // 3. Process Jobs
    var processedCount = 0;
    tasks.forEach(function(task) {
        if (CircuitBreaker.isOpen()) return;
        
        // RATE LIMIT CHECK
        if (!RateLimiter.check()) {
            console.log("Consumer: Rate Limit Hit. Pausing processing.");
            return; 
        }

        try {
            var p = task.payload;
            
            // IDEMPOTENCY CHECK
            var idempotencyKey = Idempotency.generateKey(p.email, CONFIG.ACTIVE_CAMPAIGN);
            if (Idempotency.isDuplicate(idempotencyKey)) {
                console.warn("Skipping Duplicate: " + p.email);
                queueSheet.getRange(task.index, 5).setValue("DUPLICATE");
                queueSheet.getRange(task.index, 6).setValue(new Date()); 
                return;
            }
            
            // DETERMINE STRATEGY
            var strategy = determineStrategy({ hailSize: p.hailSize });
            
            var subject = strategy.subject
            .replace("{{ADDRESS}}", p.address)
            .replace("{{NAME}}", p.name)
            .replace("{{HAIL_SIZE}}", p.hailSize);
            
            var opener = strategy.opener
            .replace("{{ADDRESS}}", p.address)
            .replace("{{NAME}}", p.name)
            .replace("{{HAIL_SIZE}}", p.hailSize);

            var link = CONFIG.LINKS.BASE_FORM + encodeURIComponent(p.address);

            // HTML
            var html = NotificationService.getEmailContent({
                name: p.name,
                opener: opener,
                link: link,
                address: p.address,
                logo: CONFIG.LINKS.LOGO
            });

            // SEND
            NotificationService.sendEmail(p.email, subject, html);
            
            // UPDATE QUEUE: COMPLETED
            queueSheet.getRange(task.index, 5).setValue("COMPLETED");
            queueSheet.getRange(task.index, 6).setValue(new Date()); 
            
            // RECORD IDEMPOTENCY
            Idempotency.record(idempotencyKey);
            
            CircuitBreaker.recordSuccess();
            processedCount++;

        } catch (e) {
            // UPDATE QUEUE: FAILED
            queueSheet.getRange(task.index, 5).setValue("FAILED");
            queueSheet.getRange(task.index, 6).setNote(e.message);
            
            CloudLogger.error("Consumer Task Failed", e);
            CircuitBreaker.recordFailure(e.message);
        }
    });
    
    if (processedCount > 0) {
        CloudLogger.log("Consumer: Processed jobs", processedCount);
    }

  } catch (e) {
    CloudLogger.error("Consumer Crash", e);
  } finally {
    lock.releaseLock();
  }
}

function checkKillSwitch() {
  var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
  var configSheet = ss.getSheetByName(CONFIG.SHEETS.CONFIG);
  if (!configSheet) return; // Ignore if sheet doesn't exist yet
  
  var status = configSheet.getRange("B1").getValue();
  
  if (status !== "ONLINE") {
    throw new Error("⛔ SYSTEM KILL SWITCH ACTIVE. EXECUTION HALTED.");
  }
}
