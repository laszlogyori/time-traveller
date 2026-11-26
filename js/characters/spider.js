const spiders = [];
const eatenTrees = new Set();
let nextSpiderId = 1;
let targetProvider = null;

function createSpiderElement(id) {
  const element = document.createElement('div');
  element.id = id;
  element.className = 'spider';
  element.setAttribute('aria-label', `Spider character ${id}`);
  document.querySelector('.map-stage').appendChild(element);
}

function createSpider(mapData, id, spawn, cannotEatThisSummer = false) {
  if (spiders.length >= window.GameConfig.MAX_SPIDERS) return null;
  const config = window.GameConfig;

  if (!id) {
    do {
      id = `spider-${nextSpiderId++}`;
    } while (document.getElementById(id));
  } else {
    const idNumber = Number(id.replace('spider-', ''));
    if (Number.isInteger(idNumber)) nextSpiderId = Math.max(nextSpiderId, idNumber + 1);
  }

  if (!document.getElementById(id)) createSpiderElement(id);

  const entry = { id, instance: null, cannotEatThisSummer };
  const instance = window.GameCharacters.createAutonomousCharacter(mapData, {
    id,
    spawn,
    size: 36,
    speed: 70,
    blockedWait: 5000,
    waitOnBlocked: false,
    animationInterval: 0.15,
    onTreeReached(row, col) {
      eatTree(mapData, entry, row, col);
    }
  });
  entry.instance = instance;

  if (targetProvider) instance.setTargetProvider(targetProvider);

  spiders.push(entry);
  return instance;
}

function setTargetProvider(provider) {
  targetProvider = provider;
  spiders.forEach(({ instance }) => instance.setTargetProvider(provider));
}

function handleSeasonChange() {
  eatenTrees.forEach((key) => {
    const [row, col] = key.split(',');
    const tree = document.querySelector(`#map .forest[data-row="${row}"][data-col="${col}"]`);
    if (tree) tree.removeAttribute('data-eaten');
  });

  if (window.GameConfig.SEASON === 'summer') {
    eatenTrees.clear();
    spiders.forEach((entry) => {
      entry.cannotEatThisSummer = false;
    });
  }

  if (window.GameConfig.SEASON === 'autumn') {
    spiders.forEach(({ instance }) => instance.grow(1.05));
  }

  const stranded = window.GameConfig.SEASON === 'winter'
    ? []
    : spiders.filter(({ instance }) => instance.isCollidingWithWater());

  stranded.forEach((entry) => {
    const index = spiders.indexOf(entry);
    if (index !== -1) spiders.splice(index, 1);
    entry.instance.stop();
    const element = document.getElementById(entry.id);
    element.classList.add('spider-dying');

    setTimeout(() => {
      element.classList.remove('spider-dying');
      element.classList.add('spider-fading');
    }, 3000);

    setTimeout(() => {
      element.remove();
    }, 8000);
  });
}

function eatTree(mapData, entry, row, col) {
  if (window.GameConfig.SEASON !== 'summer' || entry.cannotEatThisSummer) return;
  const key = `${row},${col}`;
  if (eatenTrees.has(key)) return;
  eatenTrees.add(key);

  const tree = document.querySelector(`#map .forest[data-row="${row}"][data-col="${col}"]`);
  if (tree) tree.dataset.eaten = 'true';

  if (multiplySpider(mapData, entry.instance)) entry.cannotEatThisSummer = true;
}

function multiplySpider(mapData, instance) {
  const config = window.GameConfig;
  if (spiders.length >= config.MAX_SPIDERS) return false;
  const spawn = {
    row: Math.floor(instance.character.y / config.CELL_SIZE),
    col: Math.floor(instance.character.x / config.CELL_SIZE)
  };
  return createSpider(mapData, null, spawn, true) !== null;
}

window.GameSpider = { createSpider, setTargetProvider, handleSeasonChange };