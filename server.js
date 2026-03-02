const { Resend } = require("resend");
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
const PDFDocument = require("pdfkit");

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

// =============================
// ORDER ROUTE
// =============================
app.post("/order", async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      pickle,
      quantity,
      address,
      state,
      pincode,
      finalPrice
    } = req.body;

    if (!name || !phone || !email || !pickle || !quantity || !address || !state || !pincode) {
      return res.send("All fields are required.");
    }

    const orderId = Date.now();

    const order = {
      orderId,
      name,
      phone,
      email,
      pickle,
      quantity,
      address,
      state,
      pincode,
      finalPrice,
      date: new Date().toLocaleString(),
    };

    const data = JSON.parse(fs.readFileSync("db.json"));
    data.orders.push(order);
    fs.writeFileSync("db.json", JSON.stringify(data, null, 2));

    // =============================
    // SEND EMAIL TO OWNER
    // =============================
    await resend.emails.send({
      from: "Mana Inti Ruchulu <onboarding@resend.dev>",
      to: process.env.EMAIL_USER,
      subject: "New Order - Mana Inti Ruchulu",
      text: `
New Order Received

Order ID: ${orderId}

Customer Name: ${name}
Phone: ${phone}
Email: ${email}

Pickle: ${pickle}
Quantity: ${quantity}
Total Price: ₹${finalPrice}

Address:
${address}, ${state} - ${pincode}

Owner: Padma
Contact: 9121991628
      `,
    });

    // =============================
    // SUCCESS PAGE
    // =============================
    res.send(`
      <html>
      <head>
        <title>Order Confirmed</title>
        <style>
          body { font-family: Arial; text-align: center; padding: 40px; background:#f5f5f5; }
          .box { background:white; padding:30px; display:inline-block; border-radius:8px; }
          a.button {
            display:inline-block;
            padding:10px 20px;
            background:green;
            color:white;
            text-decoration:none;
            margin-top:15px;
            border-radius:5px;
          }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>✅ Order Confirmed!</h2>
          <p><b>Mana Inti Ruchulu</b></p>

          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Pickle:</strong> ${pickle}</p>
          <p><strong>Quantity:</strong> ${quantity}</p>
          <p><strong>Total:</strong> ₹${finalPrice}</p>

          <p>Delivery within <b>4-5 days</b>.</p>

          <p><b>Owner:</b> Padma</p>
          <p><b>Contact:</b> 9121991628</p>

          <a class="button" href="/receipt/${orderId}">Download Receipt</a>
          <br><br>
          <a href="/">Back to Home</a>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong.");
  }
});

// =============================
// PDF RECEIPT
// =============================
app.get("/receipt/:id", (req, res) => {
  const orderId = parseInt(req.params.id);

  const data = JSON.parse(fs.readFileSync("db.json"));
  const order = data.orders.find(o => o.orderId === orderId);

  if (!order) {
    return res.send("Order not found.");
  }

  const doc = new PDFDocument();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=receipt-${orderId}.pdf`);

  doc.pipe(res);

  doc.fontSize(20).text("Mana Inti Ruchulu", { align: "center" });
  doc.moveDown();

  doc.fontSize(14).text(`Order ID: ${order.orderId}`);
  doc.text(`Customer Name: ${order.name}`);
  doc.text(`Phone: ${order.phone}`);
  doc.text(`Email: ${order.email}`);
  doc.text(`Pickle: ${order.pickle}`);
  doc.text(`Quantity: ${order.quantity}`);
  doc.text(`Total Price: ₹${order.finalPrice}`);
  doc.moveDown();

  doc.text(`Address: ${order.address}, ${order.state} - ${order.pincode}`);
  doc.moveDown();

  doc.text("Delivery within 4-5 days.");
  doc.moveDown();
  doc.text("Owner: Padma");
  doc.text("Contact: 9121991628");

  doc.end();
});

// =============================
// ADMIN PAGE
// =============================
app.get("/admin", (req, res) => {
  const data = JSON.parse(fs.readFileSync("db.json"));
  const orders = data.orders;

  let orderList = orders.map((o, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${o.orderId}</td>
      <td>${o.name}</td>
      <td>${o.phone}</td>
      <td>${o.pickle}</td>
      <td>${o.quantity}</td>
      <td>₹${o.finalPrice}</td>
      <td>${o.date}</td>
    </tr>
  `).join("");

  res.send(`
    <h1>Mana Inti Ruchulu - All Orders</h1>
    <table border="1" cellpadding="10">
      <tr>
        <th>#</th>
        <th>Order ID</th>
        <th>Name</th>
        <th>Phone</th>
        <th>Pickle</th>
        <th>Qty</th>
        <th>Total</th>
        <th>Date</th>
      </tr>
      ${orderList}
    </table>
  `);
});

// =============================
// START SERVER
// =============================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
