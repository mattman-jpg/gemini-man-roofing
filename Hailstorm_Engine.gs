/**
 * HAILSTORM ENGINE - MICRO-BATCHED EMAIL SENDER
 * 
 * CORE FUNCTIONALITY:
 * 1. Reads specific "Lead Data" sheet.
 * 2. Filters for unsent rows.
 * 3. Sends max 5 emails per execution (Micro-Batching).
 * 4. Waits 15-30 seconds between sends.
 * 5. Updates Status to avoid duplicate sends.
 * 
 * NEW: WEB APP RECEIVER for Website Forms
 * 6. `doPost(e)` handles incoming JSON from website.
 * 7. Saves to 'Leads' tab.
 * 8. Sends Immediate Notification to Owner.
 */

// --- CONFIGURATION ---
var CONFIG = {
  SHEET_NAME: "Sheet1", // For the Email Sender
  LEADS_TAB: "Leads",   // For incoming form submissions
  REFERRALS_TAB: "Referrals", // For referral submissions
  OWNER_EMAIL: "help@geminimanroofing.com",
  MAX_BATCH_SIZE: 5,     // STRICT LIMIT: 5 emails per run to prevent timeouts
  BASE_FORM_URL: "https://geminimanroofing.com/?address=", 
  SENDER_NAME: "Gemini Man Roofing",
  REPLY_TO: "help@geminimanroofing.com",
  
  // DATA MAPPING - Adjust these indices (0-based) to match your Excel columns
  // Default: A=0, B=1, C=2, D=3, E=4, F=5
  COLUMN_MAP: {
    NAME: 0,      // Column A
    EMAIL: 1,     // Column B
    ADDRESS: 2,   // Column C
    HAIL_SIZE: 3, // Column D
    STATUS: 4,    // Column E
    ERRORS: 5     // Column F
  },
  
  // LOGO SETTINGS
  LOGO_URL: "https://via.placeholder.com/300x80?text=GEMINI+MAN+ROOFING", 
  LOGO_WIDTH: "300",

  // TWILIO CONFIG
  TWILIO: {
    ACCOUNT_SID: "ACa83bbeac76fbc101b0010cbc1cadc7d5",
    AUTH_TOKEN: "e4ff975ad2b76b8760a9a36193f3d2f5",
    FROM_NUMBER: "+18665182906",
    TO_NUMBER: "+19408674778"
  }
};

// --- SPINTAX ENGINE ---
// Randomly selects subject lines and openers to vary email content
var SPINTAX = {
  SUBJECTS: [
    "Question about the hail damage at {{ADDRESS}}",
    "Inspection report for {{ADDRESS}} (Hail Storm)",
    "Regarding the roof at {{ADDRESS}} - Urgent?"
  ],
  OPENERS: [
    "I was driving by {{ADDRESS}} and noticed some potential storm markers.",
    "Our team has been inspecting roofs in your neighborhood near {{ADDRESS}} following the recent storm.",
    "I am reaching out because data indicates {{ADDRESS}} may have been in the path of the recent hail event."
  ]
};

function runHailstormEngine() {
  // STANDALONE MODE: Get ID from Properties or hardcoded config
  var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  
  if (!sheetId) {
    console.error("SHEET_ID not found in Script Properties. Run 'setupProject()' first.");
    return;
  }

  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  // validate sheet exists
  if (!sheet) {
    console.error("Sheet not found: " + CONFIG.SHEET_NAME);
    return;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return; // No data

  // Read all data - assuming headers are in Row 1
  // Columns: A:Name, B:Email, C:Address, D:Hail Size, E:Status, F:Errors
  var range = sheet.getRange(2, 1, lastRow - 1, 6); 
  var data = range.getValues();
  
  var emailsSentCount = 0;

  for (var i = 0; i < data.length; i++) {
    // STOP if we hit the limit
    if (emailsSentCount >= CONFIG.MAX_BATCH_SIZE) {
      console.log("Batch limit reached (" + CONFIG.MAX_BATCH_SIZE + "). Stopping execution.");
      break;
    }

    var row = data[i];
    var rowIndex = i + 2; // Adjust for 0-based array and 1-based header row
    
    var name = row[CONFIG.COLUMN_MAP.NAME];
    var email = row[CONFIG.COLUMN_MAP.EMAIL];
    var address = row[CONFIG.COLUMN_MAP.ADDRESS];
    var hailSize = row[CONFIG.COLUMN_MAP.HAIL_SIZE];
    var status = row[CONFIG.COLUMN_MAP.STATUS];
    
    // FILTER: Check if Email is valid AND Status is empty
    if (isValidEmail(email) && status === "") {
      
      try {
        // 1. GENERATE LINK
        // encodeURIComponent is CRITICAL for addresses with spaces
        var prefilledLink = CONFIG.BASE_FORM_URL + encodeURIComponent(address);
        
        // 2. PREPARE CONTENT
        var subject = getRandomItem(SPINTAX.SUBJECTS).replace("{{ADDRESS}}", address);
        var opener = getRandomItem(SPINTAX.OPENERS).replace("{{ADDRESS}}", address);
        
        var htmlBody = createEmailTemplate(name, opener, prefilledLink, address);
        
        // 3. SEND EMAIL
        GmailApp.sendEmail(email, subject, "Please enable HTML to view this message.", {
          htmlBody: htmlBody
          // name: CONFIG.SENDER_NAME // Optional
        });
        
        // 4. UPDATE STATUS
        var timestamp = new Date();
        sheet.getRange(rowIndex, CONFIG.COLUMN_MAP.STATUS + 1).setValue("Sent: " + timestamp);
        emailsSentCount++;
        
        console.log("Sent email to: " + email);

        // 5. EXECUTION DELAY (Random 15s - 30s)
        if (emailsSentCount < CONFIG.MAX_BATCH_SIZE) { // Don't sleep after the very last one if batch is done
            var sleepMs = Math.floor(Math.random() * (30000 - 15000 + 1) + 15000);
            console.log("Sleeping for " + sleepMs + "ms...");
            Utilities.sleep(sleepMs);
        }

      } catch (e) {
        // ERROR HANDLING
        console.error("Failed row " + rowIndex + ": " + e.message);
        sheet.getRange(rowIndex, CONFIG.COLUMN_MAP.ERRORS + 1).setValue("Error: " + e.stack);
      }
    }
  }
}

function sendTwilioSMS(body) {
  var url = "https://api.twilio.com/2010-04-01/Accounts/" + CONFIG.TWILIO.ACCOUNT_SID + "/Messages.json";
  
  var payload = {
    "To": CONFIG.TWILIO.TO_NUMBER,
    "From": CONFIG.TWILIO.FROM_NUMBER,
    "Body": body
  };

  var options = {
    "method": "post",
    "payload": payload,
    "headers": {
      "Authorization": "Basic " + Utilities.base64Encode(CONFIG.TWILIO.ACCOUNT_SID + ":" + CONFIG.TWILIO.AUTH_TOKEN)
    }
  };

  try {
    UrlFetchApp.fetch(url, options);
    console.log("SMS Sent via Twilio");
  } catch (e) {
    console.error("Twilio Error: " + e.toString());
  }
}

// --- HELPER FUNCTIONS ---

function createEmailTemplate(name, opener, link, address) {
  // Simple, clean HTML template
  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${CONFIG.LOGO_URL}" width="${CONFIG.LOGO_WIDTH}" alt="Company Logo" style="display: block; margin: 0 auto;">
      </div>

      <p>Hi ${name},</p>
      
      <p>${opener}</p>
      
      <p>Given the recent activity, it is highly recommended to verify if there is significant damage before the filing window closes.</p>
      
      <br>
      <a href="${link}" style="background-color: #d32f2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
        REQUEST FREE INSPECTION FOR: ${address}
      </a>
      <br><br>
      
      <p style="font-size: 12px; color: #666;">
        <br>
        <a href="#" style="color: #999;">Opt-out</a> | Compliant with CAN-SPAM Act
      </p>
    </div>
  `;
}

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function isValidEmail(email) {
  return email && email.includes("@") && email.includes(".");
}

/**
 * TRIGGER SETUP
 * Run this function ONCE manually to start the automation.
 */
function createTimeTrigger() {
  // Configures the script to run every 15 minutes
  ScriptApp.newTrigger('runHailstormEngine')
      .timeBased()
      .everyMinutes(15)
      .create();
      
  console.log("Automation Activated: Hailstorm Engine will run every 15 minutes.");
  // Removed SpreadsheetApp.getUi() as it may not be available in all contexts, though it usually is if run from editor.
  // Using console.log is safer for CLI deployment.
}

// --- WEB APP HANDLER (RECEIVE FORM DATA) ---
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Wait up to 10s for other processes

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.LEADS_TAB);
    if (!sheet) {
      // Auto-create if missing
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(CONFIG.LEADS_TAB);
      sheet.appendRow(["Timestamp", "Name", "Phone", "Zip", "Damage Type", "Source"]);
    }

    // Parse JSON from request body
    var params = JSON.parse(e.postData.contents);
    var timestamp = new Date();

    if (params.type === 'referral') {
       // HANDLE REFERRAL
       var refSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.REFERRALS_TAB);
       if (!refSheet) {
         refSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(CONFIG.REFERRALS_TAB);
         refSheet.appendRow(["Timestamp", "Referrer Name", "Referrer Phone", "Neighbor Name", "Neighbor Address"]);
       }
       
       refSheet.appendRow([
         timestamp,
         params.referrerName,
         params.referrerPhone,
         params.neighborName,
         params.neighborAddress
       ]);

       GmailApp.sendEmail(
         CONFIG.OWNER_EMAIL,
         "🎁 New Referral from " + params.referrerName,
         "New Referral!\n\nReferrer: " + params.referrerName + " (" + params.referrerPhone + ")\nReferred Neighbor: " + params.neighborName + "\nAddress: " + params.neighborAddress
       );

    } else if (params.type === 'quote') {
       // HANDLE CALCULATOR QUOTE
       GmailApp.sendEmail(
         CONFIG.OWNER_EMAIL,
         "💰 New Estimate Request: " + params.price,
         "New Estimate Saved!\n\nEmail: " + params.email + "\nEst. Price: " + params.price + "\nArea: " + params.area + "\nMaterial: " + params.material
       );

       // Optional: Send copy to user (requires more complex setup, skipping for now to keep simple)
    
    } else if (params.type === 'commercial_lead') {
       // HANDLE COMMERCIAL LEAD
       // Save to Sheet (Leads Tab)
       sheet.appendRow([
         timestamp,
         params.name,
         params.phone,
         params.company || "N/A", // Use Company as Address/Zip placeholder if missing
         params.damageType, // e.g., "Commercial: Warehouse"
         "Commercial Landing Page"
       ]);

       // Send Notification to Owner
       GmailApp.sendEmail(
         CONFIG.OWNER_EMAIL, 
         "🏢 COMMERCIAL LEAD: " + params.company, 
         "High Value Lead!\n\nName: " + params.name + "\nCompany: " + params.company + "\nPhone: " + params.phone + "\nType: " + params.damageType + "\nSqft: " + (params.sqft || "N/A")
       );
       
       // Send SMS Alert (Twilio)
       sendTwilioSMS("🏢 COMMERCIAL LEAD: " + params.company + " (" + params.damageType + "). Phone: " + params.phone);
    
    } else {
       // HANDLE STANDARD LEAD
       // Save to Sheet
       sheet.appendRow([
         timestamp,
         params.name,
         params.phone,
         params.zip,
         params.damageType,
         "Website Form"
       ]);

       // Send Notification to Owner
       GmailApp.sendEmail(
         CONFIG.OWNER_EMAIL, 
         "New Roofing Lead: " + params.name, 
         "New Lead Received!\n\nName: " + params.name + "\nPhone: " + params.phone + "\nZip: " + params.zip + "\nType: " + params.damageType + "\n\nCheck 'Leads' tab in sheet."
       );

       // Send SMS Alert (Twilio)
       sendTwilioSMS("🚨 NEW LEAD: " + params.name + " (" + params.damageType + ") in " + params.zip + ". Phone: " + params.phone);

    }

    return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": error }))
      .setMimeType(ContentService.MimeType.JSON);
    
  } finally {
    lock.releaseLock();
  }
}
