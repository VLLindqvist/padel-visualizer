import Header from '@components/Header/Header';
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  header?: boolean;
}

const Layout = ({ children, header = true }: LayoutProps) => {
  return (
    <>
      {header && <Header />}
      <main className="layout">{children}</main>
    </>
  );
};

export default Layout;
