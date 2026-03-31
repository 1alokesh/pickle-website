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

const BRAND = "Guntur Inti Ruchulu";
const OWNER = "Padma";
const CONTACT = "9121991628";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Ensure DB
if (!fs.existsSync("db.json")) {
  fs.writeFileSync("db.json", JSON.stringify({ orders: [] }, null, 2));
}

/* ================= ORDER ================= */
app.post("/order", async (req, res) => {
  try {
    console.log("BODY:", req.body); 
    let { name, phone, address, state, pincode, totalPrice, items } = req.body;

    // 🔥 TRIM ALL INPUTS (IMPORTANT FIX)
    name = name?.toString().trim();
    phone = phone?.toString().trim();
    address = address?.toString().trim();
    state = state?.toString().trim();
    pincode = pincode?.toString().trim();

    // 🔥 SAFE VALIDATION
    if (
      !name ||
      !phone ||
      !address ||
      !state ||
      !pincode ||
      name.length === 0 ||
      phone.length === 0 ||
      address.length === 0 ||
      state.length === 0 ||
      pincode.length === 0
    ) {
      console.log("❌ Missing fields:", req.body);
      return res.send("All fields are required.");
    }

    // PHONE CHECK
    if (!/^\d{10}$/.test(phone)) {
      return res.send("Invalid phone number.");
    }

    // 🔥 SAFE ITEMS PARSE (CRITICAL FIX)
    let parsedItems = [];

    if (Array.isArray(items)) {
      parsedItems = items;
    } else if (typeof items === "string") {
      try {
        parsedItems = JSON.parse(items);
      } catch (e) {
        console.log("Parse error:", e);
      }
    }

    if (!parsedItems || parsedItems.length === 0) {
      console.log("❌ Items issue:", items);
      return res.send("No items selected.");
    }

    // SAVE ORDER
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

    // EMAIL TEXT
    let itemText = "";
    parsedItems.forEach((item, index) => {
      const qty = item.quantity || 1;
      const price = item.price || 0;
      const total = item.total || (qty * price);

      itemText += `${index + 1}. ${item.name} - ${item.size || ""} x ${qty} = ₹${total}\n`;
    });

    // SEND EMAIL
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
    console.error("🔥 ERROR:", err);
    res.status(500).send("Something went wrong.");
  }
});

/* ================= SUCCESS ================= */
app.get("/success", (req, res) => {
  const orderId = req.query.id;

  res.send(`
    <div style="text-align:center; padding:40px;">
      <h2>✅ Order Placed Successfully!</h2>
      <p><b>Thank you for ordering from ${BRAND}!</b></p>
      <p>We will contact you shortly.</p>
      <p>Delivery within 4–5 days.</p>

      <br>
      <a href="/invoice/${orderId}">
        <button>Download Invoice</button>
      </a>

      <br><br>
      <a href="/">Back to Home</a>
    </div>
  `);
});

/* ================= INVOICE ================= */
app.get("/invoice/:id", (req, res) => {
  const data = JSON.parse(fs.readFileSync("db.json"));
  const order = data.orders.find(o => o.id == req.params.id);

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

  doc.text(`Order ID: ${order.id}`);
  doc.text(`Name: ${order.name}`);
  doc.text(`Phone: ${order.phone}`);
  doc.text(`Address: ${order.address}, ${order.state} - ${order.pincode}`);
  doc.moveDown();

  doc.text("Items:");

  order.items.forEach((item, i) => {
    const qty = item.quantity || 1;
    const price = item.price || 0;
    const total = item.total || (qty * price);

    doc.text(`${i + 1}. ${item.name} (${item.size}) x ${qty} = ₹${total}`);
  });

  doc.moveDown();
  doc.text(`Total: ₹${order.totalPrice}`);

  doc.end();
});

/* ================= START ================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
