const PDFDocument = require("pdfkit");
const { Resend } = require("resend");
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");

const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Ensure db.json exists
if (!fs.existsSync("db.json")) {
  fs.writeFileSync("db.json", JSON.stringify({ orders: [] }, null, 2));
}

// ==============================
// ORDER ROUTE
// ==============================
app.post("/order", async (req, res) => {
  try {
    const { name, phone, email, pickle, quantity, address, state, pincode } = req.body;

    if (!name || !phone || !email || !pickle || !quantity || !address || !state || !pincode) {
      return res.send("All fields are required.");
    }

    const order = {
      name,
      phone,
      email,
      pickle,
      quantity,
      address,
      state,
      pincode,
      date: new Date().toLocaleString(),
    };

    // Read existing data
    const data = JSON.parse(fs.readFileSync("db.json"));
    data.orders.push(order);
    fs.writeFileSync("db.json", JSON.stringify(data, null, 2));

    // ==============================
    // SEND MAIL TO OWNER
    // ==============================
    await resend.emails.send({
      from: "Mana Inti Ruchulu <onboarding@resend.dev>",
      to: process.env.EMAIL_USER,
      subject: "New Order - Mana Inti Ruchulu",
      text: `
New Order Received

Customer Name: ${name}
Customer Phone: ${phone}
Customer Email: ${email}

Pickle: ${pickle}
Quantity: ${quantity}

Address:
${address}, ${state} - ${pincode}

Owner: Padma
Contact: 9121991628
      `,
    });

    // ==============================
    // SEND MAIL TO BUYER
    // ==============================
    await resend.emails.send({
      from: "Mana Inti Ruchulu <onboarding@resend.dev>",
      to: process.env.EMAIL_USER,
      subject: "Your Order is Confirmed - Mana Inti Ruchulu",
      text: `
Hello ${name},

Thank you for ordering from Mana Inti Ruchulu ❤️

Your Order Details:
Pickle: ${pickle}
Quantity: ${quantity}

Delivery Address:
${address}, ${state} - ${pincode}

Your order will be delivered within 4-5 days.

Owner: Padma
Contact: 9121991628

Thank you for supporting Mana Inti Ruchulu 🙏
      `,
    });

    // Success Page
    const orderId = Date.now();

res.send(`
  <html>
    <head>
      <title>Order Confirmed</title>
    </head>
    <body style="font-family: Arial; text-align: center; padding: 40px;">
      <h2>✅ Order Confirmed!</h2>
      <p>Thank you for ordering from <b>Mana Inti Ruchulu</b></p>

      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Pickle:</strong> ${pickle}</p>
      <p><strong>Quantity:</strong> ${quantity}</p>

      <p>Delivery within <b>4-5 days</b></p>

      <p><b>Owner:</b> Padma</p>
      <p><b>Contact:</b> 9121991628</p>

      <br><br>

      <a href="/receipt/${orderId}" 
         style="padding:10px 20px; background:green; color:white; text-decoration:none;">
         Download Receipt
      </a>

      <br><br>
      <a href="/">Back to Home</a>
    </body>
  </html>
`);

  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong.");
  }
});

// ==============================
// ADMIN PAGE
// ==============================
app.get("/admin", (req, res) => {
  const data = JSON.parse(fs.readFileSync("db.json"));
  const orders = data.orders;

  let orderList = orders.map((o, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${o.name}</td>
      <td>${o.phone}</td>
      <td>${o.email}</td>
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
        <th>Email</th>
        <th>Pickle</th>
        <th>Quantity</th>
        <th>Address</th>
        <th>Date</th>
      </tr>
      ${orderList}
    </table>
  `);
});
app.get("/receipt/:id", (req, res) => {
  const orderId = req.params.id;

  const data = JSON.parse(fs.readFileSync("db.json"));
  const order = data.orders[data.orders.length - 1];

  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=receipt-${orderId}.pdf`);

  doc.pipe(res);

  doc.fontSize(20).text("Mana Inti Ruchulu", { align: "center" });
  doc.moveDown();

  doc.fontSize(14).text(`Order ID: ${orderId}`);
  doc.text(`Customer Name: ${order.name}`);
  doc.text(`Phone: ${order.phone}`);
  doc.text(`Pickle: ${order.pickle}`);
  doc.text(`Quantity: ${order.quantity}`);
  doc.text(`Address: ${order.address}, ${order.state} - ${order.pincode}`);
  doc.moveDown();

  doc.text("Delivery within 4-5 days.");
  doc.moveDown();
  doc.text("Owner: Padma");
  doc.text("Contact: 9121991628");

  doc.end();
});
// ==============================
// START SERVER
// ==============================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});


