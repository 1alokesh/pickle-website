const { Resend } = require("resend");
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
const PDFDocument = require("pdfkit");

const app = express();
const PORT = process.env.PORT || 3000;

const BRAND_NAME = "Guntur Inti Ruchulu";
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";

const resend = new Resend(process.env.RESEND_API_KEY);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Ensure db.json exists
if (!fs.existsSync("db.json")) {
  fs.writeFileSync("db.json", JSON.stringify({ orders: [] }, null, 2));
}

/* ================= LOGIN ================= */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({ success: true });
  }

  res.json({ success: false });
});

/* ================= GET ORDERS ================= */
app.get("/orders", (req, res) => {
  const data = JSON.parse(fs.readFileSync("db.json"));
  res.json(data.orders);
});

/* ================= ORDER ================= */
app.post("/order", async (req, res) => {
  try {
    const { name, phone, address, state, pincode, totalPrice, items } = req.body;

    if (!name || !phone || !address || !state || !pincode || !totalPrice || !items) {
      return res.send("All fields are required.");
    }

    let parsedItems = typeof items === "string" ? JSON.parse(items) : items;

    const data = JSON.parse(fs.readFileSync("db.json"));
    const orderId = Date.now();

    const order = {
      id: orderId,
      name,
      phone,
      address,
      state,
      pincode,
      totalPrice,
      items: parsedItems,
      date: new Date().toLocaleString(),
    };

    data.orders.push(order);
    fs.writeFileSync("db.json", JSON.stringify(data, null, 2));

    let itemText = "";
    parsedItems.forEach((item, i) => {
      itemText += `${i + 1}. ${item.name} - ${item.size} x ${item.quantity} = ₹${item.total}\n`;
    });

    try {
      await resend.emails.send({
        from: `${BRAND_NAME} <onboarding@resend.dev>`,
        to: process.env.EMAIL_USER,
        subject: `New Order - ${BRAND_NAME}`,
        text: `Order ID: ${orderId}\n${itemText}\nTotal: ₹${totalPrice}`,
      });
    } catch (e) {
      console.error("Email failed", e);
    }

    res.redirect(`/success?id=${orderId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error placing order");
  }
});

/* ================= SUCCESS ================= */
app.get("/success", (req, res) => {
  const orderId = req.query.id;

  res.send(`
    <h2>✅ Order Placed Successfully!</h2>
    <p><b>Thank you for ordering from ${BRAND_NAME}!</b></p>
    <a href="/invoice/${orderId}">Download Invoice</a><br><br>
    <a href="/">Back</a>
  `);
});

/* ================= INVOICE ================= */
app.get("/invoice/:id", (req, res) => {
  const orderId = req.params.id;
  const data = JSON.parse(fs.readFileSync("db.json"));
  const order = data.orders.find(o => o.id == orderId);

  if (!order) return res.send("Not found");

  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");

  doc.pipe(res);

  doc.text(BRAND_NAME, { align: "center" });
  doc.moveDown();

  doc.text(`Order ID: ${order.id}`);
  doc.text(`Name: ${order.name}`);

  order.items.forEach((item, i) => {
    doc.text(`${i + 1}. ${item.name} x ${item.quantity}`);
  });

  doc.text(`Total: ₹${order.totalPrice}`);
  doc.end();
});

/* ================= START ================= */
app.listen(PORT, () => console.log("Server running"));
