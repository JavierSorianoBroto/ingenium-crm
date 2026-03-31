import { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { supabase } from "./supabase.js";
import Login from "./Login.jsx";
// NOTE: XLSX is dynamically imported inside exportToExcel to avoid bundling/server issues on platforms like Vercel


// ─── STATIC CONSTANTS ────────────────────────────────────────────────────────
const STAGES = [
  { id:'NEW_OPPORTUNITY', label:'New Opportunity', icon:'◔', color:'#60a5fa' },
  { id:'STUDYING',        label:'Studying',        icon:'◑', color:'#a78bfa' },
  { id:'PROPOSAL',        label:'Proposal',        icon:'◕', color:'#fb923c' },
  { id:'NEGOTIATING',     label:'Negotiating',     icon:'◕', color:'#fbbf24' },
  { id:'SECURED',         label:'Secured',         icon:'●', color:'#34d399' },
  { id:'LOST',            label:'Lost',            icon:'●', color:'#f87171' },
];
const PRIORITIES   = ['Urgent','Hurry','Standard','Low','Very Low','N/A'];
const ACTIONS_LIST = ['Asking Docs','Waiting for Docs','Docs Checking','Technical Analysis Producing','Price Negotiating','Waiting for PO','Preparing the Proposal','Proposal Submitted','Arranging Meeting','Financial solution searching'];
const KIND_PROJECT = ['Sales','Development','Advisory','Service','Turn key','Renting'];
const CLASS_CO     = ['EPC Company','Distributor','Utility/IPP','Developer','ESCo Company','System Integrator','Installer','Engineering Company','Manufacturer'];
const REGIONS      = ['Nord','Nord Est','Nord Ovest','Centro','Sud','Isole','Estero'];
const KIND_CONTACT = ['Agency','Distributor','Partner','Installer'];
const ROLES        = ['Buyer','CEO/DG','Technical/Specifier','Mayor','Sales','User'];
const PROBS        = [0.05,0.25,0.5,0.75,0.9];
const PRODUCT_CATS = ['Product','Service','Software','Hardware','Consulting','Maintenance'];

// ─── COLORS ───────────────────────────────────────────────────────────────────
const DARK = {
  bg:'#04101d', surface:'#081a2e', card:'#0c2240', border:'#153352',
  accent:'#00e5b0', accentDim:'rgba(0,229,176,.12)', blue:'#1d8cf8',
  text:'#c5daf0', muted:'#4d7597', danger:'#f87171', success:'#34d399',
  warning:'#fbbf24', orange:'#fb923c', purple:'#a78bfa',
};
const LIGHT_COLORS = {
  bg:'#f6f8fb',
  surface:'#ffffff',
  card:'#ffffff',
  border:'#e5eaf2',
  
  accent:'#2563eb',
  accentDim:'rgba(37,99,235,.08)',
  blue:'#2563eb',

  text:'#0f172a',
  muted:'#64748b',

  danger:'#dc2626',
  success:'#16a34a',
  warning:'#d97706',
  orange:'#ea580c',
  purple:'#7c3aed',
};

// module-level theme holder used by primitives that reference C
let C = DARK;

const inp = (C) => ({ 
  width:'100%', 
  background:C.surface,
  border:`1px solid ${C.border}`, 
  color:C.text, 
  padding:'9px 12px', 
  borderRadius:8,
  fontSize:12, 
  fontFamily:"'IBM Plex Mono',monospace", 
  boxSizing:'border-box', 
  outline:'none' 
});
const stageMap      = Object.fromEntries(STAGES.map(s=>[s.id,s]));
const priorityColor = (p, C) => ({Urgent:C.danger,Hurry:C.orange,Standard:C.blue,Low:C.muted,'Very Low':C.muted,'N/A':C.muted})[p]||C.muted;const fmtK   = n => n ? `€${(n/1000).toFixed(1)}K` : '€0';
const fmtEur = n => n ? `€${Number(n).toLocaleString('it-IT')}` : '€0';
const daysSince = d => { if(!d) return '–'; return Math.floor((Date.now()-new Date(d))/86400000); };
const CHART_COLORS = ['#60a5fa','#a78bfa','#fb923c','#fbbf24','#34d399','#f87171','#00e5b0','#1d8cf8'];

// ─── SUPABASE HELPERS ─────────────────────────────────────────────────────────
async function dbLoad(table) {
  const { data, error } = await supabase.from(table).select('*').order('id');
  if (error) { console.error(`Error loading ${table}:`, error); return []; }
  return data || [];
}
async function dbInsert(table, row) {
  const { id: _id, ...rest } = row;
 // Remove id if present, Supabase auto-generates it
  const { data, error } = await supabase.from(table).insert(rest).select().single();
  if (error) { console.error(`Error inserting ${table}:`, error); return null; }
  return data;
}
async function dbUpdate(table, row) {
  const { data, error } = await supabase.from(table).update(row).eq('id', row.id).select().single();
  if (error) { console.error(`Error updating ${table}:`, error); return null; }
  return data;
}
async function dbDelete(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) console.error(`Error deleting ${table}:`, error);
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
const NAV = [
  { id:'dashboard',    label:'Dashboard',     icon:'▤' },
  { id:'projects',     label:'Projects',      icon:'◈' },
  { id:'opportunities',label:'Opportunities', icon:'◆' },
  { id:'lop',          label:'LOP',           icon:'≡' },
  { id:'companies',    label:'Companies',     icon:'◉' },
  { id:'leads',        label:'Leads',         icon:'◎' },
  { id:'partners',     label:'Partners',      icon:'◐' },
  { id:'settings',     label:'Settings',      icon:'⚙' },
];

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
const Badge = ({ label, color }) => (
  <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:4, fontSize:10, background:color+'22', color, border:`1px solid ${color}44`, whiteSpace:'nowrap' }}>{label}</span>
);
const Btn = ({ children, onClick, variant='primary', style={} }) => (
  <button onClick={onClick} style={{ padding:'7px 14px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11, fontFamily:"'IBM Plex Mono',monospace", fontWeight:600, background:variant==='primary'?C.accent:variant==='danger'?C.danger:C.border, color:variant==='primary'?C.bg:C.text, ...style }}>{children}</button>
);
const Field = ({ label, children, span=1 }) => (
  <div style={{ gridColumn:`span ${span}` }}>
    <div style={{ fontSize:9, color:C.muted, marginBottom:4, textTransform:'uppercase', letterSpacing:.8 }}>{label}</div>
    {children}
  </div>
);
// merge theme styles with any passed inline style
const Inp = (props) => <input {...props} style={{ ...inp(C), ...props.style }} />;
const Sel = ({ children, ...p }) => <select {...p} style={{ ...inp(C), cursor:'pointer', ...p.style }}>{children}</select>;
const Tx  = (props) => <textarea {...props} style={{ ...inp(C), minHeight:60, resize:'vertical', ...props.style }} />;

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, onSave, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:28, width:700, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 80px rgba(0,0,0,.8)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <span style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:18, fontWeight:700, color:C.accent }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:18 }}>✕</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>{children}</div>
        <div style={{ marginTop:20, display:'flex', gap:10, justifyContent:'flex-end' }}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={onSave}>Save</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── DATA TABLE ───────────────────────────────────────────────────────────────
function DataTable({ cols, rows, onEdit, onDelete }) {
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead>
          <tr>{cols.map(c=><th key={c.key} style={{ padding:'9px 12px', textAlign:'left', color:C.muted, fontSize:9, textTransform:'uppercase', letterSpacing:.8, borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>{c.label}</th>)}<th style={{ padding:'9px 12px', borderBottom:`1px solid ${C.border}` }}></th></tr>
        </thead>
        <tbody>
          {rows.length===0&&<tr><td colSpan={cols.length+1} style={{ padding:'24px 12px', textAlign:'center', color:C.muted, fontSize:11 }}>No records yet. Click "+ New" to add one.</td></tr>}
          {rows.map(row=>(
            <tr key={row.id} style={{ borderBottom:`1px solid ${C.border}22` }}>
              {cols.map(c=><td key={c.key} style={{ padding:'9px 12px', color:C.text, verticalAlign:'middle' }}>{c.render?c.render(row[c.key],row):(row[c.key]||'–')}</td>)}
              <td style={{ padding:'9px 12px', whiteSpace:'nowrap', textAlign:'right' }}>
                <Btn variant="secondary" onClick={()=>onEdit(row)} style={{ marginRight:6, fontSize:10, padding:'4px 10px' }}>Edit</Btn>
                <Btn variant="danger"    onClick={()=>onDelete(row.id)} style={{ fontSize:10, padding:'4px 10px' }}>✕</Btn>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:22, marginBottom:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <span style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:16, fontWeight:700 }}>{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── KPI CARD ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon, C }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:'16px 20px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:10, right:14, fontSize:22, opacity:.15 }}>{icon}</div>
      <div style={{ fontSize:9, color:C.muted, textTransform:'uppercase', letterSpacing:1 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:700, fontFamily:"'Rajdhani',sans-serif", color:color||C.accent, marginTop:5, lineHeight:1 }}>{value}</div>
      {sub&&<div style={{ fontSize:9, color:C.muted, marginTop:5 }}>{sub}</div>}
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ companies, projects, opportunities, C }) {
  const total      = opportunities.reduce((a,b)=>a+(b.amount||0),0);
  const weighted   = opportunities.reduce((a,b)=>a+(b.amount||0)*(b.probability||0),0);
  const secured    = opportunities.filter(o=>o.stage==='SECURED');
  const lost       = opportunities.filter(o=>o.stage==='LOST');
  const closed     = secured.length+lost.length;
  const winRate    = closed>0?(secured.length/closed*100).toFixed(0):0;
  const avgDeal    = opportunities.length>0?total/opportunities.length:0;
  const activeOpps = opportunities.filter(o=>!['SECURED','LOST'].includes(o.stage));
  const urgentCnt  = activeOpps.filter(o=>o.priority==='Urgent'||o.priority==='Hurry').length;
  const securedAmt = secured.reduce((a,b)=>a+(b.amount||0),0);

  const stageData = STAGES.map(s=>({
    shortName: s.id==='NEW_OPPORTUNITY'?'New':s.label.split(' ')[0],
    amount: opportunities.filter(o=>o.stage===s.id).reduce((a,b)=>a+(b.amount||0),0)/1000,
    count:  opportunities.filter(o=>o.stage===s.id).length,
    color: s.color,
  }));

  const scopeData = useMemo(()=>{
    const map={};
    opportunities.forEach(o=>{const k=o.scope||'Other';map[k]=(map[k]||0)+(o.amount||0)/1000;});
    return Object.entries(map).map(([name,value])=>({name,value:+value.toFixed(1)}));
  },[opportunities]);

  const respData = useMemo(()=>{
    const map={};
    opportunities.forEach(o=>{const r=o.responsible||'Unknown';map[r]=(map[r]||0)+(o.amount||0)/1000;});
    return Object.entries(map).map(([name,value])=>({name,value:+value.toFixed(1)}));
  },[opportunities]);

  const probData = PROBS.map(p=>({
    name:`${(p*100).toFixed(0)}%`,
    count: opportunities.filter(o=>o.probability===p).length,
  }));

  const monthlyData = useMemo(()=>{
    const map={};
    opportunities.forEach(o=>{
      if(!o.inserted)return;
      const ym=o.inserted.slice(0,7);
      if(!map[ym])map[ym]={month:ym,amount:0,count:0};
      map[ym].amount+=(o.amount||0)/1000;
      map[ym].count+=1;
    });
    return Object.values(map).sort((a,b)=>a.month.localeCompare(b.month)).slice(-12);
  },[opportunities]);

  const funnelData = STAGES.filter(s=>s.id!=='LOST').map(s=>({
    name: s.id==='NEW_OPPORTUNITY'?'New':s.label,
    value: opportunities.filter(o=>o.stage===s.id).length,
    color: s.color,
  }));

  const empty = <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:180, color:C.muted, fontSize:11 }}>No data yet</div>;

  const kpis1 = [
    { label:'Total Pipeline',    value:fmtK(total),       sub:`${opportunities.length} opportunities`, color:C.accent,   icon:'◆' },
    { label:'Weighted Pipeline', value:fmtK(weighted),    sub:'probability-adjusted',                  color:C.blue,     icon:'◈' },
    { label:'Secured Amount',    value:fmtK(securedAmt),  sub:`${secured.length} deals won`,           color:C.success,  icon:'●' },
    { label:'Win Rate',          value:`${winRate}%`,     sub:`${closed} total closed`,                color:+winRate>=50?C.success:C.warning, icon:'◎' },
  ];
  const kpis2 = [
    { label:'Avg. Deal Size',    value:fmtK(avgDeal),     sub:'per opportunity',                       color:C.orange,   icon:'◕' },
    { label:'Active Opps',       value:activeOpps.length, sub:`${urgentCnt} urgent/hurry`,             color:C.warning,  icon:'◔' },
    { label:'Companies',         value:companies.length,  sub:'in database',                           color:C.purple,   icon:'◉' },
    { label:'Projects',          value:projects.length,   sub:'total projects',                        color:C.muted,    icon:'◈' },
  ];

  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:12 }}>
        {kpis1.map(k=><KpiCard key={k.label} {...k} C={C} />)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:18 }}>
        {kpis2.map(k=><KpiCard key={k.label} {...k} C={C} />)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:14, marginBottom:14 }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:14, color:C.muted }}>Pipeline by Stage (K€)</div>
          {opportunities.length>0?(
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stageData} margin={{ left:-10 }}>
                <XAxis dataKey="shortName" tick={{ fontSize:9, fill:C.muted }} />
                <YAxis tick={{ fontSize:9, fill:C.muted }} />
                <Tooltip contentStyle={{ background:C.surface, border:`1px solid ${C.border}`, fontSize:11, color:C.text }} formatter={v=>`€${(+v).toFixed(1)}K`} />
                <Bar dataKey="amount" radius={[4,4,0,0]}>
                  {stageData.map((s,i)=><Cell key={i} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ):empty}
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:10, color:C.muted }}>Scope of Work</div>
          {scopeData.length>0?(
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={scopeData} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={28}>
                    {scopeData.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background:C.surface, border:`1px solid ${C.border}`, fontSize:11, color:C.text }} formatter={v=>`€${v}K`} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:4 }}>
                {scopeData.map((s,i)=><Badge key={i} label={s.name} color={CHART_COLORS[i%CHART_COLORS.length]} />)}
              </div>
            </>
          ):empty}
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:14 }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:14, color:C.muted }}>Amount / Responsible (K€)</div>
          {respData.length>0?(
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={respData} layout="vertical" margin={{ left:0 }}>
                <XAxis type="number" tick={{ fontSize:9, fill:C.muted }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:C.text }} width={80} />
                <Tooltip contentStyle={{ background:C.surface, border:`1px solid ${C.border}`, fontSize:11, color:C.text }} formatter={v=>`€${v}K`} />
                <Bar dataKey="value" fill={C.accent} radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          ):empty}
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:14, color:C.muted }}>Probability Distribution</div>
          {opportunities.length>0?(
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={probData} margin={{ left:-10 }}>
                <XAxis dataKey="name" tick={{ fontSize:10, fill:C.muted }} />
                <YAxis tick={{ fontSize:9, fill:C.muted }} allowDecimals={false} />
                <Tooltip contentStyle={{ background:C.surface, border:`1px solid ${C.border}`, fontSize:11, color:C.text }} />
                <Bar dataKey="count" fill={C.blue} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ):empty}
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:12, color:C.muted }}>Sales Funnel</div>
          {opportunities.length>0?(
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {funnelData.map((f,i)=>{
                const max=funnelData[0]?.value||1;
                const pct=max>0?(f.value/max*100):0;
                return(
                  <div key={i}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:9, color:C.muted }}>{f.name}</span>
                      <span style={{ fontSize:9, color:f.color, fontWeight:700 }}>{f.value}</span>
                    </div>
                    <div style={{ height:10, background:C.surface, borderRadius:5, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:f.color, borderRadius:5 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ):empty}
        </div>
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:20 }}>
        <div style={{ fontSize:12, fontWeight:600, marginBottom:14, color:C.muted }}>Monthly Opportunities Trend (K€)</div>
        {monthlyData.length>0?(
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fontSize:9, fill:C.muted }} />
              <YAxis tick={{ fontSize:9, fill:C.muted }} />
              <Tooltip contentStyle={{ background:C.surface, border:`1px solid ${C.border}`, fontSize:11, color:C.text }} formatter={v=>`€${(+v).toFixed(1)}K`} />
              <Line type="monotone" dataKey="amount" stroke={C.accent} strokeWidth={2} dot={{ fill:C.accent, r:3 }} />
            </LineChart>
          </ResponsiveContainer>
        ):empty}
      </div>
    </>
  );
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function Settings({ responsibles, setResponsibles, products, setProducts, C }) {
  const blankR = { name:'', role:'', email:'', tel:'' };
  const blankP = { name:'', category:'', listPrice:0, unit:'', description:'' };
  const [rModal,setRModal] = useState(false);
  const [rForm, setRForm]  = useState(blankR);
  const [pModal,setPModal] = useState(false);
  const [pForm, setPForm]  = useState(blankP);

  const saveR = async () => {
    if(rForm.id){const u=await dbUpdate('responsibles',rForm);if(u)setResponsibles(d=>d.map(x=>x.id===rForm.id?u:x));}
    else{const c=await dbInsert('responsibles',rForm);if(c)setResponsibles(d=>[...d,c]);}
    setRModal(false);
  };
  const openR = row => { setRForm(row||blankR); setRModal(true); };
  const deleteR = async id => { await dbDelete('responsibles',id); setResponsibles(d=>d.filter(x=>x.id!==id)); };

  const saveP = async () => {
    if(pForm.id){const u=await dbUpdate('products',pForm);if(u)setProducts(d=>d.map(x=>x.id===pForm.id?u:x));}
    else{const c=await dbInsert('products',pForm);if(c)setProducts(d=>[...d,c]);}
    setPModal(false);
  };
  const openP = row => { setPForm(row||blankP); setPModal(true); };
  const deleteP = async id => { await dbDelete('products',id); setProducts(d=>d.filter(x=>x.id!==id)); };

  const rCols = [
    { key:'name',  label:'Full Name',  render:v=><b style={{color:C.accent}}>{v}</b> },
    { key:'role',  label:'Role',       render:v=>v?<Badge label={v} color={C.blue}/>:'–' },
    { key:'email', label:'Email' },
    { key:'tel',   label:'Tel' },
  ];
  const pCols = [
    { key:'name',      label:'Name',       render:v=><b style={{color:C.accent}}>{v}</b> },
    { key:'category',  label:'Category',   render:v=>v?<Badge label={v} color={C.orange}/>:'–' },
    { key:'listPrice', label:'List Price', render:v=><span style={{color:C.success,fontWeight:700}}>{fmtEur(v)}</span> },
    { key:'unit',      label:'Unit' },
    { key:'description',label:'Description',render:v=>v?<span style={{color:C.muted,fontSize:10}}>{v.slice(0,50)}{v.length>50?'…':''}</span>:'–' },
  ];

  return (
    <>
      {(responsibles.length===0||products.length===0)&&(
        <div style={{ background:`${C.warning}11`, border:`1px solid ${C.warning}44`, borderRadius:8, padding:'12px 18px', marginBottom:18, fontSize:11, color:C.warning }}>
          ⚠ &nbsp;Configure your team and catalogue before creating Projects and Opportunities.
        </div>
      )}
      <Section title={`Responsibles (${responsibles.length})`} action={<Btn onClick={()=>openR(null)}>+ Add Responsible</Btn>}>
        <DataTable cols={rCols} rows={responsibles} onEdit={openR} onDelete={deleteR} />
      </Section>
      <Section title={`Products & Services (${products.length})`} action={<Btn onClick={()=>openP(null)}>+ Add Product / Service</Btn>}>
        <DataTable cols={pCols} rows={products} onEdit={openP} onDelete={deleteP} />
      </Section>
      {rModal&&(
        <Modal title={rForm.id?'Edit Responsible':'New Responsible'} onClose={()=>setRModal(false)} onSave={saveR}>
          <Field label="Full Name" span={2}><Inp value={rForm.name} onChange={e=>setRForm({...rForm,name:e.target.value})} placeholder="e.g. Mario Rossi" /></Field>
          <Field label="Role"><Inp value={rForm.role} onChange={e=>setRForm({...rForm,role:e.target.value})} placeholder="e.g. Sales Manager" /></Field>
          <Field label="Tel"><Inp value={rForm.tel} onChange={e=>setRForm({...rForm,tel:e.target.value})} /></Field>
          <Field label="Email" span={2}><Inp value={rForm.email} onChange={e=>setRForm({...rForm,email:e.target.value})} /></Field>
        </Modal>
      )}
      {pModal&&(
        <Modal title={pForm.id?'Edit Product/Service':'New Product / Service'} onClose={()=>setPModal(false)} onSave={saveP}>
          <Field label="Name" span={2}><Inp value={pForm.name} onChange={e=>setPForm({...pForm,name:e.target.value})} placeholder="e.g. ENDURANCE 100 kWh" /></Field>
          <Field label="Category"><Sel value={pForm.category} onChange={e=>setPForm({...pForm,category:e.target.value})}><option value="">–</option>{PRODUCT_CATS.map(c=><option key={c}>{c}</option>)}</Sel></Field>
          <Field label="Unit"><Inp value={pForm.unit} onChange={e=>setPForm({...pForm,unit:e.target.value})} placeholder="e.g. kWh, unit, ora" /></Field>
          <Field label="List Price (€)"><Inp type="number" value={pForm.listPrice} onChange={e=>setPForm({...pForm,listPrice:+e.target.value})} /></Field>
          <Field label="Description" span={2}><Tx value={pForm.description} onChange={e=>setPForm({...pForm,description:e.target.value})} /></Field>
        </Modal>
      )}
    </>
  );
}

// ─── COMPANIES ────────────────────────────────────────────────────────────────
function Companies({ data, setData, C }) {
  const blank={name:'',cls:'',province:'',region:'',tel:'',email:'',address:'',comments:'',date:new Date().toISOString().slice(0,10)};
  const [modal,setModal]=useState(null);const [form,setForm]=useState(blank);
  const [search,setSearch]=useState('');
  const open=row=>{setForm(row||blank);setModal(row?'edit':'new');};
  const save=async()=>{
    if(modal==='new'){const r=await dbInsert('companies',form);if(r)setData(d=>[...d,r]);}
    else{const r=await dbUpdate('companies',form);if(r)setData(d=>d.map(x=>x.id===form.id?r:x));}
    setModal(null);
  };
  const del=async id=>{await dbDelete('companies',id);setData(d=>d.filter(x=>x.id!==id));};
  const cols=[
    {key:'name',label:'Company Name',render:v=><b style={{color:C.text}}>{v}</b>},
    {key:'cls',label:'Class',render:v=>v?<Badge label={v} color={C.blue}/>:'–'},
    {key:'province',label:'Province'},{key:'region',label:'Region'},
    {key:'tel',label:'Tel'},{key:'email',label:'Email'},
    {key:'comments',label:'Notes',render:v=>v?<span style={{color:C.muted,fontSize:11}}>{v.slice(0,40)}{v.length>40?'…':''}</span>:'–'},
  ];
  return(
    <>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
  <input style={{...inp(C), width:300}} placeholder="🔍 Search by name, province, email..." value={search} onChange={e=>setSearch(e.target.value)} />
  <Btn onClick={()=>open(null)}>+ New Company</Btn>
</div>
<Section title={`Companies (${data.length})`}>
  <DataTable cols={cols} rows={data.filter(r=>!search||JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))} onEdit={open} onDelete={del} />
</Section>
      {modal&&(<Modal title={modal==='new'?'New Company':'Edit Company'} onClose={()=>setModal(null)} onSave={save}>
        <Field label="Company Name" span={2}><Inp value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
        <Field label="Class"><Sel value={form.cls} onChange={e=>setForm({...form,cls:e.target.value})}><option value="">–</option>{CLASS_CO.map(c=><option key={c}>{c}</option>)}</Sel></Field>
        <Field label="Province"><Inp value={form.province} onChange={e=>setForm({...form,province:e.target.value})} /></Field>
        <Field label="Region"><Sel value={form.region} onChange={e=>setForm({...form,region:e.target.value})}><option value="">–</option>{REGIONS.map(r=><option key={r}>{r}</option>)}</Sel></Field>
        <Field label="Tel"><Inp value={form.tel} onChange={e=>setForm({...form,tel:e.target.value})} /></Field>
        <Field label="Email" span={2}><Inp value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></Field>
        <Field label="Address" span={2}><Inp value={form.address} onChange={e=>setForm({...form,address:e.target.value})} /></Field>
        <Field label="Comments" span={2}><Tx value={form.comments} onChange={e=>setForm({...form,comments:e.target.value})} /></Field>
      </Modal>)}
    </>
  );
}

// ─── LEADS ────────────────────────────────────────────────────────────────────
function Leads({ data, setData, C }) {
  const blank={surname:'',name:'',role:'',company:'',province:'',region:'',tel:'',email:'',address:'',comments:'',date:new Date().toISOString().slice(0,10)};
  const [modal,setModal]=useState(null);const [form,setForm]=useState(blank);
  const open=row=>{setForm(row||blank);setModal(row?'edit':'new');};
  const save=async()=>{
    if(modal==='new'){const r=await dbInsert('leads',form);if(r)setData(d=>[...d,r]);}
    else{const r=await dbUpdate('leads',form);if(r)setData(d=>d.map(x=>x.id===form.id?r:x));}
    setModal(null);
  };
  const del=async id=>{await dbDelete('leads',id);setData(d=>d.filter(x=>x.id!==id));};
  const cols=[
    {key:'surname',label:'Name',render:(_,r)=><b style={{color:C.text}}>{r.surname} {r.name}</b>},
    {key:'role',label:'Role',render:v=>v?<Badge label={v} color={C.orange}/>:'–'},
    {key:'company',label:'Company'},{key:'province',label:'Province'},
    {key:'tel',label:'Tel'},{key:'email',label:'Email'},{key:'date',label:'Date'},
  ];
  return(
    <>
      <Section title={`Leads (${data.length})`} action={<Btn onClick={()=>open(null)}>+ New Lead</Btn>}>
        <DataTable cols={cols} rows={data} onEdit={open} onDelete={del} />
      </Section>
      {modal&&(<Modal title={modal==='new'?'New Lead':'Edit Lead'} onClose={()=>setModal(null)} onSave={save}>
        <Field label="Surname"><Inp value={form.surname} onChange={e=>setForm({...form,surname:e.target.value})} /></Field>
        <Field label="Name"><Inp value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
        <Field label="Role"><Sel value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="">–</option>{ROLES.map(r=><option key={r}>{r}</option>)}</Sel></Field>
        <Field label="Company"><Inp value={form.company} onChange={e=>setForm({...form,company:e.target.value})} /></Field>
        <Field label="Province"><Inp value={form.province} onChange={e=>setForm({...form,province:e.target.value})} /></Field>
        <Field label="Region"><Sel value={form.region} onChange={e=>setForm({...form,region:e.target.value})}><option value="">–</option>{REGIONS.map(r=><option key={r}>{r}</option>)}</Sel></Field>
        <Field label="Tel"><Inp value={form.tel} onChange={e=>setForm({...form,tel:e.target.value})} /></Field>
        <Field label="Email"><Inp value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></Field>
        <Field label="Address" span={2}><Inp value={form.address} onChange={e=>setForm({...form,address:e.target.value})} /></Field>
        <Field label="Comments" span={2}><Tx value={form.comments} onChange={e=>setForm({...form,comments:e.target.value})} /></Field>
      </Modal>)}
    </>
  );
}

// ─── PARTNERS ─────────────────────────────────────────────────────────────────
function Partners({ data, setData, C }) {
  const blank={surname:'',name:'',kind:'',tel:'',email:'',company:'',region:'',address:'',comments:''};
  const [modal,setModal]=useState(null);const [form,setForm]=useState(blank);
  const open=row=>{setForm(row||blank);setModal(row?'edit':'new');};
  const save=async()=>{
    if(modal==='new'){const r=await dbInsert('partners',form);if(r)setData(d=>[...d,r]);}
    else{const r=await dbUpdate('partners',form);if(r)setData(d=>d.map(x=>x.id===form.id?r:x));}
    setModal(null);
  };
  const del=async id=>{await dbDelete('partners',id);setData(d=>d.filter(x=>x.id!==id));};
  const cols=[
    {key:'surname',label:'Name/Agency',render:(_,r)=><b style={{color:C.text}}>{r.surname}{r.name?` – ${r.name}`:''}</b>},
    {key:'kind',label:'Kind',render:v=>v?<Badge label={v} color={C.warning}/>:'–'},
    {key:'company',label:'Company'},{key:'region',label:'Region'},
    {key:'tel',label:'Tel'},{key:'email',label:'Email'},
  ];
  return(
    <>
      <Section title={`Partners (${data.length})`} action={<Btn onClick={()=>open(null)}>+ New Partner</Btn>}>
        <DataTable cols={cols} rows={data} onEdit={open} onDelete={del} />
      </Section>
      {modal&&(<Modal title={modal==='new'?'New Partner':'Edit Partner'} onClose={()=>setModal(null)} onSave={save}>
        <Field label="Surname / Agency"><Inp value={form.surname} onChange={e=>setForm({...form,surname:e.target.value})} /></Field>
        <Field label="Name"><Inp value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
        <Field label="Kind of Contact"><Sel value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}><option value="">–</option>{KIND_CONTACT.map(k=><option key={k}>{k}</option>)}</Sel></Field>
        <Field label="Company"><Inp value={form.company} onChange={e=>setForm({...form,company:e.target.value})} /></Field>
        <Field label="Region"><Sel value={form.region} onChange={e=>setForm({...form,region:e.target.value})}><option value="">–</option>{REGIONS.map(r=><option key={r}>{r}</option>)}</Sel></Field>
        <Field label="Tel"><Inp value={form.tel} onChange={e=>setForm({...form,tel:e.target.value})} /></Field>
        <Field label="Email" span={2}><Inp value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></Field>
        <Field label="Address" span={2}><Inp value={form.address} onChange={e=>setForm({...form,address:e.target.value})} /></Field>
        <Field label="Comments" span={2}><Tx value={form.comments} onChange={e=>setForm({...form,comments:e.target.value})} /></Field>
      </Modal>)}
    </>
  );
}

// ─── PROJECTS ─────────────────────────────────────────────────────────────────
function Projects({ data, setData, companies, responsibles, C }) {
  const blank={responsible:'',name:'',municipality:'',province:'',partner:'',partnerFee:0,contact:'',company:'',kind:'Sales',firstContact:'',lastContact:'',followUp:''};
  const [modal,setModal]=useState(null);const [form,setForm]=useState(blank);
  const [search,setSearch]=useState('');
  const open=row=>{setForm(row||blank);setModal(row?'edit':'new');};
  const save=async()=>{
    if(modal==='new'){const r=await dbInsert('projects',form);if(r)setData(d=>[...d,r]);}
    else{const r=await dbUpdate('projects',form);if(r)setData(d=>d.map(x=>x.id===form.id?r:x));}
    setModal(null);
  };
  const del=async id=>{await dbDelete('projects',id);setData(d=>d.filter(x=>x.id!==id));};
  const cols=[
    {key:'id',label:'ID',render:v=><span style={{color:C.muted}}>#{v}</span>},
    {key:'responsible',label:'Responsible',render:v=><Badge label={v||'–'} color={C.blue}/>},
    {key:'name',label:'Project',render:v=><b style={{color:C.text}}>{v}</b>},
    {key:'municipality',label:'Municipality'},
    {key:'company',label:'Company'},
    {key:'kind',label:'Kind',render:v=>v?<Badge label={v} color={C.orange}/>:'–'},
    {key:'lastContact',label:'Last Contact'},
    {key:'followUp',label:'Follow Up',render:v=>{const d=daysSince(v);return<span style={{color:typeof d==='number'&&d<0?C.danger:d<7?C.warning:C.muted}}>{v||'–'}</span>;}},
  ];
  return(
    <>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
  <input style={{...inp(C), width:300}} placeholder="🔍 Search by name, company, municipality..." value={search} onChange={e=>setSearch(e.target.value)} />
  <Btn onClick={()=>open(null)}>+ New Project</Btn>
</div>
<Section title={`Projects (${data.length})`}>
  <DataTable cols={cols} rows={data.filter(r=>!search||JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))} onEdit={open} onDelete={del} />
</Section>
      {modal&&(<Modal title={modal==='new'?'New Project':'Edit Project'} onClose={()=>setModal(null)} onSave={save}>
        <Field label="Responsible">
          <Sel value={form.responsible} onChange={e=>setForm({...form,responsible:e.target.value})}>
            <option value="">–</option>{responsibles.map(r=><option key={r.id}>{r.name}</option>)}
          </Sel>
        </Field>
        <Field label="Kind of Project"><Sel value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}><option value="">–</option>{KIND_PROJECT.map(k=><option key={k}>{k}</option>)}</Sel></Field>
        <Field label="Project Name" span={2}><Inp value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
        <Field label="Municipality"><Inp value={form.municipality} onChange={e=>setForm({...form,municipality:e.target.value})} /></Field>
        <Field label="Province"><Inp value={form.province} onChange={e=>setForm({...form,province:e.target.value})} /></Field>
        <Field label="Company"><Sel value={form.company} onChange={e=>setForm({...form,company:e.target.value})}><option value="">–</option>{companies.map(c=><option key={c.id}>{c.name}</option>)}</Sel></Field>
        <Field label="Contact"><Inp value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} /></Field>
        <Field label="Partner"><Inp value={form.partner} onChange={e=>setForm({...form,partner:e.target.value})} /></Field>
        <Field label="Partner Fee (€)"><Inp type="number" value={form.partnerFee} onChange={e=>setForm({...form,partnerFee:+e.target.value})} /></Field>
        <Field label="First Contact"><Inp type="date" value={form.firstContact} onChange={e=>setForm({...form,firstContact:e.target.value})} /></Field>
        <Field label="Last Contact"><Inp type="date" value={form.lastContact} onChange={e=>setForm({...form,lastContact:e.target.value})} /></Field>
        <Field label="Follow Up"><Inp type="date" value={form.followUp} onChange={e=>setForm({...form,followUp:e.target.value})} /></Field>
      </Modal>)}
    </>
  );
}

// ─── OPPORTUNITIES ────────────────────────────────────────────────────────────
function Opportunities({ data, setData, projects, responsibles, products, C }) {
  const blank={projectId:'',responsible:'',projectName:'',opptyName:'',opportunity:'',scope:'',unitPrice:0,qty:1,amount:0,probability:0.05,stage:'NEW_OPPORTUNITY',priority:'Standard',actions:'',comments:'',inserted:'',offerDate:'',offerNum:''};
  const [modal,setModal]=useState(null);const [form,setForm]=useState(blank);
  const [view,setView]=useState('kanban');
const [search,setSearch]=useState('');
  const open=row=>{setForm(row||blank);setModal(row?'edit':'new');};
  const save=async()=>{
    const f={...form,amount:(form.unitPrice||0)*(form.qty||1)};
    if(modal==='new'){const r=await dbInsert('opportunities',f);if(r)setData(d=>[...d,r]);}
    else{const r=await dbUpdate('opportunities',f);if(r)setData(d=>d.map(x=>x.id===f.id?r:x));}
    setModal(null);
  };
  const del=async id=>{await dbDelete('opportunities',id);setData(d=>d.filter(x=>x.id!==id));};
  const stageOpp=sid=>data.filter(o=>o.stage===sid);
  const scopeOpts=products.length>0?products.map(p=>p.name):['Sales','Development','Advisory','Service','Installation'];

  const cols=[
    {key:'stage',label:'Stage',render:v=>{const s=stageMap[v]||STAGES[0];return<Badge label={`${s.icon} ${s.label}`} color={s.color}/>;}},
    {key:'projectName',label:'Project'},
    {key:'opptyName',label:'Oppty',render:v=><b style={{color:C.text}}>{v}</b>},
    {key:'scope',label:'Product'},
    {key:'amount',label:'Amount',render:v=><span style={{color:C.accent,fontWeight:700}}>{fmtK(v)}</span>},
    {key:'probability',label:'Prob.',render:v=><span style={{color:C.warning}}>{((v||0)*100).toFixed(0)}%</span>},
    {key:'priority',label:'Priority',render:v=><Badge label={v||'–'} color={priorityColor(v, C)}/>},
    {key:'responsible',label:'Resp.',render:v=><Badge label={v||'–'} color={C.blue}/>},
    {key:'actions',label:'Actions',render:v=><span style={{color:C.muted,fontSize:10}}>{v}</span>},
  ];

  return(
    <>
       <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ display:'flex', gap:8 }}>
          {['kanban','table'].map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{ padding:'6px 14px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11, fontFamily:"'IBM Plex Mono',monospace", background:view===v?C.accent:C.border, color:view===v?C.bg:C.text, fontWeight:600 }}>{v==='kanban'?'⬛ Kanban':'≡ Table'}</button>
          ))}
        </div>
        <Btn onClick={()=>open(null)}>+ New Opportunity</Btn>
      </div>
      {view==='kanban'?(
        <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:8 }}>
          {STAGES.map(s=>(
            <div key={s.id} style={{ width:210, flexShrink:0, background:C.surface, borderRadius:8, padding:12, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:10, fontWeight:700, color:s.color, textTransform:'uppercase', letterSpacing:1, marginBottom:8, display:'flex', justifyContent:'space-between' }}>
                <span>{s.icon} {s.label}</span>
                <span style={{ background:s.color+'22', color:s.color, borderRadius:4, padding:'1px 7px' }}>{stageOpp(s.id).length}</span>
              </div>
              {stageOpp(s.id).map(o=>(
                <div key={o.id} onClick={()=>open(o)} style={{ background:C.card, borderRadius:6, padding:'10px 12px', marginBottom:8, border:`1px solid ${C.border}`, cursor:'pointer', borderLeft:`3px solid ${s.color}` }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.text, marginBottom:4 }}>{o.opptyName||o.projectName||'–'}</div>
                  <div style={{ fontSize:10, color:C.muted, marginBottom:6 }}>{o.scope}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:12, color:C.accent, fontWeight:700 }}>{fmtK(o.amount)}</span>
                    <Badge label={o.priority||'–'} color={priorityColor(o.priority, C)} />
                  </div>
                  {o.actions&&<div style={{ fontSize:9, color:C.muted, marginTop:6, borderTop:`1px solid ${C.border}`, paddingTop:5 }}>{o.actions}</div>}
                </div>
              ))}
              {stageOpp(s.id).length===0&&<div style={{ fontSize:10, color:C.muted, textAlign:'center', padding:'12px 0' }}>Empty</div>}
            </div>
          ))}
        </div>
      ):(
        <>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
  <input style={{...inp(C), width:300}} placeholder="🔍 Search by name, stage, product..." value={search} onChange={e=>setSearch(e.target.value)} />
</div>
<Section title={`All Opportunities (${data.length})`}>
  <DataTable cols={cols} rows={data.filter(r=>!search||JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))} onEdit={open} onDelete={del} />
</Section>
</>
      )}
      {modal&&(
        <Modal title={modal==='new'?'New Opportunity':'Edit Opportunity'} onClose={()=>setModal(null)} onSave={save}>
          <Field label="Stage"><Sel value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})}>{STAGES.map(s=><option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}</Sel></Field>
          <Field label="Responsible">
            <Sel value={form.responsible} onChange={e=>setForm({...form,responsible:e.target.value})}>
              <option value="">–</option>{responsibles.map(r=><option key={r.id}>{r.name}</option>)}
            </Sel>
          </Field>
          <Field label="Project">
            <Sel value={form.projectId} onChange={e=>{const p=projects.find(x=>x.id===+e.target.value);setForm({...form,projectId:+e.target.value,projectName:p?p.name:''});}}>
              <option value="">–</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </Sel>
          </Field>
          <Field label="Opportunity Name"><Inp value={form.opptyName} onChange={e=>setForm({...form,opptyName:e.target.value})} /></Field>
          <Field label="Opportunity"><Inp value={form.opportunity} onChange={e=>setForm({...form,opportunity:e.target.value})} /></Field>
          <Field label="Product / Scope">
            <Sel value={form.scope} onChange={e=>{
              const prod=products.find(p=>p.name===e.target.value);
              setForm({...form,scope:e.target.value,unitPrice:prod?prod.listPrice:form.unitPrice,amount:(prod?prod.listPrice:form.unitPrice)*(form.qty||1)});
            }}>
              <option value="">–</option>{scopeOpts.map(s=><option key={s}>{s}</option>)}
            </Sel>
          </Field>
          <Field label="Unit Price (€)"><Inp type="number" value={form.unitPrice} onChange={e=>setForm({...form,unitPrice:+e.target.value,amount:(+e.target.value)*(form.qty||1)})} /></Field>
          <Field label="Quantity"><Inp type="number" value={form.qty} onChange={e=>setForm({...form,qty:+e.target.value,amount:(form.unitPrice||0)*(+e.target.value)})} /></Field>
          <Field label="Amount (€)"><Inp value={fmtEur(form.amount)} readOnly style={{ color:C.accent, fontWeight:700 }} /></Field>
          <Field label="Probability"><Sel value={form.probability} onChange={e=>setForm({...form,probability:+e.target.value})}>{PROBS.map(p=><option key={p} value={p}>{(p*100).toFixed(0)}%</option>)}</Sel></Field>
          <Field label="Priority"><Sel value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option value="">–</option>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</Sel></Field>
          <Field label="Actions" span={2}><Sel value={form.actions} onChange={e=>setForm({...form,actions:e.target.value})}><option value="">–</option>{ACTIONS_LIST.map(a=><option key={a}>{a}</option>)}</Sel></Field>
          <Field label="Comments" span={2}><Tx value={form.comments} onChange={e=>setForm({...form,comments:e.target.value})} /></Field>
          <Field label="Inserted"><Inp type="date" value={form.inserted} onChange={e=>setForm({...form,inserted:e.target.value})} /></Field>
          <Field label="Offer Date"><Inp type="date" value={form.offerDate} onChange={e=>setForm({...form,offerDate:e.target.value})} /></Field>
          <Field label="Offer Number" span={2}><Inp value={form.offerNum} onChange={e=>setForm({...form,offerNum:e.target.value})} /></Field>
        </Modal>
      )}
    </>
  );
}

// ─── LOP ──────────────────────────────────────────────────────────────────────
function LOP({ projects, opportunities, C }) {
  const rows=useMemo(()=>projects.map(p=>({
    ...p,
    opps:opportunities.filter(o=>o.projectId===p.id),
    daysSince:daysSince(p.lastContact),
    totalAmount:opportunities.filter(o=>o.projectId===p.id).reduce((a,b)=>a+(b.amount||0),0),
  })).sort((a,b)=>(b.daysSince||0)-(a.daysSince||0)),[projects,opportunities]);

  return(
    <Section title="LOP — List of Open Points">
      <div style={{ marginBottom:14, display:'flex', gap:8, flexWrap:'wrap' }}>
        {STAGES.map(s=><Badge key={s.id} label={`${s.icon} ${s.label}`} color={s.color} />)}
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ background:C.surface }}>
              {['#','Project','Company','Kind','Last Contact','Days','Follow Up','Stage','Priority','Amount','Actions'].map(h=>(
                <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:C.muted, fontSize:9, textTransform:'uppercase', letterSpacing:.8, borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length===0&&<tr><td colSpan={11} style={{padding:'20px',textAlign:'center',color:C.muted}}>No open projects</td></tr>}
            {rows.flatMap(p=>{
              const base=(
                <tr key={`p-${p.id}`} style={{ borderBottom:`2px solid ${C.border}`, background:C.surface+'44' }}>
                  <td style={{padding:'9px 12px',color:C.muted}}>#{p.id}</td>
                  <td style={{padding:'9px 12px'}}><b style={{color:C.accent}}>{p.name}</b></td>
                  <td style={{padding:'9px 12px',color:C.text}}>{p.company||'–'}</td>
                  <td style={{padding:'9px 12px'}}>{p.kind?<Badge label={p.kind} color={C.orange}/>:'–'}</td>
                  <td style={{padding:'9px 12px',color:C.text}}>{p.lastContact||'–'}</td>
                  <td style={{padding:'9px 12px'}}><span style={{color:typeof p.daysSince==='number'&&p.daysSince>30?C.danger:p.daysSince>14?C.warning:C.success,fontWeight:700}}>{p.daysSince}d</span></td>
                  <td style={{padding:'9px 12px',color:C.text}}>{p.followUp||'–'}</td>
                  <td colSpan={3} style={{padding:'9px 12px',color:C.muted,fontSize:10}}>{p.opps.length} opportunit{p.opps.length===1?'y':'ies'} · {fmtK(p.totalAmount)}</td>
                  <td style={{padding:'9px 12px',color:C.muted}}>{p.responsible}</td>
                </tr>
              );
              const oppRows=p.opps.map(o=>{
                const s=stageMap[o.stage]||STAGES[0];
                return(
                  <tr key={`o-${o.id}`} style={{ borderBottom:`1px solid ${C.border}22` }}>
                    <td style={{padding:'6px 12px 6px 24px',color:C.muted,fontSize:10}}>└</td>
                    <td style={{padding:'6px 12px',color:C.muted,fontSize:11}}>{o.opptyName||'–'}</td>
                    <td style={{padding:'6px 12px',fontSize:10,color:C.muted}}>{o.opportunity}</td>
                    <td style={{padding:'6px 12px',fontSize:10,color:C.muted}}>{o.scope}</td>
                    <td colSpan={2}></td><td></td>
                    <td style={{padding:'6px 12px'}}><Badge label={`${s.icon} ${s.label}`} color={s.color}/></td>
                    <td style={{padding:'6px 12px'}}><Badge label={o.priority||'–'} color={priorityColor(o.priority, C)}/></td>
                    <td style={{padding:'6px 12px',color:C.accent,fontWeight:700,fontSize:12}}>{fmtK(o.amount)}</td>
                    <td style={{padding:'6px 12px',fontSize:10,color:C.muted}}>{o.actions}</td>
                  </tr>
                );
              });
              return[base,...oppRows];
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme] = useState(() => (typeof window !== 'undefined' && localStorage.getItem('crm-theme')) || 'dark');
  const T = theme === 'dark' ? DARK : LIGHT_COLORS;
  C = T;
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [companies,     setCompanies]     = useState([]);
  const [partners,      setPartners]      = useState([]);
  const [leads,         setLeads]         = useState([]);
  const [projects,      setProjects]      = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [responsibles,  setResponsibles]  = useState([]);
  const [products,      setProducts]      = useState([]);
  const [dataLoading,   setDataLoading]   = useState(false);

  // ── Auth ──
  useEffect(()=>{
    supabase.auth.getSession().then(({ data })=>{
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    }).catch(()=>setAuthLoading(false));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session)=>{
      setUser(session?.user ?? null);
    });
  return ()=>{ if(listener?.subscription?.unsubscribe) listener.subscription.unsubscribe(); };
  },[]);

  // ── Load data once user is logged in ──
  useEffect(()=>{
    if(!user) return;
    setDataLoading(true);
    async function loadAll() {
      const [c,pa,l,pr,o,r,prod] = await Promise.all([
        dbLoad('companies'), dbLoad('partners'), dbLoad('leads'),
        dbLoad('projects'), dbLoad('opportunities'),
        dbLoad('responsibles'), dbLoad('products'),
      ]);
      setCompanies(c); setPartners(pa); setLeads(l);
      setProjects(pr); setOpportunities(o);
      setResponsibles(r); setProducts(prod);
      setDataLoading(false);
    }
    loadAll();
  },[user]);

const exportToExcel = async () => {
  try {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(companies),     'Companies');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projects),      'Projects');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(opportunities), 'Opportunities');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(leads),         'Leads');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(partners),      'Partners');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(responsibles),  'Responsibles');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(products),      'Products');
    XLSX.writeFile(wb, `IngeniumCRM_backup_${new Date().toISOString().slice(0,10)}.xlsx`);
  } catch (err) {
    console.error('Export failed', err);
    alert('Export failed. See console for details.');
  }
};

  const needsSetup = responsibles.length===0||products.length===0;
  const pageLabel  = NAV.find(n=>n.id===page)?.label||'';

  if(authLoading) return (
    <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background:'#04101d', color:'#00e5b0', fontFamily:"'IBM Plex Mono',monospace", fontSize:14 }}>
      Loading...
    </div>
  );

  if(!user) return <Login onLogin={setUser} />;

  if(dataLoading) return (
    <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background:'#04101d', color:'#00e5b0', fontFamily:"'IBM Plex Mono',monospace", fontSize:14 }}>
      Loading data...
    </div>
  );

return (
    <div style={{ display:'flex', height:'100vh', background:T.bg, color:T.text, fontFamily:"'IBM Plex Mono',monospace", overflow:'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={{ width:210, background:T.surface, borderRight:`1px solid ${T.border}`, display:'flex', flexDirection:'column', flexShrink:0 }}>
      <div style={{ padding:'26px 20px 20px', borderBottom:`1px solid ${T.border}` }}>
      <img 
      src="/ingenium.png"
      alt="Ingenium" 
      style={{ 
          height: 'auto',
        width: '100%',
        maxWidth: 160,
        display:'block', 
        marginBottom:10,
        objectFit:'contain',
        filter: theme === 'dark' ? 'brightness(0) invert(1)' : 'none'
      }} 
/>
        <div style={{ color:T.muted, fontSize:9, marginTop:2, letterSpacing:1 }}>Power Solution Tech · CRM</div>
        </div>

        <nav style={{ flex:1, padding:'10px 0', overflowY:'auto' }}>
          {NAV.map(n=>(
            <div key={n.id} onClick={()=>setPage(n.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 20px', cursor:'pointer', fontSize:11, color:page===n.id?T.accent:T.muted, background:page===n.id?T.accentDim:'transparent', borderLeft:page===n.id?`2px solid ${T.accent}`:'2px solid transparent', transition:'all .15s' }}>
              <span style={{ fontSize:14 }}>{n.icon}</span>
              {n.label}
              {n.id==='settings'&&needsSetup&&(
                <span style={{ marginLeft:'auto', width:7, height:7, borderRadius:'50%', background:T.warning, flexShrink:0 }} />
              )}
            </div>
          ))}
        </nav>
        <div style={{ padding:'14px 20px', borderTop:`1px solid ${T.border}`, fontSize:9, color:T.muted, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>v3.0 · {new Date().toLocaleDateString('it-IT')}</span>
          <button onClick={()=>supabase.auth.signOut()} style={{ background:'none', border:'none', color:T.muted, cursor:'pointer', fontSize:9, textDecoration:'underline' }}>Logout</button>
        </div>
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'16px 28px', borderBottom:`1px solid ${T.border}`, background:T.surface, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <span style={{ fontSize:18, fontWeight:700, fontFamily:"'Rajdhani',sans-serif", letterSpacing:1 }}>{pageLabel}</span>
          <span style={{ fontSize:9, textTransform:'uppercase', letterSpacing:1, padding:'3px 8px', background:T.accentDim, color:T.accent, borderRadius:4 }}>Ingenium CRM</span>
          <span style={{ fontSize:9, color:T.muted, marginLeft:'auto' }}>{user.email}</span>
          <button
            onClick={() => { const t = theme === 'dark' ? 'light' : 'dark'; setTheme(t); localStorage.setItem('crm-theme', t); }}
            style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 10px', cursor:'pointer', fontSize:13, color:T.text }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <Btn onClick={exportToExcel} variant="secondary" style={{ fontSize:9, padding:'4px 10px' }}>⬇ Export Excel</Btn>
          {needsSetup&&page!=='settings'&&(
            <span onClick={()=>setPage('settings')} style={{ fontSize:9, padding:'3px 10px', background:T.warning+'22', color:T.warning, borderRadius:4, cursor:'pointer', border:`1px solid ${T.warning}44` }}>
              ⚠ Configure Responsibles & Products in Settings first
            </span>
          )}
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:24, background:T.bg }}>
          {page==='dashboard'     && <Dashboard companies={companies} projects={projects} opportunities={opportunities} C={T} />}
          {page==='projects'      && <Projects data={projects} setData={setProjects} companies={companies} responsibles={responsibles} C={T} />}
          {page==='opportunities' && <Opportunities data={opportunities} setData={setOpportunities} projects={projects} responsibles={responsibles} products={products} C={T} />}
          {page==='lop'           && <LOP projects={projects} opportunities={opportunities} C={T} />}
          {page==='companies'     && <Companies data={companies} setData={setCompanies} C={T} />}
          {page==='leads'         && <Leads data={leads} setData={setLeads} C={T} />}
          {page==='partners'      && <Partners data={partners} setData={setPartners} C={T} />}
          {page==='settings'      && <Settings responsibles={responsibles} setResponsibles={setResponsibles} products={products} setProducts={setProducts} C={T} />}
        </div>
      </div>
    </div>
  );
}