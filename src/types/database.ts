export interface Member {
  id: string
  name: string
  role: string
  bio: string
  instagram_url: string
  x_url: string
  avatar_url: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Agenda {
  id: string
  name: string
  color: string
  description: string
  created_at: string
}

export interface Report {
  id: string
  title: string
  report_date: string
  content: string
  youtube_url: string
  video_duration: string
  member_ids: string[]
  agenda_ids: string[]
  created_at: string
  updated_at: string
}

export type ReportWithRelations = Report & {
  members?: Member[]
  agenda?: Agenda[]
}
