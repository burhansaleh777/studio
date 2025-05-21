// src/components/shared/splash-screen.tsx
"use client";
import { BimaSmartLogo } from "@/components/shared/bima-smart-logo";
import { useEffect } from "react";

interface SplashScreenProps {
  onFinished: () => void;
}

export function SplashScreen({ onFinished }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinished();
    }, 2500); // Splash screen duration: 2.5 seconds

    return () => clearTimeout(timer);
  }, [onFinished]);

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ease-out">
      <div className="animate-pulse">
        <BimaSmartLogo className="h-20 w-auto md:h-24" />
      </div>
      <p className="mt-6 text-lg font-medium text-primary animate-fadeIn">
        Loading...
      </p>
    </div>
  );
}
