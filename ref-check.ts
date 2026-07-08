#!/usr/bin/env -S node --experimental-strip-types
// @ref LLP 0000#6-validation-ref-check — implements the checker specified there
/**
 * ref-check — deterministic validator for LLP corpora and `@ref` annotations.
 *
 * Usage:
 *   ref-check [--root DIR] [--verbose]
 *
 * Checks (broken = exit 1):
 *   * `@ref` targets resolve: LLP numbers, anchors, repo paths. URLs are
 *     shape-validated only (never fetched); shorthands are listed as
 *     unchecked unless the project defines a mapping.
 *   * LLP metadata headers parse; filename type matches **Type:**;
 *     LLP numbers are unique across the tree (tombstones included).
 *   * No [inferred] claim survives in an Accepted/Active document.
 *
 * Judgment calls (stale glosses, drift, orphaned annotations) are
 * deliberately not gated — that is interactive work for llp-maintain.
 * Directories containing their own llp/ are separate corpus roots and are
 * skipped; check them with --root. llp/tombstones/ and llp/reviews/ are
 * exempt from ref validation.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as process from 'node:process'

const SKIP_DIRS = new Set([
    '.git',
    '.hg',
    'node_modules',
    '__pycache__',
    '.venv',
    'venv',
    'dist',
    'build',
    '.next',
    '.idea',
    '.vscode'
])

const REQUIRED_FIELDS = ['Type', 'Status', 'Systems', 'Author', 'Date'] as const
const GATED_STATUSES = new Set(['accepted', 'active'])
const MAX_BYTES = 2_000_000

// Built by concatenation so this file doesn't match its own scan patterns.
const REF_MARK = '@' + 'ref'
const CODE_REF_RE = new RegExp(escapeRegExp(REF_MARK) + '\\s+(.+)')
const MD_REF_RE = new RegExp('<!--\\s*' + escapeRegExp(REF_MARK) + '\\s+(.+?)-->', 'gs')
const LLP_TARGET_RE = /^LLP\s+(\d{1,4})(?:#(\S+))?$/
const SHORTHAND_RE = /^[A-Z][A-Z0-9_]*(?:#\S+)?$/
const URL_RE = /^https?:\/\/[^\s/]+\.[^\s/]+\S*$/
const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/
const LLP_FILE_RE = /^(\d{4})-[a-z0-9-]+\.([a-z0-9]+)\.md$/
const FIELD_RE = /^\*\*(\w+):\*\*\s*(.+)$/
const INFERRED = '[' + 'inferred]'

type RefKind = 'llp' | 'url' | 'shorthand' | 'path'

interface ParseTargetResult {
    kind: RefKind
    target: string
    anchor: string | null
}

class Report {
    errors: string[] = []
    infos: string[] = []

    error(msg: string): void {
        this.errors.push(msg)
    }

    info(msg: string): void {
        this.infos.push(msg)
    }
}

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function slugify(text: string): string {
    // GitHub-style heading slug: lowercase; spaces -> hyphens; keep
    // alphanumerics, hyphens, underscores; drop everything else.
    text = text.replace(/`/g, '')
    const out: string[] = []
    for (const ch of text.trim().toLowerCase()) {
        if (/^[a-z0-9]$/.test(ch) || ch === '-' || ch === '_') {
            out.push(ch)
        } else if (ch === ' ' || ch === '\t') {
            out.push('-')
        }
    }
    return out.join('')
}

function readText(filePath: string): string | null {
    try {
        const st = fs.statSync(filePath)
        if (st.size > MAX_BYTES) return null
        return fs.readFileSync(filePath, 'utf8')
    } catch {
        return null
    }
}

function mdHeadings(text: string): string[] {
    // Heading texts outside fenced code blocks.
    const headings: string[] = []
    let fenced = false
    for (const line of text.split(/\r?\n/)) {
        if (line.trimStart().startsWith('```')) {
            fenced = !fenced
            continue
        }
        if (fenced) continue
        const m = line.match(HEADING_RE)
        if (m) headings.push(m[2])
    }
    return headings
}

function anchorResolves(anchor: string, headings: string[]): boolean {
    const raw = anchor.replace(/^#/, '')
    const slugs = new Set(headings.map((h) => slugify(h)))

    if (slugs.has(raw.toLowerCase())) return true

    if (/^\d+(\.\d+)*$/.test(raw)) {
        // numbered-section form: #3, #3.2
        return headings.some((h) => new RegExp(`^${escapeRegExp(raw)}([.)\\s]|$)`).test(h))
    }
    return false
}

function parseTarget(restRaw: string): ParseTargetResult {
    // Split an annotation body into (kind, target, anchor).
    let rest = restRaw.trim()
    rest = rest.split(/\s+[—–]|\s+--\s/)[0]?.trim() ?? '' // drop gloss
    rest = rest.replace(/\s*\[[a-z-]+\]\s*$/, '') // drop [relation]

    const llp = rest.match(LLP_TARGET_RE)
    if (llp) {
        return { kind: 'llp', target: llp[1], anchor: llp[2] ?? null }
    }

    const parts = rest.split(/\s+/).filter(Boolean)
    const token = parts.length > 0 ? parts[0] : ''

    if (token.startsWith('http://') || token.startsWith('https://')) {
        return { kind: 'url', target: token, anchor: null }
    }

    if (SHORTHAND_RE.test(token)) {
        return { kind: 'shorthand', target: token, anchor: null }
    }

    const hashIdx = token.indexOf('#')
    if (hashIdx >= 0) {
        const p = token.slice(0, hashIdx)
        const a = token.slice(hashIdx + 1)
        return { kind: 'path', target: p, anchor: a || null }
    }
    return { kind: 'path', target: token, anchor: null }
}

function collectRefs(relPath: string, text: string): Array<{ lineno: number; rest: string }> {
    const refs: Array<{ lineno: number; rest: string }> = []

    if (relPath.endsWith('.md')) {
        MD_REF_RE.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = MD_REF_RE.exec(text)) !== null) {
            const upto = text.slice(0, m.index)
            const lineno = upto.split(/\r?\n/).length
            refs.push({ lineno, rest: m[1] })
        }
    } else {
        const lines = text.split(/\r?\n/)
        for (let i = 0; i < lines.length; i++) {
            const m = lines[i].match(CODE_REF_RE)
            if (m) refs.push({ lineno: i + 1, rest: m[1] })
        }
    }

    return refs
}

function walkFiles(root: string, skipReviewsAtRoot = false): string[] {
    const out: string[] = []

    function walk(dir: string): void {
        let entries: fs.Dirent[]
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true })
        } catch {
            return
        }

        // Nested llp/ marks a separate corpus root; skip traversing into it.
        if (dir !== root && entries.some((e) => e.isDirectory() && e.name === 'llp')) {
            return
        }

        entries.sort((a, b) => a.name.localeCompare(b.name))

        for (const ent of entries) {
            if (SKIP_DIRS.has(ent.name)) continue
            const full = path.join(dir, ent.name)
            if (ent.isDirectory()) {
                if (skipReviewsAtRoot && ent.name === 'reviews' && dir === root) continue
                walk(full)
            } else if (ent.isFile()) {
                out.push(full)
            }
        }
    }

    walk(root)
    return out
}

function countOccurrences(haystack: string, needle: string): number {
    if (!needle) return 0
    let idx = 0
    let count = 0
    while (true) {
        idx = haystack.indexOf(needle, idx)
        if (idx === -1) break
        count += 1
        idx += needle.length
    }
    return count
}

function check(root: string): { rep: Report; nFiles: number; nRefs: number; nDocs: number } {
    const rep = new Report()
    const llpDir = path.join(root, 'llp')

    // --- corpus: collect LLP docs, check metadata ---
    const docs = new Map<string, string>() // number -> relpath
    const headings = new Map<string, string[]>() // number -> [heading, ...]

    if (fs.existsSync(llpDir) && fs.statSync(llpDir).isDirectory()) {
        const files = walkFiles(llpDir, true)

        for (const full of files) {
            const name = path.basename(full)
            const m = name.match(LLP_FILE_RE)
            if (!m) continue

            const num = m[1]
            const ftype = m[2]
            const rel = path.relative(root, full)
            const text = readText(full)
            if (text == null) continue

            if (docs.has(num)) {
                rep.error(`${rel}: duplicate LLP number ${num} (also ${docs.get(num)})`)
            } else {
                docs.set(num, rel)
                headings.set(num, mdHeadings(text))
            }

            const fields = new Map<string, string>()
            const lines = text.split(/\r?\n/)
            for (const line of lines.slice(1, 40)) {
                const fm = line.trim().match(FIELD_RE)
                if (fm && !fields.has(fm[1])) fields.set(fm[1], fm[2].trim())
            }

            for (const req of REQUIRED_FIELDS) {
                if (!fields.has(req)) {
                    rep.error(`${rel}: missing required metadata field **${req}:**`)
                }
            }

            const typeField = fields.get('Type')
            const docType = typeField ? (typeField.split(/\s+/)[0] ?? '').toLowerCase() : ''
            if (docType && docType !== ftype) {
                rep.error(`${rel}: filename type '.${ftype}.md' != **Type:** ${typeField}`)
            }

            const statusField = fields.get('Status')
            const status = statusField ? (statusField.split(/\s+/)[0] ?? '').toLowerCase() : ''
            if (GATED_STATUSES.has(status)) {
                const bare = countOccurrences(text, INFERRED) - countOccurrences(text, '`' + INFERRED)
                if (bare > 0) {
                    rep.error(
                        `${rel}: ${INFERRED} claim in ${statusField ?? ''} document ` +
                        '(ratify to [confirmed] or remove before promotion)'
                    )
                }
            }
        }
    }

    // --- refs: scan the tree ---
    let nFiles = 0
    let nRefs = 0
    const exemptA = path.join('llp', 'tombstones')
    const exemptB = path.join('llp', 'reviews')

    for (const full of walkFiles(root)) {
        const rel = path.relative(root, full)

        if (
            rel.startsWith(exemptA) ||
            rel.startsWith(exemptB) ||
            path.basename(rel) === 'ref-check'
        ) {
            continue
        }

        const text = readText(full)
        if (text == null) continue

        nFiles += 1

        for (const { lineno, rest } of collectRefs(rel, text)) {
            nRefs += 1
            const { kind, target, anchor } = parseTarget(rest)
            const where = `${rel}:${lineno}`

            if (kind === 'llp') {
                const num = target.padStart(4, '0')
                if (!docs.has(num)) {
                    rep.error(`${where}: broken ref: LLP ${num} not found under llp/`)
                } else if (anchor && !anchorResolves(anchor, headings.get(num) ?? [])) {
                    rep.error(`${where}: broken ref: no anchor #${anchor} in ${docs.get(num)}`)
                }
            } else if (kind === 'url') {
                if (!URL_RE.test(target)) {
                    rep.error(`${where}: malformed URL target: ${target}`)
                }
            } else if (kind === 'shorthand') {
                rep.info(`${where}: unchecked shorthand: ${target} (no mapping defined)`)
            } else {
                // path
                const tpath = path.join(root, target)
                if (!fs.existsSync(tpath)) {
                    rep.error(`${where}: broken ref: path not found: ${target}`)
                } else if (anchor) {
                    if (target.endsWith('.md')) {
                        const ttext = readText(tpath) ?? ''
                        if (!anchorResolves(anchor, mdHeadings(ttext))) {
                            rep.error(`${where}: broken ref: no anchor #${anchor} in ${target}`)
                        }
                    } else {
                        rep.info(`${where}: anchor #${anchor} unchecked (non-markdown target)`)
                    }
                }
            }
        }
    }

    return { rep, nFiles, nRefs, nDocs: docs.size }
}

function printHelp(): void {
    console.log(`ref-check — deterministic validator for LLP corpora and \`@ref\` annotations.

Usage:
  ref-check [--root DIR] [--verbose]

Options:
  --root DIR   project root to check (default: .)
  --verbose    also print informational notes
  -h, --help   show this help
`)
}

function parseArgs(argv: string[]): { root: string; verbose: boolean } {
    let root = '.'
    let verbose = false

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i]
        if (a === '--verbose') {
            verbose = true
        } else if (a === '--root') {
            const next = argv[i + 1]
            if (!next || next.startsWith('--')) {
                throw new Error('--root requires a value')
            }
            root = next
            i += 1
        } else if (a === '-h' || a === '--help') {
            printHelp()
            process.exit(0)
        } else {
            throw new Error(`unknown argument: ${a}`)
        }
    }

    return { root, verbose }
}

function main(): void {
    let args: { root: string; verbose: boolean }
    try {
        args = parseArgs(process.argv.slice(2))
    } catch (err) {
        console.error(`ERROR ${(err as Error).message}`)
        printHelp()
        process.exit(2)
    }

    const absRoot = path.resolve(args.root)
    const { rep, nFiles, nRefs, nDocs } = check(absRoot)

    for (const e of rep.errors) {
        console.log(`ERROR ${e}`)
    }

    if (args.verbose) {
        for (const i of rep.infos) {
            console.log(`INFO  ${i}`)
        }
    }

    const status = rep.errors.length ? 'FAIL' : 'ok'
    console.log(
        `ref-check: ${status} — ${nDocs} LLP docs, ${nRefs} refs in ${nFiles} files, ` +
        `${rep.errors.length} errors, ${rep.infos.length} unchecked`
    )

    process.exit(rep.errors.length ? 1 : 0)
}

main()
