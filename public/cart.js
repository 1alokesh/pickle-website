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

  localStorage.setItem("cart", JSON.stringify(cart));
  alert("Added to cart");
}

/* TOTAL */
function getCartTotal() {
  return cart.reduce((acc, item) => acc + (item.total || 0), 0);
}
