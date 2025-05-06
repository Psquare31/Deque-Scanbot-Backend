const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv=require('dotenv').config();
const {Client} =require('pg');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const pool = new Client({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.PORT,
});
pool.connect().then(()=>console.log("Connected to DB"))

// GET product by barcode
app.get('/api/products/:barcode', async (req, res) => {
  const { barcode } = req.params;
  try {
    const result = await pool.query('SELECT * FROM products WHERE barcode = $1', [barcode]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
