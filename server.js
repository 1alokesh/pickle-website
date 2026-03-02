const { Resend } = require("resend");
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

const resend = new Resend(process.env.RESEND_API_KEY);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Ensure db.json exists
if (!fs.existsSync("db.json")) {
  fs.writeFileSync("db.json", JSON.stringify({ orders: [] }, null, 2));
}

// =======================
// ORDER ROUTE
// =======================
app.post("/order", async (req, res) => {
  try {
    const { name, phone, pickle, quantity, address, state, pincode } = req.body;

    if (!name || !phone || !pickle || !quantity || !address || !state || !pincode) {
      return res.send("All fields are required.");
    }

    const order = {
      name,
      phone,
      pickle,
      quantity,
      address,
      state,
      pincode,
      date: new Date().toLocaleString(),
    };

    // Save order
    const data = JSON.parse(fs.readFileSync("db.json"));
    data.orders.push(order);
    fs.writeFileSync("db.json", JSON.stringify(data, null, 2));

    // Send Email
    await resend.emails.send({
      from: "Mana Inti Ruchulu <onboarding@resend.dev>",
      to: process.env.EMAIL_USER,
      subject: "New Order - Mana Inti Ruchulu",
      text: `
New Order Received

Customer Name: ${name}
Phone: ${phone}
Pickle: ${pickle}
Quantity: ${quantity}
Address: ${address}, ${state} - ${pincode}

Owner: Padma
Contact: 9121991628
      `,
    });

    // SUCCESS RESPONSE
    res.send(`
      <h2>✅ Order Placed Successfully!</h2>
      <p>Thank you for ordering from <b>Mana Inti Ruchulu</b>.</p>
      <a href="/">Go Back</a>
    `);

  } catch (error) {
    console.error(error);
    res.status(500).send("Error placing order.");
  }
});

// =======================
// ADMIN ROUTE
// =======================
app.get("/admin", (req, res) => {
  const data = JSON.parse(fs.readFileSync("db.json"));
  const orders = data.orders;

  let orderList = orders.map((o, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${o.name}</td>
      <td>${o.phone}</td>
      <td>${o.pickle}</td>
      <td>${o.quantity}</td>
      <td>${o.address}, ${o.state} - ${o.pincode}</td>
      <td>${o.date}</td>
    </tr>
  `).join("");

  res.send(`
    <h1>Mana Inti Ruchulu - All Orders</h1>
    <table border="1" cellpadding="10">
      <tr>
        <th>#</th>
        <th>Name</th>
        <th>Phone</th>
        <th>Pickle</th>
        <th>Quantity</th>
        <th>Address</th>
        <th>Date</th>
      </tr>
      ${orderList}
    </table>
  `);
});

// =======================
// SERVER START
// =======================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
