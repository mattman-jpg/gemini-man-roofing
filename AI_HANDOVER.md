# 🛑 AI AGENT HANDOVER CONTEXT 🛑
**CRITICAL INSTRUCTION FOR ANY AI AGENT READING THIS:** 
Read this entire document before proposing or making ANY changes to this codebase. Do not make assumptions about the framework. 

## 1. System Architecture (DO NOT CHANGE)
- **Frontend Stack:** This is a **Vanilla HTML/CSS/JS** static website. 
- **DO NOT** attempt to convert this into React, Next.js, Vue, or any other SPA framework. It is strictly static HTML deployed via GitHub Pages.
- **Backend Stack:** A Python FastAPI server deployed on **Google Cloud Run**. The backend code lives strictly inside the `/chatbot_backend` directory. 
- **Production Branch:** The live website is deployed from the `master` branch. Do not push to or create a `main` branch.

## 2. Current State of the Project
- **Website Hosted:** GitHub Pages (tracking the `master` branch).
- **Chatbot API Hosted:** Google Cloud Run (`https://chatbot-api-103616089821.us-central1.run.app`).
- **Google Calendar Agent:** Working flawlessly. The AI Chatbot uses OpenAI Function Calling to trigger `book_inspection` which writes directly to the CEO's Google Workspace Calendar.
- **Outreach Scripts:** Python scripts located in `/scripts` are used to scrape data (HailTrace, Google Maps) and blast emails/SMS. 

## 3. The "90-Day Scaling Blueprint" (Active Tasks)
We are currently executing a massive 90-day scaling roadmap. When the user asks "what's next?" or "continue", pick up from these tasks:

### Month 1: The "Lead Trap"
- [ ] **Chatbot "Agentic Memory"**: Implement `localStorage` session handling in `js/chatbot.js` so the AI remembers returning visitors.
- [ ] **Interactive AI Roof Estimator**: Build `/estimator.html` page with Google Maps API for instant satellite roof square-footage calculation.
- [ ] **"Post-Submission" FOMO Automation**: Immediate SMS/Email trigger via Python backend on calendar booking with a CEO video hook.

### Month 2: The "Digital Storm Chaser" 
- [ ] **NOAA Weather Webhook**: Trigger automated Cloud Run event upon 1.5"+ hail detection.
- [ ] **Zillow / Redfin Scraper**: Build script to scrape newly sold Texas properties for Lob API direct mail campaigns.

### Month 3: The "Commercial Sniper"
- [ ] **Automated LinkedIn Manager**: Deploy Playwright cron job to pitch B2B property managers.
- [ ] **Supabase / Firestore Migration**: Move lead data out of local `CSV` and into a production robust database.
- [ ] **Referral Portal Gamification**: Build dynamic frontend dashboard so referrers can track their payload.

## 4. Operational Rules for the AI
1. **Never mock data:** If a script needs to run, run it against real files.
2. **Never expose keys:** DO NOT edit `.env` or `token.json` files to include raw text, these must remain git-ignored.
3. **Always ask before structural changes:** If you think a CSS file needs a full rewrite, ask first. Stick to surgical insertions. 

---
*End of Handover Context. You are now authorized to assist the CEO.*
