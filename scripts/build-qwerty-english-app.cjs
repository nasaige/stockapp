const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const root = process.cwd()
const work = path.join(root, '.qwerty-build')
const qwerty = path.join(work, 'qwerty-learner')
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

fs.rmSync(work, { recursive: true, force: true })
fs.mkdirSync(work, { recursive: true })
run('git', ['clone', '--depth=1', 'https://github.com/RealKai42/qwerty-learner.git', qwerty])

replace(
  'vite.config.ts',
  "return getLastCommit((err, commit) => (err ? 'unknown' : resolve(commit.shortHash)))",
  "return getLastCommit((err, commit) => resolve(err ? 'unknown' : commit.shortHash))",
)
replace('src/index.tsx', "import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'", "import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'")
replace('src/index.tsx', "import MobilePage from './pages/Mobile'\n", '')
replace('src/index.tsx', "import './index.css'", "import './index.css'\nimport './mobile-practice.css'")
replace('src/index.tsx', "<BrowserRouter basename={REACT_APP_DEPLOY_ENV === 'pages' ? '/qwerty-learner' : ''}>", '<HashRouter>')
replace('src/index.tsx', '</BrowserRouter>', '</HashRouter>')
replace(
  'src/index.tsx',
  `  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600)

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 600
      if (!isMobile) {
        window.location.href = '/'
      }
      setIsMobile(isMobile)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

`,
  '',
)
replace('src/index.tsx', ", lazy, useEffect, useState } from 'react'", ", lazy, useEffect } from 'react'")
replace(
  'src/index.tsx',
  `            {isMobile ? (
              <Route path="/*" element={<Navigate to="/mobile" />} />
            ) : (
              <>
                <Route index element={<TypingPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/analysis" element={<AnalysisPage />} />
                <Route path="/error-book" element={<ErrorBook />} />
                <Route path="/friend-links" element={<FriendLinks />} />
                <Route path="/*" element={<Navigate to="/" />} />
              </>
            )}
            <Route path="/mobile" element={<MobilePage />} />`,
  `            <Route index element={<TypingPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/error-book" element={<ErrorBook />} />
            <Route path="/friend-links" element={<FriendLinks />} />
            <Route path="/*" element={<Navigate to="/" />} />`,
)
replace('src/resources/dictionary.ts', /url: '\/dicts\//g, "url: './dicts/")
replace(
  'src/pages/Typing/index.tsx',
  `  useEffect(() => {
    // 检测用户设备
    if (!IsDesktop()) {
      setTimeout(() => {
        alert(
          ' Qwerty Learner 目的为提高键盘工作者的英语输入效率，目前暂未适配移动端，希望您使用桌面端浏览器访问。如您使用的是 Ipad 等平板电脑设备，可以使用外接键盘使用本软件。',
        )
      }, 500)
    }
  }, [])

`,
  '',
)
replace('src/pages/Typing/index.tsx', "import { IsDesktop, isLegal } from '@/utils'", "import { isLegal } from '@/utils'")
replace(
  'src/pages/Typing/index.tsx',
  '<div className="container mx-auto flex h-full flex-1 flex-col items-center justify-center pb-5">',
  '<div className="container qwerty-mobile-practice mx-auto flex h-full flex-1 flex-col items-center justify-center pb-5">',
)
replace(
  'src/pages/Typing/components/WordPanel/index.tsx',
  '  const [isShowTranslation, setIsHoveringTranslation] = useState(false)',
  `  const startTypingByTouch = useCallback(() => {
    if (!state.isTyping) {
      dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: true })
      requestAnimationFrame(() => {
        document.querySelector<HTMLTextAreaElement>('textarea[data-mobile-typing-input="true"]')?.focus()
      })
      window.setTimeout(() => {
        document.querySelector<HTMLTextAreaElement>('textarea[data-mobile-typing-input="true"]')?.focus()
      }, 80)
    }
  }, [dispatch, state.isTyping])

  const [isShowTranslation, setIsHoveringTranslation] = useState(false)`,
)
replace(
  'src/pages/Typing/components/WordPanel/index.tsx',
  '<div className="container flex h-full w-full flex-col items-center justify-center">',
  '<div className="container qwerty-mobile-word-panel flex h-full w-full flex-col items-center justify-center" onPointerDown={startTypingByTouch}>',
)
replace(
  'src/pages/Typing/components/WordPanel/index.tsx',
  '按任意键{state.timerData.time ? \'继续\' : \'开始\'}',
  "{window.innerWidth <= 640 ? '点屏幕或下方输入框' : '按任意键'}{state.timerData.time ? '继续' : '开始'}",
)
replace(
  'src/pages/Typing/components/WordPanel/components/TextAreaHandler/index.tsx',
  '  const { state } = useContext(TypingContext)!',
  '  const { state, dispatch } = useContext(TypingContext)!',
)
replace(
  'src/pages/Typing/components/WordPanel/components/TextAreaHandler/index.tsx',
  "import { TypingContext } from '@/pages/Typing/store'",
  "import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'",
)
replace(
  'src/pages/Typing/components/WordPanel/components/TextAreaHandler/index.tsx',
  `  const onBlur = useCallback(() => {
    if (!textareaRef.current) return

    if (state.isTyping) {
      textareaRef.current.focus()
    }
  }, [state.isTyping])
`,
  `  const onBlur = useCallback(() => {
    if (!textareaRef.current) return

    if (state.isTyping) {
      textareaRef.current.focus()
    }
  }, [state.isTyping])

  const onFocus = useCallback(() => {
    if (!state.isTyping) {
      dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: true })
    }
  }, [dispatch, state.isTyping])
`,
)
replace(
  'src/pages/Typing/components/WordPanel/components/TextAreaHandler/index.tsx',
  '      className="absolute left-0 top-0 m-0 h-0 w-0 appearance-none overflow-hidden border-0 p-0 focus:outline-none"',
  '      className="absolute left-0 top-0 m-0 h-0 w-0 appearance-none overflow-hidden border-0 p-0 focus:outline-none max-sm:fixed max-sm:bottom-[calc(env(safe-area-inset-bottom)+10px)] max-sm:left-4 max-sm:z-[9999] max-sm:h-12 max-sm:w-[calc(100vw-2rem)] max-sm:rounded-xl max-sm:border max-sm:border-indigo-300 max-sm:bg-white/90 max-sm:px-3 max-sm:text-base max-sm:text-transparent max-sm:caret-indigo-500 max-sm:shadow-lg dark:max-sm:bg-gray-900/90"',
)
replace(
  'src/pages/Typing/components/WordPanel/components/TextAreaHandler/index.tsx',
  `      ref={textareaRef}
      autoFocus
      spellCheck="false"
      onInput={onInput}
      onBlur={onBlur}
      onCompositionStart={() => {
        alert('您正在使用输入法，请关闭输入法。')
      }}
    ></textarea>`,
  `      ref={textareaRef}
      data-mobile-typing-input="true"
      autoFocus
      spellCheck="false"
      autoCapitalize="none"
      autoCorrect="off"
      onFocus={onFocus}
      onInput={onInput}
      onBlur={onBlur}
      onCompositionStart={() => {
        if (window.innerWidth > 640) alert('您正在使用输入法，请关闭输入法。')
      }}
    ></textarea>`,
)

write(
  path.join(qwerty, 'src/mobile-practice.css'),
  `@media (max-width: 640px) {
  html, body, #root {
    min-height: 100%;
    width: 100%;
    overflow-x: hidden;
  }

  body {
    touch-action: manipulation;
  }

  main.flex.h-screen {
    min-height: 100dvh;
    height: 100dvh;
    padding-bottom: calc(env(safe-area-inset-bottom) + 4rem);
  }

  header.container {
    padding: 0.75rem 0.75rem 0.5rem !important;
  }

  header.container > div {
    gap: 0.625rem;
  }

  header a {
    font-size: 1.85rem !important;
    line-height: 1.1 !important;
    justify-content: center;
  }

  header a img {
    width: 3.25rem !important;
    height: 3.25rem !important;
  }

  header nav {
    width: 100% !important;
    max-width: 100%;
    overflow-x: auto;
    justify-content: flex-start !important;
    padding: 0.75rem !important;
    border-radius: 0.875rem !important;
    -webkit-overflow-scrolling: touch;
  }

  header nav > * {
    flex: 0 0 auto;
  }

  .qwerty-mobile-practice {
    padding-left: 0.5rem !important;
    padding-right: 0.5rem !important;
    padding-bottom: 0 !important;
    justify-content: flex-start !important;
  }

  .qwerty-mobile-word-panel {
    min-height: 52dvh;
    justify-content: flex-start !important;
    padding-top: 0.5rem;
  }

  .qwerty-mobile-word-panel > div:first-child {
    height: 2.5rem !important;
    padding-left: 0.75rem !important;
    padding-right: 0.75rem !important;
    padding-top: 0.5rem !important;
  }

  .qwerty-mobile-word-panel > div:nth-child(2) {
    flex-grow: 0 !important;
    min-height: 19rem;
    justify-content: center !important;
  }

  .qwerty-mobile-word-panel p {
    font-size: 1rem;
  }

  .qwerty-mobile-word-panel [class*="text-7xl"],
  .qwerty-mobile-word-panel [class*="text-8xl"],
  .qwerty-mobile-word-panel [class*="text-9xl"] {
    font-size: clamp(2.8rem, 16vw, 4.6rem) !important;
    line-height: 1.05 !important;
  }

  footer {
    display: none !important;
  }
}
`,
)

run('npm', ['install', '--ignore-scripts'], qwerty)
run('npm', ['run', 'build'], qwerty)

fs.rmSync(target, { recursive: true, force: true })
fs.cpSync(path.join(qwerty, 'build'), target, { recursive: true })
write(
  path.join(target, 'service-worker.js'),
  `self.addEventListener('install', event => { self.skipWaiting() })
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', event => { event.respondWith(fetch(event.request)) })
`,
)

console.log(`Published original Qwerty Learner build with ${fs.readdirSync(path.join(target, 'dicts')).length} dictionary files.`)
