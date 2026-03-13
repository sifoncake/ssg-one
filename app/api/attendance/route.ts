import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, verifyLineToken, getUserPermissions } from '@/lib/server';

// 休憩時間の自動計算（労働基準法に基づく）
function calculateBreakMinutes(clockIn: Date, clockOut: Date): number {
  const workMinutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);
  if (workMinutes >= 8 * 60) return 60; // 8時間以上 → 60分
  if (workMinutes >= 6 * 60) return 45; // 6時間以上 → 45分
  return 0;
}

// 出勤
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lineIdToken, storeId } = body;

    const lineUserId = await verifyLineToken(lineIdToken);
    if (!lineUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(lineUserId);
    if (!userPermissions.staffId) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // 既存レコードを確認
    const { data: existing } = await supabase
      .from('attendance')
      .select('id, clock_in, clock_out')
      .eq('staff_id', userPermissions.staffId)
      .eq('date', today)
      .single();

    if (existing?.clock_in && !existing?.clock_out) {
      return NextResponse.json({
        error: 'Already clocked in',
        attendance: existing
      }, { status: 400 });
    }

    if (existing?.clock_out) {
      return NextResponse.json({
        error: 'Already clocked out for today',
        attendance: existing
      }, { status: 400 });
    }

    // 新規出勤レコード作成
    const { data: attendance, error } = await supabase
      .from('attendance')
      .insert({
        staff_id: userPermissions.staffId,
        store_id: storeId,
        date: today,
        clock_in: now,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to clock in:', error);
      return NextResponse.json({ error: 'Failed to clock in' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      action: 'clock_in',
      attendance,
    });

  } catch (error) {
    console.error('Error in attendance API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 退勤
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { lineIdToken, breakMinutes } = body;

    const lineUserId = await verifyLineToken(lineIdToken);
    if (!lineUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = await getUserPermissions(lineUserId);
    if (!userPermissions.staffId) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    // 今日の出勤レコードを取得
    const { data: existing } = await supabase
      .from('attendance')
      .select('id, clock_in, clock_out')
      .eq('staff_id', userPermissions.staffId)
      .eq('date', today)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'No clock in record for today' }, { status: 400 });
    }

    if (existing.clock_out) {
      return NextResponse.json({
        error: 'Already clocked out',
        attendance: existing
      }, { status: 400 });
    }

    // 休憩時間の計算（手動指定がなければ自動計算）
    const clockIn = new Date(existing.clock_in);
    const calculatedBreak = breakMinutes ?? calculateBreakMinutes(clockIn, now);

    // 退勤を記録
    const { data: attendance, error } = await supabase
      .from('attendance')
      .update({
        clock_out: now.toISOString(),
        break_minutes: calculatedBreak,
        updated_at: now.toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Failed to clock out:', error);
      return NextResponse.json({ error: 'Failed to clock out' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      action: 'clock_out',
      attendance,
    });

  } catch (error) {
    console.error('Error in attendance API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 今日の出退勤状況を取得
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
    if (!userPermissions.staffId) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    const today = new Date().toISOString().split('T')[0];

    // 今日のレコードを取得
    const { data: attendance } = await supabase
      .from('attendance')
      .select('*, stores(store_name)')
      .eq('staff_id', userPermissions.staffId)
      .eq('date', today)
      .single();

    // 今月の勤務サマリー
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

    const { data: monthlyRecords } = await supabase
      .from('attendance')
      .select('clock_in, clock_out, break_minutes')
      .eq('staff_id', userPermissions.staffId)
      .gte('date', startOfMonthStr)
      .lte('date', today);

    let monthlyWorkMinutes = 0;
    let monthlyDays = 0;

    if (monthlyRecords) {
      for (const record of monthlyRecords) {
        if (record.clock_in && record.clock_out) {
          const clockIn = new Date(record.clock_in);
          const clockOut = new Date(record.clock_out);
          const workMinutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60) - (record.break_minutes || 0);
          monthlyWorkMinutes += workMinutes;
          monthlyDays++;
        }
      }
    }

    return NextResponse.json({
      today: attendance || null,
      status: attendance?.clock_out ? 'clocked_out' : attendance?.clock_in ? 'working' : 'not_clocked_in',
      monthly: {
        workDays: monthlyDays,
        workHours: Math.round(monthlyWorkMinutes / 60 * 10) / 10,
      },
    });

  } catch (error) {
    console.error('Error in attendance API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
