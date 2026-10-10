import type { SVGProps } from 'react'

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  )
}

export const ListIcon = () => (
  <Icon>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <path d="M3 6h.01M3 12h.01M3 18h.01" />
  </Icon>
)

export const RefreshIcon = () => (
  <Icon>
    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
    <path d="M20 4v7h-7" />
  </Icon>
)

export const PlayIcon = () => (
  <Icon fill="currentColor" stroke="none">
    <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
  </Icon>
)

export const ChevronLeftIcon = () => (
  <Icon>
    <path d="m15 5-7 7 7 7" />
  </Icon>
)

export const ChevronRightIcon = () => (
  <Icon>
    <path d="m9 5 7 7-7 7" />
  </Icon>
)

export const GlobeIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
  </Icon>
)

export const CloseIcon = () => (
  <Icon>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)

export const ArrowUpIcon = () => (
  <Icon>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </Icon>
)

export const CheckIcon = () => (
  <Icon>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
)

export const ChevronDownIcon = () => (
  <Icon>
    <path d="m6 9 6 6 6-6" />
  </Icon>
)

/**
 * Stand-in for any picture that is missing or fails to load: a television with its
 * antenna. It scales to the box it is put in and takes the surrounding text colour.
 */
export function PlaceholderIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width="100%"
      height="100%"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-hidden="true"
      focusable="false"
      data-placeholder="true"
      {...(className ? { className } : {})}
    >
      <path d="m22 9 10 9 10-9" />
      <rect x="8" y="18" width="48" height="33" rx="7" />
      <path d="M17 44l9-9 6 6 5-5 9 8" strokeOpacity=".7" />
      <circle cx="40" cy="28" r="2.6" fill="currentColor" stroke="none" fillOpacity=".7" />
      <path d="M22 57h20" />
    </svg>
  )
}
