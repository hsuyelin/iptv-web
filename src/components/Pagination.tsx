import { useI18n } from '../i18n/locale'
import { pageWindow } from '../lib/channels'
import { ChevronLeftIcon, ChevronRightIcon } from './Icons'
import styles from './Pagination.module.css'

interface PaginationProps {
  /** Current page, 1-based. */
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}

/** Previous/next buttons with a window of page numbers; a compact status on phones. */
export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  const { t, formatNumber } = useI18n()
  if (pageCount <= 1) return null
  return (
    <nav className={styles.pager} aria-label={t('pager.label')}>
      <button
        type="button"
        className={styles.step}
        aria-label={t('pager.prev')}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeftIcon />
      </button>
      <p className={styles.status}>{t('pager.status', { page, total: pageCount })}</p>
      <ol className={styles.numbers}>
        {pageWindow(page, pageCount).map((entry, index) =>
          entry === null ? (
            <li key={`gap-${index}`} className={styles.gap} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={entry}>
              <button
                type="button"
                className={styles.number}
                aria-label={t('pager.page', { page: entry })}
                aria-current={entry === page ? 'page' : undefined}
                onClick={() => onPageChange(entry)}
              >
                {formatNumber(entry)}
              </button>
            </li>
          ),
        )}
      </ol>
      <button
        type="button"
        className={styles.step}
        aria-label={t('pager.next')}
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRightIcon />
      </button>
    </nav>
  )
}
