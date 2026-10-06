import { useEffect, useState } from "react";
import { BookOpen, Library, Search, Settings, Bookmark, PenLine, Upload, ShieldCheck } from "lucide-react";
import { KitabReader } from "./components/KitabReader";

type Book = { id: string; name: string; size: number; addedAt: string; url?: string };
const KEY = "kitab-pribadi-books";
const menu = [["Perpustakaan", Library],["Terakhir Dibaca", BookOpen],["Hasyiah", PenLine],["Bookmark", Bookmark]] as const;

export default function App() {
  const [admin, setAdmin] = useState(false);
  const [books, setBooks] = useState<Book[]>(() => JSON.parse(localStorage.getItem(KEY) || "[]"));
  const [active, setActive] = useState<Book | null>(null);
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(books)), [books]);
  function addPdf(file: File) {
    if (file.type !== "application/pdf") return alert("Silakan pilih file PDF.");
    setBooks(v => [{id:crypto.randomUUID(),name:file.name.replace(/\.pdf$/i,""),size:file.size,addedAt:new Date().toISOString(),url:URL.createObjectURL(file)},...v]);
  }
  if (active?.url) return <KitabReader title={active.name} pdfUrl={active.url} onClose={() => setActive(null)} />;
  return <div className="app"><aside><div className="brand"><b>📖</b><span><strong>Kitab Pribadi</strong><small>مكتبة طالب العلم</small></span></div><nav>{menu.map(([label,Icon],i)=><button className={i===0?"active":""} key={label}><Icon size={18}/>{label}</button>)}</nav><button className="settings"><Settings size={18}/>Pengaturan</button></aside><main><header><div><em>مكتبة الكتب</em><h1>Perpustakaan Kitab</h1></div><label><Search size={17}/><input placeholder="Cari kitab atau mushannif..."/></label></header><section className="hero"><div><em>بسم الله الرحمن الرحيم</em><h2>Kitab Pribadi</h2><p>Perpustakaan turats pribadi dengan pembacaan kitab, fihris, dan Hasyiah yang tertata.</p></div><div className="actions"><button className="primary" onClick={()=>setAdmin(v=>!v)}><ShieldCheck size={17}/>{admin?"Tutup Admin":"Mode Admin"}</button>{admin&&<label className="upload"><Upload size={17}/>Upload PDF<input type="file" accept="application/pdf" onChange={e=>e.target.files?.[0]&&addPdf(e.target.files[0])}/></label>}</div></section><section><div className="title"><h3>Kitab Saya</h3><span>{books.length} kitab</span></div>{books.length===0?<div className="empty"><BookOpen size={34}/><h3>Belum ada kitab</h3><p>Masuk Mode Admin lalu upload PDF kitab pertama.</p></div>:<div className="books">{books.map(b=><article className="book" key={b.id} onClick={()=>b.url&&setActive(b)}><BookOpen size={30}/><div><h3>{b.name}</h3><p>PDF • {(b.size/1024/1024).toFixed(1)} MB</p></div></article>)}</div>}</section></main></div>;
}