# LaundryDone - Setup Guide

## Quick Start

1. **Clone or download** this repository
2. **Open** `index.html` in a web browser, or use a local server:
   ```bash
   npm run dev
   ```
   Or use any static file server like Python's http.server:
   ```bash
   python -m http.server 8000
   ```

## Form Setup

### Option 1: Formspree (Recommended)

1. Sign up at [Formspree.io](https://formspree.io)
2. Create a new form
3. Copy your form endpoint (e.g., `https://formspree.io/f/YOUR_FORM_ID`)
4. Update `booking.html`:
   ```html
   <form id="booking-form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
   ```

### Option 2: Email (Using Formspree)

Formspree can forward form submissions to your email address automatically.

### Option 3: Google Sheets

1. Use a service like [Google Apps Script](https://script.google.com) or [Zapier](https://zapier.com)
2. Create a webhook endpoint
3. Update the form action in `booking.html`

### Option 4: Custom Backend

1. Create your own form handler endpoint
2. Update the form action in `booking.html`
3. Ensure CORS is properly configured

## Contact Information

Update the following in all HTML files:

1. **Phone Number**: Replace `+91 XXXXXXXXXX` with your actual phone number
2. **WhatsApp**: Update the WhatsApp link with your number
3. **Email**: Replace `info@laundrydone.com` with your email
4. **Address**: Update service area information

### Files to Update:
- `index.html`
- `services.html`
- `pricing.html`
- `how-it-works.html`
- `booking.html`
- `faq.html`
- `about.html`

## Google Maps Integration

1. Go to [Google Maps Embed API](https://developers.google.com/maps/documentation/embed/get-started)
2. Get your API key (optional, for custom styling)
3. Update the iframe `src` in `about.html` with your location coordinates

## Content Customization

### Update Text Content

All text content is stored in JSON files:
- `data/content-en.json` - English content
- `data/content-hi.json` - Hindi content

Edit these files to customize:
- Service descriptions
- Pricing information
- Testimonials
- FAQ questions and answers
- Contact information

### Add Images

1. Add images to `assets/images/`
2. Update HTML to reference your images
3. Ensure images are optimized for web (WebP format recommended)

## Language Customization

### Adding New Languages

1. Create a new JSON file: `data/content-XX.json` (replace XX with language code)
2. Copy structure from `content-en.json`
3. Translate all content
4. Update `js/i18n.js` to include the new language

### Modifying Translations

Edit the JSON files directly. The i18n system will automatically load and apply changes.

## Analytics Integration

### Google Analytics

Add to `<head>` section of all HTML files:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Google Tag Manager

Add to `<head>` section:

```html
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
```

Add to `<body>` tag:

```html
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
```

## SEO Optimization

### Meta Tags

Each page has:
- Title tag
- Meta description
- Meta keywords

Update these in each HTML file's `<head>` section.

### Open Graph Tags

Add to `<head>` for social media sharing:

```html
<!-- Open Graph -->
<meta property="og:title" content="LaundryDone - Premium Laundry Service">
<meta property="og:description" content="Professional laundry and dry cleaning service in Jaipur">
<meta property="og:image" content="https://yourdomain.com/assets/images/og-image.jpg">
<meta property="og:url" content="https://yourdomain.com">
<meta property="og:type" content="website">
```

### Structured Data

Add JSON-LD structured data for better search engine understanding:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "LaundryDone",
  "image": "https://yourdomain.com/logo.png",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Jaipur",
    "addressRegion": "Rajasthan",
    "addressCountry": "IN"
  },
  "telephone": "+91XXXXXXXXXX",
  "priceRange": "₹₹"
}
</script>
```

## Deployment

### Static Hosting Options

1. **Netlify**: Drag and drop the folder or connect to Git
2. **Vercel**: Connect to Git repository
3. **GitHub Pages**: Push to GitHub and enable Pages
4. **AWS S3**: Upload files to S3 bucket with static website hosting
5. **Traditional Hosting**: Upload files via FTP

### Custom Domain

1. Purchase a domain name
2. Configure DNS settings
3. Update your hosting provider's domain settings

## Performance Optimization

1. **Image Optimization**: Use WebP format, compress images
2. **Minify CSS/JS**: Use tools like Terser, UglifyJS, or CSSNano
3. **Enable Compression**: Configure gzip/brotli on server
4. **CDN**: Use a CDN for faster asset delivery
5. **Caching**: Set appropriate cache headers

## Browser Testing

Test the website on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility Checklist

- [ ] All images have alt text
- [ ] Forms have proper labels
- [ ] Color contrast meets WCAG 2.1 AA standards
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Skip to content link works
- [ ] Language toggle is accessible

## Support

For issues or questions, please refer to:
- README.md - General information
- STYLE_GUIDE.md - Design system documentation
- Code comments in JavaScript files


