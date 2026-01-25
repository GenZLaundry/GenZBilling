/**
 * Modern Testimonials Carousel
 * Creates an interactive, animated testimonials section
 */

class TestimonialsCarousel {
  constructor() {
    this.currentIndex = 0;
    this.testimonials = [];
    this.autoPlayInterval = null;
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    this.loadTestimonials();
    this.createCarousel();
    this.startAutoPlay();
  }

  loadTestimonials() {
    // Default testimonials (will be replaced by i18n content when available)
    this.testimonials = [
      {
        text: "Excellent service! My clothes come back perfectly clean and pressed. The pickup and delivery is so convenient.",
        name: "Priya Sharma",
        location: "Ratanada, Jodhpur",
        rating: 5,
        image: "👩‍💼"
      },
      {
        text: "Best laundry service in Jodhpur. They handle my delicate sarees with such care. Highly recommended!",
        name: "Rajesh Kumar",
        location: "Shastri Nagar, Jodhpur", 
        rating: 5,
        image: "👨‍💼"
      },
      {
        text: "Professional service at reasonable prices. They even removed a stubborn stain that I thought was permanent!",
        name: "Anita Joshi",
        location: "Paota, Jodhpur",
        rating: 5,
        image: "👩"
      },
      {
        text: "Quick turnaround time and excellent quality. The staff is very courteous and professional.",
        name: "Vikram Singh",
        location: "Chopasni Road, Jodhpur",
        rating: 5,
        image: "👨"
      },
      {
        text: "I love their eco-friendly approach. My family has been using their services for over a year now.",
        name: "Meera Agarwal",
        location: "Sardarpura, Jodhpur",
        rating: 5,
        image: "👩