"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { PageLoadingOverlay } from "./page-loading-overlay";

interface EnhancedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
  loadingMessage?: string;
  onClick?: () => void;
}

export function EnhancedLink({ 
  href, 
  children, 
  className, 
  prefetch = true,
  loadingMessage = "Loading...",
  onClick 
}: EnhancedLinkProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (onClick) {
      onClick();
    }

    // Show loading state
    setIsLoading(true);

    // Navigate after a brief delay to show loading state
    setTimeout(() => {
      router.push(href);
    }, 300);
  };

  return (
    <>
      <Link 
        href={href}
        className={className}
        prefetch={prefetch}
        onClick={handleClick}
      >
        {children}
      </Link>
      <PageLoadingOverlay isLoading={isLoading} message={loadingMessage} />
    </>
  );
}
