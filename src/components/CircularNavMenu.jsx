import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Map, Activity, BookOpen, Siren, LogOut } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';

const CircularNavMenu = ({ isOpen, onClose }) => {
  const menuRef = useRef(null);
  const auth = getAuth();

  useEffect(() => {
    if (menuRef.current && isOpen) {
      const button = document.querySelector('button[aria-label="Open Navigation Menu"]');
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
        menuRef.current.style.transition = 'clip-path 500ms ease-in-out';
        menuRef.current.style.clipPath = `circle(${radius}px at ${centerX}px ${centerY}px)`;
      }
    } else if (menuRef.current && !isOpen) {
      const button = document.querySelector('button[aria-label="Open Navigation Menu"]');
      if (button) {
        const rect = button.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        menuRef.current.style.transition = 'clip-path 500ms ease-in-out';
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

  return (
    <div
      ref={menuRef}
      className={`fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-40
        flex items-center justify-center transition-opacity duration-500 ease-in-out
        ${isOpen ? 'opacity-100' : 'opacity-0'}`}
    >
      <nav className="text-center space-y-8">
        <Link
          to="/map"
          onClick={onClose}
          className="block text-4xl font-extrabold text-white hover:text-blue-400 transition-colors duration-200 group flex items-center justify-center"
        >
          <Map className="h-10 w-10 mr-4 text-blue-400 group-hover:text-white transition-colors" /> Map
        </Link>
        <Link
          to="/monitor"
          onClick={onClose}
          className="block text-4xl font-extrabold text-white hover:text-blue-400 transition-colors duration-200 group flex items-center justify-center"
        >
          <Activity className="h-10 w-10 mr-4 text-yellow-400 group-hover:text-white transition-colors" /> Monitor
        </Link>
        <Link
          to="/learn"
          onClick={onClose}
          className="block text-4xl font-extrabold text-white hover:text-blue-400 transition-colors duration-200 group flex items-center justify-center"
        >
          <BookOpen className="h-10 w-10 mr-4 text-orange-400 group-hover:text-white transition-colors" /> Learn
        </Link>
        <Link
          to="/report"
          onClick={onClose}
          className="block text-4xl font-extrabold text-white hover:text-purple-400 transition-colors duration-200 group flex items-center justify-center"
        >
          <Siren className="h-10 w-10 mr-4 text-purple-400 group-hover:text-white transition-colors" /> Report
        </Link>
        <button
          onClick={handleSignOut}
          className="block text-4xl font-extrabold text-white hover:text-red-400 transition-colors duration-200 group flex items-center justify-center"
        >
          <LogOut className="h-10 w-10 mr-4 text-red-400 group-hover:text-white transition-colors" /> Sign Out
        </button>
      </nav>
    </div>
  );
};

export default CircularNavMenu;