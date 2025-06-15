import React from 'react';
import { Outlet } from 'react-router-dom';
import LogoNavButton from '../components/LogoNavButton';
import CircularNavMenu from '../components/CircularNavMenu';

const MainLayout = () => {
  const [isNavMenuOpen, setIsNavMenuOpen] = React.useState(false);

  const toggleNavMenu = () => setIsNavMenuOpen(!isNavMenuOpen);

  return (
    <div className="min-h-screen flex flex-col font-inter bg-slate-900 text-slate-100">
      <LogoNavButton onClick={toggleNavMenu} />
      <CircularNavMenu isOpen={isNavMenuOpen} onClose={toggleNavMenu} />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;