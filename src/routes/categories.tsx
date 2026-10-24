import {createFileRoute,Link} from '@tanstack/react-router';
import {useCatalog,Picture,Notice,Loading} from '@/components/StoreUI';
import {useSite,useCopy} from '@/lib/site';
export const Route=createFileRoute('/categories')({head:()=>({meta:[{title:'أقسام الأدوات المنزلية | هومي مصر'},{name:'description',content:'تصفح أقسام أدوات المطبخ والتنظيم والتخزين والديكور ومستلزمات البيت في هومي مصر.'}]}),component:Categories});
function Categories(){const copy=useCopy();const {config}=useSite();const {categories,loading,error}=useCatalog();return <div className="wrap page"><h1>{copy('categoriesTitle')}</h1><p className="muted">{copy('categoriesSubtitle')}</p>{error?<Notice>{error}</Notice>:loading?<Loading/>:<div className="room-grid categories-grid">{categories.map(c=><Link key={c.id} to="/category/$slug" params={{slug:c.slug}}><Picture src={c.image_path} alt={c.name_ar}/><span>{c.name_ar}</span></Link>)}</div>}</div>}
