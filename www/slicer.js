document.addEventListener('DOMContentLoaded', () => {
    // ==================================================
    // DOM ELEMENTS
    // ==================================================
    const imageLoader = document.getElementById('image-loader');
    const rowsInput = document.getElementById('rows-input');
    const colsInput = document.getElementById('cols-input');
    const knobDepthInput = document.getElementById('knob-depth-input');
    const flatRatioInput = document.getElementById('flat-ratio-input');
    const curveSwellInput = document.getElementById('curve-swell-input');
    const generateButton = document.getElementById('generate-button');
    const downloadButton = document.getElementById('download-button');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const dropPlaceholder = document.getElementById('drop-placeholder');
    const fileInfo = document.getElementById('file-info');

    // ==================================================
    // STATE
    // ==================================================
    const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=800';
    let image = new Image();
    let imageLoaded = false;
    let horizontalEdgeProps = [];
    let verticalEdgeProps = [];

    // Load default image
    loadDefaultImage(DEFAULT_IMAGE);

    // ==================================================
    // IMAGE LOADING
    // ==================================================
    function loadDefaultImage(url) {
        image.crossOrigin = 'Anonymous';
        image.src = url;
        image.onload = () => {
            imageLoaded = true;
            renderImageToCanvas();
            fileInfo.textContent = 'Varsayılan Kelebek Resmi';
        };
    }

    function renderImageToCanvas() {
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        canvas.classList.remove('hidden');
        dropPlaceholder.classList.add('hidden');
    }

    function handleFileUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            image.src = e.target.result;
            image.onload = () => {
                imageLoaded = true;
                renderImageToCanvas();
                fileInfo.textContent = file.name;
            };
        };
        reader.readAsDataURL(file);
    }

    imageLoader.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFileUpload(e.target.files[0]);
    });

    // ==================================================
    // DETERMINISTIC VARIATION
    // ==================================================
    function getSimpleVariation(x, y, seed) {
        const hash = ((x * 73 + y * 37 + seed * 13) % 100) / 100;
        return 0.9 + hash * 0.2; // 0.9 – 1.1
    }

    // ==================================================
    // ORGANIC SOFTNESS (very subtle S-curve modulation)
    // ==================================================
    function addOrganicSoftness(point, startPoint, endPoint, t, edgeLength, intensity) {
        const organicX = getSimpleVariation(
            Math.floor(point.x * 0.15),
            Math.floor(point.y * 0.15),
            100
        ) - 1.0;
        const organicY = getSimpleVariation(
            Math.floor(point.x * 0.15),
            Math.floor(point.y * 0.15),
            200
        ) - 1.0;

        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return point;

        const perpX = -dy / len;
        const perpY = dx / len;
        const maxOffset = edgeLength * intensity;

        return {
            x: point.x + perpX * organicX * maxOffset,
            y: point.y + perpY * organicY * maxOffset
        };
    }

    // ==================================================
    // EDGE PROPERTY GENERATION
    // ==================================================
    function generateEdgeProperties(rows, cols) {
        horizontalEdgeProps = Array(rows + 1).fill(null).map(() => Array(cols).fill(null));
        verticalEdgeProps = Array(rows).fill(null).map(() => Array(cols + 1).fill(null));

        // Outer edges are flat (shape: 0)
        for (let r = 0; r <= rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (r === 0 || r === rows) {
                    horizontalEdgeProps[r][c] = { shape: 0, knobDepthFactor: 1.0, flatRatioFactor: 1.0 };
                }
            }
        }

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c <= cols; c++) {
                if (c === 0 || c === cols) {
                    verticalEdgeProps[r][c] = { shape: 0, knobDepthFactor: 1.0, flatRatioFactor: 1.0 };
                }
            }
        }

        // Inner horizontal edges with per-edge variation
        for (let r = 1; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const shape = Math.random() > 0.5 ? 1 : -1;
                const baseKnobDepth = 0.7 + Math.random() * 0.6;   // 0.7 – 1.3
                const baseFlatRatio = 0.6 + Math.random() * 0.8;   // 0.6 – 1.4
                const knobVariation = getSimpleVariation(r, c, 10);
                const flatVariation = getSimpleVariation(r, c, 20);

                horizontalEdgeProps[r][c] = {
                    shape: shape,
                    knobDepthFactor: baseKnobDepth * knobVariation,
                    flatRatioFactor: baseFlatRatio * flatVariation
                };
            }
        }

        // Inner vertical edges with per-edge variation
        for (let r = 0; r < rows; r++) {
            for (let c = 1; c < cols; c++) {
                const shape = Math.random() > 0.5 ? 1 : -1;
                const baseKnobDepth = 0.7 + Math.random() * 0.6;
                const baseFlatRatio = 0.6 + Math.random() * 0.8;
                const knobVariation = getSimpleVariation(r, c, 30);
                const flatVariation = getSimpleVariation(r, c, 40);

                verticalEdgeProps[r][c] = {
                    shape: shape,
                    knobDepthFactor: baseKnobDepth * knobVariation,
                    flatRatioFactor: baseFlatRatio * flatVariation
                };
            }
        }
    }

    // ==================================================
    // EDGE DRAWING – 3-phase: S-curve → Knob → S-curve
    // ==================================================
    function drawEdge(path, x1, y1, x2, y2, shape, knobDepth, flatRatio, curveSwell) {
        const type = Math.abs(shape);
        const direction = Math.sign(shape);
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len === 0) {
            path.lineTo(x2, y2);
            return;
        }

        const nx = -dy / len;
        const ny = dx / len;

        // Helper: draw an S-curve between two points
        const drawSCurve = (pStart, pEnd) => {
            const cdx = pEnd.x - pStart.x;
            const cdy = pEnd.y - pStart.y;
            const cLen = Math.sqrt(cdx * cdx + cdy * cdy);
            if (cLen === 0) return;

            const cnx = -cdy / cLen;
            const cny = cdx / cLen;
            const swell = cLen * curveSwell * direction;

            let cp1 = {
                x: pStart.x + cdx * 0.25 + cnx * swell,
                y: pStart.y + cdy * 0.25 + cny * swell
            };
            let cp2 = {
                x: pStart.x + cdx * 0.75 - cnx * swell,
                y: pStart.y + cdy * 0.75 - cny * swell
            };

            // Organic softness only for long S-curves (main connectors)
            if (cLen > len * 0.3) {
                cp1 = addOrganicSoftness(cp1, pStart, pEnd, 0.25, cLen, 0.015);
                cp2 = addOrganicSoftness(cp2, pStart, pEnd, 0.75, cLen, 0.015);
            }

            path.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, pEnd.x, pEnd.y);
        };

        // Flat / outer edges → just one S-curve
        if (type === 0) {
            drawSCurve({ x: x1, y: y1 }, { x: x2, y: y2 });
            return;
        }

        // Inner edges: S-curve → Knob bezier → S-curve
        const pCurveStart = { x: x1 + dx * flatRatio, y: y1 + dy * flatRatio };
        const pCurveEnd = { x: x1 + dx * (1 - flatRatio), y: y1 + dy * (1 - flatRatio) };
        const cp1 = {
            x: pCurveStart.x + nx * direction * knobDepth * len,
            y: pCurveStart.y + ny * direction * knobDepth * len
        };
        const cp2 = {
            x: pCurveEnd.x + nx * direction * knobDepth * len,
            y: pCurveEnd.y + ny * direction * knobDepth * len
        };

        drawSCurve({ x: x1, y: y1 }, pCurveStart);
        path.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, pCurveEnd.x, pCurveEnd.y);
        drawSCurve(pCurveEnd, { x: x2, y: y2 });
    }

    // ==================================================
    // PUZZLE RENDERING
    // ==================================================
    function drawPuzzleCuts(rows, cols, pieceWidth, pieceHeight) {
        const baseKnobDepth = parseFloat(knobDepthInput.value);
        const baseFlatRatio = parseFloat(flatRatioInput.value);
        const curveSwell = parseFloat(curveSwellInput.value);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);

        const cutsPath = new Path2D();

        // Horizontal cuts
        for (let r = 1; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = Math.round(c * pieceWidth);
                const y = Math.round(r * pieceHeight);
                const x2 = Math.round((c + 1) * pieceWidth);
                const edge = horizontalEdgeProps[r][c];
                cutsPath.moveTo(x, y);
                drawEdge(
                    cutsPath, x, y, x2, y,
                    edge.shape,
                    baseKnobDepth * edge.knobDepthFactor,
                    baseFlatRatio * edge.flatRatioFactor,
                    curveSwell
                );
            }
        }

        // Vertical cuts
        for (let r = 0; r < rows; r++) {
            for (let c = 1; c < cols; c++) {
                const x = Math.round(c * pieceWidth);
                const y = Math.round(r * pieceHeight);
                const y2 = Math.round((r + 1) * pieceHeight);
                const edge = verticalEdgeProps[r][c];
                cutsPath.moveTo(x, y);
                drawEdge(
                    cutsPath, x, y, x, y2,
                    edge.shape,
                    baseKnobDepth * edge.knobDepthFactor,
                    baseFlatRatio * edge.flatRatioFactor,
                    curveSwell
                );
            }
        }

        ctx.strokeStyle = 'white';
        ctx.lineWidth = Math.max(2, Math.min(4, 800 / Math.max(rows, cols)));
        ctx.stroke(cutsPath);
    }

    // ==================================================
    // STATISTICS
    // ==================================================
    function displayBasicStatistics(rows, cols) {
        const totalPieces = rows * cols;

        let minKnob = Infinity, maxKnob = 0;
        for (let r = 0; r <= rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (horizontalEdgeProps[r] && horizontalEdgeProps[r][c]) {
                    const f = horizontalEdgeProps[r][c].knobDepthFactor;
                    minKnob = Math.min(minKnob, f);
                    maxKnob = Math.max(maxKnob, f);
                }
            }
        }
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c <= cols; c++) {
                if (verticalEdgeProps[r] && verticalEdgeProps[r][c]) {
                    const f = verticalEdgeProps[r][c].knobDepthFactor;
                    minKnob = Math.min(minKnob, f);
                    maxKnob = Math.max(maxKnob, f);
                }
            }
        }

        const varietyRange = ((maxKnob - minKnob) * 100).toFixed(0);

        document.getElementById('total-pieces').textContent = totalPieces;
        const varietyEl = document.getElementById('knob-variety');
        if (varietyEl) varietyEl.textContent = `%${varietyRange}`;

        const statsEl = document.getElementById('puzzle-stats');
        statsEl.classList.remove('hidden');
        statsEl.style.display = 'block';
    }

    // ==================================================
    // GENERATE BUTTON
    // ==================================================
    generateButton.addEventListener('click', () => {
        if (!imageLoaded) return alert('Lütfen önce bir resim yükleyin!');

        const rows = parseInt(rowsInput.value);
        const cols = parseInt(colsInput.value);

        if (rows < 2 || rows > 20 || cols < 2 || cols > 20) {
            return alert('Satır ve sütun sayıları 2-20 arasında olmalıdır.');
        }

        const pieceWidth = canvas.width / cols;
        const pieceHeight = canvas.height / rows;

        generateEdgeProperties(rows, cols);
        drawPuzzleCuts(rows, cols, pieceWidth, pieceHeight);
        displayBasicStatistics(rows, cols);

        downloadButton.classList.remove('hidden');
    });

    // ==================================================
    // DOWNLOAD
    // ==================================================
    downloadButton.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'puzzle-deseni.png';
        link.href = canvas.toDataURL();
        link.click();
    });

    // ==================================================
    // PRESET BUTTON LISTENERS (.chip class)
    // ==================================================
    const presetButtons = document.querySelectorAll('.chip');
    presetButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Clear active state handled by inline onclick applyPreset
            // Auto-generate if image is loaded
            if (imageLoaded) {
                setTimeout(() => generateButton.click(), 100);
            }
        });
    });
});
