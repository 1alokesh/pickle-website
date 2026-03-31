let cart = JSON.parse(localStorage.getItem("cart")) || [];

/* ADD */
function addToCart(productId, variantIndex) {
  const product = products.find(p => p.id === productId);
  const variant = product.variants[variantIndex];

  const existing = cart.find(
    i => i.name === product.name && i.size === variant.size
  );

  if (existing) {
    existing.quantity++;
    existing.total = existing.quantity * existing.price;
  } else {
    cart.push({
      name: product.name,
      size: variant.size,
      price: variant.price,
      quantity: 1,
      total: variant.price
    });
  }

  saveCart();
}

/* SAVE */
function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartBar();
  renderCartItems && renderCartItems(); // refresh UI
}

/* TOTAL */
function getCartTotal() {
  return cart.reduce((a, b) => a + (b.total || 0), 0);
}

/* UPDATE BAR */
function updateCartBar() {
  const bar = document.getElementById("cartBar");
  if (!bar) return;

  if (cart.length > 0) {
    bar.style.display = "flex";
    bar.innerHTML = `
      <span>${cart.length} items | ₹${getCartTotal()}</span>
      <button onclick="goToCart()">View Cart</button>
    `;
  } else {
    bar.style.display = "none";
  }
}

/* NAV */
function goToCart() {
  window.location.href = "cart.html";
}

/* QTY CHANGE */
function increaseQty(i) {
  cart[i].quantity++;
  cart[i].total = cart[i].quantity * cart[i].price;
  saveCart();
}

function decreaseQty(i) {
  cart[i].quantity--;
  if (cart[i].quantity <= 0) cart.splice(i, 1);
  else cart[i].total = cart[i].quantity * cart[i].price;

  saveCart();
}
