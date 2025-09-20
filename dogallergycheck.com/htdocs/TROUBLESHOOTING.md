# Google Sign-In Troubleshooting Guide

## Common Issues and Solutions

### 1. Blank Popup Window Appears and Disappears

**Symptoms:**
- Clicking "Sign in with Google" opens a blank popup
- Popup closes immediately
- Error: "Sign-in failed. Please try again."

**Possible Causes & Solutions:**

#### A. Domain Not Authorized
**Check:** Open browser console (F12) and look for error messages
- If you see `auth/unauthorized-domain`, your domain isn't authorized in Firebase

**Solution:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication > Settings > Authorized domains**
4. Add your domain:
   - For local development: `localhost`
   - For production: `yourdomain.com`

#### B. Google Sign-In Not Enabled
**Check:** Look for `auth/operation-not-allowed` error in console

**Solution:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication > Sign-in method**
4. Click on **Google** provider
5. Toggle **Enable** to ON
6. Save

#### C. Popup Blocked by Browser
**Check:** Look for `auth/popup-blocked` error in console

**Solution:**
- Allow popups for your domain in browser settings
- The app will automatically fallback to redirect-based authentication

### 2. Testing Steps

1. **Open Browser Console (F12)**
2. **Click the "Log In" button**
3. **Click "Sign in with Google"**
4. **Check console for error messages**

### 3. Debug Information

The app now logs detailed error information. Look for:
- `Sign-in error details:` - Full error object
- `Error code:` - Specific Firebase error code
- `Error message:` - Human-readable error message

### 4. Firebase Configuration Check

Make sure your `config/firebase.config.js` has the correct values:

```javascript
window.__firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com", // ← Must match your Firebase project
  projectId: "your-project-id", // ← Must match your Firebase project
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 5. Quick Fix Checklist

- [ ] Google provider is enabled in Firebase Console
- [ ] Your domain is in Firebase Authorized domains
- [ ] Firebase config has correct project details
- [ ] Browser allows popups for your domain
- [ ] Check browser console for specific error messages

### 6. Still Having Issues?

1. **Check the browser console** for detailed error messages
2. **Verify Firebase project settings** match your config file
3. **Test on different browsers** to rule out browser-specific issues
4. **Try incognito/private mode** to rule out extension conflicts

### 7. Alternative Testing

If popups continue to fail, the app will automatically try redirect-based authentication, which should work even with popup blockers.

