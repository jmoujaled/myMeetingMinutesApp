# Logout Redirect Implementation

This document explains how to implement the automatic redirect from the external login page back to the homepage after a successful logout.

## Overview

When a user logs out from the application, they are redirected to `http://localhost:3030/login?message=signed_out&redirect_to=<homepage_url>`. After 10 seconds on this external login page, they should be automatically redirected back to the homepage.

## Implementation Options

### Option 1: JavaScript Integration (Recommended)

Add the following script to your external login page at `http://localhost:3030/login`:

```html
<script src="path/to/logout-redirect.js"></script>
```

Or copy the script content from `src/utils/logout-redirect.js` directly into your login page.

### Option 2: React Component (If using React)

If your external login page is built with React/Next.js, you can use the `LogoutRedirect` component:

```jsx
import LogoutRedirect from './components/LogoutRedirect';

export default function LoginPage() {
  return (
    <div>
      <LogoutRedirect />
      {/* Your login form */}
    </div>
  );
}
```

### Option 3: Server-Side Implementation

If you prefer server-side handling, you can implement the redirect logic in your backend:

```javascript
// Example for Express.js
app.get('/login', (req, res) => {
  const { message, redirect_to } = req.query;
  
  if (message === 'signed_out' && redirect_to) {
    // Render login page with auto-redirect script
    res.render('login', {
      showRedirectMessage: true,
      redirectUrl: redirect_to,
      countdown: 10
    });
  } else {
    // Normal login page
    res.render('login');
  }
});
```

## Features

The logout redirect implementation includes:

- ✅ **10-second countdown** before automatic redirect
- ✅ **Visual notification** with success message
- ✅ **Click to redirect immediately** functionality
- ✅ **Hover effects** for better UX
- ✅ **Responsive design** that works on all devices
- ✅ **Error handling** for failed logouts

## URL Parameters

The logout redirect expects these URL parameters:

- `message=signed_out` - Indicates successful logout
- `redirect_to=<encoded_url>` - The homepage URL to redirect to
- `error=signout_failed` - (Optional) Indicates logout failure

## Example URLs

**Successful logout:**
```
http://localhost:3030/login?message=signed_out&redirect_to=http%3A//localhost%3A3000
```

**Failed logout:**
```
http://localhost:3030/login?error=signout_failed&redirect_to=http%3A//localhost%3A3000
```

## Testing

You can test the implementation by:

1. Opening `public/external-login-example.html` in your browser
2. Adding URL parameters: `?message=signed_out&redirect_to=http://localhost:3000`
3. Observing the countdown and redirect behavior

## Customization

You can customize the appearance and behavior by modifying:

- **Countdown duration**: Change the initial `countdown` value
- **Message styling**: Update the CSS in the `messageDiv.style.cssText`
- **Redirect behavior**: Modify the redirect logic in the countdown interval
- **User interaction**: Add additional click handlers or keyboard shortcuts

## Security Considerations

- Always validate the `redirect_to` parameter to prevent open redirects
- Only allow redirects to trusted domains
- Consider implementing CSRF protection for the logout flow

## Browser Compatibility

The implementation works in all modern browsers and includes:

- ES5-compatible JavaScript (no transpilation needed)
- Standard DOM APIs
- CSS that works in IE11+