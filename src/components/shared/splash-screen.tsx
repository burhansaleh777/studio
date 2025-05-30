
// src/components/shared/splash-screen.tsx
"use client";
import { BimaHubLogo } from "@/components/shared/bima-hub-logo";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext"; // Added import

interface SplashScreenProps {
  onFinished: () => void;
}

export function SplashScreen({ onFinished }: SplashScreenProps) {
  const { t } = useLanguage(); // Added useLanguage hook

  useEffect(() => {
    const timer = setTimeout(() => {
      onFinished();
    }, 2500); // Splash screen duration: 2.5 seconds

    return () => clearTimeout(timer);
  }, [onFinished]);

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ease-out">
      <div className="animate-pulse">
        <BimaHubLogo className="h-20 w-auto md:h-24" />
      </div>
      <p className="mt-6 text-lg font-medium text-primary animate-fadeIn">
        {t('splashScreen.loading')}
      </p>
    </div>
  );
}
