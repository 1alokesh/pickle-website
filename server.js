const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const adapter = new JSONFile("db.json");

const db = new Low(adapter, {
  orders: [],
  owner: {
    username: "admin",
    password: bcrypt.hashSync("1234", 10)
  }
});

async function init() {
  await db.read();
  db.data ||= { orders: [], owner: db.data.owner };
  await db.write();
}
init();

app.post("/order", async (req, res) => {
  const { name, phone, address, state, pincode, pickle, quantity } = req.body;

  const newOrder = {
    name,
    phone,
    address,
    state,
    pincode,
    pickle,
    quantity,
    date: new Date().toLocaleString()
  };

  db.data.orders.push(newOrder);
  await db.write();
  

  res.json({ message: "Order placed successfully!" });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (
    username === db.data.owner.username &&
    bcrypt.compareSync(password, db.data.owner.password)
  ) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.get("/orders", async (req, res) => {
  await db.read();
  res.json(db.data.orders);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));




