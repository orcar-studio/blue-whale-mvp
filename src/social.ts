import type { CreatorSocialAccount } from './types'

export type ParsedSocialAccount = Pick<CreatorSocialAccount, 'platform' | 'handle' | 'profile_url'>

const normalizeUrl = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export const parseSocialProfile = (value: string): ParsedSocialAccount | null => {
  const normalized = normalizeUrl(value)

  try {
    const url = new URL(normalized)
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase()
    const parts = url.pathname.split('/').filter(Boolean)

    if (hostname === 'instagram.com' && parts[0]) {
      return { platform: 'Instagram', handle: parts[0].replace(/^@/, ''), profile_url: normalized }
    }

    if (hostname === 'tiktok.com' && parts[0]?.startsWith('@')) {
      return { platform: 'TikTok', handle: parts[0].slice(1), profile_url: normalized }
    }

    if (hostname === 'youtube.com' && parts[0]?.startsWith('@')) {
      return { platform: 'YouTube', handle: parts[0].slice(1), profile_url: normalized }
    }

    if (hostname === 'youtube.com' && parts[0] === 'channel' && parts[1]) {
      return { platform: 'YouTube', handle: parts[1], profile_url: normalized }
    }

    if (hostname === 'blog.naver.com' && parts[0]) {
      return { platform: 'Naver Blog', handle: parts[0], profile_url: normalized }
    }
  } catch {
    return null
  }

  return null
}
