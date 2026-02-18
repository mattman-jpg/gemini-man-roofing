var Utils = {
  /**
   * Structured Logging to a Sheet.
   * Keeps the execution log clean and provides a permanent record.
   */
  log: function(level, message, details) {
    console.log("[" + level + "] " + message);
    try {
      var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
      if (!sheetId) return; // Fail silently if no sheet yet

      var ss = SpreadsheetApp.openById(sheetId);
      var sheet = ss.getSheetByName(CONFIG.SHEETS.LOGS);
      if (!sheet) {
        sheet = ss.insertSheet(CONFIG.SHEETS.LOGS);
        sheet.appendRow(["Timestamp", "Level", "Message", "Details"]);
      }
      sheet.appendRow([new Date(), level, message, details ? JSON.stringify(details) : ""]);
    } catch (e) {
      console.error("LOGGING FAILED: " + e.message);
    }
  },

  /**
   * Exponential Backoff Retry Wrapper
   * Retries an API call up to 3 times if it fails.
   */
  withRetry: function(fn, retries) {
    retries = retries || 3;
    for (var i = 0; i < retries; i++) {
      try {
        return fn();
      } catch (e) {
        if (i === retries - 1) throw e;
        Utilities.sleep(1000 * Math.pow(2, i)); // 1s, 2s, 4s wait
      }
    }
  },

  /**
   * Validates API Key for Web Requests
   */
  isAuthenticated: function(request) {
    var key = request.parameter.key;
    if (!key && request.postData && request.postData.contents) {
      try {
        key = JSON.parse(request.postData.contents).key;
      } catch (e) {}
    }
    return key === PropertiesService.getScriptProperties().getProperty('API_ACCESS_KEY');
  },
  
  /**
   * Advanced Spintax Parser
   * Supports nested: {Hi|Hello {there|friend}}
   */
  spin: function(text) {
    var matches = text.match(/\{([^{}]+?)\}/);
    if (!matches) return text;
    var options = matches[1].split("|");
    var choice = options[Math.floor(Math.random() * options.length)];
    return Utils.spin(text.replace(matches[0], choice));
  }
};
