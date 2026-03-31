let cart = JSON.parse(localStorage.getItem("cart")) || [];

/* ADD TO CART */
function addToCart(productId, variantIndex) {
  const product = products.find(p => p.id === productId);
  const variant = product.variants[variantIndex];

  const existing = cart.find(
    item => item.name === product.name && item.size === variant.size
  );

  if (existing) {
    existing.quantity += 1;
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

  updateCart();
}

/* UPDATE CART */
function updateCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartBar();
}

/* INCREASE */
function increaseQty(index) {
  cart[index].quantity++;
  cart[index].total = cart[index].quantity * cart[index].price;
  updateCart();
  location.reload();
}

/* DECREASE */
function decreaseQty(index) {
  cart[index].quantity--;

  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  } else {
    cart[index].total = cart[index].quantity * cart[index].price;
  }

  updateCart();
  location.reload();
}

/* TOTAL */
function getCartTotal() {
  return cart.reduce((acc, item) => acc + (item.total || 0), 0);
}

/* CART BAR */
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

function goToCart() {
  window.location.href = "cart.html";
}
