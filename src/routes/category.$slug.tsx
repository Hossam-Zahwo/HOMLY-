import {createFileRoute} from '@tanstack/react-router';
import {CatalogPage,parseShop} from '@/components/CatalogPage';
export const Route=createFileRoute('/category/$slug')({validateSearch:parseShop,component:()=> <CatalogPage categorySlug={Route.useParams().slug} search={Route.useSearch()}/>});
