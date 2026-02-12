function setupTwilio() {
  // RUN THIS FUNCTION ONCE TO SAVE YOUR KEYS
  // REPLACES HARDCODED VALUES
  
  var scriptProperties = PropertiesService.getScriptProperties();
  
  // PASTE YOUR NEW KEYS HERE AND CLICK "RUN"
  // AFTER RUNNING, DELETE THE KEYS FROM HERE AGAIN
  scriptProperties.setProperties({
    'TWILIO_SID': 'AC...', // Paste new SID here
    'TWILIO_TOKEN': '...', // Paste new Token here
    'TWILIO_FROM': '+18665182906',
    'TWILIO_TO': '+19408674778'
  });
  
  console.log("Twilio Credentials Saved Securely!");
}
