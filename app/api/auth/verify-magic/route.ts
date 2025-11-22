import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token, twoFactorCode, fingerprint } = await request.json();

    // Validate required fields
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    if (!fingerprint) {
      return NextResponse.json({ error: 'Fingerprint is required' }, { status: 400 });
    }

    // Call Lambda verify-magic endpoint
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    const verifyUrl = `${apiUrl}/verify-magic`;

    console.log('Verifying magic link with Lambda:', verifyUrl);

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        twoFactorCode,
        fingerprint,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Verification failed' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error verifying magic link:', error);
    return NextResponse.json(
      { error: 'An error occurred while verifying the magic link' },
      { status: 500 }
    );
  }
}
