/**
 * LocalCheckoutService — talks to the local Node.js server via REST + Socket.io.
 * socket.io-client is imported dynamically to avoid SSR issues in Next.js.
 */
export class LocalCheckoutService {
  constructor(serverUrl) {
    this.serverUrl = serverUrl.replace(/\/$/, ''); // strip trailing slash
    this.socket = null;
    this._checkoutCallback = null;
    this._connectPromise = this._connect();
  }

  async _connect() {
    if (typeof window === 'undefined') return;
    try {
      const { io } = await import('socket.io-client');
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
      });

      this.socket.on('checkout_requested', (data) => {
        if (this._checkoutCallback) {
          this._checkoutCallback(this._normalizeSocketCheckout(data));
        }
      });
    } catch (err) {
      console.error('[LocalCheckoutService] Socket connection failed:', err);
    }
  }

  /**
   * Normalize the checkout_requested socket payload into the same
   * transaction shape used by the POS components.
   */
  _normalizeSocketCheckout({ sessionId, checkoutCode, items, total }) {
    return {
      basketId: sessionId,
      basketIds: [],
      checkoutCode: (checkoutCode || '').toUpperCase(),
      sessionId,
      items: (items || []).map((item) => ({
        name: item.productName,
        qty: item.quantity,
        price: item.unitPrice,
        subtotal: item.subtotal,
        sku: item.barcode,
      })),
      total: total ?? 0,
      timestamp: new Date().toLocaleString('en-PH'),
    };
  }

  /**
   * Register a callback that fires when the server pushes a checkout_requested event.
   * Returns an unsubscribe function.
   */
  listenForCheckoutRequests(callback) {
    this._checkoutCallback = callback;
    return () => {
      this._checkoutCallback = null;
    };
  }

  /**
   * Fetch checkout details by code (used when cashier manually types/scans the code).
   */
  async lookupCheckoutCode(checkoutCode) {
    const normalized = checkoutCode.trim().toUpperCase();

    let data;
    try {
      const res = await fetch(`${this.serverUrl}/checkout/${normalized}`);
      if (res.status === 404) {
        throw new Error(
          `Checkout code "${normalized}" not found. Please try again.`
        );
      }
      if (!res.ok) {
        throw new Error(
          `Server error (${res.status}). Check the local server at ${this.serverUrl}.`
        );
      }
      data = await res.json();
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('Server error')) {
        throw err;
      }
      // Network / fetch failure
      throw new Error(
        `Cannot reach local server at ${this.serverUrl}. Make sure the server is running on the laptop.`
      );
    }

    // Mark checkout code as received / begin processing (non-critical)
    if (data.sessionId) {
      fetch(`${this.serverUrl}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: data.sessionId,
          checkoutCode: normalized,
        }),
      }).catch(() => {});
    }

    const items = (data.items || []).map((item) => ({
      name: item.productName,
      qty: item.quantity,
      price: item.unitPrice,
      subtotal: item.subtotal,
      sku: item.barcode,
    }));
    const total = data.total ?? items.reduce((sum, i) => sum + i.subtotal, 0);

    return {
      basketId: data.sessionId || normalized,
      basketIds: [],
      checkoutCode: normalized,
      sessionId: data.sessionId,
      items,
      total,
      timestamp: new Date().toLocaleString('en-PH'),
    };
  }

  /**
   * Complete payment: call PATCH /checkout/:code/complete and emit checkout_complete.
   */
  async completeCheckout(transaction, amountReceived) {
    const { checkoutCode } = transaction;
    const cashierId = 'CASHIER-001';

    try {
      const res = await fetch(
        `${this.serverUrl}/checkout/${checkoutCode}/complete`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cashierId, amountPaid: amountReceived }),
        }
      );
      if (!res.ok) {
        throw new Error(
          `Failed to complete checkout on local server (${res.status}).`
        );
      }
    } catch (err) {
      if (err.message.includes('Failed to complete')) throw err;
      throw new Error(
        `Cannot reach local server at ${this.serverUrl}. Payment may not have synced.`
      );
    }

    // Emit via socket as an additional notification to the Flutter app
    if (this.socket?.connected) {
      this.socket.emit('checkout_complete', {
        checkoutCode,
        cashierId,
        amountPaid: amountReceived,
      });
    }
  }

  dispose() {
    this._checkoutCallback = null;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
