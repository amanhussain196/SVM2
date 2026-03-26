/* ====================================================
   SVM FOODS LLC – admin.js
   Firebase Admin Panel Logic | ES Modules
   ==================================================== */

import {
  FIREBASE_ENABLED, FIREBASE_CONFIG, FB_VER, FB_BASE,
  COLLECTIONS, STORAGE_PATHS, initFirebase
} from './firebase-config.js';

/* ─── Ensure Firebase is configured ─── */
if (!FIREBASE_ENABLED) {
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;
      background:#0a0804;color:#c8a951;font-family:Poppins,sans-serif;text-align:center;padding:2rem;">
      <div>
        <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
        <h2 style="margin-bottom:0.5rem;">Firebase Not Configured</h2>
        <p style="color:rgba(255,255,255,0.5);margin-bottom:1.5rem;max-width:420px;">
          Open <code style="color:#c8a951;">firebase-config.js</code>, fill in your project credentials,
          and set <code style="color:#c8a951;">FIREBASE_ENABLED = true</code>.
        </p>
        <a href="FIREBASE_SETUP.md" style="color:#c8a951;">View Setup Guide →</a>
      </div>
    </div>`;
  throw new Error('Firebase not configured. See firebase-config.js');
}

/* ─── State ─── */
let firebase = null;
let db, auth, storage;
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const PAGE_SIZE = 25;
let deleteTargetId = null;
let editingProductId = null;
let selectedProductIds = new Set();

/* ─── Firebase SDK helpers (lazy import cache) ─── */
let _fsdk = null, _asdk = null, _ssdk = null;

async function getFSDK() {
  if (_fsdk) return _fsdk;
  const m = await import(`${FB_BASE}/firebase-firestore.js`);
  _fsdk = m; return m;
}
async function getASDK() {
  if (_asdk) return _asdk;
  const m = await import(`${FB_BASE}/firebase-auth.js`);
  _asdk = m; return m;
}
async function getSSDK() {
  if (_ssdk) return _ssdk;
  const m = await import(`${FB_BASE}/firebase-storage.js`);
  _ssdk = m; return m;
}

/* ════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════ */
async function init() {
  firebase = await initFirebase();
  if (!firebase) { showToast('Failed to connect to Firebase', 'error'); return; }
  db = firebase.db; auth = firebase.auth; storage = firebase.storage;

  setupAuth();
  setupNav();
  setupSidebar();
  setupProductForm();
  setupDeleteModal();
  setupDeleteAll();
  setupImport();
  setupSearch();
  setupBulkActions();
  bindNavButtons();
}

/* ════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════ */
function setupAuth() {
  const loginOverlay  = document.getElementById('login-overlay');
  const adminApp      = document.getElementById('admin-app');
  const loginBtn      = document.getElementById('login-btn');
  const loginErr      = document.getElementById('login-error');
  const emailIn       = document.getElementById('admin-email');
  const pwIn          = document.getElementById('admin-password');
  const pwToggle      = document.getElementById('pw-toggle');
  const logoutBtn     = document.getElementById('logout-btn');

  /* Toggle password visibility */
  pwToggle?.addEventListener('click', () => {
    const isText = pwIn.type === 'text';
    pwIn.type = isText ? 'password' : 'text';
  });

  /* Listen for auth state */
  getASDK().then(({ onAuthStateChanged }) => {
    onAuthStateChanged(auth, user => {
      if (user) {
        loginOverlay.style.display = 'none';
        adminApp.style.display = 'flex';
        document.getElementById('admin-name').textContent = user.displayName || 'Admin';
        document.getElementById('admin-email-disp').textContent = user.email;
        document.getElementById('admin-avatar').textContent =
          (user.displayName || user.email || 'A')[0].toUpperCase();
        loadDashboard();
        loadProductsFromFirestore();
      } else {
        loginOverlay.style.display = 'flex';
        adminApp.style.display = 'none';
      }
    });
  });

  /* Login */
  loginBtn?.addEventListener('click', async () => {
    const email = emailIn.value.trim();
    const pw    = pwIn.value;
    if (!email || !pw) { showLoginError('Please enter email and password.'); return; }
    setLoginLoading(true);
    loginErr.style.display = 'none';
    try {
      const { signInWithEmailAndPassword } = await getASDK();
      await signInWithEmailAndPassword(auth, email, pw);
    } catch (err) {
      setLoginLoading(false);
      showLoginError(friendlyAuthError(err.code));
    }
  });

  /* Logout */
  logoutBtn?.addEventListener('click', async () => {
    const { signOut } = await getASDK();
    await signOut(auth);
  });

  /* Enter key on login */
  pwIn?.addEventListener('keydown', e => { if (e.key === 'Enter') loginBtn.click(); });
  emailIn?.addEventListener('keydown', e => { if (e.key === 'Enter') pwIn.focus(); });
}

function setLoginLoading(on) {
  const btn  = document.getElementById('login-btn');
  const text = document.getElementById('login-btn-text');
  const spin = document.getElementById('login-spinner');
  btn.disabled = on;
  text.textContent = on ? 'Signing in…' : 'Sign In';
  spin.style.display = on ? 'block' : 'none';
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg; el.style.display = 'block';
}

function friendlyAuthError(code) {
  const map = {
    'auth/user-not-found': 'No admin account found with that email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment.',
    'auth/invalid-credential': 'Invalid email or password.',
  };
  return map[code] || 'Sign in failed. Check your credentials.';
}

/* ════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════ */
const VIEWS = {
  dashboard: 'view-dashboard',
  products:  'view-products',
  add:       'view-add',
  import:    'view-import',
};
const VIEW_TITLES = {
  dashboard: 'Dashboard',
  products:  'Products',
  add:       'Add Product',
  import:    'Import JSON',
};

function setupNav() {
  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      switchView(el.dataset.view);
    });
  });
}

function bindNavButtons() {
  // Dynamically added buttons also need data-view
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-view]');
    if (el) { e.preventDefault(); switchView(el.dataset.view); }
  });
}

function switchView(viewKey) {
  Object.values(VIEWS).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const target = document.getElementById(VIEWS[viewKey]);
  if (target) target.style.display = 'block';

  document.querySelectorAll('.sb-link').forEach(l => {
    l.classList.toggle('active', l.dataset.view === viewKey);
  });
  document.getElementById('topbar-title').textContent = VIEW_TITLES[viewKey] || viewKey;

  if (viewKey === 'add' && !editingProductId) {
    document.getElementById('form-view-title').textContent = 'Add Product';
    resetProductForm();
  }
}

/* ════════════════════════════════════════════════════
   SIDEBAR TOGGLE (mobile)
═══════════════════════════════════════════════════ */
function setupSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle  = document.getElementById('sidebar-toggle');
  toggle?.addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

/* ════════════════════════════════════════════════════
   LOAD PRODUCTS FROM FIRESTORE
═══════════════════════════════════════════════════ */
async function loadProductsFromFirestore() {
  try {
    const { getDocs, collection, orderBy, query } = await getFSDK();
    const q  = query(collection(db, COLLECTIONS.products), orderBy('name'));
    const snap = await getDocs(q);
    allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    filteredProducts = [...allProducts];
    renderProductsTable();
    updateCatFilter();
  } catch (err) {
    console.error('Error loading products:', err);
    showToast('Failed to load products from Firestore', 'error');
  }
}

/* ════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════ */
async function loadDashboard() {
  // Stats are derived from allProducts (loaded separately)
  // Set up a listener to re-render when allProducts changes
  updateDashboardStats();
}

function updateDashboardStats() {
  setTimeout(() => {
    const withImgs = allProducts.filter(p => p.images && p.images.length > 0).length;
    const cats = new Set(allProducts.map(p => p.category)).size;
    document.getElementById('stat-total').textContent   = allProducts.length;
    document.getElementById('stat-cats').textContent    = cats;
    document.getElementById('stat-imgs').textContent    = withImgs;
    document.getElementById('stat-noimgs').textContent  = allProducts.length - withImgs;
    renderRecentProducts();
  }, 500);
}

function renderRecentProducts() {
  const el = document.getElementById('recent-products-list');
  const recent = [...allProducts].slice(0, 8);
  if (recent.length === 0) {
    el.innerHTML = '<div class="loading-row">No products yet. <a data-view="import" style="color:var(--gold);cursor:pointer;margin-left:4px;">Import JSON →</a></div>';
    return;
  }
  el.innerHTML = recent.map(p => {
    const hasImg = p.images && p.images.length > 0;
    const imgHtml = hasImg
      ? `<div class="recent-thumb"><img src="${p.images[0]}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='📦'" /></div>`
      : `<div class="recent-thumb">📦</div>`;
    return `<div class="recent-item">
      ${imgHtml}
      <div>
        <div class="recent-name">${escHtml(p.title || p.name)}</div>
        <div class="recent-cat">${escHtml(p.category)}</div>
      </div>
      <span class="recent-badge ${hasImg ? 'badge-imgs' : 'badge-noimg'}">${hasImg ? '✓ Image' : 'No Image'}</span>
    </div>`;
  }).join('');
}

/* ════════════════════════════════════════════════════
   PRODUCTS TABLE
═══════════════════════════════════════════════════ */
function renderProductsTable() {
  const tbody = document.getElementById('products-tbody');
  const label  = document.getElementById('products-count-label');

  if (filteredProducts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-loading">No products found.</td></tr>';
    label.textContent = '0 products';
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const page  = filteredProducts.slice(start, start + PAGE_SIZE);
  label.textContent = `${filteredProducts.length} products`;

  tbody.innerHTML = page.map(p => {
    const imgSrc = (p.images && p.images[0]) ? p.images[0] : null;
    const thumbHtml = imgSrc
      ? `<div class="tbl-thumb"><img src="${imgSrc}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='📦'" /></div>`
      : `<div class="tbl-thumb">📦</div>`;
    const isChecked = selectedProductIds.has(p.id);
    return `<tr data-id="${p.id}" class="${isChecked ? 'row-selected' : ''}">
      <td><input type="checkbox" class="prod-cb" data-id="${p.id}" ${isChecked ? 'checked' : ''} /></td>
      <td>${thumbHtml}</td>
      <td><div class="tbl-name" title="${escHtml(p.title || p.name)}">${escHtml(p.title || p.name)}</div></td>
      <td><span class="tbl-cat">${escHtml(p.category)}</span></td>
      <td><div class="tbl-desc">${escHtml(p.description || '—')}</div></td>
      <td>
        <div class="tbl-actions">
          <button class="btn-edit" data-edit="${p.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <button class="btn-del" data-delete="${p.id}" data-name="${escHtml(p.title || p.name)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
            Delete
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  /* Bind Checkboxes */
  tbody.querySelectorAll('.prod-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) selectedProductIds.add(cb.dataset.id);
      else selectedProductIds.delete(cb.dataset.id);
      updateBulkActionBar();
    });
  });

  /* Event delegation for edit/delete */
  tbody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => startEdit(btn.dataset.edit));
  });
  tbody.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => showDeleteModal(btn.dataset.delete, btn.dataset.name));
  });

  renderPagination();
  updateDashboardStats();
}

function renderPagination() {
  const total = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const pag = document.getElementById('table-pagination');
  if (total <= 1) { pag.innerHTML = ''; return; }

  let html = '';
  for (let i = 1; i <= total; i++) {
    html += `<button class="page-btn${i === currentPage ? ' active' : ''}" data-page="${i}">${i}</button>`;
  }
  pag.innerHTML = html;
  pag.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.dataset.page);
      renderProductsTable();
      window.scrollTo(0, 0);
    });
  });
}

/* ════════════════════════════════════════════════════
   SEARCH & FILTER
═══════════════════════════════════════════════════ */
function setupSearch() {
  const searchIn = document.getElementById('prod-search');
  const catFil   = document.getElementById('prod-cat-filter');

  searchIn?.addEventListener('input', applyFilters);
  catFil?.addEventListener('change', applyFilters);
}

function applyFilters() {
  const q   = document.getElementById('prod-search').value.toLowerCase().trim();
  const cat = document.getElementById('prod-cat-filter').value;

  filteredProducts = allProducts.filter(p => {
    const nameLow = (p.title || p.name || '').toLowerCase();
    const descLow = (p.description || '').toLowerCase();
    const catLow  = (p.category || '').toLowerCase();
    const matchQ   = !q || nameLow.includes(q) || descLow.includes(q) || catLow.includes(q);
    const matchCat = !cat || p.category === cat;
    return matchQ && matchCat;
  });
  currentPage = 1;
  selectedProductIds.clear();
  updateBulkActionBar();
  renderProductsTable();
}

function updateCatFilter() {
  const filterSel = document.getElementById('prod-cat-filter');
  const formSel   = document.getElementById('p-category');
  const bulkSel   = document.getElementById('bulk-new-cat');
  
  // Get unique categories from allProducts
  const cats = [...new Set(allProducts.map(p => p.category))].sort();
  
  // Helper to add unique options
  const syncSelect = (sel, list, keepFirst = true) => {
    if (!sel) return;
    const existing = new Set([...sel.options].map(o => o.value));
    list.forEach(c => {
      if (c && !existing.has(c)) {
        const opt = document.createElement('option');
        opt.value = c; opt.textContent = c;
        sel.appendChild(opt);
      }
    });
  };

  syncSelect(filterSel, cats);
  syncSelect(formSel, cats);
  syncSelect(bulkSel, cats);
}

/* ════════════════════════════════════════════════════
   BULK ACTIONS
   ═══════════════════════════════════════════════════ */
function setupBulkActions() {
  const selectAllCb = document.getElementById('select-all-cb');
  const updateBtn  = document.getElementById('bulk-update-btn');
  const deleteBtn  = document.getElementById('bulk-delete-btn');

  selectAllCb?.addEventListener('change', () => {
    if (selectAllCb.checked) {
      filteredProducts.forEach(p => selectedProductIds.add(p.id));
    } else {
      selectedProductIds.clear();
    }
    renderProductsTable();
    updateBulkActionBar();
  });

  updateBtn?.addEventListener('click', executeBulkUpdate);
  deleteBtn?.addEventListener('click', executeBulkDelete);
}

function updateBulkActionBar() {
  const bar = document.getElementById('bulk-actions');
  const countLabel = document.getElementById('bulk-count');
  const size = selectedProductIds.size;

  if (size > 0) {
    bar.style.display = 'flex';
    countLabel.textContent = `${size} product${size === 1 ? '' : 's'} selected`;
  } else {
    bar.style.display = 'none';
    const selectAllCb = document.getElementById('select-all-cb');
    if (selectAllCb) selectAllCb.checked = false;
  }
}

async function executeBulkUpdate() {
  const newCat = document.getElementById('bulk-new-cat').value;
  if (!newCat) { showToast('Select a category first', 'info'); return; }
  
  if (!confirm(`Are you sure you want to move ${selectedProductIds.size} products to "${newCat}"?`)) return;

  setBulkUpdateLoading(true);
  try {
    const { writeBatch, doc, serverTimestamp } = await getFSDK();
    const batch = writeBatch(db);
    const ids = Array.from(selectedProductIds);

    ids.forEach(id => {
      const ref = doc(db, COLLECTIONS.products, id);
      batch.update(ref, { category: newCat, updatedAt: serverTimestamp() });
    });

    await batch.commit();

    // Update local state
    allProducts.forEach(p => {
      if (selectedProductIds.has(p.id)) p.category = newCat;
    });

    showToast(`Successfully updated ${ids.length} products`, 'success');
    selectedProductIds.clear();
    updateBulkActionBar();
    applyFilters();
    updateCatFilter();
  } catch (err) {
    console.error('Bulk update failed:', err);
    showToast('Bulk update failed: ' + err.message, 'error');
  } finally {
    setBulkUpdateLoading(false);
  }
}

async function executeBulkDelete() {
  if (!confirm(`Permanently delete ${selectedProductIds.size} products? This cannot be undone.`)) return;

  setBulkUpdateLoading(true); // Re-use spinner or similar
  try {
    const { writeBatch, doc } = await getFSDK();
    const batch = writeBatch(db);
    const ids = Array.from(selectedProductIds);

    ids.forEach(id => {
      batch.delete(doc(db, COLLECTIONS.products, id));
    });

    await batch.commit();

    // Update local state
    allProducts = allProducts.filter(p => !selectedProductIds.has(p.id));

    showToast(`Successfully deleted ${ids.length} products`, 'success');
    selectedProductIds.clear();
    updateBulkActionBar();
    applyFilters();
  } catch (err) {
    console.error('Bulk delete failed:', err);
    showToast('Bulk delete failed: ' + err.message, 'error');
  } finally {
    setBulkUpdateLoading(false);
  }
}

function setBulkUpdateLoading(on) {
  const btn = document.getElementById('bulk-update-btn');
  const text = document.getElementById('bulk-update-text');
  const spin = document.getElementById('bulk-update-spinner');
  btn.disabled = on;
  text.style.display = on ? 'none' : 'block';
  spin.style.display = on ? 'block' : 'none';
}

/* ════════════════════════════════════════════════════
   PRODUCT FORM (ADD / EDIT)
   ═══════════════════════════════════════════════════ */
function setupProductForm() {
  const form     = document.getElementById('product-form');
  const stockCb  = document.getElementById('p-instock');
  const stockLbl = document.getElementById('stock-label');

  /* Stock toggle label */
  stockCb?.addEventListener('change', () => {
    stockLbl.textContent = stockCb.checked ? 'In Stock' : 'Out of Stock';
  });

  /* New category toggle */
  const btnAddCat   = document.getElementById('btn-add-cat');
  const newCatWrap  = document.getElementById('new-cat-wrap');
  const catSelect   = document.getElementById('p-category');
  const newCatInput = document.getElementById('p-new-category');

  btnAddCat?.addEventListener('click', () => {
    const isHidden = newCatWrap.style.display === 'none';
    newCatWrap.style.display = isHidden ? 'block' : 'none';
    btnAddCat.textContent = isHidden ? '×' : '+';
    btnAddCat.title = isHidden ? 'Cancel New Category' : 'Add New Category';
    if (isHidden) {
      catSelect.value = '';
      catSelect.disabled = true;
      newCatInput.focus();
    } else {
      catSelect.disabled = false;
      newCatInput.value = '';
    }
  });

  /* Form submit */
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    await saveProduct();
  });
}

// Image preview logic removed - now using dedicated link inputs

function resetProductForm() {
  document.getElementById('product-form').reset();
  document.getElementById('edit-product-id').value = '';
  document.getElementById('stock-label').textContent = 'In Stock';
  document.getElementById('p-img1').value = '';
  document.getElementById('p-img2').value = '';
  document.getElementById('p-img3').value = '';
  
  // Reset new category field
  const newCatWrap  = document.getElementById('new-cat-wrap');
  const btnAddCat   = document.getElementById('btn-add-cat');
  const catSelect   = document.getElementById('p-category');
  if (newCatWrap) newCatWrap.style.display = 'none';
  if (btnAddCat) {
    btnAddCat.textContent = '+';
    btnAddCat.title = 'Add New Category';
  }
  if (catSelect) {
    catSelect.disabled = false;
    catSelect.value = '';
  }
  document.getElementById('p-new-category').value = '';

  editingProductId = null;
}

function startEdit(productId) {
  const p = allProducts.find(x => x.id === productId);
  if (!p) return;

  editingProductId = productId;
  document.getElementById('edit-product-id').value  = productId;
  document.getElementById('p-name').value           = p.title || p.name || '';
  document.getElementById('p-category').value       = p.category || '';
  document.getElementById('p-description').value    = p.description || '';
  document.getElementById('p-variant').value        = p.variant || '';
  document.getElementById('p-price').value          = p.price || '';
  document.getElementById('p-instock').checked      = p.inStock !== false;
  document.getElementById('stock-label').textContent = (p.inStock !== false) ? 'In Stock' : 'Out of Stock';
  
  // Populate image inputs
  const imgs = p.images || [];
  document.getElementById('p-img1').value = imgs[0] || '';
  document.getElementById('p-img2').value = imgs[1] || '';
  document.getElementById('p-img3').value = imgs[2] || '';

  document.getElementById('form-view-title').textContent = 'Edit Product';
  switchView('add');
}

async function saveProduct() {
  const nameVal = document.getElementById('p-name').value.trim();
  const catSelect = document.getElementById('p-category');
  const newCatInput = document.getElementById('p-new-category');
  const newCatWrap = document.getElementById('new-cat-wrap');

  let catVal = catSelect.value;
  if (newCatWrap.style.display !== 'none') {
    catVal = newCatInput.value.trim();
  }
  
  if (!nameVal || !catVal) { 
    showToast('Name and category are required', 'error'); 
    return; 
  }

  setSaveLoading(true);
  try {
    const { setDoc, addDoc, doc, collection, serverTimestamp } = await getFSDK();

    /* Collect image links */
    const imgs = [
      document.getElementById('p-img1').value.trim(),
      document.getElementById('p-img2').value.trim(),
      document.getElementById('p-img3').value.trim()
    ].filter(s => s); // Remove empty strings

    const productData = {
      name:        nameVal,
      title:       nameVal,
      category:    catVal,
      description: document.getElementById('p-description').value.trim(),
      variant:     document.getElementById('p-variant').value.trim(),
      price:       document.getElementById('p-price').value.trim(),
      inStock:     document.getElementById('p-instock').checked,
      images:      imgs,
      updatedAt:   serverTimestamp(),
    };

    if (editingProductId) {
      await setDoc(doc(db, COLLECTIONS.products, editingProductId), productData, { merge: true });
      const idx = allProducts.findIndex(p => p.id === editingProductId);
      if (idx !== -1) allProducts[idx] = { id: editingProductId, ...productData };
      showToast('Product updated successfully', 'success');
    } else {
      productData.createdAt = serverTimestamp();
      const ref = await addDoc(collection(db, COLLECTIONS.products), productData);
      allProducts.push({ id: ref.id, ...productData });
      showToast('Product added successfully', 'success');
    }

    filteredProducts = [...allProducts];
    resetProductForm();
    switchView('products');
    renderProductsTable();
    updateCatFilter();

  } catch (err) {
    console.error('[Save] Error:', err);
    showToast('Failed to save product: ' + err.message, 'error');
  } finally {
    setSaveLoading(false);
  }
}

// Upload functions removed to keep project free and simple
function setSaveLoading(on) {
  const btn  = document.getElementById('save-btn');
  const text = document.getElementById('save-btn-text');
  const spin = document.getElementById('save-spinner');
  btn.disabled = on;
  text.textContent = on ? 'Saving…' : (editingProductId ? 'Update Product' : 'Save Product');
  spin.style.display = on ? 'inline-block' : 'none';
}

/* ════════════════════════════════════════════════════
   DELETE
═══════════════════════════════════════════════════ */
function setupDeleteModal() {
  document.getElementById('cancel-delete')?.addEventListener('click', hideDeleteModal);
  document.getElementById('confirm-delete')?.addEventListener('click', executeDelete);
  document.getElementById('delete-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) hideDeleteModal();
  });
}

function showDeleteModal(id, name) {
  deleteTargetId = id;
  document.getElementById('delete-product-name').textContent = name;
  document.getElementById('delete-modal').style.display = 'flex';
}
function hideDeleteModal() {
  document.getElementById('delete-modal').style.display = 'none';
  deleteTargetId = null;
}

async function executeDelete() {
  if (!deleteTargetId) return;
  setDeleteLoading(true);
  try {
    const { deleteDoc, doc } = await getFSDK();
    await deleteDoc(doc(db, COLLECTIONS.products, deleteTargetId));
    allProducts = allProducts.filter(p => p.id !== deleteTargetId);
    filteredProducts = filteredProducts.filter(p => p.id !== deleteTargetId);
    renderProductsTable();
    showToast('Product deleted', 'success');
    hideDeleteModal();
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  } finally {
    setDeleteLoading(false);
  }
}

function setDeleteLoading(on) {
  const btn  = document.getElementById('confirm-delete');
  const text = document.getElementById('del-btn-text');
  const spin = document.getElementById('del-spinner');
  btn.disabled = on;
  text.textContent = on ? 'Deleting…' : 'Delete';
  spin.style.display = on ? 'inline-block' : 'none';
}

/* ════════════════════════════════════════════════════
   DELETE ALL
═══════════════════════════════════════════════════ */
function setupDeleteAll() {
  document.getElementById('delete-all-btn')?.addEventListener('click', showDeleteAllModal);
  document.getElementById('cancel-delete-all')?.addEventListener('click', hideDeleteAllModal);
  document.getElementById('confirm-delete-all')?.addEventListener('click', executeDeleteAll);
  document.getElementById('delete-all-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) hideDeleteAllModal();
  });
}

function showDeleteAllModal() {
  if (allProducts.length === 0) {
    showToast('No products to delete', 'info');
    return;
  }
  document.getElementById('delete-all-count').textContent = allProducts.length;
  document.getElementById('delete-all-modal').style.display = 'flex';
}

function hideDeleteAllModal() {
  document.getElementById('delete-all-modal').style.display = 'none';
}

async function executeDeleteAll() {
  setDeleteAllLoading(true);
  try {
    const { writeBatch, doc } = await getFSDK();
    
    // Process in batches of 500 (Firestore limit)
    const total = allProducts.length;
    let deletedCount = 0;
    
    while (allProducts.length > 0) {
      const batch = writeBatch(db);
      const chunk = allProducts.splice(0, 500);
      chunk.forEach(p => {
        batch.delete(doc(db, COLLECTIONS.products, p.id));
      });
      await batch.commit();
      deletedCount += chunk.length;
    }

    allProducts = [];
    filteredProducts = [];
    renderProductsTable();
    showToast(`Successfully wiped ${deletedCount} products.`, 'success');
    hideDeleteAllModal();
  } catch (err) {
    console.error('Wipe failed:', err);
    showToast('Wipe failed: ' + err.message, 'error');
  } finally {
    setDeleteAllLoading(false);
  }
}

function setDeleteAllLoading(on) {
  const btn  = document.getElementById('confirm-delete-all');
  const text = document.getElementById('del-all-btn-text');
  const spin = document.getElementById('del-all-spinner');
  btn.disabled = on;
  text.textContent = on ? 'Wiping…' : 'Confirm Wipe';
  spin.style.display = on ? 'inline-block' : 'none';
}

/* ════════════════════════════════════════════════════
   IMPORT FROM products.json
═══════════════════════════════════════════════════ */
function setupImport() {
  document.getElementById('start-import-btn')?.addEventListener('click', startImport);
}

async function startImport() {
  const status = document.getElementById('import-status');
  const progress = document.getElementById('import-progress-wrap');
  const fill = document.getElementById('import-progress-fill');
  const text = document.getElementById('import-progress-text');
  const btn  = document.getElementById('start-import-btn');

  btn.disabled = true;
  status.style.display = 'none';
  progress.style.display = 'block';
  fill.style.width = '0%';
  text.textContent = 'Fetching products.json…';

  try {
    /* Fetch local products.json */
    const res = await fetch('products.json');
    if (!res.ok) throw new Error('products.json not found. Make sure you are running from the project root.');
    let products = await res.json();
    if (!Array.isArray(products)) products = products.products || [];
    if (products.length === 0) throw new Error('No products found in products.json');

    const { addDoc, collection, serverTimestamp, getDocs, query } = await getFSDK();

    /* Check how many already exist */
    const existing = await getDocs(query(collection(db, COLLECTIONS.products)));
    if (existing.size > 0) {
      showImportStatus(`⚠️ ${existing.size} products already exist in Firestore. Importing ${products.length} more (duplicates may occur).`, 'info');
    }

    let done = 0;
    const total = products.length;

    for (const p of products) {
      const doc = {
        name:        p.name || p.title || '',
        title:       p.name || p.title || '',
        category:    p.category || p.Category || '',
        description: p.description || p.Description || '',
        variant:     p.variant || '',
        price:       p.price || '',
        inStock:     true,
        images:      Array.isArray(p.images) ? p.images : [],
        createdAt:   serverTimestamp(),
        importedAt:  serverTimestamp(),
        source:      'json-import',
      };
      await addDoc(collection(db, COLLECTIONS.products), doc);
      done++;
      const pct = Math.round((done / total) * 100);
      fill.style.width = `${pct}%`;
      text.textContent = `Importing ${done} / ${total} products…`;
    }

    showImportStatus(`✅ Successfully imported ${done} products into Firestore!`, 'success');
    await loadProductsFromFirestore();

  } catch (err) {
    showImportStatus(`❌ Import failed: ${err.message}`, 'error');
    console.error(err);
  } finally {
    btn.disabled = false;
    progress.style.display = 'none';
  }
}

function showImportStatus(msg, type) {
  const el = document.getElementById('import-status');
  el.textContent = msg;
  el.className = `import-status ${type}`;
  el.style.display = 'block';
}

/* ════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
═══════════════════════════════════════════════════ */
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/* ─── HELPERS ─── */
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── KICK OFF ─── */
init();
