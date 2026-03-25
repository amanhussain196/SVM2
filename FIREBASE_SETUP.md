# 🔥 Firebase Setup Guide — SVM FOODS LLC

> Transform your static catalog into a dynamic, admin-managed system in **~15 minutes**.

---

## Architecture Overview

```
GitHub Pages (static host)          Firebase (backend)
─────────────────────────           ────────────────────────
index.html  ←──────────────────────── Firestore (products DB)
script.js   ──── loads products ────►
admin.html  ──── CRUD, upload ──────► Storage (product images)
admin.js    ──── login ─────────────► Authentication (admin)
```

- **Public users** → read products from Firestore (or local JSON as fallback)
- **Admin users** → login at `admin.html`, manage products, upload images

---

## Step 1 — Create a Firebase Project

1. Go to https://console.firebase.google.com
2. Click **Add project** → name it `svm-foods`
3. Disable Google Analytics (optional) → **Create project**

---

## Step 2 — Enable Firebase Services

### Firestore Database
1. Firebase Console → **Firestore Database** → **Create database**
2. Select **Start in production mode**
3. Choose a region close to you (e.g. `us-east1`)

### Firebase Storage
1. **Storage** → **Get started** → Production mode → Done

### Authentication
1. **Authentication** → **Get started**
2. Click **Email/Password** provider → Enable → Save
3. Go to **Users** tab → **Add user**
4. Enter your admin email and a strong password → Add user

---

## Step 3 — Get Your Config Keys

1. Firebase Console → ⚙️ **Project Settings**
2. Scroll to **Your apps** → **Add app** → Web (`</>`)
3. Register the app (name: `svm-web`) → **Register app**
4. Copy the `firebaseConfig` object shown

---

## Step 4 — Update `firebase-config.js`

Open `firebase-config.js` and paste your config:

```javascript
export const FIREBASE_CONFIG = {
  apiKey:            "AIza...",
  authDomain:        "svm-foods.firebaseapp.com",
  projectId:         "svm-foods",
  storageBucket:     "svm-foods.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
};

// Change this to true once config is filled
export const FIREBASE_ENABLED = true;
```

---

## Step 5 — Apply Firestore Security Rules

1. Firebase Console → **Firestore Database** → **Rules** tab
2. Paste the contents of `firestore.rules` → **Publish**

---

## Step 6 — Apply Storage Security Rules

1. Firebase Console → **Storage** → **Rules** tab
2. Replace with:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /product_images/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```
3. Click **Publish**

---

## Step 7 — Import Your Existing Products

1. Open `admin.html` in your browser
2. Log in with the admin email/password you created
3. Go to **Import JSON** in the sidebar
4. Click **Start Import**
5. All products from `products.json` will load into Firestore

---

## Step 8 — Deploy to GitHub Pages

Push all new files to your GitHub repo:
- `firebase-config.js`
- `admin.html`, `admin.css`, `admin.js`
- `firestore.rules`
- Updated `script.js`, `index.html`

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| "Firebase not configured" | Set `FIREBASE_ENABLED = true` |
| Products not loading | Check browser console for errors |
| Can't log in | Verify user in Firebase Auth console |
| Images fail to upload | Check Storage rules |
| Import fails | Make sure `products.json` is accessible |

---

## Security Notes

- Only authenticated admins can write/delete products
- Public users can only read product data
- `admin.html` is hidden from search engines (`noindex`)
- Do NOT commit real API keys to public repos
