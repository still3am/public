import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PasswordInput from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import AppleIcon from "@/components/AppleIcon";
import FacebookIcon from "@/components/FacebookIcon";
import MicrosoftIcon from "@/components/MicrosoftIcon";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Register() {
  const providers=["apple","google","facebook","microsoft"];

  const [accepted,setAccepted]=useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [resending,setResending]=useState(false),[resendWait,setResendWait]=useState(0);
  useEffect(()=>{if(!resendWait)return;const timer=setTimeout(()=>setResendWait(value=>Math.max(0,value-1)),1000);return()=>clearTimeout(timer);},[resendWait]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(loading)return;
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if(!accepted){setError('Accept the terms and confirm you are at least 13 to continue.');return;}
    setLoading(true);
    try {
      await base44.auth.register({ email:email.trim(), password });
      setEmail(email.trim());setResendWait(30);setShowOtp(true);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if(loading||resending||otpCode.length!==6)return;
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      // Handle both possible return shapes: { access_token: "..." } or the token string directly
      const token = result?.access_token || (typeof result === "string" ? result : null);
      if (token) {
        base44.auth.setToken(token);
      }
      if(!token) await base44.auth.loginViaEmailPassword(email,password);
      window.location.href = safeReturnTo();
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if(resending||loading||resendWait)return;
    setResending(true);setError("");
    try {
      await base44.auth.resendOtp(email);setResendWait(30);
      toast({
        title: "Code sent",
        description: "Check your email for the new code.",
      });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }finally{setResending(false);}
  };

  const handleGoogle = () => {
    if(!accepted){setError('Accept the terms and confirm you are at least 13 to continue.');return;}
    base44.auth.loginWithProvider("google", safeReturnTo());
  };

  const handleApple = () => {
    if(!accepted){setError('Accept the terms and confirm you are at least 13 to continue.');return;}
    base44.auth.loginWithProvider("apple", safeReturnTo());
  };

  const handleFacebook = () => {
    if(!accepted){setError('Accept the terms and confirm you are at least 13 to continue.');return;}
    base44.auth.loginWithProvider("facebook", safeReturnTo());
  };

  const handleMicrosoft = () => {
    if(!accepted){setError('Accept the terms and confirm you are at least 13 to continue.');return;}
    base44.auth.loginWithProvider("microsoft", safeReturnTo());
  };

  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title="Verify your email"
        subtitle={`We sent a code to ${email}`}
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP
            aria-label="Email verification code" inputMode="numeric" onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();handleVerify();}}}
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="w-full h-12 font-medium"
          onClick={handleVerify}
          disabled={loading || resending || otpCode.length < 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button disabled={resending||loading||resendWait>0} onClick={handleResend} className="text-primary font-medium hover:underline disabled:opacity-50">
            {resending?"Sending…":resendWait?`Resend in ${resendWait}s`:"Resend"}
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Sign up to get started"
      footer={
        <>
          Already have an account?{" "}
          <Link to={`/login?returnTo=${encodeURIComponent(safeReturnTo())}`} className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <div className="space-y-3 mb-6">
        {providers.includes('apple')&&(
        <Button
          variant="outline"
          className="w-full h-12 text-sm font-medium"
          onClick={handleApple}
        >
          <AppleIcon className="w-5 h-5 mr-2" />
          Continue with Apple
        </Button>
        )}
        {providers.includes('google')&&(
        <Button
          variant="outline"
          className="w-full h-12 text-sm font-medium"
          onClick={handleGoogle}
        >
          <GoogleIcon className="w-5 h-5 mr-2" />
          Continue with Google
        </Button>
        )}
        {providers.includes('facebook')&&(
        <Button
          variant="outline"
          className="w-full h-12 text-sm font-medium"
          onClick={handleFacebook}
        >
          <FacebookIcon className="w-5 h-5 mr-2" />
          Continue with Facebook
        </Button>
        )}
        {providers.includes('microsoft')&&(
        <Button
          variant="outline"
          className="w-full h-12 text-sm font-medium"
          onClick={handleMicrosoft}
        >
          <MicrosoftIcon className="w-5 h-5 mr-2" />
          Continue with Microsoft
        </Button>
        )}
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <label className="flex items-start gap-2 text-xs mb-4"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> <span>I am at least 13 and accept the <Link className="underline" to="/terms">terms and community standards</Link>. Read the <Link className="underline" to="/privacy">privacy policy</Link>.</span></label>
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
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <PasswordInput
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <PasswordInput
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}