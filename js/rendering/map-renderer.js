function renderMap(mapData) {
  const table = document.getElementById('map');
  const fragment = document.createDocumentFragment();
  table.dataset.season = window.GameConfig.SEASON;
  for (let row = 0; row < mapData.length; row++) {
    const tableRow = document.createElement('tr');
    for (let col = 0; col < mapData[row].length; col++) {
      const cell = document.createElement('td');
      const type = mapData[row][col];
      cell.className = `cell ${type}`;
      cell.dataset.type = type;
      cell.dataset.row = row;
      cell.dataset.col = col;
      tableRow.appendChild(cell);
    }
    fragment.appendChild(tableRow);
  }
  table.appendChild(fragment);
}

let magicTimer;

function updateSeason(season) {
  const table = document.getElementById('map');
  const refreshedTable = table.cloneNode(true);
  const mapStage = document.querySelector('.map-stage');
  refreshedTable.dataset.season = season;
  table.replaceWith(refreshedTable);
  void refreshedTable.offsetWidth;

  clearTimeout(magicTimer);
  mapStage.classList.remove('season-magic');
  void mapStage.offsetWidth;
  mapStage.classList.add('season-magic');
  magicTimer = setTimeout(() => {
    mapStage.classList.remove('season-magic');
  }, 1000);
}

function updateEffectOrigin(x, y) {
  const mapStage = document.querySelector('.map-stage');
  mapStage.style.setProperty('--magic-x', `${x}px`);
  mapStage.style.setProperty('--magic-y', `${y}px`);
}

window.GameRenderer = { renderMap, updateSeason, updateEffectOrigin };