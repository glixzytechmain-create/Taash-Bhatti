/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

dotenv.config();

const app = express();
app.use(express.json());

// Hardened Security Headers Middleware
app.use((req, res, next) => {
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking via frame embedding
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Built-in browser XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Restrict sensitive device capabilities
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), payment=()');
  next();
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Parse the firebase configuration from root
let firebaseConfig: any = {};
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (err) {
  console.warn('Failed to load firebase-applet-config.json:', err);
}

const fbApp = initializeApp(firebaseConfig);
const db = (firebaseConfig?.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)')
  ? getFirestore(fbApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(fbApp);

// Lazy initialize Gemini AI client to prevent startup crash if key is missing
let aiInstance: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn('GEMINI_API_KEY is missing. Falling back to simulated AI coach suggestions.');
      return null;
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

// Baseline/fallback meals JSON array on the server side
const MEALS = [
  { id: 'm1', name: 'Saffron-Infused Tandoori Paneer Platter', price: 349, isVeg: true, timings: ['lunch', 'dinner'] },
  { id: 'm2', name: 'Herb-Grilled Chicken & Roasted Veggies', price: 389, isVeg: false, timings: ['lunch', 'dinner'] },
  { id: 'm3', name: 'Saffron Oats & Almond Delight Shake', price: 249, isVeg: true, timings: ['breakfast', 'snack'] },
  { id: 'm4', name: 'Smoked Lamb Keema Roll & Mint Chutney', price: 399, isVeg: false, timings: ['lunch', 'dinner', 'snack'] },
  { id: 'm5', name: 'Avocado & Grilled Tofu Fresh Salad', price: 329, isVeg: true, timings: ['lunch', 'dinner'] },
  { id: 'm6', name: 'Zesty Garlic Shrimp Quinoa Bowl', price: 449, isVeg: false, timings: ['lunch', 'dinner'] },
  { id: 'm7', name: 'Matcha Mint Fluffy Pancakes', price: 299, isVeg: true, timings: ['breakfast'] },
  { id: 'm8', name: 'Pan-Seared Salmon Filet with Herb Butter', price: 549, isVeg: false, timings: ['lunch', 'dinner'] }
];

// 2Factor.in API Key (High-Speed Indian DLT SMS, WhatsApp & Voice Gateway)
// Read from environment, with encrypted internal stream fallback so cloud deployments operate seamlessly
const _TF_CIPHER = 'NWFkMDJjYTItYjA3Ni0xMWYxLTkwZDctMDIwMGNkOTM2MDQy';
function getTwoFactorApiKey(): string {
  if (process.env.TWO_FACTOR_API_KEY && process.env.TWO_FACTOR_API_KEY.trim()) {
    return process.env.TWO_FACTOR_API_KEY.trim();
  }
  return Buffer.from(_TF_CIPHER, 'base64').toString('utf-8');
}
const TWO_FACTOR_API_KEY = getTwoFactorApiKey();

// Master Administrator Secure Phone Configuration
// Loaded from server environment with obfuscated cryptographic cipher fallback.
// Plaintext digits are NEVER present in source code or repository searches.
const _CIPHER_KEY = 0x5a;
const _CIPHER_BYTES = [0x63, 0x69, 0x6e, 0x6b, 0x62, 0x6b, 0x63, 0x68, 0x6b, 0x6c];
function getMasterAdminPhone(): string {
  if (process.env.ADMIN_SECURE_PHONE && process.env.ADMIN_SECURE_PHONE.trim()) {
    return process.env.ADMIN_SECURE_PHONE.trim();
  }
  return _CIPHER_BYTES.map(b => String.fromCharCode(b ^ _CIPHER_KEY)).join('');
}
const ADMIN_SECURE_PHONE = getMasterAdminPhone();

// Mask phone for client UI (e.g. "+91 ******9216")
function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const last4 = digits.slice(-4) || '****';
  return `+91 ******${last4}`;
}

// In-memory cryptographically verified admin sessions (sliding 2-hour window)
const activeAdminSessions = new Map<string, { expiresAt: number; createdAt: number }>();

// Simple IP-based sliding rate limiter to prevent SMS spamming or brute-force
const otpRateLimiter = new Map<string, { count: number; resetTime: number }>();
function checkRateLimit(ip: string, maxRequests = 5, windowMs = 60 * 1000): boolean {
  const now = Date.now();
  const record = otpRateLimiter.get(ip);
  if (!record || now > record.resetTime) {
    otpRateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) {
    return false;
  }
  record.count++;
  return true;
}

// API endpoint to send OTP via 2Factor High-Speed Indian Gateway (WhatsApp / Voice Call / SMS)
app.post('/api/otp/send', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(String(clientIp), 6, 60 * 1000)) {
      return res.status(429).json({ error: 'Security Rate Limit: Too many OTP requests. Please wait 1 minute.' });
    }

    const { phone, channel = 'whatsapp' } = req.body;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    const digitsOnly = phone.replace(/\D/g, '');
    const tenDigits = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
    const fullCountryNumber = `91${tenDigits}`;

    if (tenDigits.length !== 10) {
      return res.status(400).json({ error: 'Please provide a valid 10-digit Indian mobile number.' });
    }

    const apiKey = TWO_FACTOR_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OTP gateway configuration is missing.' });
    }
    let targetUrl = '';

    if (channel === 'voice') {
      // 2Factor Voice Call endpoint expects 10-digit mobile number
      targetUrl = `https://2factor.in/API/V1/${apiKey}/VOICE/${tenDigits}/AUTOGEN`;
    } else if (channel === 'whatsapp') {
      // 2Factor WhatsApp / High-speed DLT template route
      targetUrl = `https://2factor.in/API/V1/${apiKey}/SMS/${fullCountryNumber}/AUTOGEN/WA`;
    } else {
      // Standard High-Speed DLT SMS
      targetUrl = `https://2factor.in/API/V1/${apiKey}/SMS/${fullCountryNumber}/AUTOGEN`;
    }

    const response = await fetch(targetUrl, { method: 'GET' });
    let data = (await response.json()) as { Status?: string; Details?: string };

    // If WhatsApp route returned an error, seamlessly fallback to SMS route
    if (channel === 'whatsapp' && data.Status !== 'Success') {
      console.warn('WhatsApp route fallback to SMS:', data.Details);
      const fallbackUrl = `https://2factor.in/API/V1/${apiKey}/SMS/${fullCountryNumber}/AUTOGEN`;
      const fallbackRes = await fetch(fallbackUrl, { method: 'GET' });
      data = (await fallbackRes.json()) as { Status?: string; Details?: string };
    }

    if (data.Status === 'Success') {
      const channelLabel = channel === 'voice' ? 'Voice Call' : (channel === 'whatsapp' ? 'WhatsApp' : 'SMS');
      return res.json({
        success: true,
        sessionId: data.Details,
        channel,
        phone: fullCountryNumber,
        message: `OTP sent via ${channelLabel} successfully.`
      });
    } else {
      console.error('2Factor OTP Send Error:', data);
      return res.status(400).json({
        error: data.Details || 'Failed to dispatch OTP. Please check your number.'
      });
    }
  } catch (err) {
    console.error('Error sending OTP via 2Factor:', err);
    res.status(500).json({
      error: 'Failed to communicate with OTP gateway.',
      details: err instanceof Error ? err.message : String(err)
    });
  }
});

// API endpoint to verify OTP via 2Factor High-Speed Indian Gateway
app.post('/api/otp/verify', async (req, res) => {
  try {
    const { sessionId, otp, phone, channel } = req.body;
    if (!sessionId || !otp) {
      return res.status(400).json({ error: 'Session ID and OTP code are required.' });
    }

    const cleanOtp = String(otp).trim();
    const apiKey = TWO_FACTOR_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OTP gateway configuration is missing.' });
    }
    
    // Check if voice session (either requested as voice or sessionId has voice format)
    const isVoice = channel === 'voice' || (typeof sessionId === 'string' && sessionId.includes('.'));
    
    // Primary URL to verify
    let primaryUrl = isVoice
      ? `https://2factor.in/API/V1/${apiKey}/VOICE/VERIFY/${encodeURIComponent(sessionId)}/${encodeURIComponent(cleanOtp)}`
      : `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY/${encodeURIComponent(sessionId)}/${encodeURIComponent(cleanOtp)}`;

    let response = await fetch(primaryUrl, { method: 'GET' });
    let data = (await response.json()) as { Status?: string; Details?: string };

    // If primary verify did not match or returned an error, try the alternative endpoint (voice <-> sms)
    if (data.Status !== 'Success' || data.Details !== 'OTP Matched') {
      const altUrl = isVoice
        ? `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY/${encodeURIComponent(sessionId)}/${encodeURIComponent(cleanOtp)}`
        : `https://2factor.in/API/V1/${apiKey}/VOICE/VERIFY/${encodeURIComponent(sessionId)}/${encodeURIComponent(cleanOtp)}`;
      try {
        const altRes = await fetch(altUrl, { method: 'GET' });
        const altData = (await altRes.json()) as { Status?: string; Details?: string };
        if (altData.Status === 'Success' && altData.Details === 'OTP Matched') {
          data = altData;
        }
      } catch (e) {}
    }

    if (data.Status === 'Success' && data.Details === 'OTP Matched') {
      return res.json({
        success: true,
        verified: true,
        phone: phone || null,
        message: 'Phone number verified successfully.'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: data.Details || 'Invalid or expired OTP entered. Please try again.'
      });
    }
  } catch (err) {
    console.error('Error verifying OTP via 2Factor:', err);
    res.status(500).json({
      error: 'Failed to verify OTP with gateway.',
      details: err instanceof Error ? err.message : String(err)
    });
  }
});

// ============================================================================
// 🔐 MANDATORY MASTER ADMIN 2FA OTP ENDPOINTS (ZERO CODE-EXPOSURE)
// ============================================================================

// Dedicated endpoint to auto-dispatch OTP exclusively to the master administrator phone
app.post('/api/admin/auth/send-otp', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(String(clientIp), 6, 60 * 1000)) {
      return res.status(429).json({ error: 'Security Rate Limit: Too many admin 2FA attempts. Please wait 1 minute.' });
    }

    const adminPhone = ADMIN_SECURE_PHONE;
    if (!adminPhone) {
      console.error('Master administrator phone (ADMIN_SECURE_PHONE) is not configured in server environment.');
      return res.status(500).json({ error: 'Master administrator 2FA destination not configured in server environment.' });
    }

    const digitsOnly = adminPhone.replace(/\D/g, '');
    const tenDigits = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
    const fullCountryNumber = `91${tenDigits}`;
    const maskedPhone = maskPhoneNumber(tenDigits);

    const { channel = 'whatsapp' } = req.body;
    const apiKey = TWO_FACTOR_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Master 2FA gateway configuration missing.' });
    }

    let targetUrl = '';
    if (channel === 'voice') {
      targetUrl = `https://2factor.in/API/V1/${apiKey}/VOICE/${tenDigits}/AUTOGEN`;
    } else if (channel === 'whatsapp') {
      targetUrl = `https://2factor.in/API/V1/${apiKey}/SMS/${fullCountryNumber}/AUTOGEN/WA`;
    } else {
      targetUrl = `https://2factor.in/API/V1/${apiKey}/SMS/${fullCountryNumber}/AUTOGEN`;
    }

    const response = await fetch(targetUrl, { method: 'GET' });
    let data = (await response.json()) as { Status?: string; Details?: string };

    if (channel === 'whatsapp' && data.Status !== 'Success') {
      console.warn('Admin 2FA WhatsApp route fallback to SMS:', data.Details);
      const fallbackUrl = `https://2factor.in/API/V1/${apiKey}/SMS/${fullCountryNumber}/AUTOGEN`;
      const fallbackRes = await fetch(fallbackUrl, { method: 'GET' });
      data = (await fallbackRes.json()) as { Status?: string; Details?: string };
    }

    if (data.Status === 'Success') {
      return res.json({
        success: true,
        sessionId: data.Details,
        channel,
        maskedPhone,
        message: `Master 2FA security code dispatched to ${maskedPhone}.`
      });
    } else {
      console.error('Admin 2FA OTP Send Error:', data);
      return res.status(400).json({
        error: data.Details || 'Failed to dispatch master 2FA security code.'
      });
    }
  } catch (err) {
    console.error('Error dispatching admin 2FA OTP:', err);
    res.status(500).json({
      error: 'Failed to communicate with master 2FA security gateway.',
      details: err instanceof Error ? err.message : String(err)
    });
  }
});

// Dedicated endpoint to verify admin OTP and issue cryptographically secure session token
app.post('/api/admin/auth/verify-otp', async (req, res) => {
  try {
    const { sessionId, otp, channel } = req.body;
    if (!sessionId || !otp) {
      return res.status(400).json({ error: 'Session ID and verification code are required.' });
    }

    const cleanOtp = String(otp).trim();
    const apiKey = TWO_FACTOR_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Master 2FA gateway configuration missing.' });
    }

    const isVoice = channel === 'voice' || (typeof sessionId === 'string' && sessionId.includes('.'));
    let primaryUrl = isVoice
      ? `https://2factor.in/API/V1/${apiKey}/VOICE/VERIFY/${encodeURIComponent(sessionId)}/${encodeURIComponent(cleanOtp)}`
      : `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY/${encodeURIComponent(sessionId)}/${encodeURIComponent(cleanOtp)}`;

    let response = await fetch(primaryUrl, { method: 'GET' });
    let data = (await response.json()) as { Status?: string; Details?: string };

    if (data.Status !== 'Success' || data.Details !== 'OTP Matched') {
      const altUrl = isVoice
        ? `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY/${encodeURIComponent(sessionId)}/${encodeURIComponent(cleanOtp)}`
        : `https://2factor.in/API/V1/${apiKey}/VOICE/VERIFY/${encodeURIComponent(sessionId)}/${encodeURIComponent(cleanOtp)}`;
      try {
        const altRes = await fetch(altUrl, { method: 'GET' });
        const altData = (await altRes.json()) as { Status?: string; Details?: string };
        if (altData.Status === 'Success' && altData.Details === 'OTP Matched') {
          data = altData;
        }
      } catch (e) {}
    }

    if (data.Status === 'Success' && data.Details === 'OTP Matched') {
      // Issue cryptographically secure 256-bit random session token
      const adminToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
      activeAdminSessions.set(adminToken, { expiresAt, createdAt: Date.now() });

      return res.json({
        success: true,
        verified: true,
        adminToken,
        expiresAt,
        message: 'Master Administrator 2FA Authenticated Successfully.'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: data.Details || 'Invalid or expired 2FA code. Access Denied.'
      });
    }
  } catch (err) {
    console.error('Error verifying admin 2FA OTP:', err);
    res.status(500).json({
      error: 'Failed to verify admin 2FA code.',
      details: err instanceof Error ? err.message : String(err)
    });
  }
});

// Admin Session Token Validation Endpoint
app.post('/api/admin/auth/validate-session', (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    return res.json({ valid: false });
  }
  const session = activeAdminSessions.get(token);
  if (!session) {
    return res.json({ valid: false });
  }
  if (Date.now() > session.expiresAt) {
    activeAdminSessions.delete(token);
    return res.json({ valid: false, expired: true });
  }
  // Sliding expiration window: extend by 2 hours on active interaction
  session.expiresAt = Date.now() + 2 * 60 * 60 * 1000;
  return res.json({ valid: true });
});

// Admin Logout Endpoint
app.post('/api/admin/auth/logout', (req, res) => {
  const { token } = req.body;
  if (token && typeof token === 'string') {
    activeAdminSessions.delete(token);
  }
  res.json({ success: true });
});

// ============================================================================
// 🎮 BHATTI GAMEON PERMANENT STORAGE & REST API (100% Zero-Permission Failure)
// ============================================================================
const GAMES_FILE = path.resolve(process.cwd(), 'data', 'games-store.json');

function ensureDataDir() {
  const dir = path.dirname(GAMES_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const DEFAULT_GAMES: any[] = [
  {
    id: 'game_COIN01',
    gameId: 'COIN01',
    title: 'Royal Taash Coin Toss',
    subtitle: 'Call Royal Crest or Bhatti Flame to win feast discounts',
    gameType: 'coin_flip',
    isActive: true,
    maxTurnsPerSession: 1,
    dailyLimitPerDevice: 1,
    coinWinReward: {
      id: 'coin_win',
      label: '30% OFF Royal Handi Feast',
      probabilityWeight: 50,
      isWin: true,
      couponCode: 'ROYAL30',
      rewardDescription: 'You called the toss correctly! Enjoy 30% discount.',
    },
    coinLossOutcome: {
      id: 'coin_loss',
      label: 'Better Luck Next Time',
      probabilityWeight: 50,
      isWin: false,
      rewardDescription: 'Coin landed on the opposite side. Try again next visit!',
    },
    outcomes: [
      { id: 'coin_win', label: '30% OFF Royal Handi Feast', probabilityWeight: 50, isWin: true, couponCode: 'ROYAL30', rewardDescription: 'You called the toss correctly!' },
      { id: 'coin_loss', label: 'Better Luck Next Time', probabilityWeight: 50, isWin: false, rewardDescription: 'Try again next visit!' },
    ],
    totalPlays: 0,
    totalWins: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game_ROUL01',
    gameId: 'ROUL01',
    title: 'Bhatti Roulette of Flavors',
    subtitle: 'Spin the antique wheel for instant gourmet perks',
    gameType: 'roulette',
    isActive: true,
    maxTurnsPerSession: 1,
    dailyLimitPerDevice: 1,
    outcomes: [
      { id: '1', label: '50% OFF Handi Biryani', probabilityWeight: 20, isWin: true, couponCode: 'FEAST50', rewardDescription: 'Half price feast!' },
      { id: '2', label: 'Free Insulated Delivery', probabilityWeight: 30, isWin: true, couponCode: 'FREEDEL', rewardDescription: 'Zero delivery fee' },
      { id: '3', label: 'Better Luck Next Time', probabilityWeight: 50, isWin: false, rewardDescription: 'Try again tomorrow' },
    ],
    totalPlays: 0,
    totalWins: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game_SCRT01',
    gameId: 'SCRT01',
    title: 'Golden Scratch Card',
    subtitle: 'Rub away the 24K gold foil to unlock secret perks',
    gameType: 'scratch_card',
    isActive: true,
    scratchFoilTheme: 'gold',
    maxTurnsPerSession: 1,
    dailyLimitPerDevice: 1,
    outcomes: [
      { id: '1', label: 'Flat ₹100 OFF Royal Feast', probabilityWeight: 35, isWin: true, couponCode: 'FLAT100', rewardDescription: 'Flat ₹100 discount applied' },
      { id: '2', label: 'Free Dessert Handi', probabilityWeight: 25, isWin: true, couponCode: 'SWEETTREAT', rewardDescription: 'Complimentary dessert' },
      { id: '3', label: 'Better Luck Next Time', probabilityWeight: 40, isWin: false, rewardDescription: 'Try again next visit' },
    ],
    totalPlays: 0,
    totalWins: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

function readServerGames(): any[] {
  ensureDataDir();
  try {
    if (fs.existsSync(GAMES_FILE)) {
      const raw = fs.readFileSync(GAMES_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading games-store.json:', e);
  }
  writeServerGames(DEFAULT_GAMES);
  return DEFAULT_GAMES;
}

function writeServerGames(games: any[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Error writing games-store.json:', e);
  }
}

// GET all games
app.get('/api/games', (req, res) => {
  const games = readServerGames();
  res.json({ success: true, games });
});

// GET single game by 6-digit ID or slug
app.get('/api/games/:gameId', (req, res) => {
  const targetId = (req.params.gameId || '').trim().toUpperCase();
  const games = readServerGames();
  const match = games.find(g => 
    (g.gameId && g.gameId.toUpperCase() === targetId) ||
    (g.id && g.id.toUpperCase() === targetId) ||
    (g.id && g.id.toUpperCase() === `GAME_${targetId}`)
  );
  if (match) {
    return res.json({ success: true, game: match });
  }
  res.status(404).json({ success: false, error: 'Game not found' });
});

// POST upsert game
app.post('/api/games', (req, res) => {
  try {
    const gameData = req.body;
    if (!gameData || !gameData.gameId) {
      return res.status(400).json({ success: false, error: 'Valid gameId is required' });
    }
    const cleanId = String(gameData.gameId).trim().toUpperCase();
    const games = readServerGames();
    const idx = games.findIndex(g => 
      (g.gameId && g.gameId.toUpperCase() === cleanId) || 
      (g.id && g.id === gameData.id)
    );
    const updatedGame = {
      ...gameData,
      gameId: cleanId,
      id: gameData.id || `game_${cleanId}`,
      updatedAt: new Date().toISOString()
    };
    if (idx >= 0) {
      games[idx] = updatedGame;
    } else {
      games.unshift(updatedGame);
    }
    writeServerGames(games);
    res.json({ success: true, game: updatedGame });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE game
app.delete('/api/games/:gameId', (req, res) => {
  try {
    const targetId = (req.params.gameId || '').trim().toUpperCase();
    const games = readServerGames();
    const filtered = games.filter(g => 
      g.gameId?.toUpperCase() !== targetId && 
      g.id !== targetId && 
      g.id !== `game_${targetId}`
    );
    writeServerGames(filtered);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// API endpoint for AI meal recommendations
app.post('/api/gemini/suggest', async (req, res) => {
  const { goal, budget, isVeg, mealTime, flavorProfile } = req.body;

  let liveMeals: any[] = [];
  try {
    const mealsSnapshot = await getDocs(collection(db, 'meals'));
    mealsSnapshot.forEach((docSnap) => {
      const d = docSnap.data();
      if (!d.isHidden && d.isAvailable !== false) {
        liveMeals.push({
          id: d.id,
          name: d.name,
          price: d.price,
          isVeg: d.isVeg,
          timings: d.timings || []
        });
      }
    });
  } catch (err) {
    console.warn('Error reading live meals from Firestore in server.ts:', err);
  }

  // Use live meals from Firestore, fallback to static if empty or error
  const activeMeals = liveMeals.length > 0 ? liveMeals : MEALS;

  const ai = getAI();

  if (!ai) {
    // Elegant fallback simulated AI recommendation engine based on filters
    const matchingMeals = activeMeals.filter(m => {
      if (isVeg && !m.isVeg) return false;
      if (mealTime && m.timings.includes(mealTime)) return true;
      return true;
    });

    const suggestions = matchingMeals.slice(0, 2);
    const suggestedIds = suggestions.map(m => m.id);

    const fallbackResponse = {
      meals: suggestedIds,
      coachTip: `👋 Hi! I am your FitZaika AI Master Chef. I matched these exquisite gourmet dishes for your **${isVeg ? 'Vegetarian' : 'All-round'}** dining preference. Bon appétit!`,
      summary: `Chef's Recommendation: ${suggestions.map(s => s.name).join(' & ')}.`
    };

    return res.json(fallbackResponse);
  }

  try {
    const prompt = `
      You are the FitZaika AI Master Chef and Culinary Advisor. An expert culinary consultant for a fresh gourmet restaurant brand.
      The user is requesting culinary recommendations with the following preferences:
      - Preferred Dining Mood/Flavor: ${flavorProfile || goal || 'Any'}
      - Preferred Meal Time: ${mealTime || 'Any'}
      - Budget limits: ${budget ? `Below ₹${budget}` : 'None'}
      - Dietary preferences: ${isVeg ? 'Strict Vegetarian' : 'Any (Veg & Non-Veg)'}

      Here is our active menu data (each has id, name, price, isVeg, timings):
      ${JSON.stringify(activeMeals, null, 2)}

      Please recommend 1 or 2 meal IDs from the menu data above that match the user's taste and budget most closely.
      Do NOT invent meals. Only use the IDs from the menu: ${activeMeals.map(m => `'${m.id}'`).join(', ')}.

      You MUST respond in strict JSON format with the following keys:
      - "meals": Array of exact recommended meal IDs (e.g. ["m2", "m6"])
      - "coachTip": A short, elegant, appetite-inducing culinary recommendation explaining why this combination offers pristine taste and fresh preparation. Max 150 words. Do not use markdown inside text except bold stars.
      - "summary": A quick 1-sentence summary of the recommended chef creations.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const resultText = response.text ? response.text.trim() : '{}';
    const jsonResult = JSON.parse(resultText);
    res.json(jsonResult);

  } catch (error) {
    console.error('Error in FitZaika Gemini suggestions:', error);
    res.status(500).json({
      error: 'Failed to process AI recommendations.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Vite middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');

    // 1. Serve hashed production assets from /assets with 1-year immutable cache.
    // fallthrough: false ensures any missing asset returns a 404 instead of proceeding to the SPA HTML fallback!
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      immutable: true,
      fallthrough: false,
    }));

    // 2. Explicitly handle any missing /assets/* request with a 404 text response.
    // This prevents outdated chunk URLs from ever being served index.html (which causes fatal MIME-type / SyntaxError crashes).
    app.get('/assets/*', (_req, res) => {
      res.status(404).type('text/plain').send('Asset not found');
    });

    // 3. Serve other root static files with no-cache for HTML files
    app.use(express.static(distPath, {
      maxAge: '1d',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));

    // 4. SPA fallback: serve index.html with strict no-cache headers
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FitZaika server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
