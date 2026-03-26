/* ====================================================
   SVM FOODS LLC – firebase-config.js
   Firebase v10 — ES Modules (CDN)
   ====================================================
   SETUP INSTRUCTIONS:
   1. Go to https://console.firebase.google.com
   2. Create a new project (e.g. "svm-foods")
   3. Add a Web App to your project
   4. Copy your config values below
   5. Set FIREBASE_ENABLED = true
   ==================================================== */

/* ── Step 1: Paste your Firebase project config here ── */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCH5DYwVBlRkFBwx_rBMPXPcQabzuTiAHQ",
  authDomain: "webadminsvm-38a19.firebaseapp.com",
  projectId: "webadminsvm-38a19",
  storageBucket: "webadminsvm-38a19.firebasestorage.app",
  messagingSenderId: "44706705114",
  appId: "1:44706705114:web:5094853e10b1dd17ae7fe3",
  measurementId: "G-DBEZN00JMY"
};

/* ── Step 2: Set this to true once config is filled ── */
export const FIREBASE_ENABLED = true;

/* ── Firebase SDK version ── */
export const FB_VER = '10.11.0';
export const FB_BASE = `https://www.gstatic.com/firebasejs/${FB_VER}`;

/* ─────────────────────────────────────────────────────
   initFirebase()
   Dynamically imports Firebase SDKs (only when needed).
   Returns { db, auth, storage } or null if disabled.
───────────────────────────────────────────────────── */
let _firebase = null;

export async function initFirebase() {
  if (!FIREBASE_ENABLED) return null;
  if (_firebase) return _firebase;   // already initialized

  try {
    const [
      { initializeApp },
      { getFirestore, enableIndexedDbPersistence },
      { getAuth },
      { getStorage }
    ] = await Promise.all([
      import(`${FB_BASE}/firebase-app.js`),
      import(`${FB_BASE}/firebase-firestore.js`),
      import(`${FB_BASE}/firebase-auth.js`),
      import(`${FB_BASE}/firebase-storage.js`)
    ]);

    const app     = initializeApp(FIREBASE_CONFIG);
    const db      = getFirestore(app);
    const auth    = getAuth(app);
    const storage = getStorage(app);

    /* Enable offline persistence (speeds up repeat visits) */
    try { await enableIndexedDbPersistence(db); } catch(_) {}

    _firebase = { app, db, auth, storage };
    return _firebase;
  } catch (err) {
    console.error('[Firebase] Init failed:', err);
    return null;
  }
}

/* ─── Firestore Collection Names ─── */
export const COLLECTIONS = {
  products:   'products',
  categories: 'categories'
};

/* ─── Storage Paths ─── */
export const STORAGE_PATHS = {
  products: 'product_images'
};
