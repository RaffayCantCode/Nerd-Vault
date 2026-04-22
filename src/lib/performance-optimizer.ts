/**
 * Performance Optimizer for Low-End Devices
 * Automatically detects device capabilities and applies performance optimizations
 */

export interface PerformanceMetrics {
  memory: number;
  cores: number;
  connection: string;
  deviceMemory: number;
  hardwareConcurrency: number;
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private isLowEndDevice: boolean = false;
  private performanceMode: boolean = false;
  private injectedFlags = new Set<string>();

  private constructor() {
    this.detectPerformanceCapabilities();
    this.applyOptimizations();
  }

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  private detectPerformanceCapabilities(): void {
    const metrics = this.getPerformanceMetrics();
    
    // Low-end device detection criteria
    const lowEndIndicators = [
      metrics.memory <= 4, // Less than 4GB RAM
      metrics.cores <= 2,   // Less than 2 CPU cores
      metrics.deviceMemory <= 4, // Device memory less than 4GB
      metrics.hardwareConcurrency <= 2, // Hardware concurrency less than 2
      metrics.connection === 'slow-2g' || metrics.connection === '2g' // Slow connection
    ];

    this.isLowEndDevice = lowEndIndicators.filter(Boolean).length >= 2;
    this.performanceMode = this.isLowEndDevice || this.shouldForcePerformanceMode();
  }

  private getPerformanceMetrics(): PerformanceMetrics {
    // Get device memory if available
    const deviceMemory = (navigator as any).deviceMemory || 8; // Default to 8GB
    const hardwareConcurrency = navigator.hardwareConcurrency || 4; // Default to 4 cores
    
    // Estimate available memory (rough approximation)
    const memory = deviceMemory;
    const cores = hardwareConcurrency;
    
    // Get connection type if available
    const connection = (navigator as any).connection?.effectiveType || '4g';

    return {
      memory,
      cores,
      connection,
      deviceMemory,
      hardwareConcurrency
    };
  }

  private shouldForcePerformanceMode(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('windows phone');
  }

  private applyOptimizations(): void {
    if (this.performanceMode) {
      this.enablePerformanceMode();
    }

    // Listen for performance changes
    this.setupPerformanceMonitoring();
  }

  private enablePerformanceMode(): void {
    // Add performance mode class to body
    document.body.classList.add('performance-mode');
    
    // Reduce image quality automatically
    this.optimizeImageLoading();
    
    // Disable heavy animations
    this.disableHeavyAnimations();
    
    // Optimize scrolling
    this.optimizeScrolling();
    
  }

  private optimizeImageLoading(): void {
    // Add loading="lazy" to all images that don't have it
    const images = document.querySelectorAll('img:not([loading])');
    images.forEach(img => {
      img.setAttribute('loading', 'lazy');
    });

    // Reduce image quality for low-end devices
    this.injectStyleOnce("performance-images", `
      .performance-mode img {
        image-rendering: optimizeSpeed;
        image-rendering: -webkit-optimize-contrast;
      }
    `);
  }

  private disableHeavyAnimations(): void {
    this.injectStyleOnce("performance-motion", `
      .performance-mode * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
      
      .performance-mode .catalog-card:hover {
        transform: none !important;
      }
      
      .performance-mode .filter-chip:hover,
      .performance-mode .action-button:hover {
        transform: none !important;
      }
    `);
  }

  private optimizeScrolling(): void {
    this.injectStyleOnce("performance-scroll", `
      .performance-mode .workspace {
        scroll-behavior: auto;
        -webkit-overflow-scrolling: touch;
      }
    `);
  }

  private injectStyleOnce(flag: string, css: string): void {
    if (this.injectedFlags.has(flag)) {
      return;
    }

    const style = document.createElement('style');
    style.setAttribute("data-performance-style", flag);
    style.textContent = css;
    document.head.appendChild(style);
    this.injectedFlags.add(flag);
  }

  private setupPerformanceMonitoring(): void {
    // Monitor performance and adjust if needed
    if ('performance' in window) {
      // Monitor long tasks
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.duration > 50) { // Tasks taking longer than 50ms
            this.handlePerformanceIssue(entry.duration);
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['longtask'] });
      } catch {
        // PerformanceObserver not supported
      }
    }
  }

  private handlePerformanceIssue(duration: number): void {
    if (!this.performanceMode && duration > 100) {
      this.enablePerformanceMode();
      this.performanceMode = true;
    }
  }

  public getPerformanceInfo(): {
    isLowEndDevice: boolean;
    performanceMode: boolean;
    metrics: PerformanceMetrics;
  } {
    return {
      isLowEndDevice: this.isLowEndDevice,
      performanceMode: this.performanceMode,
      metrics: this.getPerformanceMetrics()
    };
  }

  public forcePerformanceMode(enabled: boolean): void {
    if (enabled && !this.performanceMode) {
      this.enablePerformanceMode();
      this.performanceMode = true;
    } else if (!enabled && this.performanceMode) {
      document.body.classList.remove('performance-mode');
      this.performanceMode = false;
    }
  }
}

// Auto-initialize performance optimizer
export function initializePerformanceOptimizer(): PerformanceOptimizer {
  return PerformanceOptimizer.getInstance();
}

// Hook for React components
export function usePerformanceOptimizer() {
  return PerformanceOptimizer.getInstance();
}
