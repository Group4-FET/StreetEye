import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Map, Activity, BookOpen, Siren, LogOut } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';

const CircularNavMenu = ({ isOpen, onClose }) => {
  const menuRef = useRef(null);
  const auth = getAuth();

  useEffect(() => {
    if (menuRef.current && isOpen) {
      const button = document.querySelector('button[aria-label="Close Navigation Menu"], button[aria-label="Open Navigation Menu"]');
      if (button) {
        const rect = button.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const radius = Math.hypot(
          Math.max(centerX, window.innerWidth - centerX),
          Math.max(centerY, window.innerHeight - centerY)
        );

        menuRef.current.style.clipPath = `circle(0px at ${centerX}px ${centerY}px)`;
        menuRef.current.offsetHeight;
        menuRef.current.style.transition = 'clip-path 600ms cubic-bezier(0.4, 0, 0.2, 1)';
        menuRef.current.style.clipPath = `circle(${radius}px at ${centerX}px ${centerY}px)`;
      }
    } else if (menuRef.current && !isOpen) {
      const button = document.querySelector('button[aria-label="Close Navigation Menu"], button[aria-label="Open Navigation Menu"]');
      if (button) {
        const rect = button.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        menuRef.current.style.transition = 'clip-path 400ms cubic-bezier(0.4, 0, 0.2, 1)';
        menuRef.current.style.clipPath = `circle(0px at ${centerX}px ${centerY}px)`;
      }
    }

    return () => {
      if (menuRef.current) {
        menuRef.current.style.transition = '';
        menuRef.current.style.clipPath = '';
      }
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onClose();
    } catch (error) {
      console.error('Sign out error:', error.message);
    }
  };

  const menuItems = [
    { to: '/map', icon: Map, label: 'Map', color: 'blue', hoverColor: 'blue' },
    { to: '/monitor', icon: Activity, label: 'Monitor', color: 'emerald', hoverColor: 'emerald' },
    { to: '/learn', icon: BookOpen, label: 'Learn', color: 'amber', hoverColor: 'amber' },
    { to: '/report', icon: Siren, label: 'Report', color: 'purple', hoverColor: 'purple' }
  ];

  return (
    <div
      ref={menuRef}
      className={`fixed inset-0 z-40
        bg-gradient-to-br from-slate-950 via-gray-950 to-black
        flex items-center justify-center
        transition-opacity duration-500 ease-out
        ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 80%, rgba(30, 41, 59, 0.4) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(15, 23, 42, 0.4) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(17, 24, 39, 0.3) 0%, transparent 50%)
        `
      }}
    >
      {/* Background blur overlay */}
      <div className="absolute inset-0 backdrop-blur-sm" />
      
      <nav className="relative z-10 max-w-md mx-auto px-8">
        <div className="space-y-6">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`group flex items-center justify-center space-x-4 p-4
                           bg-white/5 backdrop-blur-md border border-white/10
                           rounded-2xl hover:bg-white/10 hover:border-white/20
                           transform transition-all duration-300 ease-out
                           hover:scale-105 hover:shadow-2xl
                           opacity-0 translate-y-8 ${isOpen ? 'animate-fadeInUp' : ''}
                           text-white hover:text-${item.hoverColor}-400`}
                style={{
                  animationDelay: `${100 + index * 100}ms`,
                  animationFillMode: 'forwards'
                }}
              >
                <Icon className={`h-7 w-7 text-${item.color}-400 group-hover:text-white transition-colors duration-300`} />
                <span className="text-2xl font-semibold tracking-wide">
                  {item.label}
                </span>
              </Link>
            );
          })}
          
          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className={`group flex items-center justify-center space-x-4 p-4 w-full
                       bg-white/5 backdrop-blur-md border border-white/10
                       rounded-2xl hover:bg-red-500/10 hover:border-red-400/30
                       transform transition-all duration-300 ease-out
                       hover:scale-105 hover:shadow-2xl
                       opacity-0 translate-y-8 ${isOpen ? 'animate-fadeInUp' : ''}
                       text-white hover:text-red-400`}
            style={{
              animationDelay: `${100 + menuItems.length * 100}ms`,
              animationFillMode: 'forwards'
            }}
          >
            <LogOut className="h-7 w-7 text-red-400 group-hover:text-white transition-colors duration-300" />
            <span className="text-2xl font-semibold tracking-wide">
              Sign Out
            </span>
          </button>
        </div>
      </nav>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(2rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
};


export default CircularNavMenu;