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

export interface MemberMonthlyActivity {
  id: string
  member_id: string
  activity_month: string
  committee: string
  title: string
  content: string
  link_url: string
  created_at: string
  updated_at: string
}

export interface PartyAchievement {
  id: string
  achievement_date: string
  title: string
  summary: string
  impact: string
  link_url: string
  created_at: string
  updated_at: string
}

export type ReportWithRelations = Report & {
  members?: Member[]
  agenda?: Agenda[]
}
