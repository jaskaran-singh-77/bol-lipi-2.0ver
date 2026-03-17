<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1TrtXubLddd2XFCwX4vd9KbEPrUVQhwma

## Features

- **Voice Input Mode**: Speak naturally to fill forms using AI-powered speech recognition
- **Document Upload Mode**: Upload images or PDFs to automatically extract and fill form data
- **Bilingual Support**: Switch between Hindi and English
- **Dark Mode**: Full dark theme support
- **Smart AI Extraction**: Uses Google Gemini to understand context and extract structured data
- **Conversation History**: Track your interactions with the AI assistant
- **Submission History**: View and manage past form submissions

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `VITE_GEMINI_API_KEY` in `.env.local`
3. If you want Firebase auth/history, also set:
   `VITE_FIREBASE_API_KEY`
   `VITE_FIREBASE_AUTH_DOMAIN`
   `VITE_FIREBASE_PROJECT_ID`
   `VITE_FIREBASE_STORAGE_BUCKET`
   `VITE_FIREBASE_MESSAGING_SENDER_ID`
   `VITE_FIREBASE_APP_ID`
   `VITE_FIREBASE_MEASUREMENT_ID`
4. Run the app:
   `npm run dev`

## Vercel

Add the same `VITE_*` variables in Vercel Project Settings -> Environment Variables.
If the Firebase variables are missing, the app will now fall back to local-only mode instead of crashing on load.
