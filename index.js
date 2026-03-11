require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

/* =========================
   APP SETUP
========================= */

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

/* =========================
   MONGODB CONNECTION
========================= */

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => {
    console.error("MongoDB Error:", err);
    process.exit(1);
  });

/* =========================
   MODELS
========================= */

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  department: { type: String, required: true },   // ✅ ADDED
  photo: { type: String, required: true }
});

const Employee = mongoose.model("Employee", employeeSchema);

const Cart = mongoose.model(
  "Cart",
  new mongoose.Schema({
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee"
    }
  })
);

/* =========================
   ADMIN LOGIN
========================= */

app.post("/admin/login", (req, res) => {
  const { key } = req.body;

  if (!key) {
    return res.status(400).json({ message: "Key required" });
  }

  if (key === process.env.ADMIN_KEY) {
    return res.json({ success: true });
  }

  return res.status(401).json({ message: "Invalid admin key" });
});

/* =========================
   ADMIN MIDDLEWARE
========================= */

const isAdmin = (req, res, next) => {
  const key = req.headers["x-admin-key"];

  if (!key) {
    return res.status(401).json({ message: "Admin key missing" });
  }

  if (key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ message: "Admin only" });
  }

  next();
};

/* =========================
   CLOUDINARY CONFIG ROUTE
========================= */

app.get("/cloudinary-config", isAdmin, (req, res) => {
  res.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET
  });
});

/* =========================
   DEFAULT PAGE
========================= */

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/employee-list.html");
});

/* =========================
   EMPLOYEES
========================= */

app.get("/employees", async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json(employees);
  } catch {
    res.status(500).json({ error: "Fetch failed" });
  }
});

app.post("/employees", isAdmin, async (req, res) => {
  try {
    const { name, department, photo } = req.body;

    const employee = await Employee.create({
      name,
      department,
      photo
    });

    res.json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Create failed" });
  }
});

app.delete("/employees/:id", isAdmin, async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch {
    res.status(500).json({ error: "Delete failed" });
  }
});

/* =========================
   CART
========================= */

app.get("/cart", async (req, res) => {
  try {
    const items = await Cart.find().populate("employee");
    res.json(items);
  } catch {
    res.status(500).json({ error: "Cart fetch failed" });
  }
});

app.post("/cart/:employeeId", async (req, res) => {
  try {
    const item = await Cart.create({
      employee: req.params.employeeId
    });
    res.json(item);
  } catch {
    res.status(500).json({ error: "Add to cart failed" });
  }
});

app.delete("/cart/:id", async (req, res) => {
  try {
    await Cart.findByIdAndDelete(req.params.id);
    res.json({ message: "Removed from cart" });
  } catch {
    res.status(500).json({ error: "Remove failed" });
  }
});

app.delete("/cart", async (req, res) => {
  try {
    await Cart.deleteMany({});
    res.json({ message: "Cart cleared" });
  } catch {
    res.status(500).json({ error: "Clear failed" });
  }
});

/* =========================
   SERVER START
========================= */

const PORT = process.env.PORT || 5000;

app.listen(5000, '0.0.0.0', () => {
  console.log("Server running on port 5000");
});