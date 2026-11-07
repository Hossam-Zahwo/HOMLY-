import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(){return NextResponse.json({ok:true,mode:'demo',project:'homey-sodfa-orders-manager'})}
