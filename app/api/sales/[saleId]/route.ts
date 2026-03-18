import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, verifyLineToken } from '@/lib/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ saleId: string }> }
) {
  try {
    const lineIdToken = request.headers.get('x-line-id-token');

    if (!lineIdToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lineUserId = await verifyLineToken(lineIdToken);
    if (!lineUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { saleId } = await params;

    if (!saleId) {
      return NextResponse.json({ error: 'Sale ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get sale header
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('id, sale_code, total_amount, payment_method, status')
      .eq('id', saleId)
      .single();

    if (saleError || !sale) {
      console.error('Failed to fetch sale:', saleError);
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    // Get sale items
    const { data: items, error: itemsError } = await supabase
      .from('sale_items')
      .select('item_name, item_type, quantity, unit_price, amount')
      .eq('sale_id', saleId)
      .order('created_at', { ascending: true });

    if (itemsError) {
      console.error('Failed to fetch sale items:', itemsError);
      return NextResponse.json({ error: 'Failed to fetch sale items' }, { status: 500 });
    }

    return NextResponse.json({
      sale: {
        ...sale,
        items: items || [],
      },
    });

  } catch (error) {
    console.error('Error in sales/[saleId] API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
