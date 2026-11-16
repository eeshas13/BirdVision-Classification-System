document.addEventListener("DOMContentLoaded", () => {
  const navItems = document.querySelectorAll(".nav-item");
  const sections = [...document.querySelectorAll("main .panel")].map((panel) => panel.id);

  function safeScrollToElement(targetId) {
    const targetSection = document.getElementById(targetId);
    if (!targetSection) return;

    if (typeof targetSection.scrollIntoView === "function") {
      try {
        targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (error) {
        const top = targetSection.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({ top, behavior: "auto" });
      }
      return;
    }

    const top = targetSection.offsetTop || 0;
    window.scrollTo({ top, behavior: "auto" });
  }

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      navItems.forEach((nav) => nav.classList.remove("active"));
      item.classList.add("active");

      const targetId = item.dataset.target;
      safeScrollToElement(targetId);
    });
  });

  const overviewSection = document.getElementById("overview-section");
  if (overviewSection) {
    overviewSection.scrollIntoView({ block: "start" });
  }

  const imageInput = document.getElementById("imageInput");
  const uploadImageBtn = document.getElementById("uploadImageBtn");
  const analyzeImageBtn = document.getElementById("analyzeImageBtn");
  const imageDropZone = document.getElementById("imageDropZone");
  const imageLoading = document.getElementById("imageLoading");
  const birdPreview = document.getElementById("birdPreview");
  const speciesName = document.getElementById("speciesName");
  const scientificName = document.getElementById("scientificName");
  const imageConfidence = document.getElementById("imageConfidence");
  const imageModel = document.getElementById("imageModel");
  const imageConfidenceBar = document.getElementById("imageConfidenceBar");
  const imageFileBox = document.getElementById("imageFileBox");
  const galleryThumbs = document.querySelectorAll(".gallery-thumb");

  const detectionState = {
    imageSpecies: "House Sparrow",
    imageScientific: "Passer domesticus",
    audioSpecies: "Common Myna",
    finalSpecies: "Rose-ringed Parakeet",
    imageConfidence: 96.8,
    audioConfidence: 94.2,
    finalConfidence: 97.0
  };

  const demoClassifications = [
    { species: "House Sparrow", scientific: "Passer domesticus", confidence: 96.8, model: "EfficientNet" },
    { species: "Common Myna", scientific: "Acridotheres tristis", confidence: 94.3, model: "EfficientNet" },
    { species: "Rose-ringed Parakeet", scientific: "Psittacula krameri", confidence: 97.1, model: "EfficientNet" },
    { species: "Rock Pigeon", scientific: "Columba livia", confidence: 93.6, model: "EfficientNet" }
  ];

  const birdImageMap = {
    "House Sparrow": "assets/birds/house-sparrow.jpg",
    "Common Myna": "assets/birds/common-myna.jpg",
    "Rose-ringed Parakeet": "assets/birds/rose-ringed-parakeet.jpg",
    "Rock Pigeon": "assets/birds/rock-pigeon.jpg"
  };

  function getDemoClassification(species) {
    return demoClassifications.find((entry) => entry.species === species) || demoClassifications[0];
  }

  function setBirdPreview(species, scientificText) {
    const mappedImage = birdImageMap[species] || "assets/birds/house-sparrow.jpg";
    birdPreview.src = mappedImage;
    birdPreview.alt = species;
    birdPreview.dataset.fallback = mappedImage;
    birdPreview.dataset.userUpload = "false";
    if (scientificText) {
      scientificName.textContent = scientificText;
    }
    birdPreview.onerror = function () {
      if (this.dataset.fallback) {
        this.src = this.dataset.fallback;
      }
    };
  }

  function updateProcessingStatus(message, progressValue) {
    const loadingText = document.getElementById("imageLoadingText");
    const progressBar = document.getElementById("imageProcessingProgress");

    if (loadingText) {
      loadingText.textContent = message;
    }

    if (progressBar) {
      progressBar.style.width = `${progressValue}%`;
    }
  }

  function applyImagePrediction(species, scientificNameText, confidenceValue, modelName, inputType = "Image", status = "Identified") {
    speciesName.textContent = species;
    scientificName.textContent = scientificNameText;
    imageModel.textContent = modelName;

    if (typeof confidenceValue === "number") {
      imageConfidence.textContent = `${confidenceValue.toFixed(1)}%`;
      imageConfidenceBar.style.width = `${Math.min(confidenceValue, 100)}%`;
    } else {
      imageConfidence.textContent = "Not provided by model";
      imageConfidenceBar.style.width = "0%";
    }

    document.getElementById("inputTypeValue").textContent = inputType;
    document.getElementById("statusValue").textContent = status;

    const detailsConfidence = document.querySelector(".analysis-details .detail-row:last-child strong");
    if (detailsConfidence) {
      detailsConfidence.textContent = typeof confidenceValue === "number" ? `${confidenceValue.toFixed(1)}%` : "Not provided by model";
    }

    detectionState.imageSpecies = species;
    detectionState.imageScientific = scientificNameText;
    detectionState.imageConfidence = typeof confidenceValue === "number" ? confidenceValue : 0;
  }

  function appendDetectionHistory(species, inputType, confidenceValue, modelName, status) {
    const tableBody = document.querySelector("#history-section tbody");
    if (!tableBody) return;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${species}</td>
      <td>${inputType}</td>
      <td>${typeof confidenceValue === "number" ? `${confidenceValue.toFixed(1)}%` : "Not provided"}</td>
      <td>${modelName}</td>
      <td>${status}</td>
    `;
    tableBody.prepend(row);
  }

  function applyAudioPrediction(species, confidenceValue) {
    detectionState.audioSpecies = species;
    detectionState.audioConfidence = confidenceValue;
    const audioResult = document.querySelector("#audioResultBox .audio-stats strong");
    if (audioResult) {
      audioResult.textContent = species;
    }
  }

  if (uploadImageBtn) {
    uploadImageBtn.addEventListener("click", () => imageInput.click());
  }

  function resetImageUploadState() {
    imageInput.value = "";
    imageFileBox.textContent = "No image uploaded";
    analyzeImageBtn.disabled = true;
    analyzeImageBtn.textContent = "Analyze Image";
    imageLoading.classList.remove("visible");
    updateProcessingStatus("Reading image", 0);
    birdPreview.src = "assets/birds/house-sparrow.jpg";
    birdPreview.alt = "Bird preview";
    birdPreview.dataset.userUpload = "false";
    speciesName.textContent = "House Sparrow";
    scientificName.textContent = "Passer domesticus";
    imageConfidence.textContent = "96.8%";
    imageModel.textContent = "EfficientNet";
    imageConfidenceBar.style.width = "96.8%";
    document.getElementById("inputTypeValue").textContent = "Image";
    document.getElementById("statusValue").textContent = "Identified";
  }

  imageInput.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (!file) return;

    const isValid = ["image/jpeg", "image/jpg", "image/png"].includes(file.type) || /\.(jpg|jpeg|png)$/i.test(file.name);
    if (!isValid) {
      imageFileBox.textContent = "Unsupported file. Please upload JPG, JPEG, or PNG.";
      imageInput.value = "";
      return;
    }

    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      const url = URL.createObjectURL(file);
      birdPreview.src = url;
      birdPreview.alt = file.name;
      birdPreview.dataset.userUpload = "true";
      birdPreview.dataset.fallback = url;
    } else {
      const fileReader = new FileReader();
      fileReader.onload = function (loadEvent) {
        birdPreview.src = loadEvent.target.result;
        birdPreview.alt = file.name;
        birdPreview.dataset.userUpload = "true";
        birdPreview.dataset.fallback = loadEvent.target.result;
      };
      fileReader.readAsDataURL(file);
    }

    imageFileBox.textContent = `Uploaded file: ${file.name}`;
    analyzeImageBtn.disabled = false;
    galleryThumbs.forEach((thumb) => thumb.classList.remove("active"));
  });

  galleryThumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      galleryThumbs.forEach((item) => item.classList.remove("active"));
      thumb.classList.add("active");
      birdPreview.dataset.userUpload = "false";
      setBirdPreview(thumb.dataset.bird, thumb.dataset.scientific);
      const demoResult = getDemoClassification(thumb.dataset.bird);
      speciesName.textContent = demoResult.species;
      scientificName.textContent = demoResult.scientific;
      imageConfidence.textContent = `${demoResult.confidence}%`;
      imageModel.textContent = demoResult.model;
      imageConfidenceBar.style.width = `${demoResult.confidence}%`;
      document.getElementById("inputTypeValue").textContent = "Image";
      document.getElementById("statusValue").textContent = "Identified";
      imageFileBox.textContent = `Demo sample: ${demoResult.species}`;
    });
  });

  imageDropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    imageDropZone.classList.add("dragging");
  });

  imageDropZone.addEventListener("dragleave", () => {
    imageDropZone.classList.remove("dragging");
  });

  imageDropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    imageDropZone.classList.remove("dragging");
    const [file] = event.dataTransfer.files;
    if (!file) return;

    const isValid = ["image/jpeg", "image/jpg", "image/png"].includes(file.type) || /\.(jpg|jpeg|png)$/i.test(file.name);
    if (!isValid) {
      imageFileBox.textContent = "Unsupported file. Please upload JPG, JPEG, or PNG.";
      return;
    }

    const url = URL.createObjectURL(file);
    birdPreview.src = url;
    birdPreview.alt = file.name;
    birdPreview.dataset.userUpload = "true";
    birdPreview.dataset.fallback = url;
    imageInput.files = event.dataTransfer.files;
    imageFileBox.textContent = `Uploaded file: ${file.name}`;
    analyzeImageBtn.disabled = false;
  });

  async function analyzeUploadedImage() {
    const [file] = imageInput.files || [];
    if (!file) {
      imageFileBox.textContent = "Please upload a bird image first.";
      return;
    }

    const isValid = ["image/jpeg", "image/jpg", "image/png"].includes(file.type) || /\.(jpg|jpeg|png)$/i.test(file.name);
    if (!isValid) {
      imageFileBox.textContent = "Unsupported file. Please upload JPG, JPEG, or PNG.";
      return;
    }

    imageLoading.classList.add("visible");
    analyzeImageBtn.disabled = true;
    analyzeImageBtn.style.opacity = "0.75";
    analyzeImageBtn.textContent = "Analyzing...";

    const steps = [
      { label: "Reading image", progress: 20 },
      { label: "Preprocessing image", progress: 42 },
      { label: "Extracting features", progress: 68 },
      { label: "Identifying bird species", progress: 90 }
    ];

    let index = 0;
    const intervalId = setInterval(() => {
      const step = steps[index];
      if (!step) {
        clearInterval(intervalId);
        return;
      }
      updateProcessingStatus(step.label, step.progress);
      index += 1;
    }, 580);

    try {
      const formData = new FormData();
      formData.append("image", file, file.name);

      const apiBaseUrl = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? "http://127.0.0.1:5000"
        : "";

      const response = await fetch(`${apiBaseUrl}/api/analyze-image`, {
        method: "POST",
        body: formData
      });

      const payload = await response.json();

      if (!response.ok || payload.status === "error") {
        throw new Error(payload.message || payload.error || "The image model could not analyze this file.");
      }

      const normalizedStatus = payload.status || "identified";
      const species = payload.species || "Uncertain";
      const scientific = payload.scientificName || "Not provided by model";
      const confidence = typeof payload.confidence === "number" ? payload.confidence : null;
      const modelName = payload.model || "Vision model";

      speciesName.textContent = species;
      scientificName.textContent = scientific;
      imageModel.textContent = modelName;
      document.getElementById("inputTypeValue").textContent = "Image";

      if (normalizedStatus === "no_bird") {
        document.getElementById("statusValue").textContent = "No bird detected";
        imageConfidence.textContent = "Not provided by model";
        imageConfidenceBar.style.width = "0%";
        updateProcessingStatus("No bird detected in the uploaded image. Please upload a clear bird photograph.", 100);
      } else if (normalizedStatus === "uncertain") {
        document.getElementById("statusValue").textContent = "Uncertain";
        imageConfidence.textContent = "Not provided by model";
        imageConfidenceBar.style.width = "0%";
        updateProcessingStatus("Bird detected, but species identification is uncertain.", 100);
      } else {
        document.getElementById("statusValue").textContent = "Identified";
        applyImagePrediction(species, scientific, confidence, modelName, "Image", "Identified");
        appendDetectionHistory(species, "Image", confidence, modelName, "Identified");
        updateProcessingStatus("Identification complete", 100);
      }

      if (payload.message) {
        const detailsMessage = document.querySelector(".analysis-details-body");
        if (detailsMessage) {
          const existing = detailsMessage.lastElementChild;
          if (existing && existing.classList && existing.classList.contains("detail-row-status")) {
            existing.remove();
          }
          const messageRow = document.createElement("div");
          messageRow.className = "detail-row detail-row-status";
          messageRow.innerHTML = `<span>Status note</span><strong>${payload.message}</strong>`;
          detailsMessage.appendChild(messageRow);
        }
      }
    } catch (error) {
      imageLoading.classList.remove("visible");
      analyzeImageBtn.disabled = false;
      analyzeImageBtn.style.opacity = "1";
      analyzeImageBtn.textContent = "Analyze Image";
      updateProcessingStatus(error.message || "Image analysis failed.", 100);
      document.getElementById("statusValue").textContent = "Unable to identify";
      imageConfidence.textContent = "Not provided by model";
      imageConfidenceBar.style.width = "0%";
      return;
    }

    clearInterval(intervalId);
    setTimeout(() => {
      imageLoading.classList.remove("visible");
      analyzeImageBtn.disabled = false;
      analyzeImageBtn.style.opacity = "1";
      analyzeImageBtn.textContent = "Analyze Image";
    }, 500);
  }

  if (analyzeImageBtn) {
    analyzeImageBtn.addEventListener("click", analyzeUploadedImage);
  }

  const uploadAudioBtn = document.getElementById("uploadAudioBtn");
  const audioInput = document.createElement("input");
  audioInput.type = "file";
  audioInput.accept = ".wav,.mp3,audio/wav,audio/mpeg";
  audioInput.style.display = "none";
  document.body.appendChild(audioInput);
  const audioFileBox = document.getElementById("audioFileBox");
  const analyzeAudioBtn = document.getElementById("analyzeAudioBtn");
  const audioLoading = document.getElementById("audioLoading");
  const waveformPanel = document.getElementById("waveformPanel");
  const waveform = document.querySelector(".waveform");
  const recordingLabel = document.getElementById("recordingLabel");
  const recordStartBtn = document.getElementById("recordStartBtn");
  const recordStopBtn = document.getElementById("recordStopBtn");

  if (uploadAudioBtn) {
    uploadAudioBtn.addEventListener("click", () => audioInput.click());
  }

  audioInput.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (!file) return;
    audioFileBox.textContent = `Selected file: ${file.name}`;
  });

  let mediaRecorder = null;
  let activeAudioStream = null;

  function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      recordingLabel.textContent = "Microphone access is not available in this browser.";
      return;
    }

    const MediaRecorderCtor = window.MediaRecorder || window.webkitMediaRecorder;
    if (!MediaRecorderCtor) {
      recordingLabel.textContent = "Microphone recording is not supported in this browser.";
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        activeAudioStream = stream;
        const mimeType = MediaRecorderCtor.isTypeSupported && MediaRecorderCtor.isTypeSupported("audio/mp4") ? "audio/mp4" : "audio/webm";

        try {
          mediaRecorder = mimeType ? new MediaRecorderCtor(stream, { mimeType }) : new MediaRecorderCtor(stream);
        } catch (error) {
          mediaRecorder = new MediaRecorderCtor(stream);
        }

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioFileBox.textContent = "Selected file: live microphone capture";
          }
        };

        mediaRecorder.start();
        waveform.classList.add("recording");
        recordingLabel.textContent = "Recording bird chirps...";
      })
      .catch(() => {
        recordingLabel.textContent = "Microphone permission was blocked or unavailable.";
      });
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    if (activeAudioStream) {
      activeAudioStream.getTracks().forEach((track) => track.stop());
      activeAudioStream = null;
    }
    waveform.classList.remove("recording");
    recordingLabel.textContent = "Audio captured and ready for analysis";
  }

  if (recordStartBtn) {
    recordStartBtn.addEventListener("click", startRecording);
  }

  if (recordStopBtn) {
    recordStopBtn.addEventListener("click", stopRecording);
  }

  function simulateAudioProcessing() {
    audioLoading.classList.add("visible");
    analyzeAudioBtn.disabled = true;
    analyzeAudioBtn.style.opacity = "0.8";
    waveform.classList.add("recording");
    recordingLabel.textContent = "Processing chirp pattern and frequency bands...";

    setTimeout(() => {
      audioLoading.classList.remove("visible");
      analyzeAudioBtn.disabled = false;
      analyzeAudioBtn.style.opacity = "1";
      waveform.classList.remove("recording");
      recordingLabel.textContent = "Analysis complete";
      audioFileBox.textContent = "Selected file: bird_call_01.wav";
      applyAudioPrediction("Common Myna", 94.2);
    }, 2600);
  }

  if (analyzeAudioBtn) {
    analyzeAudioBtn.addEventListener("click", simulateAudioProcessing);
  }

  const multimodalImageInput = document.getElementById("multimodalImageInput");
  const multimodalAudioInput = document.getElementById("multimodalAudioInput");
  const runMultimodalBtn = document.getElementById("runMultimodalBtn");

  if (runMultimodalBtn) {
    runMultimodalBtn.addEventListener("click", () => {
      runMultimodalBtn.disabled = true;
      runMultimodalBtn.style.opacity = "0.75";
      setTimeout(() => {
        runMultimodalBtn.disabled = false;
        runMultimodalBtn.style.opacity = "1";

        const species = detectionState.imageSpecies || "House Sparrow";
        const resultText = document.querySelector(".final-prediction-box strong");
        if (resultText) {
          resultText.textContent = species === "House Sparrow" ? "Rose-ringed Parakeet" : species;
        }
        detectionState.finalSpecies = species === "House Sparrow" ? "Rose-ringed Parakeet" : species;
      }, 2800);
    });
  }

  const tryDemoBtn = document.getElementById("tryDemoBtn");
  const resetAnalysisBtn = document.getElementById("resetAnalysisBtn");

  function setDemoPrediction() {
    const activeThumb = document.querySelector(".gallery-thumb.active");
    const species = activeThumb ? activeThumb.dataset.bird : "House Sparrow";
    const scientific = activeThumb ? activeThumb.dataset.scientific : "Passer domesticus";
    const result = getDemoClassification(species);

    birdPreview.dataset.userUpload = "false";
    setBirdPreview(species, scientific);
    speciesName.textContent = result.species;
    scientificName.textContent = result.scientific;
    imageConfidence.textContent = `${result.confidence}%`;
    imageModel.textContent = result.model;
    imageConfidenceBar.style.width = `${result.confidence}%`;
    document.getElementById("inputTypeValue").textContent = "Image";
    document.getElementById("statusValue").textContent = "Identified";
    audioFileBox.textContent = "Selected file: bird_call_01.wav";
    recordingLabel.textContent = "Demo dataset loaded";
    detectionState.imageSpecies = result.species;
    detectionState.imageScientific = result.scientific;
    detectionState.finalSpecies = result.species;
    const resultText = document.querySelector(".final-prediction-box strong");
    if (resultText) {
      resultText.textContent = detectionState.finalSpecies;
    }
  }

  if (tryDemoBtn) {
    tryDemoBtn.addEventListener("click", () => {
      const gallerySamples = ["House Sparrow", "Common Myna", "Rose-ringed Parakeet", "Rock Pigeon"];
      const activeThumb = document.querySelector(".gallery-thumb.active");
      const activeIndex = activeThumb ? gallerySamples.indexOf(activeThumb.dataset.bird) : -1;
      const nextSpecies = gallerySamples[(activeIndex + 1) % gallerySamples.length];
      const sampleThumb = document.querySelector(`.gallery-thumb[data-bird="${nextSpecies}"]`);
      if (sampleThumb) {
        sampleThumb.click();
      }
      setDemoPrediction();
    });
  }

  if (resetAnalysisBtn) {
    resetAnalysisBtn.addEventListener("click", () => {
      imageInput.value = "";
      audioInput.value = "";
      multimodalImageInput.value = "";
      multimodalAudioInput.value = "";
      audioFileBox.textContent = "No audio uploaded";
      recordingLabel.textContent = "Ready for audio capture";
      resetImageUploadState();
      detectionState.imageSpecies = "House Sparrow";
      detectionState.imageScientific = "Passer domesticus";
      detectionState.finalSpecies = "Rose-ringed Parakeet";
      const resultText = document.querySelector(".final-prediction-box strong");
      if (resultText) {
        resultText.textContent = detectionState.finalSpecies;
      }
    });
  }

  const analyzeAnotherImageBtn = document.getElementById("analyzeAnotherImageBtn");
  if (analyzeAnotherImageBtn) {
    analyzeAnotherImageBtn.addEventListener("click", () => {
      imageInput.value = "";
      imageFileBox.textContent = "No image uploaded";
      analyzeImageBtn.disabled = true;
      analyzeImageBtn.textContent = "Analyze Image";
      imageLoading.classList.remove("visible");
      updateProcessingStatus("Uploading image...", 0);
      birdPreview.src = "assets/birds/house-sparrow.jpg";
      birdPreview.alt = "Bird preview";
      birdPreview.dataset.userUpload = "false";
      speciesName.textContent = "House Sparrow";
      scientificName.textContent = "Passer domesticus";
      imageConfidence.textContent = "96.8%";
      imageModel.textContent = "EfficientNet";
      imageConfidenceBar.style.width = "96.8%";
      document.getElementById("inputTypeValue").textContent = "Image";
      document.getElementById("statusValue").textContent = "Identified";
      galleryThumbs.forEach((thumb) => thumb.classList.remove("active"));
      const defaultThumb = document.querySelector('.gallery-thumb[data-bird="House Sparrow"]');
      if (defaultThumb) {
        defaultThumb.classList.add("active");
      }
    });
  }

  const labels = ["ResNet", "EfficientNet", "Multimodal Model", "MobileNet"];
  const values = [85, 85, 85, 85];

  const ctx = document.getElementById("modelComparisonChart");
  if (ctx) {
    new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Accuracy (%)",
            data: values,
            backgroundColor: [
              "rgba(90, 154, 129, 0.7)",
              "rgba(82, 213, 169, 0.8)",
              "rgba(43, 162, 107, 0.8)",
              "rgba(113, 142, 131, 0.7)"
            ],
            borderRadius: 10,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${context.parsed.y}%`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            min: 85,
            max: 100,
            ticks: {
              callback: (value) => `${value}%`
            },
            grid: {
              color: "rgba(255,255,255,0.08)"
            },
            title: {
              display: true,
              text: "Accuracy"
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: "#dfece7"
            }
          }
        }
      }
    });
  }

  document.querySelectorAll(".ring").forEach((ring) => {
    const value = ring.dataset.value;
    ring.style.setProperty("--value", value);
    ring.style.setProperty("--ring-color", ring.classList.contains("ring-accuracy") ? "#52d5a9" : ring.classList.contains("ring-precision") ? "#7bd3d1" : ring.classList.contains("ring-recall") ? "#8bc2ff" : "#d4dca2");
  });

  setDemoPrediction();
});
