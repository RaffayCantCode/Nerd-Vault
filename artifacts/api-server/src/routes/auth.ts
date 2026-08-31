import { Router } from "express";
import { findUserByEmail, findUserById, createUser, User } from "@workspace/db";

const router = Router();

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  const salt = enc.encode("nerdvault-v2-salt");
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const exported = await crypto.subtle.exportKey("raw", key);
  return Array.from(new Uint8Array(exported))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * GET /api/auth/me
 * Returns current authenticated user or null (Guest)
 */
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const userId = authHeader?.replace(/^Bearer\s+/i, "") || req.cookies?.nv_user_id;

    if (!userId) {
      return res.json({ user: null });
    }

    const user = await findUserById(userId);
    res.json({ user: user || null });
  } catch (error: any) {
    res.json({ user: null });
  }
});

/**
 * POST /api/auth/login
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const hashedInput = await hashPassword(password);
    if (user.passwordHash && user.passwordHash !== hashedInput) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    res.cookie("nv_user_id", user.id, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({ user, token: user.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Login failed" });
  }
});

/**
 * POST /api/auth/register
 */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "A user with this email already exists" });
    }

    const passwordHash = await hashPassword(password);
    const id = crypto.randomUUID();
    const newUser = await createUser({
      id,
      name,
      email,
      passwordHash,
    });

    res.cookie("nv_user_id", newUser.id, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({ user: newUser, token: newUser.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Registration failed" });
  }
});

/**
 * POST /api/auth/logout
 */
router.post("/logout", (req, res) => {
  res.clearCookie("nv_user_id");
  res.json({ success: true });
});

export default router;
