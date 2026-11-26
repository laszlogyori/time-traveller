function createMap(rows, cols) {
  const tile = window.GameConfig.TILE;
  const map = Array.from({ length: rows }, () => Array(cols).fill(tile.GROUND));
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (let row = 0; row < rows; row++) {
    const y = row / (rows - 1);
    const riverCenter = (0.25 + 0.48 * y + 0.02 * Math.sin(y * Math.PI * 3)) * (cols - 1);
    for (let col = 0; col < cols; col++) {
      const x = col / (cols - 1);
      const river = Math.abs(col - riverCenter) <= 1.5;
      const lake = ((x - 0.8) / 0.09) ** 2 + ((y - 0.22) / 0.13) ** 2 < 1;
      if (river || lake) map[row][col] = tile.WATER;
    }
  }

  function placeWall(row, col, terrain) {
    if (row < 0 || row >= rows || col < 0 || col >= cols) return;
    if (map[row][col] !== tile.GROUND || row + col <= 2) return;

    const neighbors = directions
      .map(([dr, dc]) => [row + dr, col + dc])
      .filter(([r, c]) => r >= 0 && r < rows && c >= 0 && c < cols && map[r][c] === tile.GROUND);
    map[row][col] = terrain;
    if (neighbors.length < 2) return;

    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const queue = [neighbors[0]];
    visited[neighbors[0][0]][neighbors[0][1]] = true;

    for (let index = 0; index < queue.length; index++) {
      const [currentRow, currentCol] = queue[index];
      directions.forEach(([dr, dc]) => {
        const nextRow = currentRow + dr;
        const nextCol = currentCol + dc;
        if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) return;
        if (visited[nextRow][nextCol] || map[nextRow][nextCol] !== tile.GROUND) return;
        visited[nextRow][nextCol] = true;
        queue.push([nextRow, nextCol]);
      });
    }

    if (neighbors.some(([r, c]) => !visited[r][c])) map[row][col] = tile.GROUND;
  }

  const shapes = [
    ['.###.....', '######...', '.########', '...#####.', '....##...'],
    ['...###...', '.######..', '#######..', '...######', '.....###.'],
    ['..###....', '.#####...', '########.', '##..####.', '.....##..'],
    ['.....##..', '...#####.', '.########', '######...', '..###....'],
    ['.##..', '###..', '.###.', '.####', '..###', '.###.', '.##..'],
    ['..##.', '.####', '###..', '####.', '.###.', '..###', '..##.']
  ];
  const clusters = [
    { row: 1, col: 4, shape: 0, terrain: tile.ROCK },
    { row: 5, col: 0, shape: 4, terrain: tile.FOREST },
    { row: 6, col: 7, shape: 5, terrain: tile.ROCK },
    { row: 11, col: 2, shape: 1, terrain: tile.FOREST },
    { row: 12, col: 12, shape: 4, terrain: tile.ROCK },
    { row: 16, col: 0, shape: 5, terrain: tile.ROCK },
    { row: 18, col: 6, shape: 3, terrain: tile.FOREST },
    { row: 18, col: 16, shape: 2, terrain: tile.ROCK },
    { row: 0, col: 18, shape: 4, terrain: tile.FOREST },
    { row: 1, col: 25, shape: 2, terrain: tile.ROCK },
    { row: 0, col: 40, shape: 5, terrain: tile.FOREST },
    { row: 6, col: 22, shape: 5, terrain: tile.ROCK },
    { row: 7, col: 29, shape: 0, terrain: tile.FOREST },
    { row: 7, col: 40, shape: 4, terrain: tile.ROCK },
    { row: 12, col: 26, shape: 4, terrain: tile.FOREST },
    { row: 13, col: 33, shape: 1, terrain: tile.ROCK },
    { row: 15, col: 41, shape: 5, terrain: tile.FOREST },
    { row: 18, col: 29, shape: 3, terrain: tile.ROCK },
    { row: 19, col: 38, shape: 2, terrain: tile.FOREST }
  ];

  clusters.forEach(({ row, col, shape, terrain }) => {
    shapes[shape].forEach((line, rowOffset) => {
      for (let colOffset = 0; colOffset < line.length; colOffset++) {
        if (line[colOffset] !== '#') continue;
        const scaledRow = Math.round((row + rowOffset) * (rows - 1) / 22);
        const scaledCol = Math.round((col + colOffset) * (cols - 1) / 44);
        placeWall(scaledRow, scaledCol, terrain);
      }
    });
  });

  return map;
}

window.GameMap = { createMap };
