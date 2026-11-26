function createAutonomousCharacter(mapData, options) {
  const config = window.GameConfig;
  let size = options.size;
  const maxSize = options.size * 2;
  let halfSize = size / 2;
  let speed = options.speed;
  const maxSpeed = options.speed * 2;
  const collisionLookAhead = options.collisionLookAhead || config.CELL_SIZE / 10;
  const directions = [
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: -1, y: 1 },
    { x: 0, y: 1 },
    { x: 1, y: 1 }
  ];

  const spawn = options.spawn || findWalkableSpawn(mapData, halfSize);
  const character = {
    x: (spawn.col + 0.5) * config.CELL_SIZE,
    y: (spawn.row + 0.5) * config.CELL_SIZE
  };

  let direction = null;
  let waitingUntil = 0;
  let previousTime = performance.now();
  let animationTimer = 0;
  let animationIndex = 0;
  let facingAngle = 0;
  let targetProvider = null;
  let isStopped = false;
  let treeContact = null;

  function getElement() {
    return document.getElementById(options.id);
  }

  function setSprite(sprite) {
    getElement().dataset.sprite = sprite;
  }

  function setFacing(horizontal, vertical) {
    if (horizontal !== 0 || vertical !== 0) {
      facingAngle = Math.atan2(vertical, horizontal) * 180 / Math.PI;
    }
    getElement().style.setProperty('--character-angle', `${facingAngle - 90}deg`);
  }

  function render() {
    const element = getElement();
    element.style.left = `${character.x}px`;
    element.style.top = `${character.y}px`;
  }
  
  function setTargetProvider(provider) {
    targetProvider = provider;
  }

  function hasReachedTarget() {
    if (!targetProvider) return false;
    const target = targetProvider();
    if (!target) return false;
    const targetDistance = halfSize + config.PLAYER_SIZE / 2;
    return Math.hypot(character.x - target.x, character.y - target.y) <= targetDistance;
  }

  function stop() {
    isStopped = true;
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

  function overlapsTerrain(x, y, terrainType) {
    const left = x - halfSize;
    const right = x + halfSize - 0.01;
    const top = y - halfSize;
    const bottom = y + halfSize - 0.01;
    const firstCol = Math.max(0, Math.floor(left / config.CELL_SIZE));
    const lastCol = Math.min(config.COLS - 1, Math.floor(right / config.CELL_SIZE));
    const firstRow = Math.max(0, Math.floor(top / config.CELL_SIZE));
    const lastRow = Math.min(config.ROWS - 1, Math.floor(bottom / config.CELL_SIZE));

    for (let row = firstRow; row <= lastRow; row++) {
      for (let col = firstCol; col <= lastCol; col++) {
        if (mapData[row][col] === terrainType) return true;
      }
    }

    return false;
  }

  function getTreeAt(x, y) {
    const left = x - halfSize;
    const right = x + halfSize - 0.01;
    const top = y - halfSize;
    const bottom = y + halfSize - 0.01;
    const firstCol = Math.max(0, Math.floor(left / config.CELL_SIZE));
    const lastCol = Math.min(config.COLS - 1, Math.floor(right / config.CELL_SIZE));
    const firstRow = Math.max(0, Math.floor(top / config.CELL_SIZE));
    const lastRow = Math.min(config.ROWS - 1, Math.floor(bottom / config.CELL_SIZE));

    for (let row = firstRow; row <= lastRow; row++) {
      for (let col = firstCol; col <= lastCol; col++) {
        if (mapData[row][col] === config.TILE.FOREST) return { row, col };
      }
    }

    return null;
  }

  function grow(factor) {
    size = Math.min(size * factor, maxSize);
    halfSize = size / 2;
    speed = Math.min(speed * factor, maxSpeed);
    const element = getElement();
    element.style.width = `${size}px`;
    element.style.height = `${size}px`;
  }

  function getAvailableDirections() {
    const availableDirections = directions.filter((candidate) => {
      const x = character.x + candidate.x * collisionLookAhead;
      const y = character.y + candidate.y * collisionLookAhead;
      return isWalkable(x, y) || getTreeAt(x, y) !== null;
    });

    return availableDirections;
  }

  function chooseDirection() {
    const availableDirections = getAvailableDirections();
    const choices = availableDirections.length ? availableDirections : directions;
    direction = choices[Math.floor(Math.random() * choices.length)];
    setFacing(direction.x, direction.y);
  }

  function updateAnimation(deltaTime, moving) {
    if (!moving) {
      animationTimer = 0;
      animationIndex = 0;
      setSprite('stand');
      return;
    }

    animationTimer += deltaTime;
    while (animationTimer >= options.animationInterval) {
      animationTimer -= options.animationInterval;
      animationIndex = (animationIndex + 1) % 3;
      setSprite(['stand', 'left-leg', 'right-leg'][animationIndex]);
    }
  }

  function update(time) {
    if (window.GameState.isGameOver || isStopped) return;

    const deltaTime = Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;

    if (time < waitingUntil) {
      updateAnimation(deltaTime, false);
      requestAnimationFrame(update);
      return;
    }

    if (!direction) chooseDirection();
    const lookAheadX = character.x + direction.x * collisionLookAhead;
    const lookAheadY = character.y + direction.y * collisionLookAhead;
    if (!isWalkable(lookAheadX, lookAheadY) && !getTreeAt(lookAheadX, lookAheadY)) {
      direction = null;
      chooseDirection();
    }
    
    if (!direction) chooseDirection();
    const nextLookAheadX = character.x + direction.x * collisionLookAhead;
    const nextLookAheadY = character.y + direction.y * collisionLookAhead;
    if (!isWalkable(nextLookAheadX, nextLookAheadY) && !getTreeAt(nextLookAheadX, nextLookAheadY)) {
      direction = null;
      chooseDirection();
    }

    const distance = speed * deltaTime;
    const directionLength = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    const horizontal = direction.x / directionLength;
    const vertical = direction.y / directionLength;
    const nextX = character.x + horizontal * distance;
    const nextY = character.y + vertical * distance;
    const moving = isWalkable(nextX, nextY);

    if (moving) {
      character.x = nextX;
      character.y = nextY;
      if (!getTreeAt(character.x, character.y)) treeContact = null;
      render();
      if (hasReachedTarget()) {
        window.GameState.endGame('A spider bit you.');
        return;
      }
    } else {
      const tree = getTreeAt(nextX, nextY);
      const contactKey = tree ? `${tree.row},${tree.col}` : null;
      if (contactKey && contactKey !== treeContact && options.onTreeReached) {
        treeContact = contactKey;
        options.onTreeReached(tree.row, tree.col);
      }
      direction = null;
      if (options.waitOnBlocked !== false) {
        waitingUntil = time + options.blockedWait;
      }
    }

    updateAnimation(deltaTime, moving);
    requestAnimationFrame(update);
  }

  setSprite('stand');
  setFacing(0, 1);
  render();
  requestAnimationFrame(update);

  return {
    character,
    setTargetProvider,
    isWalkable: () => isWalkable(character.x, character.y),
    isCollidingWithWater: () => overlapsTerrain(character.x, character.y, config.TILE.WATER),
    grow,
    stop
  };
}

function findWalkableSpawn(mapData, halfSize) {
  const config = window.GameConfig;
  const candidates = [];

  for (let row = 0; row < config.ROWS; row++) {
    for (let col = 0; col < config.COLS; col++) {
      const x = (col + 0.5) * config.CELL_SIZE;
      const y = (row + 0.5) * config.CELL_SIZE;
      const left = x - halfSize;
      const right = x + halfSize - 0.01;
      const top = y - halfSize;
      const bottom = y + halfSize - 0.01;
      const firstCol = Math.floor(left / config.CELL_SIZE);
      const lastCol = Math.floor(right / config.CELL_SIZE);
      const firstRow = Math.floor(top / config.CELL_SIZE);
      const lastRow = Math.floor(bottom / config.CELL_SIZE);

      if (firstCol < 0 || firstRow < 0 || lastCol >= config.COLS || lastRow >= config.ROWS) continue;

      let walkable = true;
      for (let checkRow = firstRow; checkRow <= lastRow && walkable; checkRow++) {
        for (let checkCol = firstCol; checkCol <= lastCol; checkCol++) {
          const terrain = mapData[checkRow][checkCol];
          const canVisit = terrain === config.TILE.GROUND
            || (terrain === config.TILE.WATER && config.SEASON === 'winter');
          if (!canVisit) {
            walkable = false;
            break;
          }
        }
      }

      if (walkable) candidates.push({ row, col });
    }
  }

  return candidates[Math.floor(Math.random() * candidates.length)] || { row: 0, col: 0 };
}

window.GameCharacters = { createAutonomousCharacter };