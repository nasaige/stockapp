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

write(path.join(qwerty, 'src/components/Header/index.tsx'), `import logo from '@/assets/logo.svg'
import type { PropsWithChildren } from 'react'
import type React from 'react'
const Header: React.FC<PropsWithChildren> = ({ children }) => {
  return <header className="container z-20 mx-auto w-full px-10 py-6"><div className="flex w-full flex-col items-center justify-between space-y-3 lg:flex-row lg:space-y-0"><div className="qwerty-local-title flex items-center text-2xl font-bold text-indigo-500 no-underline lg:text-4xl"><img src={logo} className="mr-3 h-16 w-16" alt="Qwerty Learner Logo" /><h1>Qwerty Learner</h1></div><nav className="my-card on element flex w-auto content-center items-center justify-end space-x-3 rounded-xl bg-white p-4 transition-colors duration-300 dark:bg-gray-800">{children}</nav></div></header>
}
export default Header
`)
write(path.join(qwerty, 'src/components/Footer/index.tsx'), `const Footer = () => null
export default Footer
`)

replace('vite.config.ts', "return getLastCommit((err, commit) => (err ? 'unknown' : resolve(commit.shortHash)))", "return getLastCommit((err, commit) => resolve(err ? 'unknown' : commit.shortHash))")
replace('src/index.tsx', "import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'", "import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'")
replace('src/index.tsx', "import MobilePage from './pages/Mobile'\n", '')
replace('src/index.tsx', "import { FriendLinks } from './pages/FriendLinks'\n", '')
replace('src/index.tsx', "import './index.css'", "import './index.css'\nimport './mobile-practice.css'")
replace('src/index.tsx', "<BrowserRouter basename={REACT_APP_DEPLOY_ENV === 'pages' ? '/qwerty-learner' : ''}>", '<HashRouter>')
replace('src/index.tsx', '</BrowserRouter>', '</HashRouter>')
replace('src/index.tsx', /  const \[isMobile, setIsMobile\][\s\S]*?  }, \[\]\)\n\n/, '')
replace('src/index.tsx', ", lazy, useEffect, useState } from 'react'", ", lazy, useEffect } from 'react'")
replace('src/index.tsx', /\s*\{isMobile \? \([\s\S]*?<Route path="\/mobile" element=\{<MobilePage \/>\} \/>/, `
            <Route index element={<TypingPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/error-book" element={<ErrorBook />} />
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

  const skipWord = useCallback(() => {
    dispatch({ type: TypingStateActionType.SKIP_WORD })
  }, [dispatch])
`)
replace('src/pages/Typing/index.tsx', `          <StartButton isLoading={isLoading} />
          <Tooltip content="跳过该词">`, `          <StartButton isLoading={isLoading} />
          <button type="button" className="qwerty-mobile-keyboard-button my-btn-primary hidden" onClick={focusMobileKeyboard}>打开键盘</button>
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

  const [isShowTranslation, setIsHoveringTranslation] = useState(false)`)
replace('src/pages/Typing/components/WordPanel/index.tsx', '<div className="container flex h-full w-full flex-col items-center justify-center">', '<div className="container qwerty-mobile-word-panel flex h-full w-full flex-col items-center justify-center" onPointerDown={startTypingByTouch}>')
replace('src/pages/Typing/components/WordPanel/index.tsx', '按任意键{state.timerData.time ? \'继续\' : \'开始\'}', "{window.innerWidth <= 1024 ? '点屏幕或打开键盘' : '按任意键'}{state.timerData.time ? '继续' : '开始'}")
replace('src/pages/Typing/components/WordPanel/components/Word/index.tsx', 'className="flex flex-col items-center justify-center pb-1 pt-4"', 'className="qwerty-mobile-word-wrap flex flex-col items-center justify-center pb-1 pt-4"')
replace('src/pages/Typing/components/WordPanel/components/Word/index.tsx', 'className={`tooltip-info relative w-fit bg-transparent p-0 leading-normal shadow-none dark:bg-transparent ${', 'className={`qwerty-mobile-word-tooltip tooltip-info relative w-fit bg-transparent p-0 leading-normal shadow-none dark:bg-transparent ${')
replace('src/pages/Typing/components/WordPanel/components/Word/index.tsx', 'className={`flex items-center ${isTextSelectable && \'select-all\'} justify-center ${wordState.hasWrong ? style.wrong : \'\'}`}', 'className={`qwerty-mobile-letter-row flex items-center ${isTextSelectable && \'select-all\'} justify-center ${wordState.hasWrong ? style.wrong : \'\'}`}')

replace('src/pages/Typing/components/WordPanel/components/TextAreaHandler/index.tsx', '  const { state } = useContext(TypingContext)!', '  const { state, dispatch } = useContext(TypingContext)!')
replace('src/pages/Typing/components/WordPanel/components/TextAreaHandler/index.tsx', "import { TypingContext } from '@/pages/Typing/store'", "import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'")
replace('src/pages/Typing/components/WordPanel/components/TextAreaHandler/index.tsx', `  const onBlur = useCallback(() => {
    if (!textareaRef.current) return

    if (state.isTyping) {
      textareaRef.current.focus()
    }
  }, [state.isTyping])
`, `  const onBlur = useCallback(() => {
    if (!textareaRef.current) return
    if (state.isTyping) textareaRef.current.focus()
  }, [state.isTyping])

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
.qwerty-mobile-keyboard-button{display:inline-flex!important;align-items:center;justify-content:center;min-width:4.7rem!important;height:2.1rem!important;padding:0 .65rem!important;font-size:.82rem!important;white-space:nowrap}
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
footer{display:none!important}
}
@media (max-width:1024px) and (orientation:landscape){
main.flex.h-screen{padding-bottom:calc(env(safe-area-inset-bottom) + 3.5rem)!important}
header.container{padding:.22rem .45rem!important}
header.container>div{flex-direction:row!important;gap:.45rem}
.qwerty-local-title{font-size:1.05rem!important}
.qwerty-local-title img{width:1.85rem!important;height:1.85rem!important}
header nav{width:auto!important;flex:1 1 auto;padding:.25rem!important}
header nav button,header nav a,.qwerty-mobile-keyboard-button{min-height:1.9rem!important;height:1.9rem!important}
.qwerty-mobile-word-panel>div:first-child{display:none!important}
.qwerty-mobile-word-panel [class*="text-7xl"],.qwerty-mobile-word-panel [class*="text-8xl"],.qwerty-mobile-word-panel [class*="text-9xl"]{font-size:clamp(1.8rem,8.2vw,3rem)!important}
.qwerty-mobile-gallery>div{padding-top:1rem!important}
}
`)

run('npm', ['install', '--ignore-scripts'], qwerty)
run('npm', ['run', 'build'], qwerty)
fs.rmSync(target, { recursive: true, force: true })
fs.cpSync(path.join(qwerty, 'build'), target, { recursive: true })
write(path.join(target, 'service-worker.js'), `self.addEventListener('install', event => { self.skipWaiting() })
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).then(() => self.clients.claim())) })
self.addEventListener('fetch', event => { event.respondWith(fetch(event.request)) })
`)
console.log(`Published original Qwerty Learner build with ${fs.readdirSync(path.join(target, 'dicts')).length} dictionary files.`)
