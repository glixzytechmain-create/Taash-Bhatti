/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

dotenv.config();

const app = express();
app.use(express.json());

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
const TWO_FACTOR_API_KEY = process.env.TWO_FACTOR_API_KEY || '5ad02ca2-b076-11f1-90d7-0200cd936042';

// API endpoint to send OTP via 2Factor High-Speed Indian Gateway (WhatsApp / Voice Call / SMS)
app.post('/api/otp/send', async (req, res) => {
  try {
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
    
    // Voice vs SMS/WhatsApp verify endpoint
    let url = `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY/${encodeURIComponent(sessionId)}/${encodeURIComponent(cleanOtp)}`;
    if (channel === 'voice') {
      url = `https://2factor.in/API/V1/${apiKey}/VOICE/VERIFY/${encodeURIComponent(sessionId)}/${encodeURIComponent(cleanOtp)}`;
    }

    let response = await fetch(url, { method: 'GET' });
    let data = (await response.json()) as { Status?: string; Details?: string };

    // If voice verify didn't match or failed, try SMS verify just in case
    if (channel === 'voice' && data.Status !== 'Success') {
      const smsVerifyUrl = `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY/${encodeURIComponent(sessionId)}/${encodeURIComponent(cleanOtp)}`;
      const smsRes = await fetch(smsVerifyUrl, { method: 'GET' });
      const smsData = (await smsRes.json()) as { Status?: string; Details?: string };
      if (smsData.Status === 'Success' && smsData.Details === 'OTP Matched') {
        data = smsData;
      }
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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FitZaika server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
