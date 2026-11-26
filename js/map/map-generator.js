function createMap(rows, cols) {
  const tile = window.GameConfig.TILE;
  const map = Array.from(
    { length: rows },
    () => Array(cols).fill(tile.ROCK)
  );
  const rowScale = rows / 45;
  const colScale = cols / 90;

  function carveRect(top, left, height, width) {
    const scaledTop = Math.floor(top * rowScale);
    const scaledLeft = Math.floor(left * colScale);
    const scaledHeight = Math.max(1, Math.round(height * rowScale));
    const scaledWidth = Math.max(1, Math.round(width * colScale));

    for (let row = scaledTop; row < scaledTop + scaledHeight; row++) {
      for (let col = scaledLeft; col < scaledLeft + scaledWidth; col++) {
        if (row >= 0 && row < rows && col >= 0 && col < cols) {
          map[row][col] = tile.GROUND;
        }
      }
    }
  }

  function carveCorridor(points, width) {
    const radius = Math.floor(width / 2);

    for (let index = 0; index < points.length - 1; index++) {
      const start = points[index];
      const end = points[index + 1];

      if (start.row === end.row) {
        const left = Math.min(start.col, end.col);
        const length = Math.abs(start.col - end.col) + 1;
        carveRect(start.row - radius, left, width, length);
      } else if (start.col === end.col) {
        const top = Math.min(start.row, end.row);
        const length = Math.abs(start.row - end.row) + 1;
        carveRect(top, start.col - radius, length, width);
      } else {
        const left = Math.min(start.col, end.col);
        const top = Math.min(start.row, end.row);
        const horizontalLength = Math.abs(start.col - end.col) + 1;
        const verticalLength = Math.abs(start.row - end.row) + 1;

        carveRect(start.row - radius, left, width, horizontalLength);
        carveRect(top, end.col - radius, verticalLength, width);
      }
    }
  }
  
  function paintRect(top, left, height, width, terrain) {
    const scaledTop = Math.floor(top * rowScale);
    const scaledLeft = Math.floor(left * colScale);
    const scaledHeight = Math.max(1, Math.round(height * rowScale));
    const scaledWidth = Math.max(1, Math.round(width * colScale));

    for (let row = scaledTop; row < scaledTop + scaledHeight; row++) {
      for (let col = scaledLeft; col < scaledLeft + scaledWidth; col++) {
        if (row >= 0 && row < rows && col >= 0 && col < cols) {
          map[row][col] = terrain;
        }
      }
    }
  }

  carveRect(0, 0, 7, 11);
  carveRect(1, 21, 9, 15);
  carveRect(0, 48, 11, 15);
  carveRect(14, 8, 13, 16);
  carveRect(13, 31, 13, 16);
  carveRect(14, 61, 17, 15);
  carveRect(32, 0, 12, 16);
  carveRect(34, 36, 10, 18);
  carveRect(35, 78, 10, 12);

  carveCorridor([
    { row: 3, col: 5 },
    { row: 8, col: 13 },
    { row: 5, col: 21 }
  ], 5);
  carveCorridor([
    { row: 5, col: 35 },
    { row: 8, col: 42 },
    { row: 5, col: 48 }
  ], 3);
  carveCorridor([
    { row: 5, col: 63 },
    { row: 11, col: 68 },
    { row: 22, col: 68 }
  ], 5);
  carveCorridor([
    { row: 22, col: 76 },
    { row: 29, col: 82 },
    { row: 40, col: 84 }
  ], 5);
  
  carveCorridor([
    { row: 9, col: 28 },
    { row: 18, col: 28 },
    { row: 19, col: 31 }
  ], 3);
  carveCorridor([
    { row: 19, col: 47 },
    { row: 22, col: 54 },
    { row: 22, col: 61 }
  ], 5);
  carveCorridor([
    { row: 19, col: 31 },
    { row: 20, col: 24 },
    { row: 20, col: 8 }
  ], 3);
  carveCorridor([
    { row: 20, col: 12 },
    { row: 31, col: 12 },
    { row: 38, col: 16 }
  ], 5);
  carveCorridor([
    { row: 26, col: 39 },
    { row: 31, col: 45 },
    { row: 39, col: 45 }
  ], 3);
  carveCorridor([
    { row: 39, col: 54 },
    { row: 40, col: 66 },
    { row: 40, col: 84 }
  ], 5);

  paintRect(2, 70, 4, 17, tile.WATER);
  paintRect(28, 57, 5, 14, tile.WATER);
  paintRect(15, 63, 7, 6, tile.FOREST);
  paintRect(35, 1, 7, 7, tile.FOREST);
  paintRect(35, 57, 7, 8, tile.FOREST);
  paintRect(37, 80, 5, 9, tile.WATER);

  map[0][0] = tile.GROUND;
  map[0][1] = tile.GROUND;
  map[1][0] = tile.GROUND;
  map[rows - 1][cols - 3] = tile.GROUND;
  map[rows - 1][cols - 2] = tile.GROUND;
  map[rows - 1][cols - 1] = tile.GROUND;

  return map;
}

window.GameMap = { createMap };