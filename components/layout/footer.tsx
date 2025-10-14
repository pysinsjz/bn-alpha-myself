'use client'

import { HeartIcon } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="w-full flex justify-center">
      <div className="flex items-center justify-center text-sm text-muted-foreground/80 gap-1">
        <HeartIcon size={12} className="text-rose-500" />
        <span>
          Made with love by
          {' '}
          <a
            href="https://github.com/holazz"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-primary transition-colors"
          >
            holazz
          </a>
        </span>
      </div>
    </footer>
  )
}
