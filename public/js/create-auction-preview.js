(function () {
  function byId(id) {
    return document.getElementById(id);
  }
  var state = {
    files: [],
    countdownIntervalId: null,
    stepIcons: {
      1: "fas fa-clipboard-list",
      2: "fas fa-images",
      3: "fas fa-tags",
      4: "fas fa-clock",
    },
  };
  function setStep(step, status) {
    var item = byId("stepItem" + step);
    var dot = byId("step" + step);
    if (!item || !dot) return;
    var label = item.querySelector(".step-label");
    item.classList.remove("active", "completed");
    dot.classList.remove("active", "completed");
    if (status === "completed") {
      item.classList.add("completed");
      dot.classList.add("completed");
      dot.innerHTML = '<i class="fas fa-check"></i>';
      if (label) {
        var baseTextC = label.getAttribute("data-base") || label.textContent.split(" (")[0];
        label.setAttribute("data-base", baseTextC);
        label.textContent = baseTextC + " (Completed)";
      }
      return;
    }
    if (status === "active") {
      item.classList.add("active");
      dot.classList.add("active");
      dot.innerHTML = '<i class="' + state.stepIcons[step] + '"></i>';
      if (label) {
        var baseTextA = label.getAttribute("data-base") || label.textContent.split(" (")[0];
        label.setAttribute("data-base", baseTextA);
        label.textContent = baseTextA + " (In Progress)";
      }
      return;
    }
    dot.innerHTML = '<i class="' + state.stepIcons[step] + '"></i>';
    if (label) {
      var baseTextR = label.getAttribute("data-base") || label.textContent.split(" (")[0];
      label.setAttribute("data-base", baseTextR);
      label.textContent = baseTextR + " (Remaining)";
    }
  }
  function parseNumber(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  function detailsComplete() {
    var animalType = byId("animalTypeSelect");
    var breed = byId("breedInput");
    var weight = byId("weightInput");
    var location = byId("locationInput");
    var description = byId("descTextarea");
    var health = document.querySelector('select[name="healthStatus"]');
    var quantity = document.querySelector('input[name="quantity"]');
    var ageYears = document.querySelector('input[name="ageYears"]');
    var ageMonths = document.querySelector('input[name="ageMonths"]');
    var sex = document.querySelector('input[name="sex"]:checked');
    return !!(
      animalType &&
      animalType.value &&
      breed &&
      breed.value.trim() &&
      weight &&
      parseNumber(weight.value) > 0 &&
      location &&
      location.value.trim() &&
      description &&
      description.value.trim().length >= 50 &&
      health &&
      health.value &&
      quantity &&
      parseNumber(quantity.value) >= 1 &&
      ageYears &&
      ageYears.value !== "" &&
      ageMonths &&
      ageMonths.value !== "" &&
      sex
    );
  }
  function photosComplete() {
    return state.files.length >= 2 && state.files.length <= 4;
  }
  function pricingComplete() {
    var start = byId("startingPrice");
    var reserve = byId("reservePrice");
    var startVal = parseNumber(start ? start.value : "");
    var reserveVal = parseNumber(reserve ? reserve.value : "");
    var reserveEmpty = !reserve || reserve.value === "";
    return startVal > 0 && (reserveEmpty || reserveVal >= startVal);
  }
  function buildEndDateFromInputs() {
    var endDate = byId("endDate");
    var endTime = byId("endTime");
    var tz = document.querySelector('select[name="timezone"]');
    if (!endDate || !endTime || !endDate.value || !endTime.value) return null;
    var tzSuffix =
      tz && String(tz.value).toUpperCase() === "UTC" ? "Z" : "+03:00";
    var parsed = new Date(endDate.value + "T" + endTime.value + ":00" + tzSuffix);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }
  function timingComplete() {
    var endAt = buildEndDateFromInputs();
    return !!(endAt && endAt.getTime() > Date.now());
  }
  function refreshStepState() {
    var c1 = detailsComplete();
    var c2 = photosComplete();
    var c3 = pricingComplete();
    var c4 = timingComplete();
    setStep(1, c1 ? "completed" : "active");
    setStep(2, c2 ? "completed" : c1 ? "active" : "remaining");
    setStep(3, c3 ? "completed" : c2 ? "active" : "remaining");
    setStep(4, c4 ? "completed" : c3 ? "active" : "remaining");
  }
  function initLivePreview() {
    var categoryMap = {
      1: "Cattle",
      2: "Goat",
      3: "Sheep",
      4: "Pig",
      5: "Poultry",
      6: "Rabbit",
      7: "Duck",
    };
    var category = byId("previewCategory");
    var breed = byId("previewBreed");
    var weight = byId("previewWeight");
    var location = byId("previewLocation");
    var typeInput = byId("animalTypeSelect");
    var breedInput = byId("breedInput");
    var weightInput = byId("weightInput");
    var locationInput = byId("locationInput");
    function update() {
      if (category && typeInput) {
        category.textContent = typeInput.value ? categoryMap[typeInput.value] || "-" : "-";
      }
      if (breed && breedInput) breed.textContent = breedInput.value.trim() || "-";
      if (weight && weightInput) {
        weight.textContent = weightInput.value ? weightInput.value + " KG" : "-";
      }
      if (location && locationInput) {
        location.textContent = locationInput.value.trim() || "-";
      }
    }
    [typeInput, breedInput, weightInput, locationInput].forEach(function (el) {
      if (el) {
        el.addEventListener("input", function () {
          update();
          refreshStepState();
        });
        el.addEventListener("change", function () {
          update();
          refreshStepState();
        });
      }
    });
    update();
  }
  function initDescriptionCounter() {
    var input = byId("descTextarea");
    var count = byId("descCharCount");
    if (!input || !count) return;
    function update() {
      var len = input.value.length;
      count.textContent = String(len);
      count.className = len >= 50 ? "ok" : "";
      refreshStepState();
    }
    input.addEventListener("input", update);
    update();
  }
  function initVaccinationToggle() {
    var toggle = byId("vaccinatedToggle");
    var label = byId("vaccinatedLabel");
    var section = byId("vaccinationLicenseSection");
    var license = byId("vaccinationLicense");
    if (!toggle || !label || !section || !license) return;
    function update() {
      if (toggle.checked) {
        label.textContent = "Yes";
        label.style.color = "var(--accent)";
        section.classList.add("show");
        license.required = true;
      } else {
        label.textContent = "No";
        label.style.color = "var(--text3)";
        section.classList.remove("show");
        license.required = false;
      }
    }
    toggle.addEventListener("change", function () {
      update();
      refreshStepState();
    });
    update();
  }
  function syncInputFiles(input) {
    var dt = new DataTransfer();
    state.files.forEach(function (f) {
      dt.items.add(f);
    });
    input.files = dt.files;
  }
  function initPhotoPreview() {
    var input = byId("animalPhotosInput");
    var grid = byId("photoPreviewGrid");
    var prompt = byId("uploadPrompt");
    var badge = byId("photoCountBadge");
    var badgeText = byId("photoCountText");
    var zone = byId("photoZone");
    if (!input || !grid || !prompt || !badge || !badgeText) return;
    function render() {
      grid.innerHTML = "";
      if (state.files.length === 0) {
        grid.classList.remove("show");
        prompt.classList.remove("hidden");
        badge.classList.add("hidden");
        refreshStepState();
        return;
      }
      grid.classList.add("show");
      prompt.classList.add("hidden");
      badge.classList.remove("hidden");
      badgeText.textContent =
        state.files.length +
        " photo" +
        (state.files.length === 1 ? "" : "s") +
        " selected";
      state.files.forEach(function (file, index) {
        var reader = new FileReader();
        reader.onload = function (ev) {
          var div = document.createElement("div");
          div.className = "photo-thumb";
          div.innerHTML =
            '<img src="' +
            ev.target.result +
            '" alt="Photo ' +
            (index + 1) +
            '" />' +
            '<div class="thumb-overlay">' +
            '<button type="button" class="thumb-remove" data-remove-index="' +
            index +
            '" title="Remove this photo"><i class="fas fa-times"></i></button>' +
            "<div>" +
            '<div class="thumb-num">#' +
            (index + 1) +
            "</div>" +
            '<div class="thumb-name">' +
            file.name +
            "</div>" +
            "</div>" +
            "</div>";
          grid.appendChild(div);
        };
        reader.readAsDataURL(file);
      });
      refreshStepState();
    }
    function addFiles(files) {
      var incoming = Array.from(files || []).filter(function (f) {
        return f && String(f.type || "").indexOf("image/") === 0;
      });
      var valid = incoming.filter(function (f) {
        return f.size <= 5 * 1024 * 1024;
      });
      var dropped = incoming.length - valid.length;
      if (dropped > 0) {
        alert("Some files were skipped because they exceeded 5MB.");
      }
      state.files = state.files.concat(valid).slice(0, 4);
      syncInputFiles(input);
      render();
    }
    input.addEventListener("change", function (event) {
      addFiles(event.target.files);
    });
    grid.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-remove-index]");
      if (!btn) return;
      var index = Number(btn.getAttribute("data-remove-index"));
      if (Number.isNaN(index)) return;
      state.files.splice(index, 1);
      syncInputFiles(input);
      render();
    });
    if (zone) {
      zone.addEventListener("dragover", function (event) {
        event.preventDefault();
        zone.classList.add("drag-active");
      });
      zone.addEventListener("dragleave", function () {
        zone.classList.remove("drag-active");
      });
      zone.addEventListener("drop", function (event) {
        event.preventDefault();
        zone.classList.remove("drag-active");
        addFiles(event.dataTransfer.files);
      });
    }
    window.removeAllPhotos = function () {
      state.files = [];
      syncInputFiles(input);
      render();
    };
    render();
  }
  function initAuctionTimerPreview() {
    var endDateInput = byId("endDate");
    var endTimeInput = byId("endTime");
    var daysEl = byId("daysLeft");
    var hoursEl = byId("hoursLeft");
    var minsEl = byId("minsLeft");
    var previewEl = byId("durationPreview");
    if (
      !endDateInput ||
      !endTimeInput ||
      !daysEl ||
      !hoursEl ||
      !minsEl ||
      !previewEl
    ) {
      return;
    }
    var tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    endDateInput.min = tomorrow.toISOString().slice(0, 10);
    if (!endDateInput.value || !endTimeInput.value) {
      var defaultEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);
      endDateInput.value = defaultEnd.toISOString().slice(0, 10);
      endTimeInput.value =
        String(defaultEnd.getHours()).padStart(2, "0") +
        ":" +
        String(defaultEnd.getMinutes()).padStart(2, "0");
    }
    function refresh() {
      var endAt = buildEndDateFromInputs();
      if (!endAt) {
        daysEl.textContent = "00";
        hoursEl.textContent = "00";
        minsEl.textContent = "00";
        previewEl.textContent =
          "Select end date and time above to preview the auction countdown.";
        refreshStepState();
        return;
      }
      var diff = endAt.getTime() - Date.now();
      if (diff <= 0) {
        daysEl.textContent = "00";
        hoursEl.textContent = "00";
        minsEl.textContent = "00";
        previewEl.textContent = "End time must be in the future.";
        refreshStepState();
        return;
      }
      var days = Math.floor(diff / 86400000);
      var hours = Math.floor((diff % 86400000) / 3600000);
      var mins = Math.floor((diff % 3600000) / 60000);
      daysEl.textContent = String(days).padStart(2, "0");
      hoursEl.textContent = String(hours).padStart(2, "0");
      minsEl.textContent = String(mins).padStart(2, "0");
      previewEl.textContent =
        "Auction will run for " +
        days +
        " day" +
        (days === 1 ? "" : "s") +
        ", " +
        hours +
        " hour" +
        (hours === 1 ? "" : "s") +
        " and " +
        mins +
        " minute" +
        (mins === 1 ? "" : "s") +
        ".";
      refreshStepState();
    }
    function restartTimer() {
      if (state.countdownIntervalId) clearInterval(state.countdownIntervalId);
      state.countdownIntervalId = setInterval(refresh, 1000);
      refresh();
    }
    endDateInput.addEventListener("change", restartTimer);
    endTimeInput.addEventListener("change", restartTimer);
    var tz = document.querySelector('select[name="timezone"]');
    if (tz) tz.addEventListener("change", restartTimer);
    restartTimer();
  }
  function initPricingValidation() {
    var start = byId("startingPrice");
    var reserve = byId("reservePrice");
    if (!start || !reserve) return;
    function validate() {
      var startVal = parseNumber(start.value);
      var reserveVal = parseNumber(reserve.value);
      if (reserve.value && startVal > 0 && reserveVal < startVal) {
        reserve.classList.add("error");
      } else {
        reserve.classList.remove("error");
      }
      refreshStepState();
    }
    start.addEventListener("input", validate);
    reserve.addEventListener("input", validate);
    validate();
  }
  function initDraft() {
    var form = byId("auctionForm");
    var saveBtn = byId("saveDraftBtn");
    if (!form || !saveBtn) return;
    saveBtn.addEventListener("click", function () {
      var formData = new FormData(form);
      var draft = {};
      formData.forEach(function (value, key) {
        if (key === "animalPhotos") return;
        draft[key] = value;
      });
      localStorage.setItem("auctionDraft", JSON.stringify(draft));
      var original = saveBtn.innerHTML;
      saveBtn.innerHTML = '<i class="fas fa-check-circle"></i>Draft Saved';
      setTimeout(function () {
        saveBtn.innerHTML = original;
      }, 1700);
    });
    try {
      var raw = localStorage.getItem("auctionDraft");
      if (!raw) return;
      var data = JSON.parse(raw);
      Object.keys(data).forEach(function (key) {
        var input = form.querySelector('[name="' + key + '"]');
        if (!input) return;
        if (input.type === "radio") {
          var radio = form.querySelector(
            '[name="' + key + '"][value="' + data[key] + '"]',
          );
          if (radio) radio.checked = true;
          return;
        }
        if (input.type === "checkbox") {
          input.checked = data[key] === "on" || data[key] === true;
          input.dispatchEvent(new Event("change"));
          return;
        }
        input.value = data[key];
      });
    } catch (_) {
    }
  }
  function initSubmit() {
    var form = byId("auctionForm");
    var submitBtn = byId("submitBtn");
    var terms = byId("termsCheckbox");
    if (!form || !submitBtn || !terms) return;
    form.addEventListener("submit", function (event) {
      if (!terms.checked) {
        event.preventDefault();
        alert("Please accept the terms before launching the auction.");
        return;
      }
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<i class="fas fa-hourglass-split spin"></i>Creating Auction';
    });
  }
  function initReactiveRefresh() {
    var form = byId("auctionForm");
    if (!form) return;
    form.addEventListener("input", refreshStepState);
    form.addEventListener("change", refreshStepState);
  }
  function init() {
    if (!byId("auctionForm")) return;
    initLivePreview();
    initDescriptionCounter();
    initVaccinationToggle();
    initPhotoPreview();
    initPricingValidation();
    initAuctionTimerPreview();
    initDraft();
    initSubmit();
    initReactiveRefresh();
    refreshStepState();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
