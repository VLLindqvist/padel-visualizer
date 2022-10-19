import Header from '@components/Header/Header';
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <>
      <Header />
      <main className="layout">{children}</main>
    </>
  );
};

export default Layout;
