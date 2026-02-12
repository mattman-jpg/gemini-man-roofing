/**
 * TWILIO ALARM - INSTANT SMS LEAD NOTIFICATION
 * 
 * CORE FUNCTIONALITY:
 * 1. Triggers on Google Form Submit.
 * 2. Parses lead details (Name, Address, Phone).
 * 3. Sends SMS via Twilio API.
 * 4. (Optional) Sends Discord Webhook.
 */

// --- CONFIGURATION ---
var TWILIO_CONFIG = {
  ACCOUNT_SID: "ACa83bbeac76fbc101b0010cbc1cadc7d5", // Your Auth Token is still needed below
  AUTH_TOKEN: "e4ff975ad2b76b8760a9a36193f3d2f5",
  TWILIO_NUMBER: "+18665182906", // Your new Toll-Free Number
  DESTINATION_NUMBER: "+19408674778" // Your Personal Cell (Owner)
};

var DISCORD_WEBHOOK_URL = ""; // Optional: Paste Webhook URL here

/**
 * Trigger Function: onFormSubmit
 * This must be set up as an INSTALLABLE TRIGGER, not a simple trigger,
 * because UrlFetchApp requires permissions.
 * 
 * @param {Object} e - The event object from form submission
 */
function onFormSubmit(e) {
  try {
    // 1. DATA EXTRACTION
    // e.namedValues is an object where keys are Question Titles
    var responses = e.namedValues;
    
    // ADJUST THESE KEYS to match your exact Google Form Question Titles
    var leadName = responses["Name"] ? responses["Name"][0] : "Unknown";
    var address = responses["Address"] ? responses["Address"][0] : "Unknown Address";
    var phone = responses["Phone Number"] ? responses["Phone Number"][0] : "No Phone";

    // 2. CONSTRUCT MESSAGE
    var messageBody = `🚨 HAILSTORM LEAD: ${leadName} at ${address} wants an inspection. Call them now: ${phone}`;

    // 3. SEND TWILIO SMS
    sendTwilioSMS(messageBody);

    // 4. (OPTIONAL) DISCORD FALLBACK
    // if (DISCORD_WEBHOOK_URL) {
    //   sendDiscordNotification(messageBody);
    // }

  } catch (error) {
    console.error("Error in onFormSubmit: " + error.toString());
    // Optional: Email yourself the error so you know the script failed
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), "Twilio Script Error", error.toString());
  }
}

function sendTwilioSMS(body) {
  var url = "https://api.twilio.com/2010-04-01/Accounts/" + TWILIO_CONFIG.ACCOUNT_SID + "/Messages.json";
  
  var payload = {
    "To": TWILIO_CONFIG.DESTINATION_NUMBER,
    "From": TWILIO_CONFIG.TWILIO_NUMBER,
    "Body": body
  };

  var options = {
    "method": "post",
    "payload": payload,
    "headers": {
      "Authorization": "Basic " + Utilities.base64Encode(TWILIO_CONFIG.ACCOUNT_SID + ":" + TWILIO_CONFIG.AUTH_TOKEN)
    }
  };

  UrlFetchApp.fetch(url, options);
  console.log("SMS Sent via Twilio");
}

/*
function sendDiscordNotification(content) {
  var payload = JSON.stringify({ content: content });
  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": payload
  };
  UrlFetchApp.fetch(DISCORD_WEBHOOK_URL, options);
}
*/

/**
 * TRIGGER SETUP - Run this ONCE after running setupProject()
 */
function installFormTrigger() {
  var formId = PropertiesService.getScriptProperties().getProperty('FORM_ID');
  if (!formId) {
    console.error("FORM_ID not found. Run 'setupProject()' first.");
    return;
  }
  
  var form = FormApp.openById(formId);
  
  ScriptApp.newTrigger('onFormSubmit')
    .forForm(form)
    .onFormSubmit()
    .create();
    
  console.log("Twilio Alarm Trigger installed for Form: " + form.getTitle());
}
