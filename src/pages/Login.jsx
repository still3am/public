import { safeReturnTo } from "@/lib/authReturnTo";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PasswordInput from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import AppleIcon from "@/components/AppleIcon";
import FacebookIcon from "@/components/FacebookIcon";
import MicrosoftIcon from "@/components/MicrosoftIcon";

export default function Login() {
  const providers = ["apple", "google", "facebook", "microsoft"];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email.trim(), password);
      window.location.href = safeReturnTo();
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", safeReturnTo());
  };

  const handleApple = () => {
    base44.auth.loginWithProvider("apple", safeReturnTo());
  };

  const handleFacebook = () => {
    base44.auth.loginWithProvider("facebook", safeReturnTo());
  };

  const handleMicrosoft = () => {
    base44.auth.loginWithProvider("microsoft", safeReturnTo());
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
      <>
          Don't have an account?{" "}
          <Link to={`/register?returnTo=${encodeURIComponent(safeReturnTo())}`} className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </>
      }>
      
      

      
      <div className="space-y-3 mb-6">
        {providers.includes('apple') &&
        <Button
          variant="outline"
          className="w-full h-12 text-sm font-medium"
          disabled={loading} onClick={handleApple}>
          
          <AppleIcon className="w-5 h-5 mr-2" />
          Continue with Apple
        </Button>
        }
        {providers.includes('google') &&
        <Button
          variant="outline"
          className="w-full h-12 text-sm font-medium"
          disabled={loading} onClick={handleGoogle}>
          
          <GoogleIcon className="w-5 h-5 mr-2" />
          Continue with Google
        </Button>
        }
        {providers.includes('facebook') &&
        <Button
          variant="outline"
          className="w-full h-12 text-sm font-medium"
          disabled={loading} onClick={handleFacebook}>
          
          <FacebookIcon className="w-5 h-5 mr-2" />
          Continue with Facebook
        </Button>
        }
        {providers.includes('microsoft') &&
        <Button
          variant="outline"
          className="w-full h-12 text-sm font-medium"
          disabled={loading} onClick={handleMicrosoft}>
          
          <MicrosoftIcon className="w-5 h-5 mr-2" />
          Continue with Microsoft
        </Button>
        }
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error &&
      <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      }

      <nav aria-label="Privacy and support" className="flex flex-wrap items-center justify-center gap-1.5 text-center text-xs text-muted-foreground mb-4 w-full"><Link to="/privacy" className="underline underline-offset-2">Privacy</Link><span aria-hidden="true">·</span><Link to="/terms" className="underline underline-offset-2">Terms</Link><span aria-hidden="true">·</span><Link to="/support" className="underline underline-offset-2">Support</Link></nav>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email" inputMode="email" autoCapitalize="none" spellCheck={false}
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required />
            
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to={`/forgot-password?returnTo=${encodeURIComponent(safeReturnTo())}`} className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <PasswordInput
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required />
            
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ?
          <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </> :

          "Log in"
          }
        </Button>
      </form>
    </AuthLayout>);

}