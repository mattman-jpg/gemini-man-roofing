/**
 * IDEMPOTENCY KEY MODULE
 * Prevents double-sends by checking a global ledger.
 */
var Idempotency = {
  
  /**
   * Generates a deterministic hash for a job
   */
  generateKey: function(email, campaignId) {
    var raw = (email || "").trim().toLowerCase() + "_" + (campaignId || "DEFAULT") + "_" + new Date().toISOString().slice(0, 10);
    var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw);
    return Utilities.base64Encode(digest);
  },

  /**
   * Checks if key exists in Ledger. Returns true if duplicate.
   */
  isDuplicate: function(key) {
    var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
    var ledgerSheet = ss.getSheetByName(CONFIG.SHEETS.LEDGER);
    
    // O(1) Lookup using TextFinder
    var finder = ledgerSheet.createTextFinder(key);
    var match = finder.findNext();
    
    return match !== null; 
  },

  /**
   * Records key in Ledger
   */
  record: function(key) {
    var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
    var ledgerSheet = ss.getSheetByName(CONFIG.SHEETS.LEDGER);
    ledgerSheet.appendRow([key, new Date(), "SENT"]);
  }
};
