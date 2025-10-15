import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Dashboard from '@/components/layout/dashboard'
import Footer from '@/components/layout/footer'
import { Toaster } from '@/components/ui/sonner'
import Providers from './providers'
import '@/styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Binance Alpha Trading',
  description: 'Binance Alpha trading statistics and swap interface',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <Providers>
          <div className="container mx-auto py-8 px-4">
            <Dashboard>{children}</Dashboard>
            <Footer />
          </div>
          <Toaster
            position="top-center"
            className="flex justify-center"
            offset={{ top: '12px' }}
            mobileOffset={{ top: '8px' }}
            toastOptions={{ 
              style: { width: 'fit-content', margin: '0 auto' },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
