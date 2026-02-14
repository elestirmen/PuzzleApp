document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    initApp();
}

if (!window.cordova) {
    document.addEventListener('DOMContentLoaded', initApp);
}

function initApp() {
    const imageLoader = document.getElementById('image-loader');
    const difficultySelect = document.getElementById('difficulty');
    const startButton = document.getElementById('start-button');
    const puzzleContainer = document.getElementById('puzzle-container');
    const moveDisplay = document.getElementById('move-count');
    const setupScreen = document.getElementById('setup-screen');
    const gameScreen = document.getElementById('game-screen');
    const winMessage = document.getElementById('win-message');
    const puzzleLogic = window.PuzzleLogic || {};
    const timerDisplay = document.getElementById('timer');

    const shufflePieces = typeof puzzleLogic.shufflePieces === 'function' ? puzzleLogic.shufflePieces : (arr) => arr.sort(() => Math.random() - 0.5);
    const isSolvedOrder = typeof puzzleLogic.isSolvedOrder === 'function' ? puzzleLogic.isSolvedOrder : (order) => order.every((v, i) => v === i);
    const calculateBoardSize = typeof puzzleLogic.calculateBoardSize === 'function' ? puzzleLogic.calculateBoardSize : (w, h) => Math.min(w - 40, h - 300, 500);

    // VARSAYILAN RESİM: HTML'deki window.imageSrc değerini kullan (img/logo.png)
    let imageSrc = window.imageSrc || 'img/logo.png';
    let gridSize = 4;
    let firstClickedPiece = null;
    let moveCount = 0;
    let timerInterval = null;
    let timerSeconds = 0;

    function startTimer() {
        stopTimer();
        timerSeconds = 0;
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timerSeconds++;
            updateTimerDisplay();
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function updateTimerDisplay() {
        const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
        const secs = String(timerSeconds % 60).padStart(2, '0');
        timerDisplay.textContent = `${mins}:${secs}`;
    }

    imageLoader.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            imageSrc = e.target.result;
            window.imageSrc = imageSrc; // Globali de güncelle
        };
        reader.readAsDataURL(file);
    });

    startButton.addEventListener('click', () => {
        // HTML'den güncel imageSrc ve difficulty al
        imageSrc = window.imageSrc;
        gridSize = parseInt(difficultySelect.value, 10);

        if (!imageSrc) {
            alert('Lütfen bir resim seçin!');
            return;
        }

        moveCount = 0;
        moveDisplay.textContent = '0';

        // UI Geçişi
        setupScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        winMessage.classList.add('hidden');

        setupPuzzle();
        startTimer();
    });

    function setupPuzzle() {
        puzzleContainer.innerHTML = '';
        firstClickedPiece = null;

        const size = calculateBoardSize(window.innerWidth, window.innerHeight);
        puzzleContainer.style.width = `${size}px`;
        puzzleContainer.style.height = `${size}px`;
        puzzleContainer.style.display = 'grid';
        puzzleContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        puzzleContainer.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

        const pieces = [];
        for (let i = 0; i < gridSize * gridSize; i++) {
            const piece = document.createElement('div');
            piece.classList.add('puzzle-piece');
            piece.dataset.index = i;
            piece.style.backgroundImage = `url(${imageSrc})`;
            piece.style.backgroundSize = `${gridSize * 100}% ${gridSize * 100}%`;

            const col = i % gridSize;
            const row = Math.floor(i / gridSize);
            const posX = (col / (gridSize - 1)) * 100;
            const posY = (row / (gridSize - 1)) * 100;
            piece.style.backgroundPosition = `${posX}% ${posY}%`;

            piece.addEventListener('click', onPieceClick);
            pieces.push(piece);
        }

        let shuffled = shufflePieces(pieces);
        while (isSolvedOrder(shuffled.map(p => parseInt(p.dataset.index)))) {
            shuffled = shufflePieces(pieces);
        }
        shuffled.forEach(p => puzzleContainer.appendChild(p));
    }

    function onPieceClick() {
        if (!winMessage.classList.contains('hidden')) return;

        if (firstClickedPiece === null) {
            this.classList.add('selected');
            firstClickedPiece = this;
        } else if (firstClickedPiece === this) {
            this.classList.remove('selected');
            firstClickedPiece = null;
        } else {
            swapPieces(firstClickedPiece, this);
            firstClickedPiece.classList.remove('selected');
            firstClickedPiece = null;
            moveCount++;
            moveDisplay.textContent = moveCount;
            checkWinCondition();
        }
    }

    function swapPieces(p1, p2) {
        const parent = p1.parentNode;
        const p1Next = p1.nextSibling === p2 ? p1 : p1.nextSibling;

        const r1 = p1.getBoundingClientRect();
        const r2 = p2.getBoundingClientRect();

        if (p1.nextSibling === p2) {
            parent.insertBefore(p2, p1);
        } else {
            p2.parentNode.insertBefore(p1, p2);
            parent.insertBefore(p2, p1Next);
        }

        const nr1 = p1.getBoundingClientRect();
        const nr2 = p2.getBoundingClientRect();

        p1.style.transition = 'none';
        p2.style.transition = 'none';
        p1.style.transform = `translate(${r1.left - nr1.left}px, ${r1.top - nr1.top}px)`;
        p2.style.transform = `translate(${r2.left - nr2.left}px, ${r2.top - nr2.top}px)`;

        requestAnimationFrame(() => {
            p1.style.transition = 'transform 0.2s ease-out';
            p2.style.transition = 'transform 0.2s ease-out';
            p1.style.transform = 'translate(0,0)';
            p2.style.transform = 'translate(0,0)';
        });
    }

    function checkWinCondition() {
        const pieces = Array.from(puzzleContainer.querySelectorAll('.puzzle-piece'));
        const currentOrder = pieces.map(p => parseInt(p.dataset.index));
        if (isSolvedOrder(currentOrder)) {
            stopTimer();
            winMessage.classList.remove('hidden');
        }
    }
}
