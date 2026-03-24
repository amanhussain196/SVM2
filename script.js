/* ====================================================
   SVM FOODS LLC – script.js
   Vanilla JavaScript | No frameworks
   ==================================================== */

'use strict';

/* ─── CATEGORY METADATA ─────────────────────────── */
const CATEGORY_META = {
  'RICE':             { icon: '🍚', label: 'Rice',            img: 'images/categories/rice.png' },
  'SPICES':           { icon: '🌶️', label: 'Spices',          img: 'images/categories/spices.png' },
  'MDH SPICES':       { icon: '🟤', label: 'MDH Spices',      img: 'images/categories/mdh_spices.png' },
  'CANNED PRODUCTS':  { icon: '🥫', label: 'Canned',          img: 'images/categories/canned.png' },
  'SHAN SPICES':      { icon: '🟡', label: 'Shan Spices',     img: 'images/categories/shan_spices.png' },
  'DALS & BEANS':     { icon: '🫘', label: 'Dals & Beans',    img: 'images/categories/dals_beans.png' },
  'FLOURS':           { icon: '🌾', label: 'Flours',          img: 'images/categories/flours.png' },
  'NUTS & DRY FRUITS':{ icon: '🥜', label: 'Nuts & Fruits',   img: 'images/categories/nuts_fruits.png' },
  'PICKLES / CHUTNEY':{ icon: '🫙', label: 'Pickles',         img: 'images/categories/pickles.png' },
  'FROZEN':           { icon: '❄️', label: 'Frozen',          img: 'images/categories/frozen.png' },
  'OIL':              { icon: '🫒', label: 'Oil',             img: 'images/categories/oil.png' },
  'TEA & COFFEE':     { icon: '🍵', label: 'Tea & Coffee',    img: 'images/categories/tea_coffee.png' },
  'SNACKS':           { icon: '🍿', label: 'Snacks',          img: 'images/categories/snacks.png' },
  'PAPADS':           { icon: '🫓', label: 'Papads',          img: 'images/categories/snacks.png' },
  'Dairy':            { icon: '🥛', label: 'Dairy',           img: 'images/categories/dairy.png' },
  'Drinks':           { icon: '🥤', label: 'Drinks',          img: 'images/categories/drinks.png' },
  'Meat':             { icon: '🥩', label: 'Meat',            img: 'images/categories/meat.png' },
};

/* Fallback icon for any unexpected categories */
function getCatIcon(cat) {
  return (CATEGORY_META[cat] && CATEGORY_META[cat].icon) || '📦';
}
function getCatImg(cat) {
  return (CATEGORY_META[cat] && CATEGORY_META[cat].img) || null;
}

/* ─── STATE ─────────────────────────────────────── */
let allProducts      = [];
let filteredProducts = [];
let activeCategory   = 'ALL';
let searchQuery      = '';

/* Modal slider state */
let modalImages_list  = [];
let modalCurrentIndex = 0;

/* ─── DOM REFS ──────────────────────────────────── */
const loadingScreen   = document.getElementById('loading-screen');
const productsGrid    = document.getElementById('products-grid');
const categoriesGrid  = document.getElementById('categories-grid');
const searchInput     = document.getElementById('search-input');
const searchClear     = document.getElementById('search-clear');
const filterWrap      = document.querySelector('.filter-scroll');
const noResults       = document.getElementById('no-results');
const resultsInfo     = document.getElementById('results-info');
const resetBtn        = document.getElementById('reset-filters');
const statProducts    = document.getElementById('stat-products');
const navbar          = document.getElementById('navbar');
const navToggle       = document.getElementById('nav-toggle');
const navLinks        = document.getElementById('nav-links');
const backToTop       = document.getElementById('back-to-top');
const modalOverlay    = document.getElementById('modal-overlay');
const modalClose      = document.getElementById('modal-close');
const modalCatBadge   = document.getElementById('modal-cat-badge');
const modalTitle      = document.getElementById('modal-title');
const modalVariant    = document.getElementById('modal-variant');
const modalDesc       = document.getElementById('modal-desc');
const contactForm     = document.getElementById('contact-form');
const formSuccess     = document.getElementById('form-success');

/* Slider elements (new) */
const sliderTrack     = document.getElementById('slider-track');
const sliderDots      = document.getElementById('slider-dots');
const sliderPrev      = document.getElementById('slider-prev');
const sliderNext      = document.getElementById('slider-next');

/* ─── LOADING SCREEN ────────────────────────────── */
window.addEventListener('load', () => {
  setTimeout(() => loadingScreen.classList.add('fade-out'), 1800);
});

/* ─── FETCH PRODUCTS ────────────────────────────── */
async function loadProducts() {
  try {
    const res = await fetch('products.json');
    if (!res.ok) throw new Error('Failed to load products.json');
    allProducts      = await res.json();
    filteredProducts = [...allProducts];
    updateStatCount();
    buildCategoryCards();
    buildFilterButtons();
    renderProducts();
  } catch (err) {
    console.error('Error loading products:', err);
    productsGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-light);">
        <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
        <p>Could not load products. Please open via a local server (e.g. <strong>python -m http.server 8080</strong>).</p>
      </div>`;
  }
}

/* ─── STAT COUNTER ANIMATION ────────────────────── */
function updateStatCount() {
  const target = allProducts.length;
  let count = 0;
  const step = Math.ceil(target / 40);
  const timer = setInterval(() => {
    count = Math.min(count + step, target);
    if (statProducts) statProducts.textContent = count + '+';
    if (count >= target) clearInterval(timer);
  }, 35);
}

/* ─── CATEGORY CARDS ────────────────────────────── */
function buildCategoryCards() {
  if (!categoriesGrid) return;

  const counts = {};
  allProducts.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });

  const ordered = Object.keys(CATEGORY_META);
  const extras  = Object.keys(counts).filter(c => !ordered.includes(c));
  const all     = [...ordered, ...extras].filter(c => counts[c]);

  categoriesGrid.innerHTML = '';
  all.forEach((cat, i) => {
    const img    = getCatImg(cat);
    const icon   = getCatIcon(cat);
    const count  = counts[cat] || 0;
    const label  = (CATEGORY_META[cat] && CATEGORY_META[cat].label) || cat;

    const card = document.createElement('div');
    card.className = 'cat-card';
    card.style.setProperty('--delay', `${i * 0.05}s`);

    card.innerHTML = `
      <div class="cat-img-wrap">
        ${img
          ? `<img src="${img}" alt="${escHtml(cat)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : ''}
        <div class="cat-fallback-icon" style="${img ? 'display:none' : 'display:flex'}">${icon}</div>
        <div class="cat-overlay"></div>
      </div>
      <div class="cat-body">
        <div class="cat-name">${escHtml(label)}</div>
        <div class="cat-count">${count} item${count !== 1 ? 's' : ''}</div>
      </div>`;

    card.addEventListener('click', () => {
      setCategory(cat);
      document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
    });
    categoriesGrid.appendChild(card);
  });
}

/* ─── FILTER BUTTONS ────────────────────────────── */
function buildFilterButtons() {
  if (!filterWrap) return;
  const seen = new Set();
  const cats = [];
  allProducts.forEach(p => { if (!seen.has(p.category)) { seen.add(p.category); cats.push(p.category); } });
  Array.from(filterWrap.querySelectorAll('.filter-btn:not([data-cat="ALL"])')).forEach(b => b.remove());
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.cat = cat;
    const label = (CATEGORY_META[cat] && CATEGORY_META[cat].label) || (cat.charAt(0) + cat.slice(1).toLowerCase());
    btn.textContent = label;
    btn.id = 'filter-' + cat.replace(/\W+/g, '-').toLowerCase();
    btn.addEventListener('click', () => setCategory(cat));
    filterWrap.appendChild(btn);
  });
}

/* ─── SET CATEGORY ──────────────────────────────── */
function setCategory(cat) {
  activeCategory = cat;
  applyFilters();
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
}

/* ─── APPLY FILTERS ─────────────────────────────── */
function applyFilters() {
  const q = searchQuery.toLowerCase().trim();
  filteredProducts = allProducts.filter(p => {
    const matchCat    = (activeCategory === 'ALL') || (p.category === activeCategory);
    const matchSearch = !q
      || p.title.toLowerCase().includes(q)
      || (p.category || '').toLowerCase().includes(q)
      || (p.description || '').toLowerCase().includes(q)
      || (p.variant || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });
  renderProducts();
}

/* ─── RENDER PRODUCTS ────────────────────────────── */
function renderProducts() {
  productsGrid.innerHTML = '';
  if (filteredProducts.length === 0) {
    noResults.style.display = 'block';
    resultsInfo.textContent = '';
    return;
  }
  noResults.style.display = 'none';
  const total = allProducts.length;
  const shown = filteredProducts.length;
  resultsInfo.textContent = shown < total ? `Showing ${shown} of ${total} products` : `${total} products`;
  filteredProducts.forEach((product, i) => productsGrid.appendChild(createProductCard(product, i)));
}

/* ─── CREATE PRODUCT CARD ───────────────────────── */
function createProductCard(product, index) {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.style.animationDelay = `${Math.min(index, 24) * 0.04}s`;
  const icon   = getCatIcon(product.category);
  const imgSrc = (product.images && product.images[0]) ? product.images[0] : null;
  const catMeta = CATEGORY_META[product.category];
  const catLabel = catMeta ? catMeta.label : product.category;

  card.innerHTML = `
    <div class="card-image-wrap">
      ${imgSrc ? `<img src="${imgSrc}" alt="${escHtml(product.title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
      <div class="card-placeholder" style="${imgSrc ? 'display:none' : 'display:flex'}">${icon}</div>
      <div class="card-cat-pill">${escHtml(catLabel)}</div>
      <div class="card-hover-hint">View Details</div>
    </div>
    <div class="card-body">
      <div class="card-title" title="${escHtml(product.title)}">${escHtml(product.title)}</div>
      <div class="card-desc">${escHtml(product.description || '')}</div>
      <div class="card-footer">
        ${product.variant ? `<span class="card-variant">📦 ${escHtml(product.variant)}</span>` : '<span></span>'}
        <span class="card-cta">Details <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>
      </div>
    </div>`;

  card.addEventListener('click', () => openModal(product));
  return card;
}


/* ═══════════════════════════════════════════════════
   MODAL WITH IMAGE SLIDER
═══════════════════════════════════════════════════ */
function openModal(product) {
  const icon = getCatIcon(product.category);

  /* Build image list — filter to valid sources, fallback to placeholder */
  modalImages_list  = (product.images && product.images.length > 0) ? product.images : [];
  modalCurrentIndex = 0;

  /* Populate info */
  modalCatBadge.textContent = product.category;
  modalTitle.textContent    = product.title;
  modalDesc.textContent     = product.description || 'No description available.';
  if (product.variant) {
    modalVariant.textContent  = `📦 ${product.variant}`;
    modalVariant.style.display = 'inline-flex';
  } else {
    modalVariant.style.display = 'none';
  }

  /* Render slider */
  renderSlider(icon);

  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function renderSlider(icon) {
  if (!sliderTrack) return;
  sliderTrack.innerHTML = '';
  if (sliderDots) sliderDots.innerHTML = '';

  const total = modalImages_list.length;

  if (total === 0) {
    /* No images — show icon placeholder */
    const ph = document.createElement('div');
    ph.className = 'slider-placeholder';
    ph.innerHTML = `<span>${icon}</span><p>No image available</p>`;
    sliderTrack.appendChild(ph);
    if (sliderPrev) sliderPrev.style.display = 'none';
    if (sliderNext) sliderNext.style.display = 'none';
    return;
  }

  /* Slides */
  modalImages_list.forEach((src, idx) => {
    const slide = document.createElement('div');
    slide.className = 'slider-slide';
    const img = document.createElement('img');
    img.src = src;
    img.alt = `Image ${idx + 1}`;
    img.loading = 'lazy';
    img.onerror = function() {
      this.parentElement.innerHTML = `<div class="slider-placeholder"><span>${icon}</span><p>Image not found</p></div>`;
    };
    slide.appendChild(img);
    sliderTrack.appendChild(slide);
  });

  /* Dots */
  if (sliderDots) {
    if (total > 1) {
      modalImages_list.forEach((_, idx) => {
        const dot = document.createElement('button');
        dot.className = 'slider-dot' + (idx === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Image ${idx + 1}`);
        dot.addEventListener('click', () => goToSlide(idx));
        sliderDots.appendChild(dot);
      });
    }
  }

  /* Show/hide arrows */
  if (sliderPrev) sliderPrev.style.display = total > 1 ? 'flex' : 'none';
  if (sliderNext) sliderNext.style.display = total > 1 ? 'flex' : 'none';

  goToSlide(0, false);
}

function goToSlide(index, animate = true) {
  const total = modalImages_list.length;
  if (total === 0) return;
  modalCurrentIndex = (index + total) % total;

  /* Move track */
  if (sliderTrack) {
    sliderTrack.style.transition = animate ? 'transform 0.4s cubic-bezier(0.4,0,0.2,1)' : 'none';
    sliderTrack.style.transform  = `translateX(-${modalCurrentIndex * 100}%)`;
  }

  /* Update dots */
  if (sliderDots) {
    sliderDots.querySelectorAll('.slider-dot').forEach((d, i) => {
      d.classList.toggle('active', i === modalCurrentIndex);
    });
  }
}

/* Slider controls */
if (sliderPrev) sliderPrev.addEventListener('click', () => goToSlide(modalCurrentIndex - 1));
if (sliderNext) sliderNext.addEventListener('click', () => goToSlide(modalCurrentIndex + 1));

/* Swipe support for mobile */
let touchStartX = 0;
if (sliderTrack) {
  sliderTrack.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  sliderTrack.addEventListener('touchend',   e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) goToSlide(modalCurrentIndex + (diff > 0 ? 1 : -1));
  });
}

/* Close modal */
function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}
window.closeModal = closeModal;

if (modalClose) modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => {
  if (!modalOverlay.classList.contains('open')) return;
  if (e.key === 'Escape')     closeModal();
  if (e.key === 'ArrowLeft')  goToSlide(modalCurrentIndex - 1);
  if (e.key === 'ArrowRight') goToSlide(modalCurrentIndex + 1);
});

/* ─── SEARCH ─────────────────────────────────────── */
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value;
  searchClear.classList.toggle('visible', searchQuery.length > 0);
  applyFilters();
});
searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  searchClear.classList.remove('visible');
  searchInput.focus();
  applyFilters();
});

/* ─── RESET FILTERS ─────────────────────────────── */
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClear.classList.remove('visible');
    setCategory('ALL');
    document.getElementById('filter-all').click();
  });
}

/* ─── NAVBAR SCROLL ─────────────────────────────── */
function handleScroll() {
  /* Navbar */
  navbar.classList.toggle('scrolled', window.scrollY > 50);

  /* Back to top */
  backToTop.classList.toggle('visible', window.scrollY > 400);

  /* Active nav link */
  const sections = ['home','categories','products','about','contact'];
  let current = 'home';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (window.scrollY + 100 >= el.offsetTop) current = id;
  });
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + current);
  });
}
window.addEventListener('scroll', handleScroll, { passive: true });
handleScroll();

/* ─── BACK TO TOP ────────────────────────────────── */
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ─── MOBILE NAV ─────────────────────────────────── */
navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  const isOpen = navLinks.classList.contains('open');
  navToggle.setAttribute('aria-expanded', isOpen);
  const spans = navToggle.querySelectorAll('span');
  if (isOpen) {
    spans[0].style.transform = 'rotate(45deg) translate(5px,5px)';
    spans[1].style.opacity   = '0';
    spans[2].style.transform = 'rotate(-45deg) translate(5px,-5px)';
  } else {
    spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  }
});

/* close mobile nav on link click */
document.querySelectorAll('.nav-link').forEach(a => {
  a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  });
});

/* ─── FOOTER CATEGORY LINKS ──────────────────────── */
document.querySelectorAll('[data-filtercat]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const cat = a.getAttribute('data-filtercat');
    setCategory(cat);
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
  });
});

/* ─── CONTACT FORM ───────────────────────────────── */
if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();
    const submit = contactForm.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.querySelector('span').textContent = 'Sending…';
    setTimeout(() => {
      formSuccess.style.display = 'block';
      contactForm.querySelectorAll('input,textarea,select').forEach(el => el.value = '');
      submit.disabled = false;
      submit.querySelector('span').textContent = 'Send Message';
      setTimeout(() => { formSuccess.style.display = 'none'; }, 6000);
    }, 1000);
  });
}

/* ─── INTERSECTION OBSERVER ──────────────────────── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('fade-in'); revealObserver.unobserve(entry.target); }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.section-header, .contact-card, .contact-form-wrap, .about-features').forEach(el => {
  revealObserver.observe(el);
});

/* ─── HELPERS ────────────────────────────────────── */
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ═══════════════════════════════════════════════════
   HERO SLIDESHOW CONTROLLER
═══════════════════════════════════════════════════ */
(function initHeroSlideshow() {
  const SLIDE_DURATION = 5500; // ms per slide
  const slides    = Array.from(document.querySelectorAll('.hero-slide'));
  const dots      = Array.from(document.querySelectorAll('.hero-dot'));
  const prevBtn   = document.getElementById('hero-prev');
  const nextBtn   = document.getElementById('hero-next');
  const fillEl    = document.getElementById('hero-progress-fill');
  let current     = 0;
  let timer       = null;
  let fillTimer   = null;

  if (!slides.length) return;

  function goTo(idx) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    restartProgress();
  }

  function restartProgress() {
    if (fillEl) {
      fillEl.style.transition = 'none';
      fillEl.style.width = '0%';
      // Force reflow
      void fillEl.offsetWidth;
      fillEl.style.transition = `width ${SLIDE_DURATION}ms linear`;
      fillEl.style.width = '100%';
    }
    clearTimeout(timer);
    timer = setTimeout(() => goTo(current + 1), SLIDE_DURATION);
  }

  if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));

  dots.forEach(dot => {
    dot.addEventListener('click', () => goTo(parseInt(dot.dataset.slide, 10)));
  });

  /* Keyboard support */
  document.addEventListener('keydown', e => {
    if (document.getElementById('modal-overlay').classList.contains('open')) return;
    if (e.key === 'ArrowLeft')  goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });

  /* Touch/swipe support */
  let tsX = 0;
  const slideshowEl = document.querySelector('.hero-slideshow');
  if (slideshowEl) {
    slideshowEl.addEventListener('touchstart', e => { tsX = e.touches[0].clientX; }, { passive: true });
    slideshowEl.addEventListener('touchend',   e => {
      const diff = tsX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) goTo(current + (diff > 0 ? 1 : -1));
    });
  }

  /* Start */
  restartProgress();
})();

/* ─── INIT ───────────────────────────────────────── */
loadProducts();
