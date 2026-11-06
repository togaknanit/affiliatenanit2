document.addEventListener("DOMContentLoaded", () => {
  // Mengambil data produk dari file JSON
  fetch('products.json')
    .then(response => response.json())
    .then(products => {
      const linksContainer = document.getElementById('links-container');
      
      // Render setiap item produk dari JSON ke HTML
      linksContainer.innerHTML = products.map(product => `
        <a href="${product.link}" target="_blank" class="link-card">
          <img src="${product.image}" alt="${product.title}" class="product-img">
          <div class="product-info">
            <div class="product-title">${product.title}</div>
            <span class="btn-buy">Beli di Shopee</span>
          </div>
        </a>
      `).join('');
    })
    .catch(error => console.error('Gagal memuat data produk:', error));
});
