export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => {
    const clean = v.replace(/^v/i, '')
    const [core, ...rest] = clean.split('+')
    const build = rest.join('+')
    const [main, ...preParts] = core.split('-')
    const prerelease = preParts.join('-')
    const digits = main.split('.').map(n => parseInt(n, 10))

    while (digits.length < 4) digits.push(0)

    return { digits, prerelease, build, raw: v }
  }

  const A = parse(a)
  const B = parse(b)

  for (let i = 0; i < 4; i++) {
    if (A.digits[i] !== B.digits[i]) {
      return A.digits[i] > B.digits[i] ? 1 : -1
    }
  }

  if (!A.prerelease && B.prerelease) return 1
  if (A.prerelease && !B.prerelease) return -1
  if (!A.prerelease && !B.prerelease) return 0

  const preA = A.prerelease.split('.')
  const preB = B.prerelease.split('.')
  const maxPre = Math.max(preA.length, preB.length)

  for (let i = 0; i < maxPre; i++) {
    const idA = preA[i]
    const idB = preB[i]

    if (idA === undefined) return -1
    if (idB === undefined) return 1

    const isNumA = /^\d+$/.test(idA)
    const isNumB = /^\d+$/.test(idB)

    if (isNumA && isNumB) {
      const nA = parseInt(idA, 10)
      const nB = parseInt(idB, 10)
      if (nA !== nB) return nA > nB ? 1 : -1
    } else if (!isNumA && !isNumB) {
      if (idA !== idB) return idA > idB ? 1 : -1
    } else {
      return isNumA ? -1 : 1
    }
  }

  return 0
}

export function isNewer(upstream: string, current: string): boolean {
  return compareVersions(upstream, current) > 0
}

export function sortVersions(versions: string[]): string[] {
  return [...versions].sort((a, b) => compareVersions(b, a))
}
