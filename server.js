const { Resend } = require("resend");
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
const PDFDocument = require("pdfkit");

const app = express();
const PORT = process.env.PORT || 3000;
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // for JSON posts
app.use(express.static(path.join(__dirname, "public")));

// Ensure db.json exists
if (!fs.existsSync("db.json")) {
  fs.writeFileSync("db.json", JSON.stringify({ orders: [] }, null, 2));
}

/* ================= ORDER ROUTE ================= */
app.post("/order", async (req, res) => {
  try {
    const { name, phone, address, state, pincode, totalPrice, items } = req.body;

    // Check required fields
    if (!name || !phone || !address || !state || !pincode || !totalPrice || !items) {
      return res.send("All fields are required.");
    }

    // Parse items JSON if string
    let parsedItems = [];
    if (typeof items === "string") {
      try {
        parsedItems = JSON.parse(items);
      } catch {
        return res.send("Items format invalid.");
      }
    } else {
      parsedItems = items;
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
      totalPrice,
      items: parsedItems,
      date: new Date().toLocaleString(),
    };

    data.orders.push(order);
    fs.writeFileSync("db.json", JSON.stringify(data, null, 2));

    // Format items for email
    let itemText = "";
    parsedItems.forEach((item, index) => {
      itemText += `${index + 1}. ${item.name} - ${item.size} x ${item.quantity} = ₹${item.total}\n`;
    });

    // Send Owner Email
    await resend.emails.send({
      from: "Mana Inti Ruchulu <onboarding@resend.dev>",
      to: process.env.EMAIL_USER,
      subject: "New Order - Mana Inti Ruchulu",
      text: `
New Order Received

Order ID: ${orderId}
Customer Name: ${name}
Phone: ${phone}
Address: ${address}, ${state} - ${pincode}

Items Ordered:
${itemText}

Total Price: ₹${totalPrice}

Owner: Padma
Contact: 9121991628
      `,
    });

    // Redirect to success page
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
    <h2>✅ Order Placed Successfully!</h2>
    <p><b>Thank you for ordering from Mana Inti Ruchulu!</b></p>
    <p>We will contact you over WhatsApp or call for payment details.</p>
    <p>Order will be delivered within 4 to 5 days.</p>
    <br>
    <a href="/invoice/${orderId}">
      <button style="padding:10px 20px;">Download Invoice</button>
    </a>
    <br><br>
    <a href="/">Back to Home</a>
  `);
});

/* ================= INVOICE PDF ================= */
app.get("/invoice/:id", (req, res) => {
  const orderId = req.params.id;
  const data = JSON.parse(fs.readFileSync("db.json"));
  const order = data.orders.find(o => o.id == orderId);

  if (!order) return res.send("Order not found.");

  const doc = new PDFDocument({ margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=Mana_Inti_Ruchulu_Invoice_${order.id}.pdf`
  );

  doc.pipe(res);

  doc.fontSize(20).text("Mana Inti Ruchulu Pickles", { align: "center" });
  doc.moveDown();

  doc.fontSize(14).text("Order Invoice");
  doc.moveDown();

  doc.text(`Order ID: ${order.id}`);
  doc.text(`Customer Name: ${order.name}`);
  doc.text(`Phone: ${order.phone}`);
  doc.text(`Address: ${order.address}`);
  doc.text(`State: ${order.state}`);
  doc.text(`Pincode: ${order.pincode}`);
  doc.moveDown();

  doc.text("Items Ordered:");
  doc.moveDown();
  order.items.forEach((item, index) => {
    doc.text(`${index + 1}. ${item.name} - ${item.size} x ${item.quantity} = ₹${item.total}`);
  });

  doc.moveDown();
  doc.text(`Total Amount: ₹${order.totalPrice}`);
  doc.moveDown();

  doc.text("Owner: Padma");
  doc.text("Contact: 9121991628");
  doc.moveDown();

  doc.text("Thank you for ordering from Mana Inti Ruchulu!");
  doc.text("We will contact you over WhatsApp or call for payment details.");
  doc.text("Order will be delivered within 4 to 5 days.");

  doc.end();
});

/* ================= ADMIN PAGE ================= */
app.get("/admin", (req, res) => {
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
    <h1>Mana Inti Ruchulu - Orders</h1>
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
