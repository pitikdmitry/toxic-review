export interface ReviewComment {
  id: number;
  file_path: string;
  line_number: number;
  body: string;
  severity: "error" | "warning" | "info" | "suggestion";
  category: string;
  published: boolean;
}

export interface Review {
  id: number;
  pr_url: string;
  repo_owner: string;
  repo_name: string;
  pr_number: number;
  pr_title: string;
  pr_author: string;
  summary: string;
  diff_data: DiffFile[];
  created_at: string;
  comments: ReviewComment[];
}

export interface ReviewListItem {
  id: number;
  pr_url: string;
  repo_owner: string;
  repo_name: string;
  pr_number: number;
  pr_title: string;
  pr_author: string;
  created_at: string;
  comment_count: number;
}

export interface DiffFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string;
}

export interface DiffLine {
  type: "addition" | "deletion" | "context" | "hunk-header";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}
