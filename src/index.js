import React, { useState } from "react";
import ReactDOM from "react-dom";
import {
  unstable_scheduleCallback,
  unstable_getFirstCallbackNode,
  unstable_cancelCallback,
  unstable_requestPaint,
} from "./forks/Scheduler";
import {
  NormalPriority,
  ImmediatePriority,
  IdlePriority,
} from "./SchedulerPriorities";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

function slowTask() {
  arr.forEach(() => {
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {
      arr.forEach(() => {});
    });
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
    arr.forEach(() => {});
  });
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
  arr.forEach(() => {});
}

const input = document.querySelector("input");
const hello = document.querySelector(".hello");

const arr = new Array(1000).fill(null);

input.addEventListener("input", () => {
  const task = unstable_getFirstCallbackNode();
  if (task) {
    unstable_cancelCallback(task);
  }

  unstable_scheduleCallback(NormalPriority, () => {
    slowTask();
  });

  // unstable_scheduleCallback(NormalPriority, () => {
  console.log("123");
  hello.innerHTML = "";
  const elem = document.createElement("div");

  arr.forEach(() => {
    const newElem = document.createElement("div");
    newElem.innerHTML = Math.random().toString();
    elem.appendChild(newElem);
  });
  hello.insertAdjacentElement("beforebegin", elem);
  // });
});
