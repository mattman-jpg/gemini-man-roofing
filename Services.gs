const CircuitBreaker = {
  FAILURE_THRESHOLD: 3,
  COOLDOWN_MINUTES: 60,
  
  /**
   * Check if we are allowed to run
   */
  isOpen: function() {
    var props = PropertiesService.getScriptProperties();
    var trippedTime = parseInt(props.getProperty('CB_TRIPPED_TIME') || "0");
    var failureCount = parseInt(props.getProperty('CB_FAILURES') || "0");
    
    // If tripped, check if cooldown has passed
    if (trippedTime > 0) {
      var now = new Date().getTime();
      if (now - trippedTime < this.COOLDOWN_MINUTES * 60 * 1000) {
        console.warn("Circuit Breaker is OPEN. Cooling down. Time remaining: " + Math.round((this.COOLDOWN_MINUTES * 60 * 1000 - (now - trippedTime))/60000) + "m");
        return true; // BLOCKED
      } else {
        // Cooldown over, reset
        this.reset();
        return false; // ALLOWED
      }
    }
    return false; // ALLOWED
  },

  /**
   * Record a success - resets the failure counter
   */
  recordSuccess: function() {
    PropertiesService.getScriptProperties().setProperty('CB_FAILURES', '0');
  },

  /**
   * Record a failure - trips if threshold reached
   */
  recordFailure: function(errorMsg) {
    var props = PropertiesService.getScriptProperties();
    var failures = parseInt(props.getProperty('CB_FAILURES') || "0") + 1;
    
    props.setProperty('CB_FAILURES', failures.toString());
    
    if (failures >= this.FAILURE_THRESHOLD) {
      props.setProperty('CB_TRIPPED_TIME', new Date().getTime().toString());
      Utils.log("CRITICAL", "Circuit Breaker TRIPPED", "Too many failures (" + failures + "). System halted for " + this.COOLDOWN_MINUTES + " mins.");
      // Try to send email, but don't loop if it fails
      try {
        MailApp.sendEmail(PropertiesService.getScriptProperties().getProperty('OWNER_EMAIL'), "🚨 SYSTEM HALTED", "The Circuit Breaker was tripped due to repeated errors: " + errorMsg);
      } catch(e) {}
    }
  },
  
  reset: function() {
    PropertiesService.getScriptProperties().deleteProperty('CB_TRIPPED_TIME');
    PropertiesService.getScriptProperties().deleteProperty('CB_FAILURES');
  }
};

var NotificationService = {
  /**
   * Generates HTML from the template file
   */
  getEmailContent: function(data) {
    var template = HtmlService.createTemplateFromFile('EmailTemplate');
    template.name = data.name;
    template.opener = data.opener;
    template.link = data.link;
    template.address = data.address;
    template.logo = data.logo;
    return template.evaluate().getContent();
  },

  /**
   * Sends Email via Gmail with Quota Protection
   */
  sendEmail: function(to, subject, htmlBody) {
    if (CONFIG.SYSTEM.DRY_RUN) {
      Utils.log("INFO", "[DRY RUN] Would send email to: " + to, subject);
      return;
    }

    var remaining = MailApp.getRemainingDailyQuota();
    if (remaining < 10) {
      throw new Error("CRITICAL: Daily Email Quota Low/Exceeded.");
    }

    Utils.withRetry(function() {
      GmailApp.sendEmail(to, subject, "HTML Required", {
        htmlBody: htmlBody,
        replyTo: PropertiesService.getScriptProperties().getProperty('REPLY_TO_EMAIL'),
        name: "Gemini Man Roofing"
      });
    });
  },

  /**
   * Sends SMS via Twilio
   */
  sendSMS: function(to, body) {
    if (CONFIG.SYSTEM.DRY_RUN) {
      Utils.log("INFO", "[DRY RUN] Would send SMS to: " + (to || "Admin"), body);
      return;
    }

    var accountSid = getSecret('TWILIO_SID');
    var token = getSecret('TWILIO_TOKEN');
    var from = getSecret('TWILIO_FROM');
    
    // Override 'to' with Admin number if specific target not provided
    var target = to || getSecret('TWILIO_TO'); 

    var url = "https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/Messages.json";
    
    var payload = {
      "To": target,
      "From": from,
      "Body": body
    };

    var options = {
      "method": "post",
      "headers": { 
        "Authorization": "Basic " + Utilities.base64Encode(accountSid + ":" + token) 
      },
      "payload": payload,
      "muteHttpExceptions": true
    };

    var response = Utils.withRetry(function() { 
      return UrlFetchApp.fetch(url, options); 
    });
    
    var code = response.getResponseCode();
    if (code >= 300) throw new Error("Twilio Failed: " + response.getContentText());
  }
};
