const state = {
  items: [],
  aisleOrder: [],
  selectedIds: new Set(),
  itemQuantities: {},
  lastItemCount: 0,
  itemSort: 'name',
  itemSearch: '',
  aisleHelp: false,
  aisleHelpCustom: {},
  listDirty: false,
  listSavedDate: null,
  currentListId: null,
};

function getDefaultAisleHelpText(aisle) {
  const name = aisle.toLowerCase();
  const aisleHints = [
    { key: 'produce', text: 'fruits, vegetables, herbs' },
    { key: 'dairy', text: 'milk, cheese, yogurt, butter' },
    { key: 'bakery', text: 'bread, buns, bagels, tortillas' },
    { key: 'meat', text: 'beef, chicken, pork, seafood' },
    { key: 'frozen', text: 'frozen meals, vegetables, ice cream' },
    { key: 'canned', text: 'beans, soups, tomatoes, tuna' },
    { key: 'snack', text: 'chips, crackers, popcorn, nuts' },
    { key: 'beverage', text: 'water, soda, juice, coffee' },
    { key: 'drink', text: 'water, soda, juice, coffee' },
    { key: 'clean', text: 'detergent, spray, trash bags' },
    { key: 'paper', text: 'paper towels, napkins, tissues' },
    { key: 'personal', text: 'soap, shampoo, toothpaste' },
    { key: 'health', text: 'medicine, first aid, vitamins' },
    { key: 'deli', text: 'sliced meats, cheeses, prepared foods' },
    { key: 'pantry', text: 'rice, pasta, flour, oils' },
    { key: 'breakfast', text: 'cereal, oatmeal, syrup, mixes' },
    { key: 'spice', text: 'spices, seasonings, sauces' },
    { key: 'international', text: 'specialty sauces, noodles, grains' },
    { key: 'baby', text: 'diapers, wipes, baby food' },
    { key: 'pet', text: 'pet food, treats, litter' },
    { key: 'household', text: 'foil, wrap, storage bags' },
    { key: 'alcohol', text: 'beer, wine, spirits, mixers' },
  ];

  const match = aisleHints.find((hint) => name.includes(hint.key));
  return match ? match.text : 'common items in this aisle';
}

function persistAisleHelpCustom() {
  localStorage.setItem('aisle-help-custom', JSON.stringify(state.aisleHelpCustom));
}

function getAisleHelpText(aisle) {
  const key = aisle.trim().toLowerCase();
  const custom = state.aisleHelpCustom[key];
  if (custom && custom.trim()) return custom.trim();
  return getDefaultAisleHelpText(aisle);
}

function setAisleHelpText(aisle, text) {
  const key = aisle.trim().toLowerCase();
  if (!key) return;
  const value = text.trim();
  if (!value) {
    delete state.aisleHelpCustom[key];
  } else {
    state.aisleHelpCustom[key] = value;
  }
  persistAisleHelpCustom();
}

function moveAisleHelpText(oldAisle, newAisle) {
  const oldKey = oldAisle.trim().toLowerCase();
  const newKey = newAisle.trim().toLowerCase();
  if (!oldKey || !newKey || oldKey === newKey) return;
  if (state.aisleHelpCustom[oldKey] && !state.aisleHelpCustom[newKey]) {
    state.aisleHelpCustom[newKey] = state.aisleHelpCustom[oldKey];
  }
  delete state.aisleHelpCustom[oldKey];
  persistAisleHelpCustom();
}

function removeAisleHelpText(aisle) {
  const key = aisle.trim().toLowerCase();
  if (!key) return;
  delete state.aisleHelpCustom[key];
  persistAisleHelpCustom();
}

function pruneAisleHelpText() {
  const validKeys = new Set(state.aisleOrder.map((aisle) => aisle.trim().toLowerCase()).filter(Boolean));
  let changed = false;
  Object.keys(state.aisleHelpCustom).forEach((key) => {
    if (!validKeys.has(key)) {
      delete state.aisleHelpCustom[key];
      changed = true;
    }
  });
  if (changed) persistAisleHelpCustom();
}

function formatAisleDisplay(aisle) {
  if (!state.aisleHelp) return aisle;
  return `${aisle} - ${getAisleHelpText(aisle)}`;
}

function updateAisleHelpToggleLabel() {
  const button = document.getElementById('aisle-help-toggle');
  if (!button) return;
  button.textContent = state.aisleHelp ? 'Aisle Help: On' : 'Aisle Help: Off';
}

async function reloadItems() {
  state.items = await window.api.getItems();
  renderItems();
}

async function loadAisleOrder() {
  const aisleData = await window.api.getAisleOrder();
  state.aisleOrder = aisleData.map(x => x.aisle);
  pruneAisleHelpText();
  renderAisleOrder();
  renderAisleDropdown();
}

async function loadWeeklyLists() {
  const lists = await window.api.getWeeklyLists();
  const container = document.getElementById('weekly-lists');
  container.innerHTML = '';
  if (lists.length === 0) {
    container.innerHTML = '<p class="small">No saved weekly lists yet.</p>';
    return;
  }
  lists.forEach((list) => {
    let quantities;
    try { quantities = JSON.parse(list.item_ids || '{}'); } catch (e) { quantities = {}; }
    const totalItems = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
    const listDiv = document.createElement('div');
    listDiv.className = 'weekly-list-item';
    listDiv.innerHTML = `
      <span><strong>${list.date}</strong> (${totalItems} items) <span class="small">generated ${new Date(list.generated_at).toLocaleString()}</span></span>
      <button class="saved-action-btn" data-action="open-list" data-id="${list.id}" title="Open" aria-label="Open saved list">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"></path>
        </svg>
      </button>
      <button class="saved-action-btn" data-action="delete-list" data-id="${list.id}" title="Delete" aria-label="Delete saved list">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
          <path d="M10 11v6"></path>
          <path d="M14 11v6"></path>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
        </svg>
      </button>
    `;
    container.appendChild(listDiv);
  });

  container.querySelectorAll('button[data-action=open-list]').forEach((button) => {
    button.addEventListener('click', async (e) => {
      const id = Number(e.currentTarget.dataset.id);
      const list = await window.api.getWeeklyList(id);
      if (list) {
        state.itemQuantities = {};
        document.querySelectorAll('.quantity-input').forEach((input) => {
          input.value = 0;
        });

        let quantities;
        try { quantities = JSON.parse(list.item_ids || '{}'); } catch (e) { quantities = {}; }
        state.itemQuantities = { ...quantities };
        document.querySelectorAll('.quantity-input').forEach((input) => {
          const id = Number(input.dataset.id);
          input.value = quantities[id] || 0;
        });

        state.listDirty = false;
        state.listSavedDate = list.date;
        state.currentListId = id;
        refreshListPreview();
      }
    });
  });

  container.querySelectorAll('button[data-action=delete-list]').forEach((button) => {
    button.addEventListener('click', async (e) => {
      const id = Number(e.currentTarget.dataset.id);
      if (confirm('Delete this saved list?')) {
        await window.api.deleteWeeklyList(id);
        await loadWeeklyLists();
      }
    });
  });
}

function renderItems() {
  const container = document.getElementById('items-container');
  if (state.items.length === 0) {
    container.innerHTML = '<p class="small">No items yet. Add one above.</p>';
    return;
  }

  const compareNatural = (left, right) => left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true });
  const aisleOrderMap = new Map(state.aisleOrder.map((aisle, idx) => [aisle.toLowerCase(), idx]));

  const itemsToRender = [...state.items].sort((a, b) => {
    if (state.itemSort === 'aisle-order') {
      const aOrder = aisleOrderMap.has(a.aisle.toLowerCase()) ? aisleOrderMap.get(a.aisle.toLowerCase()) : Number.MAX_SAFE_INTEGER;
      const bOrder = aisleOrderMap.has(b.aisle.toLowerCase()) ? aisleOrderMap.get(b.aisle.toLowerCase()) : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;

      const aisleCompare = compareNatural(a.aisle, b.aisle);
      if (aisleCompare !== 0) return aisleCompare;

      return compareNatural(a.name, b.name);
    }

    if (state.itemSort === 'aisle') {
      const aisleCompare = compareNatural(a.aisle, b.aisle);
      if (aisleCompare !== 0) return aisleCompare;
    }

    return compareNatural(a.name, b.name);
  });

  const searchTerm = state.itemSearch.trim().toLowerCase();
  const filteredItems = searchTerm
    ? itemsToRender.filter((item) => item.name.toLowerCase().includes(searchTerm) || item.aisle.toLowerCase().includes(searchTerm))
    : itemsToRender;

  if (filteredItems.length === 0) {
    container.innerHTML = '<p class="small">No matching items found.</p>';
    return;
  }

  const rows = filteredItems.map(item => {
    const qty = state.itemQuantities[item.id] || 0;
    return `
      <tr>
        <td><input type="number" min="0" value="${qty}" data-id="${item.id}" class="quantity-input" /></td>
        <td>${item.name}</td>
        <td>${item.aisle}</td>
        <td class="small">${new Date(item.updated_at).toLocaleDateString()}</td>
        <td>
          <span class="item-actions">
            <button class="item-action-btn" data-action="edit" data-id="${item.id}" title="Edit" aria-label="Edit item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
              </svg>
            </button>
            <button class="item-action-btn" data-action="delete" data-id="${item.id}" title="Delete" aria-label="Delete item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
              </svg>
            </button>
          </span>
        </td>
      </tr>`;
  }).join('');

  container.innerHTML = `<table>
      <thead><tr><th>Qty</th><th>Name</th><th>Aisle</th><th>Updated</th><th>Actions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  container.querySelectorAll('button[data-action=edit]').forEach((button) => {
    button.addEventListener('click', async (e) => {
      const id = Number(e.currentTarget.dataset.id);
      const item = state.items.find(i => i.id === id);
      if (item) {
        document.getElementById('item-id').value = item.id;
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-aisle').value = item.aisle;
      }
    });
  });

  container.querySelectorAll('.quantity-input').forEach((input) => {
    input.addEventListener('focus', (e) => {
      e.target.dataset.origQty = e.target.value;
    });
    input.addEventListener('input', (e) => {
      const id = Number(e.target.dataset.id);
      const qty = Math.max(0, parseInt(e.target.value) || 0);
      if (qty > 0) state.itemQuantities[id] = qty;
      else delete state.itemQuantities[id];
      state.listDirty = true;
      refreshListPreview();
    });
    input.addEventListener('blur', (e) => {
      const id = Number(e.target.dataset.id);
      const origQty = parseInt(e.target.dataset.origQty) || 0;
      const newQty = Math.max(0, parseInt(e.target.value) || 0);
      if (newQty === 0 && origQty > 0) {
        const item = state.items.find(i => i.id === id);
        const name = item ? `"${item.name}"` : 'this item';
        if (!confirm(`Remove ${name} from the list?`)) {
          e.target.value = origQty;
          state.itemQuantities[id] = origQty;
          refreshListPreview();
        }
      }
    });
  });

  container.querySelectorAll('button[data-action=delete]').forEach((button) => {
    button.addEventListener('click', async (e) => {
      const id = Number(e.currentTarget.dataset.id);
      if (!confirm('Delete this item?')) return;
      delete state.itemQuantities[id];
      await window.api.deleteItem(id);
      state.selectedIds.delete(id);
      await reloadItems();
    });
  });
}

function renderAisleOrder() {
  const list = document.getElementById('aisle-list');
  list.innerHTML = '';
  if (state.aisleOrder.length === 0) {
    list.innerHTML = '<p class="small">No aisles configured.</p>';
    renderAisleDropdown();
    return;
  }

  state.aisleOrder.forEach((aisle, idx) => {
    const helpText = getAisleHelpText(aisle);
    const helpInput = state.aisleHelp
      ? `<input type="text" value="${helpText}" data-index="${idx}" class="aisle-help-input" style="flex:1; min-width:0; width:auto; height:25px; padding:0 6px;" placeholder="Typical items for this aisle" title="Edit aisle help text" />`
      : '';

    const wrapper = document.createElement('div');
    wrapper.className = 'aisle-item';
    wrapper.setAttribute('draggable', 'true');
    wrapper.dataset.index = idx;
    wrapper.innerHTML = `
      <span>${idx + 1}.</span>
      <input type="text" value="${aisle}" data-index="${idx}" class="aisle-input" style="flex:0 0 48%; width:48%; max-width:48%;" />
      ${helpInput}
      <button type="button" data-index="${idx}" class="item-action-btn aisle-delete" title="Delete aisle" aria-label="Delete aisle">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
          <path d="M10 11v6"></path>
          <path d="M14 11v6"></path>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
        </svg>
      </button>
    `;

    const aisleInput = wrapper.querySelector('.aisle-input');
    aisleInput.draggable = false;
    aisleInput.addEventListener('mousedown', (e) => { e.stopPropagation(); });
    aisleInput.addEventListener('focus', () => { wrapper.draggable = false; });
    aisleInput.addEventListener('blur', () => { wrapper.draggable = true; });

    wrapper.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', idx.toString());
      wrapper.classList.add('dragging');
    });

    wrapper.addEventListener('dragend', () => {
      wrapper.classList.remove('dragging');
    });

    wrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      wrapper.classList.add('drag-over');
    });

    wrapper.addEventListener('dragleave', () => {
      wrapper.classList.remove('drag-over');
    });

    wrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      wrapper.classList.remove('drag-over');
      const fromIdx = Number(e.dataTransfer.getData('text/plain'));
      const toIdx = Number(wrapper.dataset.index);
      if (fromIdx === toIdx) return;

      const moved = state.aisleOrder.splice(fromIdx, 1)[0];
      state.aisleOrder.splice(toIdx, 0, moved);
      renderAisleOrder();
    });

    list.appendChild(wrapper);
  });

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.textContent = 'Add Aisle';
  addButton.addEventListener('click', () => {
    state.aisleOrder.push('');
    renderAisleOrder();
  });
  list.appendChild(addButton);

  list.querySelectorAll('.aisle-input').forEach((input) => {
    input.addEventListener('input', (e) => {
      const idx = Number(e.target.dataset.index);
      const oldAisle = state.aisleOrder[idx];
      const newAisle = e.target.value;
      state.aisleOrder[idx] = newAisle;
      moveAisleHelpText(oldAisle, newAisle);
      renderAisleDropdown();
    });
  });

  list.querySelectorAll('.aisle-help-input').forEach((input) => {
    input.addEventListener('input', (e) => {
      const idx = Number(e.target.dataset.index);
      const aisle = state.aisleOrder[idx] || '';
      setAisleHelpText(aisle, e.target.value || '');
      renderAisleDropdown();
    });
  });

  list.querySelectorAll('.aisle-delete').forEach((button) => {
    button.addEventListener('click', (e) => {
      const idx = Number(e.target.dataset.index);
      removeAisleHelpText(state.aisleOrder[idx] || '');
      state.aisleOrder.splice(idx, 1);
      renderAisleOrder();
      renderAisleDropdown();
    });
  });
}

function renderAisleDropdown() {
  const select = document.getElementById('item-aisle');
  select.innerHTML = '';
  if (state.aisleOrder.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No aisles, add one first';
    select.appendChild(opt);
    select.disabled = true;
    return;
  }
  select.disabled = false;
  state.aisleOrder.forEach((aisle) => {
    const opt = document.createElement('option');
    opt.value = aisle;
    opt.textContent = formatAisleDisplay(aisle);
    select.appendChild(opt);
  });
}


async function saveAisleOrder() {
  const normalized = state.aisleOrder.map(s => s.trim()).filter(Boolean);
  if (normalized.length === 0) {
    alert('Please add at least one aisle name.');
    return;
  }
  await window.api.setAisleOrder(normalized);
  state.aisleOrder = normalized;
  pruneAisleHelpText();
  renderAisleOrder();
  renderAisleDropdown();
  await reloadItems();
}

async function saveWeeklyList() {
  return saveAsNewList();
}

async function saveAsNewList() {
  const quantities = getQuantitiesForSave();
  if (!quantities) return;
  const dateField = document.getElementById('weekly-date').value;
  const dateValue = dateField || new Date().toISOString().split('T')[0];
  const saved = await window.api.saveWeeklyList(dateValue, quantities);
  state.currentListId = saved.id;
  state.listDirty = false;
  state.listSavedDate = dateValue;
  refreshListPreview();
  await loadWeeklyLists();
}

async function updateCurrentList() {
  if (!state.currentListId) { alert('No saved list is currently open to update.'); return; }
  const quantities = getQuantitiesForSave();
  if (!quantities) return;
  const dateField = document.getElementById('weekly-date').value;
  const dateValue = dateField || state.listSavedDate || new Date().toISOString().split('T')[0];
  await window.api.updateWeeklyList(state.currentListId, dateValue, quantities);
  state.listDirty = false;
  state.listSavedDate = dateValue;
  refreshListPreview();
  await loadWeeklyLists();
}

function getQuantitiesForSave() {
  document.querySelectorAll('.quantity-input').forEach(input => {
    const id = Number(input.dataset.id);
    const qty = Math.max(0, parseInt(input.value) || 0);
    if (qty > 0) state.itemQuantities[id] = qty;
    else delete state.itemQuantities[id];
  });
  const quantities = {};
  Object.entries(state.itemQuantities).forEach(([id, qty]) => {
    if (qty > 0) quantities[id] = qty;
  });
  if (Object.keys(quantities).length === 0) {
    alert('Enter quantities for at least one item.');
    return null;
  }
  return quantities;
}

function clearForm() {
  document.getElementById('item-id').value = '';
  document.getElementById('item-name').value = '';
  document.getElementById('item-aisle').value = '';
}

function resetQuantities() {
  state.itemQuantities = {};
  state.listDirty = false;
  state.listSavedDate = null;
  state.currentListId = null;
  state.lastItemCount = 0;
  document.querySelectorAll('.quantity-input').forEach((input) => {
    input.value = 0;
  });
  document.getElementById('generated-list').innerHTML = '';
}

async function closeViewedList() {
  const hasItems = Object.values(state.itemQuantities).some(q => q > 0);
  if (hasItems && state.listDirty) {
    const save = confirm('You have unsaved changes. Save the list before closing?');
    if (save) await saveWeeklyList();
  }
  resetQuantities();
}

function refreshListPreview() {
  const quantities = {};
  Object.entries(state.itemQuantities).forEach(([id, qty]) => {
    if (qty > 0) quantities[id] = qty;
  });
  const selectedIds = new Set(Object.keys(quantities).map(Number));
  state.lastItemCount = selectedIds.size;

  if (selectedIds.size === 0) {
    document.getElementById('generated-list').innerHTML = '';
    return;
  }

  const selectedItems = state.items.filter(item => selectedIds.has(item.id));
  const itemsByAisle = {};
  selectedItems.forEach(item => {
    if (!itemsByAisle[item.aisle]) itemsByAisle[item.aisle] = [];
    itemsByAisle[item.aisle].push(item);
  });

  const aisleSequence = [];
  state.aisleOrder.forEach(aisle => { if (itemsByAisle[aisle]) aisleSequence.push(aisle); });
  const remainingAisles = Object.keys(itemsByAisle).filter(a => !state.aisleOrder.includes(a)).sort();
  aisleSequence.push(...remainingAisles);

  const groupedHtml = aisleSequence.map(aisle => {
    const entries = itemsByAisle[aisle]
      .map(i => `<li>☐ ${i.name} (${quantities[i.id]})</li>`)
      .join('');
    return `<div class="generated-aisle-group"><div class="aisle-heading">${aisle}</div><ul class="aisle-items">${entries}</ul></div>`;
  }).join('');

  const heading = state.listSavedDate && !state.listDirty
    ? `Saved list (${state.listSavedDate})`
    : state.listSavedDate
      ? `List (${state.listSavedDate}) — unsaved changes`
      : 'Current list (unsaved)';

  document.getElementById('generated-list').innerHTML = `<h3>${heading}</h3>${groupedHtml}`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const themeToggle = document.getElementById('theme-toggle');
  const colorThemeToggle = document.getElementById('color-theme-toggle');
  const applyTheme = (mode) => {
    const dark = mode === 'dark';
    document.body.classList.toggle('dark-mode', dark);
    themeToggle.textContent = dark ? 'Light' : 'Dark';
    themeToggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
  };

  const applyColorTheme = (mode) => {
    const green = mode === 'green';
    document.body.classList.toggle('green-theme', green);
    colorThemeToggle.textContent = green ? 'Blue' : 'Green';
    colorThemeToggle.setAttribute('aria-pressed', green ? 'true' : 'false');
  };

  const savedTheme = localStorage.getItem('theme-mode') || 'light';
  const savedColorTheme = localStorage.getItem('color-theme-mode') || 'blue';
  applyTheme(savedTheme);
  applyColorTheme(savedColorTheme);

  state.aisleHelp = localStorage.getItem('aisle-help-mode') === 'on';
  try {
    state.aisleHelpCustom = JSON.parse(localStorage.getItem('aisle-help-custom') || '{}') || {};
  } catch (e) {
    state.aisleHelpCustom = {};
  }
  updateAisleHelpToggleLabel();

  themeToggle.addEventListener('click', () => {
    const nextMode = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    applyTheme(nextMode);
    localStorage.setItem('theme-mode', nextMode);
  });

  colorThemeToggle.addEventListener('click', () => {
    const nextMode = document.body.classList.contains('green-theme') ? 'blue' : 'green';
    applyColorTheme(nextMode);
    localStorage.setItem('color-theme-mode', nextMode);
  });

  try { await reloadItems(); } catch (e) { console.error('reloadItems failed:', e); }
  try { await loadAisleOrder(); } catch (e) { console.error('loadAisleOrder failed:', e); }
  try { await loadWeeklyLists(); } catch (e) { console.error('loadWeeklyLists failed:', e); }

  document.getElementById('item-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = Number(document.getElementById('item-id').value);
    const name = document.getElementById('item-name').value.trim();
    const aisle = document.getElementById('item-aisle').value;
    if (!name || !aisle) {
      alert('Item name and aisle are required.');
      return;
    }

    if (id) {
      await window.api.updateItem({ id, name, aisle });
    } else {
      await window.api.addItem({ name, aisle });
    }

    clearForm();
    await reloadItems();
    await loadAisleOrder();
  });

  document.getElementById('clear-form').addEventListener('click', (e) => {
    e.preventDefault();
    clearForm();
  });

  document.getElementById('clear-quantities').addEventListener('click', () => {
    resetQuantities();
  });

  document.getElementById('item-sort').addEventListener('change', (e) => {
    state.itemSort = ['name', 'aisle', 'aisle-order'].includes(e.target.value) ? e.target.value : 'name';
    renderItems();
  });

  document.getElementById('item-search').addEventListener('input', (e) => {
    state.itemSearch = e.target.value || '';
    renderItems();
  });

  document.getElementById('clear-search').addEventListener('click', () => {
    const searchInput = document.getElementById('item-search');
    searchInput.value = '';
    state.itemSearch = '';
    renderItems();
    searchInput.focus();
  });

  document.getElementById('search-to-add').addEventListener('click', () => {
    const searchInput = document.getElementById('item-search');
    const term = searchInput.value.trim();
    if (!term) return;
    document.getElementById('item-id').value = '';
    document.getElementById('item-name').value = term;
    searchInput.value = '';
    state.itemSearch = '';
    renderItems();
    document.getElementById('item-aisle').focus();
  });

  document.getElementById('close-viewed-list').addEventListener('click', async () => {
    await closeViewedList();
  });

  document.getElementById('add-aisle').addEventListener('click', () => {
    const newAisle = document.getElementById('new-aisle-name').value.trim();
    if (!newAisle) {
      alert('Enter aisle name to add.');
      return;
    }
    if (state.aisleOrder.includes(newAisle)) {
      alert('Aisle already exists.');
      return;
    }
    state.aisleOrder.push(newAisle);
    renderAisleOrder();
    renderAisleDropdown();
    document.getElementById('new-aisle-name').value = '';
  });

  const aisleToggleBtn = document.getElementById('aisle-toggle');
  const aislePanel = document.getElementById('aisle-panel');
  aisleToggleBtn.addEventListener('click', () => {
    const collapsed = aislePanel.style.display === 'none';
    if (collapsed) {
      aislePanel.style.display = 'block';
      aisleToggleBtn.textContent = '▼';
    } else {
      aislePanel.style.display = 'none';
      aisleToggleBtn.textContent = '▶';
    }
  });

  document.getElementById('aisle-help-toggle').addEventListener('click', () => {
    state.aisleHelp = !state.aisleHelp;
    localStorage.setItem('aisle-help-mode', state.aisleHelp ? 'on' : 'off');
    updateAisleHelpToggleLabel();
    renderAisleOrder();
    renderAisleDropdown();
  });

  const weeklyToggleBtn = document.getElementById('weekly-toggle');
  const weeklyPanel = document.getElementById('weekly-panel');
  weeklyToggleBtn.addEventListener('click', () => {
    const collapsed = weeklyPanel.style.display === 'none';
    if (collapsed) {
      weeklyPanel.style.display = 'block';
      weeklyToggleBtn.textContent = '▼';
    } else {
      weeklyPanel.style.display = 'none';
      weeklyToggleBtn.textContent = '▶';
    }
  });

  document.getElementById('update-aisle-order').addEventListener('click', saveAisleOrder);

  // Save List dropdown
  const saveListDropdown = document.getElementById('save-list-dropdown');
  const saveUpdateBtn = document.getElementById('save-update-btn');
  const saveNewBtn = document.getElementById('save-new-btn');
  document.getElementById('generate-list').addEventListener('click', (e) => {
    e.stopPropagation();
    // Enable/disable Update based on whether a list is loaded
    saveUpdateBtn.disabled = !state.currentListId;
    saveListDropdown.classList.toggle('open');
  });
  document.addEventListener('click', () => saveListDropdown.classList.remove('open'));
  saveUpdateBtn.addEventListener('click', () => { saveListDropdown.classList.remove('open'); updateCurrentList(); });
  saveNewBtn.addEventListener('click', () => { saveListDropdown.classList.remove('open'); saveAsNewList(); });

  document.getElementById('discard-list').addEventListener('click', () => {
    const hasItems = Object.values(state.itemQuantities).some(q => q > 0);
    if (!hasItems || confirm('Discard the current list?')) {
      resetQuantities();
    }
  });
  document.getElementById('print-list').addEventListener('click', async () => {
    const output = document.getElementById('generated-list');
    if (!output.innerText.trim()) {
      alert('Generate a list first before printing.');
      return;
    }
    const heading = output.querySelector('h3');
    const headingHtml = heading ? heading.outerHTML : '';
    const listHtml = heading ? output.innerHTML.replace(heading.outerHTML, '') : output.innerHTML;
    const itemCount = state.lastItemCount;
    let columnCount = 1;
    if (itemCount > 15) columnCount = 2;
    if (itemCount > 30) columnCount = 3;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Shopping List</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:wght@400;700&display=swap">
        <style>
          body { font-family: 'Lora', serif; margin: 20px; }
          h3 { margin: 0 0 10px 0; }
          .print-heading { margin-bottom: 10px; }
          .generated-aisle-group {
            break-inside: avoid-column;
            -webkit-column-break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 8px;
          }
          .aisle-heading { font-weight: bold; margin-top: 12px; font-size: 16px; }
          .aisle-items { margin: 0; padding-left: 0; list-style-type: none; }
          .aisle-items li { margin: 2px 0; font-size: 14px; }
          @media print {
            .print-content { column-count: ${columnCount}; column-gap: 20px; column-fill: balance; }
          }
        </style>
      </head>
      <body>
        <div class="print-heading">${headingHtml}</div>
        <div class="print-content">${listHtml}</div>
      </body>
      </html>
    `;
    try {
      await window.api.print(htmlContent);
    } catch (err) {
      console.error(err);
      alert('Print request failed: ' + (err.message || err));
    }
  });

  // Panel resizer drag
  const panelResizer = document.getElementById('panel-resizer');
  const leftPanel = document.querySelector('.left-panel');
  const rightPanel = document.querySelector('.right-panel');
  let splitRatio = null; // null = untouched (equal flex)

  function applyRatio() {
    if (splitRatio === null) return;
    const resizerWidth = panelResizer.getBoundingClientRect().width;
    const total = leftPanel.parentElement.getBoundingClientRect().width - resizerWidth;
    const minWidth = 180;
    const newLeft = Math.max(minWidth, Math.min(total - minWidth, Math.round(total * splitRatio)));
    const newRight = total - newLeft;
    leftPanel.style.flex = `0 0 ${newLeft}px`;
    rightPanel.style.flex = `0 0 ${newRight}px`;
  }

  window.addEventListener('resize', applyRatio);

  panelResizer.addEventListener('dblclick', () => {
    leftPanel.style.flex = '1';
    rightPanel.style.flex = '1';
    splitRatio = null;
  });

  panelResizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startLeftWidth = leftPanel.getBoundingClientRect().width;
    const startRightWidth = rightPanel.getBoundingClientRect().width;
    const minWidth = 180;

    panelResizer.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    function onMouseMove(e) {
      const dx = e.clientX - startX;
      const total = startLeftWidth + startRightWidth;
      const newLeft = Math.max(minWidth, Math.min(total - minWidth, startLeftWidth + dx));
      const newRight = total - newLeft;
      splitRatio = newLeft / total;
      leftPanel.style.flex = `0 0 ${newLeft}px`;
      rightPanel.style.flex = `0 0 ${newRight}px`;
    }

    function onMouseUp() {
      panelResizer.classList.remove('dragging');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
});

// ── Gear menu ──────────────────────────────────────────────
(function () {
  const gearBtn = document.getElementById('gear-btn');
  const gearDropdown = document.getElementById('gear-dropdown');
  const checkUpdatesBtn = document.getElementById('check-updates-btn');

  gearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    gearDropdown.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    gearDropdown.classList.remove('open');
  });

  const aboutBtn = document.getElementById('about-btn');
  aboutBtn.addEventListener('click', async () => {
    gearDropdown.classList.remove('open');
    const version = await window.api.getVersion();
    showUpdateToast('ok', 'Shopping List Generator  \u2014  Version ' + version);
  });

  checkUpdatesBtn.addEventListener('click', () => {
    gearDropdown.classList.remove('open');
    showUpdateToast('checking', 'Checking for updates\u2026');
    window.api.checkForUpdates();
  });
})();

// ── Update toast ───────────────────────────────────────────
(function () {
  const toast = document.getElementById('update-toast');
  const toastTitle = document.getElementById('update-toast-title');
  const toastMsg = document.getElementById('update-toast-msg');
  const progressWrap = document.getElementById('update-progress-wrap');
  const progressBar = document.getElementById('update-progress-bar');
  const toastBtns = document.getElementById('update-toast-btns');
  const toastClose = document.getElementById('update-toast-close');

  toastClose.addEventListener('click', () => toast.classList.remove('visible'));

  window.showUpdateToast = function showUpdateToast(type, msg, extra) {
    toast.classList.add('visible');
    progressWrap.style.display = 'none';
    toastBtns.style.display = 'none';
    toastBtns.innerHTML = '';
    toastTitle.textContent = 'Updates';
    toastMsg.textContent = msg;

    if (type === 'progress') {
      const pct = extra || 0;
      toastTitle.textContent = 'Downloading Update';
      toastMsg.textContent = 'Downloading\u2026 ' + pct + '%';
      progressWrap.style.display = 'block';
      progressBar.style.width = pct + '%';
    } else if (type === 'downloaded') {
      toastTitle.textContent = 'Update Ready';
      toastBtns.style.display = 'flex';
      const installBtn = document.createElement('button');
      installBtn.textContent = 'Install Now';
      installBtn.addEventListener('click', () => window.api.installUpdate());
      const laterBtn = document.createElement('button');
      laterBtn.textContent = 'Later';
      laterBtn.addEventListener('click', () => toast.classList.remove('visible'));
      toastBtns.appendChild(installBtn);
      toastBtns.appendChild(laterBtn);
    }
  };

  window.api.onUpdateStatus((status) => {
    const { type, version, percent } = status;
    if (type === 'available') {
      showUpdateToast('available', 'Current version: ' + status.currentVersion + '  \u2192  New version: ' + version + '. Downloading\u2026');
    } else if (type === 'not-available') {
      showUpdateToast('ok', 'You have the latest version (' + version + ').');
    } else if (type === 'progress') {
      showUpdateToast('progress', '', percent);
    } else if (type === 'downloaded') {
      showUpdateToast('downloaded', 'Version ' + version + ' is ready to install.');
    } else if (type === 'error') {
      showUpdateToast('error', 'Could not check for updates.');
    }
  });
})();