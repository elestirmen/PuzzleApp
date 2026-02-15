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
    const organicInput = document.getElementById('organic-input');
    const knobWidthInput = document.getElementById('knob-width-input');
    const generateButton = document.getElementById('generate-button');
    const downloadButton = document.getElementById('download-button');
    const downloadPiecesButton = document.getElementById('download-pieces-button');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const dropPlaceholder = document.getElementById('drop-placeholder');
    const fileInfo = document.getElementById('file-info');
    const puzzleStatsDiv = document.getElementById('puzzle-stats');
    const totalPiecesSpan = document.getElementById('total-pieces');
    const knobVarietySpan = document.getElementById('knob-variety');
    const strategySelect = document.getElementById('strategy-select');
    const savePresetBtn = document.getElementById('save-preset-btn');
    const customPresetsContainer = document.getElementById('custom-presets-container');

    // ==================================================
    // STATE
    // ==================================================
    let image = new Image();
    let imageLoaded = false;
    let individualPiecePaths = [];
    let horizontalEdgeProps = [];
    let verticalEdgeProps = [];

    // ==================================================
    // INDUSTRY PARAMS MAP (dropdown otomatik ayar için)
    // ==================================================
    const INDUSTRY_PARAMS = {
        ribbon: { knobDepth: '0.12', flatRatio: '0.30', curveSwell: '0.01', organic: '0', knobWidth: '0.8' },
        random: { knobDepth: '0.28', flatRatio: '0.15', curveSwell: '0.14', organic: '0.05', knobWidth: '1.4' },
        ravensburger: { knobDepth: '0.20', flatRatio: '0.22', curveSwell: '0.04', organic: '0.008', knobWidth: '1.0' },
        victorian: { knobDepth: '0.30', flatRatio: '0.12', curveSwell: '0.20', organic: '0.07', knobWidth: '1.5' },
        strip: { knobDepth: '0.06', flatRatio: '0.38', curveSwell: '0.00', organic: '0', knobWidth: '0.6' },
        flow: { knobDepth: '0.22', flatRatio: '0.18', curveSwell: '0.25', organic: '0.06', knobWidth: '1.3' },
        laser: { knobDepth: '0.18', flatRatio: '0.25', curveSwell: '0.02', organic: '0', knobWidth: '1.0' },
    };

    function getSelectedStrategy() {
        return strategySelect ? strategySelect.value : 'standart';
    }

    // Strateji değiştiğinde parametreleri ayarla + oluştur
    if (strategySelect) {
        strategySelect.addEventListener('change', () => {
            const val = strategySelect.value;
            const params = INDUSTRY_PARAMS[val];
            if (params) {
                knobDepthInput.value = params.knobDepth;
                flatRatioInput.value = params.flatRatio;
                curveSwellInput.value = params.curveSwell;
                if (organicInput) organicInput.value = params.organic;
                if (knobWidthInput) knobWidthInput.value = params.knobWidth;
            }
            if (typeof SFX !== 'undefined') SFX.tap();
            if (imageLoaded) setTimeout(() => generateButton.click(), 100);
        });
    }

    // Detaylı Ayarlar toggle
    const toggleBtn = document.getElementById('toggle-settings-btn');
    const advPanel = document.getElementById('advanced-settings');
    if (toggleBtn && advPanel) {
        toggleBtn.addEventListener('click', () => {
            toggleBtn.classList.toggle('open');
            advPanel.classList.toggle('open');
        });
    }

    // ==================================================
    // DETERMINISTIC HELPERS
    // ==================================================
    function hash(x, y, seed) {
        let h = ((x * 73856093) ^ (y * 19349663) ^ (seed * 83492791)) & 0x7fffffff;
        h = ((h >> 16) ^ h) * 0x45d9f3b;
        h = ((h >> 16) ^ h) * 0x45d9f3b;
        h = (h >> 16) ^ h;
        return (h & 0xffff) / 0xffff; // 0..1
    }

    function hashRange(x, y, seed, min, max) {
        return min + hash(x, y, seed) * (max - min);
    }

    // ==================================================
    // EDGE PROPERTY GENERATION
    // ==================================================
    function generateEdgeProperties(rows, cols) {
        const strategy = getSelectedStrategy();

        horizontalEdgeProps = Array(rows + 1).fill(null).map(() => Array(cols).fill(null));
        verticalEdgeProps = Array(rows).fill(null).map(() => Array(cols + 1).fill(null));

        // Dış kenarlar düz
        for (let r = 0; r <= rows; r++)
            for (let c = 0; c < cols; c++)
                if (r === 0 || r === rows)
                    horizontalEdgeProps[r][c] = { shape: 0 };

        for (let r = 0; r < rows; r++)
            for (let c = 0; c <= cols; c++)
                if (c === 0 || c === cols)
                    verticalEdgeProps[r][c] = { shape: 0 };

        // İç kenarlar — strateji bazlı varyasyon
        for (let r = 1; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                horizontalEdgeProps[r][c] = buildEdgeProps(r, c, 'h', strategy);
            }
        }
        for (let r = 0; r < rows; r++) {
            for (let c = 1; c < cols; c++) {
                verticalEdgeProps[r][c] = buildEdgeProps(r, c, 'v', strategy);
            }
        }
    }

    function buildEdgeProps(r, c, orient, strategy) {
        const seed = orient === 'h' ? 100 : 200;
        const dir = hash(r, c, seed + 1) > 0.5 ? 1 : -1;

        // Her strateji için farklı varyasyon aralıkları
        switch (strategy) {
            case 'ribbon':
                return { shape: dir, depthMul: hashRange(r, c, seed + 2, 0.9, 1.1), offsetMul: 1.0 };
            case 'random':
                return { shape: dir, depthMul: hashRange(r, c, seed + 2, 0.5, 2.0), offsetMul: hashRange(r, c, seed + 3, 0.6, 1.4) };
            case 'victorian':
                return { shape: dir, depthMul: hashRange(r, c, seed + 2, 0.8, 1.8), offsetMul: hashRange(r, c, seed + 3, 0.7, 1.3), waviness: hashRange(r, c, seed + 4, 0.5, 1.5) };
            case 'strip':
                return { shape: hash(r, c, seed + 5) > 0.3 ? dir : 0, depthMul: hashRange(r, c, seed + 2, 0.6, 1.0), offsetMul: 1.0 };
            case 'flow':
                return { shape: dir, depthMul: hashRange(r, c, seed + 2, 0.7, 1.5), offsetMul: hashRange(r, c, seed + 3, 0.8, 1.2), waviness: hashRange(r, c, seed + 4, 1.0, 2.0) };
            case 'laser':
                return { shape: dir, depthMul: hashRange(r, c, seed + 2, 0.95, 1.05), offsetMul: 1.0 };
            case 'educa':
                return { shape: dir, depthMul: hashRange(r, c, seed + 2, 0.6, 1.6), offsetMul: hashRange(r, c, seed + 3, 0.7, 1.3), knobType: Math.floor(hash(r, c, seed + 6) * 4) };
            default: // standart / ravensburger
                return { shape: dir, depthMul: hashRange(r, c, seed + 2, 0.8, 1.2), offsetMul: hashRange(r, c, seed + 3, 0.9, 1.1) };
        }
    }

    // ==================================================
    // ★ STRATEGY-SPECIFIC EDGE DRAWING ★
    // Her strateji KENDİ ÖZ ALGORİTMASINI kullanır
    // ==================================================
    function drawEdge(path, x1, y1, x2, y2, edgeProps) {
        const strategy = getSelectedStrategy();
        const shape = edgeProps.shape;
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len === 0 || shape === 0) {
            path.lineTo(x2, y2);
            return;
        }

        const dir = Math.sign(shape);
        const nx = -dy / len, ny = dx / len;  // Normal (dik yön)

        const baseDepth = parseFloat(knobDepthInput.value) * (edgeProps.depthMul || 1.0);
        const flatRatio = parseFloat(flatRatioInput.value);
        const curveSwell = parseFloat(curveSwellInput.value);
        const organic = parseFloat(organicInput?.value || '0.015');
        const knobW = parseFloat(knobWidthInput?.value || '1.0');
        const offsetMul = edgeProps.offsetMul || 1.0;

        switch (strategy) {
            case 'ribbon':
                drawRibbonEdge(path, x1, y1, x2, y2, dx, dy, len, nx, ny, dir, baseDepth, flatRatio, knobW);
                break;
            case 'random':
                drawRandomEdge(path, x1, y1, x2, y2, dx, dy, len, nx, ny, dir, baseDepth, flatRatio, curveSwell, knobW, offsetMul, edgeProps);
                break;
            case 'ravensburger':
                drawRavensburgerEdge(path, x1, y1, x2, y2, dx, dy, len, nx, ny, dir, baseDepth, flatRatio, knobW);
                break;
            case 'victorian':
                drawVictorianEdge(path, x1, y1, x2, y2, dx, dy, len, nx, ny, dir, baseDepth, flatRatio, curveSwell, knobW, edgeProps);
                break;
            case 'strip':
                drawStripEdge(path, x1, y1, x2, y2, dx, dy, len, nx, ny, dir, baseDepth, flatRatio);
                break;
            case 'flow':
                drawFlowEdge(path, x1, y1, x2, y2, dx, dy, len, nx, ny, dir, baseDepth, flatRatio, curveSwell, knobW, edgeProps);
                break;
            case 'laser':
                drawLaserEdge(path, x1, y1, x2, y2, dx, dy, len, nx, ny, dir, baseDepth, flatRatio, knobW);
                break;
            case 'educa':
                drawEducaEdge(path, x1, y1, x2, y2, dx, dy, len, nx, ny, dir, baseDepth, flatRatio, curveSwell, knobW, edgeProps);
                break;
            default:
                drawStandartEdge(path, x1, y1, x2, y2, dx, dy, len, nx, ny, dir, baseDepth, flatRatio, curveSwell, organic, knobW);
        }
    }

    // ─────────────────────────────────────────────
    // RIBBON CUT: Çok düz, uniform, grid benzeri
    // Düz çizgi → küçük simetrik yarım daire topuz → düz çizgi
    // ─────────────────────────────────────────────
    function drawRibbonEdge(path, x1, y1, x2, y2, dx, dy, len, nx, ny, dir, depth, flat, kw) {
        const d = depth * len * dir * kw;
        const p1x = x1 + dx * flat, p1y = y1 + dy * flat;
        const p2x = x1 + dx * (1 - flat), p2y = y1 + dy * (1 - flat);

        // Düz çizgi giriş
        path.lineTo(p1x, p1y);
        // Yarım daire topuz (tek quadratic)
        const midX = (p1x + p2x) / 2 + nx * d * 2;
        const midY = (p1y + p2y) / 2 + ny * d * 2;
        path.quadraticCurveTo(midX, midY, p2x, p2y);
        // Düz çizgi çıkış
        path.lineTo(x2, y2);
    }

    // ─────────────────────────────────────────────
    // RANDOM CUT: Asimetrik, kaydırılmış topuz, çılgın varyasyon
    // Topuz merkezi kaydırılır, derinlik çok değişken
    // ─────────────────────────────────────────────
    function drawRandomEdge(path, x1, y1, x2, y2, dx, dy, len, nx, ny, dir, depth, flat, swell, kw, offsetMul, props) {
        const d = depth * len * dir * kw;
        // Topuz merkezi kaydırılmış (0.3-0.7 arası)
        const center = 0.3 + (offsetMul - 0.6) * 0.5; // offsetMul 0.6..1.4 → center 0.3..0.7
        const neckW = flat * 0.6;

        const p1x = x1 + dx * (center - neckW), p1y = y1 + dy * (center - neckW);
        const p2x = x1 + dx * (center + neckW), p2y = y1 + dy * (center + neckW);
        const peakX = x1 + dx * center + nx * d * 2.2;
        const peakY = y1 + dy * center + ny * d * 2.2;

        // Dalgalı giriş
        const s = swell * len * dir * 0.5;
        const m1x = x1 + dx * (center - neckW) * 0.5 - nx * s;
        const m1y = y1 + dy * (center - neckW) * 0.5 - ny * s;
        path.quadraticCurveTo(m1x, m1y, p1x, p1y);

        // Topuz: iki bezier ile asimetrik yumru
        const cp1x = p1x + nx * d * 1.8 - dx * 0.05;
        const cp1y = p1y + ny * d * 1.8 - dy * 0.05;
        path.quadraticCurveTo(cp1x, cp1y, peakX, peakY);
        const cp2x = p2x + nx * d * 1.8 + dx * 0.05;
        const cp2y = p2y + ny * d * 1.8 + dy * 0.05;
        path.quadraticCurveTo(cp2x, cp2y, p2x, p2y);

        // Dalgalı çıkış
        const m2x = p2x + (x2 - p2x) * 0.5 + nx * s;
        const m2y = p2y + (y2 - p2y) * 0.5 + ny * s;
        path.quadraticCurveTo(m2x, m2y, x2, y2);
    }

    // ─────────────────────────────────────────────
    // RAVENSBURGER: Temiz, hassas, "Softclick" uyumu
    // Düz giriş → yumuşak boyunlu derin topuz → düz çıkış
    // ─────────────────────────────────────────────
    function drawRavensburgerEdge(path, x1, y1, x2, y2, dx, dy, len, nx, ny, dir, depth, flat, kw) {
        const d = depth * len * dir * kw;
        const neckW = flat * 0.7;
        const cx = 0.5; // merkez

        const p1x = x1 + dx * (cx - neckW), p1y = y1 + dy * (cx - neckW);
        const p2x = x1 + dx * (cx + neckW), p2y = y1 + dy * (cx + neckW);

        // Düz giriş
        path.lineTo(p1x, p1y);

        // Boyun: hafif içeri çekme
        const n1x = p1x + dx * 0.02 + nx * d * 0.15;
        const n1y = p1y + dy * 0.02 + ny * d * 0.15;
        path.lineTo(n1x, n1y);

        // Topuz: 4 noktalı yuvarlak balon
        const bw = neckW * len * 0.8; // balon genişliği
        const cp1 = { x: n1x + nx * d * 1.2 - dx * 0.06, y: n1y + ny * d * 1.2 - dy * 0.06 };
        const peak = { x: x1 + dx * cx + nx * d * 1.5, y: y1 + dy * cx + ny * d * 1.5 };
        const n2x = p2x - dx * 0.02 + nx * d * 0.15;
        const n2y = p2y - dy * 0.02 + ny * d * 0.15;
        const cp2 = { x: n2x + nx * d * 1.2 + dx * 0.06, y: n2y + ny * d * 1.2 + dy * 0.06 };

        path.bezierCurveTo(cp1.x, cp1.y, peak.x - dx * 0.05, peak.y - dy * 0.05, peak.x, peak.y);
        path.bezierCurveTo(peak.x + dx * 0.05, peak.y + dy * 0.05, cp2.x, cp2.y, n2x, n2y);

        // Boyun çıkış
        path.lineTo(p2x, p2y);
        // Düz çıkış
        path.lineTo(x2, y2);
    }

    // ─────────────────────────────────────────────
    // VICTORIAN: El yapımı, dalgalı, organik kıvrımlar
    // Tüm kenar boyunca küçük dalgalar + derin organik topuz
    // ─────────────────────────────────────────────
    function drawVictorianEdge(path, x1, y1, x2, y2, dx, dy, len, nx, ny, dir, depth, flat, swell, kw, props) {
        const d = depth * len * dir * kw;
        const wav = (props.waviness || 1.0) * swell;
        const segments = 8;

        for (let i = 0; i < segments; i++) {
            const t1 = i / segments;
            const t2 = (i + 1) / segments;
            const tmid = (t1 + t2) / 2;

            const sx = x1 + dx * t2;
            const sy = y1 + dy * t2;

            // Topuz bölgesi (orta %30)
            if (tmid > (0.5 - flat) && tmid < (0.5 + flat)) {
                // Derin topuz eğrisi
                const knobT = (tmid - (0.5 - flat)) / (flat * 2);
                const knobDepth = Math.sin(knobT * Math.PI) * d * 2.5;
                const waveOff = Math.sin(i * 2.3) * wav * len * 0.03;
                const cpx = x1 + dx * tmid + nx * (knobDepth + waveOff);
                const cpy = y1 + dy * tmid + ny * (knobDepth + waveOff);
                path.quadraticCurveTo(cpx, cpy, sx, sy);
            } else {
                // Kenar dalgalanması
                const wave = Math.sin(i * 3.7 + t1 * 12) * wav * len * 0.04 * dir;
                const cpx = x1 + dx * tmid + nx * wave;
                const cpy = y1 + dy * tmid + ny * wave;
                path.quadraticCurveTo(cpx, cpy, sx, sy);
            }
        }
    }

    // ─────────────────────────────────────────────
    // STRIP CUT: Çocuk puzzleları, neredeyse düz çizgi
    // Çok sığ, geniş, yuvarlak topuz
    // ─────────────────────────────────────────────
    function drawStripEdge(path, x1, y1, x2, y2, dx, dy, len, nx, ny, dir, depth, flat) {
        const d = depth * len * dir;

        // Çok geniş ama sığ topuz
        const p1x = x1 + dx * 0.2, p1y = y1 + dy * 0.2;
        const p2x = x1 + dx * 0.8, p2y = y1 + dy * 0.8;

        path.lineTo(p1x, p1y);

        // Tek geniş yay
        const cpx = x1 + dx * 0.5 + nx * d * 1.5;
        const cpy = y1 + dy * 0.5 + ny * d * 1.5;
        path.quadraticCurveTo(cpx, cpy, p2x, p2y);

        path.lineTo(x2, y2);
    }

    // ─────────────────────────────────────────────
    // FLOW CUT: Sanatsal, tüm kenar boyunca akan dalgalar
    // S-curve + akışkan derin topuz
    // ─────────────────────────────────────────────
    function drawFlowEdge(path, x1, y1, x2, y2, dx, dy, len, nx, ny, dir, depth, flat, swell, kw, props) {
        const d = depth * len * dir * kw;
        const wav = (props.waviness || 1.5) * swell;

        // 1. Giriş S-eğrisi (büyük dalga)
        const p1x = x1 + dx * flat, p1y = y1 + dy * flat;
        const sw1 = wav * len * 0.12 * dir;
        const cp1a = { x: x1 + dx * flat * 0.4 + nx * sw1, y: y1 + dy * flat * 0.4 + ny * sw1 };
        const cp1b = { x: x1 + dx * flat * 0.7 - nx * sw1 * 0.5, y: y1 + dy * flat * 0.7 - ny * sw1 * 0.5 };
        path.bezierCurveTo(cp1a.x, cp1a.y, cp1b.x, cp1b.y, p1x, p1y);

        // 2. Topuz: Derin akışkan S-şekilli topuz
        const p2x = x1 + dx * (1 - flat), p2y = y1 + dy * (1 - flat);
        const peakOff = d * 2.0;
        const q1 = { x: p1x + nx * peakOff * 0.8, y: p1y + ny * peakOff * 0.8 };
        const peak = { x: x1 + dx * 0.5 + nx * peakOff, y: y1 + dy * 0.5 + ny * peakOff };
        const q2 = { x: p2x + nx * peakOff * 0.8, y: p2y + ny * peakOff * 0.8 };

        path.bezierCurveTo(q1.x, q1.y, peak.x - dx * 0.08, peak.y - dy * 0.08, peak.x, peak.y);
        path.bezierCurveTo(peak.x + dx * 0.08, peak.y + dy * 0.08, q2.x, q2.y, p2x, p2y);

        // 3. Çıkış S-eğrisi (ters dalga)
        const sw2 = wav * len * 0.10 * dir;
        const cp3a = { x: p2x + (x2 - p2x) * 0.3 - nx * sw2, y: p2y + (y2 - p2y) * 0.3 - ny * sw2 };
        const cp3b = { x: p2x + (x2 - p2x) * 0.7 + nx * sw2 * 0.5, y: p2y + (y2 - p2y) * 0.7 + ny * sw2 * 0.5 };
        path.bezierCurveTo(cp3a.x, cp3a.y, cp3b.x, cp3b.y, x2, y2);
    }

    // ─────────────────────────────────────────────
    // LASER CUT: Keskin, açısal, geometrik
    // Düz çizgiler + keskin köşeli dikdörtgen topuz
    // ─────────────────────────────────────────────
    function drawLaserEdge(path, x1, y1, x2, y2, dx, dy, len, nx, ny, dir, depth, flat, kw) {
        const d = depth * len * dir * kw;
        const neckW = flat * 0.5;
        const cx = 0.5;

        // Düz giriş
        const p1x = x1 + dx * (cx - neckW), p1y = y1 + dy * (cx - neckW);
        path.lineTo(p1x, p1y);

        // Dik açıyla dışarı (trapez topuz)
        const o1x = p1x + nx * d * 1.8, o1y = p1y + ny * d * 1.8;
        path.lineTo(o1x, o1y);

        // Topuz tepesi (hafif eğik düz çizgi)
        const o2x = x1 + dx * (cx + neckW) + nx * d * 1.8;
        const o2y = y1 + dy * (cx + neckW) + ny * d * 1.8;
        path.lineTo(o2x, o2y);

        // Dik açıyla geri
        const p2x = x1 + dx * (cx + neckW), p2y = y1 + dy * (cx + neckW);
        path.lineTo(p2x, p2y);

        // Düz çıkış
        path.lineTo(x2, y2);
    }

    // ─────────────────────────────────────────────
    // EDUCA: 4 farklı topuz tipi karışık
    // knobType 0-3: klasik, oval, düzensiz, çift topuz
    // ─────────────────────────────────────────────
    function drawEducaEdge(path, x1, y1, x2, y2, dx, dy, len, nx, ny, dir, depth, flat, swell, kw, props) {
        const d = depth * len * dir * kw;
        const knobType = props.knobType || 0;
        const p1x = x1 + dx * flat, p1y = y1 + dy * flat;
        const p2x = x1 + dx * (1 - flat), p2y = y1 + dy * (1 - flat);

        // Giriş S-curve
        const sw = swell * len * dir * 0.06;
        const cp_in1 = { x: x1 + dx * flat * 0.3 + nx * sw, y: y1 + dy * flat * 0.3 + ny * sw };
        const cp_in2 = { x: x1 + dx * flat * 0.7 - nx * sw, y: y1 + dy * flat * 0.7 - ny * sw };
        path.bezierCurveTo(cp_in1.x, cp_in1.y, cp_in2.x, cp_in2.y, p1x, p1y);

        // Topuz tipi
        switch (knobType) {
            case 0: { // Klasik: tek bezier
                const cp1 = { x: p1x + nx * d * 1.5, y: p1y + ny * d * 1.5 };
                const cp2 = { x: p2x + nx * d * 1.5, y: p2y + ny * d * 1.5 };
                path.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2x, p2y);
                break;
            }
            case 1: { // Oval: çift bezier ile yumurta
                const midX = (p1x + p2x) / 2 + nx * d * 2.2;
                const midY = (p1y + p2y) / 2 + ny * d * 2.2;
                path.bezierCurveTo(p1x + nx * d * 0.8, p1y + ny * d * 0.8, midX - dx * 0.06, midY - dy * 0.06, midX, midY);
                path.bezierCurveTo(midX + dx * 0.06, midY + dy * 0.06, p2x + nx * d * 0.8, p2y + ny * d * 0.8, p2x, p2y);
                break;
            }
            case 2: { // Düzensiz: 4 segmentli organik
                for (let i = 0; i < 4; i++) {
                    const t = (i + 1) / 4;
                    const ex = p1x + (p2x - p1x) * t, ey = p1y + (p2y - p1y) * t;
                    const irregD = d * (1.0 + Math.sin(i * 2.1 + p1x * 0.01) * 0.6);
                    const tmid = (i + 0.5) / 4;
                    const cpx = p1x + (p2x - p1x) * tmid + nx * irregD * 1.8;
                    const cpy = p1y + (p2y - p1y) * tmid + ny * irregD * 1.8;
                    path.quadraticCurveTo(cpx, cpy, ex, ey);
                }
                break;
            }
            case 3: { // Çift topuz: iki küçük yumru
                const m = (p1x + p2x) / 2, my = (p1y + p2y) / 2;
                const dm = (p2x - p1x), dmy = (p2y - p1y);
                // İlk yumru
                path.bezierCurveTo(p1x + nx * d * 1.3, p1y + ny * d * 1.3, m - dm * 0.1 + nx * d * 1.3, my - dmy * 0.1 + ny * d * 1.3, m, my);
                // Kısa çukur
                path.quadraticCurveTo(m + nx * d * 0.2, my + ny * d * 0.2, m + dm * 0.05, my + dmy * 0.05);
                // İkinci yumru
                path.bezierCurveTo(m + dm * 0.1 + nx * d * 1.3, my + dmy * 0.1 + ny * d * 1.3, p2x + nx * d * 1.3, p2y + ny * d * 1.3, p2x, p2y);
                break;
            }
        }

        // Çıkış S-curve
        const cp_out1 = { x: p2x + (x2 - p2x) * 0.3 - nx * sw, y: p2y + (y2 - p2y) * 0.3 - ny * sw };
        const cp_out2 = { x: p2x + (x2 - p2x) * 0.7 + nx * sw, y: p2y + (y2 - p2y) * 0.7 + ny * sw };
        path.bezierCurveTo(cp_out1.x, cp_out1.y, cp_out2.x, cp_out2.y, x2, y2);
    }

    // ─────────────────────────────────────────────
    // STANDART: Orijinal 3-fazlı (S-curve→knob→S-curve)
    // ─────────────────────────────────────────────
    function drawStandartEdge(path, x1, y1, x2, y2, dx, dy, len, nx, ny, dir, depth, flat, swell, organic, kw) {
        const d = depth * len * dir * kw;

        const p1x = x1 + dx * flat, p1y = y1 + dy * flat;
        const p2x = x1 + dx * (1 - flat), p2y = y1 + dy * (1 - flat);

        // S-curve giriş
        const sw = swell * len * dir;
        const drawSCurve = (sx, sy, ex, ey) => {
            const cdx = ex - sx, cdy = ey - sy;
            const clen = Math.sqrt(cdx * cdx + cdy * cdy);
            if (clen === 0) return;
            const cnx = -cdy / clen, cny = cdx / clen;
            const s = clen * swell * dir;
            const cp1x = sx + cdx * 0.25 + cnx * s, cp1y = sy + cdy * 0.25 + cny * s;
            const cp2x = sx + cdx * 0.75 - cnx * s, cp2y = sy + cdy * 0.75 - cny * s;
            path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey);
        };

        drawSCurve(x1, y1, p1x, p1y);
        // Knob
        const cp1 = { x: p1x + nx * d, y: p1y + ny * d };
        const cp2 = { x: p2x + nx * d, y: p2y + ny * d };
        path.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2x, p2y);
        drawSCurve(p2x, p2y, x2, y2);
    }

    // ==================================================
    // PUZZLE DRAWING
    // ==================================================
    function drawPuzzleCuts(rows, cols, pieceWidth, pieceHeight) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);

        const cutsPath = new Path2D();

        for (let r = 1; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = Math.round(c * pieceWidth);
                const y = Math.round(r * pieceHeight);
                const x2 = Math.round((c + 1) * pieceWidth);
                const edge = horizontalEdgeProps[r][c];
                cutsPath.moveTo(x, y);
                drawEdge(cutsPath, x, y, x2, y, edge);
            }
        }

        for (let r = 0; r < rows; r++) {
            for (let c = 1; c < cols; c++) {
                const x = Math.round(c * pieceWidth);
                const y = Math.round(r * pieceHeight);
                const y2 = Math.round((r + 1) * pieceHeight);
                const edge = verticalEdgeProps[r][c];
                cutsPath.moveTo(x, y);
                drawEdge(cutsPath, x, y, x, y2, edge);
            }
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = Math.max(2, Math.min(canvas.width, canvas.height) / 300);
        ctx.stroke(cutsPath);
    }

    // ==================================================
    // CREATE PIECE SHAPES
    // ==================================================
    function createPieceShapes(rows, cols, w, h) {
        const allPieces = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = Math.round(c * w), y = Math.round(r * h);
                const x2 = Math.round((c + 1) * w), y2 = Math.round((r + 1) * h);

                const path = new Path2D();
                path.moveTo(x, y);

                drawEdge(path, x, y, x2, y, horizontalEdgeProps[r][c]);
                drawEdge(path, x2, y, x2, y2, verticalEdgeProps[r][c + 1]);

                // Alt ve sol kenarlar ters yön
                const bEdge = { ...horizontalEdgeProps[r + 1][c], shape: -horizontalEdgeProps[r + 1][c].shape };
                drawEdge(path, x2, y2, x, y2, bEdge);
                const lEdge = { ...verticalEdgeProps[r][c], shape: -verticalEdgeProps[r][c].shape };
                drawEdge(path, x, y2, x, y, lEdge);

                path.closePath();
                allPieces.push({ path, x, y, width: x2 - x, height: y2 - y, index: r * cols + c, row: r, col: c });
            }
        }
        return allPieces;
    }

    // ==================================================
    // FILE HANDLING
    // ==================================================
    function handleFileUpload(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            image.src = event.target.result;
            image.onload = () => {
                imageLoaded = true;
                canvas.width = image.width;
                canvas.height = image.height;
                ctx.drawImage(image, 0, 0);
                canvas.classList.remove('hidden');
                dropPlaceholder.classList.add('hidden');
                downloadButton.classList.add('hidden');
                if (downloadPiecesButton) downloadPiecesButton.classList.add('hidden');
                fileInfo.textContent = `${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
            };
        };
        reader.readAsDataURL(file);
    }

    imageLoader.addEventListener('change', (e) => {
        if (typeof SFX !== 'undefined') SFX.click();
        if (e.target.files[0]) handleFileUpload(e.target.files[0]);
    });

    // ==================================================
    // STATISTICS
    // ==================================================
    function displayBasicStatistics(rows, cols) {
        const total = rows * cols;
        if (totalPiecesSpan) totalPiecesSpan.textContent = total;
        const strat = getSelectedStrategy();
        const labels = {
            standart: 'Standart', educa: '4 Stil Karışık', ribbon: 'Ribbon Grid', random: 'Serbest Asimetrik',
            ravensburger: 'Softclick', victorian: 'El Yapımı Dalgalı', strip: 'Düz Çocuk', flow: 'Akışkan S-Eğri', laser: 'Açısal Geometrik'
        };
        if (knobVarietySpan) knobVarietySpan.textContent = labels[strat] || 'Standart';
        if (puzzleStatsDiv) { puzzleStatsDiv.classList.remove('hidden'); puzzleStatsDiv.style.display = ''; }
    }

    // ==================================================
    // GENERATE
    // ==================================================
    generateButton.addEventListener('click', () => {
        if (!imageLoaded) { alert('Lütfen önce bir resim yükleyin!'); return; }
        const rows = parseInt(rowsInput.value), cols = parseInt(colsInput.value);
        if (rows < 2 || cols < 2 || rows > 20 || cols > 20) { alert('2-20 arası olmalı.'); return; }

        const pw = canvas.width / cols, ph = canvas.height / rows;
        generateEdgeProperties(rows, cols);
        drawPuzzleCuts(rows, cols, pw, ph);
        individualPiecePaths = createPieceShapes(rows, cols, pw, ph);
        displayBasicStatistics(rows, cols);

        downloadButton.classList.remove('hidden');
        if (downloadPiecesButton) downloadPiecesButton.classList.remove('hidden');
        if (typeof SFX !== 'undefined') SFX.success();
    });

    // ==================================================
    // DOWNLOAD FULL IMAGE
    // ==================================================
    downloadButton.addEventListener('click', () => {
        if (typeof SFX !== 'undefined') SFX.click();
        const link = document.createElement('a');
        link.download = 'puzzle-deseni.png';
        link.href = canvas.toDataURL();
        link.click();
    });

    // ==================================================
    // DOWNLOAD INDIVIDUAL PIECES
    // ==================================================
    if (downloadPiecesButton) {
        downloadPiecesButton.addEventListener('click', async () => {
            if (individualPiecePaths.length === 0) { alert('Önce deseni oluşturun!'); return; }
            if (typeof SFX !== 'undefined') SFX.click();
            const originalText = downloadPiecesButton.textContent;
            downloadPiecesButton.textContent = '⏳ Hazırlanıyor...';
            downloadPiecesButton.disabled = true;
            await new Promise(r => setTimeout(r, 50));
            try {
                const pc = document.createElement('canvas');
                const pctx = pc.getContext('2d');
                const pw = canvas.width / parseInt(colsInput.value);
                const ph = canvas.height / parseInt(rowsInput.value);
                const buf = Math.max(pw, ph) * parseFloat(knobDepthInput.value) * 2.5 + 10;

                for (let i = 0; i < individualPiecePaths.length; i++) {
                    const piece = individualPiecePaths[i];
                    pc.width = piece.width + buf * 2;
                    pc.height = piece.height + buf * 2;
                    pctx.clearRect(0, 0, pc.width, pc.height);
                    pctx.save();
                    pctx.translate(-piece.x + buf, -piece.y + buf);
                    pctx.clip(piece.path);
                    pctx.drawImage(image, 0, 0);
                    pctx.restore();
                    const link = document.createElement('a');
                    link.download = `parca_${String(i + 1).padStart(2, '0')}.png`;
                    link.href = pc.toDataURL('image/png');
                    link.click();
                    if (i % 5 === 0) {
                        downloadPiecesButton.textContent = `⏳ ${i + 1}/${individualPiecePaths.length}`;
                        await new Promise(r => setTimeout(r, 20));
                    }
                }
                if (typeof SFX !== 'undefined') SFX.success();
            } catch (err) { alert('Hata: ' + err.message); }
            downloadPiecesButton.textContent = originalText;
            downloadPiecesButton.disabled = false;
        });
    }

    // ==================================================
    // SIZE PRESETS
    // ==================================================
    document.querySelectorAll('.chip:not(.custom)').forEach(button => {
        button.addEventListener('click', () => {
            if (typeof SFX !== 'undefined') SFX.tap();
            if (imageLoaded) setTimeout(() => generateButton.click(), 100);
        });
    });

    // ==================================================
    // CUSTOM PRESET SAVE / LOAD
    // ==================================================
    const PRESETS_KEY = 'puzzleapp_custom_presets';
    function getSavedPresets() { try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]'); } catch { return []; } }
    function savePresentsList(list) { localStorage.setItem(PRESETS_KEY, JSON.stringify(list)); }

    function getCurrentParams() {
        return {
            rows: rowsInput.value, cols: colsInput.value,
            knobDepth: knobDepthInput.value, flatRatio: flatRatioInput.value,
            curveSwell: curveSwellInput.value, organic: organicInput?.value || '0.015',
            knobWidth: knobWidthInput?.value || '1.0', strategy: strategySelect?.value || 'standart'
        };
    }

    function applyCustomPreset(params) {
        rowsInput.value = params.rows; colsInput.value = params.cols;
        knobDepthInput.value = params.knobDepth; flatRatioInput.value = params.flatRatio;
        curveSwellInput.value = params.curveSwell;
        if (organicInput) organicInput.value = params.organic || '0.015';
        if (knobWidthInput) knobWidthInput.value = params.knobWidth || '1.0';
        if (strategySelect) strategySelect.value = params.strategy || 'standart';
        if (typeof SFX !== 'undefined') SFX.tap();
        if (imageLoaded) setTimeout(() => generateButton.click(), 100);
    }

    function renderCustomPresets() {
        if (!customPresetsContainer) return;
        const presets = getSavedPresets();
        if (presets.length === 0) {
            customPresetsContainer.innerHTML = '<span style="font-size:0.75rem; color:var(--text-dim);">Henüz kayıtlı ayar yok</span>';
            return;
        }
        customPresetsContainer.innerHTML = '';
        presets.forEach((preset, idx) => {
            const chip = document.createElement('div');
            chip.className = 'chip custom';
            chip.innerHTML = `${preset.name} <span class="chip-delete" data-idx="${idx}">✕</span>`;
            chip.addEventListener('click', (e) => {
                if (e.target.classList.contains('chip-delete')) return;
                customPresetsContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                applyCustomPreset(preset.params);
            });
            chip.querySelector('.chip-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`"${preset.name}" silinsin mi?`)) {
                    const list = getSavedPresets(); list.splice(idx, 1);
                    savePresentsList(list); renderCustomPresets();
                }
            });
            customPresetsContainer.appendChild(chip);
        });
    }

    if (savePresetBtn) {
        savePresetBtn.addEventListener('click', () => {
            const name = prompt('Bu ayar için bir isim girin:');
            if (!name || !name.trim()) return;
            const presets = getSavedPresets();
            presets.push({ name: name.trim(), params: getCurrentParams() });
            savePresentsList(presets); renderCustomPresets();
            if (typeof SFX !== 'undefined') SFX.success();
        });
    }

    renderCustomPresets();

    // ==================================================
    // Varsayılan resim yükle
    // ==================================================
    image.crossOrigin = 'anonymous';
    image.src = 'img/logo.png';
    image.onload = () => {
        imageLoaded = true;
        canvas.width = image.width; canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        canvas.classList.remove('hidden');
        dropPlaceholder.classList.add('hidden');
        fileInfo.textContent = 'Varsayılan resim yüklü';
    };
});
