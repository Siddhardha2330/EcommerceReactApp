import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HeroSlider.css';

const heroSlides = [
  {
    image: '/image4.png',
    category: 'Men Clothing',
    description: "Explore the latest trends in men's fashion.",
  },
  {
    image: '/image5.png',
    category: 'Watches',
    description: 'Discover premium watches for every occasion.',
  },
  {
    image: '/image6.png',
    category: 'Home Appliances',
    description: 'Upgrade your home with modern appliances.',
  },
];

const HeroSlider = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const timeoutRef = useRef(null);

  // Auto-slide every 5 seconds
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setCurrent((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearTimeout(timeoutRef.current);
  }, [current]);

  const goToShop = (category) => {
    navigate(`/customer-dashboard/shop?category=${encodeURIComponent(category)}`);
  };

  // Fix: ensure buttons are always clickable
  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrent((current - 1 + heroSlides.length) % heroSlides.length);
  };
  const handleNext = (e) => {
    e.stopPropagation();
    setCurrent((current + 1) % heroSlides.length);
  };

  return (
    <div className="hero-slider" style={{ pointerEvents: 'auto', zIndex: 2 }}>
      <button className="hero-arrow left" style={{ pointerEvents: 'auto', zIndex: 10 }} onClick={handlePrev} aria-label="Previous slide">
        <span className="hero-arrow-icon">&#8249;</span>
      </button>
      <button className="hero-arrow right" style={{ pointerEvents: 'auto', zIndex: 10 }} onClick={handleNext} aria-label="Next slide">
        <span className="hero-arrow-icon">&#8250;</span>
      </button>
      <div className="hero-slider-track" style={{ transform: `translateX(-${current * 100}vw)` }}>
        {heroSlides.map((slide, idx) => (
          <div className="hero-slide" key={slide.category} style={{ backgroundImage: `url(${slide.image})` }}>
            <div className="hero-bottom-overlay">
              <div className="hero-bottom-content">
                <div className="hero-title-row">
                  <h2 className="hero-title">{slide.category}</h2>
                  <button className="hero-btn" onClick={() => goToShop(slide.category)}>
                    Shop Now
                  </button>
                </div>
                <div className="hero-desc">{slide.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeroSlider; 