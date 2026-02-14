const test = require('node:test');
const assert = require('node:assert/strict');
const {
    calculateBoardSize,
    isSolvedOrder,
    shufflePieces
} = require('../www/puzzle-logic.js');

test('isSolvedOrder returns true only when piece order is complete', () => {
    assert.equal(isSolvedOrder([0, 1, 2, 3]), true);
    assert.equal(isSolvedOrder([0, 2, 1, 3]), false);
});

test('shufflePieces keeps the same elements while changing order', () => {
    const source = [0, 1, 2, 3];
    const randomValues = [0.75, 0.25, 0];
    let index = 0;
    const randomFn = () => randomValues[index++];

    const shuffled = shufflePieces(source, randomFn);

    assert.deepEqual(shuffled, [1, 2, 0, 3]);
    assert.deepEqual([...shuffled].sort((a, b) => a - b), source);
    assert.deepEqual(source, [0, 1, 2, 3]);
});

test('calculateBoardSize clamps by viewport dimensions and limits', () => {
    assert.equal(calculateBoardSize(1200, 900), 500);
    assert.equal(calculateBoardSize(300, 900), 276);
    assert.equal(calculateBoardSize(1200, 400), 220);
});
