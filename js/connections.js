/* Copyright (C) Michael Leggett - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Michael Leggett <hi@simpl.fyi>
 */

// ========================================================
// ON SHUFFLE

// Move selected items to the top of the grid
const moveSelectedCardsToTop = () => {
  console.log("Move selected items to the top");

  // Get all labels in DOM order
  const labels = Array.from(gets('[data-testid="card-label"]'));

  // Abort if we can't find the labels
  if (!labels.length) return;

  // Get the parent node for the board
  const container = labels[0].parentNode;

  // Helper: get a label node for a checkbox id
  const getLabelForId = (id) => get(`label[for="${CSS.escape(id)}"]`, container);

  // Build locked labels (groups are atomic)
  const lockedLabels = [];
  for (const ids of lockedGroups) {
    const group = ids.map(getLabelForId).filter(Boolean);
    if (group.length === 4) lockedLabels.push(...group);
  }
  // const lockedGroups = [];
  // for (let rowIdx = 0; rowIdx < 4; rowIdx++) {
  //   const ids = lockedRows[rowIdx];
  //   if (!ids?.length) continue;

  //   const group = ids.map(getLabelForId).filter(Boolean);

  //   if (group.length === 4) {
  //     lockedGroups.push(group);
  //   } else {
  //     // cards were removed or DOM is in transition; drop this lock to prevent mixing
  //     delete lockedRows[rowIdx];
  //     const btn = get(`.lockRows .lockRow${rowIdx + 1}`);
  //     if (btn) btn.dataset.locked = "false";
  //   }
  // }
  // const lockedLabels = lockedGroups.flat();

  // Everything else (not locked), in current DOM order
  const lockedSet = new Set(lockedLabels);
  const remaining = labels.filter((l) => !lockedSet.has(l));

  // Split remaining into selected/unselected
  const selected = [];
  const unselected = [];

  for (const label of remaining) {
    const input = get('input[type="checkbox"]', label);
    (input?.checked ? selected : unselected).push(label);
  }

  const hasSelectedRow = selected.length === 4;

  // If nothing to do, keep original behavior (but still honor locks)
  if (!lockedLabels.length && !hasSelectedRow) return;

  // Build full list of labels in correct order
  const newOrder = hasSelectedRow ? [...lockedLabels, ...selected, ...unselected] : [...lockedLabels, ...remaining];

  // Re-append in new order (this moves nodes, does not clone)
  newOrder.forEach((label) => container.appendChild(label));

  // Update row selected state
  updateSelectState();
};

// ========================================================
// LOCK ROWS

const rows = [[], [], [], []];
const lockedRows = {};
const lockedGroups = [];
let lastCardCount = 16;

// Add lock row buttons
const addLockRowButtons = () => {
  const grid = get("#pz-game-root fieldset > div");
  const lockRows = make(
    "div.lockRows",
    make("div.lockRow1", { "data-locked": "false" }),
    make("div.lockRow2", { "data-locked": "false" }),
    make("div.lockRow3", { "data-locked": "false" }),
    make("div.lockRow4", { "data-locked": "false" })
  );
  lockRows.addEventListener("click", toggleLock);
  grid.appendChild(lockRows);
};

const arraysEqual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

const toggleLock = (e) => {
  const rowClassname = e.target.className.match(/lockRow(\d)/);
  if (!rowClassname) return;

  const rowIndex = Number(rowClassname[1]) - 1;

  // Make sure rows[] is up to date
  handleStateChange();
  const ids = rows[rowIndex];
  if (!ids || ids.length !== 4) return;

  // If this exact group is already locked, unlock it; otherwise lock it
  const existingIdx = lockedGroups.findIndex((g) => arraysEqual(g, ids));

  if (existingIdx >= 0) {
    lockedGroups.splice(existingIdx, 1);
    e.target.dataset.locked = "false";
  } else {
    lockedGroups.push([...ids]);
    e.target.dataset.locked = "true";
  }

  deselectAll();
  requestAnimationFrame(() => moveSelectedCardsToTop());
};

const pruneLockedRows = () => {
  if (!gameBoard) gameBoard = get("#pz-game-root fieldset");

  const existing = new Set(
    Array.from(gameBoard.querySelectorAll('input[type="checkbox"][data-testid="card-input"]')).map((i) => i.id)
  );

  for (const k of Object.keys(lockedRows)) {
    const idx = Number(k);
    const ids = lockedRows[idx] || [];

    // Keep only ids that still exist
    const kept = ids.filter((id) => existing.has(id));

    // If the locked set is no longer exactly 4 cards, drop the lock
    if (kept.length !== 4) {
      delete lockedRows[idx];
      // also reflect in the UI button
      const btn = document.querySelector(`.lockRows .lockRow${idx + 1}`);
      if (btn) btn.dataset.locked = "false";
    } else {
      lockedRows[idx] = kept;
    }
  }
};

// ========================================================
// MAINTAIN CORRECT SELECT STATE

const syncCheckedPropToAttr = () => {
  if (!gameBoard) gameBoard = get("#pz-game-root fieldset");

  const inputs = Array.from(gets('input[type="checkbox"][data-testid="card-input"]', gameBoard));

  for (const input of inputs) {
    const shouldBeChecked = input.hasAttribute("checked"); // or input.defaultChecked
    const proto = Object.getPrototypeOf(input);
    const desc = Object.getOwnPropertyDescriptor(proto, "checked");
    desc.set.call(input, shouldBeChecked);
  }
};

// After the framework finishes its update, re-sync property to attribute
const updateSelectState = () => {
  // If you rely on these dataset flags for styling, keep them consistent
  gameBoard.dataset.row1 = "off";
  gameBoard.dataset.row2 = "off";
  gameBoard.dataset.row3 = "off";
  gameBoard.dataset.row4 = "off";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      syncCheckedPropToAttr();
      handleStateChange(); // now your `.checked` reads make sense again
    });
  });
};

// Update row count after submitting an answer
const reconcileLocksAfterBoardChange = () => {
  if (!gameBoard) gameBoard = get("#pz-game-root fieldset");

  const inputs = Array.from(gets('input[type="checkbox"][data-testid="card-input"]', gameBoard));
  const existingIds = new Set(inputs.map((i) => i.id));

  // Build current visible rows from DOM order (every 4 inputs)
  const visibleRows = [];
  for (let i = 0; i < inputs.length; i += 4) {
    visibleRows.push(inputs.slice(i, i + 4).map((i) => i.id));
  }

  // Remove locks that reference cards no longer present
  for (const k of Object.keys(lockedRows)) {
    const rowIdx = Number(k);
    const ids = lockedRows[rowIdx] || [];
    const stillThere = ids.filter((id) => existingIds.has(id));
    if (stillThere.length !== 4) {
      delete lockedRows[rowIdx];
    } else {
      lockedRows[rowIdx] = stillThere;
    }
  }

  // Shift locks so that "lockRow1..4" refers to the Nth visible row.
  // If a locked row no longer matches any visible row exactly, drop it.
  const newLockedRows = {};
  for (let r = 0; r < Math.min(4, visibleRows.length); r++) {
    // If any existing lock matches this visible row’s exact set, keep it at this row index.
    // (Order matters visually, so match exact array.)
    const match = Object.values(lockedRows).find(
      (ids) => ids.length === 4 && ids.every((id, idx) => id === visibleRows[r][idx])
    );
    if (match) newLockedRows[r] = match;
  }

  // Replace
  for (const k of Object.keys(lockedRows)) delete lockedRows[k];
  Object.assign(lockedRows, newLockedRows);

  // Update the lock buttons’ data-locked to reflect reality
  document.querySelectorAll(".lockRows > div").forEach((btn) => {
    const m = btn.className.match(/lockRow(\d)/);
    if (!m) return;
    const idx = Number(m[1]) - 1;
    btn.dataset.locked = lockedRows[idx] ? "true" : "false";
  });
};

// After submit, prune removed locks and “re-anchor” locks to current rows
const reanchorLocksToCurrentGrid = () => {
  if (!gameBoard) gameBoard = get("#pz-game-root fieldset");

  const inputs = Array.from(gameBoard.querySelectorAll('input[type="checkbox"][data-testid="card-input"]'));
  const existing = new Set(inputs.map((i) => i.id));

  // Drop any lock whose cards are gone (submitted)
  for (let i = lockedGroups.length - 1; i >= 0; i--) {
    const g = lockedGroups[i];
    if (g.length !== 4 || g.some((id) => !existing.has(id))) {
      lockedGroups.splice(i, 1);
    }
  }

  // Compute current rows by DOM order (visual rows)
  const currentRows = [];
  for (let i = 0; i < inputs.length; i += 4) {
    const row = inputs.slice(i, i + 4).map((x) => x.id);
    if (row.length === 4) currentRows.push(row);
  }

  // Sort lockedGroups by where they appear in the current grid
  const pos = new Map(inputs.map((inp, idx) => [inp.id, idx]));
  lockedGroups.sort((a, b) => {
    const amin = Math.min(...a.map((id) => pos.get(id) ?? 1e9));
    const bmin = Math.min(...b.map((id) => pos.get(id) ?? 1e9));
    return amin - bmin;
  });

  // Update lock buttons to reflect which current rows are locked
  document.querySelectorAll(".lockRows > div").forEach((btn) => {
    const m = btn.className.match(/lockRow(\d)/);
    if (!m) return;
    const idx = Number(m[1]) - 1;

    const rowIds = currentRows[idx] || null;
    const locked = rowIds && lockedGroups.some((g) => arraysEqual(g, rowIds));
    btn.dataset.locked = locked ? "true" : "false";
  });
};

// Click on "Deselect all" button
const deselectAll = () => {
  get('[data-testid="deselect-btn"]')?.click();
};

const initDeselect = () => {
  get('[data-testid="deselect-btn"]').addEventListener("click", updateSelectState);
};

// ========================================================
// ON STATE CHANGE

// Handle change in card state
let gameBoard = null;

const handleStateChange = () => {
  if (!gameBoard) gameBoard = get("#pz-game-root fieldset");

  const cards = Array.from(gets("label > input[type='checkbox']", gameBoard));

  const rowSelected = (rowIdx) => {
    const slice = cards.slice(rowIdx * 4, rowIdx * 4 + 4);
    return slice.length === 4 && slice.every((c) => c.checked);
  };

  // Update row selected state
  gameBoard.dataset.row1 = rowSelected(0) ? "on" : "off";
  gameBoard.dataset.row2 = rowSelected(1) ? "on" : "off";
  gameBoard.dataset.row3 = rowSelected(2) ? "on" : "off";
  gameBoard.dataset.row4 = rowSelected(3) ? "on" : "off";

  // Update rows[] only for rows that exist
  for (let r = 0; r < 4; r++) {
    const slice = cards.slice(r * 4, r * 4 + 4);
    rows[r] = slice.length === 4 ? slice.map((c) => c.id) : [];
  }
};

// ========================================================
// INITIALIZE

// Set up observer when fieldset is added to the DOM
const initStateObserver = () => {
  gameBoard = get("#pz-game-root fieldset");

  gameBoard.addEventListener(
    "change",
    (e) => {
      if (e.target.matches("input[type='checkbox']")) handleStateChange();
    },
    true
  );
  handleStateChange();
};

// Hook up shuffle button to also move selected cards to the top after short delay
const initShuffle = () => {
  const shuffleButton = document.querySelector('[data-testid="shuffle-btn"]');
  shuffleButton.addEventListener("click", () => setTimeout(moveSelectedCardsToTop, 50));
};

// Make sure locks stay in sync when submitting an answer
const initSubmit = () => {
  const submitBtn = get('[data-testid="submit-btn"]');

  // Use capture so we run even if they stopPropagation later
  submitBtn.addEventListener(
    "click",
    () => {
      // After the UI removes the solved cards
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          pruneLockedRows();
          reanchorLocksToCurrentGrid();
          moveSelectedCardsToTop(); // will regroup locked cards that remain
          updateSelectState(); // keep your checked-prop sync stable
        });
      });
    },
    true
  );
};

// Initialize board when loaded
doWhenAdded('[data-testid="shuffle-btn"]', initShuffle);
doWhenAdded('[data-testid="deselect-btn"]', initDeselect);
doWhenAdded('[data-testid="submit-btn"]', initSubmit);
doWhenAdded("#pz-game-root fieldset", initStateObserver);
doWhenAdded("#pz-game-root fieldset > div", addLockRowButtons);
