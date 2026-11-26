function distance(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

// Builds connected terrain features instead of isolated random cells.
function getTileType(row, col) {
  const x = col / (window.GameConfig.COLS - 1);
  const y = row / (window.GameConfig.ROWS - 1);

  // A wide, gently winding river runs from the north edge to the south edge.
  const riverCenter = 0.3 + (0.12 * Math.sin((y * 8) + 0.5)) + (0.05 * Math.sin(y * 19));
  const riverWidth = 0.045 + (0.012 * Math.sin(y * 11));
  const isRiver = Math.abs(x - riverCenter) < riverWidth;

  // Two overlapping ellipses form an irregular lake in the lower-left.
  const lakeA = distance(x / 0.24, y / 0.2, 0.85, 3.8) < 1;
  const lakeB = distance(x / 0.18, y / 0.16, 0.7, 4.55) < 1;
  const isLake = lakeA || lakeB;

  if (isRiver || isLake) return window.GameConfig.TILE.WATER;

  // Several overlapping, smooth mountain shapes create a connected ridge.
  const ridge = distance((x - 0.7) / 0.3, (y - 0.25) / 0.22, 0.4, 0.55) < 1;
  const peak = distance((x - 0.82) / 0.16, (y - 0.36) / 0.18, 0.5, 0.5) < 1;
  const foothills = distance((x - 0.63) / 0.3, (y - 0.37) / 0.2, 0.5, 0.5) < 1;
  const mountainEdge = 0.08 * Math.sin(x * 31) + 0.06 * Math.sin(y * 27);

  if (ridge || peak || (foothills && mountainEdge > 0)) return window.GameConfig.TILE.ROCK;

  return window.GameConfig.TILE.GROUND;
}

window.GameTerrain = { getTileType };