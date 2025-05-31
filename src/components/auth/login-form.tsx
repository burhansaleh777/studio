
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation"; 

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import React from "react";
import { useLanguage } from "@/contexts/LanguageContext"; // Added import

const loginSchema = z.object({
  emailOrPhone: z.string().min(1, "Email or phone number is required"), // Zod messages not translated in this step
  password: z.string().min(6, "Password must be at least 6 characters"), // Zod messages not translated in this step
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage(); // Added import
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrPhone: "",
      password: "",
    },
  });

  function onSubmit(data: LoginFormValues) {
    // Simulate API call
    console.log(data);
    toast({
      title: t('auth.toast.loginSubmittedTitle'),
      description: t('auth.toast.loginSubmittedDescription'),
    });
    // Redirect to dashboard on successful login (simulated)
    router.push("/dashboard");
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">{t('auth.loginToBimaHub')}</CardTitle>
        <CardDescription>{t('auth.accessDashboard')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="emailOrPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.emailOrPhoneLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('auth.emailOrPhonePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.passwordLabel')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder={t('auth.passwordPlaceholder')}
                        {...field} 
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {t('auth.loginButton')}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex-col items-center space-y-2">
        <Link href="#" className="text-sm text-primary hover:underline">
            {t('auth.forgotPasswordLink')}
        </Link>
        <p className="text-sm text-muted-foreground">
          {t('auth.noAccountPrompt')}{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            {t('auth.registerHereLink')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
