# AUTOMATED DEPLOYMENT GUIDE (Gemini Man Roofing)

This guide explains how to move from "Drag & Drop" to **"Push & Auto-Publish"**.
Once set up, every time you save changes and run a simple command, your live website (`geminimanroofing.com`) will update automatically within seconds.

---

## 🚀 The Goal

**Current Workflow:** Edit Code -> Save -> Open Netlify -> Drag Folder -> Wait.
**New Workflow:** Edit Code -> Save -> Type `git push` -> Done.

---

## 🛠️ Step 1: Initialize Git (One-Time Setup)

1. **Open Terminal** in VS Code.
2. Run the following commands one by one:

```bash
# 1. Initialize Git in your project folder
git init

# 2. Add all files to the "staging area"
git add .

# 3. Commit (Save) these files
git commit -m "Initial commit - Project Hailstorm Live"
```

---

## 🔗 Step 2: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com/) and sign up/log in.
2. Click the **+** icon (top right) -> **New Repository**.
3. Name: `gemini-man-roofing`
4. Visibility: **Private** (Recommended for business code).
5. Click **Create repository**.
6. Copy the URL shown (looks like `https://github.com/YOUR_USERNAME/gemini-man-roofing.git`).

---

## 🔗 Step 3: Link Computer to GitHub

Back in your VS Code Terminal:

```bash
# Replace URL with your actual GitHub URL
git remote add origin https://github.com/YOUR_USERNAME/gemini-man-roofing.git

# Push your code to the cloud
git push -u origin master
```

*(You might be asked to sign in to GitHub in the browser. Do it.)*

---

## ☁️ Step 4: Connect Netlify to GitHub

1. Log in to **Netlify**.
2. Click **"Add new site"** -> **"Import from an existing project"**.
3. Click **GitHub**.
4. Authorize Netlify to access your repositories.
5. Select `gemini-man-roofing`.
6. **Build Settings:**
    * **Base directory:** `Website` (Since your HTML is inside the 'Website' folder).
    * **Publish directory:** `Website` (or leave blank if it auto-detects).
7. Click **Deploy Site**.

**IMPORTANT:** Netlify will now detect you already have a site. You might need to "Link" this repo to your existing `splendid-mochi` site instead of creating a new one:

* Go to `splendid-mochi...` settings.
* Go to **Site Configuration** > **Build & Deploy**.
* Click **"Link repository"**.

---

## 🔄 Daily Workflow (How to Update)

Every day, when you finish work:

1. **Check Status:** `git status` (See what changed)
2. **Add Changes:** `git add .`
3. **Save Snapshot:** `git commit -m "Updated calculator logic"` (Use a meaningful message)
4. **Publish:** `git push`

**That's it!** Netlify sees the "Push", grabs the new code, and updates `geminimanroofing.com` automatically.

---

## 📝 DAILY TO-DO LIST TRACKER

Use the `task.md` file I created as your living "ToDo List". It has:

* `[ ]` Empty box = Pending
* `[x]` Checked box = Done

**Format for your To-Do's:**

```markdown
## 📅 [Today's Date]
- [ ] Call Provider A
- [x] Fix Website Mobile CSS
- [ ] Email 5 Leads
```
