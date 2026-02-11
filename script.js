const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const preview = document.getElementById("preview");
const extractBtn = document.getElementById("extractBtn");
const output = document.getElementById("output");
const statusText = document.getElementById("status");
const progressBar = document.getElementById("progressBar");
const progressWrap = document.querySelector(".progress");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");
const langSelect = document.getElementById("langSelect");
const confidence = document.getElementById("confidence");
const confidenceValue = document.getElementById("confidenceValue");

let currentImageFile = null;

const setStatus = (message) => {
  statusText.textContent = message;
};

const setProgress = (value) => {
  progressBar.style.width = `${value}%`;
  progressWrap.style.display = value > 0 && value < 100 ? "block" : "none";
};

const enableOutputActions = (enabled) => {
  copyBtn.disabled = !enabled;
  downloadBtn.disabled = !enabled;
};

const resetPreview = () => {
  preview.src = "";
  preview.style.display = "none";
  dropzone.querySelector(".dropzone-content").style.display = "grid";
  extractBtn.disabled = true;
};

const loadPreview = (file) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    preview.src = event.target.result;
    preview.style.display = "block";
    dropzone.querySelector(".dropzone-content").style.display = "none";
    extractBtn.disabled = false;
  };
  reader.readAsDataURL(file);
};

const handleFiles = (files) => {
  const file = files[0];
  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    setStatus("Please choose an image file.");
    return;
  }

  currentImageFile = file;
  loadPreview(file);
  setStatus("Ready to extract text.");
};

uploadBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (event) => handleFiles(event.target.files));

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", (event) => {
  handleFiles(event.dataTransfer.files);
});

confidence.addEventListener("input", () => {
  confidenceValue.textContent = confidence.value;
});

extractBtn.addEventListener("click", async () => {
  if (!currentImageFile) {
    return;
  }

  output.value = "";
  enableOutputActions(false);
  setProgress(0);
  setStatus("Working on OCR... this can take a moment.");

  try {
    const { data } = await Tesseract.recognize(currentImageFile, langSelect.value, {
      logger: (message) => {
        if (message.status === "recognizing text") {
          setProgress(Math.round(message.progress * 100));
        }
      },
    });

    const minConfidence = Number(confidence.value);
    const filteredLines = data.lines
      .map((line) => {
        const words = line.words || [];
        const kept = words.filter((word) => word.confidence >= minConfidence);
        const averageConfidence =
          words.reduce((total, word) => total + word.confidence, 0) /
          Math.max(words.length, 1);

        if (kept.length === 0 && averageConfidence < minConfidence) {
          return "";
        }

        return (kept.length > 0 ? kept : words).map((word) => word.text).join(" ");
      })
      .filter((line) => line.trim().length > 0)
      .join("\n");

    output.value = filteredLines.trim() || data.text.trim();
    setStatus("Extraction complete.");
    setProgress(100);
    enableOutputActions(output.value.length > 0);
  } catch (error) {
    console.error(error);
    setStatus("Something went wrong. Please try another image.");
    setProgress(0);
  }
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(output.value);
    setStatus("Copied to clipboard.");
  } catch (error) {
    setStatus("Copy failed. Please select and copy manually.");
  }
});

downloadBtn.addEventListener("click", () => {
  const blob = new Blob([output.value], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "extracted-text.txt";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});

clearBtn.addEventListener("click", () => {
  currentImageFile = null;
  output.value = "";
  setStatus("Drop an image to get started.");
  setProgress(0);
  enableOutputActions(false);
  resetPreview();
});

resetPreview();
