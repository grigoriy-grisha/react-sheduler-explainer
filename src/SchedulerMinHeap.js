/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

/**
 *  в этом файле находится реализация бинарной кучи,
 *  которая используется для приоритизированного хранения задач
 */

/**
 *  @description Пушит элемент в конец кучи, дальше с помощью siftUp куча нормализуется,
 *  так как новый элемент может иметь вес больше,чем у его parent элементов и они меняются местами
 *  @param node {{  id: number, sortIndex: number}} элемент, который нужно запушить,
 *  тут еще могут быть поля, основные id и sortIndex, по которым производится сортировка
 *  @param heap {{  id: number, sortIndex: number}[]} куча, в которую нужно сделать push
 */
export function push(heap, node) {
  const index = heap.length;
  heap.push(node);
  siftUp(heap, node, index);
}

/**
 *  @description Отдает самый верхний элемент кучи
 *  @param heap {{  id: number, sortIndex: number}[]} куча, из которой нужно достать элемент
 *  @return {{ id: number, sortIndex: number} | null} если куча не пуста,
 *  то возвращаем элемент с самым высоким приоритетом, иначе null
 */
export function peek(heap) {
  return heap.length === 0 ? null : heap[0];
}

/**
 *  @description удаляет самый последний элемент, затем меняет местами последний и первый элемент,
 *  после этого куча нормализуется с помощью siftDown
 *  @param heap {{  id: number, sortIndex: number}[]} куча, из которой нужно удалить последний элемент
 *  @return {{ id: number, sortIndex: number} | null} если куча не пуста, то возвращаем последний элемент , иначе null
 */
export function pop(heap) {
  if (heap.length === 0) {
    return null;
  }
  const first = heap[0];
  const last = heap.pop();
  if (last !== first) {
    heap[0] = last;
    siftDown(heap, last, 0);
  }
  return first;
}

/**
 *  @description нормализация кучи "на месте", просеиваиние элементов вверх
 *  @param heap {{  id: number, sortIndex: number}[]} куча, которую нужно нормализотвать, после вставки
 *  @param node {{  id: number, sortIndex: number}} элемент, который нужно вставить
 *  @param i {number} индекс, последенго вставленного элемента
 *  @return {void} Ничего не возрващает, результат функции это нормализовання куча, нормализация происходит "на месте"
 */
function siftUp(heap, node, i) {
  let index = i;
  while (index > 0) {
    const parentIndex = (index - 1) >>> 1;
    const parent = heap[parentIndex];
    if (compare(parent, node) > 0) {
      // The parent is larger. Swap positions.
      heap[parentIndex] = node;
      heap[index] = parent;
      index = parentIndex;
    } else {
      // The parent is smaller. Exit.
      return;
    }
  }
}

/**
 *  @description нормализация кучи "на месте", просеиваиние элементов вниз
 *  @param heap {{  id: number, sortIndex: number}[]} куча, которую нужно нормализотвать, после удаления
 *  @param node {{  id: number, sortIndex: number}} элемент, последний элемент
 *  @param i {number} индекс, откуда начать нормальзацию
 *  @return {void} Ничего не возрващает, результат функции это нормализовання куча, нормализация происходит "на месте"
 */
function siftDown(heap, node, i) {
  let index = i;
  const length = heap.length;
  const halfLength = length >>> 1;
  while (index < halfLength) {
    const leftIndex = (index + 1) * 2 - 1;
    const left = heap[leftIndex];
    const rightIndex = leftIndex + 1;
    const right = heap[rightIndex];

    // If the left or right node is smaller, swap with the smaller of those.
    if (compare(left, node) < 0) {
      if (rightIndex < length && compare(right, left) < 0) {
        heap[index] = right;
        heap[rightIndex] = node;
        index = rightIndex;
      } else {
        heap[index] = left;
        heap[leftIndex] = node;
        index = leftIndex;
      }
    } else if (rightIndex < length && compare(right, node) < 0) {
      heap[index] = right;
      heap[rightIndex] = node;
      index = rightIndex;
    } else {
      // Neither child is smaller. Exit.
      return;
    }
  }
}

/**
 *  @description функция сравнения двух элементов кучи
 *  @param a {{  id: number, sortIndex: number}}  левый элемент
 *  @param b {{  id: number, sortIndex: number}}  правый элемент
 *  @return {number} возварщает число, которое затем используется для сортировки
 */
function compare(a, b) {
  // Compare sort index first, then task id.
  const diff = a.sortIndex - b.sortIndex;
  return diff !== 0 ? diff : a.id - b.id;
}
