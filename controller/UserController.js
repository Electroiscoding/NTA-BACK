import { pool } from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken'
export const signUp = async (req, res) => {
    try {
        const { email, password, phone_number, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }
        //check is phone number already exist 
        if (phone_number) {
    const existingPhone = await pool.query(
        "SELECT * FROM users WHERE phone_number = $1",
        [phone_number]
    );

    if (existingPhone.rows.length > 0) {
        return res.status(400).json({ message: "Phone number already registered" });
    }
}

        // Check if user already exists
        const existingUser = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: "Email already registered" });
        }

        // Hash the password
        const password_hash = await bcrypt.hash(password, 10);

        // Insert user
        const newUser = await pool.query(
            `INSERT INTO users (email, password_hash, phone_number)
             VALUES ($1, $2, $3)
             RETURNING id, email, phone_number`,
            [email, password_hash, phone_number || null]
        );

        const userId = newUser.rows[0].id;

        // Insert profile with name
        await pool.query(
            `INSERT INTO profiles (user_id, name) VALUES ($1, $2)`,
            [userId, name]
        );

        const token = jwt.sign(
            {userId , email},
            process.env.JWT_SECRET,
            { expiresIn:'1h' }
        )

        res.status(201).json({
            message: "Signup successful",
            user: {
                ...newUser.rows[0],
                name
            },
            token
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

        // Get profile info (optional)
        const profileResult = await pool.query(
            "SELECT name, username, tagline, avatar_url FROM profiles WHERE user_id = $1",
            [user.id]
        );

        res.status(200).json({
            message: "Login successful",
            user: {
                id: user.id,
                email: user.email,
                phone_number: user.phone_number,
                ...profileResult.rows[0]
            },
            token
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};