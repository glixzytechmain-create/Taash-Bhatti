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

const PORT = 3000;

// Parse the firebase configuration from root
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'firebase-applet-config.json'), 'utf-8')
);

const fbApp = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId
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
