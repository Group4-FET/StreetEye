// src/components/LogoNavButton.jsx
import React from 'react';
import TrafficLightLogo from '../assets/images/traffic_light_logo.png'; // Make sure this path is correct

const LogoNavButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      // Enhanced classes for a more dynamic and "dope" button
      className="fixed top-4 right-4 z-50 p-3  rounded-full
                 shadow-xl hover:shadow-2xl transform transition-all duration-300 ease-in-out
                 active:scale-90" // Added 'group' for potential child scaling on hover
      aria-label="Open Navigation Menu"
    >
      <img
        src={TrafficLightLogo}
        alt="Traffic Insight Logo"
        // Increased size and added subtle scaling on hover/focus
        className="w-14 h-14 md:w-18 md:h-18 rounded-full object-cover
                   transform transition-transform duration-300 ease-in-out
                   group-hover:scale-110 group-focus:scale-110"
        // Fallback in case image fails to load (e.g., if path is incorrect)
        onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/72x72/4A5568/CBD5E0?text=Logo"; }}
      />
    </button>
  );
};

export default LogoNavButton;
