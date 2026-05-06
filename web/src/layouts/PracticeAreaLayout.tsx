import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PracticeAreaSidebar from '@/components/PracticeAreaSidebar';

const PracticeAreaLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-20">
        <div className="flex gap-6">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden fixed top-24 left-4 z-50 bg-primary text-primary-foreground p-2 rounded-lg shadow-md"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Sidebar */}
          <div className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0 fixed lg:relative top-24 lg:top-0 left-0 z-40
            w-72 lg:w-80 h-screen lg:h-auto bg-card lg:bg-transparent
            transition-transform duration-300 ease-in-out
            lg:transition-none overflow-y-auto
          `}>
            <PracticeAreaSidebar onItemClick={() => setSidebarOpen(false)} />
          </div>

          {/* Overlay for mobile */}
          {sidebarOpen && (
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-30 top-24"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default PracticeAreaLayout;