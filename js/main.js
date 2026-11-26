let gameMap;
let playerController;
let coinManager;
window.GameTextures = new Map();
window.GameState = {
  isGameOver: false,
  endGame(cause) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    document.getElementById('game-over-title').textContent = 'Game Over';
    document.getElementById('game-over-cause').textContent = cause;
    document.querySelector('.map-stage').classList.add('game-over');
  },
  winGame() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    document.getElementById('game-over-title').textContent = 'You won!';
    document.getElementById('game-over-cause').textContent = 'You collected all the coins.';
    document.querySelector('.map-stage').classList.add('game-won');
  }
};

function initializeGame() {
  gameMap = window.GameMap.createMap(window.GameConfig.ROWS, window.GameConfig.COLS);
  window.GameRenderer.renderMap(gameMap);
  const gameLayout = document.querySelector('.game-layout');
  const mapWrap = document.querySelector('.map-wrap');
  const mapStage = document.querySelector('.map-stage');
  const gameHud = document.querySelector('.game-hud');
  const fitMapToFrame = () => {
    const layoutStyle = getComputedStyle(gameLayout);
    const wrapStyle = getComputedStyle(mapWrap);
    const hudStyle = getComputedStyle(gameHud);
    const borderWidth = parseFloat(wrapStyle.borderLeftWidth) + parseFloat(wrapStyle.borderRightWidth);
    const borderHeight = parseFloat(wrapStyle.borderTopWidth) + parseFloat(wrapStyle.borderBottomWidth);
    const availableWidth = gameLayout.clientWidth - borderWidth;
    const availableHeight = gameLayout.clientHeight - gameHud.offsetHeight
      - parseFloat(hudStyle.marginTop) - parseFloat(hudStyle.marginBottom)
      - parseFloat(layoutStyle.rowGap) - borderHeight;
    const mapWidth = mapStage.offsetWidth;
    const mapHeight = mapStage.offsetHeight;
    if (availableWidth <= 0 || availableHeight <= 0 || !mapWidth || !mapHeight) return;

    const scale = Math.min(1, availableWidth / mapWidth, availableHeight / mapHeight);
    mapWrap.style.width = `${mapWidth * scale + borderWidth}px`;
    mapWrap.style.height = `${mapHeight * scale + borderHeight}px`;
    mapStage.style.setProperty('--map-scale', scale);
  };
  const resizeObserver = new ResizeObserver(fitMapToFrame);
  resizeObserver.observe(gameLayout);
  resizeObserver.observe(gameHud);
  resizeObserver.observe(mapStage);
  playerController = window.GamePlayer.createPlayer(gameMap);
  coinManager = window.GameCoins.createCoinManager(gameMap, playerController.player);
  coinManager.setSeason(window.GameConfig.SEASON);
  document.getElementById('coin-count').textContent = `0 / ${coinManager.total}`;
  playerController.setCoinCollectionHandler((x, y, radius) => {
    const collected = coinManager.collectAt(x, y, radius);
    document.getElementById('coin-count').textContent = `${collected} / ${coinManager.total}`;
    if (collected === coinManager.total) window.GameState.winGame();
  });
  [
    { id: 'spider-1', spawn: { row: 21, col: 5 } },
    { id: 'spider-2', spawn: { row: 21, col: 22 } },
    { id: 'spider-3', spawn: { row: 21, col: 42 } },
    { id: 'spider-4', spawn: { row: 10, col: 16 } },
    { id: 'spider-5', spawn: { row: 10, col: 21 } }
  ].forEach(({ id, spawn }) => window.GameSpider.createSpider(gameMap, id, spawn));
  window.GameSpider.setTargetProvider(() => playerController.player);
  document.getElementById('game').classList.remove('is-hidden');
  document.getElementById('loading-screen').classList.add('is-hidden');
  fitMapToFrame();
  document.addEventListener('keydown', handleSeasonKey);
  document.getElementById('retry-button').addEventListener('click', () => window.location.reload());
}

function handleSeasonKey(event) {
  if (event.code !== 'Space' || event.repeat || window.GameState.isGameOver) return;
  event.preventDefault();
  if (!playerController.consumeEnergy(10)) return;
  const config = window.GameConfig;
  const currentIndex = config.SEASONS.indexOf(config.SEASON);
  const nextIndex = (currentIndex + 1) % config.SEASONS.length;
  config.SEASON = config.SEASONS[nextIndex];
  updateSeasonIndicator(config.SEASON);
  if (coinManager) coinManager.setSeason(config.SEASON);
  window.GameRenderer.updateSeason(config.SEASON);
  window.GameSpider.handleSeasonChange();
  if (!playerController.isWalkable()) window.GameState.endGame('You drowned.');
}

function updateSeasonIndicator(season) {
  const seasonIcons = {
    summer: '☀️',
    winter: '❄️',
    autumn: '🍂',
    spring: '🌱'
  };
  document.getElementById('season-icon').textContent = seasonIcons[season];
  document.getElementById('season-name').textContent = season;
  document.getElementById('season-indicator').setAttribute('aria-label', `Current season: ${season}`);
}

function loadTexture(path) {
  return new Promise((resolve, reject) => {
    const texture = new Image();
    let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      callback();
    };
    const fail = (error) => {
    const failure = new Error(`Unable to load or decode ${path}`);
      failure.path = path;
      failure.cause = error;
      finish(() => reject(failure));
    };
    texture.onload = () => {
      if (typeof texture.decode === 'function') {
        texture.decode()
          .then(() => finish(() => resolve(texture)))
          .catch(fail);
      } else {
        finish(() => resolve(texture));
      }
    };
    texture.onerror = fail;
    texture.src = path;
  });
}

function updateLoadingProgress(loaded, total) {
  const percent = Math.round((loaded / total) * 100);
  document.getElementById('loading-progress').style.width = `${percent}%`;
  document.getElementById('loading-percent').textContent = `${percent}% (${loaded}/${total} textures ready)`;
}

function waitForTextures() {
  const terrainTypes = Object.values(window.GameConfig.TILE);
  const terrainTextures = window.GameConfig.SEASONS.flatMap((season) => (
    terrainTypes.map((terrain) => `css/tiles/cell-${season}-${terrain}.png`)
  ));
  const playerTextures = [
    'css/tiles/player_stand.png',
    'css/tiles/player_left_leg.png',
    'css/tiles/player_right_leg.png'
  ];
  const spiderTextures = [
    'css/tiles/spider_stand.png',
    'css/tiles/spider_left_leg.png',
    'css/tiles/spider_right_leg.png'
  ];
  const textures = [...terrainTextures, ...playerTextures, ...spiderTextures, 'css/tiles/coin.gif'];
  let loaded = 0;
  updateLoadingProgress(loaded, textures.length);
  const textureLoads = textures.map((path) => loadTexture(path).then((texture) => {
    loaded += 1;
    window.GameTextures.set(path, texture);
    updateLoadingProgress(loaded, textures.length);
    return texture;
  }));
  Promise.all(textureLoads)
    .then(initializeGame)
    .catch((error) => {
      document.getElementById('loading-percent').textContent = 'Loading failed';
      document.getElementById('loading-error').textContent = `Failed texture: ${error.path || 'unknown texture'}`;
    });
}

waitForTextures();