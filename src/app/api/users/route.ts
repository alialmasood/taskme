import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';

export async function GET() {
  try {
    if (!auth) {
      return NextResponse.json({ error: 'Firebase Auth not initialized' }, { status: 500 });
    }

    // جلب أول 1000 مستخدم من Firebase Authentication
    const listUsersResult = await auth.listUsers(1000);

    const users = listUsersResult.users.map(user => ({
      uid: user.uid,
      email: user.email,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'فشل في جلب المستخدمين' }, { status: 500 });
  }
}