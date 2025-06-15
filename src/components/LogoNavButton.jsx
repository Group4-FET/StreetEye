import React from 'react';
import TrafficLightLogo from '../assets/images/traffic_light_logo.png';

const LogoNavButton = ({ onClick, isOpen }) => {
  return (
    <button
      onClick={onClick}
      className={`fixed top-6 right-6 z-50 group
                 w-16 h-16 rounded-full
                 bg-slate-900/95 backdrop-blur-md border border-slate-700/50
                 shadow-2xl hover:shadow-slate-900/50
                 transform transition-all duration-300 ease-out
                 hover:scale-105 active:scale-95
                 ${isOpen ? 'rotate-45 bg-slate-800/95 border-slate-600/50' : 'hover:bg-slate-800/95 hover:border-slate-600/50'}
                 before:absolute before:inset-0 before:rounded-full
                 before:bg-gradient-to-br before:from-slate-700/20 before:to-slate-800/20
                 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300`}
      aria-label={isOpen ? "Close Navigation Menu" : "Open Navigation Menu"}
    >
      <div className="relative z-10 flex items-center justify-center w-full h-full">
        {isOpen ? (
          <div className="w-6 h-6 relative">
            <div className="absolute top-1/2 left-1/2 w-4 h-0.5 bg-slate-300 transform -translate-x-1/2 -translate-y-1/2 rotate-45" />
            <div className="absolute top-1/2 left-1/2 w-4 h-0.5 bg-slate-300 transform -translate-x-1/2 -translate-y-1/2 -rotate-45" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-slate-800/50 backdrop-blur-sm border border-slate-600/30 
                          flex items-center justify-center
                          group-hover:bg-slate-700/50 group-hover:border-slate-500/40
                          transition-all duration-300 ease-out">
            <img
              src={TrafficLightLogo}
              alt="Traffic Insight Logo"
              className="w-8 h-8 rounded-full object-cover
                         transform transition-transform duration-300 ease-out
                         group-hover:scale-110"
              onError={(e) => { 
                e.target.onerror = null; 
                e.target.src = "https://placehold.co/32x32/3B82F6/FFFFFF?text=TI"; 
              }}
            />
          </div>
        )}
      </div>
    </button>
  );
};
export default LogoNavButton;
