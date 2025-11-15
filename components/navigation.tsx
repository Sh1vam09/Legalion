"use client";
import Link from "next/link";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";
import { Scale } from "lucide-react";

export function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 p-4 flex justify-between items-center transition-all duration-300 z-50 bg-background border-b">
      <Link href="/" className="flex items-center gap-2">
        <Scale className="w-6 h-6 text-primary" />
        <span className="text-xl font-bold">Legalion</span>
      </Link>
      <div className="hidden md:flex gap-4 items-center">
        <Link href="/upload">
          <Button variant="ghost">Upload</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="ghost">Dashboard</Button>
        </Link>
        {/* "Results" link removed from here */}
      </div>
      <div className="flex gap-4 items-center">
        <ThemeToggle />
        <Link href="/signin">
          <Button variant="ghost">Sign In</Button>
        </Link>
        <Link href="/signup">
          <Button>Get Started</Button>
        </Link>
      </div>
    </nav>
  );
}
