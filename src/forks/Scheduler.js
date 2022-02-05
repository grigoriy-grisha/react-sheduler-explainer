/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* eslint-disable no-var */

/** @namespace Scheduler Code */

import { push, pop, peek } from "../SchedulerMinHeap";

// TODO: Use symbols?
import {
  ImmediatePriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority,
  IdlePriority,
} from "../SchedulerPriorities";

let getCurrentTime;
const hasPerformanceNow =
  typeof performance === "object" && typeof performance.now === "function";

if (hasPerformanceNow) {
  const localPerformance = performance;
  getCurrentTime = () => localPerformance.now();
} else {
  const localDate = Date;
  const initialTime = localDate.now();
  getCurrentTime = () => localDate.now() - initialTime;
}

// Max 31 bit integer. The max integer size in V8 for 32-bit systems.
// Math.pow(2, 30) - 1
// 0b111111111111111111111111111111
var maxSigned31BitInt = 1073741823;

// Times out immediately
var IMMEDIATE_PRIORITY_TIMEOUT = -1;
// Eventually times out
var USER_BLOCKING_PRIORITY_TIMEOUT = 250;
var NORMAL_PRIORITY_TIMEOUT = 5000;
var LOW_PRIORITY_TIMEOUT = 10000;
// Never times out
var IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt;

// Tasks are stored on a min heap
var taskQueue = [];
var timerQueue = [];

// Incrementing id counter. Used to maintain insertion order.
var taskIdCounter = 1;

// Pausing the scheduler is useful for debugging.
var isSchedulerPaused = false;

var currentTask = null;
var currentPriorityLevel = NormalPriority;

/**
 * @memberof Scheduler Code
 * Это устанавливается во время выполнения работы, чтобы предотвратить повторное включение.
 * */
var isPerformingWork = false;

/**
 * @memberof Scheduler Code
 * планируется ли функция обратного вызова
 * */
var isHostCallbackScheduled = false;

/**
 * @memberof Scheduler Code
 * запланирвоанная функция обратного вызова, которую передаем в scheduleCallback
 * */
var isHostTimeoutScheduled = false;

// Capture local references to native APIs, in case a polyfill overrides them.
const localSetTimeout = typeof setTimeout === "function" ? setTimeout : null;
const localClearTimeout =
  typeof clearTimeout === "function" ? clearTimeout : null;
const localSetImmediate =
  typeof setImmediate !== "undefined" ? setImmediate : null; // IE and Node.js + jsdom

/** @description Проверяет задачи, которые больше не задерживаются, и добавляет их из очереди таймеров в очередь задач.
 *  @param currentTime {number} текущее время
 *  @return void
 *  @memberof Scheduler Code
 * */
function advanceTimers(currentTime) {
  // Check for tasks that are no longer delayed and add them to the queue.
  let timer = peek(timerQueue);
  while (timer !== null) {
    if (timer.callback === null) {
      /** Тайер был отменен, удалить его из очереди */
      pop(timerQueue);
    } else if (timer.startTime <= currentTime) {
      /** Тайер сработал, переместить его в очередь тасок */
      pop(timerQueue);
      timer.sortIndex = timer.expirationTime;
      push(taskQueue, timer);
    } else {
      // Remaining timers are pending.
      return;
    }
    timer = peek(timerQueue);
  }
}

function handleTimeout(currentTime) {
  isHostTimeoutScheduled = false;
  /** перемещаем истекшие таймеры в очеред тасок  */
  advanceTimers(currentTime);

  if (!isHostCallbackScheduled) {
    if (peek(taskQueue) !== null) {
      /** если очередь задач не пуста, запускаем синхронно flushWork */
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    } else {
      const firstTimer = peek(timerQueue);
      /** если очередь таймеров не пуста , планиурем заново handleTimeout  */
      if (firstTimer !== null) {
        requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
      }
    }
  }
}

function flushWork(hasTimeRemaining, initialTime) {
  // We'll need a host callback the next time work is scheduled.
  isHostCallbackScheduled = false;
  if (isHostTimeoutScheduled) {
    // We scheduled a timeout but it's no longer needed. Cancel it.
    isHostTimeoutScheduled = false;
    cancelHostTimeout();
  }

  isPerformingWork = true;
  const previousPriorityLevel = currentPriorityLevel;
  try {
    // No catch in prod code path.
    return workLoop(hasTimeRemaining, initialTime);
  } finally {
    currentTask = null;
    currentPriorityLevel = previousPriorityLevel;
    isPerformingWork = false;
  }
}

/**
 * @memberof Scheduler Code
 * @param hasTimeRemaining {boolean}
 * @param initialTime {number}
 * @memberof Scheduler Code
 * @returns {boolean} Возврат используется в функции performWorkUntilDeadline для определения есть ли еще работа, если есть,
 * то планируем новый workLoop. При планировании flushWork, который вызывает workLoop присваивается переменной scheduledHostCallback
 */
function workLoop(hasTimeRemaining, initialTime) {
  let currentTime = initialTime;
  advanceTimers(currentTime);
  currentTask = peek(taskQueue);

  /** выполнять пока есть задачи и планировщик не остановлен */
  while (currentTask !== null && !isSchedulerPaused) {
    /** если время вышло у задачи, то выходим из цикла */
    if (
      currentTask.expirationTime > currentTime &&
      (!hasTimeRemaining || shouldYieldToHost())
    ) {
      // This currentTask hasn't expired, and we've reached the deadline.
      break;
    }
    const callback = currentTask.callback;
    if (typeof callback === "function") {
      currentTask.callback = null;
      currentPriorityLevel = currentTask.priorityLevel;
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;

      const continuationCallback = callback(didUserCallbackTimeout);
      currentTime = getCurrentTime();
      if (typeof continuationCallback === "function") {
        /** если задача возвращает функцию, то помещаем эту функцию в эту же задачу */
        currentTask.callback = continuationCallback;
      } else {
        /** удаляем функцию, если задача не возвращает функцию */
        if (currentTask === peek(taskQueue)) {
          pop(taskQueue);
        }
      }
      advanceTimers(currentTime);
    } else {
      /** удаляем таску, если задача не имеет функции */
      pop(taskQueue);
    }
    /** берем новую задачу из очереди задач */
    currentTask = peek(taskQueue);
  }

  if (currentTask !== null) {
    /** Если есть еще задачи в очереди, возвращаем true (есть еще работа) */
    return true;
  } else {
    /** Проеряем есть ли задачи в очереди таймеров, если есть, то планируем новый flushWork  */
    const firstTimer = peek(timerQueue);
    if (firstTimer !== null) {
      requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
    }
    return false;
  }
}

function unstable_runWithPriority(priorityLevel, eventHandler) {
  switch (priorityLevel) {
    case ImmediatePriority:
    case UserBlockingPriority:
    case NormalPriority:
    case LowPriority:
    case IdlePriority:
      break;
    default:
      priorityLevel = NormalPriority;
  }

  var previousPriorityLevel = currentPriorityLevel;
  currentPriorityLevel = priorityLevel;

  try {
    return eventHandler();
  } finally {
    currentPriorityLevel = previousPriorityLevel;
  }
}

function unstable_next(eventHandler) {
  var priorityLevel;
  switch (currentPriorityLevel) {
    case ImmediatePriority:
    case UserBlockingPriority:
    case NormalPriority:
      // Shift down to normal priority
      priorityLevel = NormalPriority;
      break;
    default:
      // Anything lower than normal priority should remain at the current level.
      priorityLevel = currentPriorityLevel;
      break;
  }

  var previousPriorityLevel = currentPriorityLevel;
  currentPriorityLevel = priorityLevel;

  try {
    return eventHandler();
  } finally {
    currentPriorityLevel = previousPriorityLevel;
  }
}

function unstable_wrapCallback(callback) {
  var parentPriorityLevel = currentPriorityLevel;
  return function () {
    // This is a fork of runWithPriority, inlined for performance.
    var previousPriorityLevel = currentPriorityLevel;
    currentPriorityLevel = parentPriorityLevel;

    try {
      return callback.apply(this, arguments);
    } finally {
      currentPriorityLevel = previousPriorityLevel;
    }
  };
}

/**
 *  @memberof Scheduler Code
 *  @description Планирует callback по приоритету или delay
 *  @param priorityLevel {  ImmediatePriority,
                            UserBlockingPriority,
                            NormalPriority,
                            LowPriority,
                            IdlePriority
                         } приоритет задачи
 *  @param callback {function} функция, которую нужно запланировать
 *  @param options {{ delay: number }} объект с delay
 *  @return {{ priorityLevel: 0 | 1 | 2 | 3 | 4 | 5,
 *             sortIndex: number,
 *             expirationTime: number,
 *             callback: Function,
 *             startTime: number,
 *             id: number
 *           }} объект новой таски с метаданными
 */
function unstable_scheduleCallback(priorityLevel, callback, options) {
  var currentTime = getCurrentTime();

  /** определение startTime */
  var startTime;
  if (typeof options === "object" && options !== null) {
    var delay = options.delay;
    if (typeof delay === "number" && delay > 0) {
      startTime = currentTime + delay;
    } else {
      startTime = currentTime;
    }
  } else {
    startTime = currentTime;
  }

  /** определение timeout по приоритетности */
  var timeout;
  switch (priorityLevel) {
    case ImmediatePriority:
      timeout = IMMEDIATE_PRIORITY_TIMEOUT;
      break;
    case UserBlockingPriority:
      timeout = USER_BLOCKING_PRIORITY_TIMEOUT;
      break;
    case IdlePriority:
      timeout = IDLE_PRIORITY_TIMEOUT;
      break;
    case LowPriority:
      timeout = LOW_PRIORITY_TIMEOUT;
      break;
    case NormalPriority:
    default:
      timeout = NORMAL_PRIORITY_TIMEOUT;
      break;
  }

  /** вычисление срока истечения таймаута */
  var expirationTime = startTime + timeout;

  var newTask = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: -1,
  };

  /** выпоняется, если задаче установлен delay,
   * то планируем задачу через requestHostTimeout (setTimeout, setImmediate, postMessages)
   */
  if (startTime > currentTime) {
    // This is a delayed task.
    newTask.sortIndex = startTime;

    push(timerQueue, newTask);
    if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
      // All tasks are delayed, and this is the task with the earliest delay.
      if (isHostTimeoutScheduled) {
        // Cancel an existing timeout.
        cancelHostTimeout();
      } else {
        isHostTimeoutScheduled = true;
      }
      // Schedule a timeout.
      requestHostTimeout(handleTimeout, startTime - currentTime);
    }
  } else {
    /** если задаче не установлен delay, то задача попадает в очередь тасок */
    newTask.sortIndex = expirationTime;
    push(taskQueue, newTask);

    // Schedule a host callback, if needed. If we're already performing work,
    // wait until the next time we yield.
    if (!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    }
  }

  return newTask;
}

function unstable_pauseExecution() {
  isSchedulerPaused = true;
}

function unstable_continueExecution() {
  isSchedulerPaused = false;
  if (!isHostCallbackScheduled && !isPerformingWork) {
    isHostCallbackScheduled = true;
    requestHostCallback(flushWork);
  }
}

/**
 *  @memberof Scheduler Code
 *  @description Отдает самый верхний элемент кучи тасок с самым высоким приоритетом
 *  @return {{ id: number, sortIndex: number} | null} если куча не пуста,
 *  то возвращаем элемент с самым высоким приоритетом, иначе null
 */
function unstable_getFirstCallbackNode() {
  return peek(taskQueue);
}

function unstable_cancelCallback(task) {
  // Null out the callback to indicate the task has been canceled. (Can't
  // remove from the queue because you can't remove arbitrary nodes from an
  // array based heap, only the first one.)
  task.callback = null;
}

function unstable_getCurrentPriorityLevel() {
  return currentPriorityLevel;
}
/**  выполняются ли в данные момент какие-то задачи */
let isMessageLoopRunning = false;

/**
 * @memberof Scheduler Code
 * запланированный callback, тот который передаем в scheduleCallback.
 * Функция типа (hasTimeRemaining: boolean, currentTime: number) => void или null
 * В этой переменной хранится функция flushWork или null
 * @type {function | null}
 * */
let scheduledHostCallback = null;

let taskTimeoutID = -1;

// Scheduler periodically yields in case there is other work on the main
// thread, like user events. By default, it yields multiple times per frame.
// It does not attempt to align with frame boundaries, since most tasks don't
// need to be frame aligned; for those that do, use requestAnimationFrame.
let yieldInterval = 5;
let deadline = 0;

// TODO: Make this configurable
// TODO: Adjust this based on priority?
const maxYieldInterval = 300;
let needsPaint = false;

function shouldYieldToHost() {
  if (
    navigator !== undefined &&
    navigator.scheduling !== undefined &&
    navigator.scheduling.isInputPending !== undefined
  ) {
    const scheduling = navigator.scheduling;
    const currentTime = getCurrentTime();
    if (currentTime >= deadline) {
      // There's no time left. We may want to yield control of the main
      // thread, so the browser can perform high priority tasks. The main ones
      // are painting and user input. If there's a pending paint or a pending
      // input, then we should yield. But if there's neither, then we can
      // yield less often while remaining responsive. We'll eventually yield
      // regardless, since there could be a pending paint that wasn't
      // accompanied by a call to `requestPaint`, or other main thread tasks
      // like network events.
      if (needsPaint || scheduling.isInputPending()) {
        // There is either a pending paint or a pending input.
        return true;
      }
      // There's no pending input. Only yield if we've reached the max
      // yield interval.
      const timeElapsed = currentTime - (deadline - yieldInterval);
      return timeElapsed >= maxYieldInterval;
    } else {
      // There's still time left in the frame.
      return false;
    }
  } else {
    // `isInputPending` is not available. Since we have no way of knowing if
    // there's pending input, always yield at the end of the frame.
    return getCurrentTime() >= deadline;
  }
}

function requestPaint() {
  if (
    navigator !== undefined &&
    navigator.scheduling !== undefined &&
    navigator.scheduling.isInputPending !== undefined
  ) {
    needsPaint = true;
  }

  // Since we yield every frame regardless, `requestPaint` has no effect.
}

/**
 * yieldInterval — это интервал, с которым React сам контролирует выполнение задач разделения времени.
 * Интервал планирования может быть установлен в соответствии с обновлением различных устройств.
 * */
function forceFrameRate(fps) {
  if (fps < 0 || fps > 125) {
    // Using console['error'] to evade Babel and ESLint
    console["error"](
      "forceFrameRate takes a positive int between 0 and 125, " +
        "forcing frame rates higher than 125 fps is not supported"
    );
    return;
  }
  if (fps > 0) {
    yieldInterval = Math.floor(1000 / fps);
  } else {
    // reset the framerate
    yieldInterval = 5;
  }
}

/**
 * @memberof Scheduler Code
 * Выполнять задачи до дедлайна
 * */
const performWorkUntilDeadline = () => {
  if (scheduledHostCallback !== null) {
    const currentTime = getCurrentTime();
    // Yield after `yieldInterval` ms, regardless of where we are in the vsync
    // cycle. This means there's always time remaining at the beginning of
    // the message event.
    deadline = currentTime + yieldInterval;
    /** Значение нигде не меняется и так передается в scheduledHostCallback (flushWork), а затем workLoop  */
      //todo посмотреть, не удалил ли я ниего лишнего
    const hasTimeRemaining = true;

    // If a scheduler task throws, exit the current browser task so the
    // error can be observed.
    //
    // Intentionally not using a try-catch, since that makes some debugging
    // techniques harder. Instead, if `scheduledHostCallback` errors, then
    // `hasMoreWork` will remain true, and we'll continue the work loop.
    let hasMoreWork = true;
    try {
      /** выполянем scheduledHostCallback (flushWork) */
      hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
    } finally {
      if (hasMoreWork) {
        // If there's more work, schedule the next message event at the end
        // of the preceding one.
        schedulePerformWorkUntilDeadline();
      } else {
        isMessageLoopRunning = false;
        scheduledHostCallback = null;
      }
    }
  } else {
    isMessageLoopRunning = false;
  }
  // Yielding to the browser will give it a chance to paint, so we can
  // reset this.
  needsPaint = false;
};

let schedulePerformWorkUntilDeadline;
if (typeof localSetImmediate === "function") {
  // Node.js and old IE.
  // There's a few reasons for why we prefer setImmediate.
  //
  // Unlike MessageChannel, it doesn't prevent a Node.js process from exiting.
  // (Even though this is a DOM fork of the Scheduler, you could get here
  // with a mix of Node.js 15+, which has a MessageChannel, and jsdom.)
  // https://github.com/facebook/react/issues/20756
  //
  // But also, it runs earlier which is the semantic we want.
  // If other browsers ever implement it, it's better to use it.
  // Although both of these would be inferior to native scheduling.
  schedulePerformWorkUntilDeadline = () => {
    localSetImmediate(performWorkUntilDeadline);
  };
} else if (typeof MessageChannel !== "undefined") {
  // DOM and Worker environments.
  // We prefer MessageChannel because of the 4ms setTimeout clamping.
  const channel = new MessageChannel();
  const port = channel.port2;
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => {
    port.postMessage(null);
  };
} else {
  // We should only fallback here in non-browser environments.
  schedulePerformWorkUntilDeadline = () => {
    localSetTimeout(performWorkUntilDeadline, 0);
  };
}

/**
 * @memberof Scheduler Code
 * @description Планируем flushWork вызов, scheduledHostCallback, это flushWork
 * @param callback {function} функция, которую нужно выполнить, тут используется только flushWork
 */
function requestHostCallback(callback) {
  scheduledHostCallback = callback;

  /** если performWorkUntilDeadline не запущена, то планируем вызов performWorkUntilDeadline */
  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    schedulePerformWorkUntilDeadline();
  }
}

/**
 * @memberof Scheduler Code
 * @description setTimeout
 */
function requestHostTimeout(callback, ms) {
  taskTimeoutID = localSetTimeout(() => {
    callback(getCurrentTime());
  }, ms);
}

/**
 * @memberof Scheduler Code
 * @description  clearTimeout
 */
function cancelHostTimeout() {
  localClearTimeout(taskTimeoutID);
  taskTimeoutID = -1;
}

const unstable_requestPaint = requestPaint;

export {
  ImmediatePriority as unstable_ImmediatePriority,
  UserBlockingPriority as unstable_UserBlockingPriority,
  NormalPriority as unstable_NormalPriority,
  IdlePriority as unstable_IdlePriority,
  LowPriority as unstable_LowPriority,
  unstable_runWithPriority,
  unstable_next,
  unstable_scheduleCallback,
  unstable_cancelCallback,
  unstable_wrapCallback,
  unstable_getCurrentPriorityLevel,
  shouldYieldToHost as unstable_shouldYield,
  unstable_requestPaint,
  unstable_continueExecution,
  unstable_pauseExecution,
  unstable_getFirstCallbackNode,
  getCurrentTime as unstable_now,
  forceFrameRate as unstable_forceFrameRate,
};
