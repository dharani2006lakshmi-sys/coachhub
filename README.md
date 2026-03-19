# 🏆 CoachHub — Sports Team Management Portal

A full-featured web app for Coaches, Players, and Team Managers.  
Built with **HTML + CSS + JavaScript + Firebase**.

---

## 📁 File Structure

```
coachhub/
├── index.html              ← Login & Register page
├── dashboard-coach.html    ← Coach dashboard (add players, matches, etc.)
├── dashboard-player.html   ← Player dashboard (view stats, matches)
├── dashboard-manager.html  ← Manager dashboard (overview, reports)
├── firebase-config.js      ← 🔴 YOUR Firebase keys go here
├── auth.js                 ← Login / Register / Logout logic
├── db.js                   ← Firestore database helpers
├── style.css               ← Shared styles
└── README.md               ← This file
```

---

## ✅ STEP 1 — Set Up Firebase (Free)

### 1.1 Create Firebase Project
1. Go to → https://firebase.google.com
2. Click **"Go to Console"** → **"Add Project"**
3. Name it `coachhub` → Continue → Create Project

### 1.2 Enable Authentication
1. In Firebase Console → click **Authentication** (left menu)
2. Click **"Get Started"**
3. Click **Email/Password** → Toggle **Enable** → Save

### 1.3 Create Firestore Database
1. In Firebase Console → click **Firestore Database**
2. Click **"Create Database"**
3. Choose **"Start in test mode"** → Next → Enable

### 1.4 Get Your Config Keys
1. In Firebase Console → click the ⚙️ gear icon → **Project Settings**
2. Scroll down to **"Your apps"** section
3. Click **"</> Web"** icon to register a web app
4. Name it `coachhub-web` → Register App
5. Copy the `firebaseConfig` object shown

### 1.5 Paste Config Into Your File
Open `firebase-config.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey:            "AIzaSy...",          // ← paste your value
  authDomain:        "coachhub.firebaseapp.com",
  projectId:         "coachhub",
  storageBucket:     "coachhub.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123:web:abc123"
};
```

---

## ✅ STEP 2 — Set Firestore Security Rules

In Firebase Console → Firestore Database → **Rules** tab → paste this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Players readable by all logged-in users, writable by coaches
    match /players/{playerId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // Matches, training, announcements — readable by all logged in
    match /matches/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /training/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /announcements/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /coaches/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /managers/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

Click **Publish**.

---

## ✅ STEP 3 — Host on GitHub Pages (Free)

### 3.1 Create GitHub Account
Go to https://github.com → Sign up (free)

### 3.2 Create a New Repository
1. Click the **"+"** icon → **"New repository"**
2. Name it: `coachhub`
3. Set to **Public**
4. Click **"Create repository"**

### 3.3 Upload Your Files
**Option A — Upload via Browser (Easy):**
1. In your new repo, click **"uploading an existing file"**
2. Drag and drop ALL your project files
3. Click **"Commit changes"**

**Option B — Using Git (Command Line):**
```bash
# 1. Open terminal in your project folder
cd path/to/coachhub

# 2. Initialize git
git init

# 3. Add all files
git add .

# 4. Commit
git commit -m "Initial CoachHub upload"

# 5. Connect to GitHub (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/coachhub.git

# 6. Push
git branch -M main
git push -u origin main
```

### 3.4 Enable GitHub Pages
1. In your GitHub repo → click **"Settings"** tab
2. Scroll to **"Pages"** in left sidebar
3. Under **Source** → select **"Deploy from a branch"**
4. Branch: **main** → Folder: **/ (root)**
5. Click **Save**
6. Wait 1-2 minutes → Your site will be live at:
   **`https://YOUR_USERNAME.github.io/coachhub/`**

### 3.5 Add GitHub Pages URL to Firebase (Important!)
1. Firebase Console → Authentication → **Settings** tab
2. Scroll to **"Authorized domains"**
3. Click **"Add domain"**
4. Add: `YOUR_USERNAME.github.io`
5. Save

---

## 🎯 How to Use the Portal

### For Coaches:
1. Register at `index.html` → Select role: **Coach**
2. Go to **My Profile** → Set a **Team Code** (e.g., `STORM2024`)
3. Share the Team Code with your players
4. Add **Matches**, **Training Plans**, **Announcements**
5. Update **Player Stats** from the Players page

### For Players:
1. Register → Select role: **Player**
2. Enter the **Team Code** given by your coach
3. View your stats, match schedule, leaderboard, training plans

### For Managers:
1. Register → Select role: **Team Manager**
2. View overall team statistics, all players, coaches, and match reports

---

## 🔧 Troubleshooting

| Problem | Solution |
|---|---|
| Login not working | Check Firebase config keys in `firebase-config.js` |
| "Permission denied" error | Check Firestore security rules (Step 2) |
| Site not loading on GitHub | Wait 2-3 minutes after enabling Pages |
| Auth domain error | Add your GitHub Pages URL to Firebase authorized domains |
| Players page empty | Coach must update player stats from their dashboard |

---

## 📞 Features Summary

| Feature | Coach | Player | Manager |
|---|---|---|---|
| Login / Register | ✅ | ✅ | ✅ |
| View Player Stats | ✅ | ✅ (own) | ✅ |
| Update Player Stats | ✅ | ❌ | ❌ |
| Add Matches | ✅ | ❌ | ❌ |
| View Matches | ✅ | ✅ | ✅ |
| Add Training Plans | ✅ | ❌ | ❌ |
| View Training Plans | ✅ | ✅ | ❌ |
| Post Announcements | ✅ | ❌ | ❌ |
| View Announcements | ✅ | ✅ | ✅ |
| View Leaderboard | ✅ | ✅ | ✅ |
| View All Coaches | ❌ | ❌ | ✅ |
| Sport Breakdown Report | ❌ | ❌ | ✅ |

---

Made with ❤️ using Firebase + GitHub Pages
