import { useEffect, useRef, useState } from "react";
import { X, ChevronRight, ChevronLeft, ZoomIn, ZoomOut, List, Search } from "lucide-react";
import { getFihrisForBook, type FihrisEntry } from "../data/fihris";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type Props = { title: string; pdfUrl: string; onClose: () => void };
type TurnDirection = "next" | "prev" | null;

export function KitabReader({ title, pdfUrl, onClose }: Props) {
  const left = useRef<HTMLCanvasElement>(null);
  const right = useRef<HTMLCanvasElement>(null);
  const nextLeft = useRef<HTMLCanvasElement>(null);
  const nextRight = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [scale, setScale] = useState(1.05);
  const [loading, setLoading] = useState(true);
  const [turn, setTurn] = useState<TurnDirection>(null);
  const [progress, setProgress] = useState(0);
  const [turnImage, setTurnImage] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [showFihris, setShowFihris] = useState(false);
  const [fihrisQuery, setFihrisQuery] = useState("");
  const pointerId = useRef<number | null>(null);
  const startX = useRef(0);
  const turnWidth = useRef(1);

  useEffect(() => {
    let cancelled = false;
    let pdf: pdfjsLib.PDFDocumentProxy | null = null;
    (async () => {
      setLoading(true);
      pdf = await pdfjsLib.getDocument(pdfUrl).promise;
      if (cancelled) return;
      setTotal(pdf.numPages);

      const render = async (n: number, c: HTMLCanvasElement | null) => {
        if (!c || n < 1 || n > pdf!.numPages) return;
        const p = await pdf!.getPage(n);
        const v = p.getViewport({ scale });
        c.width = v.width;
        c.height = v.height;
        await p.render({ canvasContext: c.getContext("2d")!, viewport: v }).promise;
      };

      await Promise.all([
        render(page, right.current),
        render(page + 1, left.current),
        render(page + 2, nextRight.current),
        render(page + 3, nextLeft.current),
      ]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
      pdf?.destroy();
    };
  }, [pdfUrl, page, scale]);

  const canNext = page + 2 <= total;
  const canPrev = page > 1;
  const fihris = getFihrisForBook(title);
  const filteredFihris = fihris.filter((item) => item.title.includes(fihrisQuery.trim()));
  const goToFihris = (item: FihrisEntry) => {
    const target = item.pdfPage % 2 === 0 ? item.pdfPage - 1 : item.pdfPage;
    setPage(Math.max(1, target));
    setShowFihris(false);
  };

  const beginTurn = (direction: TurnDirection, x: number, id: number) => {
    if ((direction === "next" && !canNext) || (direction === "prev" && !canPrev) || animating) return;
    const canvas = direction === "next" ? right.current : left.current;
    if (!canvas) return;
    pointerId.current = id;
    startX.current = x;
    turnWidth.current = Math.max(240, (stage.current?.clientWidth ?? 800) / 2);
    setTurnImage(canvas.toDataURL("image/jpeg", 0.82));
    setTurn(direction);
    setProgress(0);
  };

  const moveTurn = (x: number) => {
    if (!turn || pointerId.current === null) return;
    const delta = turn === "next" ? startX.current - x : x - startX.current;
    setProgress(Math.max(0, Math.min(1, delta / turnWidth.current)));
  };

  const finishTurn = () => {
    if (!turn || pointerId.current === null) return;
    const shouldComplete = progress >= 0.28;
    setAnimating(true);
    setProgress(shouldComplete ? 1 : 0);
    window.setTimeout(() => {
      if (shouldComplete) {
        setPage((p) => turn === "next" ? Math.min(Math.max(1, total - 1), p + 2) : Math.max(1, p - 2));
      }
      setTurn(null);
      setTurnImage(null);
      setProgress(0);
      setAnimating(false);
      pointerId.current = null;
    }, 260);
  };

  const cancelTurn = () => {
    setAnimating(true);
    setProgress(0);
    window.setTimeout(() => {
      setTurn(null);
      setTurnImage(null);
      setAnimating(false);
      pointerId.current = null;
    }, 220);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const direction: TurnDirection = localX > rect.width / 2 ? "next" : "prev";
    beginTurn(direction, e.clientX, e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => moveTurn(e.clientX);
  const onPointerUp = () => finishTurn();
  const onPointerCancel = () => cancelTurn();

  const next = () => {
    if (!canNext || animating) return;
    setTurn("next"); setProgress(1); setAnimating(true);
    if (right.current) setTurnImage(right.current.toDataURL("image/jpeg", 0.82));
    window.setTimeout(() => { setPage((p) => Math.min(Math.max(1, total - 1), p + 2)); setTurn(null); setTurnImage(null); setProgress(0); setAnimating(false); }, 260);
  };

  const prev = () => {
    if (!canPrev || animating) return;
    setTurn("prev"); setProgress(1); setAnimating(true);
    if (left.current) setTurnImage(left.current.toDataURL("image/jpeg", 0.82));
    window.setTimeout(() => { setPage((p) => Math.max(1, p - 2)); setTurn(null); setTurnImage(null); setProgress(0); setAnimating(false); }, 260);
  };

  return (
    <div className="reader">
      <header className="readerbar">
        <button onClick={onClose}><X size={19} /></button>
        <strong>{title}</strong>
        <div className="readercontrols">
          <button onClick={() => setScale((s) => Math.max(.7, s - .1))}><ZoomOut size={17} /></button>
          {fihris.length > 0 && <button className="fihrisToggle" onClick={() => setShowFihris(true)}><List size={17} /> Fihris</button>}
          <span>{page}–{Math.min(page + 1, total)} / {total}</span>
          <button onClick={() => setScale((s) => Math.min(1.7, s + .1))}><ZoomIn size={17} /></button>
        </div>
      </header>

      {showFihris && (
        <div className="fihrisOverlay" onClick={() => setShowFihris(false)}>
          <aside className="fihrisPanel" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="fihrisHead">
              <div>
                <span>فهرس المحتويات</span>
                <strong>Daftar Isi Kitab</strong>
              </div>
              <button onClick={() => setShowFihris(false)}><X size={19} /></button>
            </div>
            <label className="fihrisSearch" dir="rtl">
              <Search size={16} />
              <input value={fihrisQuery} onChange={(e) => setFihrisQuery(e.target.value)} placeholder="Cari bab atau فصل..." />
            </label>
            <div className="fihrisList">
              {filteredFihris.map((item, i) => (
                <button className="fihrisItem" key={i} onClick={() => goToFihris(item)}>
                  <span className="fihrisText">{item.title}</span>
                  <small>ص. {item.printedPage} · PDF {item.pdfPage}</small>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}

      <div
        ref={stage}
        className="bookstage"
        dir="rtl"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <button className="turn prev" onPointerDown={(e) => e.stopPropagation()} onClick={prev} disabled={!canPrev}><ChevronRight /></button>
        <div className="physical-book">
          <div className="page-sheet left" style={turn === "prev" ? { clipPath: `polygon(${progress * 100}% 0, 100% 0, 100% 100%, ${progress * 100}% 100%)` } : undefined}>
            <canvas ref={left} />
          </div>
          <div className="spine" />
          <div className="page-sheet right" style={turn === "next" ? { clipPath: `polygon(0 0, ${100 - progress * 100}% 0, ${100 - progress * 100}% 100%, 0 100%)` } : undefined}>
            <canvas ref={right} />
          </div>

          <div className="target-pages" aria-hidden="true">
            <div className="page-sheet left"><canvas ref={nextLeft} /></div>
            <div className="spine" />
            <div className="page-sheet right"><canvas ref={nextRight} /></div>
          </div>

          {turn && turnImage && (
            <div
              className={`turning-page ${turn} ${animating ? "animating" : ""}`}
              style={{
                backgroundImage: `url(${turnImage})`,
                transform: `perspective(1000px) rotateZ(${turn === "next" ? progress * 24 : -progress * 24}deg) scaleX(${1 - progress * 0.08})`,
                clipPath: turn === "next"
                  ? `polygon(${100 - progress * 100}% 0, 100% 0, 100% 100%, ${100 - progress * 100}% 100%)`
                  : `polygon(0 0, ${progress * 100}% 0, ${progress * 100}% 100%, 0 100%)`,
                boxShadow: turn === "next"
                  ? `${-18 * progress}px 0 24px rgba(0,0,0,${Math.min(0.42, progress * 0.42)})`
                  : `${18 * progress}px 0 24px rgba(0,0,0,${Math.min(0.42, progress * 0.42)})`,
              }}
            >
              <span className="curl-highlight" />
            </div>
          )}
          {loading && <div className="readerloading">Membuka halaman kitab…</div>}
        </div>
        <button className="turn next" onPointerDown={(e) => e.stopPropagation()} onClick={next} disabled={!canNext}><ChevronLeft /></button>
      </div>
    </div>
  );
}