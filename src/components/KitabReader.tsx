import { useEffect, useRef, useState } from "react";
import { X, ChevronRight, ChevronLeft, ZoomIn, ZoomOut } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
type Props={title:string;pdfUrl:string;onClose:()=>void};
export function KitabReader({title,pdfUrl,onClose}:Props){
 const left=useRef<HTMLCanvasElement>(null),right=useRef<HTMLCanvasElement>(null);
 const [page,setPage]=useState(1),[total,setTotal]=useState(0),[scale,setScale]=useState(1.05),[loading,setLoading]=useState(true);
 useEffect(()=>{let cancelled=false;(async()=>{setLoading(true);const pdf=await pdfjsLib.getDocument(pdfUrl).promise;if(cancelled)return;setTotal(pdf.numPages);const render=async(n:number,c:HTMLCanvasElement|null)=>{if(!c||n<1||n>pdf.numPages)return;const p=await pdf.getPage(n),v=p.getViewport({scale});c.width=v.width;c.height=v.height;await p.render({canvasContext:c.getContext("2d")!,viewport:v}).promise};await Promise.all([render(page,right.current),render(page+1,left.current)]);setLoading(false)})();return()=>{cancelled=true}},[pdfUrl,page,scale]);
 const next=()=>setPage(p=>Math.min(Math.max(1,total-1),p+2)),prev=()=>setPage(p=>Math.max(1,p-2));
 return <div className="reader"><header className="readerbar"><button onClick={onClose}><X size={19}/></button><strong>{title}</strong><div className="readercontrols"><button onClick={()=>setScale(s=>Math.max(.7,s-.1))}><ZoomOut size={17}/></button><span>{page}–{Math.min(page+1,total)} / {total}</span><button onClick={()=>setScale(s=>Math.min(1.7,s+.1))}><ZoomIn size={17}/></button></div></header><div className="bookstage" dir="rtl"><button className="turn prev" onClick={prev} disabled={page===1}><ChevronRight/></button><div className="physical-book"><div className="page-sheet left"><canvas ref={left}/></div><div className="spine"/><div className="page-sheet right"><canvas ref={right}/></div>{loading&&<div className="readerloading">Membuka halaman kitab…</div>}</div><button className="turn next" onClick={next} disabled={page>=total-1}><ChevronLeft/></button></div></div>;
}