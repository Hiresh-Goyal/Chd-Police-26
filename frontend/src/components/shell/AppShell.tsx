import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const AppShell: React.FC = () => {
  return (
    <div className="min-h-screen bg-ds-bg text-ds-ink flex flex-col font-sans relative overflow-hidden">
      {/* Background animations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-ds-blue-soft rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob pointer-events-none z-0"></div>
      <div className="absolute bottom-[20%] right-[-5%] w-[30rem] h-[30rem] bg-ds-red/5 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 pointer-events-none z-0"></div>

      {/* Global Header */}
      <div className="relative z-10">
        <Header />
      </div>

      {/* Global Sidebar */}
      <div className="relative z-10">
        <Sidebar />
      </div>

      {/* Main Page Workspace Content */}
      <main className="fixed left-60 right-0 top-16 bottom-0 overflow-y-auto bg-transparent custom-scrollbar z-10">
        <div className="min-h-full p-5 lg:p-6 pb-12 max-w-[1700px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
