import {createFileRoute, Link} from '@tanstack/react-router';
import {Heart, ArrowLeft} from 'lucide-react';
import {useCatalog, ProductCard, Loading, Notice} from '@/components/StoreUI';
import {cards} from '@/lib/commerce';
import {useFavorites} from '@/lib/favorites';

export const Route = createFileRoute('/favorites')({
  head: () => ({meta:[{title:'المفضلة | هومي HOMEY'},{name:'description',content:'منتجاتك المفضلة في متجر هومي محفوظة على جهازك.'},{name:'robots',content:'noindex,follow'}]}),
  component: FavoritesPage
});
function FavoritesPage() {
  const {ids} = useFavorites();
  const {products, loading, error, reload} = useCatalog();
  const matching = new Map(cards(products).map(item => [item.v.id, item]));
  const saved = ids.map(id => matching.get(id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  return <div className="wrap page homey-favorites-page">
    <div className="homey-favorites-page-head"><div><span className="homey-section-kicker">اختياراتك أنت</span><h1><Heart size={28} aria-hidden="true"/> المفضلة</h1><p>كل الحاجات اللي عجبتك في مكان واحد. محفوظة على المتصفح ده بس.</p></div><Link to="/products" className="btn outline">كمّل تسوق <ArrowLeft size={17}/></Link></div>
    {error && <Notice>{error}<button type="button" onClick={reload} className="text-button">إعادة المحاولة</button></Notice>}
    {loading ? <Loading/> : saved.length ? <div className="product-grid">{saved.map(item => <ProductCard key={item.v.id} {...item}/>)}</div> : !error ? <div className="homey-favorites-empty"><Heart size={37}/><h2>لسه ما ضفتش منتجات للمفضلة</h2><p>دوس على علامة القلب على أي منتج يعجبك، وهتلاقيه هنا وقت ما تحب.</p><Link to="/products" className="btn">شوف المنتجات <ArrowLeft size={17}/></Link></div> : null}
  </div>;
}
