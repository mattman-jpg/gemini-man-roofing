/**
 * CLOUD LOGGER
 * Sends structured JSON logs to Google Cloud Platform (Stackdriver).
 */
var CloudLogger = {
  log: function(message, data) {
    console.log({
      message: message,
      context: data,
      service: CONFIG.APP_NAME,
      timestamp: new Date().toISOString()
    });
  },
  
  error: function(message, errorObject) {
    console.error({
      message: message,
      error: errorObject ? errorObject.stack : "Unknown Error",
      service: CONFIG.APP_NAME
    });
    
    // Optional: Alert Admin immediately on Critical Error
    if (message.indexOf("CRITICAL") > -1) {
      try {
        MailApp.sendEmail(PropertiesService.getScriptProperties().getProperty('OWNER_EMAIL'), "🔥 CRITICAL ALERT", JSON.stringify({
          message: message,
          error: errorObject ? errorObject.stack : "N/A"
        }));
      } catch(e) {
        console.error("Failed to send alert email", e);
      }
    }
  }
};
