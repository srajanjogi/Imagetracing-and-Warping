window.initLegacyApp = function () {
let currentWarpType = null;
let originalImageSnapshot = null;
let meshSource = null;
let hideMeshOverlayWhileDragging = true;
let lastX = 0;
let lastY = 0;
// 🔧 REQUIRED for mesh
const INFLUENCE_RADIUS = 120;
const INFLUENCE_STRENGTH = 0.35;
let isManualColor = false; // Starts as false so we see original photo colors first
let selectedTool = 'pencil';
document.querySelectorAll('.tool-icon').forEach(icon => {
    icon.onclick = () => {
        document.querySelectorAll('.tool-icon').forEach(i => i.classList.remove('selected'));
        icon.classList.add('selected');
        selectedTool = icon.getAttribute('data-tool');
    };
});

const colorNames = [{ name: "White", r: 255, g: 255, b: 255 }, { name: "Black", r: 0, g: 0, b: 0 }, { name: "Gray", r: 128, g: 128, b: 128 }, { name: "Red", r: 255, g: 0, b: 0 }, { name: "Orange", r: 255, g: 165, b: 0 }, { name: "Gold", r: 255, g: 215, b: 0 }, { name: "Yellow", r: 255, g: 255, b: 0 }, { name: "Green", r: 0, g: 128, b: 0 }, { name: "Cyan", r: 0, g: 255, b: 255 }, { name: "Blue", r: 0, g: 0, b: 255 }, { name: "Purple", r: 128, g: 0, b: 128 }, { name: "Pink", r: 255, g: 192, b: 203 }, { name: "Magenta", r: 255, g: 0, b: 255 }];
function getProperName(r, g, b) { let minDist = Infinity, bestName = "Unknown"; colorNames.forEach(c => { const d = Math.sqrt((r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2); if (d < minDist) { minDist = d; bestName = c.name } }); return bestName }

let baseRGB = { r: 255, g: 255, b: 255 },
    cursorX = 0,
    cursorY = 0,
    activeImg = null,
    edgeMode = false,
    grayEdgeMode = false,
    isBlackBg = false;

const canvas = document.getElementById('imageCanvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
const overlay = document.getElementById('overlayCanvas'), oCtx = overlay.getContext('2d');
ctx.imageSmoothingEnabled = false;
oCtx.imageSmoothingEnabled = false;

const zoomCanvas = document.getElementById('zoomCanvas'), zCtx = zoomCanvas.getContext('2d');
const recCanvas = document.getElementById('recorderCanvas'), rCtx = recCanvas.getContext('2d');
zCtx.imageSmoothingEnabled = false;

function applyOpenCVCannyWithOriginalColor(imageData) {
    const threshold = parseInt(document.getElementById('edgeStrength').value);
    const w = imageData.width;
    const h = imageData.height;

    let src = cv.matFromImageData(imageData);
    let gray = new cv.Mat();
    let edges = new cv.Mat();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(3, 3), 0);
    cv.Canny(gray, edges, threshold, threshold * 2, 3, false);

    let output = new ImageData(w, h);
    const srcData = imageData.data;
    const edgeData = edges.data;

    // Calculate picker color (including darkness slider)
    const pct = document.getElementById('darknessSlider').value / 100;
    const f = 1 - pct;
    const rTarget = Math.round(baseRGB.r * f);
    const gTarget = Math.round(baseRGB.g * f);
    const bTarget = Math.round(baseRGB.b * f);

    for (let i = 0; i < edgeData.length; i++) {
        const idx = i * 4;
        if (edgeData[i]) {
            if (isManualColor) {
                // UPDATE: Use the color you clicked in the grid/square
                output.data[idx] = rTarget;
                output.data[idx + 1] = gTarget;
                output.data[idx + 2] = bTarget;
            } else {
                // DEFAULT: Use the photo's original pixel color
                output.data[idx] = srcData[idx];
                output.data[idx + 1] = srcData[idx + 1];
                output.data[idx + 2] = srcData[idx + 2];
            }
            output.data[idx + 3] = 255;
        } else {
            output.data[idx + 3] = 0;
        }
    }

    src.delete(); gray.delete(); edges.delete();
    return output;
}
function applyOpenCVSobelGray(imageData) {
    const threshold = parseInt(document.getElementById('edgeStrength').value);

    let src = cv.matFromImageData(imageData);
    let gray = new cv.Mat();
    let gradX = new cv.Mat();
    let gradY = new cv.Mat();
    let absX = new cv.Mat();
    let absY = new cv.Mat();
    let edges = new cv.Mat();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    cv.Sobel(gray, gradX, cv.CV_16S, 1, 0, 3);
    cv.Sobel(gray, gradY, cv.CV_16S, 0, 1, 3);

    cv.convertScaleAbs(gradX, absX);
    cv.convertScaleAbs(gradY, absY);
    cv.addWeighted(absX, 0.5, absY, 0.5, 0, edges);

    let output = new ImageData(edges.cols, edges.rows);

    for (let i = 0; i < edges.data.length; i++) {
        const val = edges.data[i];
        const idx = i * 4;

        if (val > threshold) {
            // bright gray / white line
            output.data[idx] = val;
            output.data[idx + 1] = val;
            output.data[idx + 2] = val;
            output.data[idx + 3] = 255;
        } else {
            // transparent background (black canvas shows)
            output.data[idx + 3] = 0;
        }
    }

    src.delete(); gray.delete(); gradX.delete(); gradY.delete();
    absX.delete(); absY.delete(); edges.delete();

    return output;
}
document.getElementById('meshSliderBox').style.display = "none";


/* ---------- WARP FUNCTIONS ---------- */
function warpImage(type) {
    if (!activeImg) return;

    const w = canvas.width;
    const h = canvas.height;

    const temp = document.createElement('canvas');
    temp.width = w;
    temp.height = h;
    const tCtx = temp.getContext('2d');
    tCtx.drawImage(activeImg, 0, 0, w, h);

    const srcData = tCtx.getImageData(0, 0, w, h);
    const dstData = ctx.createImageData(w, h);

    // ✅ PRE-FILL (prevents gaps)
    dstData.data.set(srcData.data);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let dx = x - cx;
            let dy = y - cy;
            let r = Math.hypot(dx, dy);
            let theta = Math.atan2(dy, dx);

            let nr = r;
            let nt = theta;

            switch (type) {
                case 'fisheye':
                    nr = radius * Math.pow(r / radius, 0.6);
                    break;
                case 'bulge':
                    nr = r + Math.sin((r / radius) * Math.PI) * 25;
                    break;
                case 'pinch':
                    nr = r - Math.sin((r / radius) * Math.PI) * 25;
                    break;
                case 'twist':
                    nt = theta + (radius - r) / radius * Math.PI;
                    break;
                case 'swirl':
                    nt = theta + (radius - r) / radius * Math.PI * 2;
                    break;
                case 'wave':
                    nr = r + Math.sin(theta * 10) * 12;
                    break;
                case 'ripple':
                    nr = r + Math.sin(r / 6) * 6;
                    break;
            }

            const sx = Math.round(cx + nr * Math.cos(nt));
            const sy = Math.round(cy + nr * Math.sin(nt));

            if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;

            const si = (sy * w + sx) * 4;
            const di = (y * w + x) * 4;

            dstData.data[di] = srcData.data[si];
            dstData.data[di + 1] = srcData.data[si + 1];
            dstData.data[di + 2] = srcData.data[si + 2];
            dstData.data[di + 3] = srcData.data[si + 3];
        }
    }

    ctx.putImageData(dstData, 0, 0);
}


let meshGrid = [];
let meshRows = 4;
let meshCols = 4;

let draggingNode = null;
let isMeshActive = false;

let tCanvas = document.createElement('canvas');
let tCtx = tCanvas.getContext('2d');

function initMesh() {
    meshGrid = [];

    for (let y = 0; y <= meshRows; y++) {
        for (let x = 0; x <= meshCols; x++) {

            const gx = (x / meshCols) * canvas.width;
            const gy = (y / meshRows) * canvas.height;

            meshGrid.push({
                x: gx,
                y: gy,

                // ORIGINAL IMAGE SPACE (never changes)
                origX: gx,
                origY: gy
            });
        }
    }
}


function enableMeshWarp() {
    draggingNode = null;

    if (!activeImg) return;

    isMeshActive = true;

    tCanvas.width = canvas.width;
    tCanvas.height = canvas.height;

    // freeze original image (VERY IMPORTANT)
    tCtx.clearRect(0, 0, canvas.width, canvas.height);
    tCtx.drawImage(canvas, 0, 0);

    initMesh();
    drawOverlay();
}



function applyMeshWarp() {
    if (!isMeshActive) return;
    const w = canvas.width;
    const h = canvas.height;
    const src = tCtx.getImageData(0, 0, w, h);
    const dst = ctx.createImageData(w, h);

    // FILL BACKGROUND WHITE
    for (let i = 0; i < dst.data.length; i += 4) {
        dst.data[i] = 255;     // R
        dst.data[i + 1] = 255; // G
        dst.data[i + 2] = 255; // B
        dst.data[i + 3] = 255; // A (Must be 255 to prevent black screen)
    }

    for (let y = 0; y < h; y++) {
        const v = (y / h) * meshRows;
        const row = Math.floor(v);
        const fy = v - row;
        if (row < 0 || row >= meshRows) continue;

        for (let x = 0; x < w; x++) {
            const u = (x / w) * meshCols;
            const col = Math.floor(u);
            const fx = u - col;
            if (col < 0 || col >= meshCols) continue;

            const i = row * (meshCols + 1) + col;

            const n0 = meshGrid[i];
            const n1 = meshGrid[i + 1];
            const n2 = meshGrid[i + meshCols + 1];
            const n3 = meshGrid[i + meshCols + 2];

            // source position
            const sx =
                n0.origX * (1 - fx) * (1 - fy) +
                n1.origX * fx * (1 - fy) +
                n2.origX * (1 - fx) * fy +
                n3.origX * fx * fy;

            const sy =
                n0.origY * (1 - fx) * (1 - fy) +
                n1.origY * fx * (1 - fy) +
                n2.origY * (1 - fx) * fy +
                n3.origY * fx * fy;

            // destination position
            const dx =
                n0.x * (1 - fx) * (1 - fy) +
                n1.x * fx * (1 - fy) +
                n2.x * (1 - fx) * fy +
                n3.x * fx * fy;

            const dy =
                n0.y * (1 - fx) * (1 - fy) +
                n1.y * fx * (1 - fy) +
                n2.y * (1 - fx) * fy +
                n3.y * fx * fy;

            const tx = Math.floor(dx);
            const ty = Math.floor(dy);

            if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;

            const ssx = Math.floor(sx);
            const ssy = Math.floor(sy);
            if (ssx < 0 || ssy < 0 || ssx >= w || ssy >= h) continue;

            const si = (ssy * w + ssx) * 4;

            // 🔥 PIXEL BLEED — THIS removes white mesh lines
            for (let oy = 0; oy <= 1; oy++) {
                for (let ox = 0; ox <= 1; ox++) {
                    const px = tx + ox;
                    const py = ty + oy;

                    if (px < 0 || py < 0 || px >= w || py >= h) continue;

                    const di = (py * w + px) * 4;

                    dst.data[di] = src.data[si];
                    dst.data[di + 1] = src.data[si + 1];
                    dst.data[di + 2] = src.data[si + 2];
                    dst.data[di + 3] = 255;
                }
            }
        }
    }

    ctx.putImageData(dst, 0, 0);
}
const meshSlider = document.getElementById('meshSlider');
const meshValue = document.getElementById('meshValue');

meshSlider.oninput = () => {
    meshRows = meshCols = parseInt(meshSlider.value);
    meshValue.innerText = `${meshRows} × ${meshCols}`;

    if (isMeshActive) {
        initMesh();      // rebuild grid
        applyMeshWarp(); // redraw image
        drawOverlay();   // redraw mesh lines
    }
};
canvas.onmousedown = e => {
    if (!isMeshActive) return;

    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;

    // Allow a slightly larger hit area and allow dragging border nodes too
    const node = meshGrid.find(n => Math.hypot(n.x - mx, n.y - my) < 18);

    draggingNode = node || null;
};


let isWarping = false;
window.onmousemove = e => {
    if (!draggingNode || !isMeshActive || isWarping) return;

    // 1. Calculate the movement
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;

    const dx = mx - draggingNode.x;
    const dy = my - draggingNode.y;

    draggingNode.x = mx;
    draggingNode.y = my;

    // 2. Influence neighbors
    meshGrid.forEach(n => {
        if (n === draggingNode) return;
        const dist = Math.hypot(n.x - draggingNode.x, n.y - draggingNode.y);
        if (dist < INFLUENCE_RADIUS) {
            const falloff = 1 - dist / INFLUENCE_RADIUS;
            const strength = falloff * INFLUENCE_STRENGTH;
            n.x += dx * strength;
            n.y += dy * strength;
        }
    });

    // 3. Request a single clean draw frame
    isWarping = true;
    requestAnimationFrame(() => {
        applyMeshWarp();
        drawOverlay();
        isWarping = false;
    });
};


window.onmouseup = () => draggingNode = null;

function drawOverlay() {
    oCtx.clearRect(0, 0, overlay.width, overlay.height);
    if (!isMeshActive) return;

    oCtx.strokeStyle = "#0078d4";
    oCtx.fillStyle = "#fff";
    oCtx.lineWidth = 1;

    for (let i = 0; i < meshGrid.length; i++) {
        const n = meshGrid[i];

        if ((i + 1) % (meshCols + 1) !== 0) {
            oCtx.beginPath();
            oCtx.moveTo(n.x, n.y);
            oCtx.lineTo(meshGrid[i + 1].x, meshGrid[i + 1].y);
            oCtx.stroke();
        }

        if (i < meshGrid.length - (meshCols + 1)) {
            oCtx.beginPath();
            oCtx.moveTo(n.x, n.y);
            oCtx.lineTo(meshGrid[i + meshCols + 1].x, meshGrid[i + meshCols + 1].y);
            oCtx.stroke();
        }
    }

    meshGrid.forEach(n => {
        oCtx.beginPath();
        oCtx.arc(n.x, n.y, 4, 0, Math.PI * 2);
        oCtx.fill();
        oCtx.stroke();
    });
}
function resetWarp() {
    if (!originalImageSnapshot) return;

    // reset visible image
    ctx.putImageData(originalImageSnapshot, 0, 0);

    // reset mesh correctly
    if (currentWarpType === 'mesh' && isMeshActive) {
        draggingNode = null;

        // 🔧 RESET mesh source image
        tCtx.clearRect(0, 0, canvas.width, canvas.height);
        tCtx.putImageData(originalImageSnapshot, 0, 0);

        initMesh();
        drawOverlay();
    }
}

document.getElementById('resetWarpBtn').onclick = resetWarp;
function applyChanges() {
    const pct = document.getElementById('darknessSlider').value / 100, f = 1 - pct, r = Math.round(baseRGB.r * f), g = Math.round(baseRGB.g * f), b = Math.round(baseRGB.b * f);
    document.getElementById('previewBar').style.backgroundColor = `rgb(${r},${g},${b})`;
    document.getElementById('hexText').value = "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase();
    document.getElementById('rNum').value = r; document.getElementById('gNum').value = g; document.getElementById('bNum').value = b;
    const c = document.getElementById('squareCursor'); c.style.left = cursorX + 'px'; c.style.top = cursorY + 'px';
    const t = document.getElementById('colorTooltip'); t.style.display = 'block'; t.style.left = cursorX + 'px'; t.style.top = cursorY + 'px'; t.innerText = getProperName(r, g, b);
    const bHex = "#" + [baseRGB.r, baseRGB.g, baseRGB.b].map(v => v.toString(16).padStart(2, "0")).join("");
    document.getElementById('darknessSlider').style.background = `linear-gradient(to right, ${bHex}, #000)`;
    if (activeImg) {
        document.getElementById('imgContainer').style.background =
            (isBlackBg && (edgeMode || grayEdgeMode)) ? "#000" : "#fff";


        ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(activeImg, 0, 0, canvas.width, canvas.height);
        let imgD = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (edgeMode && !grayEdgeMode) {
            imgD = applyOpenCVCannyWithOriginalColor(imgD); // Use the function you defined
        } else if (grayEdgeMode) {
            imgD = applyOpenCVSobelGray(imgD);
        }


        ctx.putImageData(imgD, 0, 0);
    }
}
const warpBtn = document.getElementById('warpBtn');
const warpOptions = document.getElementById('warpOptions');

warpBtn.onclick = () => {
    if (!activeImg) {
        alert("Upload image first");
        return;
    }

    // toggle warp options
    warpOptions.style.display =
        warpOptions.style.display === "grid" ? "none" : "grid";
};

document.getElementById('resetWarpBtn').onclick = resetWarp;

document.querySelectorAll('.warp-type').forEach(btn => {
    btn.onclick = () => {
        const type = btn.dataset.type;

        if (type === 'mesh') {
            currentWarpType = 'mesh';   // ✅ ADD
            document.getElementById('meshSliderBox').style.display = "block";
            enableMeshWarp();
            return;
        }


        // ✅ turn OFF mesh when other warps are used
        isMeshActive = false;
        oCtx.clearRect(0, 0, overlay.width, overlay.height);
        document.getElementById('meshSliderBox').style.display = "none";

        currentWarpType = type;
        warpImage(type);
    };
});


document.getElementById('edgeBtn').onclick = () => {
    // If we are already in Edge Mode, clicking this button again 
    // will reset it to use the original photo colors.
    if (edgeMode) {
        isManualColor = false;
    }

    edgeMode = !edgeMode;
    const b = document.getElementById('edgeBtn');
    b.classList.toggle('active');
    b.innerText = edgeMode ? "Edges ON" : "Detect Edges";

    // Show/hide the Gray/BG row ONLY based on edge detection state
    const extraRow = document.getElementById('edgeExtraRow');
    if (extraRow) extraRow.style.display = edgeMode ? "flex" : "none";

    const bgBtn = document.getElementById('bgToggleBtn');
    if (bgBtn) bgBtn.style.display = edgeMode ? "block" : "none";

    // When turning edges off, also reset Gray Edges state
    if (!edgeMode) {
        grayEdgeMode = false;
        const grayBtn = document.getElementById('grayEdgeBtn');
        if (grayBtn) grayBtn.classList.remove('active');
    }

    applyChanges();
};
document.getElementById('grayEdgeBtn').onclick = () => {
    // Toggle gray-edge rendering, but do NOT affect edgeMode
    grayEdgeMode = !grayEdgeMode;

    document.getElementById('grayEdgeBtn').classList.toggle('active');

    applyChanges();
};


document.getElementById('bgToggleBtn').onclick = () => {
    isBlackBg = !isBlackBg; document.getElementById('bgToggleBtn').innerText = isBlackBg ? "BG: White" : "BG: Black"; applyChanges();
};

document.getElementById('toggleSlider').onchange = (e) => {
    document.getElementById('sliderContainer').style.display = e.target.checked ? "block" : "none";
};
document.getElementById('edgeStrength').oninput = (e) => {
    document.getElementById('strengthText').innerText = "Level: " + e.target.value; applyChanges();
};

document.getElementById('uploadBtn').onclick = () => {
    isManualColor = false;
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = e => {
        const reader = new FileReader();
        reader.onload = event => {
            const img = new Image();
            img.onload = () => {
                activeImg = img;

                // Make canvas exactly match the current preview box,
                // then letterbox the image inside (mesh covers full preview).
                const c = document.getElementById('imgContainer');
                const boxW = c ? c.clientWidth || 500 : 500;
                const boxH = c ? c.clientHeight || 260 : 260;

                canvas.width = boxW;
                canvas.height = boxH;
                overlay.width = boxW;
                overlay.height = boxH;
                recCanvas.width = boxW;
                recCanvas.height = boxH;

                // Compute image draw size to fit inside box while preserving aspect
                const imgAspect = img.width / img.height;
                const boxAspect = boxW / boxH;
                let drawW, drawH, offsetX, offsetY;

                if (imgAspect > boxAspect) {
                    // image is wider: fit width, letterbox vertically
                    drawW = boxW;
                    drawH = boxW / imgAspect;
                    offsetX = 0;
                    offsetY = (boxH - drawH) / 2;
                } else {
                    // image is taller: fit height, letterbox horizontally
                    drawH = boxH;
                    drawW = boxH * imgAspect;
                    offsetX = (boxW - drawW) / 2;
                    offsetY = 0;
                }

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

                // show the untouched original in column 1
                const orig = document.getElementById('originalPreview');
                if (orig) {
                    orig.src = event.target.result;
                }

                applyChanges();
                applyChanges();
                originalImageSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

                if (window.onLegacyImageLoaded) {
                    window.onLegacyImageLoaded();
                }

            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(e.target.files[0]);
    };
    input.click();
};

canvas.addEventListener('mousemove', (e) => {
    if (!activeImg) return; const r = canvas.getBoundingClientRect(), x = Math.floor(e.clientX - r.left), y = Math.floor(e.clientY - r.top);
    zCtx.clearRect(0, 0, 15, 15); zCtx.drawImage(canvas, x - 7, y - 7, 15, 15, 0, 0, 15, 15);
    document.getElementById('pixelCoords').innerText = `X: ${x}, Y: ${y}`;
});

document.getElementById('rainbowSquare').addEventListener('mousedown', (e) => {
    isManualColor = true; // <--- ADD THIS LINE HERE

    const r = e.currentTarget.getBoundingClientRect();
    cursorX = e.clientX - r.left;
    cursorY = e.clientY - r.top;

    const tc = document.createElement('canvas');
    tc.width = 250; tc.height = 250;
    const t = tc.getContext('2d');

    // Redraw the gradient internally to pick the color
    const g = t.createLinearGradient(0, 0, 250, 0);
    ['#f00', '#ff0', '#0f0', '#0ff', '#00f', '#f0f', '#f00'].forEach((c, i) => g.addColorStop(i / 6, c));
    t.fillStyle = g; t.fillRect(0, 0, 250, 250);

    const w = t.createLinearGradient(0, 250, 0, 0);
    w.addColorStop(0, '#fff'); w.addColorStop(1, 'transparent');
    t.fillStyle = w; t.fillRect(0, 0, 250, 250);

    const p = t.getImageData(cursorX, cursorY, 1, 1).data;
    baseRGB = { r: p[0], g: p[1], b: p[2] };

    applyChanges(); // This now uses the manual color
});

document.getElementById('darknessSlider').addEventListener('input', applyChanges);

let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let autoStopTimer = null;
let lastRecordedTimelapseBlob = null;

/* ---------- CREATE TIMELAPSE ---------- */
document.getElementById('timelapseBtn').onclick = async () => {
    if (!activeImg) return alert("Please upload an image first");

    const timelapseBtnEl = document.getElementById('timelapseBtn');
    const videoTimeEl = document.getElementById('videoTime');
    timelapseBtnEl.disabled = true;
    recordedChunks = [];
    isRecording = true;

    /* ---------- VIDEO STREAM ---------- */
    const stream = recCanvas.captureStream(60);
    mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });

    mediaRecorder.ondataavailable = e => recordedChunks.push(e.data);

    mediaRecorder.onstop = () => {
        clearTimeout(autoStopTimer);

        lastRecordedTimelapseBlob = new Blob(recordedChunks, { type: "video/webm" });
        isRecording = false;
        timelapseBtnEl.disabled = false;
        oCtx.clearRect(0, 0, overlay.width, overlay.height);

        alert("Tracing completed. Click Export to save video.");
    };

    mediaRecorder.start();

    /* ---------- AUTO STOP BASED ON DURATION (same as Video Duration dropdown) ---------- */
    const durationSec = parseInt(videoTimeEl.value || 10, 10);

    /* ---------- PREPARE DRAWING DATA ---------- */
    const pct = darknessSlider.value / 100;
    const factor = 1 - pct;

    const temp = document.createElement('canvas');
    temp.width = canvas.width;
    temp.height = canvas.height;
    const tCtx = temp.getContext('2d');
    tCtx.drawImage(activeImg, 0, 0, canvas.width, canvas.height);

    const edgeData = applyOpenCVCannyWithOriginalColor(
        tCtx.getImageData(0, 0, canvas.width, canvas.height),
        baseRGB.r,
        baseRGB.g,
        baseRGB.b
    );


    const w = canvas.width;
    const h = canvas.height;

    /* ---------- EDGE GROUPING ---------- */
    const edgeMap = new Uint8Array(w * h);
    for (let i = 0; i < edgeData.data.length; i += 4) {
        if (edgeData.data[i + 3] > 0) edgeMap[i / 4] = 1;
    }

    const visited = new Uint8Array(w * h);
    const objects = [];

    for (let i = 0; i < edgeMap.length; i++) {
        if (edgeMap[i] && !visited[i]) {
            const stack = [i], obj = [];
            visited[i] = 1;
            while (stack.length) {
                const p = stack.pop();
                obj.push(p);
                const x = p % w, y = Math.floor(p / w);
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const ni = (y + dy) * w + (x + dx);
                        if (ni >= 0 && ni < w * h && edgeMap[ni] && !visited[ni]) {
                            visited[ni] = 1;
                            stack.push(ni);
                        }
                    }
                }
            }
            if (obj.length > 60) objects.push(obj);
        }
    }

    objects.sort((a, b) => b.length - a.length);

    ctx.fillStyle = isBlackBg ? "#000" : "#fff";
    ctx.fillRect(0, 0, w, h);

    /* ---------- SPEED CALCULATION (FIT DRAWING INTO TIME) ---------- */
    const totalPixels = objects.reduce((s, o) => s + o.length, 0);
    const totalFrames = durationSec * 60;
    const pixelsPerFrame = Math.max(1, Math.ceil(totalPixels / totalFrames));

    let objIndex = 0, path = [], pathIndex = 0, current = null;

    function nextObject() {
        if (objIndex >= objects.length) return false;
        path = orderContour(objects[objIndex], w);
        pathIndex = 0;
        const p0 = path[0];
        current = { x: p0 % w, y: Math.floor(p0 / w) };
        objIndex++;
        return true;
    }

    nextObject();

    const durationMs = durationSec * 1000;
    const startTime = performance.now();
    let doneDrawing = false;

    /* ---------- DRAW LOOP ---------- */
    function animate() {
        if (!isRecording) return;

        const elapsed = performance.now() - startTime;

        // Draw new pixels only while we still have time and work to do
        if (!doneDrawing) {
            for (let i = 0; i < pixelsPerFrame; i++) {
                if (pathIndex >= path.length) {
                    if (!nextObject()) {
                        doneDrawing = true;
                        break;
                    }
                }

                const p = path[pathIndex++];
                const x = p % w, y = Math.floor(p / w);
                const idx = p * 4;

                ctx.fillStyle = `rgba(${edgeData.data[idx]},${edgeData.data[idx + 1]},${edgeData.data[idx + 2]},1)`;
                ctx.fillRect(x, y, 1, 1);
                current = { x, y };
            }
        }

        oCtx.clearRect(0, 0, overlay.width, overlay.height);
        if (current) {
            oCtx.font = "28px Arial";
            oCtx.fillText('✍️', current.x - 6, current.y + 6);
        }

        rCtx.clearRect(0, 0, recCanvas.width, recCanvas.height);
        rCtx.drawImage(canvas, 0, 0);
        rCtx.drawImage(overlay, 0, 0);

        // Enforce real-time duration based on dropdown
        if (elapsed >= durationMs) {
            isRecording = false;
            mediaRecorder.stop();
            return;
        }

        requestAnimationFrame(animate);
    }

    animate();
};
let selectedExportFormat = null; // Stores the choice
let isExportRecording = false;
let isWaitingForFirstMove = false;
let exportChunks = [];
let hasStartedRecording = false;
function showDuration(show) {
    const el = document.getElementById('durationBox');
    if (el) el.style.display = show ? 'block' : 'none';
}

// 1. Just updates the UI and saves the choice
function selectFormat(format) {
    selectedExportFormat = format;
    const label = document.getElementById('currentFormatLabel');
    label.innerText = format.toUpperCase() + " ▼";
    label.style.color = "#0078d4";
}

// Expose to window so React Export UI can call these
window.showDuration = showDuration;
window.selectFormat = selectFormat;

// 2. Actually performs the work when Export button is clicked
async function executeExport() {
    if (!selectedExportFormat) {
        alert("Please select a format first.");
        return;
    }

    if (selectedExportFormat === 'webm') {
        // If timelapse is still recording, stop it (replaces old "Save Video" button)
        if (isRecording && mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
            return;
        }
        // If we have a finished timelapse, download it (single Export flow for video)
        if (lastRecordedTimelapseBlob) {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(lastRecordedTimelapseBlob);
            a.download = "human_sketch.webm";
            a.click();
            lastRecordedTimelapseBlob = null;
            return;
        }

        // Otherwise: record mesh warp animation (start immediately, no "move point" step)
        applyMeshWarp(); // Render current frame so first frame isn't black
        const stream = canvas.captureStream(60);
        mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
        exportChunks = [];

        mediaRecorder.ondataavailable = e => exportChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(exportChunks, { type: "video/webm" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "mesh_warp_animation.webm";
            a.click();
        };

        isExportRecording = true;
        hasStartedRecording = true; // Start recording right away
        mediaRecorder.start();

        const btn = document.getElementById('exportMainBtn');
        btn.innerText = "🔴 RECORDING... CLICK TO SAVE";
        btn.style.background = "red";

        btn.onclick = () => {
            if (mediaRecorder && mediaRecorder.state === "recording") {
                mediaRecorder.stop();
            }
            isExportRecording = false;
            hasStartedRecording = false;
            btn.innerText = "Export";
            btn.style.background = "#0078d4";
            btn.onclick = executeExport;
        };
    } else {
        // Standard Image/JSON export
        const w = canvas.width;
        const h = canvas.height;
        if (selectedExportFormat === 'png' || selectedExportFormat === 'jpg') {
            const link = document.createElement('a');
            link.download = `drawing.${selectedExportFormat}`;
            link.href = canvas.toDataURL(selectedExportFormat === 'png' ? "image/png" : "image/jpeg");
            link.click();
        }
    }
}
window.executeExport = executeExport;

window.onmousemove = e => {
    if (!draggingNode || !isMeshActive) return;

    // 1. Calculate positions first
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const dx = mx - draggingNode.x;
    const dy = my - draggingNode.y;

    // 2. TRIGGER RECORDING (The fix for the black screen is here)
    if (isExportRecording && !hasStartedRecording) {
        // --- FIX: Force a render BEFORE the recorder starts ---
        applyMeshWarp();

        mediaRecorder.start(); // Now it starts on a visible frame, not black
        hasStartedRecording = true;

        const btn = document.getElementById('exportMainBtn');
        btn.innerText = "🔴 RECORDING... CLICK TO SAVE";
        btn.style.background = "red";
    }

    // 3. Move the held point
    draggingNode.x = mx;
    draggingNode.y = my;

    // 4. Move surrounding points for liquid effect
    meshGrid.forEach(n => {
        if (n === draggingNode) return;

        // Skip border nodes
        if (n.origX === 0 || n.origX === canvas.width || n.origY === 0 || n.origY === canvas.height) return;

        const dist = Math.hypot(n.x - draggingNode.x, n.y - draggingNode.y);
        if (dist < INFLUENCE_RADIUS) {
            const falloff = 1 - dist / INFLUENCE_RADIUS;
            const strength = falloff * INFLUENCE_STRENGTH;
            n.x += dx * strength;
            n.y += dy * strength;
        }
    });


    // 5. Update the visual (Capture every frame of movement)
    applyMeshWarp();
    drawOverlay();
};
const grid = document.getElementById('basicGrid');
const colorCodes = ['#f08080', '#ff0000', '#804040', '#663333', '#330000', '#99ffff', '#00ffff', '#3399ff', '#0000ff', '#000080', '#1a3366', '#000066', '#ffffcc', '#ffff00', '#ffcc66', '#ff9933', '#996633', '#808000', '#99ccff', '#6666ff', '#33ccff', '#000033', '#330066', '#330033', '#ccffcc', '#99ff33', '#66ff33', '#33cc33', '#009900', '#666633', '#ffccff', '#ff99ff', '#ff00ff', '#cc00cc', '#663399', '#330033', '#336600', '#336633', '#336666', '#333366', '#003300', '#003333', '#993366', '#333333', '#000000', '#808080', '#c0c0c0', '#ffffff'];
colorCodes.forEach(color => {
    const d = document.createElement('div');
    d.className = 'circle';
    d.style.backgroundColor = color;
    d.onclick = () => {
        isManualColor = true; // <--- ADD THIS: Now the edges will use this color
        const r = parseInt(color.slice(1, 3), 16),
            g = parseInt(color.slice(3, 5), 16),
            b = parseInt(color.slice(5, 7), 16);

        baseRGB = { r, g, b };
        moveCursorFromRGB(r, g, b);
        applyChanges();
    };
    grid.appendChild(d);
});
function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    const d = max - min;

    s = max === 0 ? 0 : d / max;

    if (max === min) h = 0;
    else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h, s, v };
}

function moveCursorFromRGB(r, g, b) {
    const { h, s } = rgbToHsv(r, g, b);

    cursorX = h * 250;          // hue → X
    cursorY = (1 - s) * 250;    // saturation → Y
}

/* ---------- GLOBAL STATE ---------- */
let isTracingActive = false;
let stopTracing = false;

function orderContour(pixels, w) {
    pixels.sort((a, b) => {
        const ay = Math.floor(a / w), by = Math.floor(b / w);
        return ay === by ? (a % w) - (b % w) : ay - by;
    });

    const ordered = [];
    const set = new Set(pixels);
    let current = pixels[0];

    while (set.size) {
        ordered.push(current);
        set.delete(current);

        const x = current % w, y = Math.floor(current / w);
        let next = null, minDist = Infinity;

        for (const p of set) {
            const px = p % w, py = Math.floor(p / w);
            const d = (px - x) ** 2 + (py - y) ** 2;
            if (d < minDist) { minDist = d; next = p; }
        }

        if (!next) break;
        current = next;
    }
    return ordered;
}


/* ---------- 2. TRACE ENGINE (Using Original Image Colors) ---------- */
async function tracePath(path, w, ctx, oCtx, originalImageData, overlay, style) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const data = originalImageData.data; // Original image pixel data

    for (let i = 0; i < path.length - 1; i++) {
        if (stopTracing) return;

        const p1 = path[i], p2 = path[i + 1];
        const x1 = p1 % w, y1 = Math.floor(p1 / w);
        const x2 = p2 % w, y2 = Math.floor(p2 / w);

        // --- GET COLOR FROM ORIGINAL IMAGE ---
        const idx = p1 * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = (data[idx + 3] / 255) * style.alpha;

        // --- DYNAMIC TOOL SETTINGS ---
        let lineWidth = selectedTool === 'pen' ? 1.5 : 1.3;
        let toolAlpha = selectedTool === 'pen' ? 0.9 : 1;

        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = `rgba(${r},${g},${b},${a * toolAlpha})`;

        const dist = Math.hypot(x2 - x1, y2 - y1);
        if (dist < 20) {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // --- Pencil/Pen Icon Overlay ---
        oCtx.clearRect(0, 0, overlay.width, overlay.height);
        oCtx.font = "24px Arial";
        const toolChar = selectedTool === 'pen' ? '🖊️' : '✍️';
        oCtx.fillText(toolChar, x2 - 5, y2 + 5);

        if (i % style.speed === 0) await new Promise(r => requestAnimationFrame(r));
    }
}


/* ---------- 3. MAIN DETECTION & SORTING ---------- */
document.getElementById('objDetectBtn').onclick = async () => {
    const btn = document.getElementById('objDetectBtn');
    if (isTracingActive) { stopTracing = true; btn.innerText = "Detect Objects"; return; }
    if (!activeImg) return alert("Upload image first");

    isTracingActive = true; stopTracing = false;
    btn.innerText = "Stop Tracing";

    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = isBlackBg ? "#000" : "#fff";
    ctx.fillRect(0, 0, w, h);

    // Get Original Image Data for Colors
    const temp = document.createElement('canvas');
    temp.width = w; temp.height = h;
    const tCtx = temp.getContext('2d');
    tCtx.drawImage(activeImg, 0, 0, w, h);
    const originalImageData = tCtx.getImageData(0, 0, w, h);

    // Detect Edges
    const edgeStrength = parseInt(document.getElementById('edgeStrength').value);
    const edgeImage = applyOpenCVCannyWithOriginalColor(
        originalImageData,
        baseRGB.r,
        baseRGB.g,
        baseRGB.b
    );

    const edgeData = edgeImage.data;
    const edgeMap = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) { if (edgeData[i * 4 + 3] > 0) edgeMap[i] = 1; }

    const visited = new Uint8Array(w * h);
    const objects = [];

    for (let i = 0; i < edgeMap.length; i++) {
        if (edgeMap[i] && !visited[i]) {
            const stack = [i];
            const obj = [];
            visited[i] = 1;

            while (stack.length) {
                const p = stack.pop();
                obj.push(p);
                const x = p % w, y = Math.floor(p / w);

                // 🔥 LARGE SEARCH RADIUS (keeps object together)
                for (let dy = -4; dy <= 4; dy++) {
                    for (let dx = -4; dx <= 4; dx++) {
                        const ni = (y + dy) * w + (x + dx);
                        if (ni >= 0 && ni < w * h && edgeMap[ni] && !visited[ni]) {
                            visited[ni] = 1;
                            stack.push(ni);
                        }
                    }
                }
            }

            if (obj.length > 150) objects.push(obj); // ignore noise
        }
    }


    // Largest object first (main subject)
    objects.sort((a, b) => b.length - a.length);


    // --- SEQUENTIAL TRACING ---
    for (const obj of objects) {
        if (stopTracing) break;

        // Trace the entire object (outline + details) using its original photo colors
        const path = orderContour(obj, w);
        await tracePath(path, w, ctx, oCtx, originalImageData, overlay,
            { width: 2.5, alpha: 1, speed: 4 });

        // Wait before moving to the next subject
        await new Promise(r => setTimeout(r, 400));
    }

    oCtx.clearRect(0, 0, overlay.width, overlay.height);
    btn.innerText = "Detect Objects";
    isTracingActive = false;
};
}; // end initLegacyApp
