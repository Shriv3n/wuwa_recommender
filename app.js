/* WuWa Team Recommender - Inventory Viewer MVP */

// In-memory store
const store = {
  characters: [],
  weapons: [],
  echoes: [],
  items: [], // combined resources + dev items
};

// mapping dictionaries and normalized id maps
const mapping = {
  raw: {}, // keep raw files by key
  characters: { idToName: {} },
  weapons: { idToName: {} },
  echoes: { idToName: {}, sonataIdToName: {} },
  items: { idToName: {} },
  echoStats: {},
  characterIcons: { idToFile: {} },
  loaded: false,
};

// UI elements
const els = {
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  selectBtn: document.getElementById('select-files'),
  clearBtn: document.getElementById('clear-data'),
  summary: document.getElementById('summary'),
  characters: document.getElementById('characters'),
  weapons: document.getElementById('weapons'),
  echoes: document.getElementById('echoes'),
  items: document.getElementById('items'),
  search: {
    characters: document.getElementById('search-characters'),
    weapons: document.getElementById('search-weapons'),
    echoes: document.getElementById('search-echoes'),
    items: document.getElementById('search-items'),
  }
};

// mapping UI
const mapEls = {
  banner: document.getElementById('mapping-banner'),
  loadBtn: document.getElementById('load-mapping'),
  input: document.getElementById('mapping-input'),
};

// Helpers
function toArrayMaybe(objOrArr) {
  if (Array.isArray(objOrArr)) return objOrArr;
  if (objOrArr && typeof objOrArr === 'object') return Object.values(objOrArr);
  return [];
}

// robust getters across various shapes/casings
const getAny = (o, keys = []) => {
  if (!o || typeof o !== 'object') return undefined;
  for (const k of keys) {
    if (o[k] !== undefined) return o[k];
  }
  return undefined;
};
const numAny = (o, keys = []) => {
  const v = getAny(o, keys);
  const n = toNum(v);
  return n != null ? n : undefined;
};
const strAny = (o, keys = []) => {
  const v = getAny(o, keys);
  return v == null ? undefined : String(v);
};

function detectType(json, filename = '') {
  // Try to identify by structural hints
  const val = json;
  const arr = toArrayMaybe(val);
  if (arr.length) {
    const sample = arr[0] || {};
    if (sample?.sonata || sample?.stats || sample?.mainStat) return 'echoes';
    if (sample?.weaponId || sample?.equippedWeapon || sample?.element || sample?.name && sample?.level) return 'characters';
    if (sample?.rank !== undefined && (sample?.name || sample?.weaponType)) return 'weapons';
    if (sample?.quantity !== undefined || sample?.count !== undefined) return 'resources';
  } else if (val && typeof val === 'object') {
    // object keyed by id
    const values = Object.values(val);
    const sample = values[0] || {};
    if (sample?.sonata || sample?.stats) return 'echoes';
    if (sample?.weaponId || sample?.equippedWeapon || sample?.element) return 'characters';
    if (sample?.rank !== undefined || sample?.weaponType) return 'weapons';
    if (sample?.quantity !== undefined || sample?.count !== undefined) return 'resources';
  }
  // Filename-based detection for Inventory Kamera exports
  const lower = (filename || '').toLowerCase();
  if (lower.includes('characters_wuwainventorykamera')) return 'characters';
  if (lower.includes('weapons_wuwainventorykamera')) return 'weapons';
  if (lower.includes('echoes_wuwainventorykamera')) return 'echoes';
  if (lower.includes('inventory_wuwainventorykamera')) return 'items';

  return 'unknown';
}

function prettifySlug(slug) {
  if (!slug) return '';
  // split by non-letters and also attempt to insert spaces between letter groups
  const s = String(slug).replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  // naive split for concatenated lower-case words
  const spaced = s.replace(/([a-z])([A-Z0-9])/g, '$1 $2');
  return spaced
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function toNum(x) {
  if (typeof x === 'number') return x;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function mapName(type, value, subtype = '') {
  if (!mapping.loaded) return value;
  const vNum = toNum(value);
  if (type === 'echoes' && subtype === 'sonata') {
    if (vNum != null && mapping.echoes.sonataIdToName[vNum]) return mapping.echoes.sonataIdToName[vNum];
    return value;
  }
  const dict = mapping[type]?.idToName || {};
  if (vNum != null && dict[vNum]) return dict[vNum];
  return value;
}

function normalizeAndMerge(type, data, filename = '') {
  const arr = toArrayMaybe(data);
  const pushUniqueBy = (list, items, key = 'id') => {
    const seen = new Set(list.map(x => x?.[key] ?? x?.name));
    for (const it of items) {
      const idOrName = it?.[key] ?? it?.name;
      if (!seen.has(idOrName)) list.push(it);
    }
  };

  switch (type) {
    case 'characters':
      // Handle both array of objects and object keyed by character id
      if (!Array.isArray(data) && data && typeof data === 'object') {
        for (const [idKey, ch] of Object.entries(data)) {
          const charId = toNum(idKey) ?? numAny(ch, ['id','characterId','avatarId','characterID']);
          const level = getAny(ch, ['level','Level','lv','LV']);
          const weaponId = numAny(ch, ['weaponId','equippedWeaponId'])
            ?? numAny(ch.weapon || {}, ['id','weaponId','templateId'])
            ?? numAny(ch.equippedWeapon || {}, ['id','weaponId','templateId']);
          const name = charId != null ? mapName('characters', charId) : (ch.name != null ? mapName('characters', ch.name) : ch.name);
          const weaponName = weaponId != null ? mapName('weapons', weaponId) : (strAny(ch, ['weaponName']) || '');
          const weaponLevel = getAny(ch.weapon || {}, ['level','Level','lv','LV']);
          const skills = ch.skills || {};
          store.characters.push({ ...ch, id: charId ?? ch?.id, name, level, _weaponName: weaponName, _weaponLevel: weaponLevel, _skills: skills, _rawKey: idKey });
        }
      } else {
        for (const ch of arr) {
          const charId = numAny(ch, ['id','characterId','avatarId','characterID']);
          const level = getAny(ch, ['level','Level','lv','LV']);
          // weapon info may be nested
          const weaponId = numAny(ch, ['weaponId','equippedWeaponId'])
            ?? numAny(ch.weapon || {}, ['id','weaponId','templateId'])
            ?? numAny(ch.equippedWeapon || {}, ['id','weaponId','templateId']);
          const name = charId != null ? mapName('characters', charId) : (ch.name != null ? mapName('characters', ch.name) : ch.name);
          const weaponName = weaponId != null ? mapName('weapons', weaponId) : (strAny(ch, ['weaponName']) || '');
          const weaponLevel = getAny(ch.weapon || {}, ['level','Level','lv','LV']);
          const skills = ch.skills || {};
          store.characters.push({ ...ch, id: charId ?? ch.id, name, level, _weaponName: weaponName, _weaponLevel: weaponLevel, _skills: skills });
        }
      }
      break;
    case 'weapons':
      // Support both array and object keyed by weapon id
      const isInventoryKameraWeapons = (filename || '').toLowerCase().includes('weapons_wuwainventorykamera');
      if (!Array.isArray(data) && data && typeof data === 'object') {
        for (const [idKey, w] of Object.entries(data)) {
          const id = toNum(idKey) ?? numAny(w, ['id','weaponId','templateId','instanceId']);
          const name = id != null ? mapName('weapons', id) : (w?.name != null ? mapName('weapons', w.name) : w?.name);
          // Defensive direct reads
          const level = getAny(w, ['level','Level','lv','LV']);
          const ascension = getAny(w, ['ascension','Ascension','phase']);
          const rarity = (id != null && mapping.weapons.idToRarity?.[id] != null)
            ? mapping.weapons.idToRarity[id]
            : (getAny(w, ['rarity','Rarity','rank','stars','quality']) ?? w?.rank);
          store.weapons.push({ ...w, id: id ?? w?.id, name: (name ?? id ?? ''), _level: level ?? w?.level, _ascension: ascension ?? w?.ascension, _rarity: rarity });
        }
      } else {
        for (const w of arr) {
          // Unwrap shape: { "21050066": { level, ascension, rank } }
          let idFromKey = null;
          let inner = w;
          if (w && typeof w === 'object' && !Array.isArray(w)) {
            const keys = Object.keys(w);
            if (keys.length === 1 && w[keys[0]] && typeof w[keys[0]] === 'object') {
              idFromKey = toNum(keys[0]);
              inner = w[keys[0]];
            }
          }
          const id = idFromKey ?? numAny(inner, ['id','weaponId','templateId','instanceId']);
          const name = id != null ? mapName('weapons', id) : (inner?.name != null ? mapName('weapons', inner.name) : inner?.name);
          const level = getAny(inner, ['level','Level','lv','LV']);
          const ascension = getAny(inner, ['ascension','Ascension','phase']);
          const rarity = (id != null && mapping.weapons.idToRarity?.[id] != null)
            ? mapping.weapons.idToRarity[id]
            : (getAny(inner, ['rarity','Rarity','rank','stars','quality']) ?? inner?.rank);
          store.weapons.push({ ...inner, id: id ?? inner?.id, name: (name ?? id ?? ''), _level: level ?? inner?.level, _ascension: ascension ?? inner?.ascension, _rarity: rarity });
        }
      }
      break;
    case 'echoes':
      // echoes might not have stable ids; merge by hash of some fields
      for (const e of arr) {
        const id = numAny(e, ['id','echoId','templateId','instanceId']);
        const name = id != null ? mapName('echoes', id) : (e.name != null ? mapName('echoes', e.name) : e.name);
        const cost = getAny(e, ['cost','echoCost','valueCost']);
        const rarity = getAny(e, ['rarity','rank','stars','quality']);
        // stats can be in various shapes
        const mainStat = getAny(e, ['mainStat','MainStat','primaryStat']);
        const subStats = getAny(e, ['subStats','SubStats','subs','secondaryStats']) || [];
        const addStats = getAny(e, ['additionalStats','AdditionalStats']) || [];
        const sonata = getAny(e, ['sonata','set','sonataId']);
        const sonataName = sonata != null ? mapName('echoes', sonata, 'sonata') : '';
        store.echoes.push({ ...e, id: id ?? e.id, name, cost, rarity, _mainStat: mainStat, _subStats: subStats, _addStats: addStats, _sonataName: sonataName });
      }
      break;
    case 'items':
      for (const it of arr) {
        // inventory json may contain both resources and dev items
        const id = numAny(it, ['id','itemId','templateId']);
        const qty = getAny(it, ['quantity','count','num','qty','amount']);
        const name = id != null ? mapName('items', id) : (it.name != null ? mapName('items', it.name) : it.name);
        store.items.push({ ...it, id: id ?? it.id, name, _qty: qty });
      }
      break;
    default:
      // attempt heuristic mapping for unknowns
      // If many have quantity -> items
      const hasQty = arr.filter(x => x && (x.quantity !== undefined || x.count !== undefined)).length;
      if (hasQty > arr.length / 2) for (const r of arr) store.items.push(r);
      break;
  }
}

function renderSummary() {
  const items = [
    { k: 'Characters', v: store.characters.length },
    { k: 'Weapons', v: store.weapons.length },
    { k: 'Echoes', v: store.echoes.length },
    { k: 'Items', v: store.items.length },
  ];
  els.summary.innerHTML = items.map(({k, v}) => `
    <div class="card">
      <div class="text-slate-400 text-xs">${k}</div>
      <div class="text-2xl font-semibold mt-1">${v}</div>
    </div>
  `).join('');
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"]+/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
}

function renderList(container, data, kind, q = '') {
  const query = q.trim().toLowerCase();
  const filtered = query ? data.filter(x => (x?.name || x?.id || '').toString().toLowerCase().includes(query)) : data;

  const html = filtered.map((x) => {
    if (kind === 'characters') {
      const weapon = x._weaponName || x.weaponName || (typeof x.weapon === 'object' ? mapName('weapons', numAny(x.weapon, ['id','weaponId','templateId'])) : x.weapon) || x.weaponId || '';
      const level = x.level ?? x.lv ?? x.Level ?? '';
      const weaponLevel = x._weaponLevel ?? '';
      const skills = x._skills || x.skills || {};
      // Ensure we have an id even if normalization missed setting x.id
      let cid = toNum(x.id);
      if (cid == null && x && x._rawKey) cid = toNum(x._rawKey) || x._rawKey; // Keep string keys like "zaira"
      if (cid == null && typeof x.name === 'string' && mapping.characters?.idToName) {
        const matchId = Object.keys(mapping.characters.idToName).find(k => mapping.characters.idToName[k] === x.name);
        if (matchId) cid = toNum(matchId);
      }
      // Get the icon file using the character ID (numeric or string)
      let iconFile = mapping.characterIcons.idToFile?.[cid] || '';
      console.log(`[WuWa] Looking up icon for character ID: ${cid} (type: ${typeof cid}), found:`, iconFile || 'none');
      console.log(`[WuWa] Available icon mappings:`, Object.keys(mapping.characterIcons.idToFile || {}));
      
      // Create the correct path for the icon
      const iconSrc = iconFile ? `./data/Images/CharacterIcons/${iconFile}` : '';
      if (iconFile) {
        console.log(`[WuWa] Using character icon: ${iconSrc}`);
      } else {
        console.warn(`[WuWa] No icon found for character ID: ${cid} (${x.name || 'unnamed'})`);
      }
      try { console.debug('[WuWa] Character', x.id || x._rawKey || x.name, 'icon:', iconFile || '(none)'); } catch {}
      const skillOrder = ['normal','resonance','forte','liberation','intro'];
      const skillsHtml = skillOrder
        .filter(k => skills[k] !== undefined)
        .map(k => {
          const label = k.charAt(0).toUpperCase() + k.slice(1);
          return `<div class="k">${escapeHtml(label)}</div><div class="v text-right">${escapeHtml(String(skills[k]))}</div>`;
        })
        .join('');
      return `
        <div class="card">
          <div class="flex items-start gap-3">
            <div class="w-16 h-16 rounded-lg overflow-hidden bg-slate-800/50 border border-slate-700/40 flex-shrink-0">
              ${iconSrc ? `<img src="${iconSrc}" alt="${escapeHtml(x.name || 'Portrait')}" class="w-full h-full object-cover" />` : ''}
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <div class="font-semibold">${escapeHtml(x.name || x.id)}</div>
                <span class="badge">Lv ${escapeHtml(level)}</span>
              </div>
              <div class="grid-kv mt-2 text-sm">
                <div class="k">Weapon</div>
                <div class="v">
                  <div class="flex items-center justify-between gap-3">
                    <span>${escapeHtml(weapon)}</span>
                    ${weaponLevel !== '' ? `<span class="badge">Lv ${escapeHtml(weaponLevel)}</span>` : ''}
                  </div>
                </div>
              </div>
              ${skillsHtml ? `<div class="grid-kv mt-3 text-sm"><div class="k col-span-2 font-semibold text-slate-300">Talents</div>${skillsHtml}</div>` : ''}
            </div>
          </div>
        </div>`;
    }

    if (kind === 'weapons') {
      const id = x.id ?? numAny(x, ['id','weaponId','templateId','instanceId']);
      const nameMapped = id != null ? mapName('weapons', id) : '';
      const displayName = (x.name || nameMapped || id || '').toString();
      const level = (x._level ?? x.level ?? '');
      const asc = (x._ascension ?? x.ascension ?? '');
      const rarityMapped = id != null && mapping.weapons.idToRarity ? mapping.weapons.idToRarity[id] : undefined;
      const rank = (rarityMapped ?? x._rarity ?? x.rarity ?? x.rank ?? x.stars ?? '');
      return `
        <div class="card">
          <div class="grid-kv text-sm">
            <div class="k">Name</div><div class="v text-right">${escapeHtml(displayName)}</div>
            <div class="k">Level</div><div class="v text-right">${escapeHtml(level)}</div>
            <div class="k">Ascension</div><div class="v text-right">${escapeHtml(asc)}</div>
            <div class="k">Rarity</div><div class="v text-right">${escapeHtml(rank)}</div>
          </div>
        </div>`;
    }

    if (kind === 'echoes') {
      const set = x._sonataName || x.sonata || x.set || '';
      // main and sub stats formatting
      const mainRaw = x._mainStat || x.mainStat || {};
      const msName = typeof mainRaw === 'object' ? (mainRaw.name || mainRaw.stat || mainRaw.key || '') : String(mainRaw || '');
      const main = mapping.echoStats[msName] || prettifySlug(msName);
      const subsArr = Array.isArray(x._subStats || x.subStats) ? (x._subStats || x.subStats) : [];
      const subs = subsArr.map(s => s?.name || s?.stat || s?.key || '').filter(Boolean).map(k => mapping.echoStats[k] || prettifySlug(k)).slice(0,3).join(', ');
      const cost = x.cost ?? x.valueCost ?? '';
      const rarity = x.rarity ?? x.rank ?? x.stars ?? '';
      return `
        <div class="card">
          <div class="font-semibold">${escapeHtml(x.name || 'Echo')}</div>
          <div class="grid-kv mt-2 text-sm">
            <div class="k">Set</div><div class="v text-right">${escapeHtml(set)}</div>
            <div class="k">Cost</div><div class="v text-right">${escapeHtml(cost)}</div>
            <div class="k">Rarity</div><div class="v text-right">${escapeHtml(rarity)}</div>
            <div class="k">Main</div><div class="v text-right">${escapeHtml(main)}</div>
            <div class="k">Subs</div><div class="v text-right">${escapeHtml(subs)}</div>
          </div>
        </div>`;
    }

    // items (resources + dev items)
    const qty = x._qty ?? x.quantity ?? x.count ?? '';
    return `
      <div class="card">
        <div class="font-semibold">${escapeHtml(x.name || x.id)}</div>
        ${qty !== '' ? `<div class="text-sm mt-1 text-slate-300">Qty: <span class="v">${escapeHtml(qty)}</span></div>` : ''}
      </div>`;
  }).join('');

  container.innerHTML = html || '<div class="text-slate-400">No items to display.</div>';
}

function wireSearch() {
  els.search.characters.addEventListener('input', () => renderList(els.characters, store.characters, 'characters', els.search.characters.value));
  els.search.weapons.addEventListener('input', () => renderList(els.weapons, store.weapons, 'weapons', els.search.weapons.value));
  els.search.echoes.addEventListener('input', () => renderList(els.echoes, store.echoes, 'echoes', els.search.echoes.value));
  els.search.items.addEventListener('input', () => renderList(els.items, store.items, 'items', els.search.items.value));
}

async function readFiles(files) {
  const readers = Array.from(files).map(file => file.text().then(text => ({ name: file.name, json: JSON.parse(text) })).catch(err => ({ name: file.name, error: String(err) })));
  const results = await Promise.all(readers);

  for (const { name, json, error } of results) {
    if (error) {
      console.warn('Failed to parse', name, error);
      continue;
    }
    let type = detectType(json, name);
    if (type === 'unknown') {
      // basic filename hints
      const lower = name.toLowerCase();
      if (lower.includes('char')) type = 'characters';
      else if (lower.includes('weap')) type = 'weapons';
      else if (lower.includes('echo')) type = 'echoes';
      else if (lower.includes('invent')) type = 'items';
    }

    normalizeAndMerge(type, json, name);
  }

  renderAll();
}

function clearAll() {
  store.characters = [];
  store.weapons = [];
  store.echoes = [];
  store.items = [];
  renderAll();
}

function clearCategory(kind) {
  if (kind === 'characters') store.characters = [];
  if (kind === 'weapons') store.weapons = [];
  if (kind === 'echoes') store.echoes = [];
  if (kind === 'items') store.items = [];
  renderAll();
}

function renderAll() {
  renderSummary();
  renderList(els.characters, store.characters, 'characters', els.search.characters.value);
  renderList(els.weapons, store.weapons, 'weapons', els.search.weapons.value);
  renderList(els.echoes, store.echoes, 'echoes', els.search.echoes.value);
  renderList(els.items, store.items, 'items', els.search.items.value);
}

function setupDnD() {
  const dz = els.dropzone;
  const prevent = e => { e.preventDefault(); e.stopPropagation(); };
  ['dragenter','dragover','dragleave','drop'].forEach(ev => dz.addEventListener(ev, prevent));
  dz.addEventListener('dragover', () => dz.classList.add('ring'));
  dz.addEventListener('dragleave', () => dz.classList.remove('ring'));
  dz.addEventListener('drop', async (e) => {
    dz.classList.remove('ring');
    const files = e.dataTransfer?.files || [];
    await readFiles(files);
  });
}

function setupActions() {
  els.selectBtn.addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', async (e) => {
    const files = e.target.files || [];
    await readFiles(files);
    els.fileInput.value = '';
  });
  els.clearBtn.addEventListener('click', clearAll);
  // per-category clears
  document.getElementById('clear-characters').addEventListener('click', () => clearCategory('characters'));
  document.getElementById('clear-weapons').addEventListener('click', () => clearCategory('weapons'));
  document.getElementById('clear-echoes').addEventListener('click', () => clearCategory('echoes'));
  document.getElementById('clear-items').addEventListener('click', () => clearCategory('items'));
}

function buildIdMapsFromRaw() {
  const raw = mapping.raw;
  // characters.json: { slug: id }
  if (raw.characters && typeof raw.characters === 'object') {
    const idToName = {};
    for (const [slug, id] of Object.entries(raw.characters)) {
      const n = toNum(id);
      if (n != null) idToName[n] = prettifySlug(slug);
    }
    mapping.characters.idToName = idToName;
  }
  // weapons.json: { slug: { id, name, rarity, ... } }
  if (raw.weapons && typeof raw.weapons === 'object') {
    const idToName = {};
    const idToRarity = {};
    for (const [slug, obj] of Object.entries(raw.weapons)) {
      const id = toNum(obj?.id);
      const name = obj?.name || prettifySlug(slug);
      if (id != null) {
        if (name) idToName[id] = name;
        if (obj?.rarity != null) idToRarity[id] = obj.rarity;
      }
    }
    mapping.weapons.idToName = idToName;
    mapping.weapons.idToRarity = idToRarity;
  }
  // echoes.json: { slug: id }
  if (raw.echoes && typeof raw.echoes === 'object') {
    const idToName = {};
    for (const [slug, id] of Object.entries(raw.echoes)) {
      const n = toNum(id);
      if (n != null) idToName[n] = prettifySlug(slug);
    }
    mapping.echoes.idToName = idToName;
  }
  // Character icon manifest: array of filenames or object with { files: [] }
  // PRESERVE existing hardcoded character icon mapping
  const existingCharacterIcons = mapping.characterIcons?.idToFile || {};
  if (raw.characterIcons && (Array.isArray(raw.characterIcons) || typeof raw.characterIcons === 'object')) {
    const files = Array.isArray(raw.characterIcons) ? raw.characterIcons : (raw.characterIcons.files || []);
    const map = {};
    for (const f of files) {
      const fn = typeof f === 'string' ? f.split(/[\\\/]*/).pop() : '';
      if (!fn) continue;
      const m = fn.match(/_UI(\d{4})\.webp$/i);
      if (m) {
        const id = toNum(m[1]);
        if (id != null) map[id] = fn;
      }
    }
    // Merge with existing hardcoded mappings (hardcoded takes precedence)
    mapping.characterIcons.idToFile = { ...map, ...existingCharacterIcons };
    try { console.debug('[WuWa] CharacterIcons mapped:', Object.keys(map).length, 'items from manifest, total:', Object.keys(mapping.characterIcons.idToFile).length); } catch {}
  } else {
    // Keep existing mapping if no new data
    mapping.characterIcons.idToFile = existingCharacterIcons;
    try { console.debug('[WuWa] CharacterIcons preserved:', Object.keys(existingCharacterIcons).length, 'hardcoded items'); } catch {}
  }
  // sonataName.json: { slug: id }
  if (raw.sonataName && typeof raw.sonataName === 'object') {
    const sonMap = {};
    for (const [slug, id] of Object.entries(raw.sonataName)) {
      const n = toNum(id);
      if (n != null) sonMap[n] = prettifySlug(slug);
    }
    mapping.echoes.sonataIdToName = sonMap;
  }
  // echoStats.json: { key: displayKey or short code }
  if (raw.echoStats && typeof raw.echoStats === 'object') {
    mapping.echoStats = raw.echoStats;
  }
  // items.json: { slug: { id, name } }
  if (raw.items && typeof raw.items === 'object') {
    const idToName = {};
    for (const [slug, obj] of Object.entries(raw.items)) {
      const id = toNum(obj?.id);
      const name = obj?.name || prettifySlug(slug);
      if (id != null && name) idToName[id] = name;
    }
    mapping.items.idToName = idToName;
  }
}

function createHardcodedCharacterIconMapping() {
  // Create a direct mapping of character IDs to their icon filenames
  const characterIconMap = {
    // Format: [characterId]: 'T_IconRoleHead256_XX_UIYYYY.webp'
    1102: 'T_IconRoleHead256_7_UI1102.webp',     // Sanhua
    1103: 'T_IconRoleHead256_6_UI1103.webp',     // Baizhi
    1104: 'T_IconRoleHead256_14_UI1104.webp',    // Lingyang
    1105: 'T_IconRoleHead256_27_UI1105.webp',    // Zhezhi
    1106: 'T_IconRoleHead256_31_UI1106.webp',    // Youhu
    1107: 'T_IconRoleHead256_32_UI1107.webp',    // Carlotta
    1202: 'T_IconRoleHead256_2_UI1202.webp',     // Chixia
    1203: 'T_IconRoleHead256_8_UI1203.webp',     // Encore
    1204: 'T_IconRoleHead256_13_UI1204.webp',    // Mortefi
    1205: 'T_IconRoleHead256_26_UI1205.webp',    // Changli
    1206: 'T_IconRoleHead256_44_UI1206.webp',    // Brant
    1207: 'T_IconRoleHead256_46_UI1207.webp',    // Lupa
    1301: 'T_IconRoleHead256_18_UI1301.webp',    // Calcharo
    1302: 'T_IconRoleHead256_17_UI1302.webp',    // Yinlin
    1303: 'T_IconRoleHead256_15_UI1303.webp',    // Yuanwu
    1304: 'T_IconRoleHead256_24_UI1304.webp',    // Jinshi
    1305: 'T_IconRoleHead256_25_UI1305.webp',    // Xiangliyao
    1402: 'T_IconRoleHead256_1_UI1402.webp',     // Yangyang
    1403: 'T_IconRoleHead256_12_UI1403.webp',    // Aalto
    1404: 'T_IconRoleHead256_11_UI1404.webp',    // Jiyan
    1405: 'T_IconRoleHead256_23_UI1405.webp',    // Jianxin
    1407: 'T_IconRoleHead256_37_UI1407.webp',    // Ciaccona
    1409: 'T_IconRoleHead256_40_UI1409.webp',    // Cartethyia
    1503: 'T_IconRoleHead256_3_UI1503.webp',     // Verina
    1504: 'T_IconRoleHead256_30_UI1504.webp',    // Lumi
    1505: 'T_IconRoleHead256_28_UI1505.webp',    // Shorekeeper
    1506: 'T_IconRoleHead256_45_UI1506.webp',    // Phoebe
    1507: 'T_IconRoleHead256_38_UI1507.webp',    // Zani
    1602: 'T_IconRoleHead256_10_UI1602.webp',    // Danjin
    1603: 'T_IconRoleHead256_29_UI1603.webp',    // Camellya
    1606: 'T_IconRoleHead256_33_UI1606.webp',    // Roccia
    1607: 'T_IconRoleHead256_34_UI1607.webp',    // Cantarella
    1608: 'T_IconRoleHead256_41_UI1608.webp',    // Phrolova
    'zaira': 'T_IconRoleHead256_5_UIF1502.webp'  // Zaira (Main Character)
  };
  
  // Initialize the mapping object properly
  if (!mapping.characterIcons) {
    mapping.characterIcons = {};
  }
  
  // Create the ID to filename mapping
  mapping.characterIcons.idToFile = {};
  for (const [charId, filename] of Object.entries(characterIconMap)) {
    // Handle both numeric IDs and special string keys like "zaira"
    const key = isNaN(parseInt(charId, 10)) ? charId : parseInt(charId, 10);
    mapping.characterIcons.idToFile[key] = filename;
  }
  
  console.log('[WuWa] Hardcoded CharacterIcons mapping created with', Object.keys(characterIconMap).length, 'entries');
  console.log('[WuWa] Available mappings:', Object.keys(mapping.characterIcons.idToFile));
}

async function tryLoadMappingFromDataFolder() {
  // Attempt to fetch mapping JSONs from ./data/ (same directory as index.html)
  // Works only when served via http(s), not when opened as file:// in most browsers
  const files = [
    ['characters', 'characters.json'],
    ['weapons', 'weapons.json'],
    ['echoes', 'echoes.json'],
    ['sonataName', 'sonataName.json'],
    ['items', 'items.json'],
    ['echoStats', 'echoStats.json'],
  ];
  try {
    const results = await Promise.all(files.map(([key, f]) => fetch(`./data/${f}`).then(r => r.ok ? r.json() : null).catch(() => null)));
    let any = false;
    files.forEach(([key], i) => {
      const data = results[i];
      if (data) {
        mapping.raw[key] = data;
        any = true;
      }
    });

    // Always create the hardcoded character icon mapping first
    createHardcodedCharacterIconMapping();

    // Try optional character icons manifest (two possible paths)
    const iconManifests = [
      './data/Images/CharacterIcons/manifest.json',
      './data/CharacterIconsManifest.json'
    ];
    for (const p of iconManifests) {
      try {
        const resp = await fetch(p);
        if (resp && resp.ok) {
          const j = await resp.json();
          mapping.raw.characterIcons = j;
          break;
        }
      } catch { /* ignore */ }
    }
    // Fallback: scrape directory listing to build file list when served via python http.server
    if (!mapping.raw.characterIcons) {
      try {
        const dirResp = await fetch('./data/Images/CharacterIcons/');
        if (dirResp && dirResp.ok) {
          const html = await dirResp.text();
          const files = Array.from(html.matchAll(/href=\"([^\"]+\.webp)\"/gi)).map(m => decodeURIComponent(m[1]));
          if (files.length) {
            // normalize to basenames
            mapping.raw.characterIcons = { files: files.map(f => f.split(/[\\\/]*/).pop()) };
          }
        }
      } catch { /* ignore */ }
    }
    if (mapping.raw.characterIcons) any = true;
    if (any) {
      buildIdMapsFromRaw();
      mapping.loaded = true;
      mapEls.banner.classList.add('hidden');
    } else {
      mapEls.banner.classList.remove('hidden');
    }
  } catch {
    // Even if data loading fails, ensure we have the hardcoded character icons
    createHardcodedCharacterIconMapping();
    mapEls.banner.classList.remove('hidden');
  }
}

function setupMappingActions() {
  if (!mapEls.banner) return;
  mapEls.loadBtn.addEventListener('click', () => mapEls.input.click());
  mapEls.input.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const entries = await Promise.all(files.map(f => f.text().then(t => ({ name: f.name.toLowerCase(), json: JSON.parse(t) })).catch(() => null)));
    for (const ent of entries) {
      if (!ent) continue;
      const n = ent.name;
      if (n.includes('achievements')) mapping.raw.achievements = ent.json; // unused
      else if (n.includes('characters')) mapping.raw.characters = ent.json;
      else if (n.includes('weapons')) mapping.raw.weapons = ent.json;
      else if (n.includes('echostats')) mapping.echoStats = ent.json;
      else if (n.includes('echoes')) mapping.raw.echoes = ent.json;
      else if (n.includes('sonataname')) mapping.raw.sonataName = ent.json;
      else if (n.includes('iteminfo')) mapping.raw.itemInfo = ent.json;
      else if (n.includes('items') || n.includes('resource') || n.includes('dev')) mapping.raw.items = ent.json;
      else if (n.includes('charactericons') || n.includes('icons')) mapping.raw.characterIcons = ent.json;
    }
    buildIdMapsFromRaw();
    mapping.loaded = true;
    mapEls.banner.classList.add('hidden');
    renderAll();
    mapEls.input.value = '';
  });
}

(async function init(){
  await tryLoadMappingFromDataFolder();
  setupDnD();
  setupActions();
  setupMappingActions();
  wireSearch();
  renderAll();
})();
