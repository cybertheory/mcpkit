import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import posthog from 'posthog-js'

// Hardcoded PostHog public client config
const PUBLIC_KEY = 'phc_8xerRydMxvONOPw0aWAC6IxF5R5rUYy8kohAwn2odGG'
const HOST = 'https://us.i.posthog.com'

posthog.init(PUBLIC_KEY, {
  api_host: HOST,
  person_profiles: 'identified_only',
  capture_pageview: true,
  capture_pageleave: true,
})
posthog.capture('app_started')

const rootElement = document.getElementById('root')
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}



