# API Keys Setup Guide

This project requires several API keys to function properly. For security reasons, these keys are not included in the repository.

## Required API Keys

### 1. Gemini API Key
- File: `.env.local`
- Variable: `GEMINI_API_KEY`
- Get your key from: [Google AI Studio](https://aistudio.google.com/)

### 2. Text Model API Key
- File: `.env.local`
- Variables: 
  - `VITE_TEXT_MODEL_API_KEY`
  - `VITE_GEMINI_API_KEY`
- Replace `YOUR_API_KEY_HERE` with your actual API key

### 3. VolcEngine API Keys (for test files)
- Files: `test-py/test-jimeng.py`
- Variables:
  - `access_key` - Replace `YOUR_ACCESS_KEY_HERE`
  - `secret_key` - Replace `YOUR_SECRET_KEY_HERE`

### 4. Other Test Files
- `test-py/test-text.py` - Replace `YOUR_API_KEY_HERE`
- `test-py/test-image-jimeng.py` - Replace `YOUR_API_KEY_HERE`
- `test-py/image-image-jimeng.py` - Replace `YOUR_API_KEY_HERE`

## Setup Instructions

1. Copy `.env.local.example` to `.env.local` (if available)
2. Replace all placeholder values with your actual API keys
3. Never commit these files with real API keys
4. The `.gitignore` file is configured to exclude `.env.local` files

## Security Notes

- Never commit real API keys to version control
- Use environment variables for production deployments
- Regularly rotate your API keys
- Keep your `.env.local` file secure and never share it