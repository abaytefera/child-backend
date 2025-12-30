import express from "express";
import { Connectdb, Closedb } from "./MongodbConfig.js";
import bcrypt from "bcrypt";
import { body, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const secret_key = process.env.SECRET_KEY;
export const routerlogin = express.Router();

const loginValidationRule = [
  body("email")
    .notEmpty().withMessage("Please enter your email")
    .isEmail().withMessage("Invalid email format")
    .normalizeEmail()
    .escape()
    .trim(),
  body("password")
    .notEmpty().withMessage("Please enter password")
    .escape()
    .trim()
];

const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`Rate limit exceeded for IP: ${req.ip}`);
    return res.status(429).json({
      ok: false,
      msg: "Too many login attempts. Try again later."
    });
  }
});

routerlogin.post("/", loginValidationRule, loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, msg: errors.array() });
  }

  let dbInstance = null;

  try {
    dbInstance = await Connectdb();
    if (!dbInstance) throw new Error("Database connection failed");

    const userAuthCollection = dbInstance.collection("userAuth");
    const userAuth = await userAuthCollection.findOne({ email });

    if (!userAuth) {
      return res.status(400).json({ ok: false, msg: "Email not found" });
    }

    const match = await bcrypt.compare(password, userAuth.password);
    if (!match) {
      return res.status(401).json({ ok: false, msg: "Incorrect password" });
    }

    const userCollection = dbInstance.collection("User");
    const userData = await userCollection.findOne({ _id: userAuth.user_id });

    const tokenOptions = {
      algorithm: "HS256",
      expiresIn: "30d"
    };

    const payload = {
      sub: userAuth._id,
      role: userData.role,
      email: userData.email
    };

    const token = jwt.sign(payload, secret_key, tokenOptions);

    return res.status(200).json({
      ok: true,
      msg: "Successfully logged in",
      token,
      id: userAuth.user_id
    });

  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ ok: false, msg: err.message });
  } finally {
    dbInstance = null;
    Closedb(); // call as function
  }
});
