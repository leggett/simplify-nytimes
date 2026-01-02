/* Copyright (C) Michael Leggett - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Michael Leggett <hi@simpl.fyi>
 */

// Move selected items to the top of the grid
const moveSelectedCardsToTop = () => {
  console.log("Move selected items to the top");

  // Get all labels in DOM order
  const labels = Array.from(document.querySelectorAll('[data-testid="card-label"]'));

  if (labels.length === 0) {
    console.log("Labels not there?");
    return;
  }

  // Get the parent node for the board
  const container = labels[0].parentNode;

  // Split into selected vs unselected
  const selected = [];
  const unselected = [];

  for (const label of labels) {
    const input = label.querySelector('input[type="checkbox"]');
    if (input?.checked) {
      selected.push(label);
    } else {
      unselected.push(label);
    }
  }

  // Only move them to the top if there were 4 selected
  if (selected.length !== 4) {
    console.log("Not four items selected");
    return;
  }

  // Re-append in new order (this moves nodes, does not clone)
  [...selected, ...unselected].forEach((label) => {
    container.appendChild(label);
  });
};

const initShuffle = () => {
  // Add click listener to shuffle button to move selected cards to the top after short delay
  const shuffleButton = document.querySelector('[data-testid="shuffle-btn"]');
  shuffleButton.addEventListener("click", () => setTimeout(moveSelectedCardsToTop, 50));
};

doWhenAdded('[data-testid="shuffle-btn"]', initShuffle);
