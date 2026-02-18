/**
 * UNIT TESTS
 * Run before deployment to verify logic.
 */
function runAllTests() {
  var results = [];
  
  results.push(testEmailValidation());
  results.push(testSpintax());
  results.push(testTemplateGeneration());
  
  console.log("TEST RESULTS:", results);
  return results;
}

function assert(condition, message) {
  if (!condition) throw new Error("FAIL: " + message);
  return "PASS: " + message;
}

// 1. Test Logic without sending email
function testEmailValidation() {
  try {
    assert(validateEmail("test@example.com") === true, "Valid email should pass");
    assert(validateEmail("broken.com") === false, "Missing @ should fail");
    return "testEmailValidation: PASS";
  } catch (e) {
    return e.message;
  }
}

// 2. Test Spintax randomness
function testSpintax() {
  var text = "{A|B|C}";
  var result = Utils.spin(text);
  try {
    assert(["A", "B", "C"].indexOf(result) > -1, "Spintax output must be one of options");
    return "testSpintax: PASS";
  } catch (e) {
    return e.message;
  }
}

// 3. Test Template Logic
function testTemplateGeneration() {
  try {
     var html = NotificationService.getEmailContent({
        name: "Test User",
        opener: "Test Opener",
        link: "http://example.com",
        address: "123 Test St",
        logo: "http://logo.png"
     });
     assert(html.indexOf("Test User") > -1, "Template should contain Name");
     assert(html.indexOf("123 Test St") > -1, "Template should contain Address");
     return "testTemplateGeneration: PASS";
  } catch (e) {
    return e.message;
  }
}

// Helper for testing
function validateEmail(email) {
  return email && email.indexOf("@") > -1;
}
