/* Copyright (C) Michael Leggett - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Michael Leggett <hi@simpl.fyi>
 */

// Add simplify class name to html tag
const el = {};
el.html = document.documentElement;
el.html.classList.add("simplify");

// Add keyboard shortcut for toggling on/off custom style
function handleKeydown(e) {
  let altKeyOnly = e.altKey && !e.shiftKey && !e.metaKey && !e.ctrlKey;

  // If Option+S or Alt+S was pressed, toggle Simplify on/off
  if (altKeyOnly && e.code === "KeyS") {
    document.documentElement.classList.toggle("simplify");
    e.preventDefault();
  }
}
window.addEventListener("keydown", handleKeydown, false);

// Init
function init() {
  report("Simplify NY Times v1.0 loaded");
}
window.addEventListener("load", init, false);
