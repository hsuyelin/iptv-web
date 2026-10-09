import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { CheckIcon, ChevronDownIcon, GlobeIcon } from '../../components/Icons'
import { useI18n } from '../../i18n/locale'
import { LOCALES, LOCALE_NAME, LOCALE_SHORT } from '../../i18n/messages'
import styles from './LanguageMenu.module.css'

/** A drop-down for the interface language: arrow keys move, Enter picks, Escape closes. */
export function LanguageMenu() {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const items = useRef<Array<HTMLButtonElement | null>>([])

  // Close on a press anywhere outside; move focus to the chosen item on open.
  useEffect(() => {
    if (!open) return undefined
    items.current[LOCALES.indexOf(locale)]?.focus()
    const onPress = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPress)
    return () => document.removeEventListener('pointerdown', onPress)
  }, [open, locale])

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (!open) return
    const current = items.current.findIndex((item) => item === document.activeElement)
    const move = (delta: number) => {
      event.preventDefault()
      items.current[(current + delta + LOCALES.length) % LOCALES.length]?.focus()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'ArrowDown') move(1)
    else if (event.key === 'ArrowUp') move(-1)
    else if (event.key === 'Home') items.current[0]?.focus()
    else if (event.key === 'End') items.current[LOCALES.length - 1]?.focus()
    else if (event.key === 'Tab') setOpen(false)
  }

  return (
    <div className={styles.root} ref={rootRef} onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.button}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t('nav.language')}: ${LOCALE_NAME[locale]}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.globe}>
          <GlobeIcon />
        </span>
        <span className={styles.current} lang={locale}>
          <span className={styles.full}>{LOCALE_NAME[locale]}</span>
          <span className={styles.short}>{LOCALE_SHORT[locale]}</span>
        </span>
        <span className={styles.chevron} data-open={open}>
          <ChevronDownIcon />
        </span>
      </button>
      {open && (
        <div className={styles.menu} role="menu" aria-label={t('nav.language')}>
          {LOCALES.map((option, index) => (
            <button
              key={option}
              ref={(element) => {
                items.current[index] = element
              }}
              type="button"
              role="menuitemradio"
              aria-checked={option === locale}
              className={styles.item}
              lang={option}
              onClick={() => {
                setLocale(option)
                close()
              }}
            >
              <span>{LOCALE_NAME[option]}</span>
              {option === locale && (
                <span className={styles.check}>
                  <CheckIcon />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
