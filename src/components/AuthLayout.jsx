import React from "react";
import Logo from "@/components/Logo";
import BrandGradient from "@/components/BrandGradient";
import "./auth-brand.css";

/** @param {any} props */
export default function AuthLayout({ icon: Icon, title, subtitle, footer, children, brandMotion = false }) {
  return (
    <div className={`auth-layout min-h-screen flex items-center justify-center bg-background px-4 py-10 sm:py-16 ${brandMotion ? "auth-brand-motion" : ""}`}>
      {brandMotion && <><BrandGradient className="auth-brand-gradient" /><div className="auth-brand-shade" aria-hidden="true" /></>}
      <div className="auth-content w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <Logo width="184px" className="max-w-[60%]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="auth-card bg-card rounded-3xl border border-border/70 p-5 sm:p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}