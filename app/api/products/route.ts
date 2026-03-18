import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, verifyLineToken } from '@/lib/server';

export async function GET(request: NextRequest) {
  try {
    const lineIdToken = request.headers.get('x-line-id-token');

    if (!lineIdToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lineUserId = await verifyLineToken(lineIdToken);
    if (!lineUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get store_id from query params (optional)
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id');

    const supabase = getSupabaseAdmin();

    // Build query: active products, sorted by sort_order
    let query = supabase
      .from('products')
      .select('id, name, type, price, tax_rate, store_id')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    // Filter: global products (store_id IS NULL) + store-specific products
    if (storeId) {
      query = query.or(`store_id.is.null,store_id.eq.${storeId}`);
    } else {
      // No store specified: return only global products
      query = query.is('store_id', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch products:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    return NextResponse.json({ products: data });

  } catch (error) {
    console.error('Error in products API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
