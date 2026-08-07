import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import RichTextEditor from '../components/ui/RichTextEditor';
import RichTextViewer from '../components/ui/RichTextViewer';
import FileUploadArea from '../components/ui/FileUploadArea';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  BookOpen,
  FileText,
  User,
  Users,
  CheckCircle2,
  XCircle,
  Edit2,
  Save,
  X,
  ExternalLink,
  PlayCircle,
  ShieldAlert,
} from 'lucide-react';

/* ── helpers ─────────────────────────────────────────────────────── */
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const fmtTime = (d) =>
  new Date(d).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

const fmtFileSize = (bytes) =>
  bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const canJoinNow = (s) =>
  Date.now() >= new Date(s.startTime).getTime() - 5 * 60 * 1000 &&
  Date.now() <= new Date(s.endTime).getTime();

const statusConfig = {
  completed: {
    label: 'Completed',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-600/20',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-red-50',
    text: 'text-red-700',
    ring: 'ring-red-600/20',
    dot: 'bg-red-500',
  },
  scheduled: {
    label: 'Scheduled',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-600/20',
    dot: 'bg-amber-500',
  },
};

const getDuration = (start, end) => {
  if (!start || !end) return null;
  const ms = new Date(end) - new Date(start);
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

/* ── sub-components ──────────────────────────────────────────────── */

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig.scheduled;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cfg.bg} ${cfg.text} ${cfg.ring}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function AttendanceBadge({ status }) {
  const map = {
    present: {
      label: 'Present',
      cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    },
    absent: {
      label: 'Absent',
      cls: 'bg-red-50 text-red-700 ring-red-600/20',
    },
    pending: {
      label: 'Pending',
      cls: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    },
  };
  const cfg = map[status] || map.pending;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

function FileList({ files }) {
  if (!files || files.length === 0) return null;
  return (
    <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/60">
      {files.map((f) => (
        <li key={f.url} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <FileText className="h-4 w-4 shrink-0 text-slate-400" />
              <a
                href={f.signedUrl || f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm font-medium !text-slate-900 hover:!text-blue-600 hover:underline"
              >
              {f.name}
            </a>
            {f.size != null && (
              <span className="shrink-0 text-xs text-slate-400">
                {fmtFileSize(f.size)}
              </span>
            )}
          </div>
          <a
            href={f.signedUrl || f.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Download
          </a>
        </li>
      ))}
    </ul>
  );
}

function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

/* ── main page ───────────────────────────────────────────────────── */

export default function SessionDetailPage() {
  const { classroomId, sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  /* state */
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  /* edit-mode drafts */
  const [homeworkContent, setHomeworkContent] = useState('');
  const [notesContent, setNotesContent] = useState('');
  const [recordingDraft, setRecordingDraft] = useState('');

  /* file upload spinners */
  const [uploadingHomework, setUploadingHomework] = useState(false);
  const [uploadingNotes, setUploadingNotes] = useState(false);

  /* ── fetch ───────────────────────────────────────────────────── */
  const fetchSession = useCallback(async () => {
    try {
      const { data: res } = await api.get(`/classrooms/sessions/${sessionId}`);
      setSession(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchSession();
  }, [fetchSession]);

  /* ── enter / exit edit mode ──────────────────────────────────── */
  const enterEdit = () => {
    setHomeworkContent(session?.homework?.content || '');
    setNotesContent(session?.teacherNotes?.content || '');
    setRecordingDraft(session?.recordingLink || '');
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  /* ── save ─────────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        homework: { content: homeworkContent },
        teacherNotes: { content: notesContent },
        recordingLink: recordingDraft,
      };
      await api.put(`/classrooms/sessions/${sessionId}`, body);
      toast.success('Session updated');
      setEditing(false);
      await fetchSession();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  /* ── file upload / delete ────────────────────────────────────── */
  const handleFileUpload = async (file, field) => {
    const setUploading =
      field === 'homework' ? setUploadingHomework : setUploadingNotes;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('field', field);
      await api.post(`/classrooms/sessions/${sessionId}/files`, fd, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('File uploaded');
      await fetchSession();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileDelete = async (fileUrl, field) => {
    try {
      await api.delete(`/classrooms/sessions/${sessionId}/files`, {
        data: { field, fileUrl },
      });
      toast.success('File removed');
      await fetchSession();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed');
    }
  };

  /* ── attendance toggle ───────────────────────────────────────── */
  const toggleAttendance = async (studentId, newStatus) => {
    try {
      await api.patch(`/classrooms/sessions/${sessionId}/attendance`, {
        studentId,
        attendanceStatus: newStatus,
      });
      await fetchSession();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update attendance');
    }
  };

  /* ── loading / error states ──────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-slate-500">
        <p>Session not found.</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  const sessionStatus = session.status || 'scheduled';
  const isActiveSession =
    sessionStatus !== 'completed' && sessionStatus !== 'cancelled';
  const duration = getDuration(session.startTime, session.endTime);

  /* ────────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-full bg-white">
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Classroom
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-600">
              {session.sessionNumber ?? '#'}
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-[family-name:var(--font-family-heading)]">
                {session.title || `Session ${session.sessionNumber}`}
              </h1>
            </div>
            <StatusBadge status={sessionStatus} />
          </div>

          {isTeacher && !editing && (
            <Button variant="secondary" onClick={enterEdit} className="!text-black !border-black">
              <Edit2 className="mr-1.5 h-4 w-4" />
              Edit
            </Button>
          )}
          {isTeacher && editing && (
            <div className="flex gap-2">
              <Button variant="primary" loading={saving} onClick={handleSave}>
                <Save className="mr-1.5 h-4 w-4" />
                Save
              </Button>
              <Button variant="secondary" onClick={cancelEdit}>
                <X className="mr-1.5 h-4 w-4" />
                Cancel
              </Button>
            </div>
          )}
        </div>

        {session.description && (
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            {session.description}
          </p>
        )}
      </div>

      {/* ── 2-COL GRID ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── LEFT COLUMN (2/3) ──────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Cancellation Reason */}
          {sessionStatus === 'cancelled' && session.cancellationReason && (
            <Card>
              <div className="flex items-center gap-2 border-b border-red-100 px-5 py-4 bg-red-50 rounded-t-xl">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                <h2 className="text-lg font-semibold text-red-700 font-[family-name:var(--font-family-heading)]">
                  Cancellation Reason
                </h2>
              </div>
              <div className="p-5 bg-red-50/30 rounded-b-xl border-t-0">
                <p className="text-sm text-red-800">
                  {session.cancellationReason}
                </p>
              </div>
            </Card>
          )}

          {/* Homework */}
          <Card>
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-slate-800 font-[family-name:var(--font-family-heading)]">
                Homework
              </h2>
            </div>
            <div className="p-5">
              {editing ? (
                <>
                  <RichTextEditor
                    value={homeworkContent}
                    onChange={setHomeworkContent}
                    placeholder="Add homework instructions…"
                    minHeight="180px"
                  />
                  <div className="mt-4">
                    <FileUploadArea
                      files={session.homework?.files || []}
                      onUpload={(file) => handleFileUpload(file, 'homework')}
                      onRemove={(index) =>
                        handleFileDelete(session.homework.files[index].url, 'homework')
                      }
                      uploading={uploadingHomework}
                    />
                  </div>
                </>
              ) : (
                <>
                  {session.homework?.content ? (
                    <RichTextViewer content={session.homework.content} />
                  ) : (
                    <p className="text-sm italic text-slate-400">
                      No homework assigned yet.
                    </p>
                  )}
                  <FileList files={session.homework?.files} />
                </>
              )}
            </div>
          </Card>

          {/* Teacher Notes — only visible when data exists (teacher/admin) */}
          {session.teacherNotes && (
            <Card>
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <FileText className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-slate-800 font-[family-name:var(--font-family-heading)]">
                  Teacher Notes
                </h2>
              </div>
              <div className="p-5">
                {editing ? (
                  <>
                    <RichTextEditor
                      value={notesContent}
                      onChange={setNotesContent}
                      placeholder="Add private teaching notes…"
                      minHeight="180px"
                    />
                    <div className="mt-4">
                      <FileUploadArea
                        files={session.teacherNotes?.files || []}
                        onUpload={(file) =>
                          handleFileUpload(file, 'teacherNotes')
                        }
                        onRemove={(index) =>
                          handleFileDelete(session.teacherNotes.files[index].url, 'teacherNotes')
                        }
                        uploading={uploadingNotes}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {session.teacherNotes?.content ? (
                      <RichTextViewer content={session.teacherNotes.content} />
                    ) : (
                      <p className="text-sm italic text-slate-400">
                        No notes added yet.
                      </p>
                    )}
                    <FileList files={session.teacherNotes?.files} />
                  </>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* ── RIGHT SIDEBAR (1/3) ────────────────────────────────── */}
        <div className="space-y-6">
          {/* Session Info */}
          <Card>
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <Calendar className="h-5 w-5 text-sky-500" />
              <h3 className="text-sm font-semibold text-slate-800 font-[family-name:var(--font-family-heading)]">
                Session Info
              </h3>
            </div>
            <div className="space-y-3 p-5 text-sm">
              {session.scheduledDate && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>{fmtDate(session.scheduledDate)}</span>
                </div>
              )}
              {session.startTime && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>
                    {fmtTime(session.startTime)}
                    {session.endTime && ` – ${fmtTime(session.endTime)}`}
                  </span>
                </div>
              )}
              {duration && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>Duration: {duration}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Status:</span>
                <StatusBadge status={sessionStatus} />
              </div>
            </div>
          </Card>

          {/* Meeting Link */}
          <Card>
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <Video className="h-5 w-5 text-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-800 font-[family-name:var(--font-family-heading)]">
                Meeting Link
              </h3>
            </div>
            <div className="p-5">
              {session.zoomJoinUrl && isActiveSession && canJoinNow(session) ? (
                <a
                  href={session.zoomJoinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                >
                  <Video className="h-4 w-4" />
                  Join Meeting
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p className="text-sm text-slate-400 italic">
                  {session.zoomJoinUrl
                    ? 'Session has ended.'
                    : 'No meeting link available.'}
                </p>
              )}
            </div>
          </Card>

          {/* Recording */}
          <Card>
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <PlayCircle className="h-5 w-5 text-rose-500" />
              <h3 className="text-sm font-semibold text-slate-800 font-[family-name:var(--font-family-heading)]">
                Recording
              </h3>
            </div>
            <div className="p-5">
              {editing ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Recording URL
                  </label>
                  <input
                    type="url"
                    value={recordingDraft}
                    onChange={(e) => setRecordingDraft(e.target.value)}
                    placeholder="https://…"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              ) : session.recordingLink ? (
                <a
                  href={session.recordingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-100"
                >
                  <PlayCircle className="h-4 w-4" />
                  Watch Recording
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p className="text-sm text-slate-400 italic">
                  No recording available.
                </p>
              )}
            </div>
          </Card>

          {/* Attendance */}
          {session.studentAttendance && session.studentAttendance.length > 0 && (
            <Card>
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <h3 className="text-sm font-semibold text-slate-800 font-[family-name:var(--font-family-heading)]">
                    Attendance
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  {session.studentAttendance.filter(
                    (a) => a.attendanceStatus === 'present'
                  ).length}
                  /{session.studentAttendance.length} present
                </span>
              </div>
              <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                {session.studentAttendance.map((record) => {
                  const student = record.studentId;
                  if (!student) return null;
                  return (
                    <li
                      key={student._id}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        {student.profile?.avatarUrl ? (
                          <img
                            src={student.profile.avatarUrl}
                            alt={student.name}
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">
                            <User className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <span className="truncate text-sm text-slate-700">
                          {student.name}
                        </span>
                      </div>

                      {user?.role === 'teacher' ? (
                        <div className="flex shrink-0 gap-1">
                          <button
                            onClick={() =>
                              toggleAttendance(student._id, 'present')
                            }
                            title="Mark present"
                            className={`rounded-md p-1 transition ${
                              record.attendanceStatus === 'present'
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'text-slate-300 hover:bg-emerald-50 hover:text-emerald-500'
                            }`}
                          >
                            <CheckCircle2 className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() =>
                              toggleAttendance(student._id, 'absent')
                            }
                            title="Mark absent"
                            className={`rounded-md p-1 transition ${
                              record.attendanceStatus === 'absent'
                                ? 'bg-red-100 text-red-600'
                                : 'text-slate-300 hover:bg-red-50 hover:text-red-500'
                            }`}
                          >
                            <XCircle className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      ) : (
                        <AttendanceBadge status={record.attendanceStatus} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
