/* Basket prototype — full-screen Pantry manager.
   Defaults (auto-applied to every prep) + per-prep customisation.
   Depends on basket-helpers.jsx atoms. */

function Stepper({ value, step, suffix, onChange, min = 0 }) {
  return (
    <div className="pstep">
      <button onClick={() => onChange(Math.max(min, value - step))} aria-label="Less">−</button>
      <span className="pstep-v">{value}<small>{suffix}</small></span>
      <button onClick={() => onChange(value + step)} aria-label="More">+</button>
    </div>
  );
}

function PantryPage({ cycle, pantry, onBack, onSetDefault, onRemove, onAdd, onGrams, onReset }) {
  const [mode, setMode] = React.useState("defaults");
  const days = cycleDays(cycle);
  const a = fmtDay(cycle.start), b = fmtDay(cycle.end);
  const prepTotal = pantryTotal(pantry, cycle);
  const perDayDefault = pantry.reduce((s, p) => s + p.dailyG * p.per100 / 100, 0);

  return (
    <div className="bpage ppage">
      <div className="bp-top">
        <button className="bp-back" onClick={onBack} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="bp-ttl">
          <span className="bp-ttl-k">Pantry</span>
          <span className="bp-ttl-s">Staples in every meal prep</span>
        </div>
        <div className="bp-menu" style={{ width: 42 }}></div>
      </div>

      <div className="pp-seg">
        <div className="pp-seg-pill" style={{ left: mode === "defaults" ? "4px" : "calc(50% + 2px)" }}></div>
        <button className={mode === "defaults" ? "on" : ""} onClick={() => setMode("defaults")}>Defaults</button>
        <button className={mode === "thisprep" ? "on" : ""} onClick={() => setMode("thisprep")}>This prep</button>
      </div>

      <div className="bp-scroll">
        {mode === "defaults" ? (
          <React.Fragment>
            <div className="pp-note">
              <span className="pp-note-i"><E>♻️</E></span>
              <p>Set a daily amount once — it's spread automatically across every prep, however long.</p>
            </div>

            {pantry.length ? (
              <div className="pp-list">
                {pantry.map(p => (
                  <div className="pp-card" key={p.id}>
                    <div className="pp-card-h">
                      <span className="pp-av"><E>{p.e}</E></span>
                      <span className="pp-nm">
                        <b>{p.n}</b>
                        <small>{p.per100} kcal / 100g</small>
                      </span>
                      <button className="pp-rm" onClick={() => onRemove(p.id)} aria-label="Remove">✕</button>
                    </div>
                    <div className="pp-card-ctrl">
                      <span className="pp-ctrl-l">Per day</span>
                      <Stepper value={p.dailyG} step={2} suffix=" g" onChange={v => onSetDefault(p.id, v)} />
                      <span className="pp-ctrl-k">{Math.round(p.dailyG * p.per100 / 100)} <small>kcal/day</small></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bp-empty">
                <div className="bp-empty-e"><E>🫙</E></div>
                <h4>No staples yet</h4>
                <p>Add the basics you always cook with — oils, grains, sauces.</p>
              </div>
            )}

            {pantry.length > 0 && (
              <div className="pp-sum">
                <span>Adds to every day</span>
                <b>{Math.round(perDayDefault).toLocaleString()} kcal</b>
              </div>
            )}

            <button className="pp-add" onClick={onAdd}>
              <span className="pp-add-ic">+</span> Add a staple
            </button>
            <div className="bp-pad"></div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <div className="pp-prep-h">
              <span className="pp-prep-rng">{a.dn} {a.mo} – {b.dn} {b.mo}</span>
              <span className="pp-prep-days">{days} days</span>
            </div>
            <div className="pp-note">
              <span className="pp-note-i"><E>✎</E></span>
              <p>Tweak how much of each staple this specific prep uses. Defaults stay untouched.</p>
            </div>

            {pantry.length ? (
              <div className="pp-list">
                {pantry.map(p => {
                  const def = p.dailyG * days;
                  const grams = pantryGrams(p, cycle);
                  const custom = grams !== def;
                  return (
                    <div className={"pp-card" + (custom ? " custom" : "")} key={p.id}>
                      <div className="pp-card-h">
                        <span className="pp-av"><E>{p.e}</E></span>
                        <span className="pp-nm">
                          <b>{p.n}</b>
                          <small>{custom ? <em>Customised · default {def} g</em> : `Default · ${p.dailyG} g/day`}</small>
                        </span>
                        {custom
                          ? <button className="pp-reset" onClick={() => onReset(p.id)}>Reset</button>
                          : <span className="pp-kc">{pantryKcal(p, cycle).toLocaleString()}<small>KCAL</small></span>}
                      </div>
                      <div className="pp-card-ctrl">
                        <span className="pp-ctrl-l">This prep</span>
                        <Stepper value={grams} step={10} suffix=" g" onChange={v => onGrams(p.id, v)} />
                        {custom && <span className="pp-ctrl-k">{pantryKcal(p, cycle).toLocaleString()} <small>kcal</small></span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bp-empty">
                <div className="bp-empty-e"><E>🫙</E></div>
                <h4>No staples to customise</h4>
                <p>Add defaults first, then fine-tune them here per prep.</p>
              </div>
            )}

            {pantry.length > 0 && (
              <div className="pp-sum">
                <span>Pantry in this {days}-day prep</span>
                <b>{prepTotal.toLocaleString()} kcal</b>
              </div>
            )}
            <div className="bp-pad"></div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

window.PantryPage = PantryPage;
