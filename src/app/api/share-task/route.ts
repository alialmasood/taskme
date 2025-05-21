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

    // إضافة إشعار للمستخدم المستهدف
    await db.collection('notifications').add({
      userId: data.userId, // المستخدم المستهدف
      fromName: data.sharedByName || 'مستخدم', // اسم من شارك المهمة (نرسله من الكلاينت)
      taskTitle: data.title,
      createdAt: new Date().toISOString(),
      read: false,
      type: 'task_share',
      message: `تمت مشاركة مهمة "${data.title}" معك من قبل ${data.sharedByName || 'مستخدم'}`
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sharing task:', error);
    return NextResponse.json({ error: 'فشل في مشاركة المهمة' }, { status: 500 });
  }
} 