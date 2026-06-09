// ============================================================
// Task Asset Types — P6.2 Asset Management
// ============================================================

export type AssetType =
  | "script"
  | "thumbnail"
  | "raw_video"
  | "final_video"
  | "caption"
  | "prompt"
  | "canva_link"
  | "google_drive_link"
  | "reference"
  | "other";

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  script: "Script",
  thumbnail: "Thumbnail",
  raw_video: "Raw Video",
  final_video: "Final Video",
  caption: "Caption",
  prompt: "Prompt",
  canva_link: "Canva Link",
  google_drive_link: "Google Drive",
  reference: "Reference",
  other: "Other",
};

export const ASSET_TYPE_ICONS: Record<AssetType, string> = {
  script: "FileText",
  thumbnail: "Image",
  raw_video: "Video",
  final_video: "Film",
  caption: "AlignLeft",
  prompt: "Cpu",
  canva_link: "Palette",
  google_drive_link: "HardDrive",
  reference: "Link",
  other: "File",
};

export type StorageProvider = "local" | "medusa" | "s3" | "google_drive" | "canva";

export const STORAGE_PROVIDER_LABELS: Record<StorageProvider, string> = {
  local: "Local Storage",
  medusa: "Medusa Media",
  s3: "AWS S3",
  google_drive: "Google Drive",
  canva: "Canva",
};

export interface TaskAsset {
  id: string;
  task_id: string;
  asset_type: AssetType;
  title: string;
  description?: string;
  file_name: string;
  file_url?: string;
  mime_type?: string;
  file_size?: number;
  storage_provider: StorageProvider;
  original_url?: string;
  uploaded_by?: string;
  uploaded_by_name?: string;
  version: number;
  is_current: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskAssetInput {
  asset_type: AssetType;
  title?: string;
  description?: string;
  file_name: string;
  file_url?: string;
  mime_type?: string;
  file_size?: number;
  storage_provider?: StorageProvider;
  original_url?: string;
  uploaded_by?: string;
  uploaded_by_name?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  actor_id?: string;
  actor_name?: string;
  action: "upload" | "delete" | "update" | "view";
  entity_type: "task_asset";
  entity_id?: string;
  asset_type?: AssetType;
  file_name?: string;
  file_url?: string;
  metadata: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
