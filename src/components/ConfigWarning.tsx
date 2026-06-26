interface ConfigWarningProps {
  show: boolean
}

export default function ConfigWarning({ show }: ConfigWarningProps) {
  if (!show) return null

  return (
    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
      <p className="font-medium">Supabase未設定</p>
      <p className="text-sm mt-1">
        <code className="bg-amber-100 px-1 rounded">.env</code> ファイルに{' '}
        <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_URL</code> と{' '}
        <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>{' '}
        を設定し、Supabase SQL Editorで{' '}
        <code className="bg-amber-100 px-1 rounded">supabase/migrations/001_initial_schema.sql</code>{' '}
        を実行してください。
      </p>
    </div>
  )
}
