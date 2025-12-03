// src/components/layout/app-loader.tsx
"use client";
import { useState, useEffect } from 'react';
import { SplashScreen } from '@/components/shared/splash-screen';

export function AppLoader({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  // This effect ensures that the splash screen is only shown on initial load.
  // If we were to rely purely on a timeout in SplashScreen, re-renders of AppLoader
  // could potentially re-trigger the splash.
  useEffect(() => {
    // The actual hiding is handled by SplashScreen's onFinished callback.
    // This effect is more about setting the initial state.
    // If needed, you could add logic here to persist "isLoading: false"
    // in localStorage/sessionStorage to prevent splash on subsequent soft navigations
    // within the same session, but for a simple app open splash, this is fine.
  }, []);

  return (
    <>
      {isLoading && <SplashScreen onFinished={() => setIsLoading(false)} />}
      {/* 
        The `key` prop on the children container can help ensure that when `isLoading`
        transitions from true to false, React treats the content as "new"
        which can be useful for triggering entry animations on the main content,
        though not strictly necessary for just hiding the splash screen.
        Using `{!isLoading && children}` is the simplest way.
      */}
      {!isLoading && children}
    </>
  );
}
