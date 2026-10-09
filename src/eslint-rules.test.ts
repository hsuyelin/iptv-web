import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const eslint = new ESLint({ cwd: process.cwd() })

async function violations(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath })
  return (result?.messages ?? []).filter((m) => m.ruleId === 'no-restricted-syntax').map((m) => m.message)
}

const BANNED = [
  "document.querySelector('#x')",
  "document.querySelectorAll('div')",
  "document.getElementById('x')",
  "document.getElementsByClassName('x')",
  "document.createElement('div')",
  'parent.appendChild(child)',
  "node.innerHTML = '<b>x</b>'",
  "node.textContent = 'x'",
]

describe('declarative rendering rule', () => {
  it.each(BANNED)('rejects %s in application code', async (snippet) => {
    const found = await violations(`export const f = (node: any, parent: any, child: any) => { ${snippet} }\n`, 'src/features/channels/Probe.ts')
    expect(found.length).toBeGreaterThan(0)
  })

  it('rejects dangerouslySetInnerHTML', async () => {
    const found = await violations('export const A = () => <div dangerouslySetInnerHTML={{ __html: "x" }} />\n', 'src/features/channels/Probe.tsx')
    expect(found).toEqual(['Do not inject HTML.'])
  })

  it('allows the same calls inside the playback adapter', async () => {
    const code = "export const f = (video: HTMLVideoElement) => { video.removeAttribute('src'); document.querySelector('video') }\n"
    expect(await violations(code, 'src/features/player/playback/probe.ts')).toEqual([])
  })

  it('accepts ordinary component code', async () => {
    const code = 'export const A = () => <p>hello</p>\n'
    expect(await violations(code, 'src/features/channels/Probe.tsx')).toEqual([])
  })
})
