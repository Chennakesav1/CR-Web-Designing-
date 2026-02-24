// server.js - Final Clean Version (With Payment Saving & Environment Variables)

require('dotenv').config(); // 👈 MUST BE AT THE VERY TOP

const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
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

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS:true, 
  auth: {
    user: process.env.EMAIL_USER, // Ensure this matches your .env variable names
    pass: process.env.EMAIL_PASS  // This MUST be your 16-letter App Password
  }
});
const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_SECRET
});

let otpStore = {};

// ==========================================
// 4. ROUTES
// ==========================================

// --- AUTH ROUTES ---
app.post('/send-otp', async (req, res) => {
    const { email, type } = req.body;
    try {
        const user = await User.findOne({ email });
        if (type === 'signup' && user) return res.json({ success: false, message: "Account already exists! Please Login." });
        if (type === 'login' && !user) return res.json({ success: false, message: "No account found. Please Sign Up first." });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = otp;

       // ... (keep the top part of the route the same) ...

        const mailOptions = {
            from: EMAIL_USER,
            to: email,
            subject: `${type.toUpperCase()} Verification Code`,
            text: `Your OTP is: ${otp}`
        };

        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                console.error("❌ NODEMAILER ERROR:", error); // <-- This prints to Render logs!
                return res.json({ success: false, message: "Error sending email. Check logs." }); 
            }
            res.json({ success: true, message: "OTP sent successfully!" });
        });
    } catch (err) {
        console.error("❌ SERVER CRASH IN SEND-OTP:", err); // <-- This prints to Render logs!
        // Changed "error" to "message" so your frontend alert() works properly
        res.status(500).json({ success: false, message: "Internal Server Error: " + err.message }); 
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