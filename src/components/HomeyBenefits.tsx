import {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';
import {Leaf, PackageCheck, ShieldCheck, Truck} from 'lucide-react';
import {useCopy} from '@/lib/site';
import {latinDigits} from '@/lib/digits';

/**
 * Storefront trust/benefits presentation. On large screens all three benefits
 * remain visible (as designed), while the active-card accent rotates.
 * On phones this is a genuine native scroll-snap carousel with touch dragging
 * and gentle automatic advancement. No slider library or extra images needed.
 */
export function HomeyBenefits({title = 'معاك في كل خطوة'}: {title?: string}) {
  const copy = useCopy();
  const headingId = useId();
  const shippingTitle = latinDigits(copy('trustShipping', 'تفاصيل الشحن واضحة'));
  const shippingNote = latinDigits(copy('shippingNote', 'تكلفة الشحن تظهر بعد اختيار منطقة التوصيل.'));
  const qualityTitle = latinDigits(copy('trustQuality', 'اختيارات لبيتك'));
  const trackingTitle = latinDigits(copy('trustOrders', 'تابع طلبك بسهولة'));
  const cards = useMemo(() => [
    {
      id: 'shipping',
      Icon: Truck,
      title: shippingTitle,
      subtitle: shippingNote,
    },
    {
      id: 'quality',
      Icon: ShieldCheck,
      title: qualityTitle,
      subtitle: 'وصف ومواصفات لكل منتج بكل وضوح.',
    },
    {
      id: 'tracking',
      Icon: PackageCheck,
      title: trackingTitle,
      subtitle: 'حالة الطلب وتفاصيل الشحن في مكان واحد.',
    },
  ], [shippingTitle, shippingNote, qualityTitle, trackingTitle]);

  const viewport = useRef<HTMLDivElement | null>(null);
  const section = useRef<HTMLElement | null>(null);
  const pausedUntil = useRef(0);
  const activeRef = useRef(0);
  const hovered = useRef(false);
  const inView = useRef(true);
  const [active, setActive] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const pauseForInteraction = useCallback(() => {
    pausedUntil.current = Date.now() + 8000;
  }, []);

  /** Calculate the next scroll from actual screen coordinates. This works in RTL browsers. */
  const focusCard = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const track = viewport.current;
    const item = track?.children[index] as HTMLElement | undefined;
    if (!track || !item) return;
    const trackRect = track.getBoundingClientRect();
    const cardRect = item.getBoundingClientRect();
    const delta = (cardRect.left + cardRect.width / 2) - (trackRect.left + trackRect.width / 2);
    if (Math.abs(delta) > 1) track.scrollBy({left: delta, behavior});
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setMobile(media.matches);
      setReducedMotion(motion.matches);
    };
    update();
    media.addEventListener('change', update);
    motion.addEventListener('change', update);
    return () => {
      media.removeEventListener('change', update);
      motion.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    const node = section.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      inView.current = Boolean(entries[0]?.isIntersecting);
    }, {threshold: 0.15});
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(() => {
      if (!inView.current || hovered.current || document.visibilityState !== 'visible' ||
          document.documentElement.dataset.motion === 'false' ||
          Date.now() < pausedUntil.current ||
          (section.current?.contains(document.activeElement) && document.activeElement !== document.body)) return;
      const next = (activeRef.current + 1) % cards.length;
      activeRef.current = next;
      setActive(next);
      if (mobile) focusCard(next);
    }, 3900);
    return () => window.clearInterval(timer);
  }, [mobile, reducedMotion, cards.length, focusCard]);

  const onScroll = useCallback(() => {
    if (!mobile || !viewport.current) return;
    const track = viewport.current;
    const centre = track.getBoundingClientRect().left + track.clientWidth / 2;
    let nearest = 0;
    let distance = Number.POSITIVE_INFINITY;
    Array.from(track.children).forEach((child, index) => {
      const rect = child.getBoundingClientRect();
      const diff = Math.abs(rect.left + rect.width / 2 - centre);
      if (diff < distance) { nearest = index; distance = diff; }
    });
    activeRef.current = nearest;
    setActive(previous => previous === nearest ? previous : nearest);
  }, [mobile]);

  const selectCard = (index: number) => {
    pauseForInteraction();
    activeRef.current = index;
    setActive(index);
    if (mobile) focusCard(index);
  };

  return <section ref={section} className="wrap section homey-benefits" aria-labelledby={headingId}>
    <Leaf aria-hidden="true" className="homey-benefits-leaf homey-benefits-leaf-top" strokeWidth={1.1}/>
    <Leaf aria-hidden="true" className="homey-benefits-leaf homey-benefits-leaf-bottom" strokeWidth={1.1}/>
    <div className="homey-benefits-heading">
      <span aria-hidden="true" className="homey-benefits-spark">✳</span>
      <h2 id={headingId}>{latinDigits(title)}</h2>
      <svg aria-hidden="true" className="homey-benefits-underline" viewBox="0 0 218 20" fill="none"><path d="M4 13C62-4 134-1 214 8" stroke="#F3A38B" strokeWidth="5" strokeLinecap="round" opacity=".68"/></svg>
    </div>
    <div className="homey-benefits-track" ref={viewport} role="region" aria-roledescription="carousel"
      aria-label="مميزات التسوق من هومي - اسحب للتنقل"
      onScroll={onScroll}
      onPointerDown={pauseForInteraction}
      onTouchStart={pauseForInteraction}
      onWheel={pauseForInteraction}
      onFocusCapture={pauseForInteraction}
      onMouseEnter={() => {if (!mobile) hovered.current = true;}}
      onMouseLeave={() => {hovered.current = false;}}>
      {cards.map(({id, Icon, title:cardTitle, subtitle}, index) =>
        <article key={id} className={'homey-benefit-card' + (active === index ? ' is-active' : '')} aria-label={cardTitle}>
          <div className="homey-benefit-icon" aria-hidden="true"><Icon size={40} strokeWidth={1.8}/><span className="homey-benefit-rays"/></div>
          <h3>{cardTitle}</h3>
          <p>{subtitle}</p>
          <span aria-hidden="true" className="homey-benefit-rule"/>
        </article>
      )}
    </div>
    <div className="homey-benefits-pagination" role="group" aria-label="اختار ميزة من مزايا هومي">
      {cards.map(({id,title:cardTitle}, index) => <button
        key={id} type="button" className={'homey-benefit-dot' + (active === index ? ' is-active' : '')}
        aria-label={'عرض '+cardTitle} aria-current={active === index ? 'true' : undefined}
        onClick={() => selectCard(index)}/>)}
    </div>
  </section>;
}
