const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.SECRET_KEY || "super-secret-key-12345";

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, class_id } = req.body;
        const existing = await User.findOne({ where: { email } });
        if (existing) {
            return res.status(400).json({ detail: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ name, email, password: hashedPassword, role, class_id });
        res.json({ message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ detail: "Invalid credentials" });
        }

        const token = jwt.sign({ sub: user.email, role: user.role, id: user.id }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ access_token: token, token_type: "bearer", user: { id: user.id, name: user.name, role: user.role } });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ detail: "Invalid token" });
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, async (err, payload) => {
        if (err) return res.status(401).json({ detail: "Invalid token" });
        const user = await User.findOne({ where: { email: payload.sub } });
        if (!user) return res.status(401).json({ detail: "User not found" });
        req.user = user;
        next();
    });
};

router.get('/me', authMiddleware, (req, res) => {
    res.json({ id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role });
});

module.exports = { router, authMiddleware };
