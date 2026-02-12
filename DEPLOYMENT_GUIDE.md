# PROJECT HAILSTORM: DEPLOYMENT GUIDE

## PHASE 0: DATA IMPORT (CRITICAL FIRST STEP)
Since you have `hail_data_1.xlsx` and `hail_data_2.xlsx`, follow these steps to load them:

1.  **Open Google Sheets**
    *   Create a blank sheet (as per Phase 1).
2.  **Import Data**
    *   Go to **File > Import**.
    *   Click **Upload** and drag your `.xlsx` file into the window.
    *   Select **"Replace spreadsheet"** or **"Insert new sheet"**.
    *   Click **Import data**.
3.  **Verify Headers**
    *   Ensure your columns match the `COLUMN_MAP` in `Hailstorm_Engine.gs`.
    *   By default, the script expects:
        *   Column A: **Name**
        *   Column B: **Email**
        *   Column C: **Address**
        *   Column D: **Hail Size** (Optional)
        *   Column E: **Status** (Must be empty initially)
        *   Column F: **Errors** (Must be empty initially)
    *   **IF YOUR COLUMNS ARE DIFFERENT:** Go to the `CONFIG` section in `Hailstorm_Engine.gs` and change the numbers in `COLUMN_MAP` to match your sheet (A=0, B=1, etc.).

## PHASE 1: EMAIL ENGINE SETUP

### METHOD A: MANUAL COPY-PASTE (Default)
1.  **Create the Google Sheet**
    *   Create a new Google Sheet.
    *   Rename the first tab to `Sheet1`.
    *   Add these exact headers in row 1:
        `Name` | `Email` | `Address` | `Hail Size` | `Status` | `Errors`

2.  **Install the Script**
    *   In the Sheet, go to **Extensions > Apps Script**.
    *   Delete any existing code in `Code.gs`.
    *   Copy/Paste the contents of `Hailstorm_Engine.gs`.

### METHOD B: CLI DEPLOYMENT (Advanced/Automated)
If you are using the CLI (clasp), I have already pushed the code for you.
1.  **Open the Script:** Run `clasp open` in your terminal.
2.  **Run Setup:**
    *   In the editor, open `Setup.gs`.
    *   Select `setupProject` from the toolbar and click **Run**.
    *   **Authorize** the script.
    *   **View Logs:** It will print the URL of your new Sheet and Form.
3.  **Install Triggers:**
    *   Run `installFormTrigger` (in `Twilio_Alarm.gs`) once.
    *   Run `createTimeTrigger` (in `Hailstorm_Engine.gs`) once.
4.  **Done!** Your Sheet and Form are created and linked.

---

## PHASE 2: SMS ALARM SETUP (Script B)

3.  **Get Your Pre-Filled Link ID**
    *   Open your Google Form (the one leads will fill out).
    *   Click the "three dots" menu (top right) > **Get pre-filled link**.
    *   Fill in the "Address" field with a dummy value like `ADDRESS_HERE`.
    *   Click **Get Link** > **Copy Link**.
    *   Paste it into a notepad. Look for the part that says `&entry.123456789=ADDRESS_HERE`.
    *   Copy the URL *up to* the equals sign (e.g., `...viewform?usp=pp_url&entry.123456789=`).
    *   Paste this into the `CONFIG` section of `Hailstorm_Engine.gs` where it implies `BASE_FORM_URL`.

4.  **Activate the Automation**
    *   In the Apps Script editor, select `createTimeTrigger` from the dropdown menu (toolbar at top).
    *   Click **Run**.
    *   **Grant Permissions:** Google will ask for permission. Click **Review Permissions**, choose your account. *Note: You may see "Google hasn't verified this app" (since you wrote it). Click "Advanced" > "Go to (Script Name) (unsafe)" to proceed.*
    *   Success: A box will alert you that the trigger is set for every 15 minutes.

---

## PHASE 2: SMS ALARM SETUP (Script B)

1.  **Install the Script**
    *   Open your **Google Form** (Edit mode).
    *   Click **three dots** > **Script editor**.
    *   Copy/Paste the contents of `Twilio_Alarm.gs`.

2.  **Configure Twilio**
    *   Log in to Twilio console.
    *   Copy your `Account SID`, `Auth Token`, and `Twilio Phone Number`.
    *   Paste them into the `TWILIO_CONFIG` section of the script.
    *   Add your personal cell phone number as `DESTINATION_NUMBER`.

3.  **Activate the Trigger**
    *   **CRITICAL:** Do NOT just click "Run".
    *   In the Apps Script sidebar, click the **Triggers** (alarm clock icon).
    *   Click **+ Add Trigger** (bottom right).
    *   **Choose which function to run:** `onFormSubmit`.
    *   **Select event source:** `From form`.
    *   **Select event type:** `On form submit`.
    *   Click **Save** and authorize permissions.

---

## PHASE 3: CUSTOMIZATION & LOGO

1.  **Host Your Logo**
    *   Upload your logo (`Gemini_Generated_Image_...jpeg`) to a public image host.
    *   **Option A (Google Drive):** Upload to Drive, right-click > Share > Anyone with link. use a tool like "Google Drive Direct Link Generator" to get the raw URL.
    *   **Option B (Imgur/Postimages):** Upload and copy the "Direct Link" (ends in .png or .jpg).
2.  **Update Script**
    *   In `Hailstorm_Engine.gs`, find `LOGO_URL` in the `CONFIG` section.
    *   Paste your direct link between the quotes.
    *   Adjust `LOGO_WIDTH` if it looks too big/small in test emails.

---

## PHASE 4: DELIVERABILITY & DNS (CRITICAL)

To prevent your emails from going to Spam, you MUST add these records to your domain's DNS settings.

### 1. SPF Record (TXT)
*   **Host:** `@`
*   **Value:** `v=spf1 include:_spf.google.com ~all`

### 2. DMARC Record (TXT)
*   **Host:** `_dmarc`
*   **Value:** `v=DMARC1; p=quarantine; Rua=mailto:admin@yourdomain.com`

---

## phase 5: 60-DAY WARM-UP SCHEDULE (GOAL: 2,000/DAY)

> [!WARNING]
> **DO NOT RUSH THIS.**
> You are on a new Google Workspace domain. If you send 2,000 emails tomorrow, you will be permanently banned. Follow this strict "Ramp-Up" schedule.

**How to Control Volume:**
*   **Method A (Manual):** Only run the script manually X times per day.
*   **Method B (Automatic):** Change `MAX_BATCH_SIZE` in the script (e.g., set to 1 for low volume days) or adjust the Trigger frequency (e.g., every hour instead of every 15 mins).

| Week | Daily Limit | Action Plan |
| :--- | :--- | :--- |
| **Week 1** | **20** | Send manually. Verify replies. |
| **Week 2** | **50** | manual sending or 1 email / 30 mins. |
| **Week 3** | **100** | Automation: 2 emails / 15 mins. |
| **Week 4** | **200** | Automation: 4 emails / 15 mins. |
| **Week 5** | **400** | Automation: 5 emails / 10 mins. |
| **Week 6** | **800** | Automation: 10 emails / 15 mins. |
| **Week 7** | **1,200** | Automation: 20 emails / 15 mins. |
| **Week 8** | **2,000** | **Full Capacity.** Monitor "Errors" column closely. |

---

## TROUBLESHOOTING: "UNVERIFIED APP" SCREEN

When you first run the script, you will see a scary screen saying **"Google hasn't verified this app"**.

**This is normal.**
*   **Why?** Because *you* are the developer (the "3rd Party"). You wrote a custom script that accesses your own Gmail. Google warns you just to be safe.
*   **Solution:**
    1.  Click **Advanced** (small text on the left).
    2.  Click **Go to Hailstorm_Engine (unsafe)** (at the bottom).
    3.  Type `Continue` if asked.
    4.  Click **Allow**.

**"Sign in with Google" / Third-Party Types:**
*   You are acting as your own "First Party" developer here.
*   You do **not** need to submit this app for verification unless you plan to sell it to other people.
*   For your internal business use, the "Unsafe" mode is perfectly safe and standard practice.

---

## PHASE 6: THE WEBSITE (CUSTOM BUILD)

We have built a premium, custom-coded website in the `Project_Hailstorm/Website` folder.

### Option A: Local Testing (Right Now)
1.  Go to the folder `Desktop/Roofing/Project_Hailstorm/Website`.
2.  Double-click `index.html`.
3.  It will open in your browser.

### Option B: Hosting (Public)
To make this website public (e.g., `geminimanroofing.com`), you can use a free host like **Netlify** or **GitHub Pages**.

**Netlify Method (Easiest):**
1.  Go to [Netlify Drop](https://app.netlify.com/drop).
2.  Drag and drop the entire `Website` folder onto the page.
3.  It will give you a public URL (e.g., `random-name.netlify.app`).
4.  You can then buy a domain and link it.

### Connecting the Form
Currently, the form on the website is in "Demo Mode". To connect it to your lead system:
1.  Open your **Google Form** (created in Phase 0/1).
2.  Get the **pre-filled link** logic or use a tool like "Email Notifications for Google Forms" to get a webhook, OR simply embed the Google Form iframe into `index.html`.
3.  **Advanced:** For the custom form to work, we need to map the HTML inputs to your Google Form entry IDs.
    *   Inspect your Google Form (View Source).
    *   Find `entry.123456` IDs for Name, Phone, Address.
    *   Update `index.html` form inputs with `name="entry.123456"`.
    *   Set form action to `https://docs.google.com/forms/u/0/d/YOUR_FORM_ID/formResponse`.

**🎉 DONE!**
Your system is ready.
1.  **Lead Capture:** Website Form -> Google Sheet.
2.  **Notification:** Twilio Script -> SMS to you.
3.  **Outreach:** Hailstorm Engine -> Emails to neighbors.

