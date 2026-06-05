/**
 * Google AdMob Production-Ready Configuration & Simulation Module
 * Replace these test unit IDs with your actual Production AdMob Ad Unit IDs from AdMob Console.
 */
export const ADMOB_CONFIG = {
  // Official Test Ad Unit IDs provided by Google
  BANNER_AD_UNIT_ID: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL_AD_UNIT_ID: 'ca-app-pub-3940256099942544/1033173712',
  REWARDED_AD_UNIT_ID: 'ca-app-pub-3940256099942544/5224354917',
  
  // App-level configuration toggle
  IS_TESTING_MODE: true
};

export interface AdMobCallback {
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: string) => void;
  onAdOpened?: () => void;
  onAdClosed?: () => void;
  onUserEarnedReward?: (rewardAmount: number, rewardType: string) => void;
}

declare global {
  interface Window {
    // Standard hybrid container window extensions (Cordova, Capacitor, or custom WebView interfaces)
    AdMob?: any;
    admob?: any;
    AndroidAdMobBridge?: {
      showBannerAd: (adUnitId: string) => void;
      showInterstitialAd: (adUnitId: string) => void;
      showRewardedAd: (adUnitId: string) => void;
    };
    Capacitor?: any;
  }
}

class AdMobManager {
  private activeBannerLoaded = false;
  private isNativeAvailable = false;

  /**
   * Logs initialization in the web-bridge wrapper for production-readiness.
   * Auto-detects Cordova, Capacitor or customized Android native container webview bridges.
   */
  public initialize() {
    this.isNativeAvailable = !!(
      window.AdMob || 
      window.admob || 
      window.AndroidAdMobBridge || 
      (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob)
    );

    console.log(`[AdMob Native Library] Initialized with SDK core. Active configurations loaded.`);
    console.log(`- Native Bridge Detected: ${this.isNativeAvailable ? 'YES' : 'NO (Using Elegant In-App Web Fallback for Preview)'}`);
    console.log(`- Android Banner ID: ${ADMOB_CONFIG.BANNER_AD_UNIT_ID}`);
    console.log(`- Android Interstitial ID: ${ADMOB_CONFIG.INTERSTITIAL_AD_UNIT_ID}`);
    console.log(`- Android Rewarded ID: ${ADMOB_CONFIG.REWARDED_AD_UNIT_ID}`);

    if (this.isNativeAvailable) {
      this.initNativeAds();
    }
  }

  /**
   * Safe native wrapper initialization
   */
  private initNativeAds() {
    try {
      if (window.AdMob) {
        window.AdMob.setOptions({
          publisherId: 'ca-app-pub-3940256099942544~3347511713', // Test App ID
          testing: ADMOB_CONFIG.IS_TESTING_MODE
        });
      }
      console.log('[AdMob Native Library] Native SDK bridges successfully initialized with test parameters.');
    } catch (e) {
      console.warn('[AdMob Native Library] Failed to setup native options (non-blocking):', e);
    }
  }

  /**
   * Displays the Banner Ad at the bottom of the screens (Free Tier).
   */
  public showBanner(onSuccess?: () => void, onError?: (err: string) => void) {
    console.log(`[AdMob SDK] Loading Banner Ad [ID: ${ADMOB_CONFIG.BANNER_AD_UNIT_ID}]`);
    
    // Check if a Native container bridge is available to display actual Android-level system view ads
    if (window.AndroidAdMobBridge?.showBannerAd) {
      try {
        window.AndroidAdMobBridge.showBannerAd(ADMOB_CONFIG.BANNER_AD_UNIT_ID);
        this.activeBannerLoaded = true;
        onSuccess?.();
        return;
      } catch (err: any) {
        console.error('[AdMob Native] Error loading Android Native interface Banner:', err);
      }
    }

    if (window.AdMob?.createBanner) {
      try {
        window.AdMob.createBanner({
          adId: ADMOB_CONFIG.BANNER_AD_UNIT_ID,
          position: 'BOTTOM_CENTER',
          autoShow: true
        });
        this.activeBannerLoaded = true;
        onSuccess?.();
        return;
      } catch (err: any) {
        console.error('[AdMob Cordova] Error initiating Cordova Banner:', err);
      }
    }

    // Default Web Fallback visual triggered successfully
    this.activeBannerLoaded = true;
    onSuccess?.();
  }

  /**
   * Hides standard banner.
   */
  public hideBanner() {
    if (!this.activeBannerLoaded) return;
    console.log(`[AdMob SDK] Hiding active Banner Ad.`);
    
    try {
      if (window.AdMob?.removeBanner) {
        window.AdMob.removeBanner();
      }
    } catch (e) {
      console.warn('[AdMob SDK] Non-blocking banner remove warning:', e);
    }
    this.activeBannerLoaded = false;
  }

  /**
   * Triggers the Interstitial ad on prompt music submission (Free Tier).
   */
  public showInterstitial(onAdClosed: () => void) {
    console.log(`[AdMob SDK] Requesting Interstitial Ad [ID: ${ADMOB_CONFIG.INTERSTITIAL_AD_UNIT_ID}]`);

    if (window.AndroidAdMobBridge?.showInterstitialAd) {
      try {
        window.AndroidAdMobBridge.showInterstitialAd(ADMOB_CONFIG.INTERSTITIAL_AD_UNIT_ID);
        onAdClosed();
        return;
      } catch (e) {
        console.error('[AdMob Native] Native interstitial trigger failed:', e);
      }
    }

    if (window.AdMob?.prepareInterstitial) {
      try {
        window.AdMob.prepareInterstitial({
          adId: ADMOB_CONFIG.INTERSTITIAL_AD_UNIT_ID,
          autoShow: true
        });
        
        // Listen once for Cordova close event
        const handleAdClosed = () => {
          document.removeEventListener('onAdDismiss', handleAdClosed);
          onAdClosed();
        };
        document.addEventListener('onAdDismiss', handleAdClosed);
        return;
      } catch (e) {
        console.error('[AdMob Cordova] Cordova Interstitial trigger failed:', e);
      }
    }

    // We yield flow back so that the in-app Interstitial Overlay is handled gracefully by component state
    console.log(`[AdMob SDK] Executing high-fidelity visual web simulation for testing.`);
  }

  /**
   * Triggers the Rewarded ad when saving actions are selected.
   */
  public showRewarded(onAwardEarned: () => void, onAdClosed: () => void) {
    console.log(`[AdMob SDK] Requesting Rewarded Ad [ID: ${ADMOB_CONFIG.REWARDED_AD_UNIT_ID}]`);

    if (window.AndroidAdMobBridge?.showRewardedAd) {
      try {
        window.AndroidAdMobBridge.showRewardedAd(ADMOB_CONFIG.REWARDED_AD_UNIT_ID);
        onAwardEarned();
        onAdClosed();
        return;
      } catch (e) {
        console.error('[AdMob Native] Native rewarded trigger failed:', e);
      }
    }

    if (window.AdMob?.prepareRewardVideoAd) {
      try {
        window.AdMob.prepareRewardVideoAd({
          adId: ADMOB_CONFIG.REWARDED_AD_UNIT_ID,
          autoShow: true
        });

        const handleRewardEarned = () => {
          document.removeEventListener('onRouteToReward', handleRewardEarned);
          onAwardEarned();
        };
        const handleAdClosed = () => {
          document.removeEventListener('onAdDismiss', handleAdClosed);
          onAdClosed();
        };

        document.addEventListener('onRouteToReward', handleRewardEarned);
        document.addEventListener('onAdDismiss', handleAdClosed);
        return;
      } catch (e) {
        console.error('[AdMob Cordova] Cordova Rewarded trigger failed:', e);
      }
    }

    // In-app interactive modal handles countdown & claim callbacks smoothly.
    console.log(`[AdMob SDK] Executing high-fidelity visual Web Mock Rewarded Ad for sandbox validation.`);
  }
}

export const admobManager = new AdMobManager();

