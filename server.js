const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const { Pool } = require("pg");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const PORT = process.env.PORT || 5000;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false,
  },
});

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(bodyParser.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Rotas de autenticação e gerenciamento de usuários permanecem inalteradas

app.get("/api/products", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, price, image_url FROM products"
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.get("/api/products/:id/image", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT image_data FROM products WHERE id = $1",
      [id]
    );
    if (result.rows.length > 0) {
      res.set("Content-Type", "image/jpeg"); // ou image/png dependendo do tipo da imagem
      res.send(result.rows[0].image_data);
    } else {
      res.status(404).json({ error: "Image not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch image" });
  }
});

app.post("/api/products", upload.single("image"), async (req, res) => {
  const { name, price } = req.body;
  const imageData = req.file ? req.file.buffer : null;
  try {
    const result = await pool.query(
      "INSERT INTO products (name, price, image_data) VALUES ($1, $2, $3) RETURNING id, name, price",
      [name, price, imageData]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add product" });
  }
});

app.put("/api/products/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const { name, price } = req.body;
  const imageData = req.file ? req.file.buffer : req.body.imageUrl;
  try {
    const result = await pool.query(
      "UPDATE products SET name = $1, price = $2, image_data = $3 WHERE id = $4 RETURNING id, name, price",
      [name, price, imageData, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM products WHERE id = $1", [id]);
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
