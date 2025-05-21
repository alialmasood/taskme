import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!db) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    // data يجب أن يحتوي على بيانات المهمة كاملة مع userId للمستخدم المستهدف
    await db.collection('tasks').add({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'فشل في إنشاء المهمة' }, { status: 500 });
  }
} 