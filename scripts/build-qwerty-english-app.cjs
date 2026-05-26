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
