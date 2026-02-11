const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const previewList = document.getElementById("previewList");
const extractBtn = document.getElementById("extractBtn");
const output = document.getElementById("output");
const statusText = document.getElementById("status");
const progressWrap = document.querySelector(".progress");
const progressImg = document.getElementById("progressImg");
const progressBar = document.getElementById("progressBar");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");
const langSelect = document.getElementById("langSelect");
const confidence = document.getElementById("confidence");
const confidenceValue = document.getElementById("confidenceValue");

let currentImageFiles = [];

const setStatus = (message) => {
  statusText.textContent = message;
};

const setProgress = (value) => {
  progressBar.style.width = `${value}%`;
  if (value > 0 && value < 100) {
    progressWrap.style.display = "block";
    progressImg.style.display = "block";
    progressImg.style.visibility = "visible";
    progressBar.style.display = "block";
  } else {
    progressWrap.style.display = value === 100 ? "block" : "none";
    progressImg.style.display = "none";
    progressImg.style.visibility = "hidden";
    progressBar.style.display = value === 100 ? "block" : "none";
    progressBar.style.width = value === 100 ? "100%" : "0%";
  }
};

const enableOutputActions = (enabled) => {
  copyBtn.disabled = !enabled;
  downloadBtn.disabled = !enabled;
};

const resetPreview = () => {
  previewList.innerHTML = "";
  dropzone.querySelector(".dropzone-content").style.display = "grid";
  extractBtn.disabled = true;
};

const loadPreviews = (files) => {
  previewList.innerHTML = "";
  dropzone.querySelector(".dropzone-content").style.display = "none";
  extractBtn.disabled = false;
  Array.from(files).forEach((file, idx) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement("img");
      img.src = event.target.result;
      img.alt = `Preview ${idx + 1}`;
      img.style.width = "96px";
      img.style.height = "96px";
      img.style.objectFit = "contain";
      img.style.borderRadius = "12px";
      img.style.border = "1px solid #a18ad6";
      previewList.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
};

const handleFiles = (files) => {
  const validFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
  if (validFiles.length === 0) {
    setStatus("Please choose image files.");
    return;
  }
  currentImageFiles = validFiles;
  loadPreviews(validFiles);
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
  if (!currentImageFiles.length) {
    return;
  }

  output.value = "";
  enableOutputActions(false);
  setProgress(1); // Show progress image immediately
  setStatus("Working on OCR... this can take a moment.");

  let allText = "";
  for (let i = 0; i < currentImageFiles.length; i++) {
    try {
      const { data } = await Tesseract.recognize(currentImageFiles[i], langSelect.value, {
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

      allText += `--- Image ${i + 1} ---\n`;
      allText += filteredLines.trim() || data.text.trim();
      allText += "\n\n";
    } catch (error) {
      allText += `--- Image ${i + 1} ---\nError extracting text.\n\n`;
    }
  }
  output.value = allText.trim();
  setStatus("Extraction complete.");
  setProgress(100);
  enableOutputActions(output.value.length > 0);
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
  currentImageFiles = [];
  output.value = "";
  setStatus("Drop an image to get started.");
  setProgress(0);
  enableOutputActions(false);
  resetPreview();
});

// Remove progress bar logic
// No progressBar element anymore

// Show GIF only during OCR
// Already handled by setProgress
resetPreview();
