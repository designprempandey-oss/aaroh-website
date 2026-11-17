// Interactions & animations — rebuilt from the Framer source with Motion
// (the same spring engine Framer uses). Every timing/spring value below was
// read from the published Framer bundle.
import { animate } from 'motion'
import { initShaders } from './shaders.js'

const spring = (duration = 0.4, bounce = 0.2, delay = 0) => ({ type: 'spring', duration, bounce, delay })
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isPhone = () => window.innerWidth < 810

/* -------------------------------------------------------------------------
   1. Appear animations (Framer "appear" effects)
   data-appear='{"x","y","scale","rotate"(final),"delay","inView"}'
   ------------------------------------------------------------------------- */
function initAppear() {
  const run = (el) => {
    const cfg = JSON.parse(el.dataset.appear || '{}')
    animate(el, { opacity: 1, x: 0, y: 0, scale: 1, rotate: cfg.rotate || 0 }, spring(0.4, 0.2, cfg.delay || 0))
  }
  // Observe the parent: the element's own start offset (y:150 / x:±150) can sit
  // entirely inside a clipping ancestor, which would never report as visible.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      io.unobserve(e.target)
      e.target.__appearKids.forEach(run)
    }
  }, { threshold: 0 })
  const watch = (el) => {
    const p = el.parentElement
    if (!p.__appearKids) { p.__appearKids = []; io.observe(p) }
    p.__appearKids.push(el)
  }

  document.querySelectorAll('[data-appear]').forEach((el) => {
    const cfg = JSON.parse(el.dataset.appear || '{}')
    if (reduceMotion || (isPhone() && el.dataset.appearPhone === 'none')) {
      animate(el, { opacity: 1, rotate: cfg.rotate || 0 }, { duration: 0 })
      return
    }
    animate(el, { opacity: 0.001, x: cfg.x || 0, y: cfg.y || 0, scale: cfg.scale ?? 1, rotate: 0 }, { duration: 0 })
    watch(el)
  })
}

/* Phone-only hero line: word-by-word appear (Framer text effect, tokenization: word) */
function initWordEffect() {
  document.querySelectorAll('[data-words]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/)
    el.textContent = ''
    words.forEach((w, i) => {
      const span = document.createElement('span')
      span.textContent = w
      span.style.display = 'inline-block'
      el.append(span)
      if (i < words.length - 1) el.append(' ')
      if (reduceMotion) return
      animate(span, { opacity: 0.001, y: 10 }, { duration: 0 })
      animate(span, { opacity: 1, y: 0 }, spring(0.4, 0, 0.2 + i * 0.075))
    })
  })
}

/* -------------------------------------------------------------------------
   2. Ticker (Framer ticker effect: velocity px/s, hover modifier %, drag)
   ------------------------------------------------------------------------- */
class Ticker {
  constructor(root) {
    this.root = root
    this.track = root.querySelector('.ticker__track')
    this.velocity = Number(root.dataset.velocity || 100)
    this.hoverFactor = Number(root.dataset.hover ?? 100) / 100
    this.dir = root.dataset.direction === 'reverse' ? -1 : 1
    this.gap = Number(root.dataset.gap || 0)
    this.draggable = root.hasAttribute('data-draggable')
    this.originals = [...this.track.children]
    this.offset = 0
    this.hovered = false
    this.momentum = null
    this.visible = true
    this.track.style.gap = `${this.gap}px`

    this.build()
    this.bind()
    this.last = performance.now()
    requestAnimationFrame(this.tick)
  }

  build() {
    // Remove previous clones, then clone the set until it overflows twice.
    this.track.querySelectorAll('[data-clone]').forEach((n) => n.remove())
    const setWidth = this.originals.reduce((s, li) => s + li.getBoundingClientRect().width, 0) + this.gap * this.originals.length
    this.loop = setWidth
    const need = this.root.clientWidth + setWidth
    let total = setWidth
    while (total < need + setWidth && setWidth > 0) {
      for (const li of this.originals) {
        const c = li.cloneNode(true)
        c.setAttribute('data-clone', '')
        c.setAttribute('aria-hidden', 'true')
        this.track.append(c)
      }
      total += setWidth
    }
  }

  bind() {
    if (canHover) {
      this.root.addEventListener('pointerenter', () => (this.hovered = true))
      this.root.addEventListener('pointerleave', () => (this.hovered = false))
    }
    new IntersectionObserver(([e]) => (this.visible = e.isIntersecting)).observe(this.root)
    let raf
    window.addEventListener('resize', () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => this.build())
    })
    if (!this.draggable) return

    let startX = 0, startOffset = 0, lastX = 0, lastT = 0, vel = 0, moved = false
    const onMove = (e) => {
      const now = performance.now()
      const dx = e.clientX - startX
      if (Math.abs(dx) > 3) moved = true
      this.offset = startOffset + dx
      const dt = Math.max(1, now - lastT)
      vel = ((e.clientX - lastX) / dt) * 1000
      lastX = e.clientX
      lastT = now
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      this.root.classList.remove('is-dragging')
      this.dragging = false
      this.momentum = vel
      setTimeout(() => (moved = false), 5)
    }
    this.root.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      this.dragging = true
      this.momentum = null
      startX = lastX = e.clientX
      lastT = performance.now()
      startOffset = this.offset
      vel = 0
      this.root.classList.add('is-dragging')
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    })
    // Swallow clicks that were really drags.
    this.root.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation() } }, true)
    this.root.addEventListener('dragstart', (e) => e.preventDefault())
  }

  tick = (now) => {
    const dt = Math.min(0.064, (now - this.last) / 1000)
    this.last = now
    if (this.visible && !reduceMotion && !this.dragging) {
      const base = -this.velocity * this.dir * (this.hovered ? this.hoverFactor : 1)
      if (this.momentum !== null) {
        this.offset += this.momentum * dt
        this.momentum *= Math.exp(-dt / 0.35)
        if (Math.abs(this.momentum) <= Math.abs(base)) this.momentum = null
      } else {
        this.offset += base * dt
      }
    }
    if (this.loop > 0) {
      this.offset = ((this.offset % this.loop) + this.loop) % this.loop - this.loop
    }
    this.track.style.transform = `translate3d(${this.offset}px,0,0)`
    requestAnimationFrame(this.tick)
  }
}

/* -------------------------------------------------------------------------
   3. Hover micro-interactions
   ------------------------------------------------------------------------- */
function onHover(el, enter, leave) {
  if (!canHover) return
  el.addEventListener('pointerenter', enter)
  el.addEventListener('pointerleave', leave)
}

function initHovers() {
  // whileHover lift (hero/pricing/CTA buttons: y -5, CTA links & socials: y -3)
  document.querySelectorAll('[data-lift]').forEach((el) => {
    const y = Number(el.dataset.lift)
    onHover(el, () => animate(el, { y }, spring()), () => animate(el, { y: 0 }, spring()))
  })
  // whileHover scale (navbar buttons 1.05, Framer badge 1.1)
  document.querySelectorAll('[data-scale-hover]').forEach((el) => {
    const s = Number(el.dataset.scaleHover || 1.05)
    onHover(el, () => animate(el, { scale: s }, spring()), () => animate(el, { scale: 1 }, spring()))
  })

  // Button inner icon swap ("slot machine" drop) + Figma icon spin
  document.querySelectorAll('[data-btn]').forEach((btn) => {
    const target = btn.closest('[data-lift]') || btn
    if (btn.dataset.btn === 'call') {
      const iconIn = btn.querySelector('.btn__icon--in')
      const iconOut = btn.querySelector('.btn__icon--out')
      const small = btn.classList.contains('btn--call-small')
      const orange = btn.classList.contains('btn--orange')
      const dIn = small ? 37 : 46
      const dOut = small ? 39 : orange ? 47 : 45
      onHover(target,
        () => { animate(iconIn, { y: dIn }, spring()); animate(iconOut, { y: dOut }, spring()) },
        () => { animate(iconIn, { y: 0 }, spring()); animate(iconOut, { y: 0 }, spring()) })
    } else {
      const fig = btn.querySelector('.btn__icon--figma')
      const big = btn.classList.contains('btn--work-big')
      onHover(target, () => {
        animate(fig, { rotate: 360 }, spring())
        if (big) animate(btn, { boxShadow: '0px 20px 20px 0px rgba(0,0,0,0.05), 0px 5px 10px 0px rgba(0,0,0,0.1)' }, spring())
      }, () => {
        animate(fig, { rotate: 0 }, spring())
        if (big) animate(btn, { boxShadow: '0px 20px 20px 0px rgba(0,0,0,0.05), 0px 5px 10px 0px rgba(0,0,0,0.05)' }, spring())
      })
    }
  })

  // Logo: the A-mark tilts and pops (same spring the Framer heart logo used)
  document.querySelectorAll('[data-logo]').forEach((logo) => {
    const mark = logo.querySelector('.logo__a')
    onHover(logo,
      () => animate(mark, { rotate: -10, scale: 1.12 }, spring()),
      () => animate(mark, { rotate: 0, scale: 1 }, spring()))
  })
}

/* -------------------------------------------------------------------------
   4. Problem cards: problem panel drops away, solution swings in (spring 0.5)
   ------------------------------------------------------------------------- */
function initProblemCards() {
  document.querySelectorAll('[data-pcard]').forEach((card) => {
    const problem = card.querySelector('.pcard__problem')
    const solution = card.querySelector('.pcard__solution')
    let open = false
    const t = spring(0.5, 0.2)
    // Seed transform values in Motion (reading a CSS matrix back can flip the panel).
    animate(solution, { rotate: -15 }, { duration: 0 })
    const show = () => {
      open = true
      animate(problem, { top: 240 }, t)
      animate(solution, { left: 5, width: card.clientWidth - 10, rotate: 0 }, t)
    }
    const hide = () => {
      open = false
      animate(problem, { top: 5 }, t)
      animate(solution, { left: -195, width: 190, rotate: -15 }, t)
    }
    if (canHover) onHover(card, show, hide)
    else card.addEventListener('click', () => (open ? hide() : show()))
  })
}

/* -------------------------------------------------------------------------
   5. Process 2 — chat scrolls up, then "Wow fire" pops in
   ------------------------------------------------------------------------- */
function initProcess2() {
  const card = document.querySelector('[data-proc2]')
  if (!card) return
  const stage = card.querySelector('[data-p2-stage]')
  const chat = card.querySelector('[data-p2-chat]')
  let state = 1, hovered = false
  animate(chat, { scale: 0 }, { duration: 0 })
  const toV1 = () => {
    state = 1
    animate(stage, { top: 24, height: 265 }, spring())
    animate(chat, { top: 237, scale: 0 }, spring())
  }
  const enter = async () => {
    hovered = true
    if (state !== 1) return
    state = 2
    animate(chat, { top: 257 }, spring())
    await animate(stage, { top: -100, height: 288 }, spring())
    if (state !== 2) return
    state = 3
    await animate(chat, { scale: 1 }, spring())
    if (!hovered) toV1()
  }
  const leave = () => { hovered = false; if (state === 3) toV1() }
  if (canHover) onHover(card, enter, leave)
  else card.addEventListener('click', () => (state === 1 ? enter().then(() => (hovered = false)) : toV1()))
}

/* -------------------------------------------------------------------------
   6. Process 3 — 10-step "site gets built" sequence (400ms per step)
   ------------------------------------------------------------------------- */
function initProcess3() {
  const card = document.querySelector('[data-proc3]')
  if (!card) return
  const frame = card.querySelector('[data-p3-frame]')
  const el = Object.fromEntries([...frame.querySelectorAll('[data-p3]')].map((n) => [n.dataset.p3, n]))
  const inner = (k) => el[k].querySelector('.p3__appear') || el[k]
  const headingP = el.heading.querySelector('p')
  const subP = el.subtitle.querySelector('p')
  const navSvg = card.querySelector('[data-p3-navsvg]')
  const BTN_W = 69.45, BTN_H = 18.23, SUB_H = { 4: 9.28, 6: 13.92 }

  // Layout for each variant, derived from Framer's per-variant CSS.
  const layout = (s) => {
    const W = frame.clientWidth, H = frame.clientHeight
    const L = {
      heading: s >= 3 ? { left: W * 0.51 - 44, top: s >= 9 ? 63 : 53, width: 88 } : { left: 10, top: 23, width: 76 },
      headingRotate: s >= 3 ? 0 : -9,
      headingSize: s >= 3 ? 12 : 10,
      subtitle: s >= 5
        ? { left: W / 2 - 64, top: (s >= 9 ? 0.53 : 0.48) * H - SUB_H[6] / 2, width: 128 }
        : { left: 14, top: H - 37 - SUB_H[4], width: 87 },
      subtitleRotate: s >= 5 ? 0 : 13,
      subtitleSize: s >= 5 ? 6 : 4,
      button: s >= 7 ? { left: W / 2 - BTN_W / 2, top: H - (s >= 9 ? 56 : 66) - BTN_H } : { left: W - 52 - BTN_W, top: H - 15 - BTN_H },
      buttonRotate: s >= 7 ? 0 : -8,
      navbar: s >= 9 ? { left: W * 0.4992 - 73.5, top: 15, width: 147, height: 38 } : { left: W + 48 - 137, top: 17, width: 137, height: 35 },
      navSvg: s >= 9 ? { width: 146, height: 36.48, rotate: -7 } : { width: 136, height: 34, rotate: 0 },
    }
    const me = {
      1: { left: W + 9, top: H - 83 },
      2: { left: 46, top: 36 },
      3: { left: W - 162, top: 0.492 * H - 18 },
      4: { left: 49, top: H - 40 },
      5: { left: W - 169, top: H - 94 },
      6: { left: W - 79, top: H - 24 },
      7: { left: W - 159, top: H - 70 },
      8: { left: W - 49, top: 29 },
      9: { left: W - 169, top: 54 },
      10: { left: W - 89, top: H - 45 },
    }
    L.me = me[s]
    return L
  }

  const apply = (s, instant = false) => {
    const L = layout(s)
    const t = instant ? { duration: 0 } : spring(s === 6 ? 0.5 : 0.4)
    animate(el.heading, L.heading, t)
    animate(headingP, { fontSize: `${L.headingSize}px` }, t)
    animate(el.subtitle, L.subtitle, t)
    animate(subP, { fontSize: `${L.subtitleSize}px` }, t)
    animate(el.button, L.button, t)
    animate(el.navbar, L.navbar, t)
    animate(navSvg, { ...L.navSvg, left: `calc(49.635% - ${L.navSvg.width / 2}px)`, top: `calc(48.571% - ${L.navSvg.height / 2}px)` }, t)
    animate(el.me, L.me, t)
    // Rotations live on the appear wrappers (same element Framer animates).
    if (s > 1 || instant === 'reset') {
      animate(inner('heading'), { rotate: L.headingRotate }, t)
      animate(inner('subtitle'), { rotate: L.subtitleRotate }, t)
      animate(inner('button'), { rotate: L.buttonRotate }, t)
    }
  }

  let step = 1, timer = 0, hovered = false
  const reset = () => { clearTimeout(timer); step = 1; apply(1, false); resetRotations() }
  const resetRotations = () => {
    animate(inner('heading'), { rotate: -9 }, spring())
    animate(inner('subtitle'), { rotate: 13 }, spring())
    animate(inner('button'), { rotate: -8 }, spring())
  }
  const next = () => {
    if (step >= 10) { if (!hovered) reset(); return }
    step += 1
    apply(step)
    timer = setTimeout(next, 400)
  }
  const enter = () => {
    hovered = true
    if (step !== 1) return
    step = 2
    apply(2)
    timer = setTimeout(next, 400)
  }
  const leave = () => { hovered = false; if (step >= 10) reset() }

  apply(1, true)
  window.addEventListener('resize', () => apply(step, true))
  if (canHover) onHover(card, enter, leave)
  else card.addEventListener('click', () => (step === 1 ? (enter(), (hovered = false)) : reset()))
}

/* -------------------------------------------------------------------------
   7. FAQ accordion (height spring + plus → minus)
   ------------------------------------------------------------------------- */
function initFaq() {
  document.querySelectorAll('[data-faq]').forEach((item) => {
    const wrap = item.querySelector('.faq__a-wrap')
    const bar = item.querySelector('.faq__bar--v')
    let open = false
    item.addEventListener('click', () => {
      open = !open
      item.classList.toggle('is-open', open)
      const h = open ? wrap.scrollHeight : 0
      animate(wrap, { height: [wrap.offsetHeight, h] }, spring()).then(() => { if (open) wrap.style.height = 'auto' })
      animate(bar, { rotate: open ? 180 : 90 }, spring())
    })
  })
}

/* -------------------------------------------------------------------------
   8. Mobile navbar (burger → X, card expands)
   ------------------------------------------------------------------------- */
function initMobileNav() {
  const bar = document.querySelector('[data-nav]')
  const burger = document.querySelector('[data-burger]')
  const [b1, b2, b3] = burger.querySelectorAll('.burger__bar')
  let open = false
  const set = (v) => {
    open = v
    burger.setAttribute('aria-expanded', String(v))
    const inner = bar.querySelector('.nav__inner')
    const target = v ? inner.scrollHeight + 40 : 68
    animate(bar, { height: target, paddingTop: v ? 20 : 16 }, spring())
    animate(b1, { top: v ? 14.5 : 7, rotate: v ? 45 : 0 }, spring())
    animate(b2, { rotate: v ? 45 : 0 }, spring())
    animate(b3, { top: v ? 14.5 : 22, rotate: v ? -45 : 0 }, spring())
  }
  burger.addEventListener('click', () => set(!open))
  bar.querySelectorAll('.nav__link').forEach((a) => a.addEventListener('click', () => open && set(false)))
  window.addEventListener('resize', () => {
    if (!isPhone() && open) set(false)
    if (!isPhone()) { bar.style.height = ''; bar.style.paddingTop = '' }
  })
}

/* ------------------------------------------------------------------------- */
function init() {
  initAppear()
  initWordEffect()
  document.querySelectorAll('[data-ticker]').forEach((t) => new Ticker(t))
  initHovers()
  initProblemCards()
  initProcess2()
  initProcess3()
  initFaq()
  initMobileNav()
  initShaders()
}

if (document.readyState === 'complete') init()
else window.addEventListener('load', init)
