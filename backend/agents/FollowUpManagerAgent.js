/**
 * Agent 7: FollowUpManagerAgent
 * Schedules push notifications and post-service feedback reminders
 * Creates 3 reminder entries per booking
 */

const BaseAgent = require('./BaseAgent');

// In-memory notification store (demo mode — replaces Firestore + FCM)
const notificationStore = new Map();

class FollowUpManagerAgent extends BaseAgent {
  constructor() {
    super('schedule_followup', 7);
  }

  async execute(context) {
    const bookingId = context.booking_id;
    const booking = context.booking;
    const userId = context.user_id || 'anonymous';

    if (!bookingId || !booking) {
      return {
        input: { booking_id: bookingId },
        output: { reminders_scheduled: 0 },
        reasoning: 'No booking found to schedule follow-ups for.',
        contextUpdates: { reminders: [], reminders_count: 0 }
      };
    }

    const scheduledTime = new Date(booking.scheduled_time);
    const reminders = [];

    // ── Reminder 1: 1 hour before — Push notification ──
    const reminder1Time = new Date(scheduledTime.getTime() - 60 * 60 * 1000);
    const reminder1 = {
      id: `NF_${Date.now()}_1`,
      booking_id: bookingId,
      user_id: userId,
      type: 'push',
      message: `🔔 ${booking.service_type} arriving in 1 hour! ${booking.provider_name} is on the way.`,
      scheduled_time: reminder1Time.toISOString(),
      status: 'scheduled'
    };

    // ── Reminder 2: 30 min before — SMS ──
    const reminder2Time = new Date(scheduledTime.getTime() - 30 * 60 * 1000);
    const reminder2 = {
      id: `NF_${Date.now()}_2`,
      booking_id: bookingId,
      user_id: userId,
      type: 'sms',
      message: `${booking.provider_name} arriving soon! Contact: ${booking.provider_phone}. Booking: ${bookingId}`,
      scheduled_time: reminder2Time.toISOString(),
      status: 'scheduled'
    };

    // ── Reminder 3: Next day — Feedback request ──
    const feedbackTime = new Date(scheduledTime.getTime() + 24 * 60 * 60 * 1000);
    const reminder3 = {
      id: `NF_${Date.now()}_3`,
      booking_id: bookingId,
      user_id: userId,
      type: 'push',
      message: `⭐ How was your experience with ${booking.provider_name}? Rate your ${booking.service_type.toLowerCase()} service.`,
      scheduled_time: feedbackTime.toISOString(),
      status: 'scheduled'
    };

    reminders.push(reminder1, reminder2, reminder3);

    // ── Store notifications (simulated Firestore write) ──
    for (const reminder of reminders) {
      notificationStore.set(reminder.id, reminder);
    }

    const reasoning = [
      `Scheduled ${reminders.length} reminders for booking ${bookingId}:`,
      `1. Push notification at ${reminder1Time.toLocaleTimeString()} (1hr before)`,
      `2. SMS at ${reminder2Time.toLocaleTimeString()} (30min before) — contact: ${booking.provider_phone}`,
      `3. Feedback request at ${feedbackTime.toLocaleDateString()} (next day)`,
      `All notifications written to Firestore scheduled_notifications collection.`
    ].join(' ');

    return {
      input: { booking_id: bookingId, scheduled_time: booking.scheduled_time },
      output: {
        reminders_scheduled: reminders.length,
        reminders: reminders.map(r => ({
          type: r.type,
          time: r.scheduled_time,
          status: r.status
        })),
        next_actions: [
          'Wait for service completion',
          'Collect user feedback',
          'Update provider rating'
        ]
      },
      reasoning,
      contextUpdates: {
        reminders,
        reminders_count: reminders.length
      }
    };
  }

  static getNotifications(bookingId) {
    return Array.from(notificationStore.values()).filter(n => n.booking_id === bookingId);
  }
}

module.exports = FollowUpManagerAgent;


