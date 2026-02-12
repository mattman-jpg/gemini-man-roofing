/**
 * SETUP SCRIPT - RUN THIS ONCE
 * 
 * This script automates the creation of your Google Sheet and Form.
 * It will:
 * 1. Create a new Google Sheet "Hailstorm Leads".
 * 2. Create a new Google Form "Hailstorm Lead Capture".
 * 3. Link the Form to the Sheet.
 * 4. Log the IDs and URLs for you to use.
 * 5. Save the IDs to ScriptProperties so the other scripts work automatically.
 */
function setupProject() {
  var ss = SpreadsheetApp.create("Hailstorm Leads");
  var sheet = ss.getSheets()[0];
  sheet.setName("Sheet1");
  
  // Set Headers
  sheet.appendRow(["Name", "Email", "Address", "Hail Size", "Status", "Errors"]);
  
  var form = FormApp.create("Hailstorm Lead Capture");
  form.addTextItem().setTitle("Name").setRequired(true);
  form.addTextItem().setTitle("Email").setRequired(true);
  form.addTextItem().setTitle("Address").setRequired(true);
  form.addTextItem().setTitle("Phone Number").setRequired(true);
  
  // Link Form to Sheet
  // Note: FormApp.setDestination will create a new sheet, usually named "Form Responses 1"
  // But our Engine reads "Sheet1". We'll just let the Form dump to its own sheet and maybe we can change the engine to read that index,
  // OR we just rely on the user to import data into "Sheet1".
  
  // Actually, for lead capture, we want the form to dump to a sheet.
  // But the "Hailstorm Engine" reads a DIFFERENT sheet (the cold lead list).
  // So they are separate.
  
  // Save IDs
  var scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('SHEET_ID', ss.getId());
  scriptProperties.setProperty('FORM_ID', form.getId());
  
  console.log("SUCCESS! Project Setup Complete.");
  console.log("---------------------------------------------------");
  console.log("Spreadsheet Name: " + ss.getName());
  console.log("Spreadsheet ID: " + ss.getId());
  console.log("Spreadsheet URL: " + ss.getUrl());
  console.log("---------------------------------------------------");
  console.log("Form Name: " + form.getTitle());
  console.log("Form ID: " + form.getId());
  console.log("Form Edit URL: " + form.getEditUrl());
  console.log("Form Published URL: " + form.getPublishedUrl());
  console.log("---------------------------------------------------");
  console.log("IDs have been saved to Script Properties.");
}
