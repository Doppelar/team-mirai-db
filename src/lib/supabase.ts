import { createClient } from '@supabase/supabase-js'
import type { Agenda, Member, Report } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase環境変数が設定されていません。.env ファイルに VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

type ColumnMissingError = {
  code?: string
  message?: string
  details?: string | null
}

function getMissingColumnFromError(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null

  const { code, message } = error as ColumnMissingError
  if (code !== 'PGRST204' && code !== '42703') return null
  if (!message) return null

  const quotedMatch = message.match(/'([^']+)'/)
  if (quotedMatch?.[1]) return quotedMatch[1]

  const bareMatch = message.match(/column\s+[a-zA-Z0-9_]+\.(\w+)\s+does not exist/i)
  if (bareMatch?.[1]) return bareMatch[1]

  return null
}

function isSingleResultZeroRowsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const { code, details, message } = error as ColumnMissingError
  return (
    code === 'PGRST116' &&
    details === 'The result contains 0 rows' &&
    message === 'Cannot coerce the result to a single JSON object'
  )
}

function normalizeReport(row: Partial<Report>): Report {
  return {
    id: row.id ?? '',
    title: row.title ?? '',
    report_date: row.report_date ?? '',
    content: row.content ?? '',
    youtube_url: row.youtube_url ?? '',
    member_ids: Array.isArray(row.member_ids) ? row.member_ids : [],
    agenda_ids: Array.isArray(row.agenda_ids) ? row.agenda_ids : [],
    created_at: row.created_at ?? '',
    updated_at: row.updated_at ?? '',
  }
}

function normalizeMember(row: Partial<Member>): Member {
  return {
    id: row.id ?? '',
    name: row.name ?? '',
    role: row.role ?? '',
    bio: row.bio ?? '',
    avatar_url: row.avatar_url ?? '',
    is_active: row.is_active ?? true,
    created_at: row.created_at ?? '',
    updated_at: row.updated_at ?? '',
  }
}

function normalizeAgenda(row: Partial<Agenda>): Agenda {
  return {
    id: row.id ?? '',
    name: row.name ?? '',
    color: row.color ?? '#3B82F6',
    description: row.description ?? '',
    created_at: row.created_at ?? '',
  }
}

async function insertAgendaWithFallback(payload: Record<string, unknown>) {
  let currentPayload = { ...payload }

  // Some environments are missing newly added columns.
  // Retry by removing the specific missing column from payload.
  for (let i = 0; i < 5; i += 1) {
    const { data, error } = await supabase.from('agenda').insert(currentPayload).select().single()
    if (!error) return data as Agenda
    if (isSingleResultZeroRowsError(error)) return normalizeAgenda(payload as Partial<Agenda>)

    const missingColumn = getMissingColumnFromError(error)
    if (!missingColumn || !(missingColumn in currentPayload)) throw error

    delete currentPayload[missingColumn]
  }

  throw new Error('Agenda insert failed after fallback retries')
}

async function updateAgendaWithFallback(id: string, payload: Record<string, unknown>) {
  let currentPayload = { ...payload }

  for (let i = 0; i < 5; i += 1) {
    const { data, error } = await supabase
      .from('agenda')
      .update(currentPayload)
      .eq('id', id)
      .select()
      .single()
    if (!error) return data as Agenda
    if (isSingleResultZeroRowsError(error)) throw new Error('更新対象のタグが見つかりません')

    const missingColumn = getMissingColumnFromError(error)
    if (!missingColumn || !(missingColumn in currentPayload)) throw error

    delete currentPayload[missingColumn]
  }

  throw new Error('Agenda update failed after fallback retries')
}

// --- Reports ---

export async function fetchReports() {
  const query = supabase
    .from('reports')
    .select('*')
    .order('report_date', { ascending: false })

  const { data, error } = await query
  if (!error) return (data ?? []).map((row) => normalizeReport(row as Partial<Report>))

  const missingColumn = getMissingColumnFromError(error)
  if (!missingColumn) throw error

  const { data: fallbackData, error: fallbackError } = await supabase.from('reports').select('*')
  if (fallbackError) throw fallbackError
  return (fallbackData ?? []).map((row) => normalizeReport(row as Partial<Report>))
}

export async function fetchReport(id: string) {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return normalizeReport(data as Partial<Report>)
}

export async function createReport(report: Omit<Report, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('reports')
    .insert(report)
    .select()
    .single()
  if (error) throw error
  return normalizeReport(data as Partial<Report>)
}

export async function updateReport(id: string, report: Partial<Report>) {
  const { data, error } = await supabase
    .from('reports')
    .update(report)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return normalizeReport(data as Partial<Report>)
}

export async function deleteReport(id: string) {
  if (!id) throw new Error('削除対象の週報IDが不正です')

  const { data, error } = await supabase.from('reports').delete().eq('id', id).select('id')
  if (error) throw error
  if (!data || data.length === 0) throw new Error('削除対象の週報が見つかりません')
}

// --- Members ---

export async function fetchMembers(activeOnly = false) {
  let query = supabase.from('members').select('*').order('name')
  if (activeOnly) query = query.eq('is_active', true)
  const { data, error } = await query
  if (!error) {
    const rows = (data ?? []).map((row) => normalizeMember(row as Partial<Member>))
    return activeOnly ? rows.filter((row) => row.is_active) : rows
  }

  const missingColumn = getMissingColumnFromError(error)
  if (!missingColumn) throw error

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('members')
    .select('id,name,role')
    .order('name')
  if (fallbackError) throw fallbackError

  const rows = (fallbackData ?? []).map((row) => normalizeMember(row as Partial<Member>))
  return activeOnly ? rows.filter((row) => row.is_active) : rows
}

async function insertMemberWithFallback(payload: Record<string, unknown>) {
  let currentPayload = { ...payload }
  for (let i = 0; i < 5; i += 1) {
    const { data, error } = await supabase.from('members').insert(currentPayload).select().single()
    if (!error) return normalizeMember(data as Partial<Member>)
    if (isSingleResultZeroRowsError(error)) return normalizeMember(payload as Partial<Member>)

    const missingColumn = getMissingColumnFromError(error)
    if (missingColumn && missingColumn in currentPayload) {
      throw new Error(
        `membersテーブルに '${missingColumn}' カラムがありません。SQL Editorで列を追加してください。`
      )
    }
    throw error
  }

  throw new Error('Member insert failed after fallback retries')
}

async function updateMemberWithFallback(id: string, payload: Record<string, unknown>) {
  let currentPayload = { ...payload }
  for (let i = 0; i < 5; i += 1) {
    const { data, error } = await supabase
      .from('members')
      .update(currentPayload)
      .eq('id', id)
      .select()
      .single()
    if (!error) return normalizeMember(data as Partial<Member>)
    if (isSingleResultZeroRowsError(error)) {
      throw new Error(`更新対象の出演者が見つかりません（id=${id}）。または更新権限がありません。`)
    }

    const missingColumn = getMissingColumnFromError(error)
    if (missingColumn && missingColumn in currentPayload) {
      throw new Error(
        `membersテーブルに '${missingColumn}' カラムがありません。SQL Editorで列を追加してください。`
      )
    }
    throw error
  }

  throw new Error('Member update failed after fallback retries')
}

export async function createMember(member: Omit<Member, 'id' | 'created_at' | 'updated_at'>) {
  return insertMemberWithFallback(member as Record<string, unknown>)
}

export async function updateMember(id: string, member: Partial<Member>) {
  return updateMemberWithFallback(id, member as Record<string, unknown>)
}

export async function deleteMember(id: string) {
  if (!id) throw new Error('削除対象の出演者IDが不正です')

  const { data, error } = await supabase.from('members').delete().eq('id', id).select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error(`削除対象の出演者が見つかりません（id=${id}）。または削除権限がありません。`)
  }
}

// --- Agenda (Tags) ---

export async function fetchAgenda() {
  const { data, error } = await supabase
    .from('agenda')
    .select('*')
    .order('name')
  if (!error) return (data ?? []).map((row) => normalizeAgenda(row as Partial<Agenda>))

  const missingColumn = getMissingColumnFromError(error)
  if (!missingColumn) throw error

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('agenda')
    .select('id,name')
    .order('name')
  if (fallbackError) throw fallbackError
  return (fallbackData ?? []).map((row) => normalizeAgenda(row as Partial<Agenda>))
}

export async function createAgenda(agenda: Omit<Agenda, 'id' | 'created_at'>) {
  const data = await insertAgendaWithFallback(agenda as Record<string, unknown>)
  return normalizeAgenda(data as Partial<Agenda>)
}

export async function updateAgenda(id: string, agenda: Partial<Agenda>) {
  const data = await updateAgendaWithFallback(id, agenda as Record<string, unknown>)
  return normalizeAgenda(data as Partial<Agenda>)
}

export async function deleteAgenda(id: string) {
  if (!id) throw new Error('削除対象のタグIDが不正です')

  const { data, error } = await supabase.from('agenda').delete().eq('id', id).select('id')
  if (error) throw error
  if (!data || data.length === 0) throw new Error('削除対象のタグが見つかりません')
}

// --- Helpers ---

export function resolveMembers(memberIds: string[], allMembers: Member[]): Member[] {
  return memberIds
    .map((id) => allMembers.find((m) => m.id === id))
    .filter((m): m is Member => m !== undefined)
}

export function resolveAgenda(agendaIds: string[], allAgenda: Agenda[]): Agenda[] {
  return agendaIds
    .map((id) => allAgenda.find((a) => a.id === id))
    .filter((a): a is Agenda => a !== undefined)
}
