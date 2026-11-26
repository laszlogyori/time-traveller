function createCoinManager(mapData, player) {
  const config = window.GameConfig;
  const coinsPerSeason = 5;
  const coinRadius = 12;
  const candidates = [];
  const coins = [];
  let collected = 0;
  const playerRow = Math.floor(player.y / config.CELL_SIZE);
  const playerCol = Math.floor(player.x / config.CELL_SIZE);

  for (let row = 0; row < mapData.length; row++) {
    for (let col = 0; col < mapData[row].length; col++) {
      if (mapData[row][col] !== config.TILE.GROUND) continue;
      if (Math.hypot(row - playerRow, col - playerCol) < 4) continue;
      candidates.push({ row, col });
    }
  }

  for (let index = candidates.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
  }

  const mapStage = document.querySelector('.map-stage');
  const usedCells = new Set();
  config.SEASONS.forEach((season) => {
    const availableCells = candidates.filter((cell) => !usedCells.has(`${cell.row},${cell.col}`));
    const seasonCoins = availableCells.slice(0, coinsPerSeason)
      .map((cell) => ({ ...cell, season, collected: false }));

    if (seasonCoins.length < coinsPerSeason) {
      const seasonCells = new Set(seasonCoins.map((coin) => `${coin.row},${coin.col}`));
      candidates.forEach((cell) => {
        if (seasonCoins.length >= coinsPerSeason || seasonCells.has(`${cell.row},${cell.col}`)) return;
        seasonCoins.push({ ...cell, season, collected: false });
        seasonCells.add(`${cell.row},${cell.col}`);
      });
    }

    seasonCoins.forEach((coin, index) => {
      usedCells.add(`${coin.row},${coin.col}`);
      const element = document.createElement('div');
      element.className = 'coin';
      element.dataset.season = season;
      element.setAttribute('role', 'img');
      element.setAttribute('aria-label', `${season} coin ${index + 1}`);
      element.style.left = `${(coin.col + 0.5) * config.CELL_SIZE}px`;
      element.style.top = `${(coin.row + 0.5) * config.CELL_SIZE}px`;
      mapStage.appendChild(element);
      coin.element = element;
      coins.push(coin);
    });
  });

  function setSeason(season) {
    coins.forEach((coin) => {
      coin.element.hidden = coin.collected || coin.season !== season;
    });
  }

  function collectAt(x, y, playerRadius) {
    coins.forEach((coin) => {
      if (coin.collected || coin.season !== config.SEASON) return;
      const coinX = (coin.col + 0.5) * config.CELL_SIZE;
      const coinY = (coin.row + 0.5) * config.CELL_SIZE;
      if (Math.hypot(x - coinX, y - coinY) > playerRadius + coinRadius) return;
      coin.collected = true;
      coin.element.remove();
      collected += 1;
    });
    return collected;
  }

  return { total: coins.length, collectAt, setSeason, get collected() { return collected; } };
}

window.GameCoins = { createCoinManager };
