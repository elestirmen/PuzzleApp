(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.PuzzleLogic = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function calculateBoardSize(viewportWidth, viewportHeight, options = {}) {
        const maxBoardSize = options.maxBoardSize ?? 500;
        const minBoardSize = options.minBoardSize ?? 220;
        const horizontalPadding = options.horizontalPadding ?? 24;
        const verticalReserve = options.verticalReserve ?? 260;

        const maxByWidth = Math.max(minBoardSize, viewportWidth - horizontalPadding);
        const maxByHeight = Math.max(minBoardSize, viewportHeight - verticalReserve);
        const candidate = Math.min(maxBoardSize, maxByWidth, maxByHeight);

        return clamp(candidate, minBoardSize, maxBoardSize);
    }

    function shufflePieces(items, randomFn = Math.random) {
        const copy = [...items];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const randomIndex = Math.floor(randomFn() * (i + 1));
            [copy[i], copy[randomIndex]] = [copy[randomIndex], copy[i]];
        }
        return copy;
    }

    function isSolvedOrder(order) {
        return order.every((value, index) => value === index);
    }

    return {
        calculateBoardSize,
        isSolvedOrder,
        shufflePieces
    };
}));
