const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { Low, JSONFile } = require("lowdb");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const adapter = new JSONFile("db.json");
const db = new Low(adapter);

async function initDB() {
  await db.read();
  db.data ||= { orders: [] };
  await db.write();
}
initDB();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Email Setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Order Route
app.post("/order", async (req, res) => {
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

  await db.read();
  db.data.orders.push(order);
  await db.write();

  // Send Email to Owner
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: "New Order - Mana Inti Ruchulu",
    text: `
New Order Received

Customer Name: ${name}
Customer Phone: ${phone}
Pickle: ${pickle}
Quantity: ${quantity}
Address: ${address}, ${state} - ${pincode}

Owner: Padma
Contact: 9121991628

Delivery within 4-5 days.
    `,
  });

  res.send(`
    <h2>✅ Order Placed Successfully!</h2>
    <p>Thank you for buying from <b>Mana Inti Ruchulu</b>.</p>
    <p>Your order will be delivered within 4-5 days.</p>
    <a href="/">Go Back</a>
  `);
});

// Admin Orders View
app.get("/admin", async (req, res) => {
  await db.read();
  const orders = db.data.orders;

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

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
