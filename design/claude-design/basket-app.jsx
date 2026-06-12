/* Basket prototype — interactive app. Depends on basket-helpers.jsx atoms. */
const { useState, useRef, useEffect } = React;
const DAYW = 58;

/* ============ TIMELINE (calendar + gantt) ============ */
function Timeline({ cycles, extras, selId, onSelect, onAddExtra, onCreate, winStart, totalDays }) {
  const ref = useRef(null);
  useEffect(() => {
    const ti = daysBetween(winStart, TODAY);
    if (ref.current) ref.current.scrollLeft = Math.max(0, (ti - 2) * DAYW);
  }, []);
  const days = Array.from({ length: totalDays }, (_, i) => addDays(winStart, i));
  const extraSet = new Set(extras.map(x => x.date));
  const covered = new Set();
  cycles.forEach(c => { for (let d = 0; d <= daysBetween(c.start, c.end); d++) covered.add(addDays(c.start, d)); });

  return (
    <div className="tl" ref={ref}>
      <div className="tlinner" style={{ width: totalDays * DAYW + 36 }}>
        <div className="calrow">
          {days.map(date => {
            const { wd, dn } = fmtDay(date);
            const has = extraSet.has(date);
            const isToday = date === TODAY;
            return (
              <div className="day" key={date} style={{ width: DAYW }}>
                <button className={"addx" + (has ? " has" : "")} onClick={() => onAddExtra(date)}
                  title={has ? "Extra meal" : "Add extra meal"}>
                  {has ? <span className="dot"></span> : "+"}
                </button>
                <div className={"dcell" + (isToday ? " today" : "")}
                  onClick={() => { const c = cycles.find(c => date >= c.start && date <= c.end); if (c) onSelect(c.id); }}>
                  <span className="wd">{wd}</span><span className="dn">{dn}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="lane" style={{ width: totalDays * DAYW }}>
          {days.map((date, i) => covered.has(date) ? null : (
            <div className="slot" key={"s" + date} style={{ left: i * DAYW + 3, width: DAYW - 6 }}
              onClick={() => onCreate(date)}>+</div>
          ))}
          {cycles.map(c => {
            const left = daysBetween(winStart, c.start) * DAYW;
            const w = (daysBetween(c.start, c.end) + 1) * DAYW - 6;
            return (
              <div key={c.id} className={"bar" + (c.id === selId ? " sel" : "")}
                style={{ left: left + 3, width: w }} onClick={() => onSelect(c.id)}>
                <span className="bl">{c.items.length ? "Meal Prep" : "New shop"}</span>
                {c.items.length > 0 &&
                  <span className="chips">{c.items.slice(0, 3).map((it, k) => <span key={k}><E>{it.e}</E></span>)}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============ BUDGET BAR ============ */
function Budget({ meal, pan, ext, budget, macros, days }) {
  const consumed = meal + pan + ext;
  const left = Math.max(0, budget - consumed);
  const pct = v => Math.max(0, Math.min(100, (v / budget) * 100));
  return (
    <div className="budget">
      <div className="top">
        <span className="n"><b>{consumed.toLocaleString()}</b> / {budget.toLocaleString()} kcal</span>
        <span className="left">{left.toLocaleString()} left</span>
      </div>
      <div className="track">
        <i className="g" style={{ width: pct(meal) + "%" }}></i>
        <i className="o" style={{ width: pct(pan) + "%" }}></i>
        <i className="p" style={{ width: pct(ext) + "%" }}></i>
      </div>
      <div className="legend">
        <span><i style={{ background: "var(--matcha)" }}></i>Meal prep</span>
        <span><i style={{ background: "var(--amber)" }}></i>Pantry</span>
        <span><i style={{ background: "var(--rose)" }}></i>Extra</span>
      </div>
      <div className="budget-macros"><window.MacroBars kcal={consumed} days={days} macros={macros} /></div>
    </div>
  );
}

/* ============ PANEL (tabbed list) ============ */
function Panel({ tab, cycle, extras, pantry, dailyGoal, onRemove, onRemoveExtra, onRemovePantry, onGrams, onOpen, onSetDays, onOpenPantry }) {
  const days = cycleDays(cycle);
  let title, count, body;
  if (tab === "basket") {
    title = "This basket"; count = cycle.items.length;
    body = cycle.items.length ? cycle.items.map(it => (
      <div className="row" key={it.id}>
        <div className="av"><E>{it.e}</E></div>
        <div className="tx"><div className="nm">{it.n}</div><div className="mt">{it.w} g · {it.k.toLocaleString()} kcal</div></div>
        <div className="kc">{it.k.toLocaleString()}<small>KCAL</small></div>
        <button className="rm" onClick={() => onRemove(it.id)}>✕</button>
      </div>
    )) : (
      <div className="bk-plan">
        <Empty e="🧺" h="Plan this shop" p="Set how long this prep runs, then tap + to scan a receipt or add your food." />
        <window.LengthSlider cycle={cycle} dailyGoal={dailyGoal} onSetDays={onSetDays} />
      </div>
    );
  } else if (tab === "extras") {
    const list = extrasInRange(extras, cycle);
    title = "Extra meals"; count = list.length;
    body = list.length ? list.map(x => {
      const d = fmtDay(x.date);
      return (
        <div className="row" key={x.id}>
          <div className="av" style={{ background: "rgba(239,168,192,.30)" }}><E>🍴</E></div>
          <div className="tx"><div className="nm">{x.name}</div><div className="mt">{d.wd} {d.dn} {d.mo}</div></div>
          <div className="kc" style={{ color: "var(--rose-deep)" }}>{x.kcal}<small>KCAL</small></div>
          <button className="rm" onClick={() => onRemoveExtra(x.id)}>✕</button>
        </div>
      );
    }) : <Empty e="🍴" h="No extras logged" p="Eaten something outside your prep? Tap the pink + on any day to log it." />;
  } else {
    title = "Pantry staples"; count = pantry.length;
    body = pantry.length ? pantry.map(p => (
      <div className="row" key={p.id}>
        <div className="av"><E>{p.e}</E></div>
        <div className="tx"><div className="nm">{p.n}</div><div className="mt">{p.per100} kcal / 100g</div></div>
        <input className="gin" type="number" value={pantryGrams(p, cycle)}
          onChange={e => onGrams(p.id, parseInt(e.target.value, 10) || 0)} />
        <div className="kc">{pantryKcal(p, cycle).toLocaleString()}<small>KCAL</small></div>
        <button className="rm" onClick={() => onRemovePantry(p.id)}>✕</button>
      </div>
    )) : <Empty e="🫙" h="No staples yet" p="Add the basics you always cook with — they're spread across each prep automatically." />;
  }
  return (
    <div className="panel">
      <div className="ph">
        {tab !== "basket" && <h3>{title}</h3>}
        {tab === "basket" && <button className="bp-open" onClick={onOpen} style={{ marginLeft: "auto" }}>Open basket ›</button>}
        {tab === "extras" && <span className="cnt">{count} item{count === 1 ? "" : "s"}</span>}
        {tab === "pantry" && (
          <div className="ph-r">
            <span className="cnt">over {days} days</span>
            <button className="bp-open" onClick={onOpenPantry}>Manage ›</button>
          </div>
        )}
      </div>
      {Array.isArray(body)
        ? <div className="list">{body}</div>
        : <div className="list" style={{ display: "flex" }}>{body}</div>}
    </div>
  );
}
const Empty = ({ e, h, p }) => (
  <div className="empty"><div className="big"><E>{e}</E></div><h4>{h}</h4><p>{p}</p></div>
);

/* ============ NAVBAR ============ */
function Navbar({ tab, onTab, onFab, fabOpen }) {
  const tabs = ["basket", "extras", "pantry"];
  const i = tabs.indexOf(tab);
  return (
    <div className="navbar">
      <div className="seg">
        <div className="pillbg" style={{ left: `calc(5px + ${i} * (100% - 10px) / 3)`, width: "calc((100% - 10px) / 3)" }}></div>
        {tabs.map(t => (
          <button key={t} className={t === tab ? "on" : ""} onClick={() => onTab(t)}>
            {t === "basket" ? "Basket" : t === "extras" ? "Extras" : "Pantry"}
          </button>
        ))}
      </div>
      <button className={"navfab" + (fabOpen ? " open" : "")} onClick={onFab}>+</button>
    </div>
  );
}

/* ============ ADD SHEET ============ */
function AddSheet({ type, date, onClose, onAddFood, onAddExtra, onAddPantry, onScan }) {
  const [nm, setNm] = useState(""); const [g, setG] = useState(""); const [k, setK] = useState("");
  const [per, setPer] = useState(""); const [day, setDay] = useState("");
  const [q, setQ] = useState(""); const [custom, setCustom] = useState(false);
  const stop = e => e.stopPropagation();

  if (type === "food") {
    const query = q.trim().toLowerCase();
    const matches = query ? CATALOG.filter(f => f.n.toLowerCase().includes(query)) : CATALOG;
    const exact = CATALOG.some(f => f.n.toLowerCase() === query);
    const openCustom = () => { setNm(q.trim()); setCustom(true); };
    return (
    <div className="scrim" onClick={onClose}><div className="sheet" onClick={stop}>
      <div className="grab"></div>
      <h2>Add to basket</h2><p className="desc">Scan, search a staple, or enter it yourself.</p>

      <div className="frow">
        <button className="btn scan" style={{ flex: 1 }} onClick={() => onScan("barcode")}><E>📷</E> Scan barcode</button>
        <button className="btn scan" style={{ flex: 1, background: "var(--matcha-600)" }} onClick={() => onScan("receipt")}><E>🧾</E> Scan receipt</button>
      </div>

      <div className="srch" style={{ marginTop: 12 }}>
        <svg className="srch-i" width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.2" /><path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        <input value={q} onChange={e => { setQ(e.target.value); setCustom(false); }} placeholder="Search food or add your own…" autoFocus />
        {q && <button className="srch-x" onClick={() => { setQ(""); setCustom(false); }} aria-label="Clear">✕</button>}
      </div>

      {custom ? (
        <div className="cnew">
          <div className="cnew-h"><span className="av"><E>🛒</E></span><span className="cnew-nm">{nm || "New item"}</span></div>
          <div className="frow">
            <div className="field"><label>Weight (g)</label><input type="number" value={g} onChange={e => setG(e.target.value)} placeholder="500" autoFocus /></div>
            <div className="field"><label>Calories</label><input type="number" value={k} onChange={e => setK(e.target.value)} placeholder="320" /></div>
          </div>
          <div className="frow" style={{ gap: 9 }}>
            <button className="btn ghost" style={{ flex: "0 0 auto", width: 92 }} onClick={() => setCustom(false)}>Back</button>
            <button className="btn" style={{ flex: 1, marginTop: 0 }} disabled={!nm || !k} onClick={() => onAddFood({ e: "🛒", n: nm, w: +g || 0, k: +k || 0 })}>Add item</button>
          </div>
        </div>
      ) : (
        <React.Fragment>
          <div className="quick" style={{ marginTop: 14 }}>
            {matches.map((f, idx) => (
              <button className="qopt" key={idx} onClick={() => onAddFood({ ...f })}>
                <span className="av"><E>{f.e}</E></span>
                <span><span className="qn">{f.n}</span><span className="qm" style={{ display: "block" }}>{f.w} g · {f.k} kcal</span></span>
                <span className="add">+</span>
              </button>
            ))}
            {query && !exact && (
              <button className="qopt qnew" onClick={openCustom}>
                <span className="av"><E>✏️</E></span>
                <span><span className="qn">Add “{q.trim()}”</span><span className="qm" style={{ display: "block" }}>Enter weight &amp; calories yourself</span></span>
                <span className="add">+</span>
              </button>
            )}
            {!query && (
              <button className="qopt qnew" onClick={() => { setNm(""); setCustom(true); }}>
                <span className="av"><E>✏️</E></span>
                <span><span className="qn">Add manually</span><span className="qm" style={{ display: "block" }}>Something not in the list</span></span>
                <span className="add">+</span>
              </button>
            )}
          </div>
        </React.Fragment>
      )}
    </div></div>
  );
  }

  if (type === "extra") return (
    <div className="scrim" onClick={onClose}><div className="sheet" onClick={stop}>
      <div className="grab"></div>
      <h2>Log an extra</h2><p className="desc">{date ? `On ${fmtLong(date)}` : "A meal outside your prep."}</p>
      <div className="divlbl">Quick add</div>
      <div className="quick">
        {EXTRA_CATALOG.map((f, idx) => (
          <button className="qopt" key={idx} onClick={() => onAddExtra({ name: f.n, kcal: f.kcal })}>
            <span className="av" style={{ background: "rgba(239,168,192,.30)" }}><E>🍴</E></span>
            <span><span className="qn">{f.n}</span><span className="qm" style={{ display: "block" }}>{f.kcal} kcal</span></span>
            <span className="add" style={{ background: "var(--rose-deep)" }}>+</span>
          </button>
        ))}
      </div>
      <div className="divlbl">Add manually</div>
      <div className="field"><label>Name</label><input value={nm} onChange={e => setNm(e.target.value)} placeholder="e.g. Slice of cake" /></div>
      <div className="field"><label>Calories</label><input type="number" value={k} onChange={e => setK(e.target.value)} placeholder="250" /></div>
      <button className="btn" disabled={!nm || !k} onClick={() => onAddExtra({ name: nm, kcal: +k || 0 })}>Log extra</button>
    </div></div>
  );

  return ( /* pantry */
    <div className="scrim" onClick={onClose}><div className="sheet" onClick={stop}>
      <div className="grab"></div>
      <h2>Add a staple</h2><p className="desc">Spread evenly across every prep period.</p>
      <div className="field"><label>Name</label><input value={nm} onChange={e => setNm(e.target.value)} placeholder="e.g. Olive Oil" /></div>
      <div className="frow">
        <div className="field"><label>kcal / 100g</label><input type="number" value={per} onChange={e => setPer(e.target.value)} placeholder="884" /></div>
        <div className="field"><label>Grams / day</label><input type="number" value={day} onChange={e => setDay(e.target.value)} placeholder="12" /></div>
      </div>
      <button className="btn" disabled={!nm || !per} onClick={() => onAddPantry({ e: "🥫", n: nm, per100: +per || 0, dailyG: +day || 0 })}>Add staple</button>
    </div></div>
  );
}

/* ============ PROFILE SHEET ============ */
function ProfileSheet({ goal, onSet, onClose }) {
  const [g, setG] = useState(goal);
  const stop = e => e.stopPropagation();
  return (
    <div className="scrim" onClick={onClose}><div className="sheet" onClick={stop}>
      <div className="grab"></div>
      <h2>Daily goal</h2><p className="desc">Your budget = this × the days in each prep.</p>
      <div className="goalrow">
        <span className="gv">{g.toLocaleString()} <span style={{ fontSize: 13, color: "var(--moss)" }}>kcal / day</span></span>
        <div className="stepper">
          <button onClick={() => setG(v => Math.max(800, v - 100))}>−</button>
          <button onClick={() => setG(v => Math.min(5000, v + 100))}>+</button>
        </div>
      </div>
      <button className="btn" onClick={() => onSet(g)}>Save goal</button>
      <button className="btn ghost" onClick={onClose}>Cancel</button>
    </div></div>
  );
}

/* ============ APP ============ */
const MOODS = {
  sage: { "--sage-bg":"#E7EEDD", "--sage-bg2":"#EDF2E6", "--sage-100":"#DCEACF" },
  cream:{ "--sage-bg":"#F3F1E7", "--sage-bg2":"#FBFBF4", "--sage-100":"#E7E6D6" },
  mist: { "--sage-bg":"#E5EEEB", "--sage-bg2":"#EEF4F2", "--sage-100":"#D6E7E1" },
};
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "name": "Anna",
  "extraAccent": ["#EFA8C0", "#B45C7C"],
  "greenTone": ["#7CC96E", "#5FB152", "#3E8F38"],
  "mood": "sage"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty("--rose", t.extraAccent[0]);
    r.setProperty("--rose-deep", t.extraAccent[1]);
    r.setProperty("--matcha", t.greenTone[0]);
    r.setProperty("--matcha-600", t.greenTone[1]);
    r.setProperty("--matcha-deep", t.greenTone[2]);
    const m = MOODS[t.mood] || MOODS.sage;
    Object.entries(m).forEach(([k, v]) => r.setProperty(k, v));
  }, [t.extraAccent, t.greenTone, t.mood]);

  const [cycles, setCycles] = useState(SEED.cycles);
  const [extras, setExtras] = useState(SEED.extras);
  const [pantry, setPantry] = useState(SEED.pantry);
  const [dailyGoal, setDailyGoal] = useState(GOAL);
  const [selId, setSelId] = useState("c1");
  const [tab, setTab] = useState("basket");
  const [sheet, setSheet] = useState(null);       // {type, date}
  const [profile, setProfile] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [displayName, setDisplayName] = useState(t.name === "there" ? "" : t.name);
  const [account, setAccount] = useState(null);
  const [units, setUnits] = useState({ weight: "g", energy: "kcal" });
  const [defaultDays, setDefaultDays] = useState(4);
  const [macros, setMacros] = useState({ p: 140, c: 220, f: 70 });
  const [theme, setTheme] = useState("light");
  const [basketOpen, setBasketOpen] = useState(false);
  const [pantryOpen, setPantryOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const tRef = useRef(null);

  const winStart = addDays(TODAY, -4), totalDays = 21;
  const cycle = cycles.find(c => c.id === selId) || cycles[0];

  useEffect(() => {
    const scr = document.querySelector(".screen");
    if (!scr) return;
    const dark = theme === "dark" || (theme === "system" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    scr.classList.toggle("se-dark", dark);
  }, [theme]);

  function flash(msg) { setToast(msg); clearTimeout(tRef.current); tRef.current = setTimeout(() => setToast(null), 1700); }

  const meal = mealPrepKcal(cycle), pan = pantryTotal(pantry, cycle), ext = extrasKcal(extras, cycle);
  const budget = cycleDays(cycle) * dailyGoal;

  function addFood(f) {
    const item = { id: "i" + Date.now(), src: "manual", ...f };
    setCycles(cs => cs.map(c => c.id === selId ? { ...c, items: [...c.items, item] } : c));
    setSheet(null); flash(`${f.n} added`);
  }
  function scan(kind) {
    const f = CATALOG[Math.floor(Math.random() * CATALOG.length)];
    addFood({ ...f, e: f.e, src: kind });
    flash(kind === "receipt" ? "Receipt scanned · 1 item" : "Barcode found");
  }
  function addExtra(x) {
    const date = sheet?.date || TODAY;
    setExtras(xs => [...xs, { id: "x" + Date.now(), date, ...x }]);
    setSheet(null); flash("Extra logged"); 
  }
  function addPantry(p) { setPantry(ps => [...ps, { id: "p" + Date.now(), ...p }]); setSheet(null); flash(`${p.n} added`); }
  function removeItem(id) { setCycles(cs => cs.map(c => c.id === selId ? { ...c, items: c.items.filter(i => i.id !== id) } : c)); flash("Removed"); }
  function removeExtra(id) { setExtras(xs => xs.filter(x => x.id !== id)); flash("Removed"); }
  function removePantry(id) { setPantry(ps => ps.filter(p => p.id !== id)); flash("Removed"); }
  function setGrams(id, g) { setCycles(cs => cs.map(c => c.id === selId ? { ...c, overrides: { ...c.overrides, [id]: g } } : c)); }
  function resetGrams(id) { setCycles(cs => cs.map(c => { if (c.id !== selId) return c; const o = { ...c.overrides }; delete o[id]; return { ...c, overrides: o }; })); }
  function setPantryDefault(id, dailyG) { setPantry(ps => ps.map(p => p.id === id ? { ...p, dailyG: Math.max(0, dailyG) } : p)); }
  function setCycleDays(n) { setCycles(cs => cs.map(c => c.id === selId ? { ...c, end: addDays(c.start, n - 1) } : c)); }
  function deleteCycle() {
    const rest = cycles.filter(c => c.id !== selId);
    if (!rest.length) { flash("Can't delete your only basket"); return; }
    setCycles(rest); setSelId(rest[0].id); setBasketOpen(false); flash("Basket deleted");
  }
  function createPeriod(date) {
    const id = "c" + Date.now();
    setCycles(cs => [...cs.filter(c => !(c.id === selId && c.items.length === 0)), { id, start: date, end: addDays(date, defaultDays - 1), items: [], overrides: {} }]);
    setSelId(id); setTab("basket"); flash(`New prep period · ${defaultDays} days`);
  }
  function exportData() {
    const blob = new Blob([JSON.stringify({ cycles, extras, pantry, dailyGoal, macros, units, defaultDays, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "basket-backup.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); flash("Backup downloaded");
  }
  function importData() {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "application/json";
    inp.onchange = () => flash(inp.files && inp.files.length ? "Backup imported" : "Import cancelled");
    inp.click();
  }
  function clearAll() {
    setCycles([{ id: "c" + Date.now(), start: TODAY, end: addDays(TODAY, defaultDays - 1), items: [], overrides: {} }]);
    setExtras([]); setPantry([]); setSelId(null); setTab("basket"); setSettingsOpen(false); flash("All data cleared");
  }
  function onFab() {
    setSheet({ type: tab === "extras" ? "extra" : tab === "pantry" ? "pantry" : "food", date: tab === "extras" ? TODAY : null });
  }

  return (
    <React.Fragment>
    <Device>
      <div className="app">
        <div className="blob"></div>
        <div className="hd">
          <div className="l">
            <div className="hi">{displayName ? `Welcome back, ${displayName}` : "Welcome back"} <span className="wave"><E>👋</E></span></div>
            <div className="sub">{fmtLong(TODAY)}</div>
          </div>
          <div className="acts">
            <button className="icbtn" onClick={() => setPantryOpen(true)} title="Pantry"><E>🫙</E></button>
            <button className="icbtn" onClick={() => setSettingsOpen(true)} title="Settings"><E>⚙️</E></button>
          </div>
        </div>

        <Timeline cycles={cycles} extras={extras} selId={selId} winStart={winStart} totalDays={totalDays}
          onSelect={setSelId} onAddExtra={d => setSheet({ type: "extra", date: d })} onCreate={createPeriod} />

        <Budget meal={meal} pan={pan} ext={ext} budget={budget} macros={macros} days={cycleDays(cycle)} />

        <Panel tab={tab} cycle={cycle} extras={extras} pantry={pantry} dailyGoal={dailyGoal}
          onRemove={removeItem} onRemoveExtra={removeExtra} onRemovePantry={removePantry} onGrams={setGrams}
          onOpen={() => setBasketOpen(true)} onSetDays={setCycleDays} onOpenPantry={() => setPantryOpen(true)} />

        <Navbar tab={tab} onTab={setTab} onFab={onFab} fabOpen={false} />

        {toast && <div className="toast">{toast}</div>}
        {sheet && <AddSheet type={sheet.type} date={sheet.date} onClose={() => setSheet(null)}
          onAddFood={addFood} onAddExtra={addExtra} onAddPantry={addPantry} onScan={scan} />}
        {profile && <ProfileSheet goal={dailyGoal} onSet={g => { setDailyGoal(g); setProfile(false); flash("Goal updated"); }} onClose={() => setProfile(false)} />}

        {settingsOpen && <SettingsPage
          onBack={() => setSettingsOpen(false)}
          account={account}
          onAuthed={a => { setAccount(a); flash("Signed in"); }}
          onSignOut={() => { setAccount(null); flash("Signed out"); }}
          onDeleteAccount={() => { setAccount(null); flash("Account deleted"); }}
          sync={account ? "synced" : "offline"}
          displayName={displayName} onName={setDisplayName}
          goal={dailyGoal} onGoal={setDailyGoal}
          macros={macros} onMacros={setMacros}
          defaultDays={defaultDays} onDefaultDays={setDefaultDays}
          units={units} onUnits={setUnits}
          theme={theme} onTheme={setTheme}
          accent={t.greenTone} onAccent={a => setTweak("greenTone", a)}
          onExport={exportData} onImport={importData} onClearAll={clearAll}
          version="1.0.0" />}

        {basketOpen && <BasketPage cycle={cycle} pantry={pantry} extras={extras} dailyGoal={dailyGoal} macros={macros}
          onBack={() => setBasketOpen(false)}
          onAdd={() => setSheet({ type: "food", date: null })}
          onScan={scan} onRemove={removeItem} onSetDays={setCycleDays} onDelete={deleteCycle} />}

        {pantryOpen && <PantryPage cycle={cycle} pantry={pantry}
          onBack={() => setPantryOpen(false)}
          onSetDefault={setPantryDefault} onRemove={removePantry}
          onAdd={() => setSheet({ type: "pantry", date: null })}
          onGrams={setGrams} onReset={resetGrams} />}
      </div>
    </Device>
    <window.TweaksPanel>
      <window.TweakSection label="Personal" />
      <window.TweakText label="Your name" value={t.name} onChange={v => setTweak("name", v || "there")} />
      <window.TweakSection label="Colour & mood" />
      <window.TweakColor label="Extra accent" value={t.extraAccent}
        options={[["#EFA8C0","#B45C7C"],["#F0B79A","#C2724A"],["#F1A79A","#C2554A"],["#C9B7E0","#7A5AA8"]]}
        onChange={v => setTweak("extraAccent", v)} />
      <window.TweakColor label="Greens" value={t.greenTone}
        options={[["#7CC96E","#5FB152","#3E8F38"],["#5FAE56","#46913E","#2E6F2A"],["#A6D938","#7FBE2A","#5C9117"]]}
        onChange={v => setTweak("greenTone", v)} />
      <window.TweakRadio label="Surface" value={t.mood} options={["sage","cream","mist"]}
        onChange={v => setTweak("mood", v)} />
    </window.TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
