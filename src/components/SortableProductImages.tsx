import {useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent} from 'react';
import {GripVertical, ImagePlus, X} from 'lucide-react';
import {Picture} from './StoreUI';

type Props = {
  images: string[];
  uploading: boolean;
  onUpload: (files: FileList | null) => void;
  onRemove: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  variant?: boolean;
};
type Drag = {pointer: number; from: number; to: number; x: number; y: number; moved: boolean};

/** Pointer-based image ordering supports both mouse and touch. Keyboard ordering is also available. */
export function SortableProductImages({images, uploading, onUpload, onRemove, onReorder, variant = false}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [over, setOver] = useState<{from: number; to: number} | null>(null);

  const hitIndex = (x: number, y: number): number | null => {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-sortable-image-index]');
    if (!element || !root.current?.contains(element)) return null;
    const value = Number(element.dataset.sortableImageIndex);
    return Number.isInteger(value) && value >= 0 && value < images.length ? value : null;
  };
  const start = (e: ReactPointerEvent<HTMLDivElement>, index: number) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = {pointer: e.pointerId, from: index, to: index, x: e.clientX, y: e.clientY, moved: false};
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const active = drag.current;
    if (!active || e.pointerId !== active.pointer) return;
    if (!active.moved && Math.hypot(e.clientX - active.x, e.clientY - active.y) < 6) return;
    active.moved = true;
    const target = hitIndex(e.clientX, e.clientY);
    if (target !== null) active.to = target;
    setOver(old => old?.from === active.from && old?.to === active.to ? old : {from: active.from, to: active.to});
  };
  const end = (e: ReactPointerEvent<HTMLDivElement>) => {
    const active = drag.current;
    if (!active || active.pointer !== e.pointerId) return;
    // Pick up the final destination even if it wasn't registered on the last move.
    const final = hitIndex(e.clientX, e.clientY);
    drag.current = null;
    setOver(null);
    if ((active.moved || Math.hypot(e.clientX - active.x, e.clientY - active.y) >= 6) && (final ?? active.to) !== active.from) onReorder(active.from, final ?? active.to);
  };
  const cancel = () => {drag.current = null; setOver(null)};
  const keyMove = (e: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    let to = index;
    if (e.key === 'ArrowLeft') to = index + 1; // RTL gallery: the next item is visually to the left.
    else if (e.key === 'ArrowRight') to = index - 1;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = images.length - 1;
    else return;
    e.preventDefault();
    if (to >= 0 && to < images.length && to !== index) {
      onReorder(index, to);
      // Keep the handle selected so repeated keyboard moves still work after React renders.
      requestAnimationFrame(() => root.current?.querySelectorAll<HTMLButtonElement>('.image-drag-handle')[to]?.focus());
    }
  };
  return <div className={'image-editor sortable-image-gallery' + (variant ? ' sortable-variant-gallery' : '')} ref={root} dir="rtl">
    {images.map((url, index) => <div
      className={'sortable-image-item' + (over?.from === index ? ' is-dragging' : '') + (over?.to === index && over.from !== index ? ' is-drop-target' : '')}
      data-sortable-image-index={index}
      key={url + '::' + index}
      onPointerDown={e => start(e, index)} onPointerMove={move} onPointerUp={end}
      onPointerCancel={cancel} onLostPointerCapture={cancel}
      onDragStart={e => e.preventDefault()}
    >
      <Picture src={url}/>
      {index === 0 && <small className="image-primary-label">الرئيسية</small>}
      <button type="button" className="image-delete" aria-label={'حذف الصورة رقم ' + (index + 1)} onPointerDown={e=>e.stopPropagation()} onClick={() => onRemove(index)}><X size={15}/></button>
      <button type="button" className="image-drag-handle" aria-label={'اسحب الصورة أو هذا المقبض لتغيير ترتيب الصورة رقم ' + (index + 1) + '، أو استخدم أسهم لوحة المفاتيح'} title="اسحب الصورة لتغيير ترتيبها" onKeyDown={e => keyMove(e, index)}>
        <GripVertical size={17}/><span>اسحب للترتيب</span>
      </button>
    </div>)}
    <label className="upload-tile"><ImagePlus/><span>{uploading ? 'جاري الرفع...' : variant ? 'إضافة صور التفريعة (متعددة)' : 'إضافة صور متعددة'}</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} multiple onChange={e => {onUpload(e.target.files); e.target.value = ''}}/></label>
  </div>;
}
