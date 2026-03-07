(function () {
  function byId(id) {
    return document.getElementById(id);
  }
  function getContext() {
    var ctx = byId("dashboard-stats-context");
    if (!ctx) return null;
    return {
      role: String(ctx.getAttribute("data-role") || "").toLowerCase(),
    };
  }
  function showToast(message, type) {
    if (typeof window.showToast === "function") {
      window.showToast(message, type || "info");
    }
  }
  async function fetchJson(url, options) {
    var response = await fetch(
      url,
      Object.assign({ credentials: "same-origin" }, options || {}),
    );
    var payload = await response.json().catch(function () {
      return {};
    });
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Request failed");
    }
    return payload;
  }
  function roleLabel(role) {
    return role === "buyer" ? "Buyer" : "Farmer";
  }
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  function ensureUI(role) {
    if (byId("user-settings-fab") && byId("user-settings-modal")) return;
    var fab = document.createElement("button");
    fab.id = "user-settings-fab";
    fab.className =
      "fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white flex items-center justify-center hover:scale-105 transition-transform";
    fab.innerHTML = '<i class="bi bi-sliders text-lg"></i>';
    fab.title = roleLabel(role) + " Settings";
    var modal = document.createElement("div");
    modal.id = "user-settings-modal";
    modal.className = "fixed inset-0 z-[90] hidden";
    modal.innerHTML =
      '<div id="user-settings-overlay" class="absolute inset-0 bg-black/65"></div>' +
      '<div class="absolute inset-x-4 top-6 md:top-10 mx-auto max-w-4xl rounded-2xl border border-gray-700 bg-gray-900 text-white shadow-2xl overflow-hidden">' +
      '<div class="px-5 py-4 border-b border-gray-800 bg-gray-900/95 flex items-center justify-between">' +
      '<div><p class="text-xs uppercase tracking-widest text-gray-500">' +
      roleLabel(role) +
      ' Control Center</p><h3 class="font-black text-xl">' +
      roleLabel(role) +
      ' Dashboard Settings</h3></div>' +
      '<button id="user-settings-close" class="h-8 w-8 rounded-md hover:bg-gray-800"><i class="bi bi-x-lg"></i></button>' +
      "</div>" +
      '<div class="grid md:grid-cols-[220px_1fr]">' +
      '<div class="border-r border-gray-800 p-4 space-y-2 bg-gray-950/60">' +
      '<button data-settings-tab="general" class="user-settings-tab w-full text-left px-3 py-2 rounded-lg bg-gray-800 text-sm font-semibold">General</button>' +
      '<button data-settings-tab="notifications" class="user-settings-tab w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800 text-sm">Notifications</button>' +
      '<button data-settings-tab="display" class="user-settings-tab w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800 text-sm">Display</button>' +
      '<button data-settings-tab="advanced" class="user-settings-tab w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800 text-sm">Advanced</button>' +
      '<div class="pt-4 mt-3 border-t border-gray-800">' +
      '<p class="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Presets</p>' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<button id="user-settings-preset-balanced" class="px-2 py-1.5 rounded-md border border-gray-700 hover:bg-gray-800 text-xs">Balanced</button>' +
      '<button id="user-settings-preset-focus" class="px-2 py-1.5 rounded-md border border-gray-700 hover:bg-gray-800 text-xs">Focus</button>' +
      '<button id="user-settings-preset-alert" class="px-2 py-1.5 rounded-md border border-gray-700 hover:bg-gray-800 text-xs">Alerts</button>' +
      '<button id="user-settings-preset-compact" class="px-2 py-1.5 rounded-md border border-gray-700 hover:bg-gray-800 text-xs">Compact</button>' +
      "</div></div></div>" +
      '<div class="p-4 md:p-5 max-h-[72vh] overflow-y-auto space-y-5">' +
      '<section data-settings-panel="general" class="user-settings-panel space-y-4">' +
      '<div class="grid sm:grid-cols-2 gap-3">' +
      '<label class="text-xs text-gray-300">Theme<select id="user-setting-theme" class="mt-1 w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm"><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></label>' +
      '<label class="text-xs text-gray-300">Timezone<select id="user-setting-timezone" class="mt-1 w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm"><option value="EAT">East Africa Time (EAT)</option><option value="UTC">UTC</option><option value="CAT">Central Africa Time (CAT)</option></select></label>' +
      '<label class="text-xs text-gray-300">Auto Refresh (seconds)<input id="user-setting-refresh" type="number" min="10" max="300" class="mt-1 w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" /></label>' +
      '<label class="text-xs text-gray-300">Digest Interval (hours)<input id="user-setting-digest" type="number" min="1" max="24" class="mt-1 w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" /></label>' +
      "</div>" +
      '<div id="role-general-settings" class="grid sm:grid-cols-2 gap-3"></div>' +
      "</section>" +
      '<section data-settings-panel="notifications" class="user-settings-panel space-y-3 hidden">' +
      '<label class="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-sm"><span>Enable Notifications</span><input id="user-setting-notifications" type="checkbox" class="h-4 w-4 accent-cyan-500" /></label>' +
      '<label class="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-sm"><span>Email Alerts</span><input id="user-setting-email" type="checkbox" class="h-4 w-4 accent-cyan-500" /></label>' +
      '<label class="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-sm"><span>SMS Alerts</span><input id="user-setting-sms" type="checkbox" class="h-4 w-4 accent-cyan-500" /></label>' +
      '<label class="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-sm"><span>Desktop Alerts</span><input id="user-setting-desktop" type="checkbox" class="h-4 w-4 accent-cyan-500" /></label>' +
      '<label class="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-sm"><span>Sound Alerts</span><input id="user-setting-sound" type="checkbox" class="h-4 w-4 accent-cyan-500" /></label>' +
      '<div id="role-notification-settings" class="space-y-3"></div>' +
      "</section>" +
      '<section data-settings-panel="display" class="user-settings-panel space-y-3 hidden">' +
      '<label class="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-sm"><span>Compact Cards</span><input id="user-setting-compact" type="checkbox" class="h-4 w-4 accent-cyan-500" /></label>' +
      '<div id="role-display-settings" class="space-y-3"></div>' +
      "</section>" +
      '<section data-settings-panel="advanced" class="user-settings-panel space-y-3 hidden">' +
      '<div id="role-advanced-settings" class="space-y-3"></div>' +
      "</section>" +
      '<div class="text-xs text-gray-500" id="user-settings-saved-at"></div>' +
      '<div class="flex gap-2 justify-end"><button id="user-settings-reset" class="px-3 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 text-sm">Reset</button><button id="user-settings-save" class="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-sm font-semibold">Save Settings</button></div>' +
      "</div></div></div>";
    document.body.appendChild(fab);
    document.body.appendChild(modal);
  }
  function setChecked(id, value) {
    var el = byId(id);
    if (el) el.checked = !!value;
  }
  function setValue(id, value) {
    var el = byId(id);
    if (el) el.value = value;
  }
  function renderRoleSections(role, settings) {
    var general = byId("role-general-settings");
    var notify = byId("role-notification-settings");
    var display = byId("role-display-settings");
    var advanced = byId("role-advanced-settings");
    if (!general || !notify || !display || !advanced) return;
    if (role === "buyer") {
      general.innerHTML =
        '<label class="text-xs text-gray-300">Max Bid Confirmation<select id="user-setting-maxbidconfirm" class="mt-1 w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm"><option value="true">Enabled</option><option value="false">Disabled</option></select></label>';
      notify.innerHTML =
        '<label class="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-sm"><span>Instant Outbid Alerts</span><input id="user-setting-instantoutbid" type="checkbox" class="h-4 w-4 accent-cyan-500" /></label>' +
        '<label class="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-sm"><span>Watchlist Alerts</span><input id="user-setting-watchlist" type="checkbox" class="h-4 w-4 accent-cyan-500" /></label>';
      display.innerHTML =
        '<label class="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-sm"><span>Show Bid Trends</span><input id="user-setting-showtrends" type="checkbox" class="h-4 w-4 accent-cyan-500" /></label>' +
        '<label class="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-sm"><span>Show Suggested Auctions</span><input id="user-setting-showsuggested" type="checkbox" class="h-4 w-4 accent-cyan-500" /></label>';
      advanced.innerHTML =
        '<div class="rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-3 text-sm text-gray-300">Advanced buyer behavior controls are enabled from this profile. Use presets for faster setup.</div>';
      setValue("user-setting-maxbidconfirm", String(!!settings.maxBidConfirm));
      setChecked("user-setting-instantoutbid", settings.instantOutbidAlerts);
      setChecked("user-setting-watchlist", settings.watchlistAlerts);
      setChecked("user-setting-showtrends", settings.showBidTrends);
      setChecked("user-setting-showsuggested", settings.showSuggestedAuctions);
      return;
    }
    general.innerHTML =
      '<label class="text-xs text-gray-300">Bid Alert Threshold (UGX)<input id="user-setting-threshold" type="number" min="0" max="1000000000" class="mt-1 w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" /></label>' +
      '<label class="text-xs text-gray-300">Auto Archive (days)<input id="user-setting-archive-days" type="number" min="1" max="90" class="mt-1 w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm" /></label>';
    notify.innerHTML =
      '<label class="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-sm"><span>New Bid Alerts</span><input id="user-setting-newbidalerts" type="checkbox" class="h-4 w-4 accent-cyan-500" /></label>' +
      '<label class="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-sm"><span>Reserve Price Warnings</span><input id="user-setting-reservewarn" type="checkbox" class="h-4 w-4 accent-cyan-500" /></label>';
    display.innerHTML =
      '<label class="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-sm"><span>Show Performance Widgets</span><input id="user-setting-showperf" type="checkbox" class="h-4 w-4 accent-cyan-500" /></label>' +
      '<label class="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-sm"><span>Show Contact On Listings</span><input id="user-setting-showcontact" type="checkbox" class="h-4 w-4 accent-cyan-500" /></label>';
    advanced.innerHTML =
      '<label class="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-sm"><span>Auto Close Bids</span><input id="user-setting-autoclose" type="checkbox" class="h-4 w-4 accent-cyan-500" /></label>' +
      '<label class="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-sm"><span>Winner Confirmation Required</span><input id="user-setting-winnerconfirm" type="checkbox" class="h-4 w-4 accent-cyan-500" /></label>';
    setValue("user-setting-threshold", Number(settings.bidAlertThreshold || 0));
    setValue("user-setting-archive-days", Number(settings.autoArchiveDays || 14));
    setChecked("user-setting-newbidalerts", settings.newBidAlerts);
    setChecked("user-setting-reservewarn", settings.reservePriceWarnings);
    setChecked("user-setting-showperf", settings.showPerformanceWidgets);
    setChecked("user-setting-showcontact", settings.showContactOnListings);
    setChecked("user-setting-autoclose", settings.autoCloseBids);
    setChecked("user-setting-winnerconfirm", settings.winnerConfirmationRequired);
  }
  function collectPayload(role) {
    var settings = {
      notifications: !!(byId("user-setting-notifications") && byId("user-setting-notifications").checked),
      emailAlerts: !!(byId("user-setting-email") && byId("user-setting-email").checked),
      smsAlerts: !!(byId("user-setting-sms") && byId("user-setting-sms").checked),
      desktopAlerts: !!(byId("user-setting-desktop") && byId("user-setting-desktop").checked),
      soundAlerts: !!(byId("user-setting-sound") && byId("user-setting-sound").checked),
      compactCards: !!(byId("user-setting-compact") && byId("user-setting-compact").checked),
      autoRefreshSeconds: clamp(
        Number(byId("user-setting-refresh") ? byId("user-setting-refresh").value : 60) || 60,
        10,
        300,
      ),
      bidDigestHours: clamp(
        Number(byId("user-setting-digest") ? byId("user-setting-digest").value : 6) || 6,
        1,
        24,
      ),
    };
    if (role === "buyer") {
      settings.maxBidConfirm =
        String(byId("user-setting-maxbidconfirm") ? byId("user-setting-maxbidconfirm").value : "true") === "true";
      settings.instantOutbidAlerts = !!(byId("user-setting-instantoutbid") && byId("user-setting-instantoutbid").checked);
      settings.watchlistAlerts = !!(byId("user-setting-watchlist") && byId("user-setting-watchlist").checked);
      settings.showBidTrends = !!(byId("user-setting-showtrends") && byId("user-setting-showtrends").checked);
      settings.showSuggestedAuctions = !!(byId("user-setting-showsuggested") && byId("user-setting-showsuggested").checked);
    } else {
      settings.autoCloseBids = !!(byId("user-setting-autoclose") && byId("user-setting-autoclose").checked);
      settings.bidAlertThreshold = clamp(
        Number(byId("user-setting-threshold") ? byId("user-setting-threshold").value : 0) || 0,
        0,
        1000000000,
      );
      settings.newBidAlerts = !!(byId("user-setting-newbidalerts") && byId("user-setting-newbidalerts").checked);
      settings.reservePriceWarnings = !!(byId("user-setting-reservewarn") && byId("user-setting-reservewarn").checked);
      settings.showPerformanceWidgets = !!(byId("user-setting-showperf") && byId("user-setting-showperf").checked);
      settings.showContactOnListings = !!(byId("user-setting-showcontact") && byId("user-setting-showcontact").checked);
      settings.winnerConfirmationRequired = !!(byId("user-setting-winnerconfirm") && byId("user-setting-winnerconfirm").checked);
      settings.autoArchiveDays = clamp(
        Number(byId("user-setting-archive-days") ? byId("user-setting-archive-days").value : 14) || 14,
        1,
        90,
      );
    }
    return {
      themeMode: byId("user-setting-theme") ? byId("user-setting-theme").value : "dark",
      timezone: byId("user-setting-timezone") ? byId("user-setting-timezone").value : "EAT",
      settings: settings,
    };
  }
  function applyUiPreferences(settings) {
    var compact = !!(settings && settings.compactCards);
    document.body.classList.toggle("compact-dashboard", compact);
    document.querySelectorAll(".stat-card,.card,.auction-card").forEach(function (el) {
      el.style.transform = compact ? "scale(0.985)" : "";
    });
  }
  function activateTab(name) {
    document.querySelectorAll(".user-settings-tab").forEach(function (btn) {
      var active = btn.getAttribute("data-settings-tab") === name;
      btn.classList.toggle("bg-gray-800", active);
      btn.classList.toggle("font-semibold", active);
    });
    document.querySelectorAll(".user-settings-panel").forEach(function (panel) {
      var active = panel.getAttribute("data-settings-panel") === name;
      panel.classList.toggle("hidden", !active);
    });
  }
  function applyPreset(role, name) {
    if (name === "balanced") {
      setChecked("user-setting-notifications", true);
      setChecked("user-setting-email", true);
      setChecked("user-setting-sms", false);
      setChecked("user-setting-desktop", true);
      setChecked("user-setting-sound", false);
      setChecked("user-setting-compact", false);
      setValue("user-setting-refresh", 60);
    }
    if (name === "focus") {
      setChecked("user-setting-notifications", true);
      setChecked("user-setting-email", false);
      setChecked("user-setting-sms", false);
      setChecked("user-setting-desktop", true);
      setChecked("user-setting-sound", false);
      setChecked("user-setting-compact", true);
      setValue("user-setting-refresh", 120);
    }
    if (name === "alert") {
      setChecked("user-setting-notifications", true);
      setChecked("user-setting-email", true);
      setChecked("user-setting-sms", true);
      setChecked("user-setting-desktop", true);
      setChecked("user-setting-sound", true);
      setValue("user-setting-refresh", 20);
    }
    if (name === "compact") {
      setChecked("user-setting-compact", true);
      setValue("user-setting-refresh", 90);
    }
    if (role === "buyer") {
      if (name === "alert") {
        setChecked("user-setting-instantoutbid", true);
        setChecked("user-setting-watchlist", true);
      }
      if (name === "focus") {
        setChecked("user-setting-showsuggested", false);
        setChecked("user-setting-showtrends", true);
      }
    } else {
      if (name === "alert") {
        setChecked("user-setting-newbidalerts", true);
        setChecked("user-setting-reservewarn", true);
      }
      if (name === "focus") {
        setChecked("user-setting-showperf", true);
        setChecked("user-setting-showcontact", false);
      }
    }
  }
  async function init() {
    var ctx = getContext();
    if (!ctx) return;
    if (!(ctx.role === "buyer" || ctx.role === "seller" || ctx.role === "farmer")) return;
    var normalizedRole = ctx.role === "buyer" ? "buyer" : "farmer";
    ensureUI(normalizedRole);
    var modal = byId("user-settings-modal");
    var fab = byId("user-settings-fab");
    var closeBtn = byId("user-settings-close");
    var overlay = byId("user-settings-overlay");
    var saveBtn = byId("user-settings-save");
    var resetBtn = byId("user-settings-reset");
    function openModal() {
      modal.classList.remove("hidden");
    }
    function closeModal() {
      modal.classList.add("hidden");
    }
    fab.addEventListener("click", openModal);
    document.querySelectorAll("[data-open-user-settings]").forEach(function (trigger) {
      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        openModal();
      });
    });
    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", closeModal);
    document.querySelectorAll(".user-settings-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activateTab(btn.getAttribute("data-settings-tab") || "general");
      });
    });
    byId("user-settings-preset-balanced").addEventListener("click", function () {
      applyPreset(normalizedRole, "balanced");
      showToast("Balanced preset applied", "info");
    });
    byId("user-settings-preset-focus").addEventListener("click", function () {
      applyPreset(normalizedRole, "focus");
      showToast("Focus preset applied", "info");
    });
    byId("user-settings-preset-alert").addEventListener("click", function () {
      applyPreset(normalizedRole, "alert");
      showToast("Alerts preset applied", "info");
    });
    byId("user-settings-preset-compact").addEventListener("click", function () {
      applyPreset(normalizedRole, "compact");
      showToast("Compact preset applied", "info");
    });
    async function loadSettings() {
      var payload = await fetchJson("/api/user/settings");
      var data = payload.data || {};
      var settings = data.settings || {};
      setValue("user-setting-theme", data.themeMode || "dark");
      setValue("user-setting-timezone", data.timezone || "EAT");
      setValue("user-setting-refresh", Number(settings.autoRefreshSeconds || 60));
      setValue("user-setting-digest", Number(settings.bidDigestHours || 6));
      setChecked("user-setting-notifications", settings.notifications);
      setChecked("user-setting-email", settings.emailAlerts);
      setChecked("user-setting-sms", settings.smsAlerts);
      setChecked("user-setting-desktop", settings.desktopAlerts);
      setChecked("user-setting-sound", settings.soundAlerts);
      setChecked("user-setting-compact", settings.compactCards);
      renderRoleSections(normalizedRole, settings);
      applyUiPreferences(settings);
      if (byId("user-settings-saved-at")) {
        byId("user-settings-saved-at").textContent = data.savedAt
          ? "Last saved: " + new Date(data.savedAt).toLocaleString("en-UG")
          : "";
      }
    }
    saveBtn.addEventListener("click", async function () {
      try {
        var payload = collectPayload(normalizedRole);
        var response = await fetchJson("/api/user/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        applyUiPreferences(response.data.settings || {});
        if (byId("user-settings-saved-at")) {
          byId("user-settings-saved-at").textContent = response.data.savedAt
            ? "Last saved: " + new Date(response.data.savedAt).toLocaleString("en-UG")
            : "";
        }
        showToast("Dashboard settings saved", "success");
      } catch (error) {
        showToast(error.message || "Failed to save settings", "error");
      }
    });
    resetBtn.addEventListener("click", async function () {
      try {
        var defaults = normalizedRole === "buyer"
          ? {
              themeMode: "dark",
              timezone: "EAT",
              settings: {
                notifications: true,
                emailAlerts: true,
                smsAlerts: false,
                desktopAlerts: true,
                soundAlerts: false,
                instantOutbidAlerts: true,
                watchlistAlerts: true,
                maxBidConfirm: true,
                bidDigestHours: 6,
                autoRefreshSeconds: 60,
                compactCards: false,
                showBidTrends: true,
                showSuggestedAuctions: true,
              },
            }
          : {
              themeMode: "dark",
              timezone: "EAT",
              settings: {
                notifications: true,
                emailAlerts: false,
                smsAlerts: false,
                desktopAlerts: true,
                soundAlerts: false,
                autoCloseBids: false,
                bidAlertThreshold: 0,
                newBidAlerts: true,
                reservePriceWarnings: true,
                winnerConfirmationRequired: true,
                showContactOnListings: true,
                autoArchiveDays: 14,
                autoRefreshSeconds: 60,
                compactCards: false,
                showPerformanceWidgets: true,
              },
            };
        await fetchJson("/api/user/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(defaults),
        });
        await loadSettings();
        showToast("Settings reset to defaults", "info");
      } catch (error) {
        showToast(error.message || "Failed to reset settings", "error");
      }
    });
    activateTab("general");
    try {
      await loadSettings();
    } catch (error) {
      showToast(error.message || "Failed to load dashboard settings", "error");
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
