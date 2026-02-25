// server.js - Final Clean Version (With Payment Saving & Environment Variables)

require('dotenv').config(); // 👈 MUST BE AT THE VERY TOP

const express = require('express');
const mongoose = require('mongoose');

const cors = require('cors');
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const path = require('path');


const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 👈 IMPORTANT: Serve static files safely from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 1. CONFIGURATION (USING .ENV SECRETS)
// ==========================================

// ⚠️ MONGODB (Hidden securely)
const MONGO_URI = process.env.MONGO_URI;

// ⚠️ GOOGLE EMAIL (Hidden securely)
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// ⚠️ RAZORPAY KEYS (Hidden securely)
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET;

// ==========================================
// 2. DATABASE & SCHEMAS
// ==========================================

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// User Schema
const userSchema = new mongoose.Schema({
    name: String,
    phone: String,
    email: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Payment Schema
const paymentSchema = new mongoose.Schema({
    orderId: String,
    paymentId: String,
    signature: String,
    amount: Number,
    currency: String,
    status: String,
    date: { type: Date, default: Date.now }
});
const Payment = mongoose.model('Payment', paymentSchema);

// ==========================================
// 3. INITIALIZE SERVICES
// ==========================================


const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_SECRET
});

let otpStore = {};

// ==========================================
// 4. ROUTES
// ==========================================

// --- AUTH ROUTES ---
// Your OTP Route 
// --- AUTH ROUTES ---
// Your OTP Route 
app.post('/send-otp', async (req, res) => {
  try {
    // 1. Get the email AND the type (login or signup) from the frontend
    const { email, type } = req.body; 
    
    // 🔴 FIX: Check if the user already exists in your MongoDB database
    const existingUser = await User.findOne({ email: email });

    // If they are trying to LOGIN but the email is NOT in the database:
    if (type === 'login' && !existingUser) {
      return res.status(400).json({ success: false, message: 'Account not registered. Please click "New here" to create an account.' });
    }

    // If they are trying to SIGN UP but the email IS already in the database:
    if (type === 'signup' && existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered. Please login instead.' });
    }

    // 2. Generate a random 6-digit OTP and save it
    const otpCode = Math.floor(100000 + Math.random() * 900000); 
    otpStore[email] = otpCode.toString(); 

    // 3. Send the email using Brevo's HTTPS API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { 
          email: 'chennakesavarao89@gmail.com', 
          name: 'C.R-Web-Designing' 
        },
        to: [{ email: email }],
        subject: 'Your Login OTP',
        textContent: `Your OTP code is: ${otpCode}. Please do not share this code.`
      })
    });

    if (!response.ok) {
       const errorData = await response.json();
       console.error('❌ Brevo API Error:', errorData);
       return res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }

    console.log(`✅ OTP Email sent successfully to ${email} for ${type}`);
    res.status(200).json({ success: true, message: 'OTP Sent successfully' });

  } catch (error) {
    console.error('❌ Server Error:', error);
    res.status(500).json({ success: false, message: 'Failed to process OTP request' });
  }
});
app.post('/verify-otp', async (req, res) => {
    const { email, otp, name, phone, type } = req.body;
    if (otpStore[email] === otp) {
        delete otpStore[email];
        if (type === 'signup') {
            const newUser = new User({ name, phone, email });
            await newUser.save();
        }
        res.json({ success: true, message: "Success!" });
    } else {
        res.json({ success: false, message: "Invalid OTP Code" });
    }
});

// --- PAYMENT ROUTE 1: CREATE ORDER ---
app.post('/create-order', async (req, res) => {
    try {
        const { amount } = req.body;
        const options = {
            amount: amount,
            currency: "INR",
            receipt: "receipt_" + Math.random().toString(36).substring(7),
        };
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        res.status(500).send(error);
    }
});

// --- PAYMENT ROUTE 2: VERIFY & SAVE ---
app.post('/verify-payment', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const generated_signature = crypto
        .createHmac('sha256', RAZORPAY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest('hex');

    if (generated_signature === razorpay_signature) {
       
        // 👇 SAVE TO MONGODB
        try {
            const newPayment = new Payment({
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
                signature: razorpay_signature,
                amount: 0, // Ideally pass this from frontend or fetch from Razorpay
                currency: "INR",
                status: "success"
            });
           
            await newPayment.save();
            console.log("✅ Payment Saved to DB:", razorpay_payment_id);
            res.json({ success: true, message: "Payment Verified & Saved" });

        } catch (dbError) {
            console.error("Database Save Error:", dbError);
            res.status(500).json({ success: false, message: "Payment verified but DB save failed" });
        }

    } else {
        res.status(400).json({ success: false, message: "Invalid Signature" });
    }
});

// ==========================================
// 5. START SERVER
// ==========================================

// 👈 IMPORTANT: Use dynamic port for Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));