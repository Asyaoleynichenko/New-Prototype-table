import { useState, useEffect, useRef, createContext, useContext, type Ref } from 'react'
import { createPortal } from 'react-dom'

const AP = `${import.meta.env.BASE_URL}assets`

// ── Table icons ─────────────────────────────────────────────────────────────
const ICO = {
  cross:     `${AP}/e5330.svg`,
  chkGray:   `${AP}/17101.svg`,
  chkMain:   `${AP}/ed13e.svg`,
  chkWork:   `${AP}/bd5e0.svg`,
  chkFam:    `${AP}/5896e.svg`,
  logoCloud: `${AP}/d965a.svg`,
  logoMail:  `${AP}/b0867.svg`,
  phone:     `${AP}/0db7a.svg`,
  copy:      `${AP}/effcd.svg`,
  doc:       `${AP}/09775.svg`,
  block:     `${AP}/81d35.svg`,
  stars:     `${AP}/05a90.svg`,
  notif:     `${AP}/9cf11.svg`,
  mailRu:    `${AP}/0192c.svg`,
  users:     `${AP}/fef15.svg`,
  folder:    `${AP}/3fcf3.svg`,
  limited:   `${AP}/d40b1.svg`,
  info:      `${AP}/0f2b9.svg`,
  dropdown:  `${AP}/e04b9.svg`,
  tipArrow:  `${AP}/ca7a8.svg`,
}

// ── Page layout icons ────────────────────────────────────────────────────────
const PG = {
  mailLogo:    `${AP}/f4c34.svg`,
  avatar:      `${AP}/ed958.png`,
  dropdown:    `${AP}/3eefa.svg`,
  gridIcon:    `${AP}/c3d80.svg`,
  arrowRight:  `${AP}/40401.svg`,
  // storage card
  storageAva:  `${AP}/avatar-placeholder.svg`,
  avatarSvg1:  `${AP}/54cc3.svg`,
  avatarSvg2:  `${AP}/621ae.svg`,
  avatarUser:  `${AP}/f7da4.svg`,
  counter:     `${AP}/b7469.svg`,
  // actions card
  promoIcon:   `${AP}/f6c7c.svg`,
  histIcon:    `${AP}/5772d.svg`,
  chevron:     `${AP}/d30fa.svg`,
  // included features
  cloudIco:    `${AP}/cf901.svg`,
  uploadIco:   `${AP}/6b8f3.svg`,
  attachIco:   `${AP}/9d101.svg`,
  docTextIco:  `${AP}/e7503.svg`,
  phoneIco:    `${AP}/1d9dc.svg`,
  shieldIco:   `${AP}/4298e.svg`,
  // promo card illustration
  img11:       `${AP}/919ee.png`,
  img9:        `${AP}/3c641.png`,
  img8:        `${AP}/photo-placeholder.svg`,
  blobVector:  `${AP}/58823.svg`,
  serviceIcos: `${AP}/0d62f.svg`,
  flash:       `${AP}/33c88.svg`,
  flash16:     `${AP}/9bc66.svg`,
  cards:       `${AP}/654be.svg`,
}

const BUY = {
  pct:      `${AP}/buy-pct.svg`,
  cloud:    `${AP}/buy-cloud.svg`,
  infinity: `${AP}/buy-infinity.svg`,
  done:     `${AP}/buy-done.svg`,
  close:    `${AP}/buy-close.svg`,
  cross:    `${AP}/buy-cross.svg`,
  stars:    `${AP}/buy-stars.svg`,
}

// ── Breakpoints ──────────────────────────────────────────────────────────────
// Layout math from Figma: sidebar 264 + main 992 = 1256.
// xl ≥1366  desktop mock — sidebar + fixed 992 content
// lg ≥1280  laptop — sidebar + fluid content (≥992 avail)
// md ≥768   tablet — no sidebar; cards row if content ≥960
// sm <768   mobile — stacked, compact table
type BP = 'sm' | 'md' | 'lg' | 'xl'

// Figma desktop: 1366 = sidebar 264 + gap 16 + content 992 (+ leftover margin)
const SIDEBAR_W = 264
const SIDEBAR_GAP = 16
const CONTENT_DESKTOP = 992
const CARD_ROW_MIN = 960
const PLAN_W_DESKTOP = 250

function widthToBp(w: number): BP {
  if (w >= 1366) return 'xl'
  if (w >= 1280) return 'lg'
  if (w >= 768) return 'md'
  return 'sm'
}

interface Layout {
  bp: BP
  w: number
  featW: number
  planW: number
  tablePad: number
  pagePad: number
  contentW: number
  hasSidebar: boolean
  stackCards: boolean
  menuOpen: boolean
  setMenuOpen: (v: boolean) => void
  paid: boolean
  setPaid: (v: boolean) => void
  buyPlanId: string | null
  setBuyPlanId: (id: string | null) => void
}

const LayoutCtx = createContext<Layout>({
  bp: 'xl', w: 1366, featW: 262, planW: PLAN_W_DESKTOP, tablePad: 24, pagePad: 24,
  contentW: CONTENT_DESKTOP, hasSidebar: true, stackCards: false,
  menuOpen: false, setMenuOpen: () => {},
  paid: false, setPaid: () => {},
  buyPlanId: null, setBuyPlanId: () => {},
})
function useLayout() { return useContext(LayoutCtx) }

function appBase() {
  const raw = import.meta.env.BASE_URL || '/'
  return raw.endsWith('/') ? raw : `${raw}/`
}

function paidFromUrl() {
  if (typeof window === 'undefined') return false
  const { pathname, search, hash } = window.location
  const clean = pathname.replace(/\/+$/, '') || '/'
  if (clean.endsWith('/paid')) return true
  if (clean.endsWith('/free')) return false
  const q = new URLSearchParams(search)
  if (q.get('mode') === 'paid' || q.has('paid')) return true
  if (/^#\/?paid/.test(hash)) return true
  return false
}

function urlForPaid(paid: boolean) {
  return paid ? `${appBase()}paid` : appBase()
}

function metricsFor(w: number) {
  const bp = widthToBp(w)
  // Progressive pads so 767→768 doesn't shrink the content column
  const pagePad = bp === 'sm' ? 16 : bp === 'md' ? 20 : 24
  const hasSidebar = bp === 'xl' || bp === 'lg'

  // Real available width for the main column (include sidebar gap)
  const contentW = bp === 'xl'
    ? CONTENT_DESKTOP
    : hasSidebar
      ? Math.max(0, w - SIDEBAR_W - SIDEBAR_GAP - pagePad)
      : Math.max(0, w - pagePad * 2)

  const stackCards = contentW < CARD_ROW_MIN

  // Sticky feature column — leave room for ≥1 plan card to peek
  const featW =
    bp === 'sm' ? Math.min(152, Math.max(120, Math.round(w * 0.36))) :
    bp === 'md' ? Math.min(208, Math.max(160, Math.round(contentW * 0.26))) :
    262

  const planW =
    bp === 'sm' ? 188 :
    bp === 'md' ? 208 :
    PLAN_W_DESKTOP

  return {
    bp,
    featW,
    planW,
    tablePad: pagePad,
    pagePad,
    contentW,
    hasSidebar,
    stackCards,
  }
}

// ── Table column config ──────────────────────────────────────────────────────
const COL_CHK = [ICO.chkGray, ICO.chkMain, ICO.chkWork, ICO.chkFam, ICO.chkGray]

type V = boolean | 'base'
interface Feat { id: string; label: string; isNew?: boolean; more?: boolean; v: V[]; tip: string; tipPaid?: string }
interface Sect { id: string; title: string; logo: string; rows: Feat[] }

const DATA: Sect[] = [
  {
    id: 'cloud', title: 'Облако', logo: ICO.logoCloud,
    rows: [
      { id: 'no-ads',      label: 'Без рекламы',                                                    v: [false, true,   true,   true,   false], tip: 'Ничего не будет отвлекать от писем и выдавать ваши планы', tipPaid: 'Ничего не будет отвлекать от писем и выдавать ваши планы' },
      { id: 'autosave',    label: 'Автосохранение файлов с телефона в Облако',            v: ['base',true,   true,   true,  'base'], tip: 'Фото и видео с телефона сами загрузятся в Облако — будет резервная копия, если с телефоном вдруг что-то случится', tipPaid: 'Фото и видео с телефона загрузятся в Облако, но место не займут' },
      { id: 'upload-100',  label: 'Загрузка файлов до 100 ГБ в Облако',             v: [false, true,   true,   true,   false], tip: 'Можно загрузить в Облако тяжёлый файл. Например, архив с фотографиями и видео', tipPaid: 'Можно загрузить в Облако тяжёлый файл. Например, архив с фотографиями и видео' },
      { id: 'dedup',       label: 'Удаление дубликатов',        isNew: true,                       v: [false, true,   true,   true,   false], tip: 'Нейросеть поможет освободить место: подскажет, какие фото удалить, а какие оставить', tipPaid: 'Нейросеть поможет освободить место: подскажет, какие фото удалить, а какие оставить' },
      { id: 'swipes',      label: 'Разбор фото свайпами',       isNew: true,                       v: [false, true,   true,   true,   false], tip: 'Быстро наведёте порядок в Облаке, смахивая фото вправо и влево', tipPaid: 'Быстро наведёте порядок в Облаке, смахивая фото вправо и влево' },
      { id: 'fam-folders', label: 'Семейные папки с общим доступом', isNew: true,             v: [false, false,  false,  true,   false], tip: 'Сканы документов, билеты в театр, таблицы с бюджетом на отпуск — пусть всё нужное лежит в семейных папках', tipPaid: 'Сканы документов, билеты в театр, таблицы с бюджетом на отпуск — пусть всё нужное лежит в семейных папках' },
      { id: 'fam-albums',  label: 'Семейные альбомы с общим доступом', isNew: true,           v: [false, false,  false,  true,   false], tip: 'Семейные альбомы смогут обновлять все близкие — будет много фото радостного события от каждого', tipPaid: 'Семейные альбомы смогут обновлять все близкие — будет много фото радостного события от каждого' },
      { id: 'fam-cal',     label: 'Семейный календарь',         isNew: true,                       v: [false, false,  false,  true,   false], tip: 'Добавляйте события — они появятся у всех в подписке. Будет проще планировать общие дела', tipPaid: 'Добавляйте события — они появятся у всех в подписке. Будет проще планировать общие дела' },
      { id: 'fam-docs',    label: 'Распознавание документов семьи', isNew: true,                   v: [false, false,  false,  true,   false], tip: 'Справки для школы, документы для визы — нейросеть распознает их и перенесёт в отдельную папку', tipPaid: 'Справки для школы, документы для визы — нейросеть распознает их и перенесёт в отдельную папку' },
      { id: 'fam-unlim',   label: 'Безлимит и отключение рекламы у всех в подписке', isNew: true, v: [false, false, false, true, false], tip: 'Фото и видео с телефона загрузятся в личную папку каждого участника и не займут место в Облаке', tipPaid: 'Фото и видео с телефона загрузятся в личную папку каждого участника и не займут место в Облаке' },
      { id: 'doc-edit',    label: 'Редактирование документов', more: true,                       v: ['base',true,   true,   true,  'base'], tip: 'Редактируйте сами, с коллегами или близкими. Например, ведите общий бюджет в таблице', tipPaid: 'Редактируйте сами, с коллегами или близкими. Например, ведите общий бюджет в таблице' },
      { id: 'extra-space', label: 'Дополнительное место для файлов', more: true,                 v: [false, true,   true,   true,   false], tip: 'Для файлов из Облака, писем и вложений из Почты', tipPaid: 'Для файлов из Облака, писем и вложений из Почты' },
      { id: 'timer',       label: 'Таймер для автоудаления отправленных папок', more: true,     v: [false, true,   true,   true,   false], tip: 'У адресата будет время посмотреть файлы, а потом они автоматически удалятся и освободят место', tipPaid: 'У адресата будет время посмотреть файлы, а потом они автоматически удалятся и освободят место' },
      { id: 'folder-dsgn', label: 'Выбор оформления для совместных папок', more: true,          v: [false, true,   true,   true,   false], tip: 'Устанавливайте фоны — будет легче различать папки, которыми делитесь с коллегами или друзьями', tipPaid: 'Устанавливайте фоны — будет легче различать папки, которыми делитесь с коллегами или друзьями' },
      { id: 'folder-pass', label: 'Пароль для совместных папок\nв веб-версии', more: true,     v: [false, true,   true,   true,   false], tip: 'Скроете файлы от посторонних глаз', tipPaid: 'Скроете файлы от посторонних глаз' },
      { id: 'share-3',     label: 'Можно делиться местом ещё с 3 участниками', more: true,     v: [false, false,  false,  true,   false], tip: 'Можно сделать подарок близким или разделить оплату и экономить', tipPaid: 'Можно сделать подарок близким или разделить оплату и экономить' },
    ]
  },
  {
    id: 'mail', title: 'Почта', logo: ICO.logoMail,
    rows: [
      { id: 'mail-noad',   label: 'Без рекламы',                                          v: [false, true,   true,   true,   false], tip: 'Ничего не будет отвлекать от писем и выдавать ваши планы', tipPaid: 'Ничего не будет отвлекать от писем и выдавать ваши планы' },
      { id: 'mail-space',  label: 'Дополнительное место для писем',                      v: [false, true,   true,   true,   true],  tip: 'Для файлов из Облака, писем и вложений из Почты', tipPaid: 'Для файлов из Облака, писем и вложений из Почты' },
      { id: 'address',     label: 'Красивый адрес',              isNew: true,            v: [false, false,  true,   false,  false], tip: 'Сможете выбрать дополнительный адрес к основному и отразить своё дело. Например, name@example.com', tipPaid: 'Сможете выбрать дополнительный адрес к основному и отразить своё дело. Например, name@example.com' },
      { id: 'ai-style',    label: 'Генерация и изменение стиля писем', isNew: true,      v: [false, false,  true,   false,  false], tip: 'Делегируете мелочи нейросети. Она напишет за вас письмо или поправит тон уже готового. Например, на деловой', tipPaid: 'Делегируете мелочи нейросети. Она напишет за вас письмо или поправит тон уже готового. Например, на деловой' },
      { id: 'ai-sum',      label: 'Краткий пересказ писем',      isNew: true,            v: [false, false,  true,   false,  false], tip: 'Нейросеть раскроет суть письма в одном абзаце — пригодится, когда нет времени читать большие письма', tipPaid: 'Нейросеть раскроет суть письма в одном абзаце — пригодится, когда нет времени читать большие письма' },
      { id: 'ai-asst',     label: 'Нейропомощник',               isNew: true,            v: [false, false,  true,   false,  false], tip: 'Нейросеть перескажет важные письма в одной строке и поднимет их над списком писем, чтобы вы ничего не пропустили', tipPaid: 'Нейросеть перескажет важные письма в одной строке и поднимет их над списком писем, чтобы вы ничего не пропустили' },
      { id: 'attach-100',  label: 'Отправка вложений до 100 ГБ в письмах',               v: [false, false,  true,   false,  false], tip: 'К письму можно прикрепить тяжёлое вложение. Например, квартальный отчёт', tipPaid: 'К письму можно прикрепить тяжёлое вложение. Например, квартальный отчёт' },
      { id: 'widgets',     label: 'Полезные виджеты Календаря и Задач всегда на виду',   v: [false, false,  true,   false,  false], tip: 'Держите события Календаря и задачи на виду в интерфейсе Почты.' },
      { id: 'undo',        label: 'Отмена отправки писем в течение 20 секунд',            v: [false, false,  true,   false,  false], tip: 'Если вдруг отправили письмо не тому человеку или забыли прикрепить файл', tipPaid: 'Если вдруг отправили письмо не тому человеку или забыли прикрепить файл' },
      { id: 'read-rcpt',   label: 'Уведомления о прочтении ваших писем',                 v: [false, false,  true,   false,  false], tip: 'Не нужно будет уточнять у адресата, получил он письмо или нет', tipPaid: 'Не нужно будет уточнять у адресата, получил он письмо или нет' },
      { id: 'antivirus',   label: 'Проверка вложений антивирусов',                       v: ['base',true,   true,   true,  'base'], tip: 'Письма и файлы в Почте и Облаке проверяются антивирусом Dr.Web', tipPaid: 'Письма и файлы в Почте и Облаке проверяются антивирусом Dr.Web' },
    ]
  }
]

interface PlanDef {
  id: string; name: string; cname?: string
  bg: string; border?: string; isCurrent?: boolean
  sub?: string
  price?: string; disc?: string; cap?: string
  hint?: string
  bullets?: { ico: string; txt: string }[]
}

const PLANS: PlanDef[] = [
  {
    id: 'free', name: 'Бесплатный', cname: 'Бесплатно',
    sub: '8 ГБ в едином пространстве Почты и Облака',
    bg: 'white', border: '1px solid rgba(0,16,61,0.08)',
    isCurrent: true,
  },
  {
    id: 'main', name: 'Основной',
    sub: 'Все самое нужно для\u00a0повседневных задач', bg: '#f0f7ff',
    price: 'от 87 ₽', disc: 'до −79%', cap: 'до 2 ТБ',
    hint: 'Безлимит для\u00a0фото с\u00a0телефона, удаление дубликатов, загрузка файлов до\u00a0100\u00a0ГБ и\u00a0без\u00a0рекламы в\u00a0Почте и\u00a0Облаке',
    bullets: [
      { ico: ICO.phone,   txt: 'Безлимит для фото с телефона' },
      { ico: ICO.copy,    txt: 'Удаление дубликатов' },
      { ico: ICO.doc,     txt: 'Загрузка файлов до 100 ГБ' },
      { ico: ICO.block,   txt: 'Без рекламы в Почте и Облаке' },
    ]
  },
  {
    id: 'work', name: 'Для работы',
    sub: 'Возможности для\u00a0бизнеса и\u00a0команд', bg: '#f2fcfe',
    price: 'от 108 ₽', disc: 'до −80%', cap: 'до 4 ТБ',
    hint: 'Краткий пересказ, уведомление о\u00a0прочтении, красивый адрес и\u00a0без\u00a0рекламы в\u00a0Почте и\u00a0Облаке',
    bullets: [
      { ico: ICO.stars,   txt: 'Краткий пересказ' },
      { ico: ICO.notif,   txt: 'Уведомление о прочтении' },
      { ico: ICO.mailRu,  txt: 'Красивый адрес' },
      { ico: ICO.block,   txt: 'Без рекламы в Почте и Облаке' },
    ]
  },
  {
    id: 'family', name: 'Семейный',
    sub: 'Возможности Почты\nи\u00a0Облака для\u00a0близких', bg: '#f8f6ff',
    price: 'от 149 ₽', disc: 'до −75%', cap: 'до 1 ТБ',
    hint: 'Единое хранилище для четверых, семейные папки и альбомы\nс доступом для всех в подписке',
    bullets: [
      { ico: ICO.phone,   txt: 'Семейный безлимит' },
      { ico: ICO.users,   txt: 'Добавление ещё 3 участников' },
      { ico: ICO.folder,  txt: 'Семейные папки и альбомы' },
      { ico: ICO.block,   txt: 'Без рекламы в Почте и Облаке' },
    ]
  },
  {
    id: 'minimal', name: 'Минимальный',
    sub: 'Только место в Облаке и Почте', bg: '#f6f7f8',
    price: 'от 83 ₽', disc: 'до −79%',
    bullets: [
      { ico: ICO.limited, txt: 'Безлимит для фото с телефона' },
      { ico: ICO.limited, txt: 'Удаление дубликатов' },
      { ico: ICO.limited, txt: 'Загрузка файлов до 100 ГБ' },
      { ico: ICO.limited, txt: 'Без рекламы в Почте и Облаке' },
    ]
  },
]

const PAID_COL = [4, 1, 2, 3]
const PAID_PLANS: PlanDef[] = [
  {
    ...PLANS[4],
    isCurrent: true,
    disc: undefined,
    sub: 'Подписка на\u00a0единое пространство',
    bg: 'white',
    border: '1px solid rgba(0,16,61,0.08)',
  },
  {
    ...PLANS[1],
    sub: 'Все самое нужно для\u00a0повседневных задач',
    hint: 'Безлимит для\u00a0фото с\u00a0телефона, удаление дубликатов, загрузка файлов до\u00a0100\u00a0ГБ и\u00a0без\u00a0рекламы в\u00a0Почте и\u00a0Облаке',
  },
  {
    ...PLANS[2],
    sub: 'Возможности для\u00a0бизнеса и\u00a0команд',
    hint: 'Краткий пересказ, уведомление о\u00a0прочтении, красивый адрес и\u00a0без\u00a0рекламы в\u00a0Почте и\u00a0Облаке',
  },
  {
    ...PLANS[3],
    sub: 'Возможности Почты\nи\u00a0Облака для\u00a0близких',
    hint: 'Единое хранилище для четверых, семейные папки и альбомы\nс доступом для всех в подписке',
  },
]

function usePlans() {
  const { paid } = useLayout()
  if (!paid) return { plans: PLANS, mapV: (v: V[]) => v, chks: COL_CHK }
  return {
    plans: PAID_PLANS,
    mapV: (v: V[]) => PAID_COL.map(i => v[i]),
    chks: PAID_COL.map(i => COL_CHK[i]),
  }
}

type BuyIco = 'infinity' | 'done' | 'cross' | 'stars'
interface BuySize {
  amount: string
  unit: 'ГБ' | 'ТБ'
  volume: string
  yearPrice: number
  disc: string
  discPct: number
  featured?: boolean
}
interface BuyModalDef {
  title1: string
  title2: string
  features: { ico: BuyIco; txt: string; accent?: boolean; off?: boolean }[]
  sizes: BuySize[]
}

const BUY_ICO: Record<BuyIco, string> = {
  infinity: BUY.infinity,
  done: BUY.done,
  cross: BUY.cross,
  stars: BUY.stars,
}

const BUY_MODALS: Record<string, BuyModalDef> = {
  main: {
    title1: 'Больше возможностей с тарифом',
    title2: 'Mail Space основной',
    features: [
      { ico: 'infinity', txt: 'Безлимит для фото с телефона', accent: true },
      { ico: 'done', txt: 'Без рекламы в Почте и Облаке' },
      { ico: 'done', txt: 'Удаление дубликатов' },
      { ico: 'done', txt: 'Загрузка файлов до 100 ГБ' },
    ],
    sizes: [
      { amount: '+512', unit: 'ГБ', volume: 'Ваш объём составит 520 ГБ', yearPrice: 83, disc: '−74%', discPct: 74 },
      { amount: '+1', unit: 'ТБ', volume: 'Ваш объём составит 1.01 ТБ', yearPrice: 91, disc: '−74%', discPct: 74, featured: true },
      { amount: '+2', unit: 'ТБ', volume: 'Ваш объём составит 2.01 ТБ', yearPrice: 158, disc: '−72%', discPct: 72 },
    ],
  },
  work: {
    title1: 'Больше возможностей с тарифом',
    title2: 'Mail Space для работы',
    features: [
      { ico: 'stars', txt: 'Генерация и изменение писем', accent: true },
      { ico: 'done', txt: 'Без рекламы в Почте и Облаке' },
      { ico: 'done', txt: 'Уведомление о прочтении' },
      { ico: 'done', txt: 'Отмена отправки писем' },
    ],
    sizes: [
      { amount: '+512', unit: 'ГБ', volume: 'Ваш объём составит 520 ГБ', yearPrice: 149, disc: '−73%', discPct: 73 },
      { amount: '+1', unit: 'ТБ', volume: 'Ваш объём составит 1.01 ТБ', yearPrice: 166, disc: '−72%', discPct: 72, featured: true },
      { amount: '+2', unit: 'ТБ', volume: 'Ваш объём составит 2.01 ТБ', yearPrice: 274, disc: '−73%', discPct: 73 },
    ],
  },
  family: {
    title1: 'Больше возможностей с тарифом',
    title2: 'Mail Space семейный',
    features: [
      { ico: 'infinity', txt: 'Семейный безлимит', accent: true },
      { ico: 'done', txt: 'Без рекламы в Почте и Облаке' },
      { ico: 'done', txt: 'Добавление ещё 3 участников' },
      { ico: 'done', txt: 'Семейные папки и альбомы' },
    ],
    sizes: [
      { amount: '+512', unit: 'ГБ', volume: 'Ваш объём составит 520 ГБ', yearPrice: 132, disc: '−73%', discPct: 73 },
      { amount: '+1', unit: 'ТБ', volume: 'Ваш объём составит 1.01 ТБ', yearPrice: 108, disc: '−74%', discPct: 74, featured: true },
      { amount: '+2', unit: 'ТБ', volume: 'Ваш объём составит 2.01 ТБ', yearPrice: 249, disc: '−73%', discPct: 73 },
    ],
  },
  minimal: {
    title1: 'Увеличить место с тарифом',
    title2: 'Mail Space минимальный',
    features: [
      { ico: 'infinity', txt: 'Безлимит для фото с телефона', accent: true },
      { ico: 'cross', txt: 'Без рекламы в Почте и Облаке', off: true },
      { ico: 'cross', txt: 'Удаление дубликатов', off: true },
      { ico: 'cross', txt: 'Загрузка файлов до 100 ГБ', off: true },
    ],
    sizes: [
      { amount: '+2', unit: 'ТБ', volume: 'Ваш объём составит 2.01 ТБ', yearPrice: 158, disc: '−77%', discPct: 77 },
      { amount: '+1', unit: 'ТБ', volume: 'Ваш объём составит 1.01 ТБ', yearPrice: 87, disc: '−78%', discPct: 78, featured: true },
      { amount: '+4', unit: 'ТБ', volume: 'Ваш объём составит 4.01 ТБ', yearPrice: 271, disc: '−78%', discPct: 78 },
    ],
  },
}

function rubMonth(n: number) {
  return `${n}\u00a0₽ в\u00a0месяц`
}

function BuyTariffModal({ planId, onClose }: { planId: string; onClose: () => void }) {
  const def = BUY_MODALS[planId]
  const [period, setPeriod] = useState<'month' | 'year'>('year')
  const { bp, w } = useLayout()
  const stackSizes = w < 900

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!def) return null

  const yearOn = period === 'year'
  const modalW = bp === 'sm' ? Math.min(840, (typeof window !== 'undefined' ? window.innerWidth : 840) - 24) : 840

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0, 16, 61, 0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: bp === 'sm' ? 12 : 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: modalW,
          height: stackSizes ? undefined : 669,
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 24px)',
          overflow: stackSizes ? 'auto' : 'hidden',
          background: '#f3f3f5',
          borderRadius: 12,
          boxSizing: 'border-box',
          boxShadow: '0 10px 36px rgba(0,16,61,0.08), 0 6px 20px rgba(0,16,61,0.06), 0 6px 12px rgba(0,16,61,0.06)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 40, height: 40, border: 'none', background: 'transparent',
            borderRadius: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
          }}
        >
          <img src={BUY.close} alt="" style={{ width: 16, height: 16 }} />
        </button>

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
          paddingTop: 40, width: '100%',
        }}>
          <div style={{ width: '100%', maxWidth: 712, height: bp === 'sm' ? 'auto' : 76, textAlign: 'center', padding: bp === 'sm' ? '0 16px' : 0, boxSizing: 'border-box' }}>
            <p style={{
              margin: 0,
              fontFamily: "var(--fontfamilyaccent)",
              fontSize: bp === 'sm' ? 24 : 32,
              lineHeight: bp === 'sm' ? '30px' : '38px',
              color: '#2c2d2e', fontWeight: 500,
            }}>
              {def.title1}<br />{def.title2}
            </p>
          </div>

          <div style={{
            position: 'relative', width: 212, height: 48, flexShrink: 0,
            background: 'rgba(71,71,71,0.06)', borderRadius: 40,
          }}>
            <button
              type="button"
              onClick={() => setPeriod('month')}
              style={{
                position: 'absolute', left: 4, top: 4,
                width: 102, height: 40, borderRadius: 40, border: 'none',
                background: yearOn ? 'transparent' : 'white',
                cursor: 'pointer',
                fontFamily: "var(--fontfamilyaccent)",
                fontSize: 12, lineHeight: '16px',
                color: yearOn ? '#87898f' : '#2c2d2e',
              }}
            >
              На месяц
            </button>
            <button
              type="button"
              onClick={() => setPeriod('year')}
              style={{
                position: 'absolute', right: 4, top: 4,
                width: 102, height: 40, borderRadius: 40, border: 'none',
                background: yearOn ? 'white' : 'transparent',
                cursor: 'pointer',
                fontFamily: "var(--fontfamilyaccent)",
                fontSize: 12, lineHeight: '16px',
                color: yearOn ? '#2c2d2e' : '#87898f',
              }}
            >
              На год
            </button>
            {yearOn && (
              <img
                src={BUY.pct}
                alt=""
                style={{
                  position: 'absolute', width: 38.5, height: 38.5,
                  right: -14, top: -18,
                  transform: 'rotate(-47deg)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
        </div>

        <div style={{
          display: 'flex', flexDirection: stackSizes ? 'column' : 'row',
          alignItems: stackSizes ? 'stretch' : 'center',
          gap: 12, justifyContent: 'center',
          marginTop: 24, padding: stackSizes ? '0 16px 20px' : '0 24px 20px',
        }}>
          {def.sizes.map(size => {
            const featured = !!size.featured
            const price = yearOn
              ? size.yearPrice
              : Math.round(size.yearPrice / (1 - size.discPct / 100))
            return (
              <div
                key={size.amount + size.unit}
                style={{
                  width: stackSizes ? '100%' : 256, flexShrink: 0,
                  maxWidth: stackSizes ? 420 : undefined,
                  alignSelf: stackSizes ? 'center' : undefined,
                  height: stackSizes ? 'auto' : 429,
                  background: 'white',
                  borderRadius: 21,
                  boxSizing: 'border-box',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: featured ? 'inset 0 0 0 2.5px #0077ff' : undefined,
                }}
              >
                <div style={{ height: 35, width: '100%', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
                  {featured && (
                    <div style={{
                      height: 35,
                      background: 'rgba(0,119,255,0.18)',
                      borderRadius: '0 18px 0 21px',
                      padding: '0 21px',
                      display: 'flex', alignItems: 'center',
                    }}>
                      <span style={{
                        fontFamily: "var(--fontfamilyaccent)",
                        fontSize: 14, lineHeight: '16px', color: '#0070f0',
                      }}>Выгодно</span>
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'center',
                  height: 110, padding: '18px 21px 19px', boxSizing: 'border-box',
                  width: '100%', flexShrink: 0, overflow: 'hidden',
                }}>
                  <span style={{
                    fontFamily: "var(--fontfamilyaccent)",
                    fontSize: 52, lineHeight: '73px', color: '#2c2d2e',
                    fontWeight: 500,
                  }}>{size.amount}</span>
                  <span style={{
                    fontFamily: "'VK Sans Display:DemiBold', 'VK Sans Display', sans-serif",
                    fontSize: 28, lineHeight: '36px', color: '#2c2d2e',
                    paddingTop: 10, fontWeight: 600,
                  }}>{size.unit}</span>
                </div>

                <div style={{
                  padding: '0 9px 24px', width: '100%', boxSizing: 'border-box',
                  display: 'flex', justifyContent: 'center', flexShrink: 0,
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    height: 28, width: 211,
                    background: 'rgba(0,16,61,0.08)', borderRadius: 11,
                    padding: '5px 7px', boxSizing: 'border-box',
                  }}>
                    <img src={BUY.cloud} alt="" style={{ width: 18, height: 18, flexShrink: 0 }} />
                    <span style={{
                      fontFamily: "var(--fontfamilyaccent)",
                      fontSize: 12, lineHeight: '16px', letterSpacing: 0.24, color: '#2c2d2e',
                      whiteSpace: 'nowrap',
                    }}>{size.volume}</span>
                  </div>
                </div>

                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 16,
                  padding: '0 12px 20px', width: '100%', boxSizing: 'border-box',
                  flexShrink: 0,
                }}>
                  {def.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'flex-start', width: '100%' }}>
                      <div style={{
                        width: 18, height: 18, padding: 1, boxSizing: 'border-box',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <img src={BUY_ICO[f.ico]} alt="" style={{ width: 16, height: 16, display: 'block' }} />
                      </div>
                      <span style={{
                        fontFamily: "'VK Sans Display:Regular', 'VK Sans Display', sans-serif",
                        fontSize: 14, lineHeight: '18px',
                        color: f.off ? '#87898f' : f.accent ? '#0070f0' : '#2c2d2e',
                        flex: 1, minWidth: 0,
                      }}>{f.txt}</span>
                    </div>
                  ))}
                </div>

                <div style={{
                  marginTop: 'auto', padding: 12, width: '100%', boxSizing: 'border-box',
                  display: 'flex', alignItems: 'flex-end',
                }}>
                  <button
                    type="button"
                    style={{
                      position: 'relative',
                      width: '100%', height: 68, overflow: 'hidden',
                      border: 'none', borderRadius: 16, cursor: 'pointer',
                      background: featured ? '#0077ff' : '#ebf2ff',
                      color: featured ? 'white' : '#0070f0',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      padding: yearOn ? '10px 24px' : '0 24px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{
                      fontFamily: "var(--fontfamilyaccent)",
                      fontSize: 16, lineHeight: '20px',
                    }}>{rubMonth(price)}</span>
                    {yearOn && (
                      <span style={{
                        fontFamily: "'VK Sans Display:Regular', 'VK Sans Display', sans-serif",
                        fontSize: 12, lineHeight: '16px',
                      }}>при покупке на год</span>
                    )}
                    {yearOn && (
                      <span style={{
                        position: 'absolute', top: 0, right: 0,
                        background: featured ? '#2c2d2e' : '#0077ff',
                        color: 'white',
                        fontFamily: "var(--fontfamilybase)",
                        fontSize: 11, lineHeight: '14px',
                        padding: '5px 12px 3px',
                        borderRadius: '0 16px 0 16px',
                      }}>{size.disc}</span>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Table sub-components ─────────────────────────────────────────────────────

const PLAN_COL = 176

function useTableGrid() {
  const { plans } = usePlans()
  const { featW, paid, bp } = useLayout()
  const carousel = !paid || bp === 'sm'
  const label = carousel && bp !== 'sm' ? Math.min(featW, 260) : featW
  const grid = carousel
    ? {
        display: 'grid' as const,
        gridTemplateColumns: `${label}px repeat(${plans.length}, ${bp === 'sm' ? 168 : PLAN_COL}px)`,
        columnGap: 8,
        width: 'max-content' as const,
      }
    : {
        display: 'grid' as const,
        gridTemplateColumns: `minmax(0, 1.45fr) repeat(${plans.length}, minmax(0, 1fr))`,
        columnGap: 8,
        width: '100%',
        minWidth: 0,
      }
  return { grid, carousel, label, step: (bp === 'sm' ? 168 : PLAN_COL) + 8 }
}

function NewBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      height: 22, margin: '-1px 0', padding: '0 6px', borderRadius: 100,
      background: '#b8fc75', transform: 'rotate(-5deg)', flexShrink: 0,
    }}>
      <span style={{
        fontFamily: "var(--fontfamilyaccent)",
        color: '#087c6d', fontSize: 13, lineHeight: '18px', whiteSpace: 'nowrap',
      }}>New</span>
    </span>
  )
}

function FeatureRow({ feat, demo, onDemoEnd, onRowHover, rowRef }: {
  feat: Feat
  demo?: boolean
  onDemoEnd?: () => void
  onRowHover?: () => void
  rowRef?: Ref<HTMLDivElement>
}) {
  const { bp, tablePad, paid } = useLayout()
  const { mapV, chks } = usePlans()
  const { grid, carousel, label } = useTableGrid()
  const [hovered, setHovered] = useState(false)
  const [tip, setTip] = useState<TipState | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const hoveredRef = useRef(false)
  const demoRef = useRef(demo)
  const onDemoEndRef = useRef(onDemoEnd)
  demoRef.current = demo
  onDemoEndRef.current = onDemoEnd
  const canHover = typeof window === 'undefined' || window.matchMedia('(hover: hover)').matches
  const hot = hovered || Boolean(demo)
  const showInfo = !canHover || hot || Boolean(tip)

  const placeTip = () => {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const width = 235
    const center = r.left + r.width / 2
    const left = Math.min(Math.max(center - width / 2, 8), window.innerWidth - width - 8)
    const above = r.top > 110
    setTip(prev => ({ left, top: above ? r.top - 2 : r.bottom + 2, above, motion: prev?.motion }))
  }
  const clearTip = () => setTip(null)

  useEffect(() => {
    if (!demo) return
    let cancelled = false
    const timers: number[] = []
    const later = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, ms))
    }
    const readTip = (motion: TipState['motion']) => {
      const el = btnRef.current
      if (!el) return null
      const r = el.getBoundingClientRect()
      if (r.bottom < 48 || r.top > window.innerHeight - 24) return null
      const width = 235
      const center = r.left + r.width / 2
      const left = Math.min(Math.max(center - width / 2, 8), window.innerWidth - width - 8)
      const above = r.top > 110
      return { left, top: above ? r.top - 2 : r.bottom + 2, above, motion }
    }
    const finish = () => {
      if (cancelled) return
      cancelled = true
      setTip(prev => (hoveredRef.current ? (prev ? { ...prev, motion: undefined } : prev) : null))
      onDemoEndRef.current?.()
    }

    later(220, () => {
      if (cancelled) return
      const next = readTip('in')
      if (!next) { finish(); return }
      setTip(next)
    })
    later(220 + 420 + 2200, () => {
      if (cancelled) return
      if (hoveredRef.current) { finish(); return }
      setTip(prev => (prev ? { ...prev, motion: 'out' } : prev))
    })
    later(220 + 420 + 2200 + 260, finish)

    const onScroll = () => {
      if (cancelled) return
      const next = readTip(undefined)
      if (!next) { finish(); return }
      setTip(prev => {
        if (!prev) return prev
        if (prev.left === next.left && prev.top === next.top && prev.above === next.above) return prev
        return { ...prev, left: next.left, top: next.top, above: next.above }
      })
    }
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelled = true
      timers.forEach(id => window.clearTimeout(id))
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
      setTip(prev => (prev?.motion ? null : prev))
    }
  }, [demo])

  return (
    <div
      ref={rowRef}
      style={{
        ...grid,
        alignItems: 'center',
        borderRadius: 8,
        padding: '4px 0',
        background: hot ? '#f4f5f6' : 'transparent',
        transition: 'background 180ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={() => { hoveredRef.current = true; setHovered(true); onRowHover?.() }}
      onMouseLeave={() => {
        hoveredRef.current = false
        setHovered(false)
        if (demoRef.current) {
          setTip(null)
          onDemoEndRef.current?.()
          return
        }
        clearTip()
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        paddingRight: 10, minWidth: 0,
        ...(carousel ? {
          position: 'sticky' as const, left: 0, zIndex: 2,
          boxSizing: 'border-box' as const,
          width: label + tablePad,
          marginLeft: -tablePad,
          paddingLeft: tablePad + 12,
          background: hot ? '#f4f5f6' : '#fff',
          boxShadow: hot ? '8px 0 0 #f4f5f6' : '8px 0 0 #fff',
          transition: 'background 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        } : { position: 'relative' as const, paddingLeft: 12 }),
      }}>
        {feat.isNew && <NewBadge />}
        <span style={{
          fontFamily: "var(--fontfamilybase)",
          fontSize: bp === 'sm' ? 13 : 15, lineHeight: '20px', color: '#2c2d2e',
          minWidth: 0, whiteSpace: 'pre-line',
        }}>
          {feat.label}
        </span>
        <button
          ref={btnRef}
          type="button"
          aria-label="Подробнее"
          onMouseEnter={placeTip}
          onMouseLeave={() => { if (!demoRef.current) clearTip() }}
          onFocus={placeTip}
          onBlur={() => { if (!demoRef.current) clearTip() }}
          onClick={(e) => {
            e.stopPropagation()
            if (canHover) return
            if (tip) clearTip()
            else placeTip()
          }}
          style={{
            opacity: showInfo ? 1 : 0,
            transition: 'opacity 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'absolute', top: 2, right: -6,
            width: 16, height: 16, padding: 0,
            border: 'none', background: 'transparent', cursor: 'pointer',
            pointerEvents: showInfo ? 'auto' : 'none',
          }}
        >
          <img src={ICO.info} alt="" style={{ width: 16, height: 16, display: 'block' }} />
        </button>
        {tip && createPortal(
          <div
            data-onboard-tip={tip.motion ? '' : undefined}
            style={{
              position: 'fixed',
              left: tip.left, top: tip.top,
              transform: tip.above ? 'translateY(-100%)' : undefined,
              zIndex: 9999, width: 235,
              pointerEvents: 'none',
            }}
          >
            <div
              className={tip.motion ? 'tip-smart' : undefined}
              data-motion={tip.motion}
              data-side={tip.above ? 'above' : 'below'}
              style={{
                display: 'flex', flexDirection: tip.above ? 'column' : 'column-reverse', alignItems: 'center',
                filter: 'drop-shadow(0 0 3px rgba(0,16,61,0.06)) drop-shadow(0 6px 6px rgba(0,16,61,0.06)) drop-shadow(0 6px 10px rgba(0,16,61,0.06)) drop-shadow(0 10px 18px rgba(0,16,61,0.08))',
              }}
            >
              <div style={{
                background: '#303030', color: 'white',
                borderRadius: 8, padding: '8.5px 12px 9.5px',
                width: '100%', boxSizing: 'border-box',
                fontFamily: "var(--fontfamilybase)", fontSize: 13, lineHeight: '18px',
              }}>
                {paid && feat.tipPaid ? feat.tipPaid : feat.tip}
              </div>
              <img src={ICO.tipArrow} alt="" style={{ width: 80, height: 10, display: 'block', transform: tip.above ? 'rotate(180deg)' : undefined }} />
            </div>
          </div>,
          document.body,
        )}
      </div>
      {mapV(feat.v).map((val, ci) => (
        <div key={ci} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
          <img src={val === false ? ICO.cross : chks[ci]} alt={val === false ? '—' : '✓'} style={{ width: 20, height: 20 }} />
        </div>
      ))}
    </div>
  )
}

interface TipState { left: number; top: number; above: boolean; motion?: 'in' | 'out' }

function PlanCard({ plan }: { plan: PlanDef }) {
  const { paid, setBuyPlanId, bp } = useLayout()
  const compactCard = bp === 'sm' || bp === 'md'
  const [tip, setTip] = useState<TipState | null>(null)
  const infoRef = useRef<HTMLButtonElement>(null)
  const current = Boolean(plan.isCurrent)
  const badge = current ? null : (plan.cap || plan.disc)
  const showInfo = !current && Boolean(plan.hint || plan.bullets?.length)

  const placeTip = () => {
    if (!infoRef.current) return
    const r = infoRef.current.getBoundingClientRect()
    const width = 235
    const center = r.left + r.width / 2
    const left = Math.min(Math.max(center - width / 2, 8), window.innerWidth - width - 8)
    const above = r.top > 110
    setTip({ left, top: above ? r.top - 2 : r.bottom + 2, above })
  }

  return (
    <div style={{
      position: 'relative',
      background: plan.bg,
      border: plan.border,
      borderRadius: 20,
      padding: compactCard ? '28px 10px 12px' : '16px 20px 20px',
      minHeight: compactCard ? 0 : 182,
      height: compactCard ? '100%' : undefined,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
    }}>
      {current && (
        <div style={{
          position: 'absolute', top: -12, right: -3,
          transform: 'rotate(4.14deg)',
          background: '#2c2d2e', color: 'white',
          fontFamily: "var(--fontfamilybase)",
          fontSize: 11, lineHeight: '14px',
          padding: '2px 8px 3px', borderRadius: 10,
          whiteSpace: 'nowrap', zIndex: 1,
        }}>
          Ваш тариф
        </div>
      )}
      {showInfo && (
        <button
          ref={infoRef}
          type="button"
          aria-label="Подробнее о тарифе"
          onMouseEnter={placeTip}
          onMouseLeave={() => setTip(null)}
          onFocus={placeTip}
          onBlur={() => setTip(null)}
          onClick={(e) => {
            e.stopPropagation()
            if (tip) setTip(null)
            else placeTip()
          }}
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 20, height: 20, padding: 0, border: 'none',
            background: 'transparent', cursor: 'pointer',
          }}
        >
          <img src={ICO.info} alt="" style={{ width: 20, height: 20, display: 'block' }} />
        </button>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingRight: showInfo ? 18 : 0, minWidth: 0, minHeight: plan.price ? 88 : undefined }}>
        <p style={{
          fontFamily: "var(--fontfamilyaccent)",
          fontSize: compactCard ? 13 : 15, lineHeight: '20px', color: '#2c2d2e',
          margin: 0,
        }}>
          {plan.cname || plan.name}
        </p>
        {plan.sub && (
          <p style={{
            fontFamily: "var(--fontfamilybase)",
            fontSize: compactCard ? 11 : 12, lineHeight: '16px',
            color: 'rgba(39,43,55,0.5)', margin: 0, whiteSpace: 'pre-line',
          }}>
            {plan.sub}
          </p>
        )}
      </div>

      {plan.price && (
        <div style={{ position: 'relative', marginTop: 'auto', paddingTop: 22, alignSelf: 'flex-start', maxWidth: '100%' }}>
          <button
            type="button"
            onClick={() => setBuyPlanId(plan.id)}
            style={{
              maxWidth: '100%', height: compactCard ? 32 : 36,
              background: current ? '#f0f1f3' : '#0077ff',
              color: current ? '#2c2d2e' : 'white',
              fontFamily: "var(--fontfamilyaccent)",
              fontSize: compactCard ? 12 : 15, lineHeight: '20px',
              borderRadius: 8, padding: compactCard ? '6px 8px' : '0 19px',
              border: 'none', cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {plan.price}
          </button>
          {badge && (
            <div style={{
              position: 'absolute', top: compactCard ? 12 : 10, right: compactCard ? -6 : -12,
              transform: 'rotate(5deg)',
              background: '#b8fc75', color: '#087c6d',
              fontFamily: "var(--fontfamilybase)",
              fontSize: 11, lineHeight: '14px',
              padding: '1px 8px 2px', borderRadius: 10,
              whiteSpace: 'nowrap', pointerEvents: 'none',
            }}>
              {badge}
            </div>
          )}
        </div>
      )}

      {tip && (plan.hint || plan.bullets) && createPortal(
        <div style={{
          position: 'fixed',
          left: tip.left, top: tip.top,
          transform: tip.above ? 'translateY(-100%)' : undefined,
          zIndex: 9999, width: 235,
          display: 'flex', flexDirection: tip.above ? 'column' : 'column-reverse', alignItems: 'center',
          pointerEvents: 'none',
          filter: 'drop-shadow(0 0 3px rgba(0,16,61,0.06)) drop-shadow(0 6px 6px rgba(0,16,61,0.06)) drop-shadow(0 6px 10px rgba(0,16,61,0.06)) drop-shadow(0 10px 18px rgba(0,16,61,0.08))',
        }}>
          <div style={{
            background: '#303030', color: 'white',
            borderRadius: 8, padding: '8.5px 12px 9.5px',
            width: '100%', boxSizing: 'border-box',
            fontFamily: "var(--fontfamilybase)", fontSize: 13, lineHeight: '18px',
            whiteSpace: 'pre-line',
          }}>
            {plan.hint ?? plan.bullets!.map(b => b.txt).join('\n')}
          </div>
          <img src={ICO.tipArrow} alt="" style={{ width: 80, height: 10, display: 'block', transform: tip.above ? 'rotate(180deg)' : undefined }} />
        </div>,
        document.body
      )}
    </div>
  )
}

function TableIntro() {
  const { bp } = useLayout()
  return (
    <div style={{ padding: bp === 'sm' ? '4px 8px 0 12px' : '15px 24px 32px 12px', minWidth: 0 }}>
      <p style={{
        fontFamily: "var(--fontfamilyaccent)",
        fontSize: bp === 'sm' ? 15 : 17, lineHeight: bp === 'sm' ? '20px' : '22px',
        color: '#2c2d2e', margin: '0 0 8px',
      }}>
        <>Больше возможностей с&#160;тарифами Mail&#160;Space</>
      </p>
      <p style={{
        fontFamily: "var(--fontfamilybase)",
        fontSize: 12, lineHeight: '16px',
        color: 'rgba(39,43,55,0.5)', margin: 0,
      }}>
        <>Подписка на единое пространство для ваших файлов из Облака и Почты. Выберите тариф от 512 ГБ до 4 ТБ</>
      </p>
    </div>
  )
}

// ── Page layout components ───────────────────────────────────────────────────

function PortalMenu() {
  const { bp, w, pagePad, hasSidebar } = useLayout()
  const S = { fontFamily: "var(--fontfamilybase)", fontSize: 13, color: '#2c2d2e', whiteSpace: 'nowrap' as const }
  const links =
    bp === 'xl' ? ['Облако', 'Однокласники', 'ВКонтакте', 'Новости', 'Знакомства', 'Игры'] :
    bp === 'lg' ? ['Облако', 'ВКонтакте', 'Новости'] :
    bp === 'md' && w >= 960 ? ['Облако', 'ВКонтакте'] :
    bp === 'md' ? ['Облако'] :
    ['Облако']
  const showAll = bp === 'xl' || bp === 'lg'
  const showEmail = w >= 960
  const padX = hasSidebar ? 20 : pagePad

  return (
    <div style={{
      height: 32, background: '#f6f7f8',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: `0 ${padX}px`, gap: 12, flexShrink: 0, minWidth: 0,
      position: 'relative', zIndex: 60,
    }}>
      <div style={{ display: 'flex', gap: bp === 'sm' ? 12 : 16, alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
        <span style={{ ...S, flexShrink: 0 }}>Mail</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          <span style={S}>Почта</span>
          <div style={{ position: 'relative', width: 16, height: 16, flexShrink: 0 }}>
            <div style={{ background: '#07f', borderRadius: 8, width: 16, height: 16, position: 'absolute' }} />
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "var(--fontfamilybase)", fontSize: 10, color: 'white', lineHeight: '16px' }}>2</span>
          </div>
        </div>
        {links.map(s => (
          <span key={s} style={{ ...S, flexShrink: 0 }}>{s}</span>
        ))}
        {showAll && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
            <span style={S}>Все проекты</span>
            <img src={PG.gridIcon} alt="" style={{ width: 16, height: 16 }} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
          <img src={PG.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        {showEmail && (
          <>
            <span style={S}>user@example.com</span>
            <img src={PG.dropdown} alt="" style={{ width: 16, height: 16 }} />
          </>
        )}
      </div>
    </div>
  )
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="#2c2d2e" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function ModeToggle() {
  const { paid, setPaid, bp, w } = useLayout()
  const compact = bp === 'sm' || w < 900
  const tiny = w < 380
  return (
    <div style={{
      background: 'white', borderRadius: 10, padding: tiny ? 2 : 3,
      display: 'flex', gap: 2, flexShrink: 0, maxWidth: '100%',
    }}>
      {([
        { v: false, l: tiny ? 'Без' : 'Без подписки' },
        { v: true,  l: tiny ? 'С' : 'С подпиской' },
      ] as const).map(o => (
        <button
          key={String(o.v)}
          type="button"
          onClick={() => setPaid(o.v)}
          style={{
            border: 'none', borderRadius: 8, padding: tiny ? '4px 6px' : compact ? '5px 8px' : '6px 10px',
            background: paid === o.v ? '#07f' : 'transparent',
            color: paid === o.v ? 'white' : '#2c2d2e',
            fontFamily: "var(--fontfamilyaccent)",
            fontSize: tiny ? 11 : compact ? 12 : 13, lineHeight: '16px', cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}

function HeadBar() {
  const { pagePad, hasSidebar, menuOpen, setMenuOpen, bp } = useLayout()
  return (
    <div style={{
      height: 56, background: '#f6f7f8',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      paddingLeft: hasSidebar ? 76 : pagePad,
      paddingRight: hasSidebar ? 20 : pagePad, gap: bp === 'sm' ? 6 : 8,
      flexShrink: 0, position: 'relative', zIndex: 60, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexShrink: 1 }}>
        {!hasSidebar && (
          <button
            aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: 32, height: 32, border: 'none', background: 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0, borderRadius: 8, marginLeft: -6, flexShrink: 0,
            }}
          >
            <MenuIcon />
          </button>
        )}
        <img src={PG.mailLogo} alt="Mail" style={{ height: 30, width: 93, flexShrink: 0 }} />
      </div>
      <ModeToggle />
    </div>
  )
}

function Sidebar() {
  const { w } = useLayout()
  const navItems = [
    { label: 'Главная',           active: false, arrow: false },
    { label: 'Личные данные',     active: false, arrow: false },
    { label: 'Моя подписка',      active: true,  arrow: false },
    { label: 'Контакты и адреса', active: false, arrow: false },
    { label: 'Безопасность',      active: false, arrow: false },
    { label: 'Помощь',            active: false, arrow: true  },
    { label: 'Все настройки',     active: false, arrow: true  },
  ]
  return (
    <div style={{ width: Math.min(SIDEBAR_W, Math.max(240, w - 48)), flexShrink: 0, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 24, position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 56, height: 56, borderRadius: 48, overflow: 'hidden' }}>
          <img src={PG.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{ fontFamily: "var(--fontfamilyaccent)", fontSize: 20, lineHeight: '24px', color: '#2c2d2e' }}>
            Пользователь
          </div>
          <div style={{ fontFamily: "var(--fontfamilybase)", fontSize: 15, lineHeight: '20px', color: '#87898f' }}>
            user@example.com
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {navItems.map(item => (
          <div key={item.label} style={{
            height: 36, display: 'flex', alignItems: 'center',
            padding: '0 16px 0 12px', borderRadius: item.active ? 8 : 0,
            background: item.active ? 'rgba(0,16,61,0.08)' : 'transparent',
            cursor: 'default',
          }}>
            <span style={{
              flex: 1, fontFamily: "var(--fontfamilyaccent)",
              fontSize: 15, lineHeight: '20px', color: '#2c2d2e',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{item.label}</span>
            {item.arrow && (
              <img src={PG.arrowRight} alt="" style={{ width: 20, height: 20, flexShrink: 0 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function StorageCard() {
  const { stackCards, paid, pagePad } = useLayout()
  return (
    <div style={{
      background: 'white', borderRadius: 20, padding: pagePad,
      width: stackCards ? '100%' : undefined,
      flex: stackCards ? undefined : '1.63 1 0',
      minWidth: 0, flexShrink: 1,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      gap: 32, boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minWidth: 0 }}>
          <span style={{ fontFamily: "var(--fontfamilyaccent)", fontSize: 17, lineHeight: '22px', color: '#2c2d2e', minWidth: 0 }}>
            {paid ? 'Занято 4.5 ГБ из 584 ГБ' : 'Занято 4.5 ГБ из 8 ГБ'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {([
              { bg: PG.storageAva, icon: null },
              { bg: PG.avatarSvg1, icon: PG.avatarUser },
              { bg: PG.avatarSvg2, icon: PG.avatarUser },
            ] as const).map((a, i) => (
              <div key={i} style={{
                width: 32, height: 32, flexShrink: 0, marginRight: -6,
                borderRadius: '50%',
                overflow: 'hidden', position: 'relative', zIndex: 3 - i,
                boxShadow: '0 0 0 2px white',
                background: '#f6f7f8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img src={a.bg} alt="" style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                }} />
                {a.icon && (
                  <img src={a.icon} alt="" style={{
                    position: 'relative', zIndex: 1, width: 16, height: 16, display: 'block',
                  }} />
                )}
              </div>
            ))}
            <div style={{ width: 32, height: 32, flexShrink: 0 }}>
              <img src={PG.counter} alt="" style={{ width: '100%', height: '100%' }} />
            </div>
          </div>
        </div>

        <div>
          <div style={{ height: 8, background: 'rgba(0,16,61,0.06)', borderRadius: 4, position: 'relative', margin: '12px 0' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: paid ? '9.87%' : '56.25%', background: '#b8fc75', borderRadius: 4, border: '2px solid white', boxSizing: 'border-box' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: paid ? '5.24%' : '16.25%', background: '#07f', borderRadius: 4, border: '2px solid white', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {[{ color: '#07f', label: 'Почта 1.3 ГБ' }, { color: '#b8fc75', label: 'Облако 3.3 ГБ' }].map(l => (
              <div key={l.label} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: 20, background: l.color, flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--fontfamilybase)", fontSize: 12, lineHeight: '16px', color: '#2c2d2e' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
        <button style={{
          background: paid ? '#f0f1f3' : '#07f', color: paid ? '#2c2d2e' : 'white',
          fontFamily: "var(--fontfamilyaccent)",
          fontSize: 14, lineHeight: '20px', height: 32,
          borderRadius: 8, padding: '6px 12px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
        }}>Увеличить место</button>
        <button style={{
          background: 'transparent', color: '#0070f0',
          fontFamily: "var(--fontfamilyaccent)",
          fontSize: 14, lineHeight: '20px', height: 32,
          borderRadius: 8, padding: '6px 8px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
        }}>Очистить место</button>
      </div>
    </div>
  )
}

function ActionsCard() {
  const { stackCards, paid } = useLayout()
  const actions = [
    { icon: PG.promoIcon, label: 'Активация промокода' },
    { icon: PG.histIcon,  label: 'История платежей', sub: paid ? 'Следующий платёж 18 мая 2026' : undefined },
    { icon: PG.histIcon,  label: 'Банковская карта', sub: paid ? '•••• 0637' : undefined },
  ]
  const [hovered, setHovered] = useState<string | null>(null)
  return (
    <div style={{
      background: 'white', borderRadius: 20, padding: 8,
      width: stackCards ? '100%' : undefined,
      flex: stackCards ? undefined : '1 1 0',
      minWidth: stackCards ? 0 : 260,
      flexShrink: 1, boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {actions.map(a => (
        <div key={a.label}
          onMouseEnter={() => setHovered(a.label)}
          onMouseLeave={() => setHovered(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: 8, borderRadius: 12, cursor: 'pointer',
            minHeight: 56, boxSizing: 'border-box',
            background: hovered === a.label ? '#f6f7f8' : 'transparent',
            transition: 'background 120ms ease-out',
          }}>
          <div style={{ background: '#f6f7f8', borderRadius: 20, padding: 8, flexShrink: 0 }}>
            <img src={a.icon} alt="" style={{ width: 20, height: 20, display: 'block' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontFamily: "var(--fontfamilyaccent)", fontSize: 17, lineHeight: '22px', color: '#2c2d2e' }}>
              {a.label}
            </span>
            {a.sub && (
              <span style={{ fontFamily: "var(--fontfamilybase)", fontSize: 15, lineHeight: '20px', color: '#aaadb3' }}>
                {a.sub}
              </span>
            )}
          </div>
          <img src={PG.chevron} alt="" style={{ width: 20, height: 20, flexShrink: 0 }} />
        </div>
      ))}
    </div>
  )
}

const COMPARE_MAX = 2
const COMPARE_IDS = ['free', 'main', 'work', 'family', 'minimal'] as const

const COMPARE_SUB: Record<string, string> = {
  free: '8 ГБ в Почте и Облаке',
  minimal: 'Только место',
  main: 'ГБ и всё самое основное',
  work: 'Для бизнеса и команд',
  family: 'Для четверых',
}

function compareIcon(val: V, planId: string) {
  if (val === false) return ICO.cross
  return COL_CHK[PLANS.findIndex(p => p.id === planId)]
}

function planValue(feat: Feat, id: string) {
  return feat.v[PLANS.findIndex(p => p.id === id)]
}

function CompareFeatName({ feat, narrow, active }: { feat: Feat; narrow: boolean; active: boolean }) {
  const { paid } = useLayout()
  const [tip, setTip] = useState<TipState | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const canHover = typeof window === 'undefined' || window.matchMedia('(hover: hover)').matches
  const showInfo = !canHover || active || Boolean(tip)

  const placeTip = () => {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const width = 235
    const center = r.left + r.width / 2
    const left = Math.min(Math.max(center - width / 2, 8), window.innerWidth - width - 8)
    const above = r.top > 110
    setTip({ left, top: above ? r.top - 2 : r.bottom + 2, above })
  }
  const clearTip = () => setTip(null)

  return (
    <div style={{ minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 8, paddingLeft: narrow ? 0 : 12 }}>
      {feat.isNew && <NewBadge />}
      <span style={{ fontFamily: "var(--fontfamilybase)", fontSize: 15, lineHeight: '20px', color: '#2c2d2e', minWidth: 0 }}>
        {feat.label}
      </span>
      <button
        ref={btnRef}
        type="button"
        aria-label="Подробнее"
        onMouseEnter={placeTip}
        onMouseLeave={clearTip}
        onFocus={placeTip}
        onBlur={clearTip}
        onClick={(e) => {
          e.stopPropagation()
          if (canHover) return
          if (tip) clearTip()
          else placeTip()
        }}
        style={{
          opacity: showInfo ? 1 : 0,
          width: 16, height: 16, marginLeft: 'auto', padding: 0, flexShrink: 0,
          border: 'none', background: 'transparent', cursor: 'pointer',
          pointerEvents: showInfo ? 'auto' : 'none',
        }}
      >
        <img src={ICO.info} alt="" style={{ width: 16, height: 16, display: 'block' }} />
      </button>
      {tip && createPortal(
        <div style={{
          position: 'fixed',
          left: tip.left, top: tip.top,
          transform: tip.above ? 'translateY(-100%)' : undefined,
          zIndex: 400, width: 235,
          display: 'flex', flexDirection: tip.above ? 'column' : 'column-reverse', alignItems: 'center',
          pointerEvents: 'none',
          filter: 'drop-shadow(0 0 3px rgba(0,16,61,0.06)) drop-shadow(0 6px 6px rgba(0,16,61,0.06)) drop-shadow(0 6px 10px rgba(0,16,61,0.06)) drop-shadow(0 10px 18px rgba(0,16,61,0.08))',
        }}>
          <div style={{
            background: '#303030', color: 'white',
            borderRadius: 8, padding: '8.5px 12px 9.5px',
            width: '100%', boxSizing: 'border-box',
            fontFamily: "var(--fontfamilybase)", fontSize: 13, lineHeight: '18px',
          }}>
            {paid && feat.tipPaid ? feat.tipPaid : feat.tip}
          </div>
          <img src={ICO.tipArrow} alt="" style={{ width: 80, height: 10, display: 'block', transform: tip.above ? 'rotate(180deg)' : undefined }} />
        </div>,
        document.body,
      )}
    </div>
  )
}

function CompareTariffsModal({ onClose }: { onClose: () => void }) {
  const { bp, setBuyPlanId } = useLayout()
  const [cols, setCols] = useState<string[]>(['free', 'main'])
  const [menu, setMenu] = useState<number | null>(null)
  const [menuBox, setMenuBox] = useState<{ top: number; left: number; width: number } | null>(null)
  const [onlyDiff, setOnlyDiff] = useState(false)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const narrow = bp === 'sm'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const canAdd = cols.length < COMPARE_MAX
  const closeMenu = () => setMenu(null)
  const addNext = () => {
    setCols(prev => {
      if (prev.length >= COMPARE_MAX) return prev
      const next = COMPARE_IDS.find(id => !prev.includes(id))
      return next ? [...prev, next] : prev
    })
    closeMenu()
  }
  const choose = (index: number, id: string) => {
    setCols(prev => prev.map((c, i) => i === index ? id : c))
    closeMenu()
  }
  const removeCol = (index: number) => {
    setCols(prev => prev.filter((_, i) => i !== index))
    closeMenu()
  }
  const openMenu = (index: number, anchor: HTMLButtonElement) => {
    if (menu === index) { closeMenu(); return }
    const r = anchor.getBoundingClientRect()
    const width = Math.min(Math.max(r.width, 220), window.innerWidth - 16)
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8))
    setMenuBox({ top: r.bottom + 4, left, width })
    setMenu(index)
  }
  const buy = (id: string) => {
    onClose()
    setBuyPlanId(id)
  }

  const slot = narrow ? 156 : 205
  const columns = `minmax(120px, 1fr) repeat(${cols.length}, ${slot}px)${canAdd ? ` ${slot}px` : ''}`
  const rowVisible = (feat: Feat) => {
    const present = cols.map(id => planValue(feat, id) !== false)
    if (!present.some(Boolean)) return false
    if (!onlyDiff || cols.length < 2) return true
    return present.some(has => has !== present[0])
  }
  const visible = DATA.map(sect => ({ ...sect, rows: sect.rows.filter(rowVisible) })).filter(sect => sect.rows.length > 0)

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 180,
        background: 'rgba(0, 16, 61, 0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: narrow ? 12 : 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: narrow ? '100%' : 840,
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 24px)',
          background: 'white',
          borderRadius: 12,
          boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 10px 36px rgba(0,16,61,0.08), 0 6px 20px rgba(0,16,61,0.06), 0 6px 12px rgba(0,16,61,0.06), 0 0 6px rgba(0,16,61,0.06)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 2,
            width: 40, height: 40, border: 'none', background: 'transparent',
            borderRadius: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}
        >
          <img src={BUY.close} alt="" style={{ width: 16, height: 16 }} />
        </button>

        <div onClick={closeMenu} onScroll={closeMenu} style={{ overflow: 'auto', flex: 1, minHeight: 0, padding: narrow ? '28px 16px 24px' : '32px 32px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, paddingRight: 36 }}>
            <div style={{ fontFamily: "var(--fontfamilyaccent)", fontSize: narrow ? 20 : 24, lineHeight: '28px', color: '#2c2d2e' }}>
              Сравнить тарифы
            </div>
            <div style={{ fontFamily: "var(--fontfamilybase)", fontSize: 15, lineHeight: '20px', color: '#2c2d2e' }}>
              Здесь можно сравнить тарифы и выбрать подходящий
            </div>
            <button
              type="button"
              role="checkbox"
              aria-checked={onlyDiff}
              onClick={() => setOnlyDiff(v => !v)}
              style={{
                alignSelf: 'flex-start', marginTop: 4,
                display: 'inline-flex', alignItems: 'center', gap: 10,
                border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
              }}
            >
              <span style={{
                width: 20, height: 20, borderRadius: 6, boxSizing: 'border-box', flexShrink: 0,
                border: onlyDiff ? 'none' : '1.5px solid rgba(0,16,61,0.24)',
                background: onlyDiff ? '#0077ff' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {onlyDiff && (
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true">
                    <path d="M1 5.2 4.2 8.4 11 1.4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span style={{ fontFamily: "var(--fontfamilybase)", fontSize: 15, lineHeight: '20px', color: '#2c2d2e' }}>
                Показать только отличия тарифов
              </span>
            </button>
          </div>

          <div style={narrow
            ? { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }
            : { display: 'grid', gridTemplateColumns: columns, columnGap: 8, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 12 }}>
              {visible.some(sect => sect.id === 'cloud') && (
                <>
                  <img src={ICO.logoCloud} alt="" style={{ width: 26, height: 26 }} />
                  <span style={{ fontFamily: "var(--fontfamilyaccent)", fontSize: 20, lineHeight: '26px', color: '#2c2d2e' }}>Облако</span>
                </>
              )}
            </div>
                  {cols.map((id, i) => {
                    const plan = PLANS.find(p => p.id === id)!
                    return (
                      <div key={id} style={{ position: 'relative', width: narrow ? '100%' : undefined }}>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); openMenu(i, e.currentTarget) }}
                          style={{
                            width: '100%', height: 46, boxSizing: 'border-box',
                            border: '1px solid #dadce0', borderRadius: 14, background: 'white',
                            padding: 6, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                          }}
                        >
                          <div style={{ width: 35, height: 35, borderRadius: 12, background: '#f0f1f3', overflow: 'hidden', flexShrink: 0 }}>
                            <img src={PG.serviceIcos} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                            <span style={{ display: 'block', fontFamily: "var(--fontfamilyaccent)", fontSize: 15, lineHeight: '20px', color: '#2c2d2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.name}</span>
                            <span style={{ display: 'block', fontFamily: "var(--fontfamilybase)", fontSize: 11, lineHeight: '14px', color: '#2c2d2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{COMPARE_SUB[id]}</span>
                          </span>
                          <span style={{ width: 20, height: 20, borderRadius: 20, background: '#f3f3f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <img src={PG.dropdown} alt="" style={{ width: 16, height: 16 }} />
                          </span>
                        </button>
                        {cols.length > 1 && (
                          <button
                            type="button"
                            aria-label="Убрать тариф"
                            onClick={e => { e.stopPropagation(); removeCol(i) }}
                            style={{
                              position: 'absolute', top: -8, right: 4, width: 18, height: 18,
                              border: 'none', borderRadius: 9, background: '#2c2d2e', color: 'white',
                              cursor: 'pointer', fontSize: 12, lineHeight: '18px', padding: 0,
                            }}
                          >×</button>
                        )}
                      </div>
                    )
                  })}
            {canAdd && (
              <button
                type="button"
                onClick={addNext}
                style={{
                  height: 46, width: '100%', boxSizing: 'border-box',
                  border: '1px dashed #07f', borderRadius: 14, background: 'rgba(0,119,255,0.05)',
                  color: '#0070f0', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 12px',
                  fontFamily: "var(--fontfamilyaccent)", fontSize: 13, lineHeight: '16px', textAlign: 'center',
                }}
              >
                <img src={PG.cards} alt="" style={{ width: 20, height: 20, flexShrink: 0 }} />
                Добавить тариф к сравнению
              </button>
            )}
          </div>

          {visible.length === 0 && (
            <div style={{ padding: '8px 12px 20px', fontFamily: "var(--fontfamilybase)", fontSize: 15, lineHeight: '20px', color: '#2c2d2e' }}>
              У выбранных тарифов нет отличий
            </div>
          )}

          {visible.map(sect => (
            <div key={sect.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 20 }}>
              {sect.id !== 'cloud' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0 8px 12px' }}>
                  <img src={sect.logo} alt="" style={{ width: 26, height: 26 }} />
                  <span style={{ fontFamily: "var(--fontfamilyaccent)", fontSize: 20, lineHeight: '26px', color: '#2c2d2e' }}>{sect.title}</span>
                </div>
              )}

              {sect.rows.map((feat, ri) => (
                <div
                  key={feat.id}
                  onMouseEnter={() => setHoverId(feat.id)}
                  onMouseLeave={() => setHoverId(null)}
                  style={narrow ? {
                    display: 'flex', flexDirection: 'column', gap: 6,
                    padding: '8px 12px', borderRadius: 8,
                    background: ri % 2 === 0 ? 'rgba(0,16,61,0.06)' : 'transparent',
                  } : {
                    display: 'grid', gridTemplateColumns: columns, columnGap: 8, alignItems: 'center',
                    minHeight: 28, padding: '4px 0', borderRadius: 8,
                    background: ri % 2 === 0 ? 'rgba(0,16,61,0.06)' : 'transparent',
                  }}
                >
                  <CompareFeatName feat={feat} narrow={narrow} active={hoverId === feat.id} />
                  {narrow ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {cols.map(id => (
                        <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontFamily: "var(--fontfamilybase)", fontSize: 13, lineHeight: '18px', color: '#87898f' }}>{PLANS.find(p => p.id === id)!.name}</span>
                          <img src={compareIcon(planValue(feat, id), id)} alt="" style={{ width: 20, height: 20 }} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {cols.map(id => (
                        <div key={id} style={{ display: 'flex', justifyContent: 'center' }}>
                          <img src={compareIcon(planValue(feat, id), id)} alt="" style={{ width: 20, height: 20 }} />
                        </div>
                      ))}
                      {canAdd && <div />}
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}

        </div>

        <div style={narrow ? {
          flexShrink: 0, display: 'flex', gap: 8,
          padding: '16px 16px 24px',
          background: 'white',
          boxShadow: '0 -2px 8px rgba(0,16,61,0.06)',
        } : {
          flexShrink: 0,
          display: 'grid', gridTemplateColumns: columns, columnGap: 8, alignItems: 'center',
          padding: '16px 32px 32px',
          background: 'white',
          boxShadow: '0 -2px 8px rgba(0,16,61,0.06)',
        }}>
          {!narrow && <div />}
          {cols.map((id, i) => {
            const plan = PLANS.find(p => p.id === id)!
            const primary = i === cols.length - 1 && Boolean(plan.price)
            return (
              <div key={id} style={{ position: 'relative', paddingTop: 10, flex: narrow ? 1 : undefined, minWidth: 0 }}>
                <button
                  type="button"
                  onClick={() => plan.price && buy(id)}
                  style={{
                    height: 36, width: '100%', padding: '0 12px',
                    border: 'none', borderRadius: 8, cursor: plan.price ? 'pointer' : 'default',
                    background: primary ? '#0077ff' : 'rgba(0,16,61,0.06)',
                    color: primary ? 'white' : '#2c2d2e',
                    fontFamily: "var(--fontfamilyaccent)", fontSize: narrow ? 13 : 15, lineHeight: '20px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {plan.price ? `Выбрать ${plan.price}` : 'Ваш тариф'}
                </button>
                {plan.disc && (
                  <div style={{
                    position: 'absolute', top: 0, right: -4, transform: 'rotate(5deg)',
                    background: '#b8fc75', color: '#087c6d',
                    fontFamily: "var(--fontfamilybase)", fontSize: 11, lineHeight: '14px',
                    padding: '1px 8px 2px', borderRadius: 10, whiteSpace: 'nowrap', pointerEvents: 'none',
                  }}>{plan.disc}</div>
                )}
              </div>
            )
          })}
          {!narrow && canAdd && <div />}
        </div>
        {menu !== null && menuBox && (
          <div
            style={{
              position: 'fixed', top: menuBox.top, left: menuBox.left, width: menuBox.width,
              zIndex: 30, maxHeight: 320, overflow: 'auto',
              background: 'white', borderRadius: 12, padding: 4,
              boxShadow: '0 8px 24px rgba(0,16,61,0.16)',
            }}
          >
            {COMPARE_IDS.filter(id => id === cols[menu] || !cols.includes(id)).map(id => {
              const plan = PLANS.find(p => p.id === id)!
              const selected = id === cols[menu]
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => choose(menu, id)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    border: 'none', background: selected ? 'rgba(0,119,255,0.08)' : 'transparent',
                    borderRadius: 8, padding: '8px 10px', cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'block', fontFamily: "var(--fontfamilyaccent)", fontSize: 15, lineHeight: '20px', color: '#2c2d2e' }}>{plan.name}</span>
                  <span style={{ display: 'block', fontFamily: "var(--fontfamilybase)", fontSize: 13, lineHeight: '18px', color: '#87898f' }}>{COMPARE_SUB[id]}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

function ActiveTariffsCard() {
  const { bp, paid, contentW } = useLayout()
  const [compareOpen, setCompareOpen] = useState(false)
  const fullTile = bp === 'sm' || contentW < 640
  const tile = fullTile
    ? { width: '100%' as const, flexShrink: 0 as const, height: 'auto' as const }
    : { width: 290, flexShrink: 0 as const, height: 92 }
  const scrollToCompare = () => {
    document.getElementById('compare-tariffs')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return (
    <div style={{
      background: 'white', borderRadius: 20,
      padding: bp === 'sm' ? '20px 16px 24px' : '24px 24px 32px',
      display: 'flex', flexDirection: 'column', gap: 16, width: '100%', boxSizing: 'border-box',
      overflow: paid && !fullTile ? 'clip' : 'visible',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: "var(--fontfamilyaccent)", fontSize: 17, lineHeight: '22px', color: '#2c2d2e', flex: '1 1 240px', minWidth: 0 }}>
          {paid ? 'У вас 3 активных тарифа и всего 584 ГБ' : 'У вас 1 активный тариф, 8 ГБ'}
        </span>
        <button
            type="button"
            onClick={paid ? scrollToCompare : () => setCompareOpen(true)}
            style={{
              height: 36, flexShrink: 0, border: 'none', cursor: 'pointer',
              background: 'rgba(0,16,61,0.06)', color: '#2c2d2e',
              borderRadius: 8, padding: '6px 12px', boxSizing: 'border-box',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2,
              fontFamily: "var(--fontfamilyaccent)", fontWeight: 500, fontSize: 14, lineHeight: '20px',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ padding: '0 4px' }}>Сравнить все тарифы</span>
            <img src={PG.cards} alt="" style={{ width: 24, height: 24, display: 'block' }} />
          </button>
        {compareOpen && <CompareTariffsModal onClose={() => setCompareOpen(false)} />}
      </div>
      <div
        className={paid && !fullTile ? 'compare-scroller' : undefined}
        style={{
          display: 'flex', flexWrap: fullTile || !paid ? 'wrap' : 'nowrap', gap: 12, width: '100%', minWidth: 0,
          ...(paid && !fullTile ? {
            overflowX: 'auto' as const,
            margin: '0 -24px', padding: '0 24px', width: 'auto',
            scrollPaddingInline: 24,
          } : null),
        }}
      >
        {/* Free plan */}
        <div style={{ boxShadow: 'inset 0 0 0 1px rgba(0,16,61,0.08)', borderRadius: 16, ...tile, minHeight: 92, display: 'flex', alignItems: 'flex-start', overflow: 'hidden', boxSizing: 'border-box', position: 'relative' }}>
          <div style={{
            position: 'absolute', top: 0, right: 0, zIndex: 1,
            background: '#f0f1f3', borderRadius: '0 16px 0 16px',
            height: 21, padding: '3px 12px 4px', boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          }}>
            <span style={{ fontFamily: "var(--fontfamilybase)", fontSize: 11, lineHeight: '14px', color: '#2c2d2e' }}>Бесплатный</span>
          </div>
          <div style={{ padding: 16, display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: 100, overflow: 'hidden', background: '#07f' }}>
              <img src={PG.serviceIcos} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
          <div style={{ flex: 1, padding: '16px 16px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={{ fontFamily: "var(--fontfamilyaccent)", fontSize: 15, lineHeight: '20px', color: '#2c2d2e' }}>8 ГБ</div>
              <div style={{ fontFamily: "var(--fontfamilybase)", fontSize: 12, lineHeight: '16px', color: 'rgba(39,43,55,0.5)' }}>И другие функции в Почте и Облаке</div>
            </div>
            <div style={{ fontFamily: "var(--fontfamilybase)", fontSize: 12, lineHeight: '16px', color: '#0070f0', cursor: 'default' }}>
              Что входит в тариф
            </div>
          </div>
        </div>

        {paid && ([
          { id: '512', title: '512\u00a0ГБ\u00a0на\u00a0месяц', sub: 'Следующий платёж 20\u00a0апреля 2026', badgeBg: 'rgba(0,119,255,0.14)' },
          { id: '64a', title: '64\u00a0ГБ\u00a0на\u00a0месяц', sub: 'Следующий платёж 18\u00a0мая 2026', badgeBg: 'rgba(0,119,255,0.1)' },
          { id: '64b', title: '64\u00a0ГБ\u00a0на\u00a0месяц', sub: 'Следующий платёж 18\u00a0мая 2026', badgeBg: 'rgba(0,119,255,0.1)' },
        ] as const).map(t => (
          <div key={t.id} style={{ background: 'rgba(0,119,255,0.06)', borderRadius: 16, ...tile, minHeight: 92, display: 'flex', alignItems: 'flex-start', overflow: 'hidden', boxSizing: 'border-box', position: 'relative' }}>
            <div style={{
              position: 'absolute', top: 0, right: 0, zIndex: 1,
              background: t.badgeBg, borderRadius: '0 16px 0 16px',
              height: 21, padding: '3px 12px 4px', boxSizing: 'border-box',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            }}>
              <span style={{ fontFamily: "var(--fontfamilybase)", fontSize: 11, lineHeight: '14px', color: '#1c4479' }}>Минимальный</span>
            </div>
            <div style={{ padding: 16, display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: 100, overflow: 'hidden', background: '#07f' }}>
                <img src={PG.serviceIcos} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
            <div style={{ flex: 1, padding: '16px 16px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <div style={{ fontFamily: "var(--fontfamilyaccent)", fontSize: 15, lineHeight: '20px', color: '#2c2d2e' }}>{t.title}</div>
                <div style={{ fontFamily: "var(--fontfamilybase)", fontSize: 12, lineHeight: '16px', color: 'rgba(39,43,55,0.5)' }}>{t.sub}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'default' }}>
                <img src={PG.flash16} alt="" style={{ width: 16, height: 16, display: 'block' }} />
                <span style={{ fontFamily: "var(--fontfamilybase)", fontSize: 12, lineHeight: '16px', color: '#0070f0' }}>Улучшить</span>
              </div>
            </div>
          </div>
        ))}

        {/* Mail Space free promo card */}
        {!paid && (
        <div style={{ background: 'rgba(0,119,255,0.06)', borderRadius: 16, ...tile, minHeight: 92, display: 'flex', alignItems: 'flex-start', overflow: 'visible', boxSizing: 'border-box', position: 'relative' }}>
          <div style={{ width: 108, height: 92, position: 'relative', flexShrink: 0, overflow: 'visible' }}>
            <div style={{
              position: 'absolute', left: 0.29, top: -11.79, width: 93.442, height: 92.454,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ transform: 'scaleY(-1) rotate(-176.49deg)', flexShrink: 0 }}>
                <div style={{ width: 88.269, height: 87.214, position: 'relative' }}>
                  <img src={PG.blobVector} alt="" style={{
                    position: 'absolute',
                    top: '-6.88%', right: '-6.81%', bottom: '-6.51%', left: '-6.8%',
                    width: 'auto', height: 'auto', maxWidth: 'none', display: 'block',
                  }} />
                </div>
              </div>
            </div>
            <div style={{
              position: 'absolute', left: 3.73, top: 36.95, width: 31.964, height: 31.952,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ transform: 'rotate(-47deg)', flexShrink: 0 }}>
                <img src={PG.img9} alt="" style={{ width: 22.493, height: 22.73, borderRadius: 5, objectFit: 'cover', display: 'block' }} />
              </div>
            </div>
            <div style={{
              position: 'absolute', left: 10.49, top: 27.19, width: 34.843, height: 35.09,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ transform: 'rotate(-10.97deg)', flexShrink: 0 }}>
                <img src={PG.img8} alt="" style={{ width: 29.677, height: 29.989, borderRadius: 6, objectFit: 'cover', display: 'block' }} />
              </div>
            </div>
            <img src={PG.img11} alt="" style={{
              position: 'absolute', left: 21.62, top: -6, width: 76.216, height: 79,
              objectFit: 'contain', display: 'block',
            }} />
            <div style={{
              position: 'absolute', bottom: 55.95, left: 'calc(50% + 16.24px)',
              transform: 'translateX(-50%)',
              width: 28.478, height: 24.053,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ transform: 'rotate(16.03deg)', flexShrink: 0 }}>
                <div style={{
                  background: '#a641f6',
                  border: '0.884px solid rgba(255,255,255,0.6)',
                  borderRadius: 5.808,
                  width: 24.459, height: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '2.568px 5.224px 2.282px',
                  boxSizing: 'border-box',
                }}>
                  <span style={{
                    fontFamily: "'VK Sans Text:Medium', 'VK Sans Text', var(--fontfamilyaccent)",
                    fontSize: 10.791, color: 'white', lineHeight: 'normal', whiteSpace: 'nowrap',
                  }}>ТБ</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ flex: 1, padding: '16px 16px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={{ fontFamily: "var(--fontfamilyaccent)", fontSize: 15, lineHeight: '20px', color: '#2c2d2e' }}>Mail Space бесплатно</div>
              <div style={{ fontFamily: "var(--fontfamilybase)", fontSize: 12, lineHeight: '16px', color: 'rgba(39,43,55,0.5)' }}>Больше места и функций</div>
            </div>
            <div style={{ fontFamily: "var(--fontfamilybase)", fontSize: 12, lineHeight: '16px', color: '#0070f0', cursor: 'default' }}>
              Забрать 1 ТБ на месяц
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

function ConnectTbButton() {
  return (
    <div style={{ position: 'relative', width: 'fit-content', paddingTop: 10 }}>
      <button style={{
        background: '#07f', color: 'white',
        fontFamily: "var(--fontfamilyaccent)",
        fontSize: 14, lineHeight: '20px', height: 32,
        borderRadius: 8, padding: '6px 12px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
      }}>Подключить 1 ТБ</button>
      <div style={{
        position: 'absolute', top: 0, right: -4, transform: 'rotate(5deg)',
        background: '#b8fc75', color: '#087c6d',
        fontFamily: "var(--fontfamilybase)",
        fontSize: 9, lineHeight: '12px',
        padding: '1px 8px 2px', borderRadius: 10, whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}>Месяц бесплатно</div>
    </div>
  )
}

function IncludedFeaturesCard() {
  const { bp, paid, contentW } = useLayout()
  const twoCol = contentW >= 640
  const features = [
    { icon: PG.cloudIco,   title: paid ? '584\u00a0ГБ' : '8\u00a0ГБ', desc: 'Для\u00a0файлов из\u00a0Облака, писем и\u00a0вложений из\u00a0Почты' },
    { icon: PG.uploadIco,  title: 'Загрузка файлов до\u00a02\u00a0ГБ', desc: 'Сохраняйте документы, билеты, фотографии\u00a0— открыть их\u00a0можно с\u00a0любого устройства' },
    { icon: PG.attachIco,  title: 'Отправка вложений до\u00a0200\u00a0МБ', desc: 'Отправляйте в\u00a0Почте фото, видео, книги, презентации' },
    { icon: PG.docTextIco, title: 'Редактирование документов', desc: 'Редактируйте сами, с\u00a0коллегами или\u00a0близкими. Например, ведите общий бюджет в\u00a0таблице' },
    { icon: PG.phoneIco,   title: 'Автозагрузка файлов', desc: 'Фото и\u00a0видео с\u00a0телефона сами загрузятся в\u00a0Облако\u00a0— будет резервная копия, если\u00a0с\u00a0телефоном вдруг что\u2011то случится' },
    { icon: PG.shieldIco,  title: 'Проверка вложений антивирусом', desc: 'Письма и\u00a0файлы в\u00a0Почте и\u00a0Облаке проверяются антивирусом Dr.Web' },
  ]
  return (
    <div style={{
      background: 'white', borderRadius: 20,
      padding: bp === 'sm' ? '20px 16px 24px' : '24px 24px 32px',
      display: 'flex', flexDirection: 'column', gap: 16,
      width: '100%', boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: "var(--fontfamilyaccent)", fontSize: 17, lineHeight: '22px', color: '#2c2d2e' }}>
          {paid ? 'В ваши тарифы входит' : 'Входит в ваш тариф'}
        </span>
        {!paid && <ConnectTbButton />}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: twoCol ? '1fr 1fr' : '1fr',
        width: '100%',
      }}>
        {features.map(f => (
          <div key={f.title} style={{
            display: 'flex', alignItems: 'flex-start', minWidth: 0, paddingRight: 8,
          }}>
            <div style={{ padding: '4px 8px 0 0', flexShrink: 0 }}>
              <div style={{ padding: 8 }}>
                <img src={f.icon} alt="" style={{ width: 20, height: 20, display: 'block' }} />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0, padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{
                fontFamily: "var(--fontfamilyaccent)", fontSize: 15, lineHeight: '20px', color: '#2c2d2e',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {f.title}
              </div>
              <div style={{
                fontFamily: "var(--fontfamilybase)", fontSize: 13, lineHeight: '18px', color: 'rgba(39,43,55,0.5)',
              }}>
                {f.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ComparisonTable() {
  const { plans } = usePlans()
  const { tablePad, bp } = useLayout()
  const { grid, carousel, label, step } = useTableGrid()
  const [cloudOpen, setCloudOpen] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const firstRowRef = useRef<HTMLDivElement>(null)
  const [demoId, setDemoId] = useState<string | null>(null)
  const [edge, setEdge] = useState({ prev: false, next: false })
  const [viewW, setViewW] = useState(0)
  const onboardFeatId = DATA[0].rows[0].id

  useEffect(() => {
    let timer = 0
    let done = false
    const rowInView = () => {
      const current = firstRowRef.current
      if (!current) return false
      const r = current.getBoundingClientRect()
      const vh = window.innerHeight
      return r.height > 0 && r.top > 48 && r.bottom < vh - 16
    }
    const check = () => {
      if (done) return
      window.clearTimeout(timer)
      if (!rowInView()) return
      timer = window.setTimeout(() => {
        if (done || !rowInView()) return
        done = true
        stop()
        setDemoId(onboardFeatId)
      }, 350)
    }
    const vv = window.visualViewport
    const stop = () => {
      document.removeEventListener('scroll', check, true)
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
      vv?.removeEventListener('resize', check)
    }
    check()
    document.addEventListener('scroll', check, { capture: true, passive: true })
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    vv?.addEventListener('resize', check)
    return () => {
      window.clearTimeout(timer)
      stop()
    }
  }, [onboardFeatId])

  useEffect(() => {
    const el = scroller.current
    const head = headRef.current
    if (!carousel || !el) return
    const read = () => {
      const max = Math.max(0, el.scrollWidth - el.clientWidth)
      const next = { prev: el.scrollLeft > 8, next: el.scrollLeft < max - 8 }
      setEdge(prev => (prev.prev === next.prev && prev.next === next.next ? prev : next))
      setViewW(prev => (prev === el.clientWidth ? prev : el.clientWidth))
    }
    const onBody = () => {
      if (head && head.scrollLeft !== el.scrollLeft) head.scrollLeft = el.scrollLeft
      read()
    }
    const onHead = () => {
      if (head && el.scrollLeft !== head.scrollLeft) el.scrollLeft = head.scrollLeft
    }
    read()
    el.addEventListener('scroll', onBody, { passive: true })
    head?.addEventListener('scroll', onHead, { passive: true })
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', onBody)
      head?.removeEventListener('scroll', onHead)
      ro.disconnect()
    }
  }, [carousel, plans.length, cloudOpen])

  const nudge = (dir: 1 | -1) => {
    const el = scroller.current
    if (!el) return
    const max = Math.max(0, el.scrollWidth - el.clientWidth)
    let dest = dir > 0 ? Math.min(max, el.scrollLeft + step) : Math.max(0, el.scrollLeft - step)
    if (dir > 0 && max - dest < step * 0.4) dest = max
    if (dir < 0 && dest < step * 0.4) dest = 0
    el.scrollTo({ left: dest, behavior: 'smooth' })
  }

  return (
    <div id="compare-tariffs" style={{ minWidth: 0, position: 'relative', background: 'white', borderRadius: 24 }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'white',
        borderRadius: '24px 24px 0 0',
      }}>
      <div
        ref={headRef}
        className={carousel ? 'compare-scroller' : undefined}
        style={{ overflowX: carousel ? 'auto' : 'visible', minWidth: 0, borderRadius: '24px 24px 0 0' }}
      >
        <div style={{
          padding: `${bp === 'sm' ? 16 : 24}px ${tablePad}px 16px`,
        }}>
          <div style={{ ...grid, alignItems: bp === 'sm' || bp === 'md' ? 'stretch' : 'start' }}>
            <div data-intro="" style={carousel ? {
              position: 'sticky', left: 0, zIndex: 4, background: '#fff', alignSelf: 'stretch',
              boxSizing: 'border-box', width: label + tablePad, marginLeft: -tablePad, paddingLeft: tablePad,
              boxShadow: '8px 0 0 #fff',
              marginTop: bp === 'sm' ? -16 : -24, marginBottom: -16,
              paddingTop: bp === 'sm' ? 16 : 24, paddingBottom: 16,
            } : undefined}>
              <TableIntro />
            </div>
            {plans.map(plan => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      </div>
      {carousel && (edge.next || edge.prev) && (
        <button
          type="button"
          aria-label={edge.next ? 'Следующие тарифы' : 'Предыдущие тарифы'}
          onClick={() => nudge(edge.next ? 1 : -1)}
          style={{
            position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
            width: 40, height: 40, borderRadius: 20, border: 'none', cursor: 'pointer',
            background: 'white', zIndex: 30,
            boxShadow: '0 4px 16px rgba(0,16,61,0.16)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}
        >
          <img
            src={PG.arrowRight}
            alt=""
            style={{ width: 20, height: 20, display: 'block', transform: edge.next ? undefined : 'rotate(180deg)' }}
          />
        </button>
      )}
      </div>

      <div
        ref={scroller}
        className={carousel ? 'compare-scroller' : undefined}
        style={{ overflowX: carousel ? 'auto' : 'visible', minWidth: 0, borderRadius: '0 0 24px 24px' }}
      >
      <div style={{
        padding: `4px ${tablePad}px ${bp === 'sm' ? 24 : 32}px`,
      }}>
        {DATA.map((sect, si) => {
          const hidden = sect.rows.some(row => row.more)
          const rows = hidden && !cloudOpen ? sect.rows.filter(row => !row.more) : sect.rows
          return (
            <div key={sect.id} style={{ marginTop: si > 0 ? 20 : 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                ...(carousel ? {
                  position: 'sticky' as const, left: 0, zIndex: 2, background: 'white',
                  boxSizing: 'border-box' as const, width: label + tablePad,
                  marginLeft: -tablePad, paddingLeft: tablePad + 12,
                  boxShadow: '8px 0 0 #fff',
                } : null),
              }}>
                <img src={sect.logo} alt="" style={{ width: 32, height: 32 }} />
                <span style={{
                  fontFamily: "var(--fontfamilyaccent)",
                  fontSize: 17, lineHeight: '22px', color: '#2c2d2e',
                }}>
                  {sect.title}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
                {rows.map(feat => (
                  <FeatureRow
                    key={feat.id}
                    feat={feat}
                    rowRef={si === 0 && feat.id === onboardFeatId ? firstRowRef : undefined}
                    demo={demoId === feat.id}
                    onDemoEnd={() => setDemoId(cur => (cur === feat.id ? null : cur))}
                    onRowHover={() => setDemoId(cur => (cur && cur !== feat.id ? null : cur))}
                  />
                ))}
              </div>
              {hidden && (
                <div style={carousel
                  ? { ...grid, paddingTop: 16 }
                  : { display: 'flex', justifyContent: 'center', paddingTop: 16 }}>
                  <div style={carousel ? {
                    gridColumn: '1 / -1', justifySelf: 'start',
                    position: 'sticky', left: 0, zIndex: 2,
                    width: viewW || '100%', marginLeft: -tablePad,
                    display: 'flex', justifyContent: 'center',
                  } : { display: 'contents' }}>
                    <button
                      type="button"
                      aria-expanded={cloudOpen}
                      onClick={() => setCloudOpen(v => !v)}
                      style={{
                        height: 36, border: 'none', cursor: 'pointer',
                        background: 'rgba(0,16,61,0.06)', color: '#2c2d2e',
                        borderRadius: 8, padding: '0 15px',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontFamily: "var(--fontfamilyaccent)",
                        fontSize: 15, lineHeight: '20px',
                      }}
                    >
                      {cloudOpen ? 'Скрыть возможности Облака' : 'Показать все возможности Облака'}
                      <img
                        src={ICO.dropdown}
                        alt=""
                        style={{
                          width: 16, height: 12, display: 'block',
                          transform: cloudOpen ? 'rotate(180deg)' : undefined,
                        }}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      </div>
    </div>
  )
}
// ── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [buyPlanId, setBuyPlanId] = useState<string | null>(null)
  const [paid, setPaidState] = useState(() => paidFromUrl())

  const setPaid = (v: boolean) => {
    setPaidState(v)
    const next = urlForPaid(v)
    const here = window.location.pathname.endsWith('/') ? window.location.pathname : `${window.location.pathname}/`
    const want = next.endsWith('/') ? next : `${next}/`
    if (here !== want) window.history.pushState({ paid: v }, '', next)
  }

  useEffect(() => {
    const sync = () => setPaidState(paidFromUrl())
    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener('hashchange', sync)
    }
  }, [])
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1366))
  const scrollRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const read = () => {
      const el = scrollRef.current
      setW(el?.clientWidth || window.innerWidth)
    }
    read()
    const el = scrollRef.current
    const ro = el ? new ResizeObserver(read) : null
    if (el) ro!.observe(el)
    window.addEventListener('resize', read)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', read)
    }
  }, [])

  const m = metricsFor(w)
  const bp = m.bp

  useEffect(() => {
    if (m.hasSidebar) setMenuOpen(false)
  }, [m.hasSidebar])

  const layout: Layout = { w, ...m, menuOpen, setMenuOpen, paid, setPaid, buyPlanId, setBuyPlanId }
  const titleSize =
    bp === 'sm' ? { fontSize: 24, lineHeight: '30px' } :
    bp === 'md' ? { fontSize: 28, lineHeight: '34px' } :
    { fontSize: 32, lineHeight: '40px' }
  const padX = m.pagePad
  const contentPadLeft = m.hasSidebar ? 0 : padX
  const contentPadRight = m.hasSidebar ? (bp === 'xl' ? 0 : padX) : padX
  const sectionGap = bp === 'sm' ? 16 : 24

  return (
    <LayoutCtx.Provider value={layout}>
    <div
      ref={scrollRef}
      style={{
        height: '100vh', overflowY: 'auto', overflowX: 'hidden',
        background: '#f6f7f8',
        scrollbarColor: 'rgba(0,0,0,0.18) transparent',
        scrollbarWidth: 'thin',
      }}
    >
      <div style={{ minWidth: 0, width: '100%' }}>

        <PortalMenu />
        <HeadBar />

        {!m.hasSidebar && menuOpen && createPortal(
          <>
            <div
              onClick={() => setMenuOpen(false)}
              style={{ position: 'fixed', top: 88, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.32)', zIndex: 40 }}
            />
            <div style={{
              position: 'fixed', left: 0, top: 88, bottom: 0, zIndex: 50,
              background: '#f6f7f8', overflowY: 'auto',
              boxShadow: '8px 0 24px rgba(0,0,0,0.12)',
            }}>
              <Sidebar />
            </div>
          </>,
          document.body
        )}

        <div style={{
          display: 'flex', gap: SIDEBAR_GAP, alignItems: 'flex-start',
          paddingBottom: bp === 'sm' ? 80 : 120,
          paddingLeft: contentPadLeft, paddingRight: contentPadRight,
        }}>
          {m.hasSidebar && <Sidebar />}

          <div style={{
            width: bp === 'xl' ? CONTENT_DESKTOP : '100%',
            maxWidth: bp === 'xl' ? CONTENT_DESKTOP : undefined,
            flex: bp === 'xl' ? undefined : 1,
            flexShrink: 1, minWidth: 0,
            display: 'flex', flexDirection: 'column', gap: sectionGap,
          }}>

            <div style={{
              paddingTop: padX, paddingBottom: 12,
              width: '100%',
              maxWidth: m.stackCards ? '100%' : Math.min(600, m.contentW),
            }}>
              <h1 style={{
                fontFamily: "var(--fontfamilyaccent)",
                ...titleSize, color: '#2c2d2e',
                margin: '0 0 8px', fontWeight: 500,
              }}>
                Управление подпиской Mail Space
              </h1>
              <p style={{ margin: 0, fontFamily: "var(--fontfamilybase)", fontSize: bp === 'sm' ? 14 : 15, lineHeight: '20px', color: '#2c2d2e' }}>
                В&#160;этом разделе можно управлять подпиской и&#160;местом в&#160;едином пространстве Почты и&#160;Облака. Гигабайты от&#160;разных тарифов суммируются.{' '}
                <span style={{ color: '#0070f0', cursor: 'default' }}>Как работает подписка.</span>
              </p>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: m.stackCards ? 'column' : 'row',
              gap: m.stackCards ? 16 : 24,
              minHeight: m.stackCards ? undefined : paid ? 202 : 200,
              alignItems: 'stretch',
            }}>
              <StorageCard />
              <ActionsCard />
            </div>

            <ActiveTariffsCard />
            <IncludedFeaturesCard />

            <ComparisonTable />

          </div>
        </div>

        <div style={{
          minHeight: 28, display: 'flex', alignItems: 'center', flexWrap: 'wrap',
          paddingLeft: m.hasSidebar ? 32 : padX,
          paddingRight: m.hasSidebar ? (bp === 'xl' ? 32 : padX) : padX,
          paddingBottom: 12, gap: 16, flexShrink: 0,
        }}>
          {['Mail', 'О комании', 'Реклама', 'Вакансии'].map(l => (
            <span key={l} style={{
              fontFamily: "var(--fontfamilybase)",
              fontSize: 13, lineHeight: '16px', color: '#2c2d2e',
            }}>{l}</span>
          ))}
        </div>
      </div>
    </div>
    {buyPlanId && (
      <BuyTariffModal planId={buyPlanId} onClose={() => setBuyPlanId(null)} />
    )}
    </LayoutCtx.Provider>
  )
}

