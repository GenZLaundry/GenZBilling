# LaundryDone - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Open the Website
Simply open `index.html` in your web browser. No build process required!

### Step 2: Configure Form Submission (Optional)
1. Sign up at [Formspree.io](https://formspree.io)
2. Get your form endpoint
3. Open `booking.html`
4. Update line 55:
   ```html
   <form id="booking-form" class="booking-form" method="POST" data-action="https://formspree.io/f/YOUR_FORM_ID">
   ```

### Step 3: Update Contact Information
Replace placeholders in all HTML files:
- `+91 XXXXXXXXXX` → Your phone number
- `info@laundrydone.com` → Your email
- WhatsApp links → Your WhatsApp number

### Step 4: Test Language Toggle
Click the language toggle (हिंदी / English) in the top-right corner to test bilingual functionality.

### Step 5: Customize Content
Edit JSON files in `data/` folder:
- `content-en.json` - English content
- `content-hi.json` - Hindi content

## 📁 Project Structure

```
LaundryDone/
├── index.html          # Homepage
├── services.html       # Services page
├── pricing.html        # Pricing page
├── how-it-works.html   # How it works page
├── booking.html        # Booking form
├── faq.html           # FAQ page
├── about.html         # About & Contact page
├── css/
│   └── styles.css     # Main stylesheet
├── js/
│   ├── i18n.js        # Internationalization
│   ├── language-toggle.js  # Language switching
│   └── forms.js       # Form handling
├── data/
│   ├── content-en.json  # English content
│   └── content-hi.json  # Hindi content
└── assets/
    └── images/        # Images folder
```

## 🌐 Language Switching

The website supports real-time language switching between English and Hindi:
- Click the language toggle in the header
- All content updates instantly
- Language preference is saved in browser
- No page reload required

## 📝 Key Features

✅ **Bilingual Support** - Full English/Hindi localization  
✅ **Responsive Design** - Works on all devices  
✅ **Accessible** - WCAG 2.1 AA compliant  
✅ **SEO Optimized** - Semantic HTML, meta tags  
✅ **Fast Loading** - Optimized for performance  
✅ **Form Validation** - Client-side validation  
✅ **No Backend Required** - Static site, works anywhere  

## 🎨 Customization

### Colors
Edit CSS variables in `css/styles.css`:
```css
:root {
  --color-primary: #C75B39;  /* Terracotta */
  --color-secondary: #3A4A7C; /* Indigo */
  /* ... */
}
```

### Content
All text content is in JSON files for easy editing:
- `data/content-en.json` - English
- `data/content-hi.json` - Hindi

### Images
Add images to `assets/images/` and update HTML references.

## 🚢 Deployment

### Option 1: Netlify (Easiest)
1. Drag and drop the folder to [Netlify Drop](https://app.netlify.com/drop)
2. Done! Your site is live

### Option 2: GitHub Pages
1. Push to GitHub
2. Enable Pages in repository settings
3. Site is live at `username.github.io/repository-name`

### Option 3: Traditional Hosting
1. Upload all files via FTP
2. Point domain to hosting
3. Done!

## 📚 Documentation

- **README.md** - General information
- **SETUP.md** - Detailed setup instructions
- **STYLE_GUIDE.md** - Design system documentation
- **QUICK_START.md** - This file

## 🆘 Troubleshooting

### Language Toggle Not Working
- Check browser console for errors
- Ensure `data/` folder files are accessible
- Verify JavaScript files are loaded

### Forms Not Submitting
- Configure Formspree endpoint (see Step 2)
- Check browser console for errors
- Verify form action attribute

### Styling Issues
- Clear browser cache
- Check CSS file path
- Verify font files are loading

## 📞 Support

For detailed setup instructions, see **SETUP.md**

For design system information, see **STYLE_GUIDE.md**


