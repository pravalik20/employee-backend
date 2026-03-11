require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

/* =========================
   APP SETUP
========================= */

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

/* =========================
   MODELS
========================= */

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  department: { type: String, required: true },
  photo: { type: String, required: true }
});

const Employee = mongoose.model("Employee", employeeSchema);

const cartSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee"
  }
});

const Cart = mongoose.model("Cart", cartSchema);

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

function isAdmin(req, res, next) {
  const key = req.headers["x-admin-key"];

  if (!key) {
    return res.status(401).json({ message: "Admin key missing" });
  }

  if (key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ message: "Admin only" });
  }

  next();
}

/* =========================
   CLOUDINARY CONFIG
========================= */

app.get("/cloudinary-config", isAdmin, (req, res) => {
  res.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET
  });
});

/* =========================
   HOME PAGE
========================= */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "employee-list.html"));
});

/* =========================
   EMPLOYEES
========================= */

app.get("/employees", async (req, res) => {
  try {
    const employees = await Employee.find().sort({ name: 1 });
    res.json(employees);
  } catch (err) {
    console.error("Employees Fetch Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/employees", isAdmin, async (req, res) => {
  try {
    const employee = await Employee.create(req.body);
    res.json(employee);
  } catch (err) {
    console.error("Create Employee Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put("/employees/:id", isAdmin, async (req, res) => {
  try {
    const updated = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error("Update Employee Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/employees/:id", isAdmin, async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete Employee Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   CART
========================= */

app.get("/cart", async (req, res) => {
  try {
    const items = await Cart.find().populate("employee");
    res.json(items);
  } catch (err) {
    console.error("Cart Fetch Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/cart/:employeeId", async (req, res) => {
  try {
    const item = await Cart.create({
      employee: req.params.employeeId
    });
    res.json(item);
  } catch (err) {
    console.error("Add Cart Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/cart/:id", async (req, res) => {
  try {
    await Cart.findByIdAndDelete(req.params.id);
    res.json({ message: "Removed from cart" });
  } catch (err) {
    console.error("Delete Cart Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/cart", async (req, res) => {
  try {
    await Cart.deleteMany({});
    res.json({ message: "Cart cleared" });
  } catch (err) {
    console.error("Clear Cart Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   START SERVER AFTER DB CONNECTS
========================= */

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000
    });

    console.log("✅ MongoDB Connected");

    const PORT = process.env.PORT || 10000;

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err.message);
    process.exit(1);
  }
}

startServer();