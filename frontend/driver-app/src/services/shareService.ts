/**
 * Share Service
 * For Web Share API
 */

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

class ShareService {
  /**
   * Checks if Web Share API is supported
   */
  isSupported(): boolean {
    return 'share' in navigator;
  }

  /**
   * Shares data using Web Share API
   */
  async share(data: ShareData): Promise<boolean> {
    if (!this.isSupported()) {
      return this.fallbackShare(data);
    }

    try {
      await navigator.share(data);
      return true;
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.name === 'AbortError') {
        return false;
      }
      return this.fallbackShare(data);
    }
  }

  /**
   * Fallback share method (copy to clipboard)
   */
  private async fallbackShare(data: ShareData): Promise<boolean> {
    const text = [data.title, data.text, data.url].filter(Boolean).join('\n');
    
    if (text && 'clipboard' in navigator) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        return false;
      }
    }

    return false;
  }

  /**
   * Shares URL
   */
  async shareUrl(url: string, title?: string): Promise<boolean> {
    return this.share({ url, title });
  }

  /**
   * Shares text
   */
  async shareText(text: string, title?: string): Promise<boolean> {
    return this.share({ text, title });
  }
}

// Singleton instance
export const shareService = new ShareService();

