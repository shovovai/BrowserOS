import { Bot, House, ListTodo, Plug, Settings, Sparkles } from 'lucide-react'
import type { Plan } from '@browseros/claw-api'
import type { AnimatedBadgeStatus } from '@/components/motion/animated-badge'

export interface NavItem {
  name: string
  to: string
  icon: typeof House
}

export const primaryNavItems: NavItem[] = [
  { name: 'Home', to: '/', icon: House },
  { name: 'WolfOS', to: '/wolfos', icon: Bot },
  { name: 'Skills', to: '/skills', icon: ListTodo },
  { name: 'Connected agents', to: '/mcp', icon: Plug },
  { name: 'History', to: '/audit', icon: House },
]

export const secondaryNavItems: NavItem[] = [
  { name: 'Settings', to: '/settings', icon: Settings },
]

export function secondaryNavItemsFor(plan: Plan | undefined): NavItem[] {
  if (!plan?.available) return secondaryNavItems
  const name = plan.status === 'none' ? 'Get ultrafast' : 'ultrafast'
  return [{ name, to: '/pro', icon: Sparkles }, ...secondaryNavItems]
}

export interface PlanTag {
  label: string
  status: AnimatedBadgeStatus
}

export function planTagFor(plan: Plan | undefined): PlanTag | null {
  if (!plan?.available) return null
  switch (plan.status) {
    case 'active':
      return { label: 'On', status: 'success' }
    case 'ending':
      return { label: 'Ending', status: 'warning' }
    case 'paymentFailed':
      return { label: 'Check card', status: 'warning' }
    case 'unpaid':
      return { label: 'Paused', status: 'neutral' }
    default:
      return null
  }
}

export function isNavItemActive(to: string, pathname: string): boolean {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(`${to}/`)
}
