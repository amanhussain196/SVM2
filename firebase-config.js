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
  apiKey: "AIzaSyB8n6Gnly9ReX4YzkwLp__xyHxf6OX67SA",
  authDomain: "svmfoods-4291c.firebaseapp.com",
  projectId: "svmfoods-4291c",
  storageBucket: "svmfoods-4291c.firebasestorage.app",
  messagingSenderId: "1052931988050",
  appId: "1:1052931988050:web:37a9615a7010690dfa9d8b",
  measurementId: "G-TW95H1B1H2"
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
