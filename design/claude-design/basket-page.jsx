/* Basket prototype — full-screen Basket detail page.
   Depends on basket-helpers.jsx atoms (E, fmtDay, cycleDays, mealPrepKcal, etc). */

const SRC_LABEL = { barcode: "Scanned", receipt: "Receipt", manual: "Manual" };

/* prep-length slider — shared by home panel + full basket page */
function LengthSlider({ cycle, dailyGoal, onSetDays }) {
  const days = cycleDays(cycle);
  const a = fmtDay(cycle.start), b = fmtDay(cycle.end);
  return (
    <div className="bp-len">
      <div className="bp-len-top">
        <span className="bp-len-l">Prep length</span>
        <span className="bp-len-v">{days} <small>day{days === 1 ? "" : "s"}</small></span>
      </div>
      <input className="bp-len-rng" type="range" min="1" max="14" step="1" value={days}
        onChange={e => onSetDays(+e.target.value)}
        style={{ "--p": ((days - 1) / 13 * 100) + "%" }} />
      <div className="bp-len-scale"><span>1</span><span>7</span><span>14</span></div>
      <div className="bp-len-foot">{a.dn} {a.mo} → {b.dn} {b.mo} · {(days * dailyGoal).toLocaleString()} kcal budget</div>
    </div>
  );
}
window.LengthSlider = LengthSlider;

/* macro mini-bars — consumed (derived from kcal) vs per-day target × days.
   Reused under every budget/progress bar. */
function MacroBars({ kcal, days, macros }) {
  const m = macros || { p: 140, c: 220, f: 70 };
  const got = { p: kcal * 0.25 / 4, c: kcal * 0.45 / 4, f: kcal * 0.30 / 9 };
  const defs = [
    { k: "p", label: "Protein", c: "var(--rose-deep)", t: "rgba(180,92,124,.18)" },
    { k: "c", label: "Carbs", c: "var(--amber)", t: "rgba(230,162,60,.20)" },
    { k: "f", label: "Fat", c: "var(--matcha-deep)", t: "rgba(124,201,110,.22)" },
  ];
  return (
    <div className="macros">
      {defs.map(d => {
        const target = Math.max(1, m[d.k] * (days || 1));
        const got_ = Math.round(got[d.k]);
        const pct = Math.max(0, Math.min(100, got_ / target * 100));
        return (
          <div className="macro" key={d.k}>
            <div className="macro-top">
              <span className="macro-l">{d.label}</span>
              <span className="macro-v">{got_}<small>/{Math.round(target)}g</small></span>
            </div>
            <div className="macro-bar" style={{ background: d.t }}>
              <i style={{ width: pct + "%", background: d.c }}></i>
            </div>
          </div>
        );
      })}
    </div>
  );
}
window.MacroBars = MacroBars;

/* segmented progress ring — one arc per calorie source */
function Ring({ segs, budget, consumed }) {
  const R = 60, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="bp-ring">
      <svg viewBox="0 0 148 148" width="148" height="148">
        <circle cx="74" cy="74" r={R} className="bp-ring-track" />
        {segs.map((s, i) => {
          const frac = budget ? Math.max(0, Math.min(1, s.v / budget)) : 0;
          const dash = frac * C;
          const rot = -90 + (budget ? acc / budget : 0) * 360;
          acc += s.v;
          if (dash <= 0) return null;
          return <circle key={i} cx="74" cy="74" r={R} fill="none" stroke={s.c} strokeWidth="13"
            strokeDasharray={`${dash} ${C}`} transform={`rotate(${rot} 74 74)`} className="bp-ring-seg" />;
        })}
      </svg>
      <div className="bp-ring-c">
        <span className="bp-ring-k">{consumed.toLocaleString()}</span>
        <span className="bp-ring-l">of {budget.toLocaleString()} kcal</span>
      </div>
    </div>
  );
}

function BasketPage({ cycle, pantry, extras, dailyGoal, macros, onBack, onAdd, onScan, onRemove, onSetDays, onDelete, onItem }) {
  const [menu, setMenu] = React.useState(false);
  const days = cycleDays(cycle);
  const total = mealPrepKcal(cycle);
  const pan = pantryTotal(pantry, cycle);
  const ext = extrasKcal(extras, cycle);
  const consumed = total + pan + ext;
  const weight = cycle.items.reduce((s, i) => s + (i.w || 0), 0);
  const budget = days * dailyGoal;
  const pct = v => budget ? Math.max(0, Math.min(100, v / budget * 100)) : 0;
  const a = fmtDay(cycle.start), b = fmtDay(cycle.end);

  return (
    <div className="bpage bpage-full">
      <div className="bp-top">
        <button className="bp-back" onClick={onBack} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="bp-ttl">
          <span className="bp-ttl-k">Meal Prep</span>
          <span className="bp-ttl-s">{a.dn} {a.mo} – {b.dn} {b.mo} · {days} days</span>
        </div>
        <button className={"bp-menu" + (menu ? " on" : "")} aria-label="More" onClick={() => setMenu(m => !m)}>
          <span></span><span></span><span></span>
        </button>
      </div>

      {menu && (
        <div className="scrim" onClick={() => setMenu(false)}>
          <div className="sheet bp-menu-sheet" onClick={e => e.stopPropagation()}>
            <div className="grab"></div>
            <h2>Meal Prep</h2>
            <p className="desc">{a.dn} {a.mo} – {b.dn} {b.mo} · {days} days</p>
            <LengthSlider cycle={cycle} dailyGoal={dailyGoal} onSetDays={onSetDays} />
            <button className="btn id-danger bp-menu-del" onClick={() => { setMenu(false); onDelete(); }}>
              <E>🗑️</E> Delete this basket
            </button>
          </div>
        </div>
      )}

      {cycle.items.length === 0 ? (
        <div className="bp-new">
          <div className="bp-new-intro">
            <h3 className="bp-new-h">Start this shop</h3>
            <p className="bp-new-p">Scan to add everything at once — we'll fill in the weights and calories for you.</p>
          </div>

          <div className="bp-scanzone">
            <button className="bp-scanbig primary" onClick={() => onScan("receipt")}>
              <span className="bp-scanbig-ic"><E>🧾</E></span>
              <span className="bp-scanbig-tx">
                <b>Scan a receipt</b>
                <small>Add a whole shop in one tap</small>
              </span>
            </button>
            <button className="bp-scanbig alt" onClick={() => onScan("barcode")}>
              <span className="bp-scanbig-ic"><E>📷</E></span>
              <span className="bp-scanbig-tx">
                <b>Scan a barcode</b>
                <small>Add items one at a time</small>
              </span>
            </button>
          </div>

          <LengthSlider cycle={cycle} dailyGoal={dailyGoal} onSetDays={onSetDays} />
        </div>
      ) : (
        <div className="bp-scroll">
        <div className="bp-hero">
          <div className="bp-hero-blob"></div>
          <Ring segs={[{ v: total, c: "var(--matcha)" }, { v: pan, c: "var(--amber)" }, { v: ext, c: "var(--rose)" }]} budget={budget} consumed={consumed} />
          <div className="bp-fill">
            <div className="bp-srcbar">
              <i style={{ width: pct(total) + "%", background: "var(--matcha)" }}></i>
              <i style={{ width: pct(pan) + "%", background: "var(--amber)" }}></i>
              <i style={{ width: pct(ext) + "%", background: "var(--rose)" }}></i>
            </div>
            <div className="bp-srcleg">
              <span><i style={{ background: "var(--matcha)" }}></i>Meal prep <b>{total.toLocaleString()}</b></span>
              <span><i style={{ background: "var(--amber)" }}></i>Pantry <b>{pan.toLocaleString()}</b></span>
              <span><i style={{ background: "var(--rose)" }}></i>Extras <b>{ext.toLocaleString()}</b></span>
            </div>
            <div className="bp-macros"><MacroBars kcal={consumed} days={days} macros={macros} /></div>
          </div>
        </div>

        {cycle.items.length > 0 && (
          <React.Fragment>
            <div className="bp-stats">
              <div className="bp-stat">
                <span className="bp-stat-v">{cycle.items.length}</span>
                <span className="bp-stat-l">items</span>
              </div>
              <div className="bp-stat">
                <span className="bp-stat-v">{(weight / 1000).toFixed(weight >= 1000 ? 1 : 2)}<small>kg</small></span>
                <span className="bp-stat-l">total weight</span>
              </div>
              <div className="bp-stat">
                <span className="bp-stat-v">{days ? Math.round(total / days).toLocaleString() : 0}</span>
                <span className="bp-stat-l">kcal / day</span>
              </div>
            </div>

            <div className="bp-seclbl">
              <span>Receipt</span>
              <span className="bp-seccnt">{cycle.items.length} item{cycle.items.length === 1 ? "" : "s"}</span>
            </div>
          </React.Fragment>
        )}

        {cycle.items.length ? (
          <div className="bp-items">
            {cycle.items.map(it => {
              const share = total ? (it.k / total) * 100 : 0;
              return (
                <div className="bp-item tap" key={it.id} onClick={() => onItem && onItem(it)}>
                  <div className="bp-av"><E>{it.e}</E></div>
                  <div className="bp-it-mid">
                    <div className="bp-it-top">
                      <span className="bp-it-nm">{it.n}</span>
                    </div>
                    <div className="bp-it-meta">
                      <span className="bp-tag">{SRC_LABEL[it.src] || "Manual"}</span>
                      <span>{it.w} g · {days ? Math.round(it.k / days) : it.k}/day</span>
                    </div>
                    <div className="bp-it-bar"><i style={{ width: share + "%" }}></i></div>
                  </div>
                  <div className="bp-it-kc">
                    {it.k.toLocaleString()}
                    <small>KCAL</small>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <button className="bp-scan" onClick={() => onScan("receipt")}>
          <span className="bp-scan-ic"><E>🧾</E></span>
          <span className="bp-scan-tx">
            <b>Scan a receipt</b>
            <small>Add a whole shop in one tap</small>
          </span>
          <span className="bp-scan-go">›</span>
        </button>

        <div className="bp-pad"></div>
        </div>
      )}

      <div className="bp-cta">
        {cycle.items.length === 0 ? (
          <button className="bp-addbtn ghost" onClick={onAdd}>Enter an item manually</button>
        ) : (
          <button className="bp-addbtn" onClick={onAdd}>
            <span className="bp-plus">+</span> Add to basket
          </button>
        )}
      </div>
    </div>
  );
}

window.BasketPage = BasketPage;
