/**
 * RATE LIMITER (Token Bucket)
 * Throttles execution to prevent spam flags.
 */
var RateLimiter = {
  BUCKET_SIZE: 10,
  TOKENS_PER_MINUTE: 5,
  
  /**
   * Returns true if allowed to proceed, false if throttled
   */
  check: function() {
    var props = PropertiesService.getScriptProperties();
    var now = new Date().getTime();
    
    var tokens = parseFloat(props.getProperty('RL_TOKENS') || this.BUCKET_SIZE);
    var lastCheck = parseFloat(props.getProperty('RL_LAST_CHECK') || now);
    
    // Refill tokens based on time passed
    var timePassed = (now - lastCheck) / 1000 / 60; // Minutes
    tokens = Math.min(this.BUCKET_SIZE, tokens + (timePassed * this.TOKENS_PER_MINUTE));
    
    if (tokens < 1) {
      console.warn("Rate Limit Hit. Throttling...");
      return false; // STOP
    }
    
    // Consume 1 token
    props.setProperty('RL_TOKENS', (tokens - 1).toString());
    props.setProperty('RL_LAST_CHECK', now.toString());
    return true; // PROCEED
  }
};
