require("dotenv").config();

const { Resend } = require("resend");
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
const PDFDocument = require("pdfkit");

const app = express();
const PORT = process.env.PORT || 3000;
const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ CONSTANTS
const BRAND = "Guntur Inti Ruchulu";
const OWNER = "Padma";
const CONTACT = "9121991628";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Ensure db.json exists
if (!fs.existsSync("db.json")) {
  fs.writeFileSync("db.json", JSON.stringify({ orders: [] }, null, 2));
}

/* ================= ORDER ROUTE ================= */
app.post("/order", async (req, res) => {
  try {
    const { name, phone, address, state, pincode, totalPrice, items } = req.body;

    // ✅ Required validation
    if (!name || !phone || !address || !state || !pincode || !items) {
      return res.send("All fields are required.");
    }

    // ✅ Phone validation (10 digits only)
    if (!/^\d{10}$/.test(phone)) {
      return res.send("Invalid phone number. Enter 10 digits only.");
    }

    let parsedItems;

    try {
      parsedItems = typeof items === "string" ? JSON.parse(items) : items;
    } catch {
      parsedItems = items;
    }

    if (!parsedItems || parsedItems.length === 0) {
      return res.send("No items selected.");
    }

    const data = JSON.parse(fs.readFileSync("db.json"));
    const orderId = Date.now();

    const order = {
      id: orderId,
      name,
      phone,
      address,
      state,
      pincode,
      totalPrice: totalPrice || 0,
      items: parsedItems,
      date: new Date().toLocaleString(),
    };

    data.orders.push(order);
    fs.writeFileSync("db.json", JSON.stringify(data, null, 2));

    // ✅ Prepare email text
    let itemText = "";
    parsedItems.forEach((item, index) => {
      if (typeof item === "object") {
        itemText += `${index + 1}. ${item.name} - ${item.size || ""} x ${item.quantity || 1} = ₹${item.total || ""}\n`;
      } else {
        itemText += `${index + 1}. ${item}\n`;
      }
    });

    // ✅ Send email
    await resend.emails.send({
      from: `${BRAND} <onboarding@resend.dev>`,
      to: process.env.EMAIL_USER,
      subject: `New Order - ${BRAND}`,
      text: `
New Order Received

Order ID: ${orderId}
Customer Name: ${name}
Phone: ${phone}
Address: ${address}, ${state} - ${pincode}

Items Ordered:
${itemText}

Total Price: ₹${totalPrice || 0}

Owner: ${OWNER}
Contact: ${CONTACT}
      `,
    });

    res.redirect(`/success?id=${orderId}`);

  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong.");
  }
});

/* ================= SUCCESS PAGE ================= */
app.get("/success", (req, res) => {
  const orderId = req.query.id;

  res.send(`
    <div style="text-align:center; padding:40px;">
      <h2>✅ Order Placed Successfully!</h2>
      <p><b>Thank you for ordering from ${BRAND}!</b></p>
      <p>We will contact you shortly for confirmation.</p>
      <p>Delivery within 4–5 days.</p>
      <br>
      <a href="/invoice/${orderId}">
        <button style="padding:10px 20px;">Download Invoice</button>
      </a>
      <br><br>
      <a href="/">Back to Home</a>
    </div>
  `);
});

/* ================= INVOICE ================= */
app.get("/invoice/:id", (req, res) => {
  const orderId = req.params.id;
  const data = JSON.parse(fs.readFileSync("db.json"));
  const order = data.orders.find(o => o.id == orderId);

  if (!order) return res.send("Order not found.");

  const doc = new PDFDocument({ margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${BRAND}_Invoice_${order.id}.pdf`
  );

  doc.pipe(res);

  doc.fontSize(20).text(BRAND, { align: "center" });
  doc.moveDown();

  doc.text("Order Invoice");
  doc.moveDown();

  doc.text(`Order ID: ${order.id}`);
  doc.text(`Customer Name: ${order.name}`);
  doc.text(`Phone: ${order.phone}`);
  doc.text(`Address: ${order.address}`);
  doc.text(`State: ${order.state}`);
  doc.text(`Pincode: ${order.pincode}`);
  doc.moveDown();

  doc.text("Items Ordered:");
  order.items.forEach((item, i) => {
    if (typeof item === "object") {
      doc.text(`${i + 1}. ${item.name} - ${item.size || ""} x ${item.quantity || 1} = ₹${item.total || ""}`);
    } else {
      doc.text(`${i + 1}. ${item}`);
    }
  });

  doc.moveDown();
  doc.text(`Total Amount: ₹${order.totalPrice}`);
  doc.moveDown();

  doc.text(`Owner: ${OWNER}`);
  doc.text(`Contact: ${CONTACT}`);
  doc.moveDown();

  doc.text(`Thank you for ordering from ${BRAND}!`);

  doc.end();
});

/* ================= ADMIN ================= */
app.get("/admin", (req, res) => {
  const key = req.query.key;

  if (key !== process.env.ADMIN_KEY) {
    return res.status(403).send("Unauthorized Access");
  }

  const data = JSON.parse(fs.readFileSync("db.json"));
  const orders = data.orders;

  let rows = orders.map((o, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${o.id}</td>
      <td>${o.name}</td>
      <td>${o.phone}</td>
      <td>₹${o.totalPrice}</td>
      <td>${o.date}</td>
    </tr>
  `).join("");

  res.send(`
    <h1>${BRAND} - Orders</h1>
    <table border="1" cellpadding="10">
      <tr>
        <th>#</th>
        <th>Order ID</th>
        <th>Name</th>
        <th>Phone</th>
        <th>Total</th>
        <th>Date</th>
      </tr>
      ${rows}
    </table>
  `);
});

/* ================= START SERVER ================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
