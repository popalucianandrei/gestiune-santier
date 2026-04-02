import React, { useEffect, useMemo, useState } from "react";
import "./app.css";

const API_BASE = "https://gestiune-santier-backend.onrender.com/api";

const initialData = {
  santiere: [], echipe: [], furnizori: [], materiale: [], proiecte: [], utilaje: [], consumStoc: [], alocariUtilaje: [],
  dashboard: { santiere: 0, proiecte: 0, materiale: 0, utilaje: 0, consumuri: 0, stocTotal: 0 },
};

function StatCard({ title, value, subtitle }) {
  return <div className="card stat-card"><div className="stat-title">{title}</div><div className="stat-value">{value}</div><div className="stat-subtitle">{subtitle}</div></div>;
}
function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return <div className="modal-overlay" onClick={onClose}><div className="modal" onClick={(e)=>e.stopPropagation()}><div className="modal-header"><h3>{title}</h3><button className="btn-secondary" onClick={onClose}>✕</button></div>{children}</div></div>;
}
function LoginScreen({ onLogin, loading, error }) {
  const [email, setEmail] = useState("admin@santier.ro");
  const [parola, setParola] = useState("Admin123!");
  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Gestiune Șantier</h1>
        <p>Autentifică-te pentru a continua.</p>
        {error && <div className="error-box">{error}</div>}
        <form className="login-form" onSubmit={(e)=>{e.preventDefault(); onLogin(email, parola);}}>
          <Field label="Email"><input value={email} onChange={(e)=>setEmail(e.target.value)} /></Field>
          <Field label="Parolă"><input type="password" value={parola} onChange={(e)=>setParola(e.target.value)} /></Field>
          <button type="submit" disabled={loading}>{loading ? "Se autentifică..." : "Login"}</button>
        </form>
        <div className="login-help"><strong>Conturi test:</strong><div>admin@santier.ro / Admin123!</div><div>operator@santier.ro / Operator123!</div><div>rapoarte@santier.ro / Viewer123!</div></div>
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState("santiere");
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(!!token);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [newSantier, setNewSantier] = useState({ nume: "", locatie: "", status: "activ", data_start: "" });
  const [newEchipa, setNewEchipa] = useState({ nume: "", sef_echipa: "", telefon: "", descriere: "" });
  const [newFurnizor, setNewFurnizor] = useState({ nume: "", persoana_contact: "", telefon: "", email: "", adresa: "" });
  const [newMaterial, setNewMaterial] = useState({ id_furnizor: "", denumire: "", categorie: "", unitate_masura: "", pret_unitar: "", stoc_curent: "" });
  const [newProiect, setNewProiect] = useState({ nume: "", id_santier: "", id_echipa: "", status: "planificat", buget: "", data_start: "" });
  const [newUtilaj, setNewUtilaj] = useState({ denumire: "", tip: "", serie: "", stare: "disponibil", cost_ora: "" });
  const [newAlocare, setNewAlocare] = useState({ id_utilaj: "", id_proiect: "", data_start: "", data_sfarsit: "", ore_folosite: "", observatii: "" });
  const [newConsum, setNewConsum] = useState({ id_material: "", id_proiect: "", tip_miscare: "iesire", cantitate: "", data_miscare: "", document_referinta: "", observatii: "" });
  const [editState, setEditState] = useState({ type: "", item: null });

  const canWrite = user?.rol === "admin" || user?.rol === "operator";
  const canDelete = user?.rol === "admin";
  const canExport = !!user;

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(""); setUser(null); setData(initialData); setError("");
  };

  const authHeaders = () => ({ "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) });

  const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, { headers: authHeaders(), ...options });
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token"); localStorage.removeItem("user"); setToken(""); setUser(null);
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Cererea a eșuat.");
    }
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return response.json();
    return response;
  };

  const handleLogin = async (email, parola) => {
    try {
      setLoading(true); setError("");
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, parola }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Autentificare eșuată.");
      localStorage.setItem("token", payload.token);
      localStorage.setItem("user", JSON.stringify(payload.user));
      setToken(payload.token); setUser(payload.user);
    } catch (err) { setError(err.message || "Autentificare eșuată."); }
    finally { setLoading(false); }
  };

  const loadData = async () => {
    try {
      setLoading(true); setError("");
      const [dashboard, santiere, echipe, furnizori, materiale, proiecte, utilaje, consumStoc, alocariUtilaje] = await Promise.all([
        fetchJson(`${API_BASE}/dashboard`), fetchJson(`${API_BASE}/santiere`), fetchJson(`${API_BASE}/echipe`),
        fetchJson(`${API_BASE}/furnizori`), fetchJson(`${API_BASE}/materiale`), fetchJson(`${API_BASE}/proiecte`),
        fetchJson(`${API_BASE}/utilaje`), fetchJson(`${API_BASE}/consum-stoc`), fetchJson(`${API_BASE}/alocari-utilaje`),
      ]);
      setData({
        dashboard: { santiere: dashboard.santiere, proiecte: dashboard.proiecte, materiale: dashboard.materiale, utilaje: dashboard.utilaje, consumuri: dashboard.consumuri, stocTotal: Number(dashboard.stoc_total || 0) },
        santiere: santiere.map((s) => ({ id: s.id_santier, nume: s.nume, locatie: s.locatie, status: s.status, data_start: s.data_start, data_sfarsit: s.data_sfarsit })),
        echipe: echipe.map((e) => ({ id: e.id_echipa, nume: e.nume, sef_echipa: e.sef_echipa || "", telefon: e.telefon || "", descriere: e.descriere || "" })),
        furnizori: furnizori.map((f) => ({ id: f.id_furnizor, nume: f.nume, persoana_contact: f.persoana_contact || "", telefon: f.telefon || "", email: f.email || "", adresa: f.adresa || "" })),
        materiale: materiale.map((m) => ({ id: m.id_material, id_furnizor: m.id_furnizor, denumire: m.denumire, categorie: m.categorie || "", unitate_masura: m.unitate_masura, pret_unitar: Number(m.pret_unitar || 0), stoc_curent: Number(m.stoc_curent || 0) })),
        proiecte: proiecte.map((p) => ({ id: p.id_proiect, id_santier: p.id_santier, id_echipa: p.id_echipa, nume: p.nume, descriere: p.descriere || "", data_start: p.data_start || "", data_sfarsit: p.data_sfarsit || "", buget: Number(p.buget || 0), status: p.status })),
        utilaje: utilaje.map((u) => ({ id: u.id_utilaj, denumire: u.denumire, tip: u.tip || "", serie: u.serie || "", stare: u.stare, cost_ora: Number(u.cost_ora || 0) })),
        consumStoc: consumStoc.map((c) => ({ id: c.id_consum_stoc, id_material: c.id_material, id_proiect: c.id_proiect, tip_miscare: c.tip_miscare, cantitate: Number(c.cantitate || 0), data_miscare: c.data_miscare || "", document_referinta: c.document_referinta || "", observatii: c.observatii || "" })),
        alocariUtilaje: alocariUtilaje.map((a) => ({ id: a.id_alocare, id_utilaj: a.id_utilaj, id_proiect: a.id_proiect, data_start: a.data_start || "", data_sfarsit: a.data_sfarsit || "", ore_folosite: Number(a.ore_folosite || 0), observatii: a.observatii || "", utilaj: a.utilaj || "", proiect: a.proiect || "" })),
      });
    } catch (err) { setError(err.message || "Nu am putut încărca datele."); }
    finally { setLoading(false); setBootLoading(false); }
  };

  useEffect(() => { if (token && user) loadData(); else setBootLoading(false); }, [token]);

  const santiereMap = useMemo(() => Object.fromEntries(data.santiere.map((x) => [x.id, x.nume])), [data.santiere]);
  const echipeMap = useMemo(() => Object.fromEntries(data.echipe.map((x) => [x.id, x.nume])), [data.echipe]);
  const materialeMap = useMemo(() => Object.fromEntries(data.materiale.map((x) => [x.id, x.denumire])), [data.materiale]);
  const proiecteMap = useMemo(() => Object.fromEntries(data.proiecte.map((x) => [x.id, x.nume])), [data.proiecte]);
  const furnizoriMap = useMemo(() => Object.fromEntries(data.furnizori.map((x) => [x.id, x.nume])), [data.furnizori]);
  const filteredProjects = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return data.proiecte;
    return data.proiecte.filter((p) => p.nume.toLowerCase().includes(q));
  }, [search, data.proiecte]);

  const postEntity = async (path, payload, resetter) => {
    try { await fetchJson(`${API_BASE}${path}`, { method: "POST", body: JSON.stringify(payload) }); if (resetter) resetter(); await loadData(); }
    catch (err) { setError(err.message || "Nu am putut salva datele."); }
  };
  const deleteEntity = async (path, id, label) => {
    if (!window.confirm(`Sigur vrei să ștergi ${label}?`)) return;
    try { await fetchJson(`${API_BASE}${path}/${id}`, { method: "DELETE" }); await loadData(); }
    catch (err) { setError(err.message || `Nu am putut șterge ${label}.`); }
  };
  const saveEdit = async () => {
    if (!editState.item || !editState.type) return;
    const item = editState.item;
    const pathMap = { santier: "/santiere", echipa: "/echipe", furnizor: "/furnizori", material: "/materiale", proiect: "/proiecte", utilaj: "/utilaje", alocare: "/alocari-utilaje", consum: "/consum-stoc" };
    const payloadMap = {
      santier: { nume: item.nume, locatie: item.locatie, status: item.status, data_start: item.data_start || null, data_sfarsit: item.data_sfarsit || null },
      echipa: { nume: item.nume, sef_echipa: item.sef_echipa || null, telefon: item.telefon || null, descriere: item.descriere || null },
      furnizor: { nume: item.nume, persoana_contact: item.persoana_contact || null, telefon: item.telefon || null, email: item.email || null, adresa: item.adresa || null },
      material: { id_furnizor: Number(item.id_furnizor), denumire: item.denumire, categorie: item.categorie || null, unitate_masura: item.unitate_masura, pret_unitar: Number(item.pret_unitar || 0), stoc_curent: Number(item.stoc_curent || 0) },
      proiect: { id_santier: Number(item.id_santier), id_echipa: Number(item.id_echipa), nume: item.nume, descriere: item.descriere || null, data_start: item.data_start || null, data_sfarsit: item.data_sfarsit || null, buget: Number(item.buget || 0), status: item.status },
      utilaj: { denumire: item.denumire, tip: item.tip || null, serie: item.serie || null, stare: item.stare, cost_ora: Number(item.cost_ora || 0) },
      alocare: { id_utilaj: Number(item.id_utilaj), id_proiect: Number(item.id_proiect), data_start: item.data_start, data_sfarsit: item.data_sfarsit || null, ore_folosite: Number(item.ore_folosite || 0), observatii: item.observatii || null },
      consum: { id_material: Number(item.id_material), id_proiect: item.id_proiect ? Number(item.id_proiect) : null, tip_miscare: item.tip_miscare, cantitate: Number(item.cantitate || 0), data_miscare: item.data_miscare || null, document_referinta: item.document_referinta || null, observatii: item.observatii || null },
    };
    try { await fetchJson(`${API_BASE}${pathMap[editState.type]}/${item.id}`, { method: "PUT", body: JSON.stringify(payloadMap[editState.type]) }); setEditState({ type: "", item: null }); await loadData(); }
    catch (err) { setError(err.message || "Nu am putut actualiza înregistrarea."); }
  };
  const exportExcel = async (name) => {
    try {
      const response = await fetch(`${API_BASE}/export/${name}.xlsx`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Nu am putut exporta fișierul.");
      }
      const blob = await response.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `${name}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch (err) { setError(err.message || "Nu am putut exporta fișierul."); }
  };

  if (!token || !user) return <LoginScreen onLogin={handleLogin} loading={loading} error={error} />;
  if (bootLoading) return <div className="login-page"><div className="login-card"><h2>Se încarcă...</h2></div></div>;

  return (
    <div className="page">
      <div className="topbar">
        <div><h1>Management șantier</h1><p>Autentificat ca <strong>{user.nume}</strong> ({user.rol})</p></div>
        <div className="toolbar">
          {canExport && <button className="btn-secondary" onClick={() => exportExcel("proiecte")}>Export proiecte</button>}
          {canExport && <button className="btn-secondary" onClick={() => exportExcel("materiale")}>Export materiale</button>}
          {canExport && <button className="btn-secondary" onClick={() => exportExcel("consum")}>Export consum</button>}
          <input className="search" placeholder="Caută proiect..." value={search} onChange={(e)=>setSearch(e.target.value)} />
          <button className="btn-secondary" onClick={logout}>Logout</button>
        </div>
      </div>
      {error && <div className="error-box">{error}</div>}
      {loading && <div className="info-box">Se încarcă datele...</div>}
      <div className="stats-grid">
        <StatCard title="Șantiere" value={data.dashboard.santiere} subtitle="Total locații" />
        <StatCard title="Proiecte" value={data.dashboard.proiecte} subtitle="Lucrări înregistrate" />
        <StatCard title="Materiale" value={data.dashboard.materiale} subtitle={`Stoc total: ${data.dashboard.stocTotal}`} />
        <StatCard title="Utilaje" value={data.dashboard.utilaje} subtitle={`Consumuri: ${data.dashboard.consumuri}`} />
      </div>
      <div className="tabs">
        {[["santiere","Șantiere"],["echipe","Echipe"],["furnizori","Furnizori"],["materiale","Materiale"],["proiecte","Proiecte"],["consum","Consum"],["utilaje","Utilaje"]].map(([key,label]) =>
          <button key={key} className={activeTab === key ? "tab active" : "tab"} onClick={()=>setActiveTab(key)}>{label}</button>
        )}
      </div>
      <div className="info-box">Roluri: admin = tot, operator = citire/scriere, viewer = doar citire și export.</div>
      {activeTab === "santiere" && <div className="card"><div className="section-header"><h2>Șantiere</h2></div>{canWrite && <><div className="form-grid"><Field label="Nume"><input value={newSantier.nume} onChange={(e)=>setNewSantier({...newSantier,nume:e.target.value})} /></Field><Field label="Locație"><input value={newSantier.locatie} onChange={(e)=>setNewSantier({...newSantier,locatie:e.target.value})} /></Field><Field label="Status"><select value={newSantier.status} onChange={(e)=>setNewSantier({...newSantier,status:e.target.value})}><option value="activ">activ</option><option value="planificat">planificat</option><option value="finalizat">finalizat</option></select></Field><Field label="Data start"><input type="date" value={newSantier.data_start} onChange={(e)=>setNewSantier({...newSantier,data_start:e.target.value})} /></Field></div><div className="actions-row"><button onClick={()=>postEntity("/santiere", newSantier, ()=>setNewSantier({nume:"",locatie:"",status:"activ",data_start:""}))}>Adaugă șantier</button></div></>}<table><thead><tr><th>Nume</th><th>Locație</th><th>Status</th><th>Data start</th><th>Acțiuni</th></tr></thead><tbody>{data.santiere.map((s)=><tr key={s.id}><td>{s.nume}</td><td>{s.locatie}</td><td>{s.status}</td><td>{s.data_start}</td><td className="actions-cell">{canWrite && <button className="btn-secondary" onClick={()=>setEditState({type:"santier",item:{...s}})}>Editează</button>}{canDelete && <button className="btn-danger" onClick={()=>deleteEntity("/santiere", s.id, "șantierul")}>Șterge</button>}</td></tr>)}</tbody></table></div>}
      {activeTab === "echipe" && <div className="card"><div className="section-header"><h2>Echipe</h2></div>{canWrite && <><div className="form-grid"><Field label="Nume"><input value={newEchipa.nume} onChange={(e)=>setNewEchipa({...newEchipa,nume:e.target.value})} /></Field><Field label="Șef echipă"><input value={newEchipa.sef_echipa} onChange={(e)=>setNewEchipa({...newEchipa,sef_echipa:e.target.value})} /></Field><Field label="Telefon"><input value={newEchipa.telefon} onChange={(e)=>setNewEchipa({...newEchipa,telefon:e.target.value})} /></Field><Field label="Descriere"><input value={newEchipa.descriere} onChange={(e)=>setNewEchipa({...newEchipa,descriere:e.target.value})} /></Field></div><div className="actions-row"><button onClick={()=>postEntity("/echipe", newEchipa, ()=>setNewEchipa({nume:"",sef_echipa:"",telefon:"",descriere:""}))}>Adaugă echipă</button></div></>}<table><thead><tr><th>Nume</th><th>Șef</th><th>Telefon</th><th>Descriere</th><th>Acțiuni</th></tr></thead><tbody>{data.echipe.map((e)=><tr key={e.id}><td>{e.nume}</td><td>{e.sef_echipa}</td><td>{e.telefon}</td><td>{e.descriere}</td><td className="actions-cell">{canWrite && <button className="btn-secondary" onClick={()=>setEditState({type:"echipa",item:{...e}})}>Editează</button>}{canDelete && <button className="btn-danger" onClick={()=>deleteEntity("/echipe", e.id, "echipa")}>Șterge</button>}</td></tr>)}</tbody></table></div>}
      {activeTab === "furnizori" && <div className="card"><div className="section-header"><h2>Furnizori</h2></div>{canWrite && <><div className="form-grid"><Field label="Nume"><input value={newFurnizor.nume} onChange={(e)=>setNewFurnizor({...newFurnizor,nume:e.target.value})} /></Field><Field label="Persoană contact"><input value={newFurnizor.persoana_contact} onChange={(e)=>setNewFurnizor({...newFurnizor,persoana_contact:e.target.value})} /></Field><Field label="Telefon"><input value={newFurnizor.telefon} onChange={(e)=>setNewFurnizor({...newFurnizor,telefon:e.target.value})} /></Field><Field label="Email"><input value={newFurnizor.email} onChange={(e)=>setNewFurnizor({...newFurnizor,email:e.target.value})} /></Field><Field label="Adresă"><input value={newFurnizor.adresa} onChange={(e)=>setNewFurnizor({...newFurnizor,adresa:e.target.value})} /></Field></div><div className="actions-row"><button onClick={()=>postEntity("/furnizori", newFurnizor, ()=>setNewFurnizor({nume:"",persoana_contact:"",telefon:"",email:"",adresa:""}))}>Adaugă furnizor</button></div></>}<table><thead><tr><th>Nume</th><th>Contact</th><th>Telefon</th><th>Email</th><th>Acțiuni</th></tr></thead><tbody>{data.furnizori.map((f)=><tr key={f.id}><td>{f.nume}</td><td>{f.persoana_contact}</td><td>{f.telefon}</td><td>{f.email}</td><td className="actions-cell">{canWrite && <button className="btn-secondary" onClick={()=>setEditState({type:"furnizor",item:{...f}})}>Editează</button>}{canDelete && <button className="btn-danger" onClick={()=>deleteEntity("/furnizori", f.id, "furnizorul")}>Șterge</button>}</td></tr>)}</tbody></table></div>}
      {activeTab === "materiale" && <div className="card"><div className="section-header"><h2>Materiale</h2></div>{canWrite && <><div className="form-grid"><Field label="Furnizor"><select value={newMaterial.id_furnizor} onChange={(e)=>setNewMaterial({...newMaterial,id_furnizor:e.target.value})}><option value="">Alege</option>{data.furnizori.map((f)=><option key={f.id} value={f.id}>{f.nume}</option>)}</select></Field><Field label="Denumire"><input value={newMaterial.denumire} onChange={(e)=>setNewMaterial({...newMaterial,denumire:e.target.value})} /></Field><Field label="Categorie"><input value={newMaterial.categorie} onChange={(e)=>setNewMaterial({...newMaterial,categorie:e.target.value})} /></Field><Field label="UM"><input value={newMaterial.unitate_masura} onChange={(e)=>setNewMaterial({...newMaterial,unitate_masura:e.target.value})} /></Field><Field label="Preț"><input type="number" value={newMaterial.pret_unitar} onChange={(e)=>setNewMaterial({...newMaterial,pret_unitar:e.target.value})} /></Field><Field label="Stoc"><input type="number" value={newMaterial.stoc_curent} onChange={(e)=>setNewMaterial({...newMaterial,stoc_curent:e.target.value})} /></Field></div><div className="actions-row"><button onClick={()=>postEntity("/materiale",{id_furnizor:Number(newMaterial.id_furnizor),denumire:newMaterial.denumire,categorie:newMaterial.categorie||null,unitate_masura:newMaterial.unitate_masura,pret_unitar:Number(newMaterial.pret_unitar||0),stoc_curent:Number(newMaterial.stoc_curent||0)},()=>setNewMaterial({id_furnizor:"",denumire:"",categorie:"",unitate_masura:"",pret_unitar:"",stoc_curent:""}))}>Adaugă material</button></div></>}<table><thead><tr><th>Material</th><th>Categorie</th><th>Furnizor</th><th>Preț</th><th>Stoc</th><th>Acțiuni</th></tr></thead><tbody>{data.materiale.map((m)=><tr key={m.id}><td>{m.denumire}</td><td>{m.categorie}</td><td>{furnizoriMap[m.id_furnizor]||"-"}</td><td>{m.pret_unitar}</td><td>{m.stoc_curent}</td><td className="actions-cell">{canWrite && <button className="btn-secondary" onClick={()=>setEditState({type:"material",item:{...m}})}>Editează</button>}{canDelete && <button className="btn-danger" onClick={()=>deleteEntity("/materiale", m.id, "materialul")}>Șterge</button>}</td></tr>)}</tbody></table></div>}
      {activeTab === "proiecte" && <div className="card"><div className="section-header"><h2>Proiecte</h2></div>{canWrite && <><div className="form-grid"><Field label="Nume"><input value={newProiect.nume} onChange={(e)=>setNewProiect({...newProiect,nume:e.target.value})} /></Field><Field label="Buget"><input type="number" value={newProiect.buget} onChange={(e)=>setNewProiect({...newProiect,buget:e.target.value})} /></Field><Field label="Șantier"><select value={newProiect.id_santier} onChange={(e)=>setNewProiect({...newProiect,id_santier:e.target.value})}><option value="">Alege</option>{data.santiere.map((s)=><option key={s.id} value={s.id}>{s.nume}</option>)}</select></Field><Field label="Echipă"><select value={newProiect.id_echipa} onChange={(e)=>setNewProiect({...newProiect,id_echipa:e.target.value})}><option value="">Alege</option>{data.echipe.map((e)=><option key={e.id} value={e.id}>{e.nume}</option>)}</select></Field><Field label="Status"><select value={newProiect.status} onChange={(e)=>setNewProiect({...newProiect,status:e.target.value})}><option value="planificat">planificat</option><option value="in_derulare">in_derulare</option><option value="finalizat">finalizat</option></select></Field><Field label="Data start"><input type="date" value={newProiect.data_start} onChange={(e)=>setNewProiect({...newProiect,data_start:e.target.value})} /></Field></div><div className="actions-row"><button onClick={()=>postEntity("/proiecte",{id_santier:Number(newProiect.id_santier),id_echipa:Number(newProiect.id_echipa),nume:newProiect.nume,status:newProiect.status,buget:Number(newProiect.buget||0),data_start:newProiect.data_start||null},()=>setNewProiect({nume:"",id_santier:"",id_echipa:"",status:"planificat",buget:"",data_start:""}))}>Adaugă proiect</button></div></>}<table><thead><tr><th>Proiect</th><th>Șantier</th><th>Echipă</th><th>Status</th><th>Buget</th><th>Acțiuni</th></tr></thead><tbody>{filteredProjects.map((p)=><tr key={p.id}><td>{p.nume}</td><td>{santiereMap[p.id_santier]||"-"}</td><td>{echipeMap[p.id_echipa]||"-"}</td><td>{p.status}</td><td>{p.buget}</td><td className="actions-cell">{canWrite && <button className="btn-secondary" onClick={()=>setEditState({type:"proiect",item:{...p}})}>Editează</button>}{canDelete && <button className="btn-danger" onClick={()=>deleteEntity("/proiecte", p.id, "proiectul")}>Șterge</button>}</td></tr>)}</tbody></table></div>}
      {activeTab === "consum" && <div className="two-col"><div className="card"><div className="section-header"><h2>Consum stoc</h2></div>{canWrite && <><div className="form-grid"><Field label="Material"><select value={newConsum.id_material} onChange={(e)=>setNewConsum({...newConsum,id_material:e.target.value})}><option value="">Alege</option>{data.materiale.map((m)=><option key={m.id} value={m.id}>{m.denumire}</option>)}</select></Field><Field label="Proiect"><select value={newConsum.id_proiect} onChange={(e)=>setNewConsum({...newConsum,id_proiect:e.target.value})}><option value="">Opțional</option>{data.proiecte.map((p)=><option key={p.id} value={p.id}>{p.nume}</option>)}</select></Field><Field label="Tip"><select value={newConsum.tip_miscare} onChange={(e)=>setNewConsum({...newConsum,tip_miscare:e.target.value})}><option value="intrare">intrare</option><option value="iesire">ieșire</option><option value="ajustare">ajustare</option></select></Field><Field label="Cantitate"><input type="number" value={newConsum.cantitate} onChange={(e)=>setNewConsum({...newConsum,cantitate:e.target.value})} /></Field><Field label="Data"><input type="date" value={newConsum.data_miscare} onChange={(e)=>setNewConsum({...newConsum,data_miscare:e.target.value})} /></Field><Field label="Document"><input value={newConsum.document_referinta} onChange={(e)=>setNewConsum({...newConsum,document_referinta:e.target.value})} /></Field><Field label="Observații"><input value={newConsum.observatii} onChange={(e)=>setNewConsum({...newConsum,observatii:e.target.value})} /></Field></div><div className="actions-row"><button onClick={()=>postEntity("/consum-stoc",{id_material:Number(newConsum.id_material),id_proiect:newConsum.id_proiect?Number(newConsum.id_proiect):null,tip_miscare:newConsum.tip_miscare,cantitate:Number(newConsum.cantitate||0),data_miscare:newConsum.data_miscare||null,document_referinta:newConsum.document_referinta||null,observatii:newConsum.observatii||null},()=>setNewConsum({id_material:"",id_proiect:"",tip_miscare:"iesire",cantitate:"",data_miscare:"",document_referinta:"",observatii:""}))}>Adaugă mișcare</button></div></>} </div><div className="card"><div className="section-header"><h2>Istoric consum</h2></div><table><thead><tr><th>Tip</th><th>Material</th><th>Proiect</th><th>Cantitate</th><th>Data</th><th>Acțiuni</th></tr></thead><tbody>{data.consumStoc.map((c)=><tr key={c.id}><td>{c.tip_miscare}</td><td>{materialeMap[c.id_material]||"-"}</td><td>{c.id_proiect?proiecteMap[c.id_proiect]:"-"}</td><td>{c.cantitate}</td><td>{c.data_miscare}</td><td className="actions-cell">{canWrite && <button className="btn-secondary" onClick={()=>setEditState({type:"consum",item:{...c}})}>Editează</button>}{canDelete && <button className="btn-danger" onClick={()=>deleteEntity("/consum-stoc", c.id, "mișcarea de stoc")}>Șterge</button>}</td></tr>)}</tbody></table></div></div>}
      {activeTab === "utilaje" && <div className="two-col"><div className="card"><div className="section-header"><h2>Utilaje</h2></div>{canWrite && <><div className="form-grid"><Field label="Denumire"><input value={newUtilaj.denumire} onChange={(e)=>setNewUtilaj({...newUtilaj,denumire:e.target.value})} /></Field><Field label="Tip"><input value={newUtilaj.tip} onChange={(e)=>setNewUtilaj({...newUtilaj,tip:e.target.value})} /></Field><Field label="Serie"><input value={newUtilaj.serie} onChange={(e)=>setNewUtilaj({...newUtilaj,serie:e.target.value})} /></Field><Field label="Status"><select value={newUtilaj.stare} onChange={(e)=>setNewUtilaj({...newUtilaj,stare:e.target.value})}><option value="disponibil">disponibil</option><option value="alocat">alocat</option></select></Field><Field label="Cost/oră"><input type="number" value={newUtilaj.cost_ora} onChange={(e)=>setNewUtilaj({...newUtilaj,cost_ora:e.target.value})} /></Field></div><div className="actions-row"><button onClick={()=>postEntity("/utilaje",{denumire:newUtilaj.denumire,tip:newUtilaj.tip||null,serie:newUtilaj.serie||null,stare:newUtilaj.stare,cost_ora:Number(newUtilaj.cost_ora||0)},()=>setNewUtilaj({denumire:"",tip:"",serie:"",stare:"disponibil",cost_ora:""}))}>Adaugă utilaj</button></div></>}<table><thead><tr><th>Denumire</th><th>Tip</th><th>Stare</th><th>Cost</th><th>Acțiuni</th></tr></thead><tbody>{data.utilaje.map((u)=><tr key={u.id}><td>{u.denumire}</td><td>{u.tip}</td><td>{u.stare}</td><td>{u.cost_ora}</td><td className="actions-cell">{canWrite && <button className="btn-secondary" onClick={()=>setEditState({type:"utilaj",item:{...u}})}>Editează</button>}{canDelete && <button className="btn-danger" onClick={()=>deleteEntity("/utilaje", u.id, "utilajul")}>Șterge</button>}</td></tr>)}</tbody></table></div><div className="card"><div className="section-header"><h2>Alocări utilaje</h2></div>{canWrite && <><div className="form-grid"><Field label="Utilaj"><select value={newAlocare.id_utilaj} onChange={(e)=>setNewAlocare({...newAlocare,id_utilaj:e.target.value})}><option value="">Alege</option>{data.utilaje.map((u)=><option key={u.id} value={u.id}>{u.denumire}</option>)}</select></Field><Field label="Proiect"><select value={newAlocare.id_proiect} onChange={(e)=>setNewAlocare({...newAlocare,id_proiect:e.target.value})}><option value="">Alege</option>{data.proiecte.map((p)=><option key={p.id} value={p.id}>{p.nume}</option>)}</select></Field><Field label="Data start"><input type="date" value={newAlocare.data_start} onChange={(e)=>setNewAlocare({...newAlocare,data_start:e.target.value})} /></Field><Field label="Data sfârșit"><input type="date" value={newAlocare.data_sfarsit} onChange={(e)=>setNewAlocare({...newAlocare,data_sfarsit:e.target.value})} /></Field><Field label="Ore folosite"><input type="number" value={newAlocare.ore_folosite} onChange={(e)=>setNewAlocare({...newAlocare,ore_folosite:e.target.value})} /></Field><Field label="Observații"><input value={newAlocare.observatii} onChange={(e)=>setNewAlocare({...newAlocare,observatii:e.target.value})} /></Field></div><div className="actions-row"><button onClick={()=>postEntity("/alocari-utilaje",{id_utilaj:Number(newAlocare.id_utilaj),id_proiect:Number(newAlocare.id_proiect),data_start:newAlocare.data_start,data_sfarsit:newAlocare.data_sfarsit||null,ore_folosite:Number(newAlocare.ore_folosite||0),observatii:newAlocare.observatii||null},()=>setNewAlocare({id_utilaj:"",id_proiect:"",data_start:"",data_sfarsit:"",ore_folosite:"",observatii:""}))}>Adaugă alocare</button></div></>}<table><thead><tr><th>Utilaj</th><th>Proiect</th><th>Perioadă</th><th>Ore</th><th>Acțiuni</th></tr></thead><tbody>{data.alocariUtilaje.map((a)=><tr key={a.id}><td>{a.utilaj||"-"}</td><td>{a.proiect||"-"}</td><td>{a.data_start} - {a.data_sfarsit||"-"}</td><td>{a.ore_folosite}</td><td className="actions-cell">{canWrite && <button className="btn-secondary" onClick={()=>setEditState({type:"alocare",item:{...a}})}>Editează</button>}{canDelete && <button className="btn-danger" onClick={()=>deleteEntity("/alocari-utilaje", a.id, "alocarea")}>Șterge</button>}</td></tr>)}</tbody></table></div></div>}
      <div className="card footer-card"><div><strong>Backend online activ</strong><p>Toate cererile sunt protejate prin autentificare și roluri.</p></div><div className="actions-row">{canExport && <button className="btn-secondary" onClick={()=>exportExcel("proiecte")}>Proiecte</button>}{canExport && <button className="btn-secondary" onClick={()=>exportExcel("materiale")}>Materiale</button>}{canExport && <button className="btn-secondary" onClick={()=>exportExcel("consum")}>Consum</button>}<button className="btn-secondary" onClick={loadData}>Reîncarcă</button></div></div>
      <Modal open={!!editState.item && canWrite} title="Editează" onClose={()=>setEditState({type:"",item:null})}>
        {editState.item && <div className="form-grid"><Field label="Editare rapidă"><div style={{color:"#475569"}}>Folosește în continuare formularele principale. Aici am păstrat doar autentificarea și controlul pe roluri.</div></Field></div>}
      </Modal>
    </div>
  );
}
