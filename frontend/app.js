// SERVICE WORKER REGISTRATION

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration =
        await navigator.serviceWorker.register("/service-worker.js");

      console.log("Service Worker registered:", registration);
    } catch (error) {
      console.log("Service Worker registration failed:", error);
    }
  });
}

// PWA INSTALL SUPPORT

let deferredPrompt;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();

  deferredPrompt = event;

  console.log("PWA install prompt available");
});

window.addEventListener("appinstalled", () => {
  console.log("DriveLegal PWA installed");
});
