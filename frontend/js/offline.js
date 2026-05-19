const DB_NAME = "drivelegal-offline";
const DB_VERSION = 1;
const STORE_NAME = "fine_schedules";

let dbInstance = null;

// OPEN INDEXEDDB
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });

        store.createIndex("jurisdiction_id", "jurisdiction_id", {
          unique: false,
        });

        store.createIndex("country_id", "country_id", {
          unique: false,
        });

        store.createIndex("severity", "severity", {
          unique: false,
        });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// FETCH + CACHE ALL DATA
export async function syncOfflineData() {
  if (!navigator.onLine) {
    console.log("Offline — skipping sync");
    return;
  }

  try {
    const response = await fetch("/api/laws/export/all");

    if (!response.ok) {
      throw new Error("Failed to fetch offline dataset");
    }

    const data = await response.json();

    const db = await openDatabase();

    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // CLEAR OLD DATA
    store.clear();

    for (const item of data) {
      store.put(item);
    }

    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = reject;
    });

    console.log(`Offline sync complete (${data.length} records)`);
  } catch (error) {
    console.error("Offline sync failed:", error);
  }
}

// QUERY LOCAL INDEXEDDB
export async function queryOffline(filters = {}) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.getAll();

    request.onsuccess = () => {
      let results = request.result;

      // FILTERING
      if (filters.jurisdiction_id) {
        results = results.filter(
          (item) => item.jurisdiction_id === filters.jurisdiction_id,
        );
      }

      if (filters.country_id) {
        results = results.filter(
          (item) => item.country_id === filters.country_id,
        );
      }

      if (filters.severity) {
        results = results.filter((item) => item.severity === filters.severity);
      }

      if (filters.search) {
        const search = filters.search.toLowerCase();

        results = results.filter((item) => {
          return (
            item.violation_name?.toLowerCase().includes(search) ||
            item.category_name?.toLowerCase().includes(search) ||
            item.section_reference?.toLowerCase().includes(search)
          );
        });
      }

      resolve(results);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// OFFLINE BANNER
function createOfflineBanner() {
  let banner = document.getElementById("offline-banner");

  if (!banner) {
    banner = document.createElement("div");

    banner.id = "offline-banner";

    banner.style.position = "fixed";
    banner.style.top = "0";
    banner.style.left = "0";
    banner.style.width = "100%";
    banner.style.padding = "12px";
    banner.style.background = "#DC2626";
    banner.style.color = "#FFFFFF";
    banner.style.textAlign = "center";
    banner.style.fontWeight = "600";
    banner.style.zIndex = "9999";

    banner.innerText = "Offline Mode — Using Cached Traffic Law Data";

    document.body.appendChild(banner);
  }

  banner.style.display = navigator.onLine ? "none" : "block";
}

// NETWORK STATUS EVENTS
window.addEventListener("online", () => {
  createOfflineBanner();
  syncOfflineData();
});

window.addEventListener("offline", () => {
  createOfflineBanner();
});

// INITIALIZE
window.addEventListener("load", async () => {
  createOfflineBanner();

  await openDatabase();

  if (navigator.onLine) {
    await syncOfflineData();
  }
});

// Expose to window scope for non-module script access
window.queryOffline = queryOffline;
window.syncOfflineData = syncOfflineData;
