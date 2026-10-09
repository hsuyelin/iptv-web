import type { ReactNode } from 'react'
import styles from './StatusPage.module.css'

export type StatusTone = 'info' | 'warn' | 'alert'

interface StatusPageProps {
  /** The number shown large, such as 404. */
  code: string
  title: string
  text: string
  tone: StatusTone
  /** Read out at once, for a failure the viewer should not miss. */
  urgent?: boolean
  /** One more line in a quieter type, such as the reason a request failed. */
  detail?: string
  /** Extra content between the text and the buttons, such as a countdown. */
  children?: ReactNode
  /** The buttons. */
  actions?: ReactNode
}

/** A test card with its bars faded, the broadcaster's picture for "nothing to show". */
function TestCard() {
  const bars = ['#f2f2f2', '#e8d34a', '#4ac7d0', '#58c46a', '#c353b8', '#d1514f', '#4a62c9']
  return (
    <svg className={styles.card} viewBox="0 0 120 72" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="118" height="70" rx="9" className={styles.frame} />
      {bars.map((color, index) => (
        <rect key={color} x={8 + index * 14.8} y="9" width="14.8" height="42" fill={color} />
      ))}
      <rect x="8" y="55" width="104" height="8" rx="2" className={styles.strip} />
    </svg>
  )
}

/** The page for everything that is not the channels: the same glass over the same stage. */
export function StatusPage({
  code,
  title,
  text,
  tone,
  urgent = false,
  detail,
  children,
  actions,
}: StatusPageProps) {
  return (
    <main className={styles.page}>
      <section
        className={styles.panel}
        data-tone={tone}
        {...(urgent ? { role: 'alert' } : {})}
        aria-labelledby="status-title"
      >
        <TestCard />
        <p className={styles.code}>{code}</p>
        <h2 id="status-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.text}>{text}</p>
        {detail && <p className={styles.detail}>{detail}</p>}
        {children}
        {actions && <div className={styles.actions}>{actions}</div>}
      </section>
    </main>
  )
}
