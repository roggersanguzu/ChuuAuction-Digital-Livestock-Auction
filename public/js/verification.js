let currentStep = 1;
let uploadedFiles = {
  ownership: [],
  health: [],
  photos: [],
};
document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const auctionId = urlParams.get("auctionId") || "";
  document.getElementById("auctionId").value = auctionId;
  initializeVerificationTypeHandlers();
  initializeFileUploads();
  initializeStepNavigation();
  initializeFormSubmission();
});
function initializeVerificationTypeHandlers() {
  const radioButtons = document.querySelectorAll(
    'input[name="verificationType"]',
  );
  radioButtons.forEach((radio, index) => {
    radio.addEventListener("change", function (e) {
      const value = e.target.value;
      const ownershipSection = document.getElementById("ownership-section");
      const healthSection = document.getElementById("health-section");
      if (value === "ownership" || value === "both") {
        ownershipSection.style.display = "block";
      } else {
        ownershipSection.style.display = "none";
      }
      if (value === "health" || value === "both") {
        healthSection.style.display = "block";
      } else {
        healthSection.style.display = "none";
      }
    });
  });
}
function initializeFileUploads() {
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
}
function setupFileUpload(inputId, dropZoneId, previewId, fileArray) {
  const input = document.getElementById(inputId);
  const dropZone = document.getElementById(dropZoneId);
  const preview = document.getElementById(previewId);
  if (!input) {
    return;
  }
  if (!dropZone) {
    return;
  }
  if (!preview) {
    return;
  }
  dropZone.addEventListener("click", function () {
    input.click();
  });
  input.addEventListener("change", function (e) {
    handleFiles(e.target.files, fileArray, preview);
  });
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
    handleFiles(e.dataTransfer.files, fileArray, preview);
  });
}
function handleFiles(files, fileArray, preview) {
  const maxSize = 50 * 1024 * 1024; // 50MB
  Array.from(files).forEach((file, index) => {
if (file.size > maxSize) {
      alert(`File ${file.name} is too large. Maximum size is 50MB.`);
      return;
    }
    fileArray.push(file);
    displayFilePreview(file, preview, fileArray);
  });
}
function displayFilePreview(file, container, fileArray) {
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
    const removeBtn = div.querySelector(".file-remove");
    removeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      removeFile(div, file.name, fileArray);
    });
    container.appendChild(div);
  };
  reader.onerror = function () {
  };
  reader.readAsDataURL(file);
}
function removeFile(element, filename, fileArray) {
  const index = fileArray.findIndex((f) => f.name === filename);
  if (index > -1) {
    fileArray.splice(index, 1);
  }
  element.remove();
}
function initializeStepNavigation() {
  document
    .getElementById("next-step-2-btn")
    .addEventListener("click", () => nextStep(2));
  document
    .getElementById("next-step-3-btn")
    .addEventListener("click", () => nextStep(3));
  document
    .getElementById("next-step-4-btn")
    .addEventListener("click", () => nextStep(4));
  document
    .getElementById("prev-step-1-btn")
    .addEventListener("click", () => prevStep(1));
  document
    .getElementById("prev-step-2-btn")
    .addEventListener("click", () => prevStep(2));
  document
    .getElementById("prev-step-3-btn")
    .addEventListener("click", () => prevStep(3));
}
function nextStep(step) {
  if (currentStep === 1) {
    const verificationType = document.querySelector(
      'input[name="verificationType"]:checked',
    );
    if (!verificationType) {
      alert("Please select a verification type");
      return;
    }
    const value = verificationType.value;
    if (
      (value === "ownership" || value === "both") &&
      uploadedFiles.ownership.length === 0
    ) {
      alert("Please upload at least one ownership document");
      return;
    }
    if (
      (value === "health" || value === "both") &&
      uploadedFiles.health.length === 0
    ) {
      alert("Please upload at least one health document");
      return;
    }
  }
  if (currentStep === 2 && uploadedFiles.photos.length < 3) {
    alert("Please upload at least 3 photos of your animal");
    return;
  }
  document.getElementById(`step${currentStep}`).style.display = "none";
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
  document.getElementById(`step${step}`).style.display = "block";
  currentStep = step;
  if (step === 4) {
    populateReview();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function prevStep(step) {
  nextStep(step);
}
function populateReview() {
  const verificationType = document.querySelector(
    'input[name="verificationType"]:checked',
  )?.value;
  const summary = document.getElementById("review-summary");
  let html = '<div class="grid md:grid-cols-2 gap-6">';
  html += `
    <div class="p-4 rounded-xl glass border border-gray-800">
      <h4 class="font-bold text-blue-400 mb-2">Verification Type</h4>
      <p class="capitalize">${verificationType || "Not selected"}</p>
    </div>
  `;
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
}
function initializeFormSubmission() {
  const form = document.getElementById("verification-form");
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!document.getElementById("terms-checkbox").checked) {
      alert("Please accept the terms and conditions");
      return;
    }
    document.getElementById("loading-modal").classList.remove("hidden");
    document.getElementById("loading-modal").classList.add("flex");
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
    uploadedFiles.ownership.forEach((file) => {
      formData.append("ownershipDocuments", file);
    });
    uploadedFiles.health.forEach((file) => {
      formData.append("healthDocuments", file);
    });
    uploadedFiles.photos.forEach((file) => {
      formData.append("animalPhotos", file);
    });
    try {
      const response = await fetch("/verification/api/submit", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      document.getElementById("loading-modal").classList.add("hidden");
      document.getElementById("loading-modal").classList.remove("flex");
      if (result.success) {
        document.getElementById("success-modal").classList.remove("hidden");
        document.getElementById("success-modal").classList.add("flex");
        document
          .getElementById("view-verifications-btn")
          .addEventListener("click", function () {
            window.location.href = "/verification/status";
          });
      } else {
        alert("Error: " + result.message);
      }
    } catch (error) {
      document.getElementById("loading-modal").classList.add("hidden");
      document.getElementById("loading-modal").classList.remove("flex");
      alert("Failed to submit verification. Please try again.");
    }
  });
}
