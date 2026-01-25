/**
 * Form Handling Module
 * Handles form validation and submission via WhatsApp
 */

class FormHandler {
  constructor() {
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupForms());
    } else {
      this.setupForms();
    }
  }

  setupForms() {
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
      this.setupBookingForm(bookingForm);
    }
  }

  setupBookingForm(form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleBookingSubmit(form);
    });

    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        this.validateField(input);
      });

      input.addEventListener('input', () => {
        const errorElement = input.parentElement.querySelector('.form-error');
        if (errorElement) {
          errorElement.classList.remove('show');
        }
      });
    });
  }

  validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    let isValid = true;
    let errorMessage = '';

    const errorElement = field.parentElement.querySelector('.form-error');
    if (errorElement) {
      errorElement.classList.remove('show');
    }

    if (field.hasAttribute('required') && !value) {
      isValid = false;
      if (typeof i18n !== 'undefined') {
        errorMessage = i18n.t(`booking.validation.${fieldName}Required`);
      } else {
        errorMessage = 'This field is required';
      }
    }

    if (fieldName === 'phone' && value) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(value)) {
        isValid = false;
        if (typeof i18n !== 'undefined') {
          errorMessage = i18n.t('booking.validation.phoneInvalid');
        } else {
          errorMessage = 'Please enter a valid 10-digit phone number';
        }
      }
    }

    if (fieldName === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        isValid = false;
        errorMessage = 'Please enter a valid email address';
      }
    }

    if (!isValid) {
      this.showFieldError(field, errorMessage);
    }

    return isValid;
  }

  showFieldError(field, message) {
    const existingError = field.parentElement.querySelector('.form-error');
    if (existingError) {
      existingError.remove();
    }

    const errorElement = document.createElement('div');
    errorElement.className = 'form-error show';
    errorElement.textContent = message;
    field.parentElement.appendChild(errorElement);
    field.style.borderColor = 'var(--color-error)';
  }

  validateForm(form) {
    const fields = form.querySelectorAll('[required]');
    let isValid = true;

    fields.forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });

    return isValid;
  }

  // Helper: Clear all form errors (for reset)
  clearFormErrors(form) {
    form.querySelectorAll('.form-error').forEach(el => el.remove());
    form.querySelectorAll('input, select, textarea').forEach(input => {
      input.style.borderColor = '';
    });
  }

  handleBookingSubmit(form) {
    if (!this.validateForm(form)) {
      return;
    }

    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    if (typeof i18n !== 'undefined') {
      submitButton.textContent = i18n.t('booking.form.submitting');
    } else {
      submitButton.textContent = 'Sending...';
    }

    // WhatsApp configuration
    const WHATSAPP_NUMBER = '918233853727'; // Your number with country code (no +)
    
    // Build pre-filled message
  // Build pre-filled message with WhatsApp formatting
let message = '*New Laundry Booking Request*\n\n';
if (data.name) message += `*Name:* ${data.name}\n`;
if (data.phone) message += `*Phone:* ${data.phone}\n`;
if (data.email) message += `*Email:* ${data.email}\n`;
if (data.service) message += `*Service:* ${data.service}\n`;
if (data.address) message += `*Address:* ${data.address}\n`;
if (data.message) message += `*Message:* ${data.message}\n`;

    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    
    try {
      // Open in new tab (user must send manually)
      window.open(whatsappUrl, '_blank');
      
      // Show success message
      setTimeout(() => {
        this.showSuccessMessage(form, data);
        form.reset();
        this.clearFormErrors(form); // Clear visual errors
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }, 800);
    } catch (error) {
      console.error('WhatsApp error:', error);
      this.showErrorMessage(form);
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }

  showSuccessMessage(form, data) {
    form.style.display = 'none';
    const successDiv = document.createElement('div');
    successDiv.className = 'form-success';
    
    const currentLang = typeof i18n !== 'undefined' ? i18n.getLanguage() : 'en';
    const content = typeof i18n !== 'undefined' ? i18n.content[currentLang]?.booking?.success : null;

    if (content) {
      successDiv.innerHTML = `
        <h3>${content.title}</h3>
        <p>${content.message}</p>
        <div style="margin-top: 2rem; text-align: left;">
          <h4>${content.nextSteps}</h4>
          <ul style="margin-top: 1rem; padding-left: 1.5rem;">
            <li>${content.step1}</li>
            <li>${content.step2}</li>
            <li>${content.step3}</li>
          </ul>
          <p style="margin-top: 1.5rem; font-weight: 600;">
            ${content.contact} 
            <a href="tel:+918233853727" class="contact-link">+91 8233853727</a>
            or 
            <a href="https://wa.me/918233853727" class="contact-link" target="_blank">Chat on WhatsApp</a>
          </p>
        </div>
      `;
    } else {
      successDiv.innerHTML = `
        <h3>Booking Request Sent!</h3>
        <p>Thank you! We've received your request and will contact you shortly via WhatsApp.</p>
        <p style="margin-top: 1rem;">
          <a href="https://wa.me/918233853727" class="btn-whatsapp" target="_blank">
            Chat with us on WhatsApp
          </a>
        </p>
      `;
    }

    form.parentElement.insertBefore(successDiv, form);
    successDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  showErrorMessage(form) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'form-error show';
    errorDiv.style.cssText = `
      margin-bottom: 1rem;
      padding: 1rem;
      background: rgba(244, 67, 54, 0.1);
      border: 2px solid var(--color-error);
      border-radius: var(--border-radius);
    `;

    const currentLang = typeof i18n !== 'undefined' ? i18n.getLanguage() : 'en';
    const content = typeof i18n !== 'undefined' ? i18n.content[currentLang]?.booking?.error : null;

    if (content) {
      errorDiv.innerHTML = `<strong>${content.title}</strong><br>${content.message}`;
    } else {
      errorDiv.innerHTML = `
        <strong>Submission Failed</strong><br>
        Please try again or contact us directly:<br>
        <a href="tel:+918233853727">+91 8233853727</a> or 
        <a href="https://wa.me/918233853727" target="_blank">WhatsApp</a>
      `;
    }

    form.insertBefore(errorDiv, form.firstChild);
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Auto-remove error after 10 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) errorDiv.remove();
    }, 10000);
  }
}

// Initialize form handler
new FormHandler();

// Floating buttons on scroll
window.addEventListener('scroll', function() {
  const buttons = document.querySelector('.floating-buttons');
  if (buttons) {
    buttons.classList.toggle('show', window.scrollY > 300);
  }
});
