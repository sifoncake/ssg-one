import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, verifyLineToken, getUserPermissions } from '@/lib/server';

// Generate unique sale code
function generateSaleCode(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `S${dateStr}-${random}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lineIdToken, storeId, itemName, itemType, quantity, unitPrice, paymentMethod, notes } = body;

    // Verify LINE token
    const lineUserId = await verifyLineToken(lineIdToken);
    if (!lineUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const userPermissions = await getUserPermissions(lineUserId);
    if (!userPermissions.permissions.includes('payment')) {
      return NextResponse.json({ error: 'No permission for payment' }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();

    // Calculate amount
    const amount = (quantity || 1) * unitPrice;

    // Insert sale
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        sale_code: generateSaleCode(),
        date: new Date().toISOString().split('T')[0],
        store_id: storeId,
        staff_id: userPermissions.staffId,
        item_name: itemName,
        item_type: itemType,
        quantity: quantity || 1,
        unit_price: unitPrice,
        amount,
        payment_method: paymentMethod,
        notes: notes || null,
      })
      .select()
      .single();

    if (saleError) {
      console.error('Failed to insert sale:', saleError);
      return NextResponse.json({ error: 'Failed to register sale' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sale: saleData,
    });

  } catch (error) {
    console.error('Error in sales API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get sales summary
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

    const supabase = getSupabaseAdmin();

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Get today's sales
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('amount, item_type, store_id')
      .eq('date', today);

    if (salesError) {
      console.error('Failed to fetch sales:', salesError);
      return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
    }

    const totalAmount = salesData?.reduce((sum, s) => sum + s.amount, 0) || 0;
    const transactionCount = salesData?.length || 0;

    return NextResponse.json({
      date: today,
      totalAmount,
      transactionCount,
    });

  } catch (error) {
    console.error('Error in sales API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
