import {createFileRoute,Link} from '@tanstack/react-router';
import {useSite} from '@/lib/site';
export const Route=createFileRoute('/page/$slug')({component:Page});
function Page(){const {config}=useSite();const {slug}=Route.useParams();const p=config.pages.find(p=>p.slug===slug);return <div className="wrap page"><Link to="/" className="breadcrumb">الرئيسية</Link>{p?<article className="panel text-page"><h1>{p.title}</h1><p className="preserve-lines">{p.body}</p></article>:<h1>الصفحة غير موجودة</h1>}</div>}
