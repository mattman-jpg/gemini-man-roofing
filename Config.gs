/**
 * ENTERPRISE CONFIGURATION
 * Centralized immutable configuration object.
 */
var CONFIG = {
  APP_NAME: "HAILSTORM_ENTERPRISE_V2",
  SHEETS: {
    DATA: "Leads",
    LOGS: "System_Logs",
    QUEUE: "QUEUE",   // NEW: Job Queue
    CONFIG: "CONFIG", // NEW: Global Config/Kill Switch
    LEDGER: "LEDGER"  // NEW: Idempotency Ledger
  },
  // Map columns by Name to Index for robustness (0-based)
  COLS: {
    NAME: 0,
    EMAIL: 1,
    ADDRESS: 2,
    HAIL_SIZE: 3,
    STATUS: 4,
    ERRORS: 5,
    CAMPAIGN: 6 // NEW: Campaign ID Column (G)
  },
  SYSTEM: {
    DRY_RUN: true, // Safety Switch: Set to false to actually send
    DEBUG_MODE: true
  },
  ACTIVE_CAMPAIGN: "STORM_OCT_24", // Only process rows with this ID
  BATCH: {
    SIZE: 5,
    MIN_DELAY_MS: 15000,
    MAX_DELAY_MS: 30000
  },
  // RULES ENGINE
  RULES: [
    {
      id: "URGENT_DAMAGE",
      condition: function(row) { return parseFloat(row.hailSize) >= 2.0; },
      template: "Template_Severe_Storm",
      subject: "⚠️ URGENT: Severe Hail Damage Detected at {{ADDRESS}}",
      opener: "Hi {{NAME}}, our sensors detected severe hail ({{HAIL_SIZE}}\") at your property. This level of damage requires immediate inspection."
    },
    {
      id: "MODERATE_DAMAGE",
      condition: function(row) { return parseFloat(row.hailSize) >= 1.0 && parseFloat(row.hailSize) < 2.0; },
      template: "Template_Moderate_Storm",
      subject: "Inspection Recommended: Hail activity at {{ADDRESS}}",
      opener: "Hi {{NAME}}, we noticed significant hail activity ({{HAIL_SIZE}}\") in your area. It is recommended to have a professional look at it."
    },
    {
      id: "DEFAULT",
      condition: function() { return true; }, // Fallback
      template: "Template_General_Inquiry",
      subject: "Regarding the roof at {{ADDRESS}}",
      opener: "Hi {{NAME}}, records show recent storm activity near {{ADDRESS}}."
    }
  ],
  LINKS: {
    BASE_FORM: "https://geminimanroofing.com/?address=",
    LOGO: "https://via.placeholder.com/300x80?text=GEMINI+MAN+ROOFING"
  }
};

/**
 * Retrieves secrets securely. 
 * THROW ERROR if missing to prevent "undefined" failures later.
 */
function getSecret(key) {
  var val = PropertiesService.getScriptProperties().getProperty(key);
  if (!val) throw new Error("CRITICAL: Secret '" + key + "' is missing from Script Properties.");
  return val;
}
