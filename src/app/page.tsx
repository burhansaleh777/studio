
"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext"; // Added import
import { LanguageToggle } from "@/components/layout/language-toggle"; // Added import

export default function WelcomePage() {
  const { t } = useLanguage(); // Added useLanguage hook

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <div className="w-full max-w-md text-center">
        
        <Card className="shadow-xl mt-8 relative"> {/* Added relative positioning */}
          <div className="absolute top-4 right-4 z-10"> {/* Positioned LanguageToggle */}
            <LanguageToggle />
          </div>
          <CardHeader>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {t('welcome.title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('welcome.subtitle')}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <Image 
              src="https://i.ibb.co/xtfGKkLL/BIMA-HUB-18.png" 
              alt={t('welcome.promoImageAlt')}
              width={400} 
              height={200} 
              className="rounded-lg object-cover mx-auto"
              data-ai-hint="promotional image"
            />
            <div className="space-y-4">
              <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="lg">
                <Link href="/login">{t('welcome.loginButton')}</Link>
              </Button>
              <Button asChild variant="outline" className="w-full" size="lg">
                <Link href="/register">{t('welcome.registerButton')}</Link>
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-center text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Bima Hub. {t('welcome.rightsReserved')}</p>
            <p>{t('welcome.tagline')}</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

// Minimal Card components for this page as it's outside the main app structure
// In a real app, these might be imported from ui/card if not already there
const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`rounded-xl border bg-card text-card-foreground shadow-sm ${className || ''}`}
    {...props}
  />
);

const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col space-y-1.5 px-6 pt-16 pb-6 ${className || ''}`} {...props} />
);

const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 pt-0 ${className || ''}`} {...props} />
);

const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex items-center p-6 pt-0 ${className || ''}`} {...props} />
);

