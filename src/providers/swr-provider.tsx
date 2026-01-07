'use client'

import { ReactNode } from "react"
import { SWRConfig } from "swr"

interface SWRProviderProps {
    children: ReactNode
}

export function SWRProvider({ children }: SWRProviderProps) {
    return (
        <SWRConfig
            value={{
                revalidateOnFocus: false,
                revalidateOnReconnect: true,
                shouldRetryOnError: true,
                errorRetryCount: 3,
                dedupingInterval: 2000,

                fetcher: async (url: string) => {
                    const res = await fetch(url)

                    if (!res.ok) {
                        const error = new Error('Error fetching data')
                        throw error
                    }

                    return res.json()
                },

                onError: (error, key) => {
                    if (process.env.NODE_ENV === 'development') {
                        console.error(`SWR Error [${key}]:`, error)
                    }
                },
            }}
        >
            {children}
        </SWRConfig>
    )
}