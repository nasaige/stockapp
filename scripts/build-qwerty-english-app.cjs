const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const root = process.cwd()
const work = path.join(root, '.qwerty-build')
const qwerty = path.join(work, 'qwerty-learner')
const target = path.join(root, 'english-ios-app')
const logisticsJson = path.join(root, 'english-ios-app', 'dicts', 'logistics_cross_border_ecommerce.json')

function run(cmd, args, cwd = root) {
  execFileSync(cmd, args, { cwd, stdio: 'inherit' })
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

function replace(file, from, to) {
  const p = path.join(qwerty, file)
  const text = fs.readFileSync(p, 'utf8')
  const next = text.replace(from, to)
  if (next === text) throw new Error(`Patch failed: ${file}`)
  fs.writeFileSync(p, next)
}

fs.rmSync(work, { recursive: true, force: true })
fs.mkdirSync(work, { recursive: true })
run('git', ['clone', '--depth=1', 'https://github.com/RealKai42/qwerty-learner.git', qwerty])

const logisticsWords = JSON.parse(fs.readFileSync(logisticsJson, 'utf8'))
write(path.join(qwerty, 'public/dicts/logistics_cross_border_ecommerce.json'), JSON.stringify(logisticsWords, null, 2))

replace('vite.config.ts', "return getLastCommit((err, commit) => (err ? 'unknown' : resolve(commit.shortHash)))", "return getLastCommit((err, commit) => resolve(err ? 'unknown' : commit.shortHash))")
replace('src/index.tsx', "import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'", "import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'")
replace('src/index.tsx', "<BrowserRouter basename={REACT_APP_DEPLOY_ENV === 'pages' ? '/qwerty-learner' : ''}>", '<HashRouter>')
replace('src/index.tsx', '</BrowserRouter>', '</HashRouter>')
replace('src/store/index.ts', "export const currentDictIdAtom = atomWithStorage('currentDict', 'cet4')", "export const currentDictIdAtom = atomWithStorage('currentDict', 'logistics-cross-border-ecommerce')")
replace('src/resources/dictionary.ts', /url: '\/dicts\//g, "url: './dicts/")

replace(
  'src/resources/dictionary.ts',
  "/**\n * Built-in dictionaries in an array.",
  `const logisticsEcommerce: DictionaryResource[] = [
  {
    id: 'logistics-cross-border-ecommerce',
    name: 'Logistics / Cross-border Ecommerce',
    description: 'Work vocabulary for logistics, customs, warehouse, fulfillment, and ecommerce',
    category: 'Work English',
    tags: ['logistics', 'cross-border ecommerce', 'work English'],
    url: './dicts/logistics_cross_border_ecommerce.json',
    length: ${logisticsWords.length},
    language: 'en',
    languageCategory: 'en',
  },
]

/**
 * Built-in dictionaries in an array.`,
)
replace(
  'src/resources/dictionary.ts',
  'export const dictionaryResources: DictionaryResource[] = [\n  ...chinaExam,',
  'export const dictionaryResources: DictionaryResource[] = [\n  ...logisticsEcommerce,\n  ...chinaExam,',
)

write(
  path.join(qwerty, 'src/utils/dailyPractice.ts'),
  `const STORAGE_KEY = 'qwerty-learner-daily-practice'
const UPDATE_EVENT = 'qwerty-learner-daily-practice-updated'
export type DailyPracticeRecord = { date: string; words: number; bestWpm: number; totalWpm: number; sessions: number }
const emptyRecord = (date: string): DailyPracticeRecord => ({ date, words: 0, bestWpm: 0, totalWpm: 0, sessions: 0 })
export function getTodayKey() { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-') }
function readRecords(): DailyPracticeRecord[] { try { const raw = localStorage.getItem(STORAGE_KEY); const data = raw ? JSON.parse(raw) : []; return Array.isArray(data) ? data : [] } catch { return [] } }
function writeRecords(records: DailyPracticeRecord[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); window.dispatchEvent(new CustomEvent(UPDATE_EVENT)) }
function getStreakDays(records: DailyPracticeRecord[]) { const active = new Set(records.filter(r => r.words > 0).map(r => r.date)); const d = new Date(getTodayKey()); let n = 0; while (active.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1) } return n }
export function getDailyPracticeStats() { const records = readRecords().sort((a, b) => a.date.localeCompare(b.date)); const today = records.find(r => r.date === getTodayKey()) ?? emptyRecord(getTodayKey()); return { records, today, totalWords: records.reduce((s, r) => s + r.words, 0), streakDays: getStreakDays(records) } }
export function recordDailyPracticeWord(wpm: number) { const date = getTodayKey(); const records = readRecords(); const current = records.find(r => r.date === date) ?? emptyRecord(date); current.words += 1; current.sessions += 1; current.totalWpm += Math.max(0, wpm); current.bestWpm = Math.max(current.bestWpm, Math.max(0, wpm)); writeRecords((records.some(r => r.date === date) ? records.map(r => r.date === date ? current : r) : [...records, current]).slice(-120)) }
export function subscribeDailyPractice(listener: () => void) { window.addEventListener(UPDATE_EVENT, listener); window.addEventListener('storage', listener); return () => { window.removeEventListener(UPDATE_EVENT, listener); window.removeEventListener('storage', listener) } }
`,
)

write(
  path.join(qwerty, 'src/pages/Typing/components/DailyPracticePanel/index.tsx'),
  `import { getDailyPracticeStats, subscribeDailyPractice } from '@/utils/dailyPractice'
import { useEffect, useMemo, useState } from 'react'
const ipaGroups = [
  { title: 'Short vowels', items: [' /i/  sit', ' /e/  pen', ' /ae/  cat', ' /u/  book', ' /uh/  cup'] },
  { title: 'Long vowels', items: [' /i:/  see', ' /u:/  blue', ' /a:/  car', ' /or/  door', ' /er/  bird'] },
  { title: 'Diphthongs', items: [' /ei/  day', ' /ai/  bike', ' /oi/  boy', ' /au/  now', ' /ou/  go'] },
  { title: 'Common consonants', items: [' /th/  thank', ' /dh/  this', ' /sh/  ship', ' /ch/  chair', ' /ng/  sing'] },
]
export default function DailyPracticePanel() {
  const [stats, setStats] = useState(() => getDailyPracticeStats())
  useEffect(() => subscribeDailyPractice(() => setStats(getDailyPracticeStats())), [])
  const averageWpm = useMemo(() => stats.today.sessions === 0 ? 0 : Math.round(stats.today.totalWpm / stats.today.sessions), [stats.today.sessions, stats.today.totalWpm])
  return <aside className="fixed right-5 top-24 z-30 hidden max-h-[calc(100vh-7rem)] w-80 flex-col gap-3 overflow-y-auto pb-2 xl:flex">
    <section className="my-card rounded-lg bg-white/95 p-4 text-gray-700 shadow-sm transition-colors duration-300 dark:bg-gray-800/95 dark:text-gray-100">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Daily Practice</h2><span className="rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200">Local</span></div>
      <div className="grid grid-cols-2 gap-2 text-center">{[['Today words', stats.today.words], ['Today WPM', averageWpm], ['Best WPM', stats.today.bestWpm], ['Streak days', stats.streakDays]].map(([label, value]) => <div key={label} className="rounded bg-gray-50 p-3 dark:bg-gray-700"><div className="text-2xl font-semibold">{value}</div><div className="text-xs text-gray-500 dark:text-gray-300">{label}</div></div>)}</div>
    </section>
    <section className="my-card rounded-lg bg-white/95 p-4 text-gray-700 shadow-sm transition-colors duration-300 dark:bg-gray-800/95 dark:text-gray-100">
      <h2 className="text-sm font-semibold">IPA Starter</h2><p className="mt-1 text-xs text-gray-500 dark:text-gray-300">Read the sample words, then type and listen.</p>
      {ipaGroups.map(group => <div key={group.title} className="mt-3"><div className="mb-1 text-xs font-medium text-indigo-600 dark:text-indigo-300">{group.title}</div>{group.items.map(item => <div key={item} className="mb-1 rounded bg-gray-50 px-2 py-1 font-mono text-xs dark:bg-gray-700">{item}</div>)}</div>)}
    </section>
  </aside>
}
`,
)

replace('src/pages/Typing/index.tsx', "import Layout from '../../components/Layout'", "import Layout from '../../components/Layout'\nimport DailyPracticePanel from './components/DailyPracticePanel'")
replace('src/pages/Typing/index.tsx', '<Layout>\n        <Header>', '<Layout>\n        <DailyPracticePanel />\n        <Header>')
replace('src/pages/Typing/components/WordPanel/index.tsx', "import type { Word } from '@/typings'", "import type { Word } from '@/typings'\nimport { recordDailyPracticeWord } from '@/utils/dailyPractice'")
replace('src/pages/Typing/components/WordPanel/index.tsx', "  const onFinish = useCallback(() => {\n    if (state.chapterData.index", "  const speakCompletedWord = useCallback((word: string) => {\n    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return\n    window.speechSynthesis.cancel()\n    const utterance = new SpeechSynthesisUtterance(word)\n    utterance.lang = 'en-US'\n    utterance.rate = 0.9\n    window.speechSynthesis.speak(utterance)\n  }, [])\n\n  const onFinish = useCallback(() => {\n    if (currentWord?.name) {\n      recordDailyPracticeWord(state.timerData.wpm)\n      speakCompletedWord(currentWord.name)\n    }\n\n    if (state.chapterData.index")
replace('src/pages/Typing/components/WordPanel/index.tsx', "    state.chapterData.words.length,\n    currentWordExerciseCount,", "    state.chapterData.words.length,\n    state.timerData.wpm,\n    currentWord?.name,\n    currentWordExerciseCount,")
replace('src/pages/Typing/components/WordPanel/index.tsx', "    setReviewModeInfo,\n  ])", "    setReviewModeInfo,\n    speakCompletedWord,\n  ])")

run('npm', ['install', '--ignore-scripts'], qwerty)
run('npm', ['run', 'build'], qwerty)

fs.rmSync(target, { recursive: true, force: true })
fs.cpSync(path.join(qwerty, 'build'), target, { recursive: true })
write(path.join(target, 'service-worker.js'), `self.addEventListener('install', event => { self.skipWaiting() })
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', event => { event.respondWith(fetch(event.request)) })
`)

console.log(`Published full Qwerty Learner build with ${fs.readdirSync(path.join(target, 'dicts')).length} dictionary files.`)
