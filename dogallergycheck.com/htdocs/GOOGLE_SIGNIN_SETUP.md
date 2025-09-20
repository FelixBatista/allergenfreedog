# Google Sign-In Setup Guide

Follow these steps to configure Google Sign-In for your Allergy Free Dog website using Firebase Authentication.

## 1. Configure Firebase Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication > Sign-in method**
4. Enable **Google** provider
5. Add your domain to **Authorized domains**:
   - For development: `localhost`
   - For production: `yourdomain.com`
6. Save the configuration

## 2. Update Firebase Configuration (Optional)

Your `config/firebase.config.js` file should already contain your Firebase project credentials. If you need to update it, make sure it includes:

```javascript
window.__firebaseConfig = {
  apiKey: "your-firebase-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

## 3. Test the Implementation

1. Open your website
2. Click the "Log In" button
3. You should see a Google Sign-In button
4. Click it to test the sign-in flow

## Troubleshooting

### Common Issues:

1. **"Sign-in failed" error**:
   - Check that your domain is added to Firebase Authorized domains
   - Verify Firebase Authentication is enabled with Google provider
   - Check browser console for detailed error messages

2. **Button not appearing**:
   - Check that the button container exists in the DOM
   - Verify Firebase is properly initialized

### Required URLs for Firebase Authorized Domains:
- Development: `localhost`
- Production: `yourdomain.com`

## Security Notes

- Never commit your `config/firebase.config.js` file to version control
- The `.gitignore` file is already configured to ignore this file
- This file contains sensitive credentials and should be kept private

## Benefits of This Approach

- **Simpler setup**: No need for separate OAuth Client ID from Google Cloud Console
- **Firebase managed**: All authentication is handled by Firebase
- **Automatic updates**: Firebase handles Google API changes automatically
- **Better integration**: Seamless integration with Firestore and other Firebase services
