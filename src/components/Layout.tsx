import React from 'react';
import Header from './Header';
import Footer from './Footer';
import BottomNavigation from './BottomNavigation';
import FloatingAddButton from './FloatingAddButton';
import { usePathname } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const pathname = usePathname();
  const showFloatingButton = pathname === '/';
  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <Header />
      <main className="flex-grow container mx-auto px-4 pt-20 pb-20">
        {children}
      </main>
      {showFloatingButton && <FloatingAddButton />}
      <BottomNavigation />
      <Footer />
    </div>
  );
};

export default Layout; 