# Google Sign-In Setup Guide

Follow these steps to configure Google Sign-In for your Allergy Free Dog website.

## 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

## 2. Enable Google Identity Services

1. In Google Cloud Console, go to **APIs & Services > Library**
2. Search for "Google Identity Services API"
3. Click on it and press **Enable**

## 3. Create OAuth 2.0 Client ID

1. Go to **APIs & Services > Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Select **Web application** as Application type
4. Give it a name (e.g., "Allergy Free Dog Web Client")
5. Add your domain to **Authorized JavaScript origins**:
   - For development: `http://localhost` and `http://localhost:8080`
   - For production: `https://yourdomain.com`
6. Click **Create**
7. **Copy the Client ID** (looks like: `1234567890-abc123def456.apps.googleusercontent.com`)

## 4. Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** user type
3. Fill out the required fields:
   - **App name**: Allergy Free Dog
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Add your domain to **Authorized domains**
5. Save and continue through the scopes (default scopes are fine)
6. Add test users if needed

## 5. Update Firebase Configuration

1. Edit `config/firebase.config.js` directly
2. Fill in your Firebase project credentials
3. **Important**: Add your OAuth Client ID as `clientId`:

```javascript
window.__firebaseConfig = {
  apiKey: "your-firebase-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id",
  clientId: "1234567890-abc123def456.apps.googleusercontent.com" // ← This is your OAuth Client ID
};
```

## 6. Configure Firebase Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication > Sign-in method**
4. Enable **Google** provider
5. Add your OAuth Client ID from step 3
6. Add your domain to **Authorized domains**

## 7. Test the Implementation

1. Open your website
2. Click the "Log In" button
3. You should see a Google Sign-In button
4. Click it to test the sign-in flow

## Troubleshooting

### Common Issues:

1. **"Google Sign-In not configured" error**:
   - Check that `clientId` is properly set in your config
   - Ensure the Client ID format is correct (ends with `.apps.googleusercontent.com`)

2. **"Sign-in failed" error**:
   - Check that your domain is added to Authorized JavaScript origins
   - Verify Firebase Authentication is enabled with Google provider
   - Check browser console for detailed error messages

3. **Button not appearing**:
   - Ensure Google Identity Services script is loaded
   - Check that the button container exists in the DOM
   - Verify the Client ID is valid

### Required URLs for Authorized JavaScript Origins:
- Development: `http://localhost`, `http://localhost:8080`
- Production: `https://yourdomain.com`

### Required URLs for Firebase Authorized Domains:
- Development: `localhost`
- Production: `yourdomain.com`

## Security Notes

- Never commit your `config/firebase.config.js` file to version control
- The `.gitignore` file is already configured to ignore this file
- Keep your OAuth Client ID secure and don't share it publicly
- This file contains sensitive credentials and should be kept private
