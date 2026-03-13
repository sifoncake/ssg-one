import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, verifyLineToken, getUserPermissions } from '@/lib/server';

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

    const userPermissions = await getUserPermissions(lineUserId);
    const supabase = getSupabaseAdmin();

    // Fetch stores
    let query = supabase
      .from('stores')
      .select('id, store_code, store_name, location')
      .eq('status', 'active')
      .order('store_code');

    if (!userPermissions.hasAllStoreAccess) {
      if (userPermissions.storeIds.length > 0) {
        query = query.in('id', userPermissions.storeIds);
      } else {
        // No access to any store
        return NextResponse.json({ stores: [] });
      }
    }

    const { data: stores, error } = await query;

    if (error) {
      console.error('Failed to fetch stores:', error);
      return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
    }

    return NextResponse.json({ stores: stores || [] });

  } catch (error) {
    console.error('Error in stores API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
