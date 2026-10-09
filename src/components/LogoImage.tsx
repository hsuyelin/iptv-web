import { useState } from 'react'
import { PlaceholderIcon } from './Icons'

interface LogoImageProps {
  src: string
  className?: string
}

/**
 * A decorative picture that never shows a broken-image mark: when the address is empty
 * or the load fails, the shared placeholder icon takes its place. A new address gets a
 * fresh try.
 */
export function LogoImage({ src, className }: LogoImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  if (src === '' || failedSrc === src) return <PlaceholderIcon {...(className ? { className } : {})} />
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      {...(className ? { className } : {})}
      onError={() => setFailedSrc(src)}
    />
  )
}
