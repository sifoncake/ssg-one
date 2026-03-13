import { NextRequest, NextResponse } from 'next/server';
import { getUserPermissions } from '@/lib/server';

export async function GET(request: NextRequest) {
  try {
    const lineUserId = request.nextUrl.searchParams.get('lineUserId');

    if (!lineUserId) {
      return NextResponse.json({ error: 'lineUserId is required' }, { status: 400 });
    }

    const userPermissions = await getUserPermissions(lineUserId);

    return NextResponse.json({
      isAdmin: userPermissions.isAdmin,
      role: userPermissions.role,
      permissions: userPermissions.permissions,
    });
  } catch (error) {
    console.error('Error checking user role:', error);
    return NextResponse.json(
      { error: 'Failed to check user role' },
      { status: 500 }
    );
  }
}
