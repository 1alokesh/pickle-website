const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");
const { nanoid } = require("nanoid");
require("dotenv").config();

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

async function initDB() {
  await db.read();
  await db.write();
}

initDB();

async function initDB() {
  await db.read();
  db.data ||= { orders: [], owner: { username: "admin", password: bcrypt.hashSync("1234", 10) } };
  await db.write();
}
initDB();

app.post("/order", async (req, res) => {
  const { name, phone, address, pickle, quantity } = req.body;

  const newOrder = {
    id: nanoid(),
    name,
    phone,
    address,
    pickle,
    quantity,
    date: new Date()
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
  res.json(db.data.orders);
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

