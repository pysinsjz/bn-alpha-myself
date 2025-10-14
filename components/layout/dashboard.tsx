'use client'

import { getDynamicTimeRange } from '@/lib/utils'

export default function Dashboard({ children }: { children: React.ReactNode }) {
  const [startTime, endTime] = getDynamicTimeRange()

  return (
    <div className="flex flex-col items-center gap-8 mb-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">币安 Alpha 交易统计</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {startTime.format('YYYY-MM-DD HH:mm:ss')}
          {' '}
          ~
          {endTime.format('YYYY-MM-DD HH:mm:ss')}
        </p>
      </div>
      {children}
    </div>
  )
}
