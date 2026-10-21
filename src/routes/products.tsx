import {createFileRoute} from '@tanstack/react-router';
import {CatalogPage,parseShop} from '@/components/CatalogPage';
export const Route=createFileRoute('/products')({validateSearch:parseShop,component:()=> <CatalogPage search={Route.useSearch()}/>});
