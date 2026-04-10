import { Outlet } from 'react-router-dom';
import { TopNavBar } from '../components/TopNavBar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <TopNavBar />
      <main className="pt-28 pb-20 px-4 md:px-8 max-w-screen-2xl mx-auto min-h-screen">
        <Outlet />
      </main>
      <div className="fixed top-0 right-0 -z-10 w-1/2 h-1/2 bg-gradient-to-bl from-primary/5 to-transparent blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 -z-10 w-1/3 h-1/3 bg-gradient-to-tr from-secondary/5 to-transparent blur-3xl pointer-events-none" />
    </div>
  );
}
