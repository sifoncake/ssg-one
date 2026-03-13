import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin, verifyLineToken } from '@/lib/server';

export async function POST(request: NextRequest) {
  try {
    const { lineIdToken } = await request.json();

    if (!lineIdToken) {
      return NextResponse.json({ error: 'LINE ID token is required' }, { status: 400 });
    }

    // Verify LINE ID token
    const lineUserId = await verifyLineToken(lineIdToken);
    if (!lineUserId) {
      return NextResponse.json({ error: 'LINE token verification failed' }, { status: 401 });
    }

    // Check if user is admin
    const supabase = getSupabaseAdmin();

    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('email')
      .eq('line_user_id', lineUserId)
      .single();

    if (adminError || !adminData) {
      return NextResponse.json({ error: 'Not authorized as admin' }, { status: 403 });
    }

    // Generate token and 2FA code
    const token = crypto.randomBytes(32).toString('base64url');
    const twoFactorCode = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store in admin_tokens
    const { error: insertError } = await supabase
      .from('admin_tokens')
      .insert({
        token,
        line_user_id: lineUserId,
        two_factor_code: twoFactorCode,
        fingerprint: lineUserId,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    if (insertError) {
      console.error('Failed to insert token:', insertError);
      return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      token,
    });

  } catch (error) {
    console.error('Error generating magic link:', error);
    return NextResponse.json({ error: 'Failed to generate magic link' }, { status: 500 });
  }
}
