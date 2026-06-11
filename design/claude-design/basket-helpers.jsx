/* Basket prototype — dates, data, atoms. Exports to window. */

/* ---------- date utils (string ISO, no Date tz traps) ---------- */
const MS = 86400000;
function parseISO(s){ const [y,m,d]=s.split('-').map(Number); return Date.UTC(y,m-1,d); }
function toISO(ms){ const d=new Date(ms); const p=n=>String(n).padStart(2,'0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())}`; }
function addDays(iso,n){ return toISO(parseISO(iso)+n*MS); }
function daysBetween(a,b){ return Math.round((parseISO(b)-parseISO(a))/MS); }
const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDay(iso){ const d=new Date(parseISO(iso)); return { wd:WD[d.getUTCDay()], dn:d.getUTCDate(), mo:MO[d.getUTCMonth()] }; }
function fmtRange(a,b){ const x=fmtDay(a),y=fmtDay(b); return `${x.dn} ${x.mo} – ${y.dn} ${y.mo}`; }
function fmtLong(iso){ const d=new Date(parseISO(iso)); const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MO[d.getUTCMonth()]}`; }

const TODAY = '2026-06-07';
const GOAL = 2000;

/* ---------- seed data ---------- */
const SEED = {
  cycles: [
    { id:'c1', start:'2026-06-05', end:'2026-06-09', items:[
      { id:'i1', e:'🐟', n:'Salmon',       w:600, k:1254, src:'barcode' },
      { id:'i2', e:'🍠', n:'Sweet Potato', w:500, k:430,  src:'manual'  },
      { id:'i3', e:'🥬', n:'Kale',         w:200, k:66,   src:'manual'  },
      { id:'i4', e:'🛒', n:'Gala Apples',  w:670, k:342,  src:'manual'  },
    ], overrides:{} },
  ],
  extras: [
    { id:'x1', date:'2026-06-06', name:'Protein Bar',      kcal:220 },
    { id:'x2', date:'2026-06-08', name:'Coffee + Oat Milk', kcal:90 },
  ],
  pantry: [
    { id:'p1', e:'🌾', n:'Oats',      per100:379, dailyG:40 },
    { id:'p2', e:'🫒', n:'Olive Oil', per100:884, dailyG:12 },
    { id:'p3', e:'🍚', n:'Rice',      per100:360, dailyG:60 },
  ],
};

/* quick-add catalogue for the FAB sheet */
const CATALOG = [
  { e:'🍗', n:'Chicken Breast', w:800, k:880 },
  { e:'🥦', n:'Broccoli',       w:600, k:204 },
  { e:'🥚', n:'Eggs (×12)',     w:660, k:910 },
  { e:'🍚', n:'Brown Rice',     w:500, k:650 },
  { e:'🥑', n:'Avocado',        w:400, k:640 },
  { e:'🐟', n:'Salmon',         w:600, k:1254 },
  { e:'🧀', n:'Cheddar',        w:250, k:1000 },
  { e:'🫐', n:'Blueberries',    w:300, k:171 },
];
const EXTRA_CATALOG = [
  { n:'Protein Bar',  kcal:220 },
  { n:'Cappuccino',   kcal:120 },
  { n:'Banana',       kcal:105 },
  { n:'Dark Chocolate (2 sq)', kcal:110 },
];

/* ---------- nutrition ---------- */
function cycleDays(c){ return daysBetween(c.start,c.end)+1; }
function mealPrepKcal(c){ return c.items.reduce((s,i)=>s+i.k,0); }
function pantryGrams(p,c){ const o=c.overrides?.[p.id]; return o!=null?o:p.dailyG*cycleDays(c); }
function pantryKcal(p,c){ return Math.round(pantryGrams(p,c)*p.per100/100); }
function pantryTotal(pantry,c){ return pantry.reduce((s,p)=>s+pantryKcal(p,c),0); }
function extrasInRange(extras,c){ return extras.filter(x=>x.date>=c.start&&x.date<=c.end); }
function extrasKcal(extras,c){ return extrasInRange(extras,c).reduce((s,x)=>s+x.kcal,0); }
function cycleBudget(c){ return cycleDays(c)*GOAL; }

/* ---------- atoms ---------- */
const E = ({children,s}) => <span className="emoji" style={s?{fontSize:s}:null}>{children}</span>;

const StatusBar = () => (
  <div className="statusbar">
    <span>9:41</span>
    <span className="sb-right">
      <span className="sb-bars"><i></i><i></i><i></i><i></i></span>
      <span className="sb-wifi"></span><span className="sb-batt"></span>
    </span>
  </div>
);

const Device = ({children}) => (
  <div className="device"><div className="screen">
    <StatusBar/>{children}<div className="home-ind"></div>
  </div></div>
);

Object.assign(window, {
  addDays, daysBetween, fmtDay, fmtRange, fmtLong, TODAY, GOAL,
  SEED, CATALOG, EXTRA_CATALOG,
  cycleDays, mealPrepKcal, pantryGrams, pantryKcal, pantryTotal,
  extrasInRange, extrasKcal, cycleBudget,
  E, StatusBar, Device,
});
