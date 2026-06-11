/* Basket — full-screen Settings & Account.
   Depends on basket-helpers.jsx (E). Exports SettingsPage to window. */

const { useState: useS } = React;

/* ---------- atoms ---------- */
function Chevron() {
  return <svg className="se-chev" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function Section({ label, hint, children }) {
  return (
    <div className="se-sec">
      <div className="se-sec-lbl">{label}</div>
      <div className="se-card">{children}</div>
      {hint && <div className="se-hint">{hint}</div>}
    </div>
  );
}
function Row({ icon, label, sub, value, chevron, onClick, danger, disabled, badge, children, input }) {
  const cls = "se-row" + (onClick && !disabled ? " tap" : "") + (danger ? " danger" : "") + (disabled ? " off" : "");
  return (
    <div className={cls} onClick={disabled ? undefined : onClick}>
      {icon && <span className="se-ic"><E>{icon}</E></span>}
      <span className="se-main">
        <span className="se-lbl">{label}{badge && <span className="se-badge">{badge}</span>}</span>
        {sub && <span className="se-sub">{sub}</span>}
      </span>
      {input ? <span className="se-right">{input}</span>
        : children ? <span className="se-right">{children}</span>
        : <span className="se-right">
            {value != null && <span className="se-val">{value}</span>}
            {chevron && <Chevron />}
          </span>}
    </div>
  );
}
function Toggle({ on, onChange }) {
  return <button className={"se-tog" + (on ? " on" : "")} onClick={e => { e.stopPropagation(); onChange(!on); }} aria-pressed={on}><span></span></button>;
}
function Seg({ value, options, onChange }) {
  return (
    <div className="se-seg" onClick={e => e.stopPropagation()}>
      {options.map(o => (
        <button key={o.v} className={value === o.v ? "on" : ""} onClick={() => onChange(o.v)}>{o.l}</button>
      ))}
    </div>
  );
}
function Stepper({ value, min, max, step, suffix, onChange }) {
  return (
    <div className="se-step" onClick={e => e.stopPropagation()}>
      <button onClick={() => onChange(Math.max(min, value - step))}>−</button>
      <span>{value}<small>{suffix}</small></span>
      <button onClick={() => onChange(Math.min(max, value + step))}>+</button>
    </div>
  );
}

/* ---------- auth sheet ---------- */
function AuthSheet({ onClose, onAuthed }) {
  const [mode, setMode] = useS("signin");   // signin | signup | forgot
  const [email, setEmail] = useS("");
  const [pw, setPw] = useS("");
  const [busy, setBusy] = useS(false);
  const [err, setErr] = useS("");
  const [sent, setSent] = useS(false);
  const stop = e => e.stopPropagation();
  const valid = /\S+@\S+\.\S+/.test(email) && (mode === "forgot" || pw.length >= 6);

  function submit() {
    setErr("");
    if (mode === "forgot") {
      if (!/\S+@\S+\.\S+/.test(email)) { setErr("Enter a valid email."); return; }
      setBusy(true); setTimeout(() => { setBusy(false); setSent(true); }, 900); return;
    }
    if (!valid) { setErr("Enter a valid email and a 6+ character password."); return; }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      if (/fail@/.test(email)) { setErr("Those credentials didn't match. Try again."); return; }
      onAuthed({ name: email.split("@")[0].replace(/^\w/, c => c.toUpperCase()), email });
    }, 1100);
  }

  const title = mode === "signup" ? "Create account" : mode === "forgot" ? "Reset password" : "Sign in";
  return (
    <div className="scrim" onClick={onClose}><div className="sheet se-auth" onClick={stop}>
      <div className="grab"></div>
      <h2>{title}</h2>
      <p className="desc">{mode === "forgot" ? "We'll email you a reset link." : "Sync your baskets across devices."}</p>

      {sent ? (
        <div className="se-sent">
          <div className="se-sent-i"><E>📬</E></div>
          <p>Check <b>{email}</b> for a reset link.</p>
          <button className="btn" onClick={() => { setMode("signin"); setSent(false); }}>Back to sign in</button>
        </div>
      ) : (
        <React.Fragment>
          {mode !== "forgot" && (
            <div className="se-social">
              <button className="se-soc" onClick={() => onAuthed({ name: "Anna", email: "anna@icloud.com" })}><E></E><span>Continue with Apple</span></button>
              <button className="se-soc g" onClick={() => onAuthed({ name: "Anna", email: "anna@gmail.com" })}><span className="se-g"></span><span>Continue with Google</span></button>
              <div className="se-or"><span>or</span></div>
            </div>
          )}

          <label className="se-field">
            <span>Email</span>
            <input type="email" value={email} placeholder="you@email.com" autoFocus
              className={err && !/\S+@\S+\.\S+/.test(email) ? "bad" : ""}
              onChange={e => { setEmail(e.target.value); setErr(""); }} />
          </label>
          {mode !== "forgot" && (
            <label className="se-field">
              <span>Password</span>
              <input type="password" value={pw} placeholder="••••••••"
                onChange={e => { setPw(e.target.value); setErr(""); }} />
            </label>
          )}

          {err && <div className="se-err"><E>⚠️</E> {err}</div>}

          <button className={"btn" + (busy ? " busy" : "")} disabled={busy} onClick={submit}>
            {busy ? <span className="se-spin"></span> : (mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in")}
          </button>

          <div className="se-auth-foot">
            {mode === "signin" && <React.Fragment>
              <button onClick={() => setMode("forgot")}>Forgot password?</button>
              <span>New here? <button onClick={() => setMode("signup")}>Create account</button></span>
            </React.Fragment>}
            {mode === "signup" && <span>Already have an account? <button onClick={() => setMode("signin")}>Sign in</button></span>}
            {mode === "forgot" && <button onClick={() => setMode("signin")}>Back to sign in</button>}
          </div>
        </React.Fragment>
      )}
    </div></div>
  );
}

/* ---------- confirm dialog ---------- */
function Confirm({ title, body, confirmLabel, onConfirm, onClose }) {
  const stop = e => e.stopPropagation();
  return (
    <div className="scrim center" onClick={onClose}><div className="se-dialog" onClick={stop}>
      <h3>{title}</h3>
      <p>{body}</p>
      <div className="se-dialog-btns">
        <button className="se-d-cancel" onClick={onClose}>Cancel</button>
        <button className="se-d-go" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </div></div>
  );
}

/* ---------- page ---------- */
function SettingsPage(props) {
  const { onBack, account, onSignOut, onDeleteAccount, onAuthed,
    displayName, onName, goal, onGoal, macros, onMacros, defaultDays, onDefaultDays,
    units, onUnits, theme, onTheme, accent, onAccent, sync,
    onExport, onImport, onClearAll, version } = props;

  const [auth, setAuth] = useS(false);
  const [confirm, setConfirm] = useS(null);   // 'clear' | 'delete'
  const energyLabel = units.energy === "kJ" ? "kJ" : "kcal";
  const goalShown = units.energy === "kJ" ? Math.round(goal * 4.184) : goal;

  const syncMeta = {
    synced: { t: "Synced just now", c: "ok" },
    syncing: { t: "Syncing…", c: "busy" },
    offline: { t: "Offline — will sync later", c: "warn" },
    error: { t: "Sync error — tap to retry", c: "err" },
  }[sync] || { t: "Synced just now", c: "ok" };

  const ACCENTS = [
    ["#7CC96E", "#5FB152", "#3E8F38"],
    ["#E6A23C", "#D98A1F", "#B5710F"],
    ["#5FA8D3", "#3E8BBE", "#2C6E9C"],
    ["#E08A5B", "#CF7340", "#B25A2A"],
    ["#B07CC9", "#9560B4", "#774696"],
    ["#E1809B", "#C8607E", "#A8475F"],
  ];

  return (
    <div className="bpage se-page">
      <div className="bp-top">
        <button className="bp-back" onClick={onBack} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="bp-ttl"><span className="bp-ttl-k">Settings</span></div>
        <div style={{ width: 42 }}></div>
      </div>

      <div className="bp-scroll">
        {/* ACCOUNT */}
        {account ? (
          <div className="se-acct">
            <div className="se-acct-top">
              <span className="se-avatar">{(account.name[0] || "?").toUpperCase()}</span>
              <span className="se-acct-id">
                <b>{account.name}</b>
                <small>{account.email}</small>
              </span>
            </div>
            <div className={"se-sync " + syncMeta.c}><span className="se-sync-dot"></span>{syncMeta.t}</div>
            <div className="se-card" style={{ marginTop: 12 }}>
              <Row icon="🪪" label="Manage account" chevron onClick={() => {}} />
              <Row icon="🚪" label="Sign out" onClick={onSignOut} />
              <Row icon="🗑️" label="Delete account" danger onClick={() => setConfirm("delete")} />
            </div>
          </div>
        ) : (
          <div className="se-signin">
            <div className="se-signin-tx">
              <b>Sign in to Basket</b>
              <span>Sync your data across devices.</span>
            </div>
            <div className="se-signin-btns">
              <button className="btn" onClick={() => setAuth("signin")}>Sign in</button>
              <button className="btn ghost" onClick={() => setAuth("signup")}>Create account</button>
            </div>
          </div>
        )}

        {/* PROFILE */}
        <Section label="Profile">
          <Row icon="🙂" label="Display name" input={
            <input className="se-inp" value={displayName} placeholder="Add your name"
              onChange={e => onName(e.target.value)} />
          } />
          <Row icon="🖼️" label="Avatar" sub="Tap to change" value="Optional" chevron onClick={() => {}} />
        </Section>

        {/* GOALS */}
        <Section label="Goals" hint="Your daily budget × the days in each prep sets the basket target.">
          <Row icon="🔥" label={"Daily goal"} children={
            <Stepper value={goalShown} min={units.energy === "kJ" ? 3300 : 800} max={units.energy === "kJ" ? 21000 : 5000}
              step={units.energy === "kJ" ? 100 : 50} suffix={" " + energyLabel}
              onChange={v => onGoal(units.energy === "kJ" ? Math.round(v / 4.184) : v)} />
          } />
          <Row icon="🥩" label="Protein" children={<Stepper value={macros.p} min={0} max={400} step={5} suffix=" g" onChange={v => onMacros({ ...macros, p: v })} />} />
          <Row icon="🍞" label="Carbs" children={<Stepper value={macros.c} min={0} max={600} step={5} suffix=" g" onChange={v => onMacros({ ...macros, c: v })} />} />
          <Row icon="🥑" label="Fat" children={<Stepper value={macros.f} min={0} max={250} step={5} suffix=" g" onChange={v => onMacros({ ...macros, f: v })} />} />
        </Section>

        {/* MEAL PREP */}
        <Section label="Meal prep" hint="New prep periods start at this length. You can still adjust each one.">
          <Row icon="📆" label="Default period length" children={<Stepper value={defaultDays} min={1} max={14} step={1} suffix={defaultDays === 1 ? " day" : " days"} onChange={onDefaultDays} />} />
        </Section>

        {/* UNITS */}
        <Section label="Units">
          <Row icon="⚖️" label="Weight" children={<Seg value={units.weight} options={[{ v: "g", l: "g" }, { v: "oz", l: "oz" }]} onChange={v => onUnits({ ...units, weight: v })} />} />
          <Row icon="⚡" label="Energy" children={<Seg value={units.energy} options={[{ v: "kcal", l: "kcal" }, { v: "kJ", l: "kJ" }]} onChange={v => onUnits({ ...units, energy: v })} />} />
        </Section>

        {/* APPEARANCE */}
        <Section label="Appearance">
          <Row icon="🎨" label="Theme" children={<Seg value={theme} options={[{ v: "light", l: "Light" }, { v: "dark", l: "Dark" }, { v: "system", l: "Auto" }]} onChange={onTheme} />} />
          <Row icon="🌈" label="Accent colour" children={
            <div className="se-swatches" onClick={e => e.stopPropagation()}>
              {ACCENTS.map((a, i) => (
                <button key={i} className={"se-sw" + (accent[0] === a[0] ? " on" : "")} style={{ background: a[1] }} onClick={() => onAccent(a)} aria-label={"Accent " + (i + 1)}></button>
              ))}
            </div>
          } />
        </Section>

        {/* DATA */}
        <Section label="Data">
          <Row icon="📤" label="Export data" sub="Download a JSON backup" chevron onClick={onExport} />
          <Row icon="📥" label="Import data" sub="Restore from a backup" chevron onClick={onImport} />
          <Row icon="🧨" label="Clear all data" danger onClick={() => setConfirm("clear")} />
        </Section>

        {/* ABOUT */}
        <Section label="About">
          <Row icon="📦" label="Version" value={version} />
          <Row icon="💬" label="Send feedback" chevron onClick={() => {}} />
          <Row icon="⭐" label="Rate the app" chevron onClick={() => {}} />
          <Row icon="⚖️" label="Open-source licenses" chevron onClick={() => {}} />
          <Row icon="🔒" label="Privacy Policy" chevron onClick={() => {}} />
          <Row icon="📄" label="Terms of Service" chevron onClick={() => {}} />
          <Row label="Realtime sync" badge="Soon" disabled value="Coming soon" />
        </Section>

        <div className="se-foot">Basket v{version} · Made for batch cooks 🥦</div>
        <div className="bp-pad" style={{ height: 28 }}></div>
      </div>

      {auth && <AuthSheet onClose={() => setAuth(false)} onAuthed={a => { setAuth(false); onAuthed(a); }} />}
      {confirm === "clear" && <Confirm title="Clear all data?" body="This permanently removes every basket, extra and pantry staple on this device. This can't be undone."
        confirmLabel="Clear everything" onConfirm={() => { setConfirm(null); onClearAll(); }} onClose={() => setConfirm(null)} />}
      {confirm === "delete" && <Confirm title="Delete account?" body="Your account and all synced data will be permanently deleted. This can't be undone."
        confirmLabel="Delete account" onConfirm={() => { setConfirm(null); onDeleteAccount(); }} onClose={() => setConfirm(null)} />}
    </div>
  );
}

window.SettingsPage = SettingsPage;
