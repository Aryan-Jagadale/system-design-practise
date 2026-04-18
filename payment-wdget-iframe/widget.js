(function () {
  let iframe = null;
  let modalOverlay = null;
  let config = {};
  let sessionToken = null;

  const defaults = {
    mode: "modal",
    theme: { primaryColor: "#4f46e5" }
  };

  function generateSessionToken() {
    return 'sess_' + Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
  }

  const ALLOWED_ORIGINS = [
    "http://127.0.0.1:5501"
  ]

  window.CheckoutWidget = {
    init: function (userConfig) {
      config = { ...defaults, ...userConfig };
      sessionToken = generateSessionToken();
    },

    open: function () {
      if (!iframe) {
        createIframe();
      }
      showModal();
    },

    close: function () {
      if (modalOverlay) {
        modalOverlay.remove();
        return;
      }
    }
  };


  function createIframe() {
    iframe = document.createElement('iframe');
    const params = new URLSearchParams({
      publicKey: config.publicKey,
      amount: config.amount,
      currency: config.currency,
      productName: config.productName,
      orderId: config.orderId,
      primaryColor: config.theme.primaryColor,
      sessionToken: sessionToken
    });

    iframe.src = `checkout.html?${params.toString()}`;
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
    console.log("Received message from iframe:", e.data, "origin:", e.origin);
    if (!ALLOWED_ORIGINS.includes(e.origin)) {
      console.warn(`Message from untrusted origin: ${e.origin}`);
      return;
    }
    const data = e.data;
    if (!data || data.source !== "checkout-widget") return;
    
    if (data.sessionToken !== sessionToken) {
      console.log("Invalid token —  spoofing attempt");
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
    if (modalOverlay) {
      return;
    }

    modalOverlay = document.createElement('div');
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = 0;
    modalOverlay.style.left = 0;
    modalOverlay.style.width = '100%';
    modalOverlay.style.height = '100%';
    modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.zIndex = 9999;

    const modalContent = document.createElement("div");
    modalContent.style.width = "480px";
    modalContent.style.maxWidth = "95%";
    modalContent.appendChild(iframe);

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        CheckoutWidget.close();
      }
    });
  }


})();