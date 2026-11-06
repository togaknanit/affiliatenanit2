(() => {
  'use strict';

  /* ===== Pengaturan ===== */
  const STORAGE_KEY = 'kadai-katuang-data-v2';
  const ADMIN_PASSWORD = '123456'; // ganti sesuai keinginan (hanya untuk demo)
  const DEFAULT_CATEGORY = 'Lainnya';

  // Data cadangan bila products.json gagal dimuat (misal dibuka langsung via file://)
  const FALLBACK = {
    categories: ['Fashion', 'Elektronik', 'Lainnya'],
    products: [
      { id: 1, title: 'Pantyhose Stockings Yoga hip high', link: 'https://shopee.co.id/product/799020686/23135680427', image: 'https://down-id.img.susercontent.com/file/id-11134207-7qukz-lez5jdsfpdq61c.webp', category: 'Fashion' },
      { id: 2, title: 'Pantyhose Stockings Sport Gym', link: 'https://shopee.co.id/product/799020686/21076927609', image: 'https://down-id.img.susercontent.com/file/id-11134201-7qul0-leph48dhg518d9.webp', category: 'Fashion' }
    ]
  };

  let data = { categories: [], products: [] };
  let active = 'Semua';
  let admin = false;

  /* ===== Helper ===== */
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const clone = obj => JSON.parse(JSON.stringify(obj));
  const validURL = s => { try { return new URL(s).protocol === 'https:'; } catch { return false; } };
  const isValidData = d => d && Array.isArray(d.categories) && Array.isArray(d.products);
  const exists = (name, except) => data.categories.some(c => c !== except && c.toLowerCase() === name.toLowerCase());

  function normalize(d) {
    const out = clone(d);
    if (!out.categories.includes(DEFAULT_CATEGORY)) out.categories.push(DEFAULT_CATEGORY);
    out.products.forEach((p, i) => {
      if (!p.id) p.id = Date.now() + i;
      if (!out.categories.includes(p.category)) p.category = DEFAULT_CATEGORY;
    });
    return out;
  }

  /* ===== Muat & simpan data ===== */
  async function loadData() {
    // 1. Perubahan admin yang tersimpan di browser
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (isValidData(saved)) return normalize(saved);
    } catch { /* abaikan */ }
    // 2. File products.json
    try {
      const res = await fetch('products.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (isValidData(json)) return normalize(json);
    } catch (err) {
      console.warn('Gagal memuat products.json, memakai data cadangan:', err);
    }
    // 3. Cadangan
    return normalize(FALLBACK);
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch { alert('Penyimpanan browser tidak tersedia; perubahan hanya berlaku sampai halaman ditutup.'); }
    render();
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = el('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'products.json';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function resetData() {
    if (!confirm('Hapus semua perubahan di browser ini dan kembali ke isi products.json?')) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }

  /* ===== Drawer ☰ ===== */
  function setDrawer(open) {
    $('drawer').classList.toggle('open', open);
    $('overlay').classList.toggle('open', open);
    $('drawer').setAttribute('aria-hidden', String(!open));
    $('menuBtn').setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('no-scroll', open);
    if (open) $('closeDrawer').focus();
  }

  function selectCategory(cat) {
    active = cat;
    const fromDrawer = $('drawer').classList.contains('open');
    setDrawer(false);
    render();
    if (fromDrawer) $('produk').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ===== Render ===== */
  function renderCategoryButtons() {
    const cats = ['Semua', ...data.categories];
    [[$('chips'), 'chip'], [$('drawerList'), '']].forEach(([container, cls]) => {
      container.replaceChildren();
      cats.forEach(cat => {
        const b = el('button', (cls + (cat === active ? ' active' : '')).trim(), cat);
        b.type = 'button';
        b.setAttribute('aria-pressed', String(cat === active));
        b.addEventListener('click', () => selectCategory(cat));
        container.append(b);
      });
    });
  }

  function productCard(p) {
    const card = el('article', 'product');
    const media = el('div', 'product-media');
    if (p.image && validURL(p.image)) {
      const img = el('img');
      img.src = p.image;
      img.alt = p.title;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.onerror = () => media.replaceChildren(el('span', 'fallback', '✦'));
      media.append(img);
    } else {
      media.append(el('span', 'fallback', '✦'));
    }

    const body = el('div', 'product-body');
    body.append(el('span', 'tag', p.category), el('h3', '', p.title));

    const buy = el('a', 'buy', 'Lihat di Shopee ↗');
    buy.href = validURL(p.link) ? p.link : '#';
    buy.target = '_blank';
    buy.rel = 'noopener noreferrer sponsored';
    body.append(buy);

    if (admin) {
      const controls = el('div', 'admin-actions');
      [
        ['↑ Naik', () => moveProduct(p.id, -1)],
        ['↓ Turun', () => moveProduct(p.id, 1)],
        ['Edit', () => openProduct(p.id)],
        ['Hapus', () => deleteProduct(p.id)]
      ].forEach(([label, fn]) => {
        const b = el('button', '', label);
        b.type = 'button';
        b.addEventListener('click', fn);
        controls.append(b);
      });
      body.append(controls);
    }

    card.append(media, body);
    return card;
  }

  function render() {
    if (active !== 'Semua' && !data.categories.includes(active)) active = 'Semua';
    $('adminbar').classList.toggle('show', admin);
    $('loginBtn').textContent = admin ? 'Dashboard' : 'Login admin';
    renderCategoryButtons();

    const list = data.products.filter(p => active === 'Semua' || p.category === active);
    $('count').textContent = list.length + ' produk';
    const grid = $('grid');
    grid.replaceChildren();
    if (!list.length) {
      grid.append(el('div', 'empty', 'Belum ada produk di kategori ini.'));
      return;
    }
    const frag = document.createDocumentFragment();
    list.forEach(p => frag.append(productCard(p)));
    grid.append(frag);
  }

  /* ===== Produk (admin) ===== */
  function moveProduct(id, dir) {
    if (!admin) return;
    // Geser di antara produk yang terlihat pada filter aktif
    const visible = data.products.filter(p => active === 'Semua' || p.category === active);
    const vi = visible.findIndex(p => p.id === id);
    const target = visible[vi + dir];
    if (!target) return;
    const i = data.products.findIndex(p => p.id === id);
    const j = data.products.findIndex(p => p.id === target.id);
    [data.products[i], data.products[j]] = [data.products[j], data.products[i]];
    persist();
  }

  function deleteProduct(id) {
    if (!admin || !confirm('Hapus produk ini?')) return;
    data.products = data.products.filter(p => p.id !== id);
    persist();
  }

  function openProduct(id) {
    if (!admin) return;
    const p = data.products.find(x => x.id === id);
    $('productForm').reset();
    $('productId').value = p ? p.id : '';
    $('productHeading').textContent = p ? 'Edit produk' : 'Tambah produk';
    const select = $('category');
    select.replaceChildren();
    data.categories.forEach(cat => {
      const opt = el('option', '', cat);
      opt.value = cat;
      select.append(opt);
    });
    if (p) {
      $('title').value = p.title;
      $('link').value = p.link;
      $('image').value = p.image || '';
      select.value = p.category;
    } else if (active !== 'Semua') {
      select.value = active;
    }
    $('productDialog').showModal();
  }

  function saveProduct(e) {
    e.preventDefault();
    if (!admin) return;
    const id = Number($('productId').value);
    const title = $('title').value.trim();
    const link = $('link').value.trim();
    const image = $('image').value.trim();
    const category = $('category').value;
    if (!title || !validURL(link) || (image && !validURL(image)) || !data.categories.includes(category)) {
      alert('Periksa nama, kategori, dan pastikan link diawali https://');
      return;
    }
    const product = { id: id || Date.now(), title, link, image, category };
    const idx = data.products.findIndex(x => x.id === id);
    if (idx >= 0) data.products[idx] = product;
    else data.products.unshift(product);
    persist();
    $('productDialog').close();
  }

  /* ===== Kategori (admin) ===== */
  function renderCategoryRows() {
    const rows = $('categoryRows');
    rows.replaceChildren();
    data.categories.forEach((cat, i) => {
      const row = el('div', 'row');
      const actions = el('div', 'row-actions');
      const buttons = [['↑', () => moveCategory(i, -1)], ['↓', () => moveCategory(i, 1)]];
      if (cat !== DEFAULT_CATEGORY) {
        buttons.push(['Edit', () => renameCategory(i)], ['Hapus', () => removeCategory(i)]);
      }
      buttons.forEach(([label, fn]) => {
        const b = el('button', '', label);
        b.type = 'button';
        b.setAttribute('aria-label', label + ' kategori ' + cat);
        b.addEventListener('click', fn);
        actions.append(b);
      });
      row.append(el('span', '', cat), actions);
      rows.append(row);
    });
  }

  function openCategories() {
    if (!admin) return;
    $('categoryError').textContent = '';
    renderCategoryRows();
    $('categoryDialog').showModal();
  }

  function moveCategory(i, dir) {
    const j = i + dir;
    if (!admin || j < 0 || j >= data.categories.length) return;
    [data.categories[i], data.categories[j]] = [data.categories[j], data.categories[i]];
    persist();
    renderCategoryRows();
  }

  function renameCategory(i) {
    if (!admin) return;
    const old = data.categories[i];
    const input = prompt('Nama baru untuk kategori:', old);
    if (input === null) return;
    const name = input.trim();
    if (name === old) return;
    if (!name || exists(name, old)) { alert('Nama kategori kosong atau sudah ada.'); return; }
    data.categories[i] = name;
    data.products.forEach(p => { if (p.category === old) p.category = name; });
    if (active === old) active = name;
    persist();
    renderCategoryRows();
  }

  function removeCategory(i) {
    if (!admin) return;
    const cat = data.categories[i];
    if (cat === DEFAULT_CATEGORY) return;
    if (!confirm('Hapus kategori "' + cat + '"? Produknya dipindah ke ' + DEFAULT_CATEGORY + '.')) return;
    data.categories.splice(i, 1);
    data.products.forEach(p => { if (p.category === cat) p.category = DEFAULT_CATEGORY; });
    persist();
    renderCategoryRows();
  }

  function addCategory(e) {
    e.preventDefault();
    if (!admin) return;
    const name = $('categoryName').value.trim();
    if (!name || exists(name)) { $('categoryError').textContent = 'Nama kategori kosong atau sudah ada.'; return; }
    $('categoryError').textContent = '';
    // Kategori baru disisipkan sebelum "Lainnya"
    const pos = data.categories.indexOf(DEFAULT_CATEGORY);
    data.categories.splice(pos >= 0 ? pos : data.categories.length, 0, name);
    $('categoryForm').reset();
    persist();
    renderCategoryRows();
  }

  /* ===== Login ===== */
  function openLogin() {
    if (admin) { openCategories(); return; }
    $('loginError').textContent = '';
    $('loginDialog').showModal();
  }

  function login(e) {
    e.preventDefault();
    if ($('password').value === ADMIN_PASSWORD) {
      admin = true;
      $('password').value = '';
      $('loginDialog').close();
      render();
      $('adminbar').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      $('loginError').textContent = 'Kata sandi salah.';
    }
  }

  /* ===== Event ===== */
  function bindEvents() {
    $('loginBtn').addEventListener('click', openLogin);
    $('footerLogin').addEventListener('click', openLogin);
    $('loginForm').addEventListener('submit', login);
    $('menuBtn').addEventListener('click', () => setDrawer(!$('drawer').classList.contains('open')));
    $('closeDrawer').addEventListener('click', () => { setDrawer(false); $('menuBtn').focus(); });
    $('overlay').addEventListener('click', () => setDrawer(false));
    $('addProduct').addEventListener('click', () => openProduct());
    $('manageCategories').addEventListener('click', openCategories);
    $('exportJson').addEventListener('click', exportJson);
    $('resetData').addEventListener('click', resetData);
    $('logout').addEventListener('click', () => { admin = false; render(); });
    $('productForm').addEventListener('submit', saveProduct);
    $('categoryForm').addEventListener('submit', addCategory);
    document.querySelectorAll('[data-close]').forEach(b =>
      b.addEventListener('click', () => b.closest('dialog').close())
    );
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && $('drawer').classList.contains('open')) { setDrawer(false); $('menuBtn').focus(); }
    });
  }

  /* ===== Mulai ===== */
  document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    $('grid').append(el('div', 'empty', 'Memuat produk…'));
    data = await loadData();
    render();
  });
})();
