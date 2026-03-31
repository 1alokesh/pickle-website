let cart = JSON.parse(localStorage.getItem("cart")) || [];

function addToCart(productId, variantIndex) {
  const product = products.find(p => p.id === productId);
  const variant = product.variants[variantIndex];

  cart.push({
    name: product.name,
    size: variant.size,
    price: variant.price,
    quantity: 1
  });

  localStorage.setItem("cart", JSON.stringify(cart));
  alert("Added to cart");
}

function getCartTotal() {
  return cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
}
