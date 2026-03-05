import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Use service role key to generate an auth token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    console.log('Supabase URL:', supabaseUrl);
    console.log('Service key length:', supabaseServiceKey?.length);
    console.log('Service key prefix:', supabaseServiceKey?.substring(0, 20));

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user by email
    console.log('Calling listUsers...');
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();

    if (userError) {
      console.error('Error listing users:', userError);
      return NextResponse.json(
        { error: 'Failed to find user' },
        { status: 500 }
      );
    }

    const user = userData.users.find((u) => u.email === email);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please ensure the admin has a Supabase Auth account.' },
        { status: 404 }
      );
    }

    // Generate a magic link using admin privileges
    // This creates a hashed token that can be verified without sending an email
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (error) {
      console.error('Error generating magic link:', error);
      return NextResponse.json(
        { error: 'Failed to generate magic link' },
        { status: 500 }
      );
    }

    // Extract the hashed token from the response
    const hashedToken = data.properties.hashed_token;

    if (!hashedToken) {
      console.error('Missing hashed_token in response:', data.properties);
      return NextResponse.json(
        { error: 'Failed to generate token' },
        { status: 500 }
      );
    }

    console.log('Generated hashed token for:', email);

    // Return the hashed token for client-side verification
    return NextResponse.json({
      success: true,
      hashed_token: hashedToken,
      email: email,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the session' },
      { status: 500 }
    );
  }
}
