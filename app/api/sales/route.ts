import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, verifyLineToken, getUserPermissions } from '@/lib/server';

// ローカル時間で日付を取得
function getLocalDate(): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()).replace(/\//g, '-');
}

// ローカル時間で日時を取得（YYYYMMDDHHmmss形式）
function getLocalDateTime(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
  return `${get('year')}${get('month')}${get('day')}${get('hour')}${get('minute')}${get('second')}`;
}

type SaleItem = {
  itemName: string;
  itemType: '施術' | '物販' | '回数券';
  quantity: number;
  unitPrice: number;
  taxRate: 10 | 8;
  notes?: string;
};

type SaleRequest = {
  lineIdToken: string;
  storeId: string;
  customerId?: string;
  paymentMethod: '現金' | 'カード' | 'QRコード' | '回数券';
  discount?: number;
  discountReason?: string;
  notes?: string;
  items: SaleItem[];
};

// Generate sale code: {店舗コード10桁}-{識別コード6桁}-{日時14桁}-{通番6桁}
// 例: SBY0000001-R00001-20260313193045-000001
async function generateSaleCode(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  storeCode: string,
  identifierCode: string,
  isDevice: boolean,
  staffId: string,
  date: string
): Promise<string> {
  // 店舗コード: 10桁（不足分はゼロ埋め）
  const paddedStoreCode = storeCode.padEnd(10, '0').slice(0, 10);

  // 識別コード: R/S + 5桁数字
  const prefix = isDevice ? 'R' : 'S';
  const numericPart = identifierCode.replace(/\D/g, '').padStart(5, '0').slice(-5);
  const paddedIdentifier = `${prefix}${numericPart}`;

  // 日時: YYYYMMDDHHmmss（14桁、ローカル時間）
  const dateTimeStr = getLocalDateTime();

  // 通番: 同じ日・同じスタッフの連番
  const { count } = await supabase
    .from('sales')
    .select('*', { count: 'exact', head: true })
    .eq('staff_id', staffId)
    .eq('date', date);

  const nextNumber = (count || 0) + 1;
  const paddedNumber = String(nextNumber).padStart(6, '0');

  return `${paddedStoreCode}-${paddedIdentifier}-${dateTimeStr}-${paddedNumber}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: SaleRequest = await request.json();
    const {
      lineIdToken,
      storeId,
      customerId,
      paymentMethod,
      discount = 0,
      discountReason,
      notes,
      items,
    } = body;

    // Validate items
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

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

    if (!userPermissions.staffId) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();

    // Get store info
    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .select('store_code')
      .eq('id', storeId)
      .single();

    if (storeError || !storeData) {
      return NextResponse.json({ error: 'Store not found' }, { status: 400 });
    }

    // Get staff info
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('staff_code, device_code, role')
      .eq('id', userPermissions.staffId)
      .single();

    if (staffError || !staffData) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 400 });
    }

    // Determine identifier code (device_code for devices, staff_code for people)
    const isDevice = staffData.role === '端末';
    const identifierCode = isDevice
      ? staffData.device_code
      : staffData.staff_code;

    const today = getLocalDate();

    // Generate sale code
    const saleCode = await generateSaleCode(
      supabase,
      storeData.store_code,
      identifierCode,
      isDevice,
      userPermissions.staffId,
      today
    );

    // Calculate totals
    let subtotal = 0;
    let taxAmount10 = 0;
    let taxAmount8 = 0;

    const processedItems = items.map(item => {
      const amount = item.quantity * item.unitPrice;
      subtotal += amount;

      // Calculate tax (税込価格から税額を算出)
      const taxRate = item.taxRate || 10;
      const taxAmount = Math.floor(amount * taxRate / (100 + taxRate));

      if (taxRate === 10) {
        taxAmount10 += taxAmount;
      } else {
        taxAmount8 += taxAmount;
      }

      return {
        item_name: item.itemName,
        item_type: item.itemType,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: taxRate,
        amount,
        notes: item.notes || null,
      };
    });

    const totalAmount = subtotal - discount;

    // Insert sale
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        sale_code: saleCode,
        date: today,
        store_id: storeId,
        staff_id: userPermissions.staffId,
        customer_id: customerId || null,
        subtotal,
        tax_amount_10: taxAmount10,
        tax_amount_8: taxAmount8,
        discount,
        discount_reason: discountReason || null,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        notes: notes || null,
      })
      .select()
      .single();

    if (saleError) {
      console.error('Failed to insert sale:', saleError);
      return NextResponse.json({ error: 'Failed to register sale' }, { status: 500 });
    }

    // Insert sale items
    const itemsToInsert = processedItems.map(item => ({
      ...item,
      sale_id: saleData.id,
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Failed to insert sale items:', itemsError);
      // Rollback: delete the sale
      await supabase.from('sales').delete().eq('id', saleData.id);
      return NextResponse.json({ error: 'Failed to register sale items' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sale: {
        ...saleData,
        items: processedItems,
      },
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
    const today = getLocalDate();

    // Get today's sales
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('total_amount, status')
      .eq('date', today)
      .eq('status', 'completed');

    if (salesError) {
      console.error('Failed to fetch sales:', salesError);
      return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
    }

    const totalAmount = salesData?.reduce((sum, s) => sum + s.total_amount, 0) || 0;
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
