/* Basket redesign — four option screens for the main timeline.
   Each renders a full iOS phone. Exported to window for the canvas. */

const StatusBar = ({ light }) => (
  <div className="statusbar" style={light ? { color: 'var(--cream)' } : null}>
    <span>9:41</span>
    <span className="sb-right">
      <span className="sb-bars"><i></i><i></i><i></i><i></i></span>
      <span className="sb-wifi"></span>
      <span className="sb-batt"></span>
    </span>
  </div>
);

const Device = ({ screenClass, dark, children }) => (
  <div className="device">
    <div className={"screen " + (screenClass || "") + (dark ? " dark" : "")}>
      <StatusBar light={dark} />
      {children}
      <div className="home-ind" style={{ color: dark ? '#fff' : 'var(--forest)' }}></div>
    </div>
  </div>
);

const E = ({ children }) => <span className="emoji">{children}</span>;

// shared sample week  (Jun 2026 — today = Sun 7)
const WEEK = [
  { wd: 'Thu', dn: 4, extra: false },
  { wd: 'Fri', dn: 5, extra: false },
  { wd: 'Sat', dn: 6, extra: true },
  { wd: 'Sun', dn: 7, today: true },
  { wd: 'Mon', dn: 8, extra: false },
];
const FOODS = [
  { e: '🐟', n: 'Salmon', w: '600 g', k: 1254, pct: 72 },
  { e: '🍠', n: 'Sweet Potato', w: '500 g', k: 430, pct: 40 },
  { e: '🥦', n: 'Broccoli', w: '600 g', k: 204, pct: 22 },
  { e: '🍗', n: 'Chicken Breast', w: '800 g', k: 880, pct: 60 },
];

/* ============== OPTION A — FRESH MATCHA ============== */
function OptionA() {
  return (
    <Device>
      <div className="A">
        <div className="blob"></div>
        <div className="top">
          <div>
            <div className="hi">Hi Anna <span className="wave"><E>👋</E></span></div>
            <div className="sub">Sunday, 7 June</div>
          </div>
          <div className="actions">
            <div className="icbtn"><E>🧺</E></div>
            <div className="icbtn"><E>⚙️</E></div>
          </div>
        </div>

        <div className="cal">
          {WEEK.map((d, i) => (
            <div className="day" key={i}>
              <div className={"xtag" + (d.extra ? "" : " ghost")}>Extra</div>
              <div className={"dcell" + (d.today ? " today" : "")}>
                <div className="wd">{d.wd}</div>
                <div className="dn">{d.dn}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="gantt">
          <div className="glabel">Meal prep timeline</div>
          <div className="track">
            <div className="grid"><span></span><span></span><span></span><span></span><span></span></div>
            <div className="newslot">+</div>
            <div className="bar">
              <span className="bl">Meal Prep</span>
              <span className="chips"><span><E>🐟</E></span><span><E>🍠</E></span><span><E>🥦</E></span></span>
              <span className="arrow">›</span>
            </div>
          </div>
        </div>

        <div className="sheet">
          <div className="grab"></div>
          <div className="budrow">
            <span className="t">Cycle budget</span>
            <span className="n"><b>5,180</b> / 8,000 kcal</span>
          </div>
          <div className="budtrack"><i className="g"></i><i className="p"></i></div>
          <div className="leg">
            <span><i style={{ background: 'var(--matcha)' }}></i>Meal prep</span>
            <span><i style={{ background: 'var(--rose)' }}></i>Extra</span>
            <span style={{ marginLeft: 'auto', color: 'var(--matcha-deep)' }}>2,820 left</span>
          </div>
          <div className="items">
            {FOODS.slice(0, 4).map((f, i) => (
              <div className="item" key={i}>
                <div className="av"><E>{f.e}</E></div>
                <div className="txt">
                  <div className="nm">{f.n}</div>
                  <div className="mt">{f.w}</div>
                </div>
                <div className="kc">{f.k.toLocaleString()}<small>KCAL</small></div>
              </div>
            ))}
          </div>
        </div>
        <div className="fab">+</div>
      </div>
    </Device>
  );
}

/* ============== OPTION B — LAYERED ============== */
function OptionB() {
  return (
    <Device screenClass="screenB">
      <div className="B">
        <div className="top">
          <div>
            <div className="hi">Hi Anna</div>
            <div className="sub">Sunday, 7 June</div>
          </div>
          <div className="ava"><E>🥑</E></div>
        </div>

        <div className="cal">
          {WEEK.map((d, i) => (
            <div className={"day" + (d.today ? " today" : "")} key={i}>
              <div className="wd">{d.wd}</div>
              <div className="dn">{d.dn}</div>
              <div className={"dot" + (d.extra ? "" : " off")}></div>
            </div>
          ))}
        </div>

        <div className="scroll">
          <div className="lcard">
            <div className="badge">1,750<small>KCAL · 4 DAYS</small></div>
            <div className="hero">
              <span className="big"><E>🐟</E></span>
              <div className="mini"><span><E>🍠</E></span><span><E>🥦</E></span><span><E>🍗</E></span></div>
            </div>
            <div className="band">Prep runs 5 – 9 June</div>
            <div className="foot">
              <div className="ti">
                <h4>Meal Prep</h4>
                <span className="order">Open <E>↗</E></span>
              </div>
              <div className="chips">
                <span>4 items</span><span>Salmon</span><span>Sweet Potato</span><span>+2</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bud">
          <div className="r">
            <span className="t">Cycle budget</span>
            <span className="n"><b>5,180</b> / 8,000</span>
          </div>
          <div className="track"><i className="g"></i><i className="p"></i></div>
        </div>

        <div className="list">
          {FOODS.slice(0, 3).map((f, i) => (
            <div className="li" key={i}>
              <div className="av"><E>{f.e}</E></div>
              <div className="txt">
                <div className="nm">{f.n}</div>
                <div className="mt">{f.w}</div>
              </div>
              <div className="kc">{f.k.toLocaleString()}</div>
            </div>
          ))}
        </div>
        <div className="fab">+</div>
      </div>
    </Device>
  );
}

/* ============== OPTION C — SMART GANTT ============== */
function OptionC() {
  return (
    <Device screenClass="screenC">
      <div className="C">
        <div className="top">
          <div>
            <div className="hi">Hi Anna</div>
            <div className="sub">Sunday, 7 June</div>
          </div>
          <div className="pill">
            <span className="ring"><i></i></span>
            <b>65%</b>
          </div>
        </div>

        <div className="week">
          {WEEK.map((d, i) => (
            <div className={"d" + (d.today ? " today" : "")} key={i}>
              {d.wd}<b>{d.dn}</b>
            </div>
          ))}
        </div>

        <div className="lane">
          <div className="lh">Meal prep · the bar is your budget</div>
          <div className="meter">
            <div className="fill"></div>
            <div className="fill ext"></div>
            <div className="new">+</div>
            <div className="content">
              <div className="ttl">Meal Prep<small>5,180 / 8,000 kcal</small></div>
              <div className="beads">
                <span><E>🐟</E></span><span><E>🍠</E></span><span><E>🥦</E></span>
              </div>
            </div>
          </div>
        </div>

        <div className="stats">
          <div className="stat hl">
            <div className="l">Left this cycle</div>
            <div className="v">2,820<small> kcal</small></div>
          </div>
          <div className="stat">
            <div className="l">Per day</div>
            <div className="v">705<small> kcal</small></div>
          </div>
        </div>

        <div className="items">
          {FOODS.slice(0, 3).map((f, i) => (
            <div className="ci" key={i}>
              <div className="av"><E>{f.e}</E></div>
              <div className="txt">
                <div className="nm">{f.n}</div>
                <div className="mt">{f.w} · {f.k.toLocaleString()} kcal</div>
              </div>
              <div className="mini"><i style={{ width: f.pct + '%' }}></i></div>
            </div>
          ))}
        </div>
        <div className="fab">+</div>
      </div>
    </Device>
  );
}

/* ============== OPTION D — FOREST ============== */
function OptionD() {
  return (
    <Device screenClass="screenD" dark>
      <div className="D">
        <div className="hero">
          <div className="gleam"></div>
          <div className="htop">
            <div>
              <div className="hi">Hi Anna</div>
              <div className="sub">Sunday, 7 June</div>
            </div>
            <div className="av"><E>🥑</E></div>
          </div>
          <div className="ring">
            <div className="circ"><div className="in"><b>65%</b><small>ON BUDGET</small></div></div>
            <div className="meta">
              <div className="lg">5,180 kcal</div>
              <div className="row"><i style={{ background: 'var(--lime)' }}></i>Meal prep · 4,720</div>
              <div className="row"><i style={{ background: 'var(--rose)' }}></i>Extra · 460</div>
            </div>
          </div>
        </div>

        <div className="cal">
          {WEEK.map((d, i) => (
            <div className={"day" + (d.today ? " today" : "")} key={i}>
              <div className="wd">{d.wd}</div>
              <div className="dn">{d.dn}</div>
              <div className={"dot" + (d.extra ? "" : " off")}></div>
            </div>
          ))}
        </div>

        <div className="gw">
          <div className="lh">Meal prep timeline</div>
          <div className="bar">
            <div className="l">Meal Prep<small>5 – 9 June</small></div>
            <div className="beads"><span><E>🐟</E></span><span><E>🍠</E></span><span><E>🥦</E></span></div>
          </div>
        </div>

        <div className="items">
          {FOODS.slice(0, 3).map((f, i) => (
            <div className="di" key={i}>
              <div className="av"><E>{f.e}</E></div>
              <div className="txt">
                <div className="nm">{f.n}</div>
                <div className="mt">{f.w}</div>
              </div>
              <div className="kc">{f.k.toLocaleString()} kcal</div>
            </div>
          ))}
        </div>
        <div className="fab">+</div>
      </div>
    </Device>
  );
}

Object.assign(window, { OptionA, OptionB, OptionC, OptionD });
