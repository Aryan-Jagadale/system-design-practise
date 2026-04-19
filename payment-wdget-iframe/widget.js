// IFRAME WIDGET JS

// (function () {
//   let iframe = null;
//   let modalOverlay = null;
//   let config = {};
//   let sessionToken = null;

//   const WIDGET_DOMAIN = "https://d113uktkms0lt5.cloudfront.net";

//   const defaults = {
//     mode: "modal",
//     theme: { primaryColor: "#4f46e5" }
//   };

//   function generateSessionToken() {
//     return 'sess_' + Math.random().toString(36).substring(2, 15) +
//            Math.random().toString(36).substring(2, 15);
//   }

//   const ALLOWED_ORIGINS = [WIDGET_DOMAIN];

//   function readConfigFromDataAttributes() {
//     const container = document.querySelector('[data-checkout-public-key]');
//     if (!container) return null;

//     return {
//       publicKey: container.dataset.checkoutPublicKey,
//       amount: parseInt(container.dataset.checkoutAmount) || 2999,
//       currency: container.dataset.checkoutCurrency || "USD",
//       productName: container.dataset.checkoutProductName || "Product",
//       orderId: container.dataset.checkoutOrderId || "ord_" + Date.now(),
//       mode: container.dataset.checkoutMode || "modal",
//       primaryColor: container.dataset.checkoutPrimaryColor || "#4f46e5",
//       onSuccess: window[container.dataset.checkoutOnSuccess] || null,
//       onError: window[container.dataset.checkoutOnError] || null,
//       onClose: window[container.dataset.checkoutOnClose] || null
//     };
//   }

//   window.CheckoutWidget = {
//     init: function (userConfig) {
//       config = { ...defaults, ...userConfig };
//       sessionToken = generateSessionToken();
//       console.log("CheckoutWidget initialized via init()");
//     },

//     autoInit: function () {
//       const dataConfig = readConfigFromDataAttributes();
//       if (dataConfig) {
//         config = { ...defaults, ...dataConfig };
//         sessionToken = generateSessionToken();
//         console.log("CheckoutWidget auto-initialized via data attributes");
//       }
//     }
    
//   };

//   function createIframe() {
//     iframe = document.createElement('iframe');

//     const params = new URLSearchParams({
//       publicKey: config.publicKey,
//       amount: config.amount,
//       currency: config.currency,
//       productName: config.productName || "Product",
//       orderId: config.orderId,
//       primaryColor: config.theme.primaryColor,
//       sessionToken: sessionToken
//     });

//     iframe.src = `${WIDGET_DOMAIN}/checkout.html?${params.toString()}`;

//     iframe.style.border = "none";
//     iframe.style.width = "100%";
//     iframe.style.height = "620px";
//     iframe.style.borderRadius = "16px";
//     iframe.style.background = "white";

//     iframe.sandbox = "allow-scripts allow-forms allow-same-origin";
//     iframe.allow = "payment";

//     window.addEventListener("message", handleIframeMessage);
//   }

//   function handleIframeMessage(e) {
//     if (!ALLOWED_ORIGINS.includes(e.origin)) {
//       console.warn(`Blocked from untrusted origin: ${e.origin}`);
//       return;
//     }

//     const data = e.data;
//     if (!data || data.source !== "checkout-widget") return;

//     if (data.sessionToken !== sessionToken) {
//       console.log("Invalid session token");
//       return;
//     }
//     console.log("Received message from iframe:", data);

//     switch (data.type) {
//       case "SUCCESS":
//         config.onSuccess?.(data.payload);
//         CheckoutWidget.close();
//         break;
//       case "ERROR":
//         config.onError?.(data.payload);
//         break;
//       case "CLOSE":
//         config.onClose?.();
//         CheckoutWidget.close();
//         break;
//       case "RESIZE":
//         if (iframe) iframe.style.height = `${data.height}px`;
//         break;
//     }
//   }

//   function showModal() {
//     if (modalOverlay) return;

//     modalOverlay = document.createElement('div');
//     modalOverlay.style.position = 'fixed';
//     modalOverlay.style.inset = '0';
//     modalOverlay.style.backgroundColor = 'rgba(0,0,0,0.65)';
//     modalOverlay.style.display = 'flex';
//     modalOverlay.style.justifyContent = 'center';
//     modalOverlay.style.alignItems = 'center';
//     modalOverlay.style.zIndex = '9999';

//     const modalContent = document.createElement("div");
//     modalContent.style.width = "480px";
//     modalContent.style.maxWidth = "95vw";
//     modalContent.appendChild(iframe);

//     modalOverlay.appendChild(modalContent);
//     document.body.appendChild(modalOverlay);

//     modalOverlay.addEventListener("click", (e) => {
//       if (e.target === modalOverlay) CheckoutWidget.close();
//     });
//   }

//   window.addEventListener('load', () => {
//     CheckoutWidget.autoInit();
//   });

//   window.CheckoutWidget.open = function () {
//     if (!iframe) createIframe();
//     showModal();
//   };

//   window.CheckoutWidget.close = function () {
//     if (modalOverlay) {
//       modalOverlay.remove();
//       modalOverlay = null;
//       iframe = null;
//     }
//   };
// })();

// END OF WIDGET.JS

// Web Compoent


(function () {
  'use strict';
  
  const WIDGET_DOMAIN = "https://d113uktkms0lt5.cloudfront.net";
  class payCheckout extends HTMLElement {
    constructor() {
      super();
      this.shadow = this.attachShadow({ mode: 'open' });
      this.iframe = null;
      this.modalOverlay = null;
      this.sessionToken = null;
      this.config = {};
      this.boundHandleMessage = this.handleMessage.bind(this);
    }

    connectedCallback() {
      this.readAttributes();
      this.renderTriggerButton();
      window.addEventListener('message', this.boundHandleMessage);
    }

    disconnectedCallback() {
      window.removeEventListener('message', this.boundHandleMessage);
    }

    readAttributes() {
      this.config = {
        publicKey: this.getAttribute('public-key'),
        amount: parseInt(this.getAttribute('amount')) || 2999,
        currency: this.getAttribute('currency') || 'USD',
        productName: this.getAttribute('product-name') || 'Product',
        orderId: this.getAttribute('order-id') || 'ord_' + Date.now(),
        mode: this.getAttribute('mode') || 'modal',
        primaryColor: this.getAttribute('primary-color') || '#4f46e5',
        onSuccess: this.getAttribute('on-success'),
        onError: this.getAttribute('on-error'),
        onClose: this.getAttribute('on-close')
      };
    }

    renderTriggerButton() {
      console.log("Rendering trigger button with config:", this.config);
      const button = document.createElement('button');
      button.textContent = 'Buy Now';
      button.style.cssText = `
        background: ${this.config.primaryColor};
        color: white;
        padding: 16px 32px;
        font-size: 18px;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 600;
      `;
      button.addEventListener('click', () => this.open());
      this.shadow.appendChild(button);
    }

    open() {
      this.sessionToken = 'sess_' + Math.random().toString(36).substring(2, 15) +
                         Math.random().toString(36).substring(2, 15);

      this.createIframe();
      this.showModal();
    }

    close() {
      if (this.modalOverlay) {
        this.modalOverlay.remove();
        this.modalOverlay = null;
      }
      if (this.iframe) {
        this.iframe.remove();
        this.iframe = null;
      }
    }

    showModal() {
      if (this.modalOverlay) return;

      this.modalOverlay = document.createElement('div');
      this.modalOverlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.65);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      `;
      const content = document.createElement('div');
      content.style.cssText = `width: 480px; max-width: 95vw;`;
      content.appendChild(this.iframe);

      this.modalOverlay.appendChild(content);
      document.body.appendChild(this.modalOverlay);

      this.modalOverlay.addEventListener('click', (e) => {
        if (e.target === this.modalOverlay) this.close();
      });
    }

    createIframe() {
      this.iframe = document.createElement('iframe');
      
      const params = new URLSearchParams({
        publicKey: this.config.publicKey,
        amount: this.config.amount,
        currency: this.config.currency,
        productName: this.config.productName,
        orderId: this.config.orderId,
        primaryColor: this.config.primaryColor,
        sessionToken: this.sessionToken
      });

      this.iframe.src = `${WIDGET_DOMAIN}/checkout.html?${params.toString()}`;
      this.iframe.style.cssText = `
        border: none;
        width: 100%;
        height: 620px;
        border-radius: 16px;
        background: white;
      `;

      this.iframe.sandbox = "allow-scripts allow-forms allow-same-origin";
      this.iframe.allow = "payment";
    }

    handleMessage(e) {
      if (!this.iframe || e.source !== this.iframe.contentWindow) {
        return;
      }

      const iframeOrigin = this.iframe ? new URL(this.iframe.src).origin : null;
      if (!iframeOrigin || e.origin !== iframeOrigin) {
        console.warn("Blocked message from unexpected origin:", e.origin);
        return;
      }

      const data = e.data;
      if (!data || data.source !== "checkout-widget" || data.sessionToken !== this.sessionToken) {
        return;
      }

      console.log("Received message from iframe:", data);

      switch (data.type) {
        case "SUCCESS":
          if (this.config.onSuccess) {
            const callback = window[this.config.onSuccess];
            if (typeof callback === 'function') callback(data.payload);
          }
          this.close();
          break;

        case "ERROR":
          if (this.config.onError) {
            const callback = window[this.config.onError];
            if (typeof callback === 'function') callback(data.payload);
          }
          break;

        case "CLOSE":
          if (this.config.onClose) {
            const callback = window[this.config.onClose];
            if (typeof callback === 'function') callback();
          }
          this.close();
          break;

        case "RESIZE":
          if (this.iframe) this.iframe.style.height = `${data.height}px`;
          break;
      }
    }
    openMethod() { this.open(); }
    closeMethod() { this.close(); }
  }
  customElements.define('pay-checkout', payCheckout)
  
  console.log("pay-checkout component defined");
})();