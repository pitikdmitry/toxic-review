"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, FileCode2 } from "lucide-react";
import type { DiffFile, DiffLine, ReviewComment } from "@/types";

function parsePatch(patch: string): DiffLine[] {
  if (!patch) return [];
  const lines = patch.split("\n");
  const result: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        oldLine = parseInt(match[1]);
        newLine = parseInt(match[2]);
      }
      result.push({ type: "hunk-header", content: line });
    } else if (line.startsWith("+")) {
      result.push({
        type: "addition",
        content: line.slice(1),
        newLineNumber: newLine,
      });
      newLine++;
    } else if (line.startsWith("-")) {
      result.push({
        type: "deletion",
        content: line.slice(1),
        oldLineNumber: oldLine,
      });
      oldLine++;
    } else {
      result.push({
        type: "context",
        content: line.startsWith(" ") ? line.slice(1) : line,
        oldLineNumber: oldLine,
        newLineNumber: newLine,
      });
      oldLine++;
      newLine++;
    }
  }

  return result;
}

const SEVERITY_COLORS: Record<string, { badge: string; border: string }> = {
  error: {
    badge: "bg-red-500/10 text-red-600 dark:text-red-400",
    border: "border-l-red-500",
  },
  warning: {
    badge: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    border: "border-l-yellow-500",
  },
  suggestion: {
    badge: "bg-[var(--accent-soft)] text-[var(--accent)]",
    border: "border-l-[var(--accent)]",
  },
  info: {
    badge: "bg-gray-500/10 text-[var(--text-secondary)]",
    border: "border-l-gray-400 dark:border-l-gray-600",
  },
};

interface InlineCommentProps {
  comment: ReviewComment;
  selected: boolean;
  onToggle: (id: number) => void;
}

function InlineComment({ comment, selected, onToggle }: InlineCommentProps) {
  const colors =
    SEVERITY_COLORS[comment.severity] || SEVERITY_COLORS.info;

  return (
    <tr className="bg-[var(--bg-primary)]">
      <td colSpan={3} className="!whitespace-normal !font-sans p-0">
        <div
          className={`border-y border-[var(--border-primary)] border-l-[3px] ${colors.border} bg-[var(--bg-card)] px-4 py-3`}
        >
          <div className="mb-1.5 flex items-center gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md gradient-brand">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m16 18 2-2-2-2" />
                <path d="m8 18-2-2 2-2" />
              </svg>
            </div>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${colors.badge}`}
            >
              {comment.severity}
            </span>
            {comment.category && (
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
                {comment.category}
              </span>
            )}

            <div className="ml-auto">
              {comment.published ? (
                <span className="flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 font-medium">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Published
                </span>
              ) : (
                <label className="flex items-center gap-1.5 cursor-pointer rounded-md border border-[var(--border-primary)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggle(comment.id)}
                    className="accent-[var(--accent)]"
                  />
                  Publish
                </label>
              )}
            </div>
          </div>

          <p className="pl-7 text-[13px] leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">
            {comment.body}
          </p>
        </div>
      </td>
    </tr>
  );
}

interface FileDiffProps {
  file: DiffFile;
  comments: ReviewComment[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
}

function FileDiff({ file, comments, selectedIds, onToggle }: FileDiffProps) {
  const [expanded, setExpanded] = useState(true);
  const diffLines = parsePatch(file.patch);

  const commentsByNewLine = new Map<number, ReviewComment[]>();
  for (const c of comments) {
    if (c.file_path === file.filename) {
      const existing = commentsByNewLine.get(c.line_number) || [];
      existing.push(c);
      commentsByNewLine.set(c.line_number, existing);
    }
  }

  const fileCommentCount = comments.filter(
    (c) => c.file_path === file.filename
  ).length;

  return (
    <div className="mb-3 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2.5 bg-[var(--bg-secondary)] px-4 py-2.5 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        {expanded ? (
          <ChevronDown size={13} className="text-[var(--text-tertiary)]" />
        ) : (
          <ChevronRight size={13} className="text-[var(--text-tertiary)]" />
        )}
        <FileCode2 size={14} className="text-[var(--accent)]" />
        <span className="font-mono text-xs font-medium">{file.filename}</span>
        {fileCommentCount > 0 && (
          <span className="rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
            {fileCommentCount}
          </span>
        )}
        <span className="ml-auto flex gap-2 text-xs font-mono">
          {file.additions > 0 && (
            <span className="text-green-600 dark:text-green-400">
              +{file.additions}
            </span>
          )}
          {file.deletions > 0 && (
            <span className="text-red-500 dark:text-red-400">
              -{file.deletions}
            </span>
          )}
        </span>
      </button>

      {expanded && (
        <div>
          <table
            className="diff-table"
            style={{ tableLayout: "fixed", width: "100%" }}
          >
            <tbody>
              {diffLines.map((line, i) => {
                const rowClass =
                  line.type === "addition"
                    ? "diff-line-addition"
                    : line.type === "deletion"
                      ? "diff-line-deletion"
                      : line.type === "hunk-header"
                        ? "diff-line-hunk"
                        : "diff-line-context";

                const lineComments =
                  line.type === "addition" && line.newLineNumber
                    ? commentsByNewLine.get(line.newLineNumber)
                    : undefined;

                return (
                  <Fragment key={i}>
                    <tr className={rowClass}>
                      <td className="diff-line-num">
                        {line.type !== "hunk-header" &&
                        line.type !== "addition"
                          ? line.oldLineNumber
                          : ""}
                      </td>
                      <td className="diff-line-num">
                        {line.type !== "hunk-header" &&
                        line.type !== "deletion"
                          ? line.newLineNumber
                          : ""}
                      </td>
                      <td>
                        {line.type === "addition"
                          ? "+"
                          : line.type === "deletion"
                            ? "-"
                            : line.type === "hunk-header"
                              ? ""
                              : " "}
                        {line.content}
                      </td>
                    </tr>
                    {lineComments?.map((c) => (
                      <InlineComment
                        key={c.id}
                        comment={c}
                        selected={selectedIds.has(c.id)}
                        onToggle={onToggle}
                      />
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface DiffViewProps {
  files: DiffFile[];
  comments: ReviewComment[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
}

export function DiffView({
  files,
  comments,
  selectedIds,
  onToggle,
}: DiffViewProps) {
  return (
    <div>
      {files.map((file) => (
        <FileDiff
          key={file.filename}
          file={file}
          comments={comments}
          selectedIds={selectedIds}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
