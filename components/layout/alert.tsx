'use client'

import { InfoIcon, X } from 'lucide-react'
import { useState } from 'react'
import { Alert as _Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export default function Alert({ children }: { children: React.ReactNode }) {
  const [showAlert, setShowAlert] = useState(true)

  return (
    <>
      {showAlert && (
        <_Alert className="w-full max-w-5xl bg-yellow-50 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-800">
          <InfoIcon size={10} className="!text-yellow-500" />
          <AlertDescription className="text-yellow-700 dark:text-yellow-300 flex justify-between items-center">
            {children}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAlert(false)}
              className="h-auto hover:bg-transparent"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </_Alert>
      )}
    </>
  )
}
