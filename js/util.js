/* Copyright (C) Michael Leggett - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Michael Leggett <hi@simpl.fyi>
 */

// ==========================================================================
// UTILITIES

// Toggles custom style and returns latest state
function toggleSimplify() {
  return document.documentElement.classList.toggle("simplify");
}

// Make and return element(s) for appending to the DOM
const make = (selector, ...args) => {
  const attrs = typeof args[0] === "object" && !(args[0] instanceof HTMLElement) ? args.shift() : {};

  let classes = selector.split(".");
  if (classes.length > 0) selector = classes.shift();
  if (classes.length) attrs.className = classes.join(" ");

  let id = selector.split("#");
  if (id.length > 0) selector = id.shift();
  if (id.length) attrs.id = id[0];

  const node = document.createElement(selector.length > 0 ? selector : "div");
  for (let prop in attrs) {
    if (attrs.hasOwnProperty(prop) && attrs[prop] != undefined) {
      if (prop.indexOf("data-") == 0) {
        let dataProp = prop.substring(5).replace(/-([a-z])/g, function (g) {
          return g[1].toUpperCase();
        });
        node.dataset[dataProp] = attrs[prop];
      } else {
        node[prop] = attrs[prop];
      }
    }
  }

  const append = (child) => {
    if (Array.isArray(child)) return child.forEach(append);
    if (typeof child == "string") child = document.createTextNode(child);
    if (child) node.appendChild(child);
  };
  args.forEach(append);
  return node;
};

// Shorthand for getting first matching element; returns Node
const get = (selector, parent = "") => {
  if (parent === "") {
    return document.querySelector(selector);
  } else if (parent instanceof Node) {
    return parent.querySelector(selector);
  } else if (typeof parent === "string") {
    return document.querySelector(`${parent} ${selector}`);
  } else {
    console.error(`get(${selector}) called with undefined parent, ${parent}`);
    return null;
  }
};

// Shorthand for getting elements; returns NodeList
const gets = (selector, parent = "") => {
  if (parent === "") {
    return document.querySelectorAll(selector);
  } else if (parent instanceof Node) {
    return parent.querySelectorAll(selector);
  } else if (typeof parent === "string") {
    return document.querySelector(`${parent} ${selector}`);
  } else {
    error("gets() called with undefined parent.", selector, parent);
    return false;
  }
};

// Shorthand for getting number of elements given a provided selector
const count = (selector, parent = "") => {
  if (parent === "") {
    return document.querySelectorAll(selector).length;
  } else if (parent instanceof Node) {
    return parent.querySelectorAll(selector).length;
  } else if (typeof parent === "string") {
    return document.querySelectorAll(`${parent} ${selector}`).length;
  } else {
    error("count() called with undefined parent.", selector, parent);
    return false;
  }
};

// Shorthand for seeing if an element exists
const exists = (selector, parent = "") => {
  if (parent === "") {
    // return document.querySelectorAll(selector).length > 0;
    return document.body.contains(document.querySelector(selector));
  } else if (parent instanceof Node) {
    return document.body.contains(parent.querySelector(selector));
  } else if (typeof parent === "string") {
    return document.body.contains(document.querySelector(`${parent} ${selector}`));
  } else {
    error("exists() called with undefined parent.", selector, parent);
    return null;
  }
};

// Run function when element is added to the DOM
const doWhenAdded = async (selector, action, parent = document.body) => {
  const isAdded = (selector, parent) => {
    return get(selector, parent) !== null;
  };

  const elementIsAdded = new Promise((resolve, reject) => {
    // Resolve if element is already added
    if (isAdded(selector)) {
      resolve(true);
      return;
    }

    // Otherwise, wait for it to be active
    const observer = new MutationObserver((mutation, observer) => {
      if (isAdded(selector)) {
        console.log("Element has been added", selector);
        observer.disconnect();
        resolve(true);
      }
    });
    observer.observe(parent, {
      attributes: false,
      childList: true,
      subtree: true,
    });

    // Stop waiting after 5 seconds
    // setTimeout(() => {
    //   observer.disconnect();
    //   reject("Element never became active");
    // }, 5000);
  });

  await elementIsAdded;
  action();
};
