// Sends the next 14 "dua of the day" entries to the native home screen widgets.
// The widgets read this data themselves, so they keep changing daily even if the app is not opened.
// Native side: see WIDGETS.md (a small plugin named "DuaWidget").
import { Capacitor, registerPlugin } from '@capacitor/core'

const DuaWidget = registerPlugin('DuaWidget')

// Categories that suit a widget; very long duas are skipped so the text fits.
const POOL_CATS = ['morning', 'fard', 'sleep', 'quranic', 'salawat', 'house', 'mosque', 'travel']
const MAX_AR = 170

const pad = (n) => String(n).padStart(2, '0')
const dayKey = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
// Whole days since 1970, so the pick is stable per calendar day.
const dayNumber = (d) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000)

export function buildWidgetData(all, lang, days = 14) {
  const pool = []
  all.filter((c) => POOL_CATS.includes(c.id)).forEach((c) =>
    c.items.forEach((d) => { if (d.ar.length <= MAX_AR) pool.push({ d, c }) })
  )
  if (!pool.length) return null
  const out = []
  const start = new Date()
  for (let i = 0; i < days; i++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const { d, c } = pool[(dayNumber(day) * 7) % pool.length]
    out.push({ date: dayKey(day), cat: { en: c.en, ur: c.ur }, title: { en: d.en, ur: d.ur }, ar: d.ar, tr: d.tr, ref: d.ref })
  }
  return { lang, days: out }
}

export async function pushWidgetData(all, lang) {
  if (!Capacitor.isNativePlatform()) return
  try {
    const data = buildWidgetData(all, lang)
    if (data) await DuaWidget.update({ json: JSON.stringify(data) })
  } catch (e) { /* plugin not installed yet: ignore */ }
}