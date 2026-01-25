# LaundryDone - Style Guide

## Design System

### Colors

#### Primary Colors
- **Terracotta (Primary)**: `#C75B39`
  - Dark: `#A0482A`
  - Light: `#E07A5F`
  - Usage: CTAs, primary actions, accents

#### Secondary Colors
- **Indigo (Secondary)**: `#3A4A7C`
  - Dark: `#2A3659`
  - Light: `#4F5F8F`
  - Usage: Secondary buttons, highlights

#### Neutral Colors
- **Background**: `#FDFBF8` (Warm off-white)
- **Background Alt**: `#FFFFFF`
- **Text Primary**: `#2C2C2C`
- **Text Light**: `#666666`
- **Text Lighter**: `#999999`
- **Border**: `#E5E5E5`
- **Border Light**: `#F0F0F0`

#### Semantic Colors
- **Success**: `#4CAF50`
- **Error**: `#F44336`
- **Warning**: `#FF9800`
- **Info**: `#2196F3`

### Typography

#### Font Families
- **Primary**: 'Noto Sans', 'Poppins', system fonts
- **Hindi/Devanagari**: 'Noto Sans Devanagari', 'Hind', 'Noto Sans'

#### Font Sizes
- **XS**: 0.75rem (12px)
- **SM**: 0.875rem (14px)
- **Base**: 1rem (16px)
- **LG**: 1.125rem (18px)
- **XL**: 1.25rem (20px)
- **2XL**: 1.5rem (24px)
- **3XL**: 1.875rem (30px)
- **4XL**: 2.25rem (36px)
- **5XL**: 3rem (48px)

#### Font Weights
- **Regular**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

### Spacing

- **XS**: 0.25rem (4px)
- **SM**: 0.5rem (8px)
- **MD**: 1rem (16px)
- **LG**: 1.5rem (24px)
- **XL**: 2rem (32px)
- **2XL**: 3rem (48px)
- **3XL**: 4rem (64px)

### Layout

- **Max Width**: 1200px
- **Border Radius**: 8px (standard), 12px (large)
- **Shadows**:
  - Small: `0 1px 3px rgba(0, 0, 0, 0.1)`
  - Medium: `0 4px 6px rgba(0, 0, 0, 0.1)`
  - Large: `0 10px 25px rgba(0, 0, 0, 0.1)`

### Components

#### Buttons
- **Primary**: Terracotta background, white text
- **Secondary**: Indigo background, white text
- **Outline**: Transparent background, terracotta border and text

#### Cards
- White background
- Rounded corners (12px)
- Medium shadow
- Hover: Lift effect with larger shadow

#### Forms
- Input border: 2px solid border color
- Focus: Primary color border with subtle shadow
- Error: Red border and error message below

### Responsive Breakpoints

- **Mobile**: < 480px
- **Tablet**: 481px - 768px
- **Desktop**: > 768px

### Accessibility

- All interactive elements have focus states
- Color contrast meets WCAG 2.1 AA standards
- Semantic HTML structure
- ARIA labels where needed
- Keyboard navigation support

### Icons

- Use emoji icons for visual interest (🧺, 📞, 🚚, etc.)
- Ensure icons have text alternatives
- Consider replacing with SVG icons for production

### Images

- Use high-resolution images
- Optimize for web (WebP format recommended)
- Include alt text for all images
- Lazy load non-critical images

## Usage Guidelines

1. **Consistency**: Use design tokens from CSS variables
2. **Spacing**: Follow the spacing scale for consistent layouts
3. **Typography**: Use semantic HTML and appropriate heading hierarchy
4. **Colors**: Use primary color sparingly for CTAs and key highlights
5. **Accessibility**: Always test with screen readers and keyboard navigation


