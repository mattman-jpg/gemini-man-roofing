# GEMINI MAN ROOFING: GO LIVE GUIDE

This guide explains how to migrate your entire "Project Hailstorm" system from your personal computer/account to your new professional domain: **geminimanroofing.com**.

> [!IMPORTANT]
> **Understanding Your Services (Read First):**
>
> * **Google Workspace:** This provides your **Email** (`name@geminimanroofing.com`) and **Drive**. It does NOT include "Web Hosting" for custom code (unless you use the basic "Google Sites" builder).
> * **Squarespace:** This is where you bought your **Domain Name**. They offer a "Website Builder" for $20+/mo, but you don't need it.
> * **Netlify:** This is a **Free Web Host** that lets you upload the custom code I built for you. It's the missing piece to make your website work without paying monthly fees.

---

## PART 1: THE WEBSITE (geminimanroofing.com)

We need to put the website files online so people can see them when they visit your domain.

### Step 1: Create a Netlify Account

1. Go to [Netlify.com](https://www.netlify.com/).
2. Click **Sign Up**.
3. Sign up using your new **Google Workspace Account** (`... @geminimanroofing.com`).

### Step 2: Drag & Drop Deployment

1. Log in to Netlify.
2. **If you see a screen asking to connect GitHub/GitLab:**
    * Click **"Skip this step for now"** or go to the **"Sites"** tab in the left menu.
3. On the **Sites** page, scroll to the bottom. You will see a box: **"Want to deploy a new site without connecting to Git? Drag and drop your site folder here."**
4. Open your file explorer on your computer.
5. Navigate to: `Desktop/Roofing/Project_Hailstorm`.
6. **Click and Drag** the **`Website`** folder into that box.
7. **Wait 10 seconds.** Your site is now online.

### Step 3: Connect Your Domain (Squarespace)

1. Click **Domain Settings** (or "Set up a custom domain").
2. Click **Add custom domain**.
3. Type: `geminimanroofing.com`.
4. Click **Verify**.
5. Netlify will give you a **CNAME** or **A Record** (e.g., `104.198.14.52`).
6. **Log in to your Squarespace Domain Dashboard** (`account.squarespace.com`).
7. Click on your domain.
8. Go to **DNS Settings**.
9. **Delete existing records:** Look for "Squarespace Defaults" and delete them (trash can).
10. **Add New Records:**
    * **Record 1 (Root):**
        * Type: `A`
        * Host: `@`
        * Data: `75.2.60.5`
    * **Record 2 (WWW):**
        * Type: `CNAME`
        * Host: `www`
        * Data: `geminimanroofing.netlify.app`
11. **Wait:** It usually works within 15 minutes.

### Step 4: Verify in Netlify

1. Go back to **Netlify > Domain Settings**.
2. Click **"Add custom domain"**.
3. Enter `geminimanroofing.com`.
4. Click **Verify**.
5. If it says "Waiting on DNS", just wait a few hours. Once green, your site will say `geminimanroofing.com` in the browser!

> **Why check here?**
> Squarespace is your **Registrar** (owns the name). Netlify is your **Host** (stores the files). You are just pointing the name to the files. If you use Squarespace *Hosting*, you have to rebuild the site in their drag-and-drop builder and pay monthly fees. Netlify is free for this custom code.

---

## PART 2: THE BACKEND (Transferring Scripts)

Now we need to move the "Engine" (Email & SMS) to your new business account so emails come from `...@geminimanroofing.com`.

### Step 1: Set Up Key Sheets

1. **Log in** to your new Google Account (`...@geminimanroofing.com`).
2. **Go to Google Drive** and create a folder called "Hailstorm System".
3. **Create a New Google Sheet** inside it named: `Hailstorm Leads`.
    * Rename 'Sheet1' to `Sheet1`.
    * Add Headers (Row 1): `Name`, `Email`, `Address`, `Hail Size`, `Status`, `Errors`.
4. **Create a New Google Form** inside it named: `Hailstorm Lead Capture`.
    * Questions: Name, Email, Address, Phone, Hail Size.
    * **Link to Sheet:** Click "Responses" > "Link to Sheets" > Select the `Hailstorm Leads` sheet you just created.

### Step 2: Copy the Scripts

1. **Open the Google Sheet** you just created.
2. Go to **Extensions > Apps Script**.
3. **Copy/Paste Code:**
    * Open `Hailstorm_Engine.gs` on your computer (Notepad). Copy ALL text. Paste into the online script editor (rename `Code.gs` to `Hailstorm_Engine`).
    * Create a new script file (`+` button) named `Twilio_Alarm`.
    * Open `Twilio_Alarm.gs` on your computer. Copy ALL text. Paste into the online script editor.

### Step 3: Configure ("The Switch")

1. **Update Config:**
    * In `Hailstorm_Engine.gs`, find `LOGO_URL`. Update it if you have a new logo link.
    * In `Twilio_Alarm.gs`, find `TWILIO_CONFIG`. **You need to update your Twilio Account.**
2. **Twilio Update:**
    * Log in to Twilio.
    * You might need to "Release" your old number and buy a new one, or just update the credentials if using the same account.
    * **Crucial:** Ensure the `From` number in the script matches your Twilio number.

### Step 4: Activate Triggers

1. In the Apps Script Editor, go to **Triggers** (Current project's triggers).
2. **Add Trigger for Email Engine:**
    * Function: `runHailstormEngine`
    * Event Source: `Time-driven`
    * Type: `Minutes timer` -> `Every 15 minutes`
3. **Add Trigger for SMS Alarm:**
    * Function: `onFormSubmit`
    * Event Source: `From spreadsheet` (since we linked form to sheet) OR `From form` (if you attached script to form directly). *Recommendation: Stick to one method. If you opened script from Sheet, use "From spreadsheet" > "On form submit".*

---

## PART 3: EMAIL REPUTATION (CRITICAL)

Since this is a **new** domain, your "Sender Reputation" is neutral. To avoid Spam folders:

### 1. DNS Records (SPF, DKIM, DMARC)

Log in to your Domain Host (DNS Settings) and verify these exist (Google Workspace usually adds them, but **Verify**):

* **SPF:** `v=spf1 include:_spf.google.com ~all`
* **DKIM:** Generate this in Google Admin Console (`Apps > Google Workspace > Gmail > Authenticate Email`). Add the TXT record to your DNS.
* **DMARC:** Add a TXT record `_dmarc.geminimanroofing.com` with value: `v=DMARC1; p=none; rua=mailto:admin@geminimanroofing.com`.

### 2. Warm Up

* **Day 1-3:** Send only to yourself and close friends. Replied emails trigger "Trust".
* **Day 4:** Send 20 emails.
* **Day 5:** Send 40 emails.
* Follow the **60-Day Warm-Up Schedule** in the `DEPLOYMENT_GUIDE.md`.

---

## PART 4: CONNECTING THE BACKEND (Web App)

Your website uses a "Headless" backend (Google Apps Script) to send emails.

1. **Open Terminal** (in VS Code or Command Prompt).
2. Navigate to your project folder: `cd "OneDrive - Liberty Oilfield Services\Desktop\Roofing\Project_Hailstorm"`
3. **Login:** `clasp login` (Authorize with your `geminimanroofing.com` account).
4. **Push Code:** `clasp push`
5. **Deploy:** `clasp deploy`
6. **Get URL:** Copy the "Web App URL" from the output (starts with `https://script.google.com/macros/s/...`).
7. **Update Website:**
    * Open `Website/script.js`
    * Find `const WEB_APP_URL = "..."`
    * Paste your new URL there.
8. **Re-deploy Website:** Drag the `Website` folder to Netlify again.

**🎉 YOU ARE LIVE!**
