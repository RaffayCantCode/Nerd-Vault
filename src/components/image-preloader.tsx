"use client";

import { useEffect } from "react";

interface ImagePreloaderProps {
  imageUrls: string[];
  priority?: boolean;
}

export function ImagePreloader({ imageUrls, priority = false }: ImagePreloaderProps) {
  useEffect(() => {
    if (typeof window === "undefined" || imageUrls.length === 0) return;
    const insertedLinks: HTMLLinkElement[] = [];

    const preloadImage = (url: string) => {
      if (!url) return;
      
      const link = document.createElement("link");
      link.rel = priority ? "preload" : "prefetch";
      link.as = "image";
      link.href = url;
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
      insertedLinks.push(link);
    };

    // Preload priority images immediately
    const urlsToPreload = priority ? imageUrls.slice(0, 8) : imageUrls.slice(0, 16);
    
    if (priority) {
      // Immediate preload for priority images
      urlsToPreload.forEach(preloadImage);
    } else {
      // Delayed preload for non-priority
      const timer = setTimeout(() => {
        urlsToPreload.forEach(preloadImage);
      }, 100);
      return () => {
        clearTimeout(timer);
        insertedLinks.forEach((link) => link.remove());
      };
    }

    return () => {
      insertedLinks.forEach((link) => link.remove());
    };
  }, [imageUrls, priority]);

  return null;
}
