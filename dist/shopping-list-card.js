/* Shopping List Card
 * A Home Assistant Lovelace card for any to-do list (built for Bring!), drawn to sit
 * beside the Daylight Calendar Card: transparent, dark item cards with a colour bar.
 * Licensed under MIT. See LICENSE.
 */

const CARD_TYPE = 'shopping-list-card';
const EDITOR_TYPE = 'shopping-list-card-editor';
const CARD_VERSION = '0.1.0';
const UNDO_MS = 2000;
const LONG_PRESS_MS = 500;
// Lets the helpers be imported by the Node tests, where there is no DOM.
const ElementBase = typeof HTMLElement === 'undefined' ? class {} : HTMLElement;

const UNITS = [
  'kg', 'g', 'gr', 'mg', 'l', 'lt', 'ml', 'cl', 'dl', 'un', 'und', 'unid', 'x',
  'pct', 'pcte', 'pacote', 'pacotes', 'lata', 'latas', 'garrafa', 'garrafas',
  'caixa', 'caixas', 'duzia', 'dúzia', 'pack', 'packs', 'pc', 'pcs'
];

const STRINGS = {
  en: {
    items_one: '{n} item',
    items_other: '{n} items',
    empty: 'Nothing to buy',
    add_placeholder: 'Add item (e.g. 2 kg rice)',
    add: 'Add',
    bought: '{name} bought',
    undo: 'Undo',
    edit_title: 'Edit item',
    name: 'Name',
    quantity: 'Quantity',
    save: 'Save',
    delete: 'Delete',
    cancel: 'Cancel',
    shopping: 'Going shopping',
    shopping_confirm: 'Tell the family in Bring! that you are going shopping?',
    shopping_send: 'Notify',
    shopping_sent: 'Family notified',
    missing_entity: 'Set a to-do entity (todo.*)',
    unavailable: 'List unavailable'
  },
  pt: {
    items_one: '{n} item',
    items_other: '{n} itens',
    empty: 'Nada para comprar',
    add_placeholder: 'Adicionar item (ex.: 2 kg arroz)',
    add: 'Adicionar',
    bought: '{name} comprado',
    undo: 'Desfazer',
    edit_title: 'Editar item',
    name: 'Nome',
    quantity: 'Quantidade',
    save: 'Salvar',
    delete: 'Apagar',
    cancel: 'Cancelar',
    shopping: 'Vou às compras',
    shopping_confirm: 'Avisar a família no Bring! que você vai às compras?',
    shopping_send: 'Avisar',
    shopping_sent: 'Família avisada',
    missing_entity: 'Defina uma entidade de lista (todo.*)',
    unavailable: 'Lista indisponível'
  }
};

export function resolveLanguage(hass) {
  const raw = String(hass?.locale?.language || hass?.language || 'en').toLowerCase();
  return raw.startsWith('pt') ? 'pt' : 'en';
}

export function t(lang, key, vars = {}) {
  const table = STRINGS[lang] || STRINGS.en;
  const template = table[key] ?? STRINGS.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => (vars[name] ?? ''));
}

export function countLabel(lang, n) {
  return t(lang, n === 1 ? 'items_one' : 'items_other', { n });
}

const QTY = `(\\d+(?:[.,]\\d+)?)\\s*(${UNITS.join('|')})?\\.?`;
const LEADING_QTY = new RegExp(`^${QTY}\\s+(.+)$`, 'i');
const TRAILING_QTY = new RegExp(`^(.+?)\\s+${QTY}$`, 'i');

function formatQuantity(amount, unit) {
  return unit ? `${amount} ${unit.toLowerCase()}` : amount;
}

// "2 kg arroz", "arroz, 2 kg" and "arroz 2kg" all become { name: 'arroz', quantity: '2 kg' }.
export function parseItemInput(input) {
  const text = String(input || '').trim().replace(/\s+/g, ' ');
  if (!text) return null;

  const comma = text.lastIndexOf(',');
  const isDecimalComma = /\d/.test(text[comma - 1] || '') && /\d/.test(text[comma + 1] || '');
  if (comma > 0 && !isDecimalComma) {
    const name = text.slice(0, comma).trim();
    const quantity = text.slice(comma + 1).trim();
    if (name && quantity && /\d/.test(quantity)) return { name, quantity };
  }

  const leading = text.match(LEADING_QTY);
  if (leading) return { name: leading[3].trim(), quantity: formatQuantity(leading[1], leading[2]) };

  const trailing = text.match(TRAILING_QTY);
  if (trailing && trailing[3]) {
    return { name: trailing[1].trim(), quantity: formatQuantity(trailing[2], trailing[3]) };
  }

  return { name: text, quantity: '' };
}

export function visibleItems(items, pendingUids = new Set()) {
  return (items || [])
    .filter((item) => item && item.status !== 'completed' && !pendingUids.has(item.uid))
    .slice()
    .sort((a, b) => String(a.summary || '').localeCompare(String(b.summary || ''), undefined, { sensitivity: 'base' }));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const STYLES = `
  :host { display: block; }
  ha-card {
    background: none;
    box-shadow: none;
    border: none;
    color: var(--primary-text-color);
    padding: 0;
  }
  .header { display: flex; align-items: center; gap: 10px; padding: 4px 2px 12px; }
  .title { font-size: 16px; font-weight: 500; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .count { font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; }
  .icon-button {
    border: none; cursor: pointer; border-radius: 10px; width: 36px; height: 36px;
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--slc-control-background, rgba(127, 127, 127, 0.16));
    color: var(--primary-text-color);
    --mdc-icon-size: 20px;
  }
  .icon-button:hover { background: rgba(127, 127, 127, 0.26); }
  .add-row { display: flex; gap: 8px; margin-bottom: 10px; }
  .add-row input, .dialog input {
    flex: 1; min-width: 0; font: inherit; font-size: 14px;
    color: var(--primary-text-color);
    background: var(--slc-item-background, rgba(127, 127, 127, 0.16));
    border: 1px solid transparent; border-radius: 8px; padding: 10px 12px; outline: none;
  }
  .add-row input:focus, .dialog input:focus { border-color: var(--slc-accent); }
  .list { display: flex; flex-direction: column; gap: 8px; }
  .item {
    position: relative; display: flex; align-items: center; gap: 12px;
    padding: 11px 12px 11px 16px; border-radius: 8px; cursor: pointer;
    background: var(--slc-item-background, rgba(127, 127, 127, 0.16));
    user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
    transition: opacity 0.2s ease, transform 0.1s ease;
  }
  .item::before {
    content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
    border-radius: 8px 0 0 8px; background: var(--slc-accent);
  }
  .item:active { transform: scale(0.99); }
  .check {
    flex: 0 0 auto; width: 18px; height: 18px; border-radius: 50%;
    border: 2px solid var(--slc-accent); box-sizing: border-box;
  }
  .text { flex: 1; min-width: 0; }
  .name { font-size: 14px; font-weight: 500; line-height: 1.3; overflow-wrap: anywhere; }
  .quantity { font-size: 12px; color: var(--secondary-text-color); margin-top: 2px; }
  .empty { padding: 18px 4px; color: var(--secondary-text-color); font-size: 14px; text-align: center; }
  .toast {
    display: flex; align-items: center; gap: 12px; margin-top: 10px; padding: 10px 12px;
    border-radius: 8px; font-size: 13px; background: rgba(127, 127, 127, 0.22);
  }
  .toast span { flex: 1; text-decoration: line-through; color: var(--secondary-text-color); }
  .toast.plain span { text-decoration: none; }
  .text-button {
    border: none; background: none; cursor: pointer; font: inherit; font-weight: 600;
    color: var(--slc-accent); padding: 4px 6px;
  }
  .overlay {
    position: fixed; inset: 0; z-index: 9; background: rgba(0, 0, 0, 0.55);
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .dialog {
    width: 100%; max-width: 360px; border-radius: 14px; padding: 18px;
    background: var(--card-background-color, #1c1f24); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    display: flex; flex-direction: column; gap: 12px;
  }
  .dialog h3 { margin: 0; font-size: 16px; font-weight: 500; }
  .dialog p { margin: 0; font-size: 14px; color: var(--secondary-text-color); }
  .dialog label { font-size: 12px; color: var(--secondary-text-color); display: flex; flex-direction: column; gap: 6px; }
  .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }
  .actions .danger { color: var(--error-color, #f44336); margin-right: auto; }
  .warning { padding: 12px; color: var(--warning-color, #ffa600); font-size: 14px; }
`;

class ShoppingListCard extends ElementBase {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._items = [];
    this._pending = new Map();
    this._adding = false;
    this._dialog = null;
    this._toast = null;
    this._unsubscribe = null;
    this._subscribedTo = null;
  }

  static getConfigElement() {
    return document.createElement(EDITOR_TYPE);
  }

  static getStubConfig(hass) {
    const entity = Object.keys(hass?.states || {}).find((id) => id.startsWith('todo.')) || '';
    return { entity };
  }

  setConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('Invalid configuration');
    this._config = { show_shopping_button: true, ...config };
    this._resubscribe();
    this._render();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first || this._subscribedTo !== this._config?.entity) this._resubscribe();
    if (!this._dialog && !this._adding) this._render();
  }

  connectedCallback() {
    this._resubscribe();
  }

  disconnectedCallback() {
    this._unsubscribeItems();
    this._pending.forEach(({ timer }) => clearTimeout(timer));
    this._pending.clear();
  }

  getCardSize() {
    return 2 + Math.min(this._items.length, 8);
  }

  getGridOptions() {
    return { columns: 12, rows: 'auto', min_columns: 4 };
  }

  get _lang() {
    return resolveLanguage(this._hass);
  }

  get _entityId() {
    return this._config?.entity;
  }

  get _isBring() {
    return this._hass?.entities?.[this._entityId]?.platform === 'bring';
  }

  _unsubscribeItems() {
    if (this._unsubscribe) {
      Promise.resolve(this._unsubscribe).then((unsub) => typeof unsub === 'function' && unsub()).catch(() => {});
    }
    this._unsubscribe = null;
    this._subscribedTo = null;
  }

  _resubscribe() {
    const entityId = this._entityId;
    if (!this._hass?.connection || !entityId || !this.isConnected) return;
    if (this._subscribedTo === entityId && this._unsubscribe) return;
    this._unsubscribeItems();
    this._subscribedTo = entityId;
    this._unsubscribe = this._hass.connection.subscribeMessage((message) => {
      this._items = message?.items || [];
      if (!this._dialog && !this._adding) this._render();
      else this._renderList();
    }, { type: 'todo/item/subscribe', entity_id: entityId }).catch(() => {
      this._subscribedTo = null;
      this._items = [];
      this._render();
    });
  }

  _callTodo(service, data) {
    return this._hass.callService('todo', service, data, { entity_id: this._entityId });
  }

  _addItem(text) {
    const parsed = parseItemInput(text);
    if (!parsed) return;
    const data = { item: parsed.name };
    if (parsed.quantity) data.description = parsed.quantity;
    this._callTodo('add_item', data);
  }

  _markBought(item) {
    if (this._pending.has(item.uid)) return;
    const timer = setTimeout(() => {
      this._pending.delete(item.uid);
      this._callTodo('update_item', { item: item.uid, status: 'completed' });
      if (this._toast?.uid === item.uid) this._toast = null;
      this._renderList();
    }, UNDO_MS);
    this._pending.set(item.uid, { timer, item });
    this._toast = { uid: item.uid, text: t(this._lang, 'bought', { name: item.summary }), undo: true };
    this._renderList();
  }

  _undo(uid) {
    const pending = this._pending.get(uid);
    if (pending) clearTimeout(pending.timer);
    this._pending.delete(uid);
    this._toast = null;
    this._renderList();
  }

  _openEdit(item) {
    this._dialog = { type: 'edit', item };
    this._render();
    this.shadowRoot.querySelector('input[name="name"]')?.focus();
  }

  _saveEdit(name, quantity) {
    const item = this._dialog?.item;
    this._closeDialog();
    const rename = String(name || '').trim();
    if (!item || !rename) return;
    this._callTodo('update_item', { item: item.uid, rename, description: String(quantity || '').trim() });
  }

  _deleteItem() {
    const item = this._dialog?.item;
    this._closeDialog();
    if (item) this._callTodo('remove_item', { item: [item.uid] });
  }

  _sendShopping() {
    this._closeDialog();
    this._hass.callService('bring', 'send_message', { message: 'going_shopping' }, { entity_id: this._entityId });
    this._toast = { uid: null, text: t(this._lang, 'shopping_sent'), undo: false };
    this._renderList();
    setTimeout(() => {
      if (this._toast && !this._toast.uid) {
        this._toast = null;
        this._renderList();
      }
    }, 3000);
  }

  _closeDialog() {
    this._dialog = null;
    this._render();
  }

  _render() {
    if (!this._config) return;
    const lang = this._lang;
    const accent = this._config.color || 'var(--primary-color)';
    const entityId = this._entityId;
    const stateObj = this._hass?.states?.[entityId];
    let body;

    if (!entityId || !entityId.startsWith('todo.')) {
      body = `<div class="warning">${escapeHtml(t(lang, 'missing_entity'))}</div>`;
    } else if (this._hass && (!stateObj || stateObj.state === 'unavailable')) {
      body = `<div class="warning">${escapeHtml(t(lang, 'unavailable'))}</div>`;
    } else {
      const title = this._config.title ?? stateObj?.attributes?.friendly_name ?? '';
      const showShopping = this._config.show_shopping_button !== false && this._isBring;
      body = `
        <div class="header">
          ${title ? `<div class="title">${escapeHtml(title)}</div>` : '<div class="title"></div>'}
          <div class="count"></div>
          ${showShopping ? `<button class="icon-button" data-action="shopping" title="${escapeHtml(t(lang, 'shopping'))}"><ha-icon icon="mdi:cart-arrow-right"></ha-icon></button>` : ''}
          <button class="icon-button" data-action="toggle-add" title="${escapeHtml(t(lang, 'add'))}"><ha-icon icon="${this._adding ? 'mdi:close' : 'mdi:plus'}"></ha-icon></button>
        </div>
        ${this._adding ? `
          <form class="add-row">
            <input name="item" autocomplete="off" enterkeyhint="done" placeholder="${escapeHtml(t(lang, 'add_placeholder'))}">
          </form>` : ''}
        <div class="list"></div>
        <div class="toast-slot"></div>
        ${this._renderDialog(lang)}`;
    }

    this.shadowRoot.innerHTML = `<style>${STYLES}</style><ha-card style="--slc-accent: ${escapeHtml(accent)}">${body}</ha-card>`;
    this._bind();
    this._renderList();
  }

  _renderDialog(lang) {
    if (!this._dialog) return '';
    if (this._dialog.type === 'shopping') {
      return `
        <div class="overlay" data-action="close">
          <div class="dialog" role="dialog">
            <h3>${escapeHtml(t(lang, 'shopping'))}</h3>
            <p>${escapeHtml(t(lang, 'shopping_confirm'))}</p>
            <div class="actions">
              <button class="text-button" data-action="close">${escapeHtml(t(lang, 'cancel'))}</button>
              <button class="text-button" data-action="send-shopping">${escapeHtml(t(lang, 'shopping_send'))}</button>
            </div>
          </div>
        </div>`;
    }
    const item = this._dialog.item;
    return `
      <div class="overlay" data-action="close">
        <form class="dialog" role="dialog">
          <h3>${escapeHtml(t(lang, 'edit_title'))}</h3>
          <label>${escapeHtml(t(lang, 'name'))}<input name="name" autocomplete="off" value="${escapeHtml(item.summary)}"></label>
          <label>${escapeHtml(t(lang, 'quantity'))}<input name="quantity" autocomplete="off" value="${escapeHtml(item.description || '')}"></label>
          <div class="actions">
            <button type="button" class="text-button danger" data-action="delete">${escapeHtml(t(lang, 'delete'))}</button>
            <button type="button" class="text-button" data-action="close">${escapeHtml(t(lang, 'cancel'))}</button>
            <button type="submit" class="text-button">${escapeHtml(t(lang, 'save'))}</button>
          </div>
        </form>
      </div>`;
  }

  _renderList() {
    const root = this.shadowRoot;
    const list = root?.querySelector('.list');
    if (!list) return;
    const lang = this._lang;
    const items = visibleItems(this._items, new Set(this._pending.keys()));
    const count = root.querySelector('.count');
    if (count) count.textContent = items.length ? countLabel(lang, items.length) : '';

    list.innerHTML = items.length
      ? items.map((item) => `
          <div class="item" data-uid="${escapeHtml(item.uid)}">
            <span class="check"></span>
            <div class="text">
              <div class="name">${escapeHtml(item.summary)}</div>
              ${item.description ? `<div class="quantity">${escapeHtml(item.description)}</div>` : ''}
            </div>
          </div>`).join('')
      : `<div class="empty">${escapeHtml(t(lang, 'empty'))}</div>`;

    list.querySelectorAll('.item').forEach((element) => this._bindItem(element));

    const slot = root.querySelector('.toast-slot');
    if (slot) {
      slot.innerHTML = this._toast
        ? `<div class="toast ${this._toast.undo ? '' : 'plain'}"><span>${escapeHtml(this._toast.text)}</span>${this._toast.undo ? `<button class="text-button" data-undo="${escapeHtml(this._toast.uid)}">${escapeHtml(t(lang, 'undo'))}</button>` : ''}</div>`
        : '';
      slot.querySelector('[data-undo]')?.addEventListener('click', (event) => this._undo(event.currentTarget.dataset.undo));
    }
  }

  _bindItem(element) {
    const uid = element.dataset.uid;
    let timer = null;
    let longPressed = false;
    const findItem = () => this._items.find((item) => item.uid === uid);
    const cancel = () => {
      clearTimeout(timer);
      timer = null;
    };

    element.addEventListener('pointerdown', () => {
      longPressed = false;
      timer = setTimeout(() => {
        longPressed = true;
        const item = findItem();
        if (item) this._openEdit(item);
      }, LONG_PRESS_MS);
    });
    element.addEventListener('pointerup', cancel);
    element.addEventListener('pointerleave', cancel);
    element.addEventListener('pointercancel', cancel);
    element.addEventListener('contextmenu', (event) => event.preventDefault());
    element.addEventListener('click', () => {
      if (longPressed) return;
      const item = findItem();
      if (item) this._markBought(item);
    });
  }

  _bind() {
    const root = this.shadowRoot;
    root.querySelector('[data-action="toggle-add"]')?.addEventListener('click', () => {
      this._adding = !this._adding;
      this._render();
      if (this._adding) root.querySelector('.add-row input')?.focus();
    });
    root.querySelector('[data-action="shopping"]')?.addEventListener('click', () => {
      this._dialog = { type: 'shopping' };
      this._render();
    });

    const addForm = root.querySelector('.add-row');
    addForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = addForm.querySelector('input');
      this._addItem(input.value);
      input.value = '';
      input.focus();
    });
    addForm?.querySelector('input')?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this._adding = false;
        this._render();
      }
    });

    const overlay = root.querySelector('.overlay');
    if (!overlay) return;
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) this._closeDialog();
    });
    overlay.querySelectorAll('[data-action="close"]').forEach((button) => {
      if (button !== overlay) button.addEventListener('click', () => this._closeDialog());
    });
    overlay.querySelector('[data-action="send-shopping"]')?.addEventListener('click', () => this._sendShopping());
    overlay.querySelector('[data-action="delete"]')?.addEventListener('click', () => this._deleteItem());
    const editForm = overlay.querySelector('form.dialog');
    editForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      this._saveEdit(editForm.elements.name.value, editForm.elements.quantity.value);
    });
  }
}

class ShoppingListCardEditor extends ElementBase {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
    else this._render();
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = (schema) => ({
        entity: 'To-do list',
        title: 'Title',
        color: 'Accent colour',
        show_shopping_button: 'Show "Going shopping" button (Bring! lists)'
      }[schema.name] || schema.name);
      this._form.addEventListener('value-changed', (event) => {
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: event.detail.value }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = { show_shopping_button: true, ...this._config };
    this._form.schema = [
      { name: 'entity', required: true, selector: { entity: { domain: 'todo' } } },
      { name: 'title', selector: { text: {} } },
      { name: 'color', selector: { text: {} } },
      { name: 'show_shopping_button', selector: { boolean: {} } }
    ];
  }
}

if (typeof customElements !== 'undefined') {
  if (!customElements.get(CARD_TYPE)) customElements.define(CARD_TYPE, ShoppingListCard);
  if (!customElements.get(EDITOR_TYPE)) customElements.define(EDITOR_TYPE, ShoppingListCardEditor);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((card) => card.type === CARD_TYPE)) {
    window.customCards.push({
      type: CARD_TYPE,
      name: 'Shopping List Card',
      description: 'A to-do list (built for Bring!) drawn as dark item cards with a colour bar.',
      documentationURL: 'https://github.com/lucasgiovanny/shopping-list-card',
      preview: true
    });
  }
  console.info(`%c SHOPPING-LIST-CARD %c ${CARD_VERSION} `, 'background:#42a5f5;color:#000;font-weight:700', 'background:#1c1f24;color:#fff');
}
