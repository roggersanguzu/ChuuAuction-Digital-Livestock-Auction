// verification.js - Livestock Verification Form Handler

console.log(" Verification script loaded");

// State management
let currentStep = 1;
let uploadedFiles = {
  ownership: [],
  health: [],
  photos: [],
};

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", function () {
  console.log(" DOM Content Loaded");

  // Get auction ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const auctionId = urlParams.get("auctionId") || "";
  document.getElementById("auctionId").value = auctionId;
  console.log(" Auction ID:", auctionId || "none");

  // Initialize verification type handlers
  initializeVerificationTypeHandlers();

  // Initialize file upload handlers
  initializeFileUploads();

  // Initialize step navigation
  initializeStepNavigation();

  // Initialize form submission
  initializeFormSubmission();

  console.log("✅ All initialization complete");
});

/**
 * Initialize verification type radio button handlers
 */
function initializeVerificationTypeHandlers() {
  console.log("🔧 Setting up verification type handlers");

  const radioButtons = document.querySelectorAll(
    'input[name="verificationType"]',
  );
  console.log(`Found ${radioButtons.length} radio buttons`);

  radioButtons.forEach((radio, index) => {
    console.log(`Setting up radio button ${index + 1}: ${radio.value}`);

    radio.addEventListener("change", function (e) {
      const value = e.target.value;
      console.log(`📻 Verification type changed to: ${value}`);

      const ownershipSection = document.getElementById("ownership-section");
      const healthSection = document.getElementById("health-section");

      console.log(`Ownership section exists: ${!!ownershipSection}`);
      console.log(`Health section exists: ${!!healthSection}`);

      // Show/hide ownership section
      if (value === "ownership" || value === "both") {
        console.log("✅ Showing ownership section");
        ownershipSection.style.display = "block";
      } else {
        console.log("❌ Hiding ownership section");
        ownershipSection.style.display = "none";
      }

      // Show/hide health section
      if (value === "health" || value === "both") {
        console.log("✅ Showing health section");
        healthSection.style.display = "block";
      } else {
        console.log("❌ Hiding health section");
        healthSection.style.display = "none";
      }

      console.log(`Ownership display: ${ownershipSection.style.display}`);
      console.log(`Health display: ${healthSection.style.display}`);
    });
  });
}

/**
 * Initialize all file upload handlers
 */
function initializeFileUploads() {
  console.log("📁 Setting up file uploads");

  setupFileUpload(
    "ownership-input",
    "ownership-drop-zone",
    "ownership-previews",
    uploadedFiles.ownership,
  );

  setupFileUpload(
    "health-input",
    "health-drop-zone",
    "health-previews",
    uploadedFiles.health,
  );

  setupFileUpload(
    "photos-input",
    "photos-drop-zone",
    "photos-previews",
    uploadedFiles.photos,
  );

  console.log("✅ File uploads initialized");
}

/**
 * Setup file upload for a specific input
 */
function setupFileUpload(inputId, dropZoneId, previewId, fileArray) {
  console.log(`Setting up file upload: ${inputId}`);

  const input = document.getElementById(inputId);
  const dropZone = document.getElementById(dropZoneId);
  const preview = document.getElementById(previewId);

  if (!input) {
    console.error(`❌ Input not found: ${inputId}`);
    return;
  }
  if (!dropZone) {
    console.error(`❌ Drop zone not found: ${dropZoneId}`);
    return;
  }
  if (!preview) {
    console.error(`❌ Preview not found: ${previewId}`);
    return;
  }

  console.log(`✅ All elements found for ${inputId}`);

  // Click to upload
  dropZone.addEventListener("click", function () {
    console.log(`🖱️ Drop zone clicked: ${dropZoneId}`);
    input.click();
  });

  // File input change
  input.addEventListener("change", function (e) {
    console.log(`📂 Files selected: ${e.target.files.length}`);
    handleFiles(e.target.files, fileArray, preview);
  });

  // Drag and drop handlers
  dropZone.addEventListener("dragover", function (e) {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", function () {
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", function (e) {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    console.log(`📥 Files dropped: ${e.dataTransfer.files.length}`);
    handleFiles(e.dataTransfer.files, fileArray, preview);
  });
}

/**
 * Handle file selection
 */
function handleFiles(files, fileArray, preview) {
  const maxSize = 50 * 1024 * 1024; // 50MB
  console.log(`Processing ${files.length} files`);

  Array.from(files).forEach((file, index) => {
    console.log(
      `File ${index + 1}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
    );

    // Check file size
    if (file.size > maxSize) {
      console.error(`❌ File too large: ${file.name}`);
      alert(`File ${file.name} is too large. Maximum size is 50MB.`);
      return;
    }

    fileArray.push(file);
    console.log(`✅ File added: ${file.name}`);
    displayFilePreview(file, preview, fileArray);
  });

  console.log(`Total files in array: ${fileArray.length}`);
}

/**
 * Display file preview
 */
function displayFilePreview(file, container, fileArray) {
  console.log(`Creating preview for: ${file.name}`);

  const reader = new FileReader();

  reader.onload = function (e) {
    const div = document.createElement("div");
    div.className =
      "file-preview relative rounded-xl overflow-hidden border-2 border-gray-800 hover:border-blue-500 transition-all";
    div.setAttribute("data-filename", file.name);

    if (file.type.startsWith("image/")) {
      div.innerHTML = `
        <img src="${e.target.result}" class="w-full h-32 object-cover">
        <button type="button" class="file-remove absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-all">
          <i class="bi bi-x text-xl"></i>
        </button>
        <div class="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <p class="text-xs font-mono truncate">${file.name}</p>
        </div>
      `;
    } else {
      div.innerHTML = `
        <div class="h-32 flex items-center justify-center bg-gray-800/50">
          <i class="bi bi-file-pdf text-5xl text-red-400"></i>
        </div>
        <button type="button" class="file-remove absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-all">
          <i class="bi bi-x text-xl"></i>
        </button>
        <div class="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <p class="text-xs font-mono truncate">${file.name}</p>
        </div>
      `;
    }

    // Add remove handler
    const removeBtn = div.querySelector(".file-remove");
    removeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      console.log(`🗑️ Removing file: ${file.name}`);
      removeFile(div, file.name, fileArray);
    });

    container.appendChild(div);
    console.log(`✅ Preview created for: ${file.name}`);
  };

  reader.onerror = function () {
    console.error(`❌ Error reading file: ${file.name}`);
  };

  reader.readAsDataURL(file);
}

/**
 * Remove file from array and preview
 */
function removeFile(element, filename, fileArray) {
  const index = fileArray.findIndex((f) => f.name === filename);
  if (index > -1) {
    fileArray.splice(index, 1);
    console.log(`✅ File removed: ${filename}`);
  }
  element.remove();
  console.log(`Total files remaining: ${fileArray.length}`);
}

/**
 * Initialize step navigation buttons
 */
function initializeStepNavigation() {
  console.log("🔧 Setting up step navigation");

  // Next buttons
  document
    .getElementById("next-step-2-btn")
    .addEventListener("click", () => nextStep(2));
  document
    .getElementById("next-step-3-btn")
    .addEventListener("click", () => nextStep(3));
  document
    .getElementById("next-step-4-btn")
    .addEventListener("click", () => nextStep(4));

  // Previous buttons
  document
    .getElementById("prev-step-1-btn")
    .addEventListener("click", () => prevStep(1));
  document
    .getElementById("prev-step-2-btn")
    .addEventListener("click", () => prevStep(2));
  document
    .getElementById("prev-step-3-btn")
    .addEventListener("click", () => prevStep(3));

  console.log("✅ Step navigation initialized");
}

/**
 * Navigate to next step
 */
function nextStep(step) {
  console.log(`⏭️ Attempting to move to step ${step}`);

  // Validate current step
  if (currentStep === 1) {
    const verificationType = document.querySelector(
      'input[name="verificationType"]:checked',
    );

    if (!verificationType) {
      console.error("❌ No verification type selected");
      alert("Please select a verification type");
      return;
    }

    const value = verificationType.value;
    console.log(`Verification type: ${value}`);

    if (
      (value === "ownership" || value === "both") &&
      uploadedFiles.ownership.length === 0
    ) {
      console.error("❌ No ownership documents uploaded");
      alert("Please upload at least one ownership document");
      return;
    }

    if (
      (value === "health" || value === "both") &&
      uploadedFiles.health.length === 0
    ) {
      console.error("❌ No health documents uploaded");
      alert("Please upload at least one health document");
      return;
    }
  }

  if (currentStep === 2 && uploadedFiles.photos.length < 3) {
    console.error(`❌ Only ${uploadedFiles.photos.length} photos uploaded`);
    alert("Please upload at least 3 photos of your animal");
    return;
  }

  console.log(`✅ Validation passed for step ${currentStep}`);

  // Hide current step
  document.getElementById(`step${currentStep}`).style.display = "none";

  // Update step indicators
  document
    .getElementById(`step${currentStep}-circle`)
    .classList.remove("bg-blue-500");
  document
    .getElementById(`step${currentStep}-circle`)
    .classList.add("glass", "border-2", "border-gray-700");
  document
    .getElementById(`step${step}-circle`)
    .classList.remove("glass", "border-2", "border-gray-700");
  document.getElementById(`step${step}-circle`).classList.add("bg-blue-500");

  // Show next step
  document.getElementById(`step${step}`).style.display = "block";
  currentStep = step;

  console.log(`✅ Moved to step ${step}`);

  // Populate review if step 4
  if (step === 4) {
    populateReview();
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Navigate to previous step
 */
function prevStep(step) {
  console.log(`⏮️ Moving back to step ${step}`);
  nextStep(step);
}

/**
 * Populate review summary
 */
function populateReview() {
  console.log("📋 Populating review summary");

  const verificationType = document.querySelector(
    'input[name="verificationType"]:checked',
  )?.value;
  const summary = document.getElementById("review-summary");

  console.log(`Verification type: ${verificationType}`);
  console.log(`Ownership docs: ${uploadedFiles.ownership.length}`);
  console.log(`Health docs: ${uploadedFiles.health.length}`);
  console.log(`Photos: ${uploadedFiles.photos.length}`);

  let html = '<div class="grid md:grid-cols-2 gap-6">';

  // Verification type
  html += `
    <div class="p-4 rounded-xl glass border border-gray-800">
      <h4 class="font-bold text-blue-400 mb-2">Verification Type</h4>
      <p class="capitalize">${verificationType || "Not selected"}</p>
    </div>
  `;

  // Documents count
  html += `
    <div class="p-4 rounded-xl glass border border-gray-800">
      <h4 class="font-bold text-green-400 mb-2">Documents Uploaded</h4>
      <p>
        Ownership: ${uploadedFiles.ownership.length} files<br>
        Health: ${uploadedFiles.health.length} files<br>
        Photos: ${uploadedFiles.photos.length} photos
      </p>
    </div>
  `;

  html += "</div>";
  summary.innerHTML = html;

  console.log("✅ Review populated");
}

/**
 * Initialize form submission
 */
function initializeFormSubmission() {
  console.log("🔧 Setting up form submission");

  const form = document.getElementById("verification-form");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    console.log("📤 Form submission started");

    // Validate terms
    if (!document.getElementById("terms-checkbox").checked) {
      console.error("❌ Terms not accepted");
      alert("Please accept the terms and conditions");
      return;
    }

    // Show loading
    document.getElementById("loading-modal").classList.remove("hidden");
    document.getElementById("loading-modal").classList.add("flex");
    console.log("⏳ Loading modal shown");

    // Prepare form data
    const formData = new FormData();
    formData.append("auctionId", document.getElementById("auctionId").value);
    formData.append(
      "verificationType",
      document.querySelector('input[name="verificationType"]:checked').value,
    );
    formData.append(
      "ownershipDetails",
      document.querySelector('[name="ownershipDetails"]').value,
    );
    formData.append(
      "healthNotes",
      document.querySelector('[name="healthNotes"]').value,
    );
    formData.append(
      "veterinarianName",
      document.querySelector('[name="veterinarianName"]').value,
    );
    formData.append(
      "veterinarianContact",
      document.querySelector('[name="veterinarianContact"]').value,
    );
    formData.append(
      "lastVaccinationDate",
      document.querySelector('[name="lastVaccinationDate"]').value,
    );
    formData.append(
      "acquisitionDate",
      document.querySelector('[name="acquisitionDate"]').value,
    );
    formData.append(
      "previousOwner",
      document.querySelector('[name="previousOwner"]').value,
    );

    // Add files
    uploadedFiles.ownership.forEach((file) => {
      formData.append("ownershipDocuments", file);
      console.log(`Added ownership doc: ${file.name}`);
    });

    uploadedFiles.health.forEach((file) => {
      formData.append("healthDocuments", file);
      console.log(`Added health doc: ${file.name}`);
    });

    uploadedFiles.photos.forEach((file) => {
      formData.append("animalPhotos", file);
      console.log(`Added photo: ${file.name}`);
    });

    console.log("📦 FormData prepared");

    try {
      console.log("🌐 Sending request to /verification/api/submit");

      const response = await fetch("/verification/api/submit", {
        method: "POST",
        body: formData,
      });

      console.log(`Server response status: ${response.status}`);
      const result = await response.json();
      console.log("Server response:", result);

      // Hide loading
      document.getElementById("loading-modal").classList.add("hidden");
      document.getElementById("loading-modal").classList.remove("flex");

      if (result.success) {
        console.log("✅ Verification submitted successfully");
        // Show success modal
        document.getElementById("success-modal").classList.remove("hidden");
        document.getElementById("success-modal").classList.add("flex");

        // Setup view verifications button
        document
          .getElementById("view-verifications-btn")
          .addEventListener("click", function () {
            window.location.href = "/verification/status";
          });
      } else {
        console.error(`Submission failed: ${result.message}`);
        alert("Error: " + result.message);
      }
    } catch (error) {
      console.error(" Network error:", error);
      document.getElementById("loading-modal").classList.add("hidden");
      document.getElementById("loading-modal").classList.remove("flex");
      alert("Failed to submit verification. Please try again.");
    }
  });

  console.log(" Form submission initialized");
}

console.log(" Verification script fully loaded");
