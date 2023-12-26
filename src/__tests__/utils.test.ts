import { getFromPosition, insertAtPosition, removeFromPosition, updateAtPosition } from "../utils";
import { expect, test } from "vitest";

test('getFromPosition', () => {
    expect(getFromPosition(['a', 'b'], 0)).toEqual('a');
    expect(getFromPosition(['a', 'b'], 1)).toEqual('b');

    expect(getFromPosition([['a', 'b'], ['c', 'd']], [0, 0])).toEqual('a');
    expect(getFromPosition([['a', 'b'], ['c', 'd']], [0, 1])).toEqual('b');
    expect(getFromPosition([['a', 'b'], ['c', 'd']], [1, 0])).toEqual('c');
    expect(getFromPosition([['a', 'b'], ['c', 'd']], [1, 1])).toEqual('d');
});

test('insertAtPosition', () => {
    expect(insertAtPosition(['a', 'b'], '0', 0)).toEqual(['0', 'a', 'b']);
    expect(insertAtPosition(['a', 'b'], '1', 1)).toEqual(['a', '1', 'b']);
    expect(insertAtPosition(['a', 'b'], '2', 2)).toEqual(['a', 'b', '2']);

    expect(insertAtPosition([['a', 'b'], ['c', 'd']], '00', [0, 0])).toEqual([['00', 'a', 'b'], ['c', 'd']]);
    expect(insertAtPosition([['a', 'b'], ['c', 'd']], '01', [0, 1])).toEqual([['a', '01', 'b'], ['c', 'd']]);
    expect(insertAtPosition([['a', 'b'], ['c', 'd']], '02', [0, 2])).toEqual([['a', 'b', '02'], ['c', 'd']]);
    expect(insertAtPosition([['a', 'b'], ['c', 'd']], '10', [1, 0])).toEqual([['a', 'b'], ['10', 'c', 'd']]);
    expect(insertAtPosition([['a', 'b'], ['c', 'd']], '11', [1, 1])).toEqual([['a', 'b'], ['c', '11', 'd']]);
    expect(insertAtPosition([['a', 'b'], ['c', 'd']], '12', [1, 2])).toEqual([['a', 'b'], ['c', 'd', '12']]);
});

test('updateAtPosition', () => {
    expect(updateAtPosition(['a', 'b'], '0', 0)).toEqual(['0', 'b']);
    expect(updateAtPosition(['a', 'b'], '1', 1)).toEqual(['a', '1']);

    expect(updateAtPosition([['a', 'b'], ['c', 'd']], '00', [0, 0])).toEqual([['00', 'b'], ['c', 'd']]);
    expect(updateAtPosition([['a', 'b'], ['c', 'd']], '01', [0, 1])).toEqual([['a', '01'], ['c', 'd']]);
    expect(updateAtPosition([['a', 'b'], ['c', 'd']], '10', [1, 0])).toEqual([['a', 'b'], ['10', 'd']]);
    expect(updateAtPosition([['a', 'b'], ['c', 'd']], '11', [1, 1])).toEqual([['a', 'b'], ['c', '11']]);
});

test('removeFromPosition', () => {
    expect(removeFromPosition(['a', 'b'], 0)).toEqual(['b']);
    expect(removeFromPosition(['a', 'b'], 1)).toEqual(['a']);

    expect(removeFromPosition([['a', 'b'], ['c', 'd']], [0, 0])).toEqual([['b'], ['c', 'd']]);
    expect(removeFromPosition([['a', 'b'], ['c', 'd']], [0, 1])).toEqual([['a'], ['c', 'd']]);
    expect(removeFromPosition([['a', 'b'], ['c', 'd']], [1, 0])).toEqual([['a', 'b'], ['d']]);
    expect(removeFromPosition([['a', 'b'], ['c', 'd']], [1, 1])).toEqual([['a', 'b'], ['c']]);
});
