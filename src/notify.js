// Daily azkar reminders, scheduled on the phone with Capacitor Local Notifications.
// They fire even when the app is closed. On a plain website they are unavailable.
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

export const REMINDERS_SUPPORTED = Capacitor.isNativePlatform()

// catId = the dua category that opens when the person taps the notification.
export const DEFAULT_REMINDERS = [
  { id: 1, key: 'morning', catId: 'morning', time: '06:00', on: false },
  { id: 2, key: 'evening', catId: 'morning', time: '17:30', on: false },
  { id: 3, key: 'sleep', catId: 'sleep', time: '22:00', on: false },
]

const CHANNEL = 'azkar'

export async function ensurePermission() {
  if (!REMINDERS_SUPPORTED) return false
  try {
    let p = await LocalNotifications.checkPermissions()
    if (p.display === 'prompt' || p.display === 'prompt-with-rationale') p = await LocalNotifications.requestPermissions()
    if (p.display !== 'granted') return false
    if (Capacitor.getPlatform() === 'android') {
      await LocalNotifications.createChannel({ id: CHANNEL, name: 'Azkar reminders', importance: 4, visibility: 1 })
    }
    return true
  } catch (e) { return false }
}

// Replaces everything that is scheduled with the reminders that are switched on.
// text(r) -> { title, body } in the current language.
export async function syncReminders(reminders, text) {
  if (!REMINDERS_SUPPORTED) return
  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) })
  }
  const on = reminders.filter((r) => r.on)
  if (!on.length) return
  const perm = await LocalNotifications.checkPermissions()
  if (perm.display !== 'granted') return
  await LocalNotifications.schedule({
    notifications: on.map((r) => {
      const [hour, minute] = r.time.split(':').map(Number)
      const { title, body } = text(r)
      return {
        id: r.id,
        title,
        body,
        channelId: CHANNEL,
        schedule: { on: { hour, minute }, allowWhileIdle: true }, // repeats every day
        extra: { catId: r.catId },
      }
    }),
  })
}

// Called with the dua category id when a notification is tapped.
export async function onReminderTap(cb) {
  if (!REMINDERS_SUPPORTED) return null
  return LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
    const id = e.notification && e.notification.extra && e.notification.extra.catId
    if (id) cb(id)
  })
}