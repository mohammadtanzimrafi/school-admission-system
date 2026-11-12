import { useState } from 'react'
import { Link } from 'react-router'
import { effectiveStatus } from '../api/queries'
import type { Hold, HoldStatus } from '../api/types'
import { useClassLabel } from '../classes/useClassLabel'
import { Arrow } from '../components/Button'
import { TimeLeft } from '../components/Countdown'
import { SectionHeader } from '../components/Feedback'
import { StatusPill } from '../components/StatusPill'
import { useI18n } from '../i18n/I18nProvider'
import type { MessageKey } from '../i18n/messages'
import { cn } from '../lib/cn'
import { matchesFilter, shortHoldId, type HistoryFilter } from './holdDisplay'

interface ApplicationHistoryProps {
  holds: Hold[]
  now: number
  onReapply: (classId: string) => void
  reapplyingTo: string | undefined
}

const FILTERS: { key: HistoryFilter; label: MessageKey }[] = [
  { key: 'all', label: 'history.tab.all' },
  { key: 'confirmed', label: 'history.tab.confirmed' },
  { key: 'past', label: 'history.tab.past' },
]

/** Every other application of this student, filterable, with the next step for each. */
export function ApplicationHistory({ holds, now, onReapply, reapplyingTo }: ApplicationHistoryProps) {
  const { t, formatNumber } = useI18n()
  const classLabel = useClassLabel()
  const [filter, setFilter] = useState<HistoryFilter>('all')

  const rows = holds.map((hold) => ({ hold, status: effectiveStatus(hold, now) }))
  const count = (key: HistoryFilter) => rows.filter((row) => matchesFilter(row.status, key)).length
  const visible = rows.filter((row) => matchesFilter(row.status, filter))

  return (
    <section className="mt-10">
      <SectionHeader
        title={t('history.title')}
        subtitle={t('history.subtitle')}
        aside={
          <div role="group" aria-label={t('history.filterLabel')} className="flex rounded-lg bg-sage-200 p-1">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={cn(
                  'min-h-[31px] rounded-md px-4 text-[13px] whitespace-nowrap transition-colors sm:min-w-[99px]',
                  filter === key ? 'bg-white text-sm font-semibold text-brand shadow-sm' : 'text-muted hover:text-ink',
                )}
              >
                {t(label, { count: formatNumber(count(key)) })}
              </button>
            ))}
          </div>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-sage-100 text-xs font-medium text-muted">
            <tr>
              <th scope="col" className="w-[33%] px-5 py-3 font-medium">{t('history.col.class')}</th>
              <th scope="col" className="px-5 py-3 font-medium">{t('history.col.number')}</th>
              <th scope="col" className="px-5 py-3 font-medium">{t('history.col.status')}</th>
              <th scope="col" className="px-5 py-3 font-medium">{t('history.col.detail')}</th>
              <th scope="col" className="px-5 py-3 font-medium"><span className="sr-only">{t('history.col.action')}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted">{t('history.empty')}</td>
              </tr>
            ) : (
              visible.map(({ hold, status }) => (
                <tr key={hold.holdId}>
                  <th scope="row" className="px-5 py-4 text-[15px] font-medium text-ink">
                    <Link to={`/applications/${hold.holdId}`} className="hover:underline">
                      {classLabel(hold.className ?? hold.classId).full}
                    </Link>
                  </th>
                  <td className="px-5 py-4 text-sm text-muted">{shortHoldId(hold.holdId)}</td>
                  <td className="px-5 py-4"><StatusPill status={status} className="min-w-[106px]" /></td>
                  <td className="px-5 py-4 text-sm text-muted">
                    {status === 'HELD' ? (
                      <>
                        {t('history.detail.HELD')} · <TimeLeft deadline={hold.deadline} />
                      </>
                    ) : (
                      t(`history.detail.${status}`)
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <RowAction hold={hold} status={status} onReapply={onReapply} reapplying={reapplyingTo === hold.classId} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const linkClasses = 'inline-flex items-center gap-2 text-[13px] font-semibold whitespace-nowrap text-brand hover:underline disabled:opacity-60'

function RowAction({ hold, status, onReapply, reapplying }: { hold: Hold; status: HoldStatus; onReapply: (classId: string) => void; reapplying: boolean }) {
  const { t } = useI18n()

  if (status === 'HELD') {
    return (
      <Link to={`/applications/${hold.holdId}/pay`} className={linkClasses}>
        {t('history.action.pay')} <Arrow />
      </Link>
    )
  }
  if (status === 'CONFIRMED') {
    return (
      <Link to={`/applications/${hold.holdId}`} className={linkClasses}>
        {t('history.action.details')} <Arrow />
      </Link>
    )
  }
  return (
    <button type="button" onClick={() => onReapply(hold.classId)} disabled={reapplying} className={linkClasses}>
      {t('history.action.reapply')} <Arrow />
    </button>
  )
}
