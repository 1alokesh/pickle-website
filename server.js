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
app.use(express.static(path.join(__dirname, "public")));

if (!fs.existsSync("db.json")) {
  fs.writeFileSync("db.json", JSON.stringify({ orders: [] }, null, 2));
}

// ================= ORDER ROUTE =================

app.post("/order", async (req, res) => {
  try {
    const { name, phone, address, state, pincode, price } = req.body;

    if (!name || !phone || !address || !state || !pincode || !price || price == 0) {
      return res.send("All fields are required.");
    }

    const order = {
      name,
      phone,
      address,
      state,
      pincode,
      price,
      date: new Date().toLocaleString(),
    };

    const data = JSON.parse(fs.readFileSync("db.json"));
    data.orders.push(order);
    fs.writeFileSync("db.json", JSON.stringify(data, null, 2));

    // ============ SEND OWNER EMAIL ============
    await resend.emails.send({
      from: "Mana Inti Ruchulu <onboarding@resend.dev>",
      to: process.env.EMAIL_USER,
      subject: "New Order - Mana Inti Ruchulu",
      text: `
New Order Received

Customer Name: ${name}
Phone: ${phone}
Address: ${address}, ${state} - ${pincode}
Total Price: ₹${price}

Owner: Padma
Contact: 9121991628
      `,
    });

    // ============ GENERATE PDF ============
    const doc = new PDFDocument();
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Mana_Inti_Ruchulu_Order.pdf`
    );

    doc.pipe(res);

    doc.fontSize(20).text("Mana Inti Ruchulu Pickles", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text("Order Invoice");
    doc.moveDown();

    doc.text(`Customer Name: ${name}`);
    doc.text(`Phone: ${phone}`);
    doc.text(`Address: ${address}`);
    doc.text(`State: ${state}`);
    doc.text(`Pincode: ${pincode}`);
    doc.moveDown();

    doc.text(`Total Amount: ₹${price}`);
    doc.moveDown();

    doc.text("Owner: Padma");
    doc.text("Contact: 9121991628");
    doc.moveDown();

    doc.text("Thank you for ordering from Mana Inti Ruchulu!");
    doc.text("Owner will contact you on WhatsApp for confirmation.");

    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong.");
  }
});

// ================= ADMIN PAGE =================

app.get("/admin", (req, res) => {
  const data = JSON.parse(fs.readFileSync("db.json"));
  const orders = data.orders;

  let orderList = orders.map((o, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${o.name}</td>
      <td>${o.phone}</td>
      <td>${o.address}, ${o.state} - ${o.pincode}</td>
      <td>₹${o.price}</td>
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
        <th>Address</th>
        <th>Total Price</th>
        <th>Date</th>
      </tr>
      ${orderList}
    </table>
  `);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
