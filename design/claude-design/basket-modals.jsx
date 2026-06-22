/* Basket prototype — item detail + carry-over modals.
   Depends on basket-helpers.jsx atoms (E, itemMacros). Exports to window. */

const MAC_DEFS = [
  { k: "p", label: "Protein", c: "var(--rose-deep)", t: "rgba(180,92,124,.18)" },
  { k: "c", label: "Carbs",   c: "var(--amber)",     t: "rgba(230,162,60,.20)" },
  { k: "f", label: "Fat",     c: "var(--matcha-deep)", t: "rgba(124,201,110,.22)" },
];

/* macro breakdown — bars sized by each macro's kcal share. Editable in edit mode. */
function MacroList({ grams, editing, ev, onMacro }) {
  const g = editing ? { p: +ev.p || 0, c: +ev.c || 0, f: +ev.f || 0 } : grams;
  const kc = { p: g.p * 4, c: g.c * 4, f: g.f * 9 };
  const sum = Math.max(1, kc.p + kc.c + kc.f);
  return (
    <div className="id-macros">
      {MAC_DEFS.map(d => (
        <div className="id-macro" key={d.k}>
          <div className="id-macro-top">
            <span className="id-macro-l">{d.label}</span>
            {editing
              ? <span className="id-num-wrap"><input className="id-num sm" type="number" min="0" value={ev[d.k]}
                  onChange={e => onMacro(d.k, e.target.value)} onFocus={e => e.target.select()} /><small>g</small></span>
              : <span className="id-macro-v">{Math.round(g[d.k])}<small>g</small></span>}
          </div>
          <div className="id-macro-bar" style={{ background: d.t }}>
            <i style={{ width: (kc[d.k] / sum * 100) + "%", background: d.c }}></i>
          </div>
        </div>
      ))}
    </div>
  );
}

const SRC_LABELS = { barcode: "Scanned", receipt: "Receipt", manual: "Manual", carry: "Carried over" };

/* ============ ITEM DETAIL ============ */
/* Generic over kind: "item" (basket), "extra", "pantry". Values are tap-to-type. */
function ItemDetail({ kind, item, days, dateLabel, onEdit, onRemove, onClose }) {
  kind = kind || "item";
  const [editing, setEditing] = React.useState(false);
  const stop = e => e.stopPropagation();

  const init = () => {
    if (kind === "extra") return { name: item.name || "", k: String(item.kcal || 0) };
    if (kind === "pantry") return { per100: String(item.per100 || 0), dailyG: String(item.dailyG || 0) };
    const g = itemMacros(item);
    return { w: String(item.w || 0), k: String(item.k || 0), p: String(Math.round(g.p)), c: String(Math.round(g.c)), f: String(Math.round(g.f)) };
  };
  const [ev, setEv] = React.useState(init);
  const [confirmDel, setConfirmDel] = React.useState(false);
  const set = (key, val) => setEv(s => ({ ...s, [key]: val }));
  const startEdit = () => { setConfirmDel(false); setEv(init()); setEditing(true); };
  const cancel = () => setEditing(false);

  const emoji = item.e || (kind === "extra" ? "🍴" : "🥫");
  const name = kind === "extra" ? item.name : item.n;
  const tag = kind === "item" ? (SRC_LABELS[item.src] || "Manual") : kind === "extra" ? "Extra meal" : "Pantry staple";
  const calsEditable = kind !== "pantry";

  // resolve current calories per kind
  let cals, curW, pantryDay;
  if (kind === "extra") {
    cals = editing ? Math.round(+ev.k || 0) : (item.kcal || 0);
  } else if (kind === "pantry") {
    pantryDay = editing ? (+ev.dailyG || 0) : (item.dailyG || 0);
    const per = editing ? (+ev.per100 || 0) : (item.per100 || 0);
    cals = Math.round(pantryDay * (days || 0) * per / 100);
  } else {
    cals = editing ? Math.round(+ev.k || 0) : (item.k || 0);
    curW = editing ? (+ev.w || 0) : (item.w || 0);
  }

  const mg = kind === "item"
    ? (editing ? { p: +ev.p || 0, c: +ev.c || 0, f: +ev.f || 0 } : itemMacros(item))
    : itemMacros({ k: cals });

  function save() {
    if (kind === "extra") {
      onEdit(item.id, { name: (ev.name || "").trim() || name, kcal: Math.max(0, Math.round(+ev.k || 0)) });
    } else if (kind === "pantry") {
      onEdit(item.id, { per100: Math.max(0, Math.round(+ev.per100 || 0)), dailyG: Math.max(0, Math.round(+ev.dailyG || 0)) });
    } else {
      const w = Math.max(0, Math.round(+ev.w || 0));
      const np = +ev.p || 0, nc = +ev.c || 0, nf = +ev.f || 0;
      onEdit(item.id, { w, k: Math.max(0, Math.round(+ev.k || 0)), m: w > 0 ? { p: np / w * 100, c: nc / w * 100, f: nf / w * 100 } : item.m });
    }
    setEditing(false);
  }

  const removeLabel = kind === "extra" ? "Delete this extra" : kind === "pantry" ? "Remove staple" : "Remove from basket";

  return (
    <div className="scrim" onClick={onClose}><div className="sheet id-sheet" onClick={stop}>
      <div className="grab"></div>

      <div className="id-head">
        <span className="id-av"><E>{emoji}</E></span>
        <div className="id-head-tx">
          {kind === "extra" && editing
            ? <input className="id-num name" value={ev.name} onChange={e => set("name", e.target.value)} placeholder="Name" />
            : <h2 style={{ margin: 0 }}>{name}</h2>}
          <span className="id-tag">{tag}</span>
        </div>
        <div className="id-kc">
          {calsEditable && editing
            ? <input className="id-num kc" type="number" min="0" value={ev.k} onChange={e => set("k", e.target.value)} onFocus={e => e.target.select()} />
            : cals.toLocaleString()}
          <small>KCAL</small>
        </div>
      </div>

      {kind === "item" && (
        <div className="id-stats">
          <div className="id-stat">
            {editing
              ? <span className="id-stat-v"><input className="id-num mid" type="number" min="0" value={ev.w} onChange={e => set("w", e.target.value)} onFocus={e => e.target.select()} /><small>g</small></span>
              : <span className="id-stat-v">{(item.w || 0).toLocaleString()}<small>g</small></span>}
            <span className="id-stat-l">bought</span>
          </div>
          <div className="id-stat">
            <span className="id-stat-v">{days ? Math.round(cals / days).toLocaleString() : cals.toLocaleString()}</span>
            <span className="id-stat-l">kcal / day</span>
          </div>
          <div className="id-stat">
            <span className="id-stat-v">{curW ? Math.round(cals / curW * 100) : 0}</span>
            <span className="id-stat-l">kcal / 100g</span>
          </div>
        </div>
      )}

      {kind === "pantry" && (
        <div className="id-stats">
          <div className="id-stat">
            {editing
              ? <span className="id-stat-v"><input className="id-num mid" type="number" min="0" value={ev.per100} onChange={e => set("per100", e.target.value)} onFocus={e => e.target.select()} /></span>
              : <span className="id-stat-v">{item.per100}</span>}
            <span className="id-stat-l">kcal / 100g</span>
          </div>
          <div className="id-stat">
            {editing
              ? <span className="id-stat-v"><input className="id-num mid" type="number" min="0" value={ev.dailyG} onChange={e => set("dailyG", e.target.value)} onFocus={e => e.target.select()} /><small>g</small></span>
              : <span className="id-stat-v">{item.dailyG}<small>g</small></span>}
            <span className="id-stat-l">per day</span>
          </div>
          <div className="id-stat">
            <span className="id-stat-v">{(pantryDay * (days || 0)).toLocaleString()}<small>g</small></span>
            <span className="id-stat-l">over {days} days</span>
          </div>
        </div>
      )}

      {kind === "extra" && dateLabel && <div className="id-when">Logged {dateLabel}</div>}

      <div className="id-seclbl">Macros{kind !== "item" ? " · estimated" : (editing ? " · tap to edit" : "")}</div>
      <MacroList grams={mg} editing={editing && kind === "item"} ev={ev} onMacro={(k, v) => set(k, v)} />

      {editing ? (
        <React.Fragment>
          <div className="id-edit-foot">Tap any value above to type a new amount.</div>
          <div className="frow" style={{ gap: 9, marginTop: 4 }}>
            <button className="btn ghost" style={{ flex: "0 0 auto", width: 96 }} onClick={cancel}>Cancel</button>
            <button className="btn" style={{ flex: 1, marginTop: 0 }} onClick={save}>Save</button>
          </div>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <button className="btn" onClick={startEdit}>
            <span style={{ marginRight: 7 }}><E>✏️</E></span>Edit
          </button>
          {!confirmDel
            ? <button className="btn ghost id-del" onClick={() => setConfirmDel(true)}>{removeLabel}</button>
            : (
              <div className="id-confirm">
                <div className="id-confirm-t">Delete {name}?</div>
                <div className="id-confirm-s">This can’t be undone.</div>
                <div className="frow" style={{ gap: 9 }}>
                  <button className="btn ghost" style={{ flex: "0 0 auto", width: 96, marginTop: 0 }} onClick={() => setConfirmDel(false)}>Cancel</button>
                  <button className="btn id-danger" style={{ flex: 1, marginTop: 0 }} onClick={() => onRemove(item.id)}>Delete</button>
                </div>
              </div>
            )}
        </React.Fragment>
      )}
    </div></div>
  );
}

/* ============ CARRY-OVER ============ */
function CarryRow({ item, pick, onToggle, onLeft }) {
  const on = pick.on;
  const left = pick.left;
  const frac = item.w ? left / item.w : 0;
  const leftK = Math.round((item.k || 0) * frac);
  return (
    <div className={"co-row" + (on ? " on" : "")}>
      <button className="co-main" onClick={() => onToggle(!on)}>
        <span className="co-av"><E>{item.e}</E></span>
        <span className="co-tx">
          <span className="co-nm">{item.n}</span>
          <span className="co-meta">{item.w} g bought · {(item.k || 0).toLocaleString()} kcal</span>
        </span>
        <span className={"co-check" + (on ? " on" : "")}>{on ? "✓" : ""}</span>
      </button>
      {on && (
        <div className="co-slider" onClick={e => e.stopPropagation()}>
          <div className="co-slider-top">
            <span className="co-slider-l">Amount left to carry</span>
            <span className="co-slider-v">{Math.round(left)} g · {leftK.toLocaleString()} kcal</span>
          </div>
          <input className="bp-len-rng" type="range" min="0" max={item.w || 0} step="5"
            value={left} onChange={e => onLeft(+e.target.value)}
            style={{ "--p": (item.w ? left / item.w * 100 : 0) + "%" }} />
        </div>
      )}
    </div>
  );
}

function CarryOverSheet({ source, date, onConfirm, onSkip, onClose }) {
  const items = source.items;
  // default: every item UNTICKED; slider pre-set to full remaining for when it is ticked
  const [picks, setPicks] = React.useState(() => {
    const o = {};
    items.forEach(it => { o[it.id] = { on: false, left: it.w || 0 }; });
    return o;
  });
  const stop = e => e.stopPropagation();
  const allOn = items.length > 0 && items.every(it => picks[it.id].on);

  function toggle(id, on) { setPicks(p => ({ ...p, [id]: { ...p[id], on } })); }
  function setLeft(id, left) { setPicks(p => ({ ...p, [id]: { ...p[id], left } })); }
  function toggleAll() { setPicks(p => { const o = {}; items.forEach(it => o[it.id] = { ...p[it.id], on: !allOn }); return o; }); }

  const chosen = items.filter(it => picks[it.id].on);
  const carriedK = chosen.reduce((s, it) => {
    const frac = it.w ? picks[it.id].left / it.w : 0;
    return s + Math.round((it.k || 0) * frac);
  }, 0);

  function confirm() {
    const out = chosen.map(it => ({ item: it, left: picks[it.id].left }))
      .filter(p => p.left > 0);
    onConfirm(out);
  }

  return (
    <div className="scrim" onClick={onClose}><div className="sheet co-sheet" onClick={stop}>
      <div className="grab"></div>
      <h2>Carry over leftovers?</h2>
      <p className="desc">Anything left from your last prep can roll into this one. Tick what's left and set how much.</p>

      <div className="co-bar">
        <span className="co-bar-l">{chosen.length} of {items.length} selected</span>
        <button className="co-all" onClick={toggleAll}>{allOn ? "Clear all" : "Select all"}</button>
      </div>

      <div className="co-list">
        {items.map(it => (
          <CarryRow key={it.id} item={it} pick={picks[it.id]}
            onToggle={on => toggle(it.id, on)} onLeft={left => setLeft(it.id, left)} />
        ))}
      </div>

      <div className="co-sum">
        <span>Carrying over</span>
        <b>{chosen.length ? `${chosen.length} item${chosen.length === 1 ? "" : "s"} · ${carriedK.toLocaleString()} kcal` : "Nothing yet"}</b>
      </div>

      <button className="btn" onClick={confirm}>
        {chosen.length ? "Start prep with leftovers" : "Start fresh prep"}
      </button>
      <button className="btn ghost" onClick={onSkip}>Start empty — don't carry anything</button>
    </div></div>
  );
}

Object.assign(window, { ItemDetail, CarryOverSheet });
