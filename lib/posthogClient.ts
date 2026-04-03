import posthog from 'posthog-js'

let posthogInitialized = false

export function initPostHog() {
  if (typeof window === 'undefined') return
  if (posthogInitialized) return

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
  })

  posthogInitialized = true
}

export default posthog
