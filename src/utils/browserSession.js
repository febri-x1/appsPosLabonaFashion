const SESSION_KEY = 'labona-session'
const ACTIVE_TAB_KEY = 'labona-active-tab'
const TAB_ID_KEY = 'labona-tab-id'

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function getCurrentTabId() {
  let tabId = sessionStorage.getItem(TAB_ID_KEY)
  if (!tabId) {
    tabId = createId()
    sessionStorage.setItem(TAB_ID_KEY, tabId)
  }
  return tabId
}

export function readStoredSession() {
  const stored = localStorage.getItem(SESSION_KEY)
  return stored ? JSON.parse(stored) : null
}

export function storeSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  markTabAsActive(session)
}

export function markTabAsActive(session) {
  localStorage.setItem(
    ACTIVE_TAB_KEY,
    JSON.stringify({
      tabId: getCurrentTabId(),
      token: session.token,
      userId: session.user.id,
      updatedAt: Date.now(),
    }),
  )
}

export function isCurrentTabActive(session) {
  const stored = localStorage.getItem(ACTIVE_TAB_KEY)
  if (!stored || !session) return false

  try {
    const activeTab = JSON.parse(stored)
    return activeTab.tabId === getCurrentTabId() && activeTab.token === session.token
  } catch {
    return false
  }
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(ACTIVE_TAB_KEY)
}

export function isSessionStorageEvent(event) {
  return event.key === SESSION_KEY || event.key === ACTIVE_TAB_KEY
}
