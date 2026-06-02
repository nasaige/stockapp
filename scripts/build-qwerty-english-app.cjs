const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

// Rebuild marker: visible DictionaryData entry.
const root = process.cwd()
const work = path.join(root, '.qwerty-build')
const qwerty = path.join(work, 'qwerty-learner')
const dictionaryData = path.join(work, 'DictionaryData')
const target = path.join(root, 'english-ios-app')

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
function parseCsvLine(line) {
  const out = []
  let value = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"'
        i++
      } else {
        quoted = !quoted
      }
    } else if (ch === ',' && !quoted) {
      out.push(value)
      value = ''
    } else {
      value += ch
    }
  }
  out.push(value)
  return out
}
function cleanText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim()
}
function buildDictionaryData() {
  const outputDir = path.join(qwerty, 'public', 'dictionary-data')
  fs.mkdirSync(outputDir, { recursive: true })

  const books = fs.readFileSync(path.join(dictionaryData, 'book.csv'), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(1)
    .map((line) => {
      const cells = line.split('>')
      return {
        id: cells[0],
        parentId: cells[1],
        level: Number(cells[2]) || 0,
        order: Number(cells[3]) || 0,
        name: cleanText(cells[4]),
        count: Number(cells[5]) || 0,
        book: cleanText(cells[8]),
      }
    })
    .filter((book) => book.name)

  const translations = new Map()
  fs.readFileSync(path.join(dictionaryData, 'word_translation.csv'), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(1)
    .forEach((line) => {
      const [word, translation] = parseCsvLine(line)
      const key = cleanText(word).toLowerCase()
      if (key && !translations.has(key)) translations.set(key, cleanText(translation).slice(0, 280))
    })

  const words = []
  const seen = new Set()
  fs.readFileSync(path.join(dictionaryData, 'word.csv'), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(1)
    .forEach((line) => {
      const cells = line.split('>')
      const word = cleanText(cells[1])
      const key = word.toLowerCase()
      if (!word || seen.has(key)) return
      seen.add(key)
      words.push({
        w: word,
        uk: cleanText(cells[2]),
        us: cleanText(cells[3]),
        f: Number(cells[4]) || 0,
        d: Number(cells[5]) || 0,
        t: translations.get(key) || '',
      })
    })
  for (const [key, translation] of translations) {
    if (!seen.has(key)) words.push({ w: key, uk: '', us: '', f: 0, d: 0, t: translation })
  }

  fs.writeFileSync(path.join(outputDir, 'dictionary.json'), JSON.stringify({
    source: 'LinXueyuanStdio/DictionaryData',
    generatedAt: new Date().toISOString(),
    counts: { books: books.length, words: words.length },
    books,
    words,
  }))
}

fs.rmSync(work, { recursive: true, force: true })
fs.mkdirSync(work, { recursive: true })
run('git', ['clone', '--depth=1', 'https://github.com/RealKai42/qwerty-learner.git', qwerty])
run('git', ['clone', '--depth=1', 'https://github.com/LinXueyuanStdio/DictionaryData.git', dictionaryData])

write(path.join(qwerty, 'src/components/Header/index.tsx'), `import logo from '@/assets/logo.svg'
import type { PropsWithChildren } from 'react'
import type React from 'react'
const Header: React.FC<PropsWithChildren> = ({ children }) => {
  return <header className="container z-20 mx-auto w-full px-10 py-6"><div className="flex w-full flex-col items-center justify-between space-y-3 lg:flex-row lg:space-y-0"><div className="qwerty-local-title flex items-center text-2xl font-bold text-indigo-500 no-underline lg:text-4xl"><img src={logo} className="mr-3 h-16 w-16" alt="Qwerty Learner Logo" /><h1>Qwerty Learner</h1></div><nav className="my-card on element flex w-auto content-center items-center justify-end space-x-3 rounded-xl bg-white p-4 transition-colors duration-300 dark:bg-gray-800"><a href="#/dictionary" className="qwerty-header-dict-link">词典</a>{children}</nav></div><a href="#/dictionary" className="qwerty-floating-dict-link">词典</a></header>
}
export default Header
`)
write(path.join(qwerty, 'src/components/Footer/index.tsx'), `const Footer = () => null
export default Footer
`)

write(path.join(qwerty, 'src/pages/Ipa/index.tsx'), `import { useMemo, useState } from 'react'

type IpaItem = {
  symbol: string
  group: string
  category: string
  kind: 'vowel' | 'consonant'
  color: 'green' | 'orange' | 'blue' | 'purple'
  sound: string
  tips: string[]
  near?: string
  examples: { word: string; ipa: string }[]
}

type VowelGroup = { category: string; color: 'green' | 'orange'; items: [string, string, string[], string][] }
type ConsonantGroup = { category: string; color: 'blue' | 'purple'; items: [string, string][] }

const vowelGroups: VowelGroup[] = [
  { category: '前元音', color: 'green' as const, items: [
    ['æ', 'apple', ['嘴巴张大，舌尖抵下齿，发短促的 /æ/。', '像汉语“爱”的前半段，但不要拖长。'], '/e/'],
    ['e', 'egg', ['嘴型比 /æ/ 小，声音短而清楚。', '舌位靠前，嘴角自然展开。'], '/æ/'],
    ['i:', 'see', ['嘴角向两边拉开，声音要拉长。', '舌位高而靠前，保持稳定。'], '/ɪ/'],
    ['ɪ', 'sit', ['短促放松，不要读成中文“一”。', '嘴型比 /i:/ 更松。'], '/i:/'],
    ['i', 'happy', ['常出现在词尾，轻而短。', '保持清晰，不要太用力。'], '/i:/'],
  ] },
  { category: '中元音', color: 'green' as const, items: [
    ['ə', 'about', ['最常见的弱读音，嘴巴放松。', '声音短轻，不需要重读。'], '/ʌ/'],
    ['ʌ', 'cup', ['嘴巴微张，声音短促有力。', '舌头居中，不要卷舌。'], '/ɑ:/'],
  ] },
  { category: '后元音', color: 'green' as const, items: [
    ['ɑ:', 'father', ['嘴巴打开，舌头后缩，声音拉长。', '美音里常见于 father, calm。'], '/ʌ/'],
    ['ɔ:', 'law', ['嘴唇略圆，声音拉长。', '注意不要读得太扁。'], '/ɑ:/'],
    ['u:', 'blue', ['嘴唇收圆，声音拉长。', '舌位高而靠后。'], '/ʊ/'],
    ['ʊ', 'book', ['短促放松，嘴唇略圆。', '不要读成长音 /u:/。'], '/u:/'],
    ['u', 'actual', ['轻读时出现，短而清楚。', '注意不要过度拖长。'], '/ʊ/'],
  ] },
  { category: '开合双元音', color: 'orange' as const, items: [
    ['aʊ', 'now', ['从 /a/ 滑向 /ʊ/，口型由大到小。', '两个音连成一个滑动。'], '/oʊ/'],
    ['aɪ', 'like', ['从 /a/ 滑向 /ɪ/，结尾轻收。', '不要拆成两个独立音。'], '/eɪ/'],
    ['eɪ', 'day', ['从 /e/ 滑向 /ɪ/，声音自然上扬。', '常见于 a, ai, ay。'], '/aɪ/'],
    ['oʊ', 'go', ['嘴唇从半圆到更圆，声音滑动。', '美音常用 /oʊ/。'], '/ɔ:/'],
    ['ɔɪ', 'boy', ['从 /ɔ/ 滑向 /ɪ/，嘴型先圆后扁。', '保持一个整体音。'], '/aɪ/'],
  ] },
  { category: '儿化元音', color: 'orange' as const, items: [
    ['ɑ:r', 'car', ['先发 /ɑ:/，结尾带美音 r。', '舌尖不要碰上颚。'], '/ɑ:/'],
    ['er', 'air', ['嘴型放松，结尾带 r 色彩。', '常见于 air, care。'], '/e/'],
    ['ər', 'teacher', ['弱读加 r，轻而短。', '常出现在词尾 -er。'], '/ɜ:r/'],
    ['ɔ:r', 'more', ['圆唇长音后带 r。', '常见于 or, ore。'], '/ɔ:/'],
    ['ɜ:r', 'bird', ['舌头居中并卷向 r 色彩。', '美音中很重要。'], '/ər/'],
    ['ɪr', 'near', ['先短 /ɪ/，再带 r。', '注意不要读成 /i:/。'], '/i:/'],
    ['ʊr', 'tour', ['先短 /ʊ/，再带 r。', '嘴唇轻圆。'], '/u:/'],
  ] },
]

const consonantGroups: ConsonantGroup[] = [
  { category: '爆破音', color: 'blue' as const, items: [['b', 'book'], ['d', 'day'], ['g', 'go'], ['k', 'key'], ['p', 'pen'], ['t', 'tea']] },
  { category: '摩擦音', color: 'blue' as const, items: [['f', 'fish'], ['v', 'very'], ['θ', 'think'], ['ð', 'this'], ['s', 'see'], ['z', 'zoo'], ['ʃ', 'she'], ['ʒ', 'vision'], ['h', 'home'], ['r', 'red']] },
  { category: '破擦音', color: 'purple' as const, items: [['tʃ', 'chair'], ['dʒ', 'job'], ['tr', 'tree'], ['dr', 'drive'], ['ts', 'cats'], ['dz', 'beds']] },
  { category: '鼻音', color: 'purple' as const, items: [['m', 'man'], ['n', 'name'], ['ŋ', 'sing']] },
  { category: '舌侧音', color: 'purple' as const, items: [['l', 'love']] },
  { category: '半元音', color: 'purple' as const, items: [['w', 'we'], ['j', 'yes']] },
]

function makeConsonant(symbol: string, word: string, category: string, color: 'blue' | 'purple'): IpaItem {
  return {
    symbol,
    group: category,
    category,
    kind: 'consonant',
    color,
    sound: word,
    tips: ['辅音要注意气流和发音位置，先慢后快。', '清辅音不震动声带，浊辅音要带声带震动。'],
    near: symbol === 'θ' ? '/s/' : symbol === 'ð' ? '/z/' : undefined,
    examples: [
      { word, ipa: '/' + symbol + word.slice(1) + '/' },
      { word: symbol === 'θ' ? 'think' : symbol === 'ð' ? 'that' : 'best', ipa: symbol === 'θ' ? '/θɪŋk/' : symbol === 'ð' ? '/ðæt/' : '/best/' },
      { word: symbol === 'ʃ' ? 'ship' : symbol === 'tʃ' ? 'chair' : 'desk', ipa: symbol === 'ʃ' ? '/ʃɪp/' : symbol === 'tʃ' ? '/tʃer/' : '/desk/' },
    ],
  }
}

const vowelItems: IpaItem[] = vowelGroups.flatMap((group) =>
  group.items.map(([symbol, sound, tips, near]) => ({
    symbol: symbol as string,
    group: group.category,
    category: group.category,
    kind: 'vowel' as const,
    color: group.color,
    sound: sound as string,
    tips: tips as string[],
    near: near as string,
    examples:
      symbol === 'æ'
        ? [
            { word: 'and', ipa: '/ænd/' },
            { word: 'that', ipa: '/ðæt/' },
            { word: 'have', ipa: '/hæv/' },
            { word: 'can', ipa: '/kæn/' },
            { word: 'aunt', ipa: '/ænt/' },
            { word: 'auntie', ipa: '/ˈænti/' },
            { word: 'draught', ipa: '/dræft/' },
          ]
        : [
            { word: sound as string, ipa: '/' + symbol + '/' },
            { word: sound === 'see' ? 'green' : sound === 'book' ? 'good' : 'practice', ipa: '/' + symbol + '/' },
            { word: sound === 'day' ? 'play' : sound === 'go' ? 'home' : 'sample', ipa: '/' + symbol + '/' },
          ],
  })),
)

const consonantItems: IpaItem[] = consonantGroups.flatMap((group) =>
  group.items.map(([symbol, word]) => makeConsonant(symbol, word, group.category, group.color)),
)
const allItems = [...vowelItems, ...consonantItems]

function speak(text: string) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.82
  window.speechSynthesis.speak(utterance)
}

export default function IpaPage() {
  const [selected, setSelected] = useState<IpaItem | null>(null)
  const [practiceIndex, setPracticeIndex] = useState(0)
  const groupedVowels = useMemo(() => vowelGroups, [])
  const groupedConsonants = useMemo(() => consonantGroups, [])

  const openItem = (item: IpaItem) => {
    setSelected(item)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const nextPractice = () => {
    const next = (practiceIndex + 1) % allItems.length
    setPracticeIndex(next)
    setSelected(allItems[next])
    speak(allItems[next].sound)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (selected) {
    return (
      <main className="qwerty-ipa-page qwerty-ipa-detail">
        <div className="ipa-topbar">
          <button type="button" className="ipa-back" onClick={() => setSelected(null)}>‹</button>
          <h1>{selected.group}</h1>
          <span />
        </div>
        <section className="ipa-hero-card">
          <div className="ipa-big">/{selected.symbol}/</div>
          <div className="ipa-actions">
            <button type="button" className="ipa-sound-main" onClick={() => speak(selected.sound)}>🔊</button>
            <button type="button" className="ipa-mic" onClick={() => speak(selected.sound)}>🎙</button>
          </div>
        </section>
        <section className="ipa-section">
          <div className="ipa-section-title"><span />教学视频</div>
          <div className="ipa-video-card" onClick={() => speak(selected.sound)}>
            <div><p>音标视频教学</p><strong>/{selected.symbol}/</strong></div>
            <button type="button">▶</button>
          </div>
          <button type="button" className="ipa-course-card">音标系统课 <small>不用背，会拼音就能会音标！</small><b>›</b></button>
        </section>
        <section className="ipa-section">
          <div className="ipa-section-title"><span />发音要点</div>
          <ol className="ipa-tips">{selected.tips.map((tip) => <li key={tip}>{tip}</li>)}</ol>
        </section>
        <section className="ipa-section">
          <div className="ipa-section-title"><span />近似音标</div>
          <button type="button" className="ipa-near-card" onClick={() => speak(selected.sound)}><strong>{selected.near || '多听示例单词'}</strong><span>🔊</span></button>
        </section>
        <section className="ipa-section">
          <div className="ipa-section-title"><span />常见字母组合</div>
          <p className="ipa-combo-note">点单词右下角按钮可以朗读。</p>
          <div className="ipa-example-grid">
            {selected.examples.map((example) => (
              <article className="ipa-example-card" key={example.word}>
                <b>{example.word}</b><em>{example.ipa}</em>
                <button type="button" onClick={() => speak(example.word)}>🔊</button>
              </article>
            ))}
          </div>
        </section>
        <div className="ipa-bottom-bar">
          <div><span>熟练度</span><b>{practiceIndex}</b><i /></div>
          <button type="button" onClick={nextPractice}>音标练习</button>
        </div>
      </main>
    )
  }

  return (
    <main className="qwerty-ipa-page">
      <header className="ipa-home-header">
        <div className="ipa-user"><span>nasaig...</span><i>›</i></div>
        <button type="button" className="ipa-accent">美音 ›</button>
      </header>
      <div className="ipa-title-row">
        <h1>48个国际音标</h1>
        <div><button type="button">音标答疑</button><button type="button">点读</button></div>
      </div>
      <section className="ipa-board">
        <div className="ipa-heading-row"><h2>24个元音</h2><p><span className="dot green" />单元音 <span className="dot orange" />双元音</p></div>
        {groupedVowels.map((group) => (
          <div className="ipa-row" key={group.category}>
            <div className="ipa-row-label">{group.category}</div>
            <div className="ipa-symbols">
              {group.items.map(([symbol]) => {
                const item = vowelItems.find((entry) => entry.symbol === symbol)!
                return <button type="button" className={'ipa-symbol-tile ' + item.color} key={item.symbol} onClick={() => openItem(item)}>{item.symbol}</button>
              })}
            </div>
          </div>
        ))}
      </section>
      <section className="ipa-board">
        <div className="ipa-heading-row"><h2>24个辅音</h2><p><span className="dot blue" />清辅音 <span className="dot purple" />浊辅音</p></div>
        {groupedConsonants.map((group) => (
          <div className="ipa-row" key={group.category}>
            <div className="ipa-row-label">{group.category}</div>
            <div className="ipa-symbols">
              {group.items.map(([symbol]) => {
                const item = consonantItems.find((entry) => entry.symbol === symbol)!
                return <button type="button" className={'ipa-symbol-tile ' + item.color} key={item.symbol} onClick={() => openItem(item)}>{item.symbol}</button>
              })}
            </div>
          </div>
        ))}
      </section>
      <nav className="ipa-tabbar"><b>首页</b><span>背单词</span><span>阅读</span><span>课程</span><span>账号</span></nav>
    </main>
  )
}
`)

write(path.join(qwerty, 'src/pages/Dictionary/index.tsx'), `import { useEffect, useMemo, useState } from 'react'

type DictWord = { w: string; uk?: string; us?: string; f?: number; d?: number; t?: string }
type DictBook = { id: string; parentId: string; level: number; order: number; name: string; count: number; book?: string }
type DictPayload = { counts: { books: number; words: number }; books: DictBook[]; words: DictWord[] }

const hotQueries = ['abandon', 'apple', 'IELTS', 'custom', 'school', 'ability']

function speak(text: string) {
  if (!text || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.85
  window.speechSynthesis.speak(utterance)
}

export default function DictionaryPage() {
  const [data, setData] = useState<DictPayload | null>(null)
  const [query, setQuery] = useState('')
  const [activeBook, setActiveBook] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('./dictionary-data/dictionary.json', { cache: 'force-cache' })
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch(() => {
        if (!cancelled) setData({ counts: { books: 0, words: 0 }, books: [], words: [] })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const rootBooks = useMemo(() => {
    if (!data) return []
    return data.books
      .filter((book) => book.level === 1 || book.parentId === '0')
      .sort((a, b) => a.order - b.order)
      .slice(0, 24)
  }, [data])

  const childBooks = useMemo(() => {
    if (!data || !activeBook) return []
    return data.books
      .filter((book) => book.parentId === activeBook)
      .sort((a, b) => a.order - b.order)
      .slice(0, 60)
  }, [activeBook, data])

  const results = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    if (!q) {
      return data.words
        .filter((word) => word.t)
        .slice(0, 80)
    }
    const starts: DictWord[] = []
    const includes: DictWord[] = []
    for (const word of data.words) {
      const name = word.w.toLowerCase()
      const translation = (word.t || '').toLowerCase()
      if (name.startsWith(q)) starts.push(word)
      else if (name.includes(q) || translation.includes(q)) includes.push(word)
      if (starts.length + includes.length >= 90) break
    }
    return [...starts, ...includes].slice(0, 80)
  }, [data, query])

  return (
    <main className="qwerty-dictionary-page">
      <header className="dict-topbar">
        <a href="#/" className="dict-back">‹</a>
        <div>
          <h1>词典数据</h1>
          <p>DictionaryData 本地搜索模块</p>
        </div>
        <a href="#/ipa" className="dict-ipa-link">音标</a>
      </header>

      <section className="dict-search-card">
        <label>
          <span>搜索单词 / 中文释义</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入 apple、abandon、学校..." autoCapitalize="none" autoCorrect="off" />
        </label>
        <div className="dict-hot-row">
          {hotQueries.map((item) => <button type="button" key={item} onClick={() => setQuery(item)}>{item}</button>)}
        </div>
        <div className="dict-counts">
          <b>{data ? data.counts.words.toLocaleString() : '加载中'}</b><span>单词</span>
          <b>{data ? data.counts.books.toLocaleString() : '--'}</b><span>词库</span>
        </div>
      </section>

      <section className="dict-section">
        <div className="dict-section-title">词库分类</div>
        <div className="dict-book-grid">
          {rootBooks.map((book) => (
            <button type="button" className={activeBook === book.id ? 'active' : ''} key={book.id} onClick={() => setActiveBook(activeBook === book.id ? null : book.id)}>
              <strong>{book.name}</strong>
              <span>{book.count.toLocaleString()} 词</span>
            </button>
          ))}
        </div>
        {childBooks.length > 0 && (
          <div className="dict-child-books">
            {childBooks.map((book) => <span key={book.id}>{book.name}<small>{book.count}</small></span>)}
          </div>
        )}
      </section>

      <section className="dict-section">
        <div className="dict-section-title">搜索结果</div>
        {!data && <div className="dict-loading">正在加载词典数据...</div>}
        {data && results.length === 0 && <div className="dict-loading">没有找到匹配单词，换个关键词试试。</div>}
        <div className="dict-result-list">
          {results.map((word) => (
            <article className="dict-word-card" key={word.w}>
              <div>
                <h2>{word.w}</h2>
                <p>{word.us && <span>美 {word.us}</span>}{word.uk && <span>英 {word.uk}</span>}</p>
              </div>
              <button type="button" onClick={() => speak(word.w)}>🔊</button>
              <p className="dict-translation">{word.t || '暂无中文释义'}</p>
              <footer><span>难度 {word.d || 0}</span><span>词频 {(word.f || 0).toFixed(2)}</span></footer>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
`)

replace('vite.config.ts', "return getLastCommit((err, commit) => (err ? 'unknown' : resolve(commit.shortHash)))", "return getLastCommit((err, commit) => resolve(err ? 'unknown' : commit.shortHash))")
replace('src/index.tsx', "import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'", "import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'")
replace('src/index.tsx', "import MobilePage from './pages/Mobile'\n", '')
replace('src/index.tsx', "import { FriendLinks } from './pages/FriendLinks'\n", '')
replace('src/index.tsx', "import './index.css'", "import './index.css'\nimport './mobile-practice.css'\nimport IpaPage from './pages/Ipa'\nimport DictionaryPage from './pages/Dictionary'")
replace('src/index.tsx', "<BrowserRouter basename={REACT_APP_DEPLOY_ENV === 'pages' ? '/qwerty-learner' : ''}>", '<HashRouter>')
replace('src/index.tsx', '</BrowserRouter>', '</HashRouter>')
replace('src/index.tsx', /  const \[isMobile, setIsMobile\][\s\S]*?  }, \[\]\)\n\n/, '')
replace('src/index.tsx', ", lazy, useEffect, useState } from 'react'", ", lazy, useEffect } from 'react'")
replace('src/index.tsx', /\s*\{isMobile \? \([\s\S]*?<Route path="\/mobile" element=\{<MobilePage \/>\} \/>/, `
            <Route index element={<TypingPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/error-book" element={<ErrorBook />} />
            <Route path="/ipa" element={<IpaPage />} />
            <Route path="/dictionary" element={<DictionaryPage />} />
            <Route path="/*" element={<Navigate to="/" />} />`)
replace('src/resources/dictionary.ts', /url: '\/dicts\//g, "url: './dicts/")
replace('src/pages/Gallery-N/index.tsx', '<div className="relative mb-auto mt-auto flex w-full flex-1 flex-col overflow-y-auto pl-20">', '<div className="qwerty-mobile-gallery relative mb-auto mt-auto flex w-full flex-1 flex-col overflow-y-auto pl-20">')
replace('src/pages/Gallery-N/index.tsx', '<LanguageTabSwitcher />\n                <DictRequest />', '<LanguageTabSwitcher />')

replace('src/pages/Typing/index.tsx', /  useEffect\(\(\) => \{\n    \/\/ 检测用户设备[\s\S]*?  \}, \[\]\)\n\n/, '')
replace('src/pages/Typing/index.tsx', "import { IsDesktop, isLegal } from '@/utils'", "import { isLegal } from '@/utils'")
replace('src/pages/Typing/index.tsx', "import { DonateCard } from '@/components/DonateCard'\n", '')
replace('src/pages/Typing/index.tsx', '      {state.isFinished && <DonateCard />}\n', '')
replace('src/pages/Typing/index.tsx', '<div className="container mx-auto flex h-full flex-1 flex-col items-center justify-center pb-5">', '<div className="container qwerty-mobile-practice mx-auto flex h-full flex-1 flex-col items-center justify-center pb-5">')
replace('src/pages/Typing/index.tsx', `  const skipWord = useCallback(() => {
    dispatch({ type: TypingStateActionType.SKIP_WORD })
  }, [dispatch])
`, `  const focusMobileKeyboard = useCallback(() => {
    dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: true })
    requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('textarea[data-mobile-typing-input="true"]')?.focus())
    window.setTimeout(() => document.querySelector<HTMLTextAreaElement>('textarea[data-mobile-typing-input="true"]')?.focus(), 80)
  }, [dispatch])

  const speakCurrentSentence = useCallback(() => {
    const text = state.chapterData.words[state.chapterData.index]?.name
    if (!text || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text.replace(/␣/g, ' '))
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }, [state.chapterData.index, state.chapterData.words])

  const skipWord = useCallback(() => {
    dispatch({ type: TypingStateActionType.SKIP_WORD })
  }, [dispatch])
`)
replace('src/pages/Typing/index.tsx', `          <StartButton isLoading={isLoading} />
          <Tooltip content="跳过该词">`, `          <StartButton isLoading={isLoading} />
          <a href="#/ipa" className="qwerty-mobile-ipa-entry my-btn-primary">音标练习</a>
          <a href="#/dictionary" className="qwerty-mobile-dict-entry my-btn-primary">词典数据</a>
          <button type="button" className="qwerty-mobile-keyboard-button my-btn-primary hidden" onClick={focusMobileKeyboard}>打开键盘</button>
          <button type="button" className="qwerty-mobile-speak-button my-btn-primary hidden" onClick={speakCurrentSentence}>朗读句子</button>
          <button type="button" className="qwerty-mobile-next-button my-btn-primary hidden" onClick={skipWord}>下一题</button>
          <Tooltip content="跳过该词">`)
replace('src/pages/Typing/components/ResultScreen/index.tsx', /              <div className="ml-2 flex flex-col items-center justify-end gap-3 text-xl">[\s\S]*?                <a href="https:\/\/github\.com\/Kaiyiwing\/qwerty-learner"[\s\S]*?              <\/div>/, `              <div className="ml-2 flex flex-col items-center justify-end gap-3 text-xl">
                {!isReviewMode && (<><ShareButton /><IexportWords fontSize={18} className="cursor-pointer text-gray-500" onClick={exportWords}></IexportWords></>)}
              </div>`)

replace('src/pages/Typing/components/WordPanel/components/InputHandler/index.tsx', `  const handler = useMemo(() => {
    switch (dictInfo.language) {`, `  const handler = useMemo(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) return <TextAreaHandler updateInput={updateInput} />
    switch (dictInfo.language) {`)
replace('src/pages/Typing/components/WordPanel/index.tsx', '  const [isShowTranslation, setIsHoveringTranslation] = useState(false)', `  const startTypingByTouch = useCallback(() => {
    if (!state.isTyping) dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: true })
    requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('textarea[data-mobile-typing-input="true"]')?.focus())
    window.setTimeout(() => document.querySelector<HTMLTextAreaElement>('textarea[data-mobile-typing-input="true"]')?.focus(), 80)
  }, [dispatch, state.isTyping])

  const speakCompletedWord = useCallback(() => {
    if (!currentWord || !window.speechSynthesis) return
    const wordText = currentWord.name.replace(/␣/g, ' ')
    const transText = currentWord.trans.join('，').replace(/<[^>]*>/g, '').slice(0, 120)
    window.speechSynthesis.cancel()
    const en = new SpeechSynthesisUtterance(wordText)
    en.lang = 'en-US'
    en.rate = 0.88
    window.speechSynthesis.speak(en)
    if (transText) {
      const zh = new SpeechSynthesisUtterance(transText)
      zh.lang = 'zh-CN'
      zh.rate = 0.95
      window.speechSynthesis.speak(zh)
    }
  }, [currentWord])

  const [isShowTranslation, setIsHoveringTranslation] = useState(false)`)
replace('src/pages/Typing/components/WordPanel/index.tsx', `  const onFinish = useCallback(() => {
    if (state.chapterData.index < state.chapterData.words.length - 1 || currentWordExerciseCount < loopWordTimes - 1) {`, `  const onFinish = useCallback(() => {
    speakCompletedWord()
    if (state.chapterData.index < state.chapterData.words.length - 1 || currentWordExerciseCount < loopWordTimes - 1) {`)
replace('src/pages/Typing/components/WordPanel/index.tsx', `    isReviewMode,
    updateReviewRecord,`, `    isReviewMode,
    speakCompletedWord,
    updateReviewRecord,`)
replace('src/pages/Typing/components/WordPanel/index.tsx', '<div className="container flex h-full w-full flex-col items-center justify-center">', '<div className="container qwerty-mobile-word-panel flex h-full w-full flex-col items-center justify-center" onPointerDown={startTypingByTouch}>')
replace('src/pages/Typing/components/WordPanel/index.tsx', '按任意键{state.timerData.time ? \'继续\' : \'开始\'}', "{window.innerWidth <= 1024 ? '点屏幕或打开键盘' : '按任意键'}{state.timerData.time ? '继续' : '开始'}")
replace('src/pages/Typing/components/WordPanel/components/Word/index.tsx', 'className="flex flex-col items-center justify-center pb-1 pt-4"', 'className="qwerty-mobile-word-wrap flex flex-col items-center justify-center pb-1 pt-4"')
replace('src/pages/Typing/components/WordPanel/components/Word/index.tsx', 'className={`tooltip-info relative w-fit bg-transparent p-0 leading-normal shadow-none dark:bg-transparent ${', 'className={`qwerty-mobile-word-tooltip tooltip-info relative w-fit bg-transparent p-0 leading-normal shadow-none dark:bg-transparent ${')
replace('src/pages/Typing/components/WordPanel/components/Word/index.tsx', 'className={`flex items-center ${isTextSelectable && \'select-all\'} justify-center ${wordState.hasWrong ? style.wrong : \'\'}`}', 'className={`qwerty-mobile-letter-row flex items-center ${isTextSelectable && \'select-all\'} justify-center ${wordState.hasWrong ? style.wrong : \'\'}`}')
replace('src/pages/Typing/components/WordPanel/components/WordPronunciation/index.tsx', 'space-x-5 text-center text-sm font-normal text-gray-600 transition-colors duration-300 dark:text-gray-400', 'qwerty-pronunciation-line space-x-5 text-center text-xl font-semibold text-gray-600 transition-colors duration-300 dark:text-gray-400')
replace('src/pages/Typing/components/WordList/index.tsx', '<Dialog.Title as="h3" className="flex items-center justify-between p-4 text-lg font-medium leading-6 dark:text-gray-50">', '<Dialog.Title as="h3" className="flex items-center justify-between p-4 text-lg font-medium leading-6 dark:text-gray-50">\n          <button type="button" className="qwerty-mobile-drawer-back hidden" onClick={closeModal}>返回</button>')

replace('src/pages/Typing/components/WordPanel/components/TextAreaHandler/index.tsx', '  const { state } = useContext(TypingContext)!', '  const { state, dispatch } = useContext(TypingContext)!')
replace('src/pages/Typing/components/WordPanel/components/TextAreaHandler/index.tsx', "import { TypingContext } from '@/pages/Typing/store'", "import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'")
replace('src/pages/Typing/components/WordPanel/components/TextAreaHandler/index.tsx', `  const onBlur = useCallback(() => {
    if (!textareaRef.current) return

    textareaRef.current.focus()
  }, [])`, `  const onBlur = useCallback(() => {
    if (!textareaRef.current) return
    if (window.innerWidth > 1024) textareaRef.current.focus()
  }, [])

  const onFocus = useCallback(() => {
    if (!state.isTyping) dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: true })
  }, [dispatch, state.isTyping])
`)
replace('src/pages/Typing/components/WordPanel/components/TextAreaHandler/index.tsx', '      className="absolute left-0 top-0 m-0 h-0 w-0 appearance-none overflow-hidden border-0 p-0 focus:outline-none"', '      className="qwerty-mobile-textarea absolute left-0 top-0 m-0 h-0 w-0 appearance-none overflow-hidden border-0 p-0 focus:outline-none"')
replace('src/pages/Typing/components/WordPanel/components/TextAreaHandler/index.tsx', `      ref={textareaRef}
      autoFocus
      spellCheck="false"
      onInput={onInput}
      onBlur={onBlur}
      onCompositionStart={() => {
        alert('您正在使用输入法，请关闭输入法。')
      }}
    ></textarea>`, `      ref={textareaRef}
      data-mobile-typing-input="true"
      autoFocus
      spellCheck="false"
      autoCapitalize="none"
      autoCorrect="off"
      onFocus={onFocus}
      onInput={onInput}
      onBlur={onBlur}
      onCompositionStart={() => { if (window.innerWidth > 640) alert('您正在使用输入法，请关闭输入法。') }}
    ></textarea>`)

write(path.join(qwerty, 'src/mobile-practice.css'), `@media (max-width:1024px){html,body,#root{height:100%;width:100%;max-width:100%;overflow:hidden}body{touch-action:manipulation;overscroll-behavior:none}main.flex.h-screen{height:100svh!important;min-height:100svh!important;max-height:100svh!important;overflow:hidden;padding-bottom:calc(env(safe-area-inset-bottom) + 3.75rem)!important}header.container{flex:0 0 auto;padding:.55rem .6rem .35rem!important}header.container>div{gap:.45rem;width:100%}.qwerty-local-title{font-size:clamp(1.2rem,7vw,2rem)!important;line-height:1.1!important;justify-content:center;max-width:100%;white-space:nowrap}.qwerty-local-title img{width:clamp(2.25rem,12vw,3.1rem)!important;height:clamp(2.25rem,12vw,3.1rem)!important;margin-right:.55rem!important}header nav{width:100%!important;max-width:100%;overflow:visible;justify-content:center!important;gap:.35rem;padding:.45rem!important;border-radius:.75rem!important;flex-wrap:wrap;row-gap:.35rem}header nav>:not([hidden])~:not([hidden]){margin-left:0!important}header nav>*{flex:0 0 auto}header nav button,header nav a{min-width:2.25rem;min-height:2.25rem}.qwerty-mobile-keyboard-button{display:inline-flex!important;align-items:center;justify-content:center;min-width:5rem!important;height:2.25rem!important;padding:0 .75rem!important;font-size:.875rem!important;white-space:nowrap}.qwerty-mobile-textarea[data-mobile-typing-input="true"]{position:fixed!important;top:auto!important;bottom:calc(env(safe-area-inset-bottom) + 10px)!important;left:1rem!important;z-index:60!important;width:calc(100vw - 2rem)!important;height:3rem!important;border:1px solid rgb(165 180 252)!important;border-radius:.75rem!important;background:rgba(255,255,255,.92)!important;color:transparent!important;caret-color:rgb(99 102 241)!important;box-shadow:0 10px 25px rgba(79,70,229,.18)!important;padding:0 .75rem!important;font-size:16px!important;pointer-events:auto!important}.qwerty-mobile-practice{flex:1 1 auto;height:auto!important;min-height:0!important;overflow:hidden;padding-left:.5rem!important;padding-right:.5rem!important;padding-bottom:0!important;justify-content:flex-start!important}.qwerty-mobile-practice>div,.qwerty-mobile-practice>div>div{height:100%!important;min-height:0!important;overflow:hidden}.qwerty-mobile-word-panel{height:100%!important;min-height:0!important;justify-content:space-between!important;padding-top:.2rem;overflow:hidden}.qwerty-mobile-word-panel>div:first-child{height:1.75rem!important;padding-left:.75rem!important;padding-right:.75rem!important;padding-top:.15rem!important}.qwerty-mobile-word-panel>div:nth-child(2){flex:1 1 auto!important;min-height:0!important;max-height:100%;justify-content:center!important;overflow:hidden}.qwerty-mobile-word-panel p{font-size:clamp(.9rem,3.8vw,1.15rem)}.qwerty-mobile-word-panel [class*="text-7xl"],.qwerty-mobile-word-panel [class*="text-8xl"],.qwerty-mobile-word-panel [class*="text-9xl"]{font-size:clamp(2.25rem,15vw,4.8rem)!important;line-height:1.05!important}.qwerty-mobile-word-panel [class*="backdrop-blur"]{backdrop-filter:blur(4px)}.qwerty-mobile-word-panel+div,.qwerty-mobile-practice [class*="shadow"]{max-width:min(100%,36rem)}footer{display:none!important}}@media (max-width:1024px) and (orientation:landscape){main.flex.h-screen{padding-bottom:calc(env(safe-area-inset-bottom) + 3.25rem)!important}header.container{padding:.25rem .5rem!important}header.container>div{flex-direction:row!important;gap:.5rem}.qwerty-local-title{font-size:1.15rem!important}.qwerty-local-title img{width:2rem!important;height:2rem!important}header nav{width:auto!important;flex:1 1 auto;padding:.3rem!important}header nav button,header nav a,.qwerty-mobile-keyboard-button{min-height:2rem!important;height:2rem!important}.qwerty-mobile-word-panel>div:first-child{display:none!important}.qwerty-mobile-word-panel [class*="text-7xl"],.qwerty-mobile-word-panel [class*="text-8xl"],.qwerty-mobile-word-panel [class*="text-9xl"]{font-size:clamp(2rem,10vw,3.4rem)!important}}
`)

write(path.join(qwerty, 'src/mobile-practice.css'), `@media (max-width:1024px){
html,body,#root{height:100%;width:100%;max-width:100%;overflow:hidden}
body{touch-action:pan-x pan-y;overscroll-behavior:contain}
main.flex.h-screen{height:100svh!important;min-height:100svh!important;max-height:100svh!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch;padding-bottom:calc(env(safe-area-inset-bottom) + 4.25rem)!important}
header.container{flex:0 0 auto;padding:.45rem .55rem .25rem!important}
header.container>div{gap:.35rem;width:100%}
.qwerty-local-title{font-size:clamp(1.15rem,6.4vw,1.85rem)!important;line-height:1.05!important;justify-content:center;max-width:100%;white-space:nowrap}
.qwerty-local-title img{width:clamp(2rem,10.5vw,2.8rem)!important;height:clamp(2rem,10.5vw,2.8rem)!important;margin-right:.45rem!important}
header nav{width:100%!important;max-width:100%;overflow:visible;justify-content:center!important;gap:.3rem;padding:.38rem!important;border-radius:.7rem!important;flex-wrap:wrap;row-gap:.3rem}
header nav>:not([hidden])~:not([hidden]){margin-left:0!important}
header nav>*{flex:0 0 auto}
header nav button,header nav a{min-width:2.05rem;min-height:2.05rem}
.qwerty-mobile-keyboard-button,.qwerty-mobile-speak-button,.qwerty-mobile-next-button{display:inline-flex!important;align-items:center;justify-content:center;min-width:4.7rem!important;height:2.1rem!important;padding:0 .65rem!important;font-size:.82rem!important;white-space:nowrap}
.qwerty-mobile-speak-button{background:rgb(34 197 94)!important}
.qwerty-mobile-next-button{background:rgb(99 102 241)!important}
.qwerty-mobile-textarea[data-mobile-typing-input="true"]{position:fixed!important;top:auto!important;bottom:calc(env(safe-area-inset-bottom) + 10px)!important;left:1rem!important;z-index:60!important;width:calc(100vw - 2rem)!important;height:3rem!important;border:1px solid rgb(165 180 252)!important;border-radius:.75rem!important;background:rgba(255,255,255,.92)!important;color:transparent!important;caret-color:rgb(99 102 241)!important;box-shadow:0 10px 25px rgba(79,70,229,.18)!important;padding:0 .75rem!important;font-size:16px!important;pointer-events:auto!important}
.qwerty-mobile-practice{flex:0 0 auto;height:auto!important;min-height:0!important;overflow:visible!important;padding-left:.45rem!important;padding-right:.45rem!important;padding-bottom:0!important;justify-content:flex-start!important}
.qwerty-mobile-practice>div,.qwerty-mobile-practice>div>div{height:auto!important;min-height:0!important;overflow:visible!important}
.qwerty-mobile-word-panel{height:auto!important;min-height:16rem!important;justify-content:flex-start!important;padding-top:.1rem;overflow:visible!important}
.qwerty-mobile-word-panel>div:first-child{display:none!important}
.qwerty-mobile-word-panel>div:nth-child(2){flex:0 0 auto!important;min-height:9rem!important;max-height:none!important;justify-content:center!important;overflow:visible!important}
.qwerty-mobile-word-panel p{font-size:clamp(.82rem,3.3vw,1.05rem)}
.qwerty-mobile-word-panel [class*="text-7xl"],.qwerty-mobile-word-panel [class*="text-8xl"],.qwerty-mobile-word-panel [class*="text-9xl"]{font-size:clamp(2.05rem,13vw,4.2rem)!important;line-height:1.02!important}
.qwerty-mobile-word-panel [class*="backdrop-blur"]{backdrop-filter:blur(3px)}
.qwerty-mobile-word-panel+div,.qwerty-mobile-practice [class*="shadow"]{max-width:min(100%,34rem)}
.qwerty-mobile-gallery{height:100svh!important;max-height:100svh!important;width:100vw!important;max-width:100vw!important;overflow:auto!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:1rem 1rem 5rem!important;touch-action:pan-x pan-y}
.qwerty-mobile-gallery::after{content:"";position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 1.5rem);z-index:70;width:9rem;height:.28rem;border-radius:999px;background:rgba(107,114,128,.55);transform:translateX(-50%);pointer-events:none}
.qwerty-mobile-gallery>div{align-items:flex-start!important;justify-content:flex-start!important;overflow:visible!important;min-width:max-content!important;padding-top:3.5rem!important}
.qwerty-mobile-gallery>div>div{height:auto!important;overflow:visible!important;min-width:max-content!important}
.qwerty-mobile-gallery [role="radiogroup"]>div{overflow-x:auto!important;max-width:calc(100vw - 2rem)!important;padding:.35rem 1.5rem .5rem!important;-webkit-overflow-scrolling:touch;touch-action:pan-x}
.qwerty-mobile-gallery [role="radiogroup"] [role="radio"]{flex:0 0 auto}
.qwerty-mobile-gallery [class*="grid"]{display:grid!important;grid-template-columns:repeat(2,18rem)!important;gap:1rem!important;padding-right:2rem!important}
.qwerty-mobile-gallery [role="button"]{width:18rem!important}
[role="dialog"]{max-width:calc(100vw - 1.5rem)!important;max-height:calc(100svh - 2rem)!important;overflow:auto!important;-webkit-overflow-scrolling:touch}
.qwerty-mobile-word-wrap{width:100%!important;max-width:calc(100vw - .75rem)!important;overflow:visible!important}
.qwerty-mobile-word-tooltip{width:100%!important;max-width:calc(100vw - .75rem)!important}
.qwerty-mobile-letter-row{max-width:100%!important;width:100%!important;flex-wrap:wrap!important;align-items:center!important;justify-content:center!important;overflow:visible!important;white-space:normal!important;line-height:1.18!important;row-gap:.12rem}
.qwerty-mobile-letter-row>span{display:inline-block!important;line-height:1.12!important;white-space:pre-wrap!important}
.qwerty-mobile-letter-row:has(>span:nth-child(18))>span{font-size:clamp(1.05rem,4.8vw,1.45rem)!important}
.qwerty-mobile-letter-row:has(>span:nth-child(45))>span{font-size:clamp(.82rem,3.4vw,1.05rem)!important}
.qwerty-mobile-word-tooltip [class*="-right-12"]{display:none!important}
.qwerty-mobile-word-tooltip+div,.qwerty-mobile-word-wrap+div{max-width:calc(100vw - 1rem)!important}
.qwerty-mobile-word-panel span.max-w-4xl{max-width:calc(100vw - 1rem)!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important;line-height:1.35!important;font-size:clamp(.92rem,4vw,1.08rem)!important;padding-left:.4rem!important;padding-right:.4rem!important}
.qwerty-mobile-drawer-back{display:inline-flex!important;align-items:center;justify-content:center;border-radius:.65rem;background:rgb(99 102 241);color:white;padding:.45rem .8rem;font-size:1rem;margin-right:.75rem}
footer{display:none!important}
}
@media (max-width:1024px) and (orientation:landscape){
main.flex.h-screen{padding-bottom:calc(env(safe-area-inset-bottom) + 3.5rem)!important}
header.container{padding:.22rem .45rem!important}
header.container>div{flex-direction:row!important;gap:.45rem}
.qwerty-local-title{font-size:1.05rem!important}
.qwerty-local-title img{width:1.85rem!important;height:1.85rem!important}
header nav{width:auto!important;flex:1 1 auto;padding:.25rem!important}
header nav button,header nav a,.qwerty-mobile-keyboard-button,.qwerty-mobile-speak-button,.qwerty-mobile-next-button{min-height:1.9rem!important;height:1.9rem!important}
.qwerty-mobile-word-panel>div:first-child{display:none!important}
.qwerty-mobile-word-panel [class*="text-7xl"],.qwerty-mobile-word-panel [class*="text-8xl"],.qwerty-mobile-word-panel [class*="text-9xl"]{font-size:clamp(1.8rem,8.2vw,3rem)!important}
.qwerty-mobile-gallery>div{padding-top:1rem!important}
}
`)

fs.appendFileSync(path.join(qwerty, 'src/mobile-practice.css'), `
.qwerty-mobile-ipa-entry{display:inline-flex;align-items:center;justify-content:center;min-width:5rem;height:2.25rem;padding:0 .75rem;border-radius:.65rem;color:#fff!important;font-size:.9rem;font-weight:700;text-decoration:none;white-space:nowrap;background:rgb(14 165 233)!important}
.qwerty-mobile-dict-entry{display:inline-flex;align-items:center;justify-content:center;min-width:5rem;height:2.25rem;padding:0 .75rem;border-radius:.65rem;color:#fff!important;font-size:.9rem;font-weight:700;text-decoration:none;white-space:nowrap;background:rgb(16 185 129)!important}
.qwerty-header-dict-link{display:inline-flex;align-items:center;justify-content:center;min-width:3.5rem;height:2.25rem;padding:0 .75rem;border-radius:.65rem;background:rgb(16 185 129);color:#fff!important;font-size:.9rem;font-weight:800;text-decoration:none;white-space:nowrap}
.qwerty-floating-dict-link{position:fixed;right:1rem;bottom:calc(env(safe-area-inset-bottom) + 4.35rem);z-index:90;display:inline-flex;align-items:center;justify-content:center;width:4.2rem;height:4.2rem;border-radius:999px;background:linear-gradient(135deg,#10b981,#22c55e);color:#fff!important;text-decoration:none;font-weight:900;box-shadow:0 12px 30px rgba(16,185,129,.35)}
.qwerty-ipa-page{min-height:100svh;background:#fff;color:#252a4f;padding:calc(env(safe-area-inset-top) + 1.25rem) clamp(1rem,4vw,2rem) 6.5rem;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-x:hidden}
.ipa-home-header,.ipa-title-row,.ipa-heading-row,.ipa-topbar{display:flex;align-items:center;justify-content:space-between;gap:1rem}
.ipa-user{display:flex;align-items:center;gap:.6rem;font-size:1.1rem;font-weight:800}.ipa-user:before{content:"";width:2.8rem;height:2.8rem;border-radius:999px;background:linear-gradient(135deg,#e8f8ff,#ffe8e8)}
.ipa-accent,.ipa-title-row button,.ipa-course-card,.ipa-near-card{border:1px solid #edf0f6;background:#fff;border-radius:999px;box-shadow:0 4px 14px rgba(37,42,79,.06)}
.ipa-accent{padding:.55rem 1rem;font-size:1.05rem;font-weight:800;color:#252a4f}.ipa-title-row{margin:1.8rem 0 2rem}.ipa-title-row h1{font-size:2rem;line-height:1.1;font-weight:900}.ipa-title-row div{display:flex;gap:.6rem;flex-wrap:wrap;justify-content:flex-end}.ipa-title-row button{padding:.55rem .85rem;font-size:.95rem;font-weight:800;color:#25b9e8}
.ipa-board{margin-top:2rem}.ipa-heading-row h2{font-size:1.9rem;font-weight:900}.ipa-heading-row p{font-size:1.05rem;color:#707489}.dot{display:inline-block;width:.6rem;height:.6rem;margin:0 .35rem;border-radius:50%}.dot.green{background:#2ecc71}.dot.orange{background:#f59e0b}.dot.blue{background:#28aeda}.dot.purple{background:#a855f7}
.ipa-row{display:grid;grid-template-columns:5.2rem minmax(0,1fr);gap:.7rem;margin:1.1rem 0;align-items:start}.ipa-row-label{min-height:4.1rem;border:1px solid #edf0f6;border-radius:1.1rem;display:flex;align-items:center;justify-content:center;text-align:center;padding:.45rem;font-size:1.05rem;font-weight:800;box-shadow:0 3px 10px rgba(37,42,79,.05)}
.ipa-symbols{display:grid;grid-template-columns:repeat(auto-fill,minmax(3.65rem,1fr));gap:.7rem}.ipa-symbol-tile{height:4.1rem;border:1px solid #edf0f6;border-radius:1rem;background:#fff;font-size:1.55rem;font-weight:900;box-shadow:0 3px 10px rgba(37,42,79,.05)}.ipa-symbol-tile.green{color:#2ecc71}.ipa-symbol-tile.orange{color:#f59e0b}.ipa-symbol-tile.blue{color:#28aeda}.ipa-symbol-tile.purple{color:#a855f7}
.ipa-tabbar{position:fixed;left:0;right:0;bottom:0;z-index:20;display:grid;grid-template-columns:repeat(5,1fr);gap:.2rem;padding:.6rem .75rem calc(env(safe-area-inset-bottom) + .6rem);background:rgba(255,255,255,.96);border-top:1px solid #eef1f5;text-align:center;color:#a0a6b8}.ipa-tabbar b{color:#29bfe9}
.ipa-detail{padding-bottom:7.5rem}.ipa-topbar{margin-bottom:1.3rem}.ipa-topbar h1{font-size:1.65rem;font-weight:900}.ipa-back{width:2.5rem;height:2.5rem;border:0;background:transparent;font-size:3rem;line-height:1;color:#252a4f}
.ipa-hero-card{border:1px solid #edf0f6;border-radius:1.6rem;min-height:12rem;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.6rem;box-shadow:0 5px 16px rgba(37,42,79,.06)}.ipa-big{font-size:4rem;font-weight:900}.ipa-actions{display:flex;gap:1.2rem}.ipa-actions button{width:4rem;height:3.6rem;border-radius:1.1rem;border:1px solid #edf0f6;font-size:1.7rem;box-shadow:0 4px 10px rgba(37,42,79,.08)}.ipa-sound-main{background:#ffc21a!important}.ipa-mic{background:#fff!important}
.ipa-section{margin-top:2rem}.ipa-section-title{display:flex;align-items:center;gap:.55rem;margin-bottom:1rem;font-size:1.35rem;font-weight:900}.ipa-section-title span{width:.62rem;height:.62rem;border-radius:999px;background:#29bfe9}.ipa-video-card{height:12rem;border:1px solid #2b3142;border-radius:.35rem;background:linear-gradient(110deg,#3777e6 0 58%,#fff 58%);display:flex;align-items:center;justify-content:space-around;color:#fff}.ipa-video-card strong{font-size:3.4rem}.ipa-video-card button{width:3.6rem;height:3.6rem;border:0;border-radius:999px;background:rgba(37,42,79,.55);color:white;font-size:1.5rem}
.ipa-course-card{width:100%;margin-top:1.2rem;padding:1rem;display:flex;align-items:center;gap:.75rem;text-align:left;font-size:1.3rem;font-weight:900;color:#25b9e8;border-radius:1.1rem}.ipa-course-card small{display:block;flex:1;color:#9ba1b4;font-size:.95rem;font-weight:600}.ipa-course-card b{font-size:2rem;color:#c5cad5}
.ipa-tips{padding-left:1.25rem;color:#8b90a2;font-size:1.05rem;line-height:1.8}.ipa-near-card{width:min(13rem,100%);min-height:7.5rem;border-radius:1.2rem;display:flex;align-items:center;justify-content:space-around;font-size:2.4rem}.ipa-near-card span{font-size:1.4rem}.ipa-combo-note{color:#9ba1b4;margin-top:-.4rem;margin-bottom:1rem}.ipa-example-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.ipa-example-card{position:relative;min-height:8rem;border:1px solid #edf0f6;border-radius:1.25rem;padding:1.1rem;box-shadow:0 4px 12px rgba(37,42,79,.05)}.ipa-example-card b{display:block;font-size:1.45rem;color:#252a4f}.ipa-example-card em{display:block;margin-top:.55rem;color:#9ba1b4;font-size:1.15rem;font-style:normal}.ipa-example-card button{position:absolute;right:.8rem;bottom:.8rem;width:2.7rem;height:2.7rem;border:0;border-radius:999px;background:#f7fbff;color:#29bfe9;box-shadow:0 4px 10px rgba(37,42,79,.08)}
.ipa-bottom-bar{position:fixed;left:0;right:0;bottom:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.75rem 1.2rem calc(env(safe-area-inset-bottom) + .75rem);background:rgba(255,255,255,.97);border-top:1px solid #eef1f5}.ipa-bottom-bar div{min-width:8rem;color:#25b9e8}.ipa-bottom-bar b{font-size:1.35rem;margin-left:.35rem}.ipa-bottom-bar i{display:block;width:7rem;height:.7rem;margin-top:.45rem;border-radius:999px;background:#eef0f5}.ipa-bottom-bar button{border:0;border-radius:1.1rem;background:#43c6ef;color:#fff;font-size:1.25rem;font-weight:900;padding:1rem 1.5rem;box-shadow:0 .25rem 0 #22aede}
@media (max-width:520px){.qwerty-mobile-ipa-entry{min-width:4.4rem;height:2.05rem;font-size:.78rem;padding:0 .55rem}.qwerty-floating-dict-link{right:.85rem;bottom:calc(env(safe-area-inset-bottom) + 4rem);width:3.7rem;height:3.7rem;font-size:.95rem}.qwerty-ipa-page{padding-left:.9rem;padding-right:.9rem}.ipa-title-row{align-items:flex-start}.ipa-title-row h1{font-size:1.75rem}.ipa-title-row div{max-width:9rem}.ipa-row{grid-template-columns:4.8rem minmax(0,1fr);gap:.55rem}.ipa-row-label{min-height:3.7rem;font-size:.95rem}.ipa-symbols{grid-template-columns:repeat(auto-fill,minmax(3.15rem,1fr));gap:.55rem}.ipa-symbol-tile{height:3.7rem;font-size:1.35rem}.ipa-heading-row h2{font-size:1.65rem}.ipa-heading-row p{font-size:.9rem}.ipa-example-grid{gap:.75rem}.ipa-example-card{min-height:7.2rem;padding:.9rem}.ipa-video-card{height:10rem}.ipa-big{font-size:3.4rem}}
@media (min-width:900px){.qwerty-ipa-page{max-width:56rem;margin:0 auto}.ipa-symbols{grid-template-columns:repeat(auto-fill,minmax(4.2rem,1fr))}}
`)

fs.appendFileSync(path.join(qwerty, 'src/mobile-practice.css'), `
.qwerty-dictionary-page{min-height:100svh;background:#f7f8fc;color:#22284a;padding:calc(env(safe-area-inset-top) + 1rem) clamp(.9rem,4vw,1.5rem) 3rem;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.dict-topbar{display:grid;grid-template-columns:2.6rem 1fr auto;gap:.8rem;align-items:center;margin-bottom:1rem}.dict-back{width:2.4rem;height:2.4rem;border-radius:999px;background:#fff;color:#22284a;text-decoration:none;font-size:2.8rem;line-height:2rem;text-align:center;box-shadow:0 4px 16px rgba(31,41,55,.08)}.dict-topbar h1{margin:0;font-size:1.7rem;font-weight:900}.dict-topbar p{margin:.1rem 0 0;color:#858ca3}.dict-ipa-link{border-radius:999px;background:#eef6ff;color:#2563eb;padding:.55rem .85rem;text-decoration:none;font-weight:800}
.dict-search-card{background:#fff;border-radius:1.2rem;padding:1rem;box-shadow:0 10px 30px rgba(31,41,55,.08)}.dict-search-card label span{display:block;margin-bottom:.45rem;font-weight:800;color:#4b5270}.dict-search-card input{width:100%;height:3.1rem;border:1px solid #dce2f0;border-radius:.9rem;padding:0 .9rem;font-size:1rem;outline:none}.dict-search-card input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.12)}
.dict-hot-row{display:flex;gap:.45rem;overflow-x:auto;padding:.8rem 0 .25rem}.dict-hot-row button{flex:0 0 auto;border:0;border-radius:999px;background:#eef2ff;color:#4f46e5;padding:.45rem .75rem;font-weight:800}.dict-counts{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:.35rem .5rem;align-items:baseline;margin-top:.65rem;color:#81889d}.dict-counts b{font-size:1.35rem;color:#111827}
.dict-section{margin-top:1.35rem}.dict-section-title{margin-bottom:.7rem;font-size:1.2rem;font-weight:900}.dict-book-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}.dict-book-grid button{min-height:5.2rem;border:1px solid #edf0f6;border-radius:1rem;background:#fff;padding:.8rem;text-align:left;box-shadow:0 5px 18px rgba(31,41,55,.06)}.dict-book-grid button.active{border-color:#34d399;background:#ecfdf5}.dict-book-grid strong{display:block;font-size:1rem;line-height:1.25}.dict-book-grid span{display:block;margin-top:.45rem;color:#858ca3}.dict-child-books{display:flex;gap:.55rem;overflow-x:auto;padding:.8rem 0}.dict-child-books span{flex:0 0 auto;border-radius:999px;background:#fff;border:1px solid #edf0f6;padding:.48rem .7rem;color:#4b5270}.dict-child-books small{margin-left:.35rem;color:#10b981}
.dict-loading{border-radius:1rem;background:#fff;padding:1.2rem;text-align:center;color:#858ca3}.dict-result-list{display:grid;gap:.8rem}.dict-word-card{display:grid;grid-template-columns:1fr 2.7rem;gap:.4rem .7rem;background:#fff;border-radius:1rem;padding:1rem;box-shadow:0 6px 20px rgba(31,41,55,.06)}.dict-word-card h2{margin:0;font-size:1.45rem;color:#111827;overflow-wrap:anywhere}.dict-word-card p{margin:0}.dict-word-card div p{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.35rem;color:#6b7280}.dict-word-card button{grid-column:2;grid-row:1;border:0;border-radius:999px;background:#eef6ff;color:#0ea5e9;font-size:1.25rem}.dict-translation{grid-column:1 / -1;color:#374151;line-height:1.55;overflow-wrap:anywhere}.dict-word-card footer{grid-column:1 / -1;display:flex;gap:.55rem;color:#9ca3af;font-size:.85rem}
@media (max-width:520px){.qwerty-mobile-dict-entry{min-width:4.4rem;height:2.05rem;font-size:.78rem;padding:0 .55rem}.dict-book-grid{grid-template-columns:1fr}.dict-topbar h1{font-size:1.45rem}.dict-topbar p{font-size:.85rem}}
@media (min-width:900px){.qwerty-dictionary-page{max-width:58rem;margin:0 auto}.dict-book-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
`)

fs.appendFileSync(path.join(qwerty, 'src/mobile-practice.css'), `
.qwerty-ipa-page{font-size:18px!important}
.ipa-title-row h1{font-size:2.45rem!important}.ipa-heading-row h2{font-size:2.25rem!important}.ipa-heading-row p{font-size:1.22rem!important}
.ipa-row{grid-template-columns:6.2rem minmax(0,1fr)!important;gap:.9rem!important}.ipa-row-label{min-height:5rem!important;font-size:1.25rem!important;border-radius:1.25rem!important}
.ipa-symbols{grid-template-columns:repeat(auto-fill,minmax(4.55rem,1fr))!important;gap:.85rem!important}.ipa-symbol-tile{height:5rem!important;font-size:2.05rem!important;border-radius:1.2rem!important}
.ipa-topbar h1{font-size:2.05rem!important}.ipa-back{font-size:3.4rem!important}.ipa-hero-card{min-height:14rem!important}.ipa-big{font-size:5.4rem!important}
.ipa-actions button{width:4.8rem!important;height:4.35rem!important;font-size:2rem!important}.ipa-section-title{font-size:1.65rem!important}.ipa-tips{font-size:1.28rem!important;line-height:1.9!important}
.ipa-near-card{font-size:3rem!important}.ipa-video-card strong{font-size:4.15rem!important}.ipa-course-card{font-size:1.55rem!important}.ipa-course-card small{font-size:1.12rem!important}
.ipa-example-card b{font-size:1.75rem!important}.ipa-example-card em{font-size:1.35rem!important}.ipa-example-card button{width:3.15rem!important;height:3.15rem!important;font-size:1.45rem!important}
@media (max-width:520px){.qwerty-ipa-page{font-size:17px!important}.ipa-title-row h1{font-size:2.1rem!important}.ipa-heading-row h2{font-size:1.95rem!important}.ipa-heading-row p{font-size:1.02rem!important}.ipa-row{grid-template-columns:5.35rem minmax(0,1fr)!important;gap:.68rem!important}.ipa-row-label{min-height:4.45rem!important;font-size:1.08rem!important}.ipa-symbols{grid-template-columns:repeat(auto-fill,minmax(3.72rem,1fr))!important;gap:.65rem!important}.ipa-symbol-tile{height:4.45rem!important;font-size:1.75rem!important}.ipa-topbar h1{font-size:1.9rem!important}.ipa-hero-card{min-height:13rem!important}.ipa-big{font-size:4.65rem!important}.ipa-section-title{font-size:1.48rem!important}.ipa-tips{font-size:1.15rem!important}.ipa-example-card b{font-size:1.55rem!important}.ipa-example-card em{font-size:1.22rem!important}}
`)

buildDictionaryData()
run('npm', ['install', '--ignore-scripts'], qwerty)
run('npm', ['run', 'build'], qwerty)
fs.rmSync(target, { recursive: true, force: true })
fs.cpSync(path.join(qwerty, 'build'), target, { recursive: true })
write(path.join(target, 'service-worker.js'), `self.addEventListener('install', event => { self.skipWaiting() })
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).then(() => self.clients.claim())) })
self.addEventListener('fetch', event => { event.respondWith(fetch(event.request)) })
`)
console.log(`Published original Qwerty Learner build with ${fs.readdirSync(path.join(target, 'dicts')).length} dictionary files.`)
