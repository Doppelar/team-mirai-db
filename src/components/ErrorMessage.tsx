import { useState } from 'react'

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Ignore clipboard errors and keep message selectable.
    }
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">エラーが発生しました</p>
        <button
          onClick={handleCopy}
          className="text-xs font-medium text-red-600 hover:text-red-800 underline shrink-0"
        >
          {copied ? 'コピーしました' : 'エラーをコピー'}
        </button>
      </div>
      <pre className="text-sm mt-2 whitespace-pre-wrap break-all select-text bg-red-100/70 p-2 rounded-md overflow-auto">
        {message}
      </pre>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 text-sm font-medium text-red-600 hover:text-red-800 underline"
        >
          再試行
        </button>
      )}
    </div>
  )
}
