const canvas = document.getElementById("pdf-render");
const ctx = canvas.getContext("2d");
let pdfDoc = null, pdfLibInstance = null, currentPage = 1;

const fileInput = document.getElementById("upload");
fileInput.addEventListener("change", loadPdf);

async function loadPdf(e) {
  const file = e.target.files[0];
  const typedArray = new Uint8Array(await file.arrayBuffer());
  pdfDoc = await pdfjsLib.getDocument(typedArray).promise;
  pdfLibInstance = await PDFLib.PDFDocument.load(typedArray);
  renderPage(currentPage);
}

async function renderPage(pageNum) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1 });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: ctx, viewport }).promise;
}

// Add Text
document.getElementById("add-text").addEventListener("click", async () => {
  const text = document.getElementById("text-input").value.trim();
  if (!text) return alert("Enter some text.");
  pdfLibInstance.getPage(0).drawText(text, { x: 100, y: 500, size: 12 });
  alert("Text added!");
});

// Rotate Page
document.getElementById("rotate-page").addEventListener("click", () => {
  const page = pdfLibInstance.getPage(0);
  page.setRotation((page.getRotation().angle + 90) % 360);
  alert("Page rotated!");
});

// Merge PDFs
document.getElementById("merge-pdf").addEventListener("click", async () => {
  const mergeInput = document.createElement("input");
  mergeInput.type = "file";
  mergeInput.accept = "application/pdf";
  mergeInput.onchange = async (e) => {
    const file = e.target.files[0];
    const mergeBytes = new Uint8Array(await file.arrayBuffer());
    const mergePdf = await PDFLib.PDFDocument.load(mergeBytes);
    const pages = await pdfLibInstance.copyPages(mergePdf, mergePdf.getPageIndices());
    pages.forEach((page) => pdfLibInstance.addPage(page));
    alert("PDFs merged!");
  };
  mergeInput.click();
});

// Split PDF
document.getElementById("split-pdf").addEventListener("click", async () => {
  const start = parseInt(prompt("Start page:")) - 1;
  const end = parseInt(prompt("End page:")) - 1;
  const newPdf = await PDFLib.PDFDocument.create();
  const pages = await newPdf.copyPages(pdfLibInstance, Array.from({ length: end - start + 1 }, (_, i) => start + i));
  pages.forEach((page) => newPdf.addPage(page));
  const newBytes = await newPdf.save();
  downloadFile(newBytes, "split.pdf");
});

// Add Signature
document.getElementById("add-signature").addEventListener("click", async () => {
  const sigCanvas = document.createElement("canvas");
  sigCanvas.width = 300;
  sigCanvas.height = 150;
  const modal = showModal(sigCanvas);
  const sigCtx = sigCanvas.getContext("2d");
  let drawing = false;

  sigCanvas.addEventListener("mousedown", () => (drawing = true));
  sigCanvas.addEventListener("mouseup", () => (drawing = false));
  sigCanvas.addEventListener("mousemove", (e) => {
    if (drawing) {
      sigCtx.lineTo(e.offsetX, e.offsetY);
      sigCtx.stroke();
    }
  });

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save Signature";
  saveBtn.onclick = async () => {
    const sigData = sigCanvas.toDataURL();
    const sigBytes = await fetch(sigData).then((res) => res.arrayBuffer());
    const sigImage = await pdfLibInstance.embedPng(sigBytes);
    pdfLibInstance.getPage(0).drawImage(sigImage, { x: 100, y: 100, width: 150, height: 50 });
    document.body.removeChild(modal);
    alert("Signature added!");
  };
  modal.appendChild(saveBtn);
});

// Add Password Protection
document.getElementById("add-password").addEventListener("click", async () => {
  const password = prompt("Enter password:");
  const pdfBytes = await pdfLibInstance.save({ password });
  downloadFile(pdfBytes, "protected.pdf");
});

// Download PDF
document.getElementById("download").addEventListener("click", async () => {
  const pdfBytes = await pdfLibInstance.save();
  downloadFile(pdfBytes, "edited.pdf");
});

// Utility Functions
function showModal(content) {
  const modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.top = "50%";
  modal.style.left = "50%";
  modal.style.transform = "translate(-50%, -50%)";
  modal.style.padding = "20px";
  modal.style.backgroundColor = "#fff";
  modal.style.border = "1px solid #ccc";
  modal.appendChild(content);
  document.body.appendChild(modal);
  return modal;
}

function downloadFile(data, filename) {
  const blob = new Blob([data], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
