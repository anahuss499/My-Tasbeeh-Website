import { useState, useEffect, useRef } from 'react'
import { S } from './strings.js'
import { CATS, MOODS } from './duas.js'
import { LINKS } from './config.js'
import { ICONS } from './icons.js'
import pkg from '../package.json'
import { Capacitor } from '@capacitor/core'
import { REMINDERS_SUPPORTED, DEFAULT_REMINDERS, ensurePermission, syncReminders, onReminderTap } from './notify.js'
import { pushWidgetData } from './widget.js'

const P = {
  chat: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 10h.01M12 10h.01M16 10h.01" /></>,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
  bulb: <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4" />,
  star: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />,
  mail: <><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="M22 6l-10 7L2 6" /></>,
  down: <path d="M6 9l6 6 6-6" />,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
}
const Ico = ({ n, size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[n]}</svg>
)

const ALL = [...CATS, ...MOODS]

const KEY = 'mahmood-tasbeeh-v3'
const LKEY = 'mahmood-tasbeeh-lang'
const FKEY = 'mahmood-tasbeeh-favs'
const RKEY = 'mahmood-tasbeeh-reminders'
const REM_LABEL = { morning: 'remMorning', evening: 'remEvening', sleep: 'remSleep' }
function readRems() {
  try { const r = JSON.parse(localStorage.getItem(RKEY)); if (Array.isArray(r) && r.length) return r } catch (e) {}
  return DEFAULT_REMINDERS
}

function readItems() {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch (e) { return [] }
}
function readFavs() {
  try { return JSON.parse(localStorage.getItem(FKEY)) || [] } catch (e) { return [] }
}
function readLang() {
  try { return localStorage.getItem(LKEY) === 'ur' ? 'ur' : 'en' } catch (e) { return 'en' }
}

export default function App() {
  const [items, setItems] = useState(readItems)
  const [lang, setLang] = useState(readLang)
  const [favs, setFavs] = useState(readFavs)
  const [screen, setScreen] = useState('splash')
  const [fade, setFade] = useState(false)
  const [curId, setCurId] = useState(null)
  const [tab, setTab] = useState('tasbeeh')
  const [catId, setCatId] = useState(null)
  const [toastMsg, setToastMsg] = useState('')
  const [menu, setMenu] = useState(false)
  const [logoOk, setLogoOk] = useState(true)
  const [fbOpen, setFbOpen] = useState(false)
  const [fbKind, setFbKind] = useState('fb')
  const [fbText, setFbText] = useState('')
  const [sending, setSending] = useState(false)
  const [hp, setHp] = useState('')
  const aboutRef = useRef(null)
  const fbRef = useRef(null)
  const [pop, setPop] = useState(false)
  const [toastOn, setToastOn] = useState(false)
  const [ask, setAsk] = useState({ msg: '', fn: null })
  const [form, setForm] = useState({ name: '', target: '' })
  const addRef = useRef(null)
  const askRef = useRef(null)
  const remRef = useRef(null)
  const widRef = useRef(null)
  const [rems, setRems] = useState(readRems)
  const [newRem, setNewRem] = useState({ catId: 'morning', time: '07:00' })
  const screenRef = useRef('splash')
  const pend = useRef(null) // category to open after a notification tap

  const t = (k) => S[lang][k]
  const num = (n) => {
    try { return n.toLocaleString(lang === 'ur' ? 'ur-PK-u-nu-arabext' : 'en') } catch (e) { return String(n) }
  }
  const cur = items.find((i) => i.id === curId)
  const cat = ALL.find((c) => c.id === catId)
  screenRef.current = screen
  const remLabel = (r) => (r.key === 'custom' ? ((CATS.find((c) => c.id === r.catId) || {})[lang] || '') : t(REM_LABEL[r.key]))

  // language -> document attributes + storage
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr'
    try { localStorage.setItem(LKEY, lang) } catch (e) {}
  }, [lang])

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)) } catch (e) {}
  }, [items])

  useEffect(() => {
    try { localStorage.setItem(FKEY, JSON.stringify(favs)) } catch (e) {}
  }, [favs])

  const toggleFav = (k) => setFavs((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]))

  const duaCard = (d, k, label) => (
    <article className="dcard" key={k}>
      <button className={'heart' + (favs.includes(k) ? ' on' : '')} aria-pressed={favs.includes(k)} aria-label={t(favs.includes(k) ? 'favOn' : 'favOff')} onClick={() => toggleFav(k)}>{favs.includes(k) ? '♥' : '♡'}</button>
      {label && <div className="m clabel">{label}</div>}
      <div className="n">{d[lang]}</div>
      <div className="arx" lang="ar" dir="rtl">{d.ar}</div>
      <p className="tr">{d.tr[lang]}</p>
      <div className="m">{d.ref}</div>
      <button className="pill add" onClick={() => addDua(d)}>{t('addTo')}{d.n > 1 ? ' · ×' + num(d.n) : ''}</button>
    </article>
  )

  // splash -> home
  useEffect(() => {
    const a = setTimeout(() => setFade(true), 3200)
    const b = setTimeout(() => { if (!openPending()) setScreen('home') }, 4000)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [])

  useEffect(() => {
    if (!toastOn) return
    const id = setTimeout(() => setToastOn(false), 3500)
    return () => clearTimeout(id)
  }, [toastOn])

  // open the dua category from a tapped reminder
  function openPending() {
    const id = pend.current
    pend.current = null
    if (!id || !ALL.some((c) => c.id === id)) return false
    setMenu(false); setCatId(id); setScreen('cat')
    return true
  }

  // reminders: save, and (re)schedule on the phone whenever they or the language change
  useEffect(() => {
    try { localStorage.setItem(RKEY, JSON.stringify(rems)) } catch (e) {}
    syncReminders(rems, (r) => ({ title: remLabel(r), body: S[lang].remBody })).catch(() => {})
  }, [rems, lang])

  // tapping a reminder opens its dua category
  useEffect(() => {
    let h = null
    onReminderTap((id) => { pend.current = id; if (screenRef.current !== 'splash') openPending() }).then((x) => { h = x }).catch(() => {})
    return () => { h && h.remove() }
  }, [])

  // keep the home screen widgets up to date
  useEffect(() => { pushWidgetData(ALL, lang) }, [lang])

  function tick() {
    if (!cur) return
    const next = cur.count + 1
    setItems((list) => list.map((i) => (i.id === cur.id ? { ...i, count: next } : i)))
    setPop(true)
    setTimeout(() => setPop(false), 120)
    const done = next === cur.target
    try { if (navigator.vibrate) navigator.vibrate(done ? [250, 120, 250, 120, 500] : 12) } catch (e) {}
    if (done) { setToastMsg(t('doneMsg')); setToastOn(true) }
  }

  useEffect(() => {
    if (!menu) return
    const k = (e) => { if (e.key === 'Escape') setMenu(false) }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [menu])

  const toast = (m) => { setToastMsg(m); setToastOn(true) }

  function openLink(url) {
    if (!url) return toast(t('soon'))
    window.open(url, '_blank', 'noopener')
  }

  async function shareApp() {
    const url = LINKS.shareUrl || window.location.href
    setMenu(false)
    try {
      if (navigator.share) { await navigator.share({ title: t('title'), text: t('shareTxt'), url }); return }
      await navigator.clipboard.writeText(url)
      toast(t('copied'))
    } catch (e) {}
  }

  function openFb(kind) {
    setFbKind(kind); setFbText(''); setHp(''); setMenu(false)
    fbRef.current.showModal()
  }

  async function sendFb() {
    const message = fbText.trim()
    if (!message || sending) return
    if (hp) { fbRef.current.close(); return toast(t('thanks')) } // honeypot: bots only
    if (LINKS.feedbackUrl) {
      setSending(true)
      try {
        await fetch(LINKS.feedbackUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            type: fbKind === 'idea' ? 'New feature' : 'Feedback',
            message,
            lang,
            version: pkg.version,
            sentAt: new Date().toISOString(),
          }),
        })
        fbRef.current.close()
        toast(t('thanks'))
      } catch (e) {
        toast(t('fbErr'))
      }
      setSending(false)
      return
    }
    if (LINKS.feedbackEmail) {
      const subject = fbKind === 'idea' ? 'My Tasbeeh: feature idea' : 'My Tasbeeh: feedback'
      window.location.href = 'mailto:' + LINKS.feedbackEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(message)
      fbRef.current.close()
      return
    }
    fbRef.current.close()
    toast(t('soon'))
  }

  function addDua(d) {
    setItems((l) => [...l, { id: Date.now() + Math.random(), name: d[lang], target: d.n || 1, count: 0 }])
    setToastMsg(t('added'))
    setToastOn(true)
  }

  // space / enter also counts on desktop
  useEffect(() => {
    const onKey = (e) => {
      if (screen === 'counter' && (e.key === ' ' || e.key === 'Enter') && !e.target.closest('button')) {
        e.preventDefault()
        tick()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  function openRem() { setMenu(false); remRef.current.showModal() }
  function openWid() { setMenu(false); widRef.current.showModal() }
  async function allowed() {
    if (!REMINDERS_SUPPORTED) { toast(t('remWeb')); return false }
    if (!(await ensurePermission())) { toast(t('remDenied')); return false }
    return true
  }
  async function toggleRem(id) {
    const r = rems.find((x) => x.id === id)
    if (!r) return
    if (!r.on && !(await allowed())) return
    setRems((l) => l.map((x) => (x.id === id ? { ...x, on: !x.on } : x)))
  }
  function setRemTime(id, v) {
    if (!v) return
    setRems((l) => l.map((x) => (x.id === id ? { ...x, time: v } : x)))
  }
  async function addRem() {
    if (!newRem.time || !(await allowed())) return
    setRems((l) => [...l, { id: 100 + (Date.now() % 1000000), key: 'custom', catId: newRem.catId, time: newRem.time, on: true }])
  }

  function confirmThen(msg, fn) {
    setAsk({ msg, fn })
    askRef.current.showModal()
  }

  function openAdd() {
    setForm({ name: '', target: '' })
    addRef.current.showModal()
  }

  function saveNew() {
    const name = form.name.trim()
    const target = parseInt(form.target, 10)
    if (!name || !target || target < 1) return
    setItems((l) => [...l, { id: Date.now(), name, target: Math.min(target, 100000), count: 0 }])
    addRef.current.close()
  }

  return (
    <>
      <div className="bg" aria-hidden="true"><i></i><i></i></div>

      {screen === 'splash' && (
        <section id="splash" className={'screen on' + (fade ? ' out' : '')} aria-label="Welcome">
          <div className="ar" lang="ar" dir="rtl">السلام عليكم</div>
          <h1>{t('hello')}</h1>
          <p>{t('masjid')}</p>
        </section>
      )}

      {screen === 'home' && (
        <section id="home" className="screen on">
          <header>
            <button className="pill" id="menu" onClick={() => setMenu(true)} aria-label={t('menu')} aria-expanded={menu}>☰</button>
            <h2>{t('title')}</h2>
            <button className="pill" id="lang" onClick={() => setLang(lang === 'en' ? 'ur' : 'en')} aria-label="Language">{t('other')}</button>
          </header>
          <div className="tabs" role="tablist">
            {['tasbeeh', 'duas', 'favs'].map((k) => (
              <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{k === 'favs' ? '♥ ' : ''}{t(k === 'duas' ? 'tabD' : k === 'favs' ? 'tabF' : 'tabT')}</button>
            ))}
          </div>
          {tab === 'duas' && (
            <div className="list">
              <button className="card open cat feel" onClick={() => setScreen('moods')}>
                <span className="ico" aria-hidden="true">💭</span>
                <div><div className="n">{t('feel')}</div><div className="m">{t('feelSub')}</div></div>
              </button>
              {CATS.map((c) => (
                <button className="card open cat" key={c.id} onClick={() => { setCatId(c.id); setScreen('cat') }}>
                  <span className="ico" aria-hidden="true">{c.emoji}</span>
                  <div><div className="n">{c[lang]}</div>
                  <div className="m">{num(c.items.length)} {t('duas')}</div></div>
                </button>
              ))}
            </div>
          )}
          {tab === 'favs' && (
            <div className="list">
              {favs.length === 0 && <div className="empty">{t('noFav')}</div>}
              {ALL.flatMap((c) => c.items.map((d, i) => ({ d, c, k: c.id + ':' + i }))).filter((x) => favs.includes(x.k)).map((x) => duaCard(x.d, x.k, x.c.emoji + ' ' + x.c[lang]))}
            </div>
          )}
          {tab === 'tasbeeh' && <>
          <div className="list">
            {items.length === 0 && <div className="empty">{t('empty')}</div>}
            {items.map((it) => (
              <div className="card" key={it.id}>
                <button className="open" onClick={() => { setCurId(it.id); setScreen('counter') }}>
                  <div className="n">{it.name}</div>
                  <div className="m">{num(it.count)} {t('of')} {num(it.target)}{it.count >= it.target ? ' · ' + t('complete') : ''}</div>
                  <div className="bar"><i style={{ width: Math.min(100, (it.count / it.target) * 100) + '%' }}></i></div>
                </button>
                <button className="del" aria-label={t('confDel')}
                  onClick={() => confirmThen(t('confDel') + ': ' + it.name + '?', () => setItems((l) => l.filter((x) => x.id !== it.id)))}>×</button>
              </div>
            ))}
          </div>
          <button className="fab" onClick={openAdd}>{t('add')}</button>
          </>}
        </section>
      )}

      {screen === 'moods' && (
        <section id="moods" className="screen on">
          <div className="top"><button className="pill" onClick={() => setScreen('home')}>{t('back')}</button></div>
          <h2 className="ctitle">💭 {t('feel')}</h2>
          <div className="list">
            {MOODS.map((c) => (
              <button className="card open cat" key={c.id} onClick={() => { setCatId(c.id); setScreen('cat') }}>
                <span className="ico" aria-hidden="true">{c.emoji}</span>
                <div><div className="n">{c[lang]}</div><div className="m">{num(c.items.length)} {t('duas')}</div></div>
              </button>
            ))}
          </div>
        </section>
      )}

      {screen === 'cat' && cat && (
        <section id="cat" className="screen on">
          <div className="top"><button className="pill" onClick={() => { setScreen(catId.startsWith('mood-') ? 'moods' : 'home'); setCatId(null) }}>{t('back')}</button></div>
          <h2 className="ctitle">{cat.emoji} {cat[lang]}</h2>
          <div className="list">
            {cat.items.map((d, i) => duaCard(d, cat.id + ':' + i))}
          </div>
        </section>
      )}

      {screen === 'counter' && cur && (
        <section id="counter" className="screen on" onClick={(e) => { if (!e.target.closest('button')) tick() }}>
          <div className="top">
            <button className="pill" onClick={() => { setScreen('home'); setCurId(null) }}>{t('back')}</button>
            <button className="pill" onClick={() => {
              if (cur.count === 0) return
              confirmThen(t('confReset'), () => setItems((l) => l.map((i) => (i.id === cur.id ? { ...i, count: 0 } : i))))
            }}>{t('reset')}</button>
          </div>
          <div className="mid">
            <div className="name">{cur.name}</div>
            <div className={'num' + (pop ? ' pop' : '')}>
              <b>{num(cur.count)}</b>
              <span>{t('of')} {num(cur.target)}</span>
              <div className="bar big"><i style={{ width: Math.min(100, (cur.count / cur.target) * 100) + '%' }}></i></div>
            </div>
            <div className="done" aria-live="polite">{cur.count >= cur.target ? t('doneMsg') : ''}</div>
          </div>
          <div className="hint">{t('hint')}</div>
        </section>
      )}

      <div className={'scrim' + (menu ? ' on' : '')} onClick={() => setMenu(false)}></div>
      <aside className={'drawer' + (menu ? ' on' : '')} aria-hidden={!menu} inert={!menu ? '' : undefined}>
        <div className="dh">
          <div className="brand">
            {logoOk ? <img src={import.meta.env.BASE_URL + "logo.png"} alt="" width="60" height="60" onError={() => setLogoOk(false)} /> : <span className="logo-fb" aria-hidden="true">🌙</span>}
            <div className="bt">
              <b lang="en" dir="ltr">{S.en.title}</b>
              <span lang="ur" dir="rtl">{S.ur.title}</span>
            </div>
          </div>
          <div className="ver">v {pkg.version}</div>
        </div>
        <nav>
          <button className="mi" onClick={openRem}><Ico n="bell" />{t('remTitle')}</button>
          <button className="mi" onClick={openWid}><Ico n="grid" />{t('widTitle')}</button>
          <button className="mi" aria-expanded={fbOpen} onClick={() => setFbOpen(!fbOpen)}><Ico n="chat" />{t('feedback')}<span className={'chev' + (fbOpen ? ' up' : '')}><Ico n="down" size={22} /></span></button>
          {fbOpen && (
            <div className="sub">
              <button className="mi" onClick={() => openFb('idea')}><Ico n="bulb" size={20} />{t('idea')}</button>
              <button className="mi" onClick={() => { setMenu(false); openLink(LINKS.rate) }}><Ico n="star" size={20} />{t('rate')}</button>
              <button className="mi" onClick={() => openFb('fb')}><Ico n="mail" size={20} />{t('giveFb')}</button>
            </div>
          )}
          <button className="mi" onClick={shareApp}><Ico n="share" />{t('share')}</button>
          <button className="mi" onClick={() => { setMenu(false); aboutRef.current.showModal() }}><Ico n="info" />{t('about')}</button>
        </nav>
        <div className="soc">
          {['tiktok', 'youtube', 'facebook', 'whatsapp'].map((k) => (
            <button key={k} className="sbtn" aria-label={k} onClick={() => openLink(LINKS[k])}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d={ICONS[k]} /></svg>
            </button>
          ))}
        </div>
      </aside>

      <div id="toast" className={toastOn ? 'show' : ''} role="status" aria-live="polite">{toastOn ? toastMsg : ''}</div>

      <dialog ref={aboutRef}>
        <h3>{t('about')}</h3>
        <p className="abt">{t('aboutTxt')}</p>
        <div className="row"><button type="button" className="go" onClick={() => aboutRef.current.close()}>{t('ok')}</button></div>
      </dialog>

      <dialog ref={fbRef}>
        <h3>{t(fbKind === 'idea' ? 'ideaTitle' : 'fbTitle')}</h3>
        <textarea rows={5} maxLength={1000} placeholder={t(fbKind === 'idea' ? 'ideaPh' : 'fbPh')} value={fbText} onChange={(e) => setFbText(e.target.value)} />
        <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={hp} onChange={(e) => setHp(e.target.value)} />
        <div className="row">
          <button type="button" onClick={() => fbRef.current.close()}>{t('cancel')}</button>
          <button type="button" className="go" disabled={sending} onClick={sendFb}>{sending ? t('sending') : t('send')}</button>
        </div>
      </dialog>

      <dialog ref={remRef}>
        <h3>{t('remTitle')}</h3>
        <p className="m">{t('remSub')}</p>
        {rems.map((r) => (
          <div className="rem" key={r.id}>
            <div className="n">{remLabel(r)}</div>
            <input type="time" aria-label={t('remTime')} value={r.time} onChange={(e) => setRemTime(r.id, e.target.value)} />
            <button type="button" role="switch" aria-checked={r.on} aria-label={remLabel(r)} className={'sw' + (r.on ? ' on' : '')} onClick={() => toggleRem(r.id)}><i></i></button>
            {r.key === 'custom' && <button type="button" className="del" aria-label={t('confDel')} onClick={() => setRems((l) => l.filter((x) => x.id !== r.id))}>×</button>}
          </div>
        ))}
        <div className="addrem">
          <label htmlFor="remCat">{t('remCat')}</label>
          <select id="remCat" value={newRem.catId} onChange={(e) => setNewRem({ ...newRem, catId: e.target.value })}>
            {CATS.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c[lang]}</option>)}
          </select>
          <div className="tm">
            <input id="remNewTime" type="time" aria-label={t('remTime')} value={newRem.time} onChange={(e) => setNewRem({ ...newRem, time: e.target.value })} />
            <button type="button" className="pill" onClick={addRem}>{t('remAdd')}</button>
          </div>
        </div>
        <div className="row"><button type="button" className="go" onClick={() => remRef.current.close()}>{t('close')}</button></div>
      </dialog>

      <dialog ref={widRef}>
        <h3>{t('widTitle')}</h3>
        <p className="abt">{t('widIntro')}</p>
        <p className="abt">{Capacitor.getPlatform() === 'ios' ? t('widIos') : Capacitor.getPlatform() === 'android' ? t('widAnd') : t('widWeb')}</p>
        <div className="row"><button type="button" className="go" onClick={() => widRef.current.close()}>{t('ok')}</button></div>
      </dialog>

      <dialog ref={askRef}>
        <h3>{ask.msg}</h3>
        <div className="row">
          <button type="button" onClick={() => askRef.current.close()}>{t('cancel')}</button>
          <button type="button" className="go" onClick={() => { askRef.current.close(); ask.fn && ask.fn() }}>{t('ok')}</button>
        </div>
      </dialog>

      <dialog ref={addRef}>
        <h3>{t('addTitle')}</h3>
        <label htmlFor="fName">{t('what')}</label>
        <input id="fName" maxLength={80} autoComplete="off" placeholder={t('ph')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label htmlFor="fTarget">{t('how')}</label>
        <input id="fTarget" type="number" inputMode="numeric" min="1" max="100000" placeholder={t('ph2')} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
        <div className="row">
          <button type="button" onClick={() => addRef.current.close()}>{t('cancel')}</button>
          <button type="button" className="go" onClick={saveNew}>{t('save')}</button>
        </div>
      </dialog>
    </>
  )
}