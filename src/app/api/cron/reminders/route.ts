import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
  // Initialise here (not at module level) so Vercel build doesn't fail
  // when env vars aren't available during static analysis
  webpush.setVapidDetails(
    'mailto:admin@travelvoo.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  try {
    // Optional: verify an auth header or token for cron security
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // In production, enforce cron secret
      // return new Response('Unauthorized', { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Process custom scheduled reminders that are due
    const { data: dueReminders, error: remError } = await supabase
      .from('admin_reminders')
      .select('id, tenant_id, message, booking_id, lead_id')
      .eq('triggered', false)
      .lte('scheduled_for', new Date().toISOString());

    if (remError) {
      console.error('Error fetching due reminders:', remError);
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
    }

    // 2. Process Auto Reminders (bookings with checkin tomorrow, etc.)
    // Note: A robust system would check site_settings for auto_reminders_enabled and reminder_interval_hours
    // For this implementation, we will assume standard 24h reminders are generated here or rely on the custom ones.

    const sentIds = [];
    const pushErrors = [];

    for (const reminder of dueReminders || []) {
      // Find push subscriptions for this tenant
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('tenant_id', reminder.tenant_id);

      let payload = {
        title: 'Booking Reminder',
        body: reminder.message,
        url: '/admin/bookings',
        vibrate: [200, 100, 200, 100, 200, 100, 200]
      };

      for (const sub of subs || []) {
        try {
          const pushSub = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          };
          await webpush.sendNotification(pushSub, JSON.stringify(payload));
        } catch (e: any) {
          console.error('Push error for sub', sub.id, e);
          if (e.statusCode === 410 || e.statusCode === 404) {
             // Subscription expired or invalid, delete it
             await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          }
        }
      }

      sentIds.push(reminder.id);
    }

    // Mark as triggered
    if (sentIds.length > 0) {
      await supabase.from('admin_reminders').update({ triggered: true }).in('id', sentIds);
    }

    return NextResponse.json({ success: true, processed: sentIds.length });
  } catch (err: any) {
    console.error('Cron error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
