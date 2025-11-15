import { pool } from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken'

export const signUp = async (req, res) => {
    try {
        const { full_name, email, username, password } = req.body;

        // Validate required fields
        if (!full_name || !email || !username || !password ) {
            return res.status(400).json({ 
                message: "Full name, email, username, and password are required" 
            });
        }

        // Check if email already exists
        const existingEmail = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (existingEmail.rows.length > 0) {
            return res.status(400).json({ message: "Email already registered" });
        }

        // Check if username already exists
        const existingUsername = await pool.query(
            "SELECT * FROM users WHERE username = $1",
            [username]
        );

        if (existingUsername.rows.length > 0) {
            return res.status(400).json({ message: "Username already taken" });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Insert user (NO PHONE NUMBER ANYMORE)
        const newUser = await pool.query(
            `INSERT INTO users (full_name, username, email, password_hash)
             VALUES ($1, $2, $3, $4)
             RETURNING id, full_name, username, email`,
            [full_name, username, email, password_hash]
        );

        const userId = newUser.rows[0].id;

        // Create empty profile
        await pool.query(
            `INSERT INTO profiles (user_id) VALUES ($1)`,
            [userId]
        );

        // Generate JWT
        const token = jwt.sign(
            { userId, email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(201).json({
            message: "Signup successful",
            user: newUser.rows[0],
            token,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // Find user by email
        const userResult = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const user = userResult.rows[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Get profile info
        const profileResult = await pool.query(
            "SELECT tagline, bio, avatar_url, onboarding_complete FROM profiles WHERE user_id = $1",
            [user.id]
        );

        const profile = profileResult.rows[0] || {};

        res.status(200).json({
            message: "Login successful",
            user: {
                id: user.id,
                full_name: user.full_name,
                username: user.username,
                email: user.email,
                ...profile
            },
            token
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};