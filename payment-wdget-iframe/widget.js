(function () {
  let iframe = null;
  let modalOverlay = null;
  let config = {};
  let sessionToken = null;

  const WIDGET_DOMAIN = "https://d113uktkms0xyz.cloudfront.net";

  const defaults = {
    mode: "modal",
    theme: { primaryColor: "#4f46e5" }
  };

  function generateSessionToken() {
    return 'sess_' + Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  const ALLOWED_ORIGINS = [WIDGET_DOMAIN];

  function readConfigFromDataAttributes() {
    const container = document.querySelector('[data-checkout-public-key]');
    if (!container) return null;

    return {
      publicKey: container.dataset.checkoutPublicKey,
      amount: parseInt(container.dataset.checkoutAmount) || 2999,
      currency: container.dataset.checkoutCurrency || "USD",
      productName: container.dataset.checkoutProductName || "Product",
      orderId: container.dataset.checkoutOrderId || "ord_" + Date.now(),
      mode: container.dataset.checkoutMode || "modal",
      primaryColor: container.dataset.checkoutPrimaryColor || "#4f46e5",
      onSuccess: window[container.dataset.checkoutOnSuccess] || null,
      onError: window[container.dataset.checkoutOnError] || null,
      onClose: window[container.dataset.checkoutOnClose] || null
    };
  }

  window.CheckoutWidget = {
    init: function (userConfig) {
      config = { ...defaults, ...userConfig };
      sessionToken = generateSessionToken();
      console.log("CheckoutWidget initialized via init()");
      if (config.mode === "inline") renderInline();
    },

    autoInit: function () {
      const dataConfig = readConfigFromDataAttributes();
      if (dataConfig) {
        config = { ...defaults, ...dataConfig };
        sessionToken = generateSessionToken();
        console.log("CheckoutWidget auto-initialized via data attributes");
      }
    }
    
  };

  function createIframe() {
    iframe = document.createElement('iframe');

    const params = new URLSearchParams({
      publicKey: config.publicKey,
      amount: config.amount,
      currency: config.currency,
      productName: config.productName || "Product",
      orderId: config.orderId,
      primaryColor: config.theme.primaryColor,
      sessionToken: sessionToken
    });

    iframe.src = `${WIDGET_DOMAIN}/checkout.html?${params.toString()}`;

    iframe.style.border = "none";
    iframe.style.width = "100%";
    iframe.style.height = "620px";
    iframe.style.borderRadius = "16px";
    iframe.style.background = "white";

    iframe.sandbox = "allow-scripts allow-forms allow-same-origin";
    iframe.allow = "payment";

    window.addEventListener("message", handleIframeMessage);
  }

  function handleIframeMessage(e) {
    if (!ALLOWED_ORIGINS.includes(e.origin)) {
      console.warn(`Blocked from untrusted origin: ${e.origin}`);
      return;
    }

    const data = e.data;
    if (!data || data.source !== "checkout-widget") return;

    if (data.sessionToken !== sessionToken) {
      console.log("Invalid session token");
      return;
    }

    switch (data.type) {
      case "SUCCESS":
        config.onSuccess?.(data.payload);
        CheckoutWidget.close();
        break;
      case "ERROR":
        config.onError?.(data.payload);
        break;
      case "CLOSE":
        config.onClose?.();
        CheckoutWidget.close();
        break;
      case "RESIZE":
        if (iframe) iframe.style.height = `${data.height}px`;
        break;
    }
  }

  function showModal() {
    if (modalOverlay) return;

    modalOverlay = document.createElement('div');
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.inset = '0';
    modalOverlay.style.backgroundColor = 'rgba(0,0,0,0.65)';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.zIndex = '9999';

    const modalContent = document.createElement("div");
    modalContent.style.width = "480px";
    modalContent.style.maxWidth = "95vw";
    modalContent.appendChild(iframe);

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) CheckoutWidget.close();
    });
  }

  function renderInline() {
    const container = document.querySelector('#checkout-container') || 
                      document.querySelector('[data-checkout-public-key]');
    if (container) {
      createIframe();
      container.appendChild(iframe);
    }
  }

  window.addEventListener('load', () => {
    CheckoutWidget.autoInit();
  });

  window.CheckoutWidget.open = function () {
    if (!iframe) createIframe();
    showModal();
  };

  window.CheckoutWidget.close = function () {
    if (modalOverlay) {
      modalOverlay.remove();
      modalOverlay = null;
      iframe = null;
    }
  };
})();