// server.js - Final Production Version
require('dotenv').config(); // MUST be at the very top
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ FIX 1: Correctly serve the public folder for production
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 1. CONFIGURATION (Using Environment Variables)
// ==========================================

// ✅ FIX 2: Use process.env so Render can "inject" your secrets safely
const MONGO_URI = process.env.MONGO_URI;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET;

// ... (Your Schemas and Routes stay exactly the same) ...

// ==========================================
// 5. START SERVER
// ==========================================

// ✅ FIX 3: Use Render's dynamic port (default 10000) or 3000 for local testing
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));