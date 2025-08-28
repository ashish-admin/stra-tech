/**
 * Push Notifications Service for LokDarpan Political Intelligence Dashboard
 * 
 * Features:
 * - Political intelligence alert notifications
 * - Campaign event notifications
 * - Sentiment analysis alerts
 * - Strategic briefing updates
 * - Permission management
 * - Subscription handling
 */

class PushNotificationService {
  constructor() {
    this.registration = null;
    this.subscription = null;
    this.isSupported = this.checkSupport();
    this.vapidPublicKey = null; // To be set from backend
    
    console.log('[Push Notifications] Service initialized, supported:', this.isSupported);
  }

  /**
   * Check if push notifications are supported
   */
  checkSupport() {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Get current notification permission status
   */
  getPermissionStatus() {
    if (!this.isSupported) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Request notification permission from user
   */
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported');
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      throw new Error('Notification permission was denied by user');
    }

    const permission = await Notification.requestPermission();
    console.log('[Push Notifications] Permission result:', permission);
    
    return permission === 'granted';
  }

  /**
   * Initialize push notification service
   */
  async initialize() {
    try {
      if (!this.isSupported) {
        console.warn('[Push Notifications] Not supported in this browser');
        return false;
      }

      // Get service worker registration
      this.registration = await navigator.serviceWorker.ready;
      console.log('[Push Notifications] Service worker ready');

      // Get VAPID key from backend
      await this.fetchVapidKey();

      return true;
    } catch (error) {
      console.error('[Push Notifications] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Fetch VAPID public key from backend
   */
  async fetchVapidKey() {
    try {
      // In production, this would fetch from your backend
      // For now, using a placeholder
      const response = await fetch('/api/v1/push/vapid-key', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.vapidPublicKey = data.publicKey;
        console.log('[Push Notifications] VAPID key fetched');
      } else {
        // Fallback to default key (in production, generate proper VAPID keys)
        console.warn('[Push Notifications] Using fallback VAPID key');
        this.vapidPublicKey = 'BCHzX5H5oHZdHF2IgIz0LfvTbTqC7jK0IqY7TjK9L6hH7GkD-H5oHZdHF2IgIz0LfvTbTqC7jK0IqY7TjK9L6hH';
      }
    } catch (error) {
      console.error('[Push Notifications] Failed to fetch VAPID key:', error);
      // Use fallback key
      this.vapidPublicKey = 'BCHzX5H5oHZdHF2IgIz0LfvTbTqC7jK0IqY7TjK9L6hH7GkD-H5oHZdHF2IgIz0LfvTbTqC7jK0IqY7TjK9L6hH';
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe() {
    try {
      if (!this.registration) {
        await this.initialize();
      }

      // Request permission
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        throw new Error('Permission not granted for notifications');
      }

      // Check for existing subscription
      const existingSubscription = await this.registration.pushManager.getSubscription();
      if (existingSubscription) {
        this.subscription = existingSubscription;
        console.log('[Push Notifications] Using existing subscription');
        await this.sendSubscriptionToServer(existingSubscription);
        return existingSubscription;
      }

      // Create new subscription
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      this.subscription = subscription;
      console.log('[Push Notifications] New subscription created');

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);

      return subscription;
    } catch (error) {
      console.error('[Push Notifications] Subscription failed:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe() {
    try {
      if (!this.subscription) {
        const existingSubscription = await this.registration.pushManager.getSubscription();
        if (!existingSubscription) {
          console.log('[Push Notifications] No subscription to unsubscribe');
          return true;
        }
        this.subscription = existingSubscription;
      }

      // Unsubscribe from browser
      const unsubscribed = await this.subscription.unsubscribe();
      
      if (unsubscribed) {
        // Remove from server
        await this.removeSubscriptionFromServer(this.subscription);
        this.subscription = null;
        console.log('[Push Notifications] Unsubscribed successfully');
      }

      return unsubscribed;
    } catch (error) {
      console.error('[Push Notifications] Unsubscription failed:', error);
      throw error;
    }
  }

  /**
   * Send subscription to backend server
   */
  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch('/api/v1/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      console.log('[Push Notifications] Subscription sent to server');
      return await response.json();
    } catch (error) {
      console.error('[Push Notifications] Failed to send subscription to server:', error);
      // Don't throw - allow client-side notifications to work
    }
  }

  /**
   * Remove subscription from backend server
   */
  async removeSubscriptionFromServer(subscription) {
    try {
      await fetch('/api/v1/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ subscription })
      });

      console.log('[Push Notifications] Subscription removed from server');
    } catch (error) {
      console.error('[Push Notifications] Failed to remove subscription from server:', error);
    }
  }

  /**
   * Show local notification (fallback when push is not available)
   */
  async showLocalNotification(title, options = {}) {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        throw new Error('Notification permission not granted');
      }

      const defaultOptions = {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-144x144.png',
        tag: 'lokdarpan-notification',
        requireInteraction: true,
        actions: [
          {
            action: 'view',
            title: 'View Details',
            icon: '/icons/icon-144x144.png'
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
            icon: '/icons/icon-144x144.png'
          }
        ]
      };

      const notification = new Notification(title, {
        ...defaultOptions,
        ...options
      });

      // Handle notification clicks
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();
        
        if (options.onClick) {
          options.onClick(event);
        }
      };

      return notification;
    } catch (error) {
      console.error('[Push Notifications] Local notification failed:', error);
      throw error;
    }
  }

  /**
   * Send political intelligence alert notification
   */
  async sendPoliticalAlert(data) {
    const { type, ward, message, priority = 'normal', url } = data;
    
    const title = `LokDarpan Alert: ${ward || 'Political Update'}`;
    const options = {
      body: message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-144x144.png',
      tag: `political-alert-${type}`,
      data: { type, ward, url, timestamp: Date.now() },
      requireInteraction: priority === 'high',
      actions: [
        {
          action: 'view',
          title: 'View Analysis',
          icon: '/icons/icon-144x144.png'
        }
      ]
    };

    return this.showLocalNotification(title, options);
  }

  /**
   * Send sentiment change alert
   */
  async sendSentimentAlert(data) {
    const { ward, sentiment, change, trend } = data;
    
    const title = `Sentiment Alert: ${ward}`;
    const body = `${sentiment} sentiment ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)}% (${trend})`;
    
    return this.sendPoliticalAlert({
      type: 'sentiment',
      ward,
      message: body,
      priority: Math.abs(change) > 10 ? 'high' : 'normal'
    });
  }

  /**
   * Send strategic briefing update
   */
  async sendStrategicUpdate(data) {
    const { ward, briefing, priority } = data;
    
    const title = `Strategic Update: ${ward}`;
    const body = briefing.length > 100 ? briefing.substring(0, 97) + '...' : briefing;
    
    return this.sendPoliticalAlert({
      type: 'strategic',
      ward,
      message: body,
      priority
    });
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus() {
    try {
      if (!this.isSupported) {
        return { supported: false, subscribed: false, permission: 'unsupported' };
      }

      const permission = this.getPermissionStatus();
      
      if (!this.registration) {
        await this.initialize();
      }

      const subscription = await this.registration.pushManager.getSubscription();
      
      return {
        supported: this.isSupported,
        subscribed: !!subscription,
        permission,
        subscription
      };
    } catch (error) {
      console.error('[Push Notifications] Failed to get subscription status:', error);
      return {
        supported: this.isSupported,
        subscribed: false,
        permission: 'error',
        error: error.message
      };
    }
  }
}

// Create singleton instance
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;