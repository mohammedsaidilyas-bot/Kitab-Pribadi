import { useEffect, useState } from "react";
import { BookOpen, Library, Search, Settings, Bookmark, PenLine, Upload, ShieldCheck, Plus } from "lucide-react";
import { KitabReader } from "./components/KitabReader";
import { addHasyiah, loadHasyiah, HasyiahNote } from "./data/hasyiah";
import { loadPdf, savePdf } from "./data/pdfStorage";
import { buildVerifiedFihris } from "./data/fihrisEngine";

type Book = { id: string; name: string; size: number; addedAt: string; url?: string };
const KEY = "kitab-pribadi-books";
const BOOK_META_KEY = "kitab-pribadi-books-meta";
const menu = [["Perpustakaan", Library],["Terakhir Dibaca", BookOpen],["Hasyiah", PenLine],["Bookmark", Bookmark]] as const;

export default function App() {
  const [admin, setAdmin] = useState(false);
  const [books, setBooks] = useState<Book[]>(() => JSON.parse(localStorage.getItem(BOOK_META_KEY) || localStorage.getItem(KEY) || "[]"));
  const [hydrated, setHydrated] = useState(false);
  const [active, setActive] = useState<Book | null>(null);
  const [section, setSection] = useState("Perpustakaan");
  const [notes, setNotes] = useState<HasyiahNote[]>(() => loadHasyiah());
  const [showNote, setShowNote] = useState(false);
  useEffect(() => { localStorage.setItem(BOOK_META_KEY, JSON.stringify(books.map(({url, ...meta}) => meta))); }, [books]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = JSON.parse(localStorage.getItem(BOOK_META_KEY) || localStorage.getItem(KEY) || "[]") as Book[];
      const hydratedBooks: Book[] = [];
      for (const book of stored) {
        const blob = await loadPdf(book.id).catch(() => null);
        if (blob) hydratedBooks.push({...book, url: URL.createObjectURL(blob)});
        else hydratedBooks.push(book);
      }
      if (!cancelled) { setBooks(hydratedBooks); setHydrated(true); }
    })();
    return () => { cancelled = true; };
  }, []);

  function addPdf(file: File) {
    if (file.type !== "application/pdf") return alert("Silakan pilih file PDF.");
    setBooks(v => [{id:crypto.randomUUID(),name:file.name.replace(/\.pdf$/i,""),size:file.size,addedAt:new Date().toISOString(),url},...v]);\n    void buildVerifiedFihris(id, url).catch(() => {});
  }

  function createNote() {
    const note = addHasyiah({
      bookId: books[0]?.id || "manual",
      pdfPage: 1,
      x: 0.5,
      y: 0.5,
      quotedText: "",
      note: "Catatan Hasyiah baru",
      category: "faedah"
    });
    setNotes(loadHasyiah());
    setShowNote(false);
    return note;
  }

  if (!hydrated) return <div className="app"><main><div className="empty"><BookOpen size={34}/><h3>Menyiapkan perpustakaan...</h3><p>Memuat kitab yang tersimpan di perangkat.</p></div></main></div>;\n\n  if (active?.url) return <KitabReader title={active.name} bookId={active.id} pdfUrl={active.url} onClose={() => setActive(null)} />;

  return <div className="app">
    <aside>
      <div className="brand"><b>📖</b><span><strong>Kitab Pribadi</strong><small>مكتبة طالب العلم</small></span></div>
      <nav>{menu.map(([label,Icon])=><button className={section===label?"active":""} key={label} onClick={()=>setSection(label)}><Icon size={18}/>{label}</button>)}</nav>
      <button className="settings"><Settings size={18}/>Pengaturan</button>
    </aside>
    <main>
      <header><div><em>مكتبة الكتب</em><h1>{section}</h1></div><label><Search size={17}/><input placeholder="Cari kitab atau mushannif..."/></label></header>
      {section==="Hasyiah" ? <section>
        <div className="title"><div><h3>دفتر الحواشي</h3><span>Catatan yang terhubung dengan kitab</span></div><button className="primary" onClick={()=>setShowNote(true)}><Plus size={17}/>Tambah Hasyiah</button></div>
        {notes.length===0 ? <div className="empty"><PenLine size={34}/><h3>Belum ada Hasyiah</h3><p>Tambahkan catatan untuk menyimpan syarah, makna, faedah, atau rujukan guru.</p></div> :
        <div className="books">{notes.map(n=><article className="book" key={n.id}><PenLine size={25}/><div><h3>{n.note || "Hasyiah tanpa judul"}</h3><p>PDF halaman {n.pdfPage} • {n.category} {n.teacher ? "• "+n.teacher : ""}</p>{n.quotedText && <small>{n.quotedText}</small>}</div></article>)}</div>}
        {showNote && <div className="modal"><div className="modal-card"><h3>Tambah Hasyiah</h3><p>Catatan awal dibuat sebagai data lokal dan nanti akan dihubungkan langsung ke halaman kitab.</p><button className="primary" onClick={createNote}>Simpan Hasyiah</button><button onClick={()=>setShowNote(false)}>Batal</button></div></div>}
      </section> :
      <>
        <section className="hero"><div><em>بسم الله الرحمن الرحيم</em><h2>Kitab Pribadi</h2><p>Perpustakaan turats pribadi dengan pembacaan kitab, fihris, dan Hasyiah yang tertata.</p></div><div className="actions"><button className="primary" onClick={()=>setAdmin(v=>!v)}><ShieldCheck size={17}/>{admin?"Tutup Admin":"Mode Admin"}</button>{admin&&<label className="upload"><Upload size={17}/>Upload PDF<input type="file" accept="application/pdf" onChange={e=>e.target.files?.[0]&&addPdf(e.target.files[0])}/></label>}</div></section>
        <section><div className="title"><h3>Kitab Saya</h3><span>{books.length} kitab</span></div>{books.length===0?<div className="empty"><BookOpen size={34}/><h3>Belum ada kitab</h3><p>Masuk Mode Admin lalu upload PDF kitab pertama.</p></div>:<div className="books">{books.map(b=><article className="book" key={b.id} onClick={()=>b.url&&setActive(b)}><BookOpen size={30}/><div><h3>{b.name}</h3><p>PDF • {(b.size/1024/1024).toFixed(1)} MB</p></div></article>)}</div>}</section>
      </>}
    </main>
  </div>;
}