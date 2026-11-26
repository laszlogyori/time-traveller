function createPlayer(mapData) {
  const config = window.GameConfig;
  const halfSize = config.PLAYER_SIZE / 2;
  const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
  };
  const spawn = findGrassSpawn(mapData);
  const animationInterval = 0.15;
  const player = {
    x: (spawn.col + 0.5) * config.CELL_SIZE,
    y: (spawn.row + 0.5) * config.CELL_SIZE,
    energy: 100,
    handleSpiderCollision
  };
  let previousTime = performance.now();
  let animationTimer = 0;
  let animationIndex = 0;
  let isMoving = false;
  let facingAngle = 0;
  let displayedEnergy = null;
  let lowEnergyTimer;
  let coinCollectionHandler = null;
  let shieldUntil = 0;
  let shieldTimer;

  function updateShieldIndicator() {
    const indicator = document.getElementById('shield-indicator');
    const active = performance.now() < shieldUntil;
    const unavailable = !active && player.energy < 50;
    const state = active ? 'active' : unavailable ? 'unavailable' : 'ready';
    indicator.classList.toggle('shield-in-use', active);
    indicator.classList.toggle('shield-unavailable', unavailable);
    indicator.setAttribute('aria-label', `Shield: ${state}`);
  }

  function updateEnergyDisplay() {
    const energy = Math.floor(player.energy);
    const timeTravelUnavailable = player.energy < config.TIME_TRAVEL_ENERGY_COST;
    const timeTravelIndicator = document.getElementById('time-travel-indicator');
    timeTravelIndicator.classList.toggle('time-travel-unavailable', timeTravelUnavailable);
    timeTravelIndicator.setAttribute('aria-label', `Time travel: ${timeTravelUnavailable ? 'unavailable' : 'ready'}`);
    document.getElementById('player').classList.toggle('energy-critical', timeTravelUnavailable);
    updateShieldIndicator();
    if (energy === displayedEnergy) return;
    displayedEnergy = energy;
    document.getElementById('energy-value').textContent = `${energy}%`;
    document.getElementById('energy-level').style.width = `${energy}%`;
    document.querySelector('.energy-track').setAttribute('aria-valuenow', energy);
  }

  function highlightLowEnergy() {
    const display = document.getElementById('energy-display');
    display.classList.remove('energy-low');
    void display.offsetWidth;
    display.classList.add('energy-low');
    clearTimeout(lowEnergyTimer);
    lowEnergyTimer = setTimeout(() => {
      display.classList.remove('energy-low');
    }, 900);
  }

  function consumeEnergy(amount) {
    if (player.energy < amount) {
      highlightLowEnergy();
      return false;
    }

    player.energy -= amount;
    updateEnergyDisplay();
    return true;
  }

  function restoreEnergy(amount) {
    player.energy = Math.min(100, player.energy + amount);
    updateEnergyDisplay();
  }

  function handleSpiderCollision() {
    const now = performance.now();
    if (now < shieldUntil) return;
    if (!consumeEnergy(50)) {
      window.GameState.endGame('A spider bit you.');
      return;
    }

    shieldUntil = now + 5000;
    const playerElement = document.getElementById('player');
    playerElement.classList.add('shield-active');
    updateShieldIndicator();
    clearTimeout(shieldTimer);
    shieldTimer = setTimeout(() => {
      playerElement.classList.remove('shield-active');
      updateShieldIndicator();
    }, 5000);
  }

  function setCoinCollectionHandler(handler) {
    coinCollectionHandler = handler;
  }

  function setSprite(sprite) {
    document.getElementById('player').dataset.sprite = sprite;
  }

  function setFacing(horizontal, vertical) {
    if (horizontal !== 0 || vertical !== 0) {
      facingAngle = Math.atan2(vertical, horizontal) * 180 / Math.PI;
    }
    document.getElementById('player').style.setProperty('--player-angle', `${facingAngle}deg`);
  }

  function updateMovementAnimation(deltaTime, moving, horizontal, vertical) {
    if (!moving) {
      if (isMoving) {
        isMoving = false;
        animationTimer = 0;
        animationIndex = 0;
        setSprite('stand');
      }
      return;
    }

    setFacing(horizontal, vertical);
    if (!isMoving) {
      isMoving = true;
      animationTimer = 0;
      animationIndex = 0;
      setSprite('stand');
    }

    animationTimer += deltaTime;
    while (animationTimer >= animationInterval) {
      animationTimer -= animationInterval;
      animationIndex = (animationIndex + 1) % 3;
      setSprite(['stand', 'left-leg', 'right-leg'][animationIndex]);
    }
  }

  function render() {
    const playerElement = document.getElementById('player');
    playerElement.style.top = `${player.y}px`;
    playerElement.style.left = `${player.x}px`;
    window.GameRenderer.updateEffectOrigin(player.x, player.y);
  }

  function isWalkable(x, y) {
    const left = x - halfSize;
    const right = x + halfSize - 0.01;
    const top = y - halfSize;
    const bottom = y + halfSize - 0.01;

    if (left < 0 || top < 0 || right >= config.COLS * config.CELL_SIZE || bottom >= config.ROWS * config.CELL_SIZE) {
      return false;
    }

    const firstCol = Math.floor(left / config.CELL_SIZE);
    const lastCol = Math.floor(right / config.CELL_SIZE);
    const firstRow = Math.floor(top / config.CELL_SIZE);
    const lastRow = Math.floor(bottom / config.CELL_SIZE);

    for (let row = firstRow; row <= lastRow; row++) {
      for (let col = firstCol; col <= lastCol; col++) {
        const terrain = mapData[row][col];
        const walkable = terrain === config.TILE.GROUND
          || (terrain === config.TILE.WATER && config.SEASON === 'winter');

        if (!walkable) return false;
      }
    }

    return true;
  }

  function moveAxis(axis, distance) {
    if (distance === 0) return;

    const nextX = axis === 'x' ? player.x + distance : player.x;
    const nextY = axis === 'y' ? player.y + distance : player.y;

    if (isWalkable(nextX, nextY)) {
      player[axis] += distance;
      return;
    }
    
    let low = 0;
    let high = distance;

    for (let attempt = 0; attempt < 8; attempt++) {
      const step = (low + high) / 2;
      const testX = axis === 'x' ? player.x + step : player.x;
      const testY = axis === 'y' ? player.y + step : player.y;

      if (isWalkable(testX, testY)) {
        low = step;
      } else {
        high = step;
      }
    }

    player[axis] += low;
  }

  function update(time) {
    if (window.GameState.isGameOver) return;

    const elapsedSeconds = Math.max((time - previousTime) / 1000, 0);
    const deltaTime = Math.min(elapsedSeconds, 0.05);
    previousTime = time;
    player.energy = Math.min(100, player.energy + elapsedSeconds);
    updateEnergyDisplay();
    let horizontal = Number(keys.ArrowRight) - Number(keys.ArrowLeft);
    let vertical = Number(keys.ArrowDown) - Number(keys.ArrowUp);
    const length = Math.sqrt(horizontal * horizontal + vertical * vertical);
    const moving = length > 0;

    updateMovementAnimation(deltaTime, moving, horizontal, vertical);

    if (moving) {
      horizontal /= length;
      vertical /= length;
      moveAxis('x', horizontal * config.PLAYER_SPEED * deltaTime);
      moveAxis('y', vertical * config.PLAYER_SPEED * deltaTime);
      render();
    }
    if (coinCollectionHandler) coinCollectionHandler(player.x, player.y, halfSize);

    requestAnimationFrame(update);
  }

  function handleKey(event, isPressed) {
    if (!(event.key in keys)) return;

    event.preventDefault();
    if (isPressed && !window.GameState.isStarted) return;
    keys[event.key] = isPressed;
  }

  function start() {
    previousTime = performance.now();
    requestAnimationFrame(update);
  }

  document.addEventListener('keydown', (event) => handleKey(event, true));
  document.addEventListener('keyup', (event) => handleKey(event, false));
  window.addEventListener('blur', () => {
    Object.keys(keys).forEach((key) => {
      keys[key] = false;
    });
  });

  setSprite('stand');
  setFacing(0, 0);
  render();
  updateEnergyDisplay();

  return {
    player,
    start,
    isWalkable: () => isWalkable(player.x, player.y),
    consumeEnergy,
    restoreEnergy,
    setCoinCollectionHandler
  };
}

function findGrassSpawn(mapData) {
  const config = window.GameConfig;
  const centerRow = 0;
  const centerCol = 0;

  for (let radius = 0; radius < Math.max(config.ROWS, config.COLS); radius++) {
    for (let row = centerRow - radius; row <= centerRow + radius; row++) {
      for (let col = centerCol - radius; col <= centerCol + radius; col++) {
        if (row < 0 || row >= config.ROWS || col < 0 || col >= config.COLS) continue;
        if (mapData[row][col] === config.TILE.GROUND) return { row, col };
      }
    }
  }

  return { row: 0, col: 0 };
}

window.GamePlayer = { createPlayer };
