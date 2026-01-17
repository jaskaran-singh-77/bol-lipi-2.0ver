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
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
