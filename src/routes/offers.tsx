import {createFileRoute} from '@tanstack/react-router';
import {CatalogPage,parseShop} from '@/components/CatalogPage';
export const Route=createFileRoute('/offers')({validateSearch:parseShop,component:()=> <CatalogPage offers search={Route.useSearch()}/>});
