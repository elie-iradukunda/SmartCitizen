import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { Mic, Square, Trash2 } from 'lucide-react';
import { API_ORIGIN, endpoints } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.jsx';
import {
  Badge,
  Bar,
  Empty,
  PageTitle,
  Stat,
  Timeline,
  formatDate,
  formatDateTime,
  isOverdue,
  isTerminal
} from '../../components/Ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast, errorMessage } from '../../context/ToastContext.jsx';
import { kacyiruLocation, villagesForCell } from '../../data/kacyiruLocations.js';

const SECTOR_OFFICE = 'Sector Executive Office';
const maxEvidenceBytes = 100 * 1024 * 1024;

// The citizen writes in their own words; these keywords pick the category for them.
// Kinyarwanda and English both matter here, because a citizen types in whichever comes first.
const categoryKeywords = {
  'infrastructure-sanitation': ['amazi', 'imyanda', 'umuhanda', 'isuku', 'imiyoboro', 'itara', 'amashanyarazi', 'ikiraro', 'water', 'road', 'waste', 'drainage', 'street light', 'sanitation', 'electricity', 'garbage'],
  'land-housing-construction': ['ubutaka', 'inzu', 'imiturire', 'ikibanza', 'umupaka', 'imbibi', 'impapuro z ubutaka', 'land', 'plot', 'housing', 'construction', 'permit', 'boundary', 'property'],
  'community-safety-health': ['umutekano', 'ubuzima', 'ivuriro', 'indwara', 'urugomo', 'abajura', 'ubwoba', 'safety', 'health', 'security', 'clinic', 'disease', 'violence', 'theft'],
  'governance-accountability': ['ruswa', 'uburiganya', 'akarengane', 'umuyobozi', 'kunyereza', 'corruption', 'bribe', 'misconduct', 'unfair', 'abuse', 'complaint about staff'],
  'citizen-services': ['icyangombwa', 'impapuro', 'serivisi', 'uruhushya', 'document', 'certificate', 'service', 'application', 'delay', 'front desk']
};

const detectCategory = (text, categories = []) => {
  const value = String(text || '').toLowerCase();
  if (!value.trim()) return null;
  const match = Object.entries(categoryKeywords)
    .find(([, words]) => words.some((word) => value.includes(word)));
  const code = match?.[0] || 'citizen-services';
  return categories.find((category) => category.code === code) || categories[0] || null;
};

// The response trail the backend already records IS the case history, so we render it directly.
const timelineOf = (complaint) => (complaint.responses || []).map((response) => ({
  title: response.responseText,
  when: `${response.responder} · ${formatDateTime(response.createdAt)}`,
  done: true
}));

const formatFileSize = (bytes = 0) => {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const audioExtensionFromMime = (mime = '') => {
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('wav')) return 'wav';
  return 'webm';
};

const supportedAudioMimeType = () => [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus'
].find((type) => window.MediaRecorder?.isTypeSupported?.(type));

const EvidenceLinks = ({ complaint }) => {
  const hasAttachment = Boolean(complaint.attachmentPath);
  const hasVoiceNote = Boolean(complaint.voiceNotePath);
  const hasLink = Boolean(complaint.evidenceLink);
  if (!hasAttachment && !hasVoiceNote && !hasLink) return null;

  return (
    <div style={{ marginTop: 12 }}>
      {hasVoiceNote && (
        <div>
          <small className="hint">Voice complaint recorded by the citizen</small>
          <audio className="w-full" style={{ width: '100%', marginTop: 4 }} controls src={`${API_ORIGIN}${complaint.voiceNotePath}`} />
        </div>
      )}
      <div className="row-actions" style={{ marginTop: 8 }}>
        {hasAttachment && (
          <a className="btn ghost sm" href={`${API_ORIGIN}${complaint.attachmentPath}`} target="_blank" rel="noreferrer">
            📎 {complaint.attachmentName || 'Open evidence'}
          </a>
        )}
        {hasLink && (
          <a className="btn ghost sm" href={complaint.evidenceLink} target="_blank" rel="noreferrer">
            🔗 Open evidence link
          </a>
        )}
      </div>
    </div>
  );
};

/* ══════════════ SHARED: PRIVATE CASE CHAT ══════════════ */

// The private conversation on one case. It only exists once the assigned office has
// answered, so a citizen is never left typing into a room nobody is assigned to read.
const ComplaintChat = ({ complaint, onChange, readOnly = false }) => {
  const toast = useToast();
  const { user } = useAuth();
  const [messages, setMessages] = useState(complaint.messages || []);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const isCitizen = user?.role === 'citizen';
  const closed = complaint.status === 'Closed';
  const conversationStarted = complaint.chatOpen || messages.length > 0;
  const canFetchThread = !complaint.chatRedacted && (conversationStarted || (!isCitizen && !readOnly));

  const loadThread = useCallback(() => {
    if (!canFetchThread) return Promise.resolve(null);
    return endpoints.complaintMessages(complaint.trackingNumber)
      .then((fresh) => {
        setMessages(fresh.messages || []);
        return fresh;
      });
  }, [canFetchThread, complaint.trackingNumber]);

  // Opening the thread is what marks it read, so the badge clears for whoever is looking.
  useEffect(() => {
    setMessages(complaint.messages || []);
  }, [complaint.trackingNumber, complaint.messageCount, complaint.messages]);

  useEffect(() => {
    if (!canFetchThread) return undefined;
    let active = true;
    const refresh = () => loadThread()
      .then((fresh) => { if (active && fresh) setMessages(fresh.messages || []); })
      .catch(() => { /* the copy we were handed still renders */ });
    refresh();
    const interval = setInterval(refresh, 7000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [canFetchThread, loadThread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  const send = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const updated = await endpoints.sendComplaintMessage(complaint.trackingNumber, body);
      setMessages(updated.messages || []);
      setDraft('');
      onChange?.();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send your message'));
    } finally {
      setSending(false);
    }
  };

  if (complaint.chatRedacted) {
    return (
      <div className="chat-shell">
        <p className="chat-locked">
          This conversation is private to the citizen and the department handling the case.
        </p>
      </div>
    );
  }

  if (!conversationStarted && (isCitizen || readOnly)) {
    return (
      <div className="chat-shell">
        <p className="chat-locked">
          {isCitizen
            ? 'The conversation opens as soon as the assigned office replies to your complaint.'
            : 'Only the department handling this case can reply.'}
        </p>
      </div>
    );
  }

  return (
    <div className="chat-shell">
      <div className="chat-log">
        {messages.length === 0
          ? (
            <p className="chat-locked">
              {conversationStarted ? 'No messages yet.' : 'No feedback yet. Send the first reply to open the conversation.'}
            </p>
          )
          : messages.map((message) => (
            <div key={message.id} className={`chat-msg ${message.mine ? 'mine' : 'theirs'}`}>
              <div className="chat-bubble">
                <small className="chat-who">
                  {message.senderName}{message.senderRole !== 'citizen' ? ' · Office' : ''}
                </small>
                <p>{message.body}</p>
                <small className="chat-when">{formatDateTime(message.createdAt)}</small>
              </div>
            </div>
          ))}
        <div ref={endRef} />
      </div>

      {closed
        ? <p className="chat-locked">This complaint is closed. The conversation is read-only.</p>
        : readOnly
          ? <p className="chat-locked">Only the department handling this case can reply.</p>
          : (
            <form className="chat-form" onSubmit={send}>
              <input
                className="input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={isCitizen ? 'Reply to the office…' : 'Write feedback to the citizen…'}
                maxLength={2000}
                disabled={sending}
              />
              <button type="submit" className="btn sm" disabled={sending || !draft.trim()}>
                {sending ? 'Sending…' : 'Send'}
              </button>
            </form>
          )}
    </div>
  );
};

/* ══════════════ CITIZEN: SUBMIT ══════════════ */

export const SubmitComplaint = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [meta, setMeta] = useState(null);
  const [description, setDescription] = useState('');
  const [pickedCategoryId, setPickedCategoryId] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [cell, setCell] = useState(user?.cell || kacyiruLocation.cells[0].name);
  const [village, setVillage] = useState(user?.village || villagesForCell(user?.cell || kacyiruLocation.cells[0].name)[0] || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [file, setFile] = useState(null);
  const [evidenceLink, setEvidenceLink] = useState('');
  const [voiceNote, setVoiceNote] = useState(null);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState('');
  const [recording, setRecording] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const mediaRecorderRef = useRef(null);
  const recordingStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const voiceNoteUrlRef = useRef('');

  useEffect(() => { endpoints.complaintMeta().then(setMeta).catch(() => {}); }, []);

  useEffect(() => () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (voiceNoteUrlRef.current) URL.revokeObjectURL(voiceNoteUrlRef.current);
  }, []);

  const categories = meta?.categories || [];
  const detected = useMemo(() => detectCategory(description, categories), [description, categories]);
  const category = categories.find((item) => item.id === pickedCategoryId) || detected;
  const office = meta?.routingRules?.find((rule) => rule.categoryId === category?.id)?.office;

  const removeVoiceNote = () => {
    if (voiceNoteUrlRef.current) URL.revokeObjectURL(voiceNoteUrlRef.current);
    voiceNoteUrlRef.current = '';
    setVoiceNote(null);
    setVoiceNoteUrl('');
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      toast.error('Voice recording is not supported in this browser. Please type instead.');
      return;
    }
    try {
      removeVoiceNote();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = supportedAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      recordingStreamRef.current = stream;
      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        setRecording(false);
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          voiceNoteUrlRef.current = url;
          setVoiceNote(blob);
          setVoiceNoteUrl(url);
          toast.success('Voice recording saved. Play it back before you submit.');
        }
      };
      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        setRecording(false);
        toast.error('Voice recording stopped. Please try again.');
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setRecording(false);
      toast.error('Microphone permission was not granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    else setRecording(false);
  };

  const pickFile = (event) => {
    const selected = event.target.files?.[0] || null;
    setUploadPercent(null);
    if (selected && selected.size > maxEvidenceBytes) {
      event.target.value = '';
      setFile(null);
      toast.error(`This file is ${formatFileSize(selected.size)}. The maximum upload is 100 MB. Paste a public evidence link instead.`);
      return;
    }
    setFile(selected);
  };

  const reset = () => {
    setDescription('');
    setPickedCategoryId(null);
    setFile(null);
    setEvidenceLink('');
    removeVoiceNote();
    setUploadPercent(null);
    setSubmitted(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (recording) return toast.error('Stop the voice recording before submitting.');
    if (!description.trim() && !voiceNote && !file && !evidenceLink.trim()) {
      return toast.error('Describe the problem, record a voice complaint, or attach evidence.');
    }
    if (!category) return toast.error('Complaint categories are still loading. Try again in a moment.');

    setSaving(true);
    try {
      const payload = {
        type: category.name,
        categoryId: category.id,
        description: description.trim(),
        citizenPhone: phone,
        cell,
        village,
        evidenceLink: evidenceLink.trim(),
        location: [user?.sector || 'Kacyiru', user?.district || 'Gasabo', user?.province || 'Kigali City'].join(', '),
        channel: voiceNote ? 'Voice Recording' : 'Web Portal',
        submissionMode: voiceNote ? 'Voice Recording' : file ? 'Evidence Upload' : 'Typed form'
      };

      let complaint;
      if (file || voiceNote) {
        const total = (file?.size || 0) + (voiceNote?.size || 0);
        setUploadPercent(0);
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => formData.append(key, value));
        if (file) formData.append('attachment', file);
        if (voiceNote) formData.append('voiceNote', voiceNote, `citizen-voice-complaint.${audioExtensionFromMime(voiceNote.type)}`);
        complaint = await endpoints.createComplaint(formData, {
          onUploadProgress: (progress) => {
            const loaded = progress.loaded || 0;
            const size = progress.total || total || 0;
            setUploadPercent(size ? Math.min(99, Math.round((loaded / size) * 100)) : 0);
          }
        });
        setUploadPercent(100);
      } else {
        complaint = await endpoints.createComplaint(payload);
      }
      setSubmitted(complaint);
    } catch (err) {
      setUploadPercent(null);
      toast.error(errorMessage(err, 'Could not submit the complaint'));
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ maxWidth: 680 }}>
        <div className="success">
          <div className="big" aria-hidden="true">✅</div>
          <p style={{ fontWeight: 800, fontSize: 18, marginTop: 6 }}>Your complaint was received.</p>
          <p className="scf-big">{submitted.trackingNumber}</p>
          <div className="meta" style={{ justifyContent: 'center' }}>
            <span><b>Routed to:</b> {submitted.assignedOffice}</span>
            <span><b>Answer due by:</b> {formatDate(submitted.dueDate)}</span>
          </div>
          <div className="row-actions" style={{ justifyContent: 'center', marginTop: 16 }}>
            <Link className="btn" to={`/app/complaints/${submitted.trackingNumber}`}>Track this complaint</Link>
            <button type="button" className="btn ghost" onClick={reset}>Submit another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 22 }}>
      <PageTitle
        title={`Welcome, ${user?.fullName?.split(' ')[0] || 'Citizen'}`}
        subtitle="Describe the problem in your own words. You do not choose an office — the system routes it for you."
      />
      <form onSubmit={submit} className="card" style={{ marginTop: 18, maxWidth: 680 }}>
        <p className="card-t">Write or speak your complaint</p>
        <small className="hint">One step: say what happened, then send. Everything else is filled in for you.</small>

        <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'flex-start' }}>
          <textarea
            className="input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Example: There has been no water in our village for three days, the pipe burst near the market."
          />
          <button
            type="button"
            className={`mic ${recording ? 'rec' : ''}`}
            onClick={recording ? stopRecording : startRecording}
            title={recording ? 'Stop recording' : 'Record your complaint'}
            aria-label={recording ? 'Stop recording' : 'Record your complaint'}
          >
            {recording ? <Square size={20} /> : <Mic size={20} />}
          </button>
        </div>

        {recording && <p className="err" style={{ fontWeight: 600 }}>Recording now. Speak clearly, then press stop.</p>}
        {voiceNoteUrl && (
          <div style={{ marginTop: 10 }}>
            <audio style={{ width: '100%' }} controls src={voiceNoteUrl} />
            <div className="row-actions" style={{ marginTop: 6 }}>
              <button type="button" className="btn red sm" onClick={removeVoiceNote}><Trash2 size={14} /> Remove recording</button>
            </div>
          </div>
        )}

        {category && (
          <div className="auto-hint">
            <span aria-hidden="true">✨</span>
            <span><b>The system chose this category:</b> {category.name}</span>
            <span>Change it below if that is not right.</span>
          </div>
        )}

        <div className="cat-pick">
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`cat-opt ${category?.id === item.id ? 'on' : ''}`}
              onClick={() => setPickedCategoryId(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>

        {category && (
          <div className="meta" style={{ marginTop: 12 }}>
            <span><span aria-hidden="true">📍</span> <b>Goes to:</b> {office || 'Assigned automatically'}</span>
            <span><span aria-hidden="true">⏱️</span> <b>Answer within (days):</b> {category.slaDays}</span>
          </div>
        )}

        <div className="row-actions">
          <button type="button" className="btn ghost sm" onClick={() => setShowDetails((open) => !open)}>
            {showDetails ? 'Hide extra details' : 'Add location, phone or evidence (optional)'}
          </button>
        </div>

        {showDetails && (
          <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14, display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
              <div>
                <label className="label" htmlFor="cell">Cell</label>
                <select
                  id="cell"
                  className="input"
                  value={cell}
                  onChange={(event) => {
                    setCell(event.target.value);
                    setVillage(villagesForCell(event.target.value)[0] || '');
                  }}
                >
                  {kacyiruLocation.cells.map((item) => <option key={item.name}>{item.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="village">Village</label>
                <select id="village" className="input" value={village} onChange={(event) => setVillage(event.target.value)}>
                  {villagesForCell(cell).map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="phone">Phone</label>
                <input id="phone" className="input" value={phone} onChange={(event) => setPhone(event.target.value)} />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="evidence">Evidence file (photo, video, audio or PDF, max 100 MB)</label>
              <input id="evidence" className="input" type="file" accept="image/*,video/*,audio/*,.pdf" onChange={pickFile} />
              {file && <small className="hint">{file.name} — {formatFileSize(file.size)}</small>}
            </div>

            <div>
              <label className="label" htmlFor="evidence-link">Public evidence link (for large videos)</label>
              <input
                id="evidence-link"
                className="input"
                type="url"
                value={evidenceLink}
                onChange={(event) => setEvidenceLink(event.target.value)}
                placeholder="https://drive.google.com/..."
              />
            </div>
          </div>
        )}

        {uploadPercent !== null && (
          <div style={{ marginTop: 14 }}>
            <small className="hint">Uploading evidence. Keep this page open.</small>
            <div className="bar-track" style={{ marginTop: 6 }}>
              <div className="bar-fill" style={{ width: `${uploadPercent}%` }} />
            </div>
          </div>
        )}

        <button className="btn lg block" style={{ marginTop: 16 }} disabled={saving}>
          {saving ? 'Sending…' : 'Send complaint'}
        </button>
      </form>
    </div>
  );
};

/* ══════════════ CITIZEN: MY COMPLAINTS ══════════════ */

export const MyComplaints = () => {
  const [complaints, setComplaints] = useState(null);

  const load = useCallback(() => endpoints.myComplaints().then(setComplaints).catch(() => setComplaints([])), []);
  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  if (!complaints) return <LoadingState />;

  const open = complaints.filter((complaint) => !isTerminal(complaint));
  const resolved = complaints.filter((complaint) => isTerminal(complaint));
  const awaitingRating = complaints.filter((complaint) => complaint.status === 'Resolved' && !complaint.satisfaction);

  return (
    <div style={{ marginTop: 22 }}>
      <PageTitle title="My complaints" subtitle="Track every complaint you submitted and rate the answer you received." />
      {complaints.length > 0 && (
        <div className="stats">
          <Stat label="All complaints" value={complaints.length} />
          <Stat label="Still open" value={open.length} />
          <Stat label="Resolved / closed" value={resolved.length} />
          <Stat label="Waiting for your rating" value={awaitingRating.length} />
        </div>
      )}

      {complaints.length === 0
        ? <Empty title="You have not submitted a complaint yet" subtitle="Open the Submit Complaint tab to start." />
        : (
          <div className="grid g2">
            {complaints.map((complaint) => (
              <CitizenCase key={complaint.id} complaint={complaint} onChange={load} />
            ))}
          </div>
        )}
    </div>
  );
};

const CitizenCase = ({ complaint, onChange, alwaysOpen = false }) => {
  const toast = useToast();
  const [open, setOpen] = useState(alwaysOpen);
  const [comment, setComment] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [appealReason, setAppealReason] = useState('');
  // Nothing is pre-selected: confirming a fix and appealing are opposite answers, and the
  // citizen has to be the one who picks.
  const [mode, setMode] = useState(null);
  const [saving, setSaving] = useState(false);

  const rate = async (score) => {
    setSaving(true);
    try {
      await endpoints.rateComplaint(complaint.trackingNumber, { score, comment, isPublic });
      toast.success(score <= 2
        ? `You rated ${score}/5, so ${complaint.trackingNumber} was reopened and escalated to ${SECTOR_OFFICE}.`
        : `Thank you. ${complaint.trackingNumber} is now closed.`);
      setComment('');
      setMode(null);
      onChange();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save your rating'));
    } finally {
      setSaving(false);
    }
  };

  const appeal = async () => {
    setSaving(true);
    try {
      await endpoints.requestEscalation(complaint.trackingNumber, { reason: appealReason });
      toast.success(`${complaint.trackingNumber} was escalated to ${SECTOR_OFFICE} at your request.`);
      setAppealReason('');
      setMode(null);
      onChange();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send your request'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <span className="scf">{complaint.trackingNumber}</span>
          {isOverdue(complaint) && <span className="over" style={{ marginLeft: 8 }}>Past due date</span>}
        </div>
        <Badge value={complaint.status} />
      </div>
      <div className="meta">
        <span><b>Office:</b> {complaint.assignedOffice}</span>
        <span><b>Due date:</b> {formatDate(complaint.dueDate)}</span>
      </div>
      <p className="body-txt">{complaint.description}</p>
      <EvidenceLinks complaint={complaint} />

      {complaint.unreadMessages > 0 && (
        <div className="meta" style={{ marginTop: 8 }}>
          <span className="unread-dot">
            {complaint.unreadMessages} new {complaint.unreadMessages === 1 ? 'message' : 'messages'}
          </span>
        </div>
      )}

      {complaint.status === 'Resolved' && !complaint.satisfaction && (
        <div className="decide-box">
          <p className="decide-title">The office marked this resolved — did it solve your problem?</p>
          <div className="row-actions">
            <button type="button" className={`btn sm ${mode === 'rate' ? '' : 'ghost'}`} disabled={saving} onClick={() => setMode('rate')}>
              Yes, it is resolved
            </button>
            <button type="button" className={`btn sm ${mode === 'appeal' ? '' : 'ghost'}`} disabled={saving} onClick={() => setMode('appeal')}>
              No, I still need help
            </button>
          </div>

          {mode === 'rate' && (
            <div style={{ marginTop: 12 }}>
              <input
                className="input"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Tell others how you were helped (optional)"
              />
              <label className="chk">
                <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
                <span>Publish my feedback on the public page</span>
              </label>
              <div className="stars">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button key={score} type="button" className="star" disabled={saving} onClick={() => rate(score)} aria-label={`Rate ${score} out of 5`}>★</button>
                ))}
              </div>
              <small className="hint">Pick a rating to close this complaint. 1–2 stars sends it back to {SECTOR_OFFICE} instead.</small>
            </div>
          )}

          {mode === 'appeal' && (
            <div style={{ marginTop: 12 }}>
              <textarea
                className="input"
                rows={3}
                value={appealReason}
                onChange={(event) => setAppealReason(event.target.value)}
                placeholder="Explain what is still not solved (optional)"
              />
              <div className="row-actions">
                <button type="button" className="btn sm" disabled={saving} onClick={appeal}>
                  {saving ? 'Sending…' : `Ask ${SECTOR_OFFICE} for help`}
                </button>
              </div>
              <small className="hint">Your case is sent to {SECTOR_OFFICE} and the administrator is notified.</small>
            </div>
          )}
        </div>
      )}

      {/* An unanswered case that has run past its deadline: the appeal is the only move left. */}
      {complaint.canRequestEscalation && complaint.status !== 'Resolved' && (
        <div className="decide-box">
          <p className="decide-title">This complaint passed its due date without being solved.</p>
          <textarea
            className="input"
            rows={2}
            value={appealReason}
            onChange={(event) => setAppealReason(event.target.value)}
            placeholder="Explain what is still not solved (optional)"
          />
          <div className="row-actions">
            <button type="button" className="btn sm" disabled={saving} onClick={appeal}>
              {saving ? 'Sending…' : `Ask ${SECTOR_OFFICE} for help`}
            </button>
          </div>
        </div>
      )}

      {complaint.escalationRequestedAt && complaint.status === 'Escalated' && (
        <div className="meta" style={{ marginTop: 10 }}>
          <span><b>You asked for senior review on:</b> {formatDate(complaint.escalationRequestedAt)}</span>
        </div>
      )}

      {complaint.satisfaction && (
        <div className="meta" style={{ marginTop: 10 }}>
          <span><span aria-hidden="true">⭐</span> <b>You rated:</b> {complaint.satisfaction.score}/5</span>
          {complaint.satisfaction.isPublic && <span>Published publicly</span>}
        </div>
      )}

      {!alwaysOpen && (
        <div className="row-actions">
          <button type="button" className="btn ghost sm" onClick={() => setOpen((value) => !value)}>
            {open ? 'Hide conversation & history' : 'Open conversation & history'}
          </button>
        </div>
      )}
      {/* Mounted only when the card is expanded: mounting is what marks the thread read,
          so a collapsed card in a list must not claim the citizen has read it. */}
      {open && (
        <>
          <ComplaintChat complaint={complaint} onChange={onChange} />
          <Timeline items={timelineOf(complaint)} />
        </>
      )}
    </div>
  );
};

/* ══════════════ SHARED: SINGLE CASE PAGE ══════════════ */

export const ComplaintDetails = () => {
  const { trackingNumber } = useParams();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState(null);
  const [missing, setMissing] = useState(false);

  const load = useCallback(() => endpoints.complaint(trackingNumber)
    .then((data) => {
      setComplaint(data);
      setMissing(false);
    })
    .catch(() => setMissing(true)), [trackingNumber]);
  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  if (missing) return <Empty title="Complaint not found" subtitle="It may have been removed, or it does not belong to your office." />;
  if (!complaint) return <LoadingState />;
  const ownsCurrentOffice = user?.role === 'staff' && complaint.assignedOfficeId === user.officeId;
  const isEscalationSource = user?.role === 'staff'
    && complaint.status === 'Escalated'
    && complaint.escalationSourceOfficeId === user.officeId;
  const canAdminHandleEscalation = user?.role === 'admin' && complaint.status === 'Escalated';
  const staffReadOnly = user?.role === 'admin' ? !canAdminHandleEscalation : !ownsCurrentOffice;
  const chatReadOnly = user?.role === 'admin' ? !canAdminHandleEscalation : !(ownsCurrentOffice || isEscalationSource);

  return (
    <div style={{ marginTop: 22, maxWidth: 680 }}>
      <PageTitle title={complaint.trackingNumber} subtitle={`${complaint.category} · ${complaint.assignedOffice}`} />
      <div style={{ marginTop: 18 }}>
        {user?.role === 'citizen'
          ? <CitizenCase complaint={complaint} onChange={load} alwaysOpen />
          : <StaffCase complaint={complaint} onChange={load} alwaysOpen readOnly={staffReadOnly} chatReadOnly={chatReadOnly} />}
      </div>
    </div>
  );
};

/* ══════════════ STAFF: CASES ══════════════ */

export const AssignedCases = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState(null);
  const [offices, setOffices] = useState(null);
  const [filter, setFilter] = useState('open');

  const load = useCallback(() => endpoints.complaints().then(setComplaints).catch(() => setComplaints([])), []);
  useEffect(() => {
    load();
    endpoints.complaintMeta().then((meta) => setOffices(meta.offices)).catch(() => setOffices([]));
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  // Both must land before the header renders, or the office name flashes as "not assigned".
  if (!complaints || !offices) return <LoadingState />;

  const officeName = offices.find((office) => office.id === user?.officeId)?.name;

  const visible = complaints.filter((complaint) => {
    if (filter === 'open') return !isTerminal(complaint);
    if (filter === 'overdue') return isOverdue(complaint);
    if (filter === 'escalated') return complaint.status === 'Escalated';
    return true;
  });

  const filters = [
    { key: 'open', label: 'Open', count: complaints.filter((complaint) => !isTerminal(complaint)).length },
    { key: 'overdue', label: 'Past due date', count: complaints.filter(isOverdue).length },
    { key: 'escalated', label: 'Escalated', count: complaints.filter((complaint) => complaint.status === 'Escalated').length },
    { key: 'all', label: 'All', count: complaints.length }
  ];

  return (
    <div style={{ marginTop: 22 }}>
      <PageTitle
        title="Assigned to me"
        subtitle={officeName
          ? `Cases routed to ${officeName}. You can reply to the citizen and continue the conversation here.`
          : 'No office is linked to your staff account yet.'}
      />

      <div className="toolbar">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`tab ${filter === item.key ? 'active' : ''}`}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
            {item.count > 0 && <span className="count">{item.count}</span>}
          </button>
        ))}
      </div>

      {visible.length === 0
        ? <Empty title="No cases here" subtitle="New complaints routed to your office arrive here automatically." />
        : (
          <div className="grid g2">
            {visible.map((complaint) => {
              const ownsCurrentOffice = complaint.assignedOfficeId === user?.officeId;
              const isEscalationSource = complaint.status === 'Escalated'
                && complaint.escalationSourceOfficeId === user?.officeId;
              return (
                <StaffCase
                  key={complaint.id}
                  complaint={complaint}
                  onChange={load}
                  readOnly={!ownsCurrentOffice}
                  chatReadOnly={!(ownsCurrentOffice || isEscalationSource)}
                  detailPath={`/staff/cases/${complaint.trackingNumber}`}
                />
              );
            })}
          </div>
        )}
    </div>
  );
};

const StaffCase = ({ complaint, onChange, alwaysOpen = false, readOnly = false, chatReadOnly = readOnly, detailPath }) => {
  const toast = useToast();
  const [open, setOpen] = useState(alwaysOpen);
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);

  const act = async (label, run) => {
    setSaving(true);
    try {
      await run();
      toast.success(label);
      setResponse('');
      onChange();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update the case'));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = (status) => act(
    `${complaint.trackingNumber} is now ${status}.`,
    () => endpoints.updateComplaintStatus(complaint.trackingNumber, { status, responseText: response })
  );

  const resolve = () => {
    if (!response.trim()) return toast.error('Write the official answer before you resolve the case.');
    return act(
      `${complaint.trackingNumber} was resolved. The citizen can now rate it.`,
      () => endpoints.updateComplaintStatus(complaint.trackingNumber, { status: 'Resolved', responseText: response })
    );
  };

  const escalate = () => act(
    `${complaint.trackingNumber} was escalated to ${SECTOR_OFFICE}.`,
    () => endpoints.escalateComplaint(complaint.trackingNumber, { escalatedTo: SECTOR_OFFICE, reason: response })
  );

  const canWork = !readOnly && !isTerminal(complaint);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <span className="scf">{complaint.trackingNumber}</span>
          {isOverdue(complaint) && <span className="over" style={{ marginLeft: 8 }}>Past due date</span>}
        </div>
        <Badge value={complaint.status} />
      </div>
      <div className="meta">
        <span><b>Category:</b> {complaint.category}</span>
        <span><b>Office:</b> {complaint.assignedOffice}</span>
        {complaint.escalationSourceOffice && <span><b>Escalated from:</b> {complaint.escalationSourceOffice}</span>}
        <span><b>Priority:</b> {complaint.priority}</span>
        <span><b>Due date:</b> {formatDate(complaint.dueDate)}</span>
      </div>
      <div className="meta">
        {complaint.isAnonymous
          ? <span><span aria-hidden="true">🕶️</span> <b>Anonymous report</b> — the reporter is not identified</span>
          : (
            <>
              <span><b>Citizen:</b> {complaint.citizenName}</span>
              {complaint.citizenPhone && <span><b>Phone:</b> {complaint.citizenPhone}</span>}
            </>
          )}
        <span><b>Where:</b> {[complaint.village, complaint.cell].filter(Boolean).join(', ') || complaint.location}</span>
      </div>
      <div className="meta">
        <span><b>Submitted:</b> {formatDateTime(complaint.createdAt)}</span>
        <span><b>Channel:</b> {complaint.channel || 'Web Portal'}</span>
        <span><b>Mode:</b> {complaint.submissionMode || 'Typed form'}</span>
        {complaint.assignedTo && <span><b>Assigned to:</b> {complaint.assignedTo}</span>}
      </div>
      {readOnly && (
        <div className="case-note">
          {chatReadOnly
            ? `View-only for your account. This case is assigned to ${complaint.assignedOffice || 'another office'}.`
            : 'This case is escalated to the Sector Executive Office. Your department can still reply in the feedback chat, but the escalation office controls the final response.'}
        </div>
      )}
      <p className="body-txt">{complaint.description}</p>
      <EvidenceLinks complaint={complaint} />

      {complaint.unreadMessages > 0 && (
        <div className="meta" style={{ marginTop: 8 }}>
          <span className="unread-dot">
            {complaint.unreadMessages} new {complaint.unreadMessages === 1 ? 'message' : 'messages'} from the citizen
          </span>
        </div>
      )}

      <div className="row-actions">
        {detailPath && <Link className="btn ghost sm" to={detailPath}>View full details</Link>}
        <button type="button" className="btn ghost sm" onClick={() => setOpen((value) => !value)}>
          {open ? 'Close case panel' : readOnly ? 'See case history' : 'Open & work on this case'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          {canWork && (
            <>
              <div className="row-actions" style={{ marginTop: 0 }}>
                {complaint.status === 'Assigned' && (
                  <button type="button" className="btn sm" disabled={saving} onClick={() => setStatus('In Review')}>Start reviewing</button>
                )}
                {complaint.status === 'Escalated' && (
                  <button type="button" className="btn sm" disabled={saving} onClick={() => setStatus('In Review')}>Take senior review</button>
                )}
                {complaint.status !== 'Escalated' && (
                  <button type="button" className="btn ghost sm" disabled={saving} onClick={() => setStatus('Waiting for Citizen')}>Ask the citizen for more</button>
                )}
                {complaint.status !== 'Escalated' && (
                  <button type="button" className="btn red sm" disabled={saving} onClick={escalate}>Escalate</button>
                )}
              </div>
              <div style={{ marginTop: 12 }}>
                <label className="label" htmlFor={`response-${complaint.id}`}>Official answer (the citizen is notified)</label>
                <textarea
                  id={`response-${complaint.id}`}
                  className="input"
                  style={{ minHeight: 80 }}
                  value={response}
                  onChange={(event) => setResponse(event.target.value)}
                  placeholder="Write the answer from your office…"
                />
                <button type="button" className="btn green sm" style={{ marginTop: 8 }} disabled={saving || !response.trim()} onClick={resolve}>
                  Send resolution to citizen
                </button>
                <small className="hint">
                  This marks the case as Resolved, not Closed. Your first answer opens the private chat, and only the citizen closes the case by rating it.
                </small>
              </div>
            </>
          )}

          <div style={{ marginTop: 14 }}>
            <label className="label">Feedback chat</label>
            <ComplaintChat complaint={complaint} onChange={onChange} readOnly={chatReadOnly} />
          </div>

          <Timeline items={timelineOf(complaint)} />
        </div>
      )}
    </div>
  );
};

/* ══════════════ SHARED: NOTIFICATIONS ══════════════ */

export const ComplaintNotifications = () => {
  const { refreshUnread } = useOutletContext() || {};
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(null);

  const load = useCallback(() => endpoints.complaintNotifications().then(setNotifications).catch(() => setNotifications([])), []);
  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  const casePath = (trackingNumber) => {
    if (!trackingNumber) return null;
    const encoded = encodeURIComponent(trackingNumber);
    if (user?.role === 'citizen') return `/app/complaints/${encoded}`;
    if (user?.role === 'staff') return `/staff/cases/${encoded}`;
    return `/admin/complaints/${encoded}`;
  };

  const openNotification = async (notification) => {
    if (!notification.read) {
      await endpoints.readNotification(notification.dbId).catch(() => {});
      setNotifications((items) => items.map((item) => (item.id === notification.id ? { ...item, read: true } : item)));
    }
    refreshUnread?.();
    const path = casePath(notification.trackingNumber);
    if (path) navigate(path);
  };

  if (!notifications) return <LoadingState />;

  return (
    <div style={{ marginTop: 22 }}>
      <PageTitle title="Notifications" subtitle="Every update on your cases appears here." />
      {notifications.length === 0
        ? <Empty title="No notifications yet" subtitle="You will be told here whenever a case moves." />
        : (
          <div className="card" style={{ marginTop: 18 }}>
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                className={`notif ${notification.read ? '' : 'unread'}`}
                onClick={() => openNotification(notification)}
              >
                <span className="notif-ico" aria-hidden="true">{notification.read ? '📄' : '🔔'}</span>
                <span>
                  <span style={{ fontSize: 14, fontWeight: 700, display: 'block' }}>{notification.title}</span>
                  <span style={{ fontSize: 13, color: 'var(--muted)', display: 'block' }}>{notification.message}</span>
                  <small className="hint">{notification.trackingNumber} · {formatDateTime(notification.createdAt)}</small>
                </span>
              </button>
            ))}
          </div>
        )}
    </div>
  );
};

/* ══════════════ REPORTS (staff + admin) ══════════════ */

const escapeReportValue = (value = '') => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const printableRows = (rows = [], emptyText = 'No records in this section.') => (
  rows.length
    ? rows.join('')
    : `<tr><td colspan="6" class="empty-cell">${escapeReportValue(emptyText)}</td></tr>`
);

const printableBreakdownRows = (items = []) => printableRows(
  items.map((item) => `
    <tr>
      <td>${escapeReportValue(item.name)}</td>
      <td class="num">${escapeReportValue(item.value)}</td>
    </tr>
  `),
  'No data recorded yet.'
);

const printableComplaintRows = (items = [], emptyText = 'No complaints to show.') => printableRows(
  items.map((complaint) => `
    <tr>
      <td>${escapeReportValue(complaint.trackingNumber)}</td>
      <td>${escapeReportValue(complaint.category)}</td>
      <td>${escapeReportValue(complaint.assignedOffice)}</td>
      <td>${escapeReportValue(complaint.priority)}</td>
      <td>${escapeReportValue(complaint.status)}</td>
      <td>${escapeReportValue(formatDate(complaint.dueDate))}</td>
    </tr>
  `),
  emptyText
);

const printableAuditRows = (items = []) => printableRows(
  items.map((log) => `
    <tr>
      <td>${escapeReportValue(formatDateTime(log.createdAt))}</td>
      <td>${escapeReportValue(log.actor)}</td>
      <td colspan="4">${escapeReportValue(log.action)}</td>
    </tr>
  `),
  'No audit entries to show.'
);

const printableReportHtml = (reports, user) => {
  const {
    summary,
    byCategory = [],
    byStatus = [],
    byOffice = [],
    recentComplaints = [],
    adminAttention = [],
    auditLogs = []
  } = reports;
  const generatedAt = formatDateTime(new Date().toISOString());
  const scope = user?.role === 'staff' ? 'Assigned office report' : 'Kacyiru Sector admin report';

  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Smart Citizen Complaint Report</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #0f2537; margin: 28px; line-height: 1.35; }
          .report-head { border-bottom: 3px solid #0ea5e9; padding-bottom: 14px; margin-bottom: 18px; }
          h1 { font-size: 24px; margin: 0 0 6px; }
          h2 { font-size: 16px; margin: 24px 0 8px; color: #0369a1; }
          .muted { color: #5b7185; font-size: 12px; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0 8px; }
          .metric { border: 1px solid #dbeafe; border-radius: 8px; padding: 10px; background: #f8fcff; }
          .metric b { display: block; font-size: 22px; color: #0369a1; }
          .metric span { font-size: 11px; color: #5b7185; text-transform: uppercase; letter-spacing: .04em; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; page-break-inside: avoid; }
          th { text-align: left; background: #e0f2fe; color: #0f2537; border: 1px solid #bfdbfe; padding: 7px; }
          td { border: 1px solid #dbeafe; padding: 7px; vertical-align: top; }
          .num { text-align: right; font-weight: 700; }
          .empty-cell { text-align: center; color: #5b7185; }
          .split { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          @page { margin: 16mm; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
            .summary, .split { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <button class="no-print" onclick="window.print()" style="float:right;padding:8px 12px;font-weight:700;">Print</button>
        <section class="report-head">
          <h1>Smart Citizen Complaint Report</h1>
          <div class="muted">${escapeReportValue(scope)} | Generated by ${escapeReportValue(user?.fullName || 'Admin')} | ${escapeReportValue(generatedAt)}</div>
        </section>

        <section class="summary">
          <div class="metric"><span>Total complaints</span><b>${escapeReportValue(summary.totalComplaints)}</b></div>
          <div class="metric"><span>Solved / closed</span><b>${escapeReportValue(summary.resolved)}</b></div>
          <div class="metric"><span>Pending / open</span><b>${escapeReportValue(summary.openComplaints)}</b></div>
          <div class="metric"><span>Past due date</span><b>${escapeReportValue(summary.overdue)}</b></div>
          <div class="metric"><span>Escalated</span><b>${escapeReportValue(summary.escalated)}</b></div>
          <div class="metric"><span>Average rating</span><b>${escapeReportValue(summary.averageSatisfaction || '-')}</b></div>
        </section>

        <section class="split">
          <div>
            <h2>Complaints by status</h2>
            <table><thead><tr><th>Status</th><th class="num">Count</th></tr></thead><tbody>${printableBreakdownRows(byStatus)}</tbody></table>
          </div>
          <div>
            <h2>Complaints by category</h2>
            <table><thead><tr><th>Category</th><th class="num">Count</th></tr></thead><tbody>${printableBreakdownRows(byCategory)}</tbody></table>
          </div>
        </section>

        <h2>Complaints by responsible office</h2>
        <table><thead><tr><th>Office</th><th class="num">Count</th></tr></thead><tbody>${printableBreakdownRows(byOffice)}</tbody></table>

        <h2>Recent complaints</h2>
        <table>
          <thead><tr><th>Tracking number</th><th>Category</th><th>Office</th><th>Priority</th><th>Status</th><th>Due date</th></tr></thead>
          <tbody>${printableComplaintRows(recentComplaints)}</tbody>
        </table>

        <h2>Needs attention</h2>
        <table>
          <thead><tr><th>Tracking number</th><th>Category</th><th>Office</th><th>Priority</th><th>Status</th><th>Due date</th></tr></thead>
          <tbody>${printableComplaintRows(adminAttention, 'No overdue, escalated, or low-rated complaints need attention.')}</tbody>
        </table>

        <h2>Recent audit actions</h2>
        <table>
          <thead><tr><th>Time</th><th>Actor</th><th colspan="4">Action</th></tr></thead>
          <tbody>${printableAuditRows(auditLogs)}</tbody>
        </table>
      </body>
    </html>`;
};

export const AdminComplaintReports = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [reports, setReports] = useState(null);

  useEffect(() => { endpoints.complaintReports().then(setReports).catch(() => setReports(null)); }, []);

  if (!reports) return <LoadingState />;

  const { summary, byCategory, byOffice } = reports;
  const totalByCategory = byCategory.reduce((sum, item) => sum + item.value, 0);
  const totalByOffice = byOffice.reduce((sum, item) => sum + item.value, 0);
  const printReport = () => {
    const reportWindow = window.open('', 'smart-citizen-complaint-report', 'width=1100,height=800');
    if (!reportWindow) {
      toast.error('Allow pop-ups to print the report.');
      return;
    }
    reportWindow.document.open();
    reportWindow.document.write(printableReportHtml(reports, user));
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.setTimeout(() => reportWindow.print(), 300);
  };
  const downloadReport = async (format) => {
    try {
      const response = await endpoints.downloadComplaintReport(format);
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const disposition = response.headers['content-disposition'] || '';
      const fallback = `smart-citizen-complaint-report.${format === 'html' ? 'html' : 'csv'}`;
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || fallback;
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not download the report'));
    }
  };

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <PageTitle title="Reports" subtitle="How your cases are moving, and where they are stuck." />
        <div className="row-actions" style={{ marginTop: 0 }}>
          <button type="button" className="btn" onClick={printReport}>Print report</button>
          <button type="button" className="btn ghost" onClick={() => downloadReport('csv')}>Download CSV</button>
          <button type="button" className="btn ghost" onClick={() => downloadReport('html')}>Download document</button>
        </div>
      </div>
      <div className="stats">
        <Stat label="All complaints" value={summary.totalComplaints} />
        <Stat label="Resolved / closed" value={summary.resolved} />
        <Stat label="Still open" value={summary.openComplaints} />
        <Stat label="Past due date" value={summary.overdue} danger />
        <Stat label="Average rating" value={summary.averageSatisfaction || '—'} />
      </div>

      <div className="grid g2">
        <div className="card">
          <p className="card-t">Complaints by category</p>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {byCategory.map((item) => <Bar key={item.name} label={item.name} value={item.value} total={totalByCategory} />)}
          </div>
        </div>
        <div className="card">
          <p className="card-t">Complaints by office</p>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {byOffice.length === 0
              ? <small className="hint">No complaints have been routed yet.</small>
              : byOffice.map((item) => <Bar key={item.name} label={item.name} value={item.value} total={totalByOffice} />)}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════ ADMIN: ALL COMPLAINTS ══════════════ */

export const AdminComplaints = () => {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [complaints, setComplaints] = useState(null);
  const [meta, setMeta] = useState({ categories: [], offices: [] });
  const [query, setQuery] = useState(searchParams.get('q') || searchParams.get('query') || '');
  const [status, setStatus] = useState(searchParams.get('statusGroup') === 'resolved' ? 'resolved' : searchParams.get('status') || 'all');
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || 'all');
  const [officeId, setOfficeId] = useState(searchParams.get('officeId') || 'all');
  const [priority, setPriority] = useState(searchParams.get('priority') || 'all');
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get('overdue') === 'true');
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '');

  const load = () => endpoints.complaints().then(setComplaints).catch(() => setComplaints([]));
  useEffect(() => {
    load();
    endpoints.complaintMeta().then(setMeta).catch(() => {});
  }, []);

  useEffect(() => {
    setQuery(searchParams.get('q') || searchParams.get('query') || '');
    setStatus(searchParams.get('statusGroup') === 'resolved' ? 'resolved' : searchParams.get('status') || 'all');
    setCategoryId(searchParams.get('categoryId') || 'all');
    setOfficeId(searchParams.get('officeId') || 'all');
    setPriority(searchParams.get('priority') || 'all');
    setOverdueOnly(searchParams.get('overdue') === 'true');
    setDateFrom(searchParams.get('dateFrom') || '');
    setDateTo(searchParams.get('dateTo') || '');
  }, [searchParams]);

  if (!complaints) return <LoadingState />;

  const remove = async (trackingNumber) => {
    try {
      await endpoints.deleteComplaint(trackingNumber);
      toast.success(`${trackingNumber} was deleted.`);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete the complaint'));
    }
  };

  const term = query.trim().toLowerCase();
  const rows = complaints.filter((complaint) => {
    const matchesStatus = status === 'resolved'
      ? ['Resolved', 'Closed'].includes(complaint.status)
      : status === 'all' || complaint.status === status;
    const matchesCategory = categoryId === 'all' || String(complaint.categoryId) === String(categoryId);
    const matchesOffice = officeId === 'all' || String(complaint.assignedOfficeId) === String(officeId);
    const matchesPriority = priority === 'all' || complaint.priority === priority;
    const matchesOverdue = !overdueOnly || isOverdue(complaint);
    const createdDate = complaint.createdAt ? complaint.createdAt.slice(0, 10) : '';
    const matchesDateFrom = !dateFrom || createdDate >= dateFrom;
    const matchesDateTo = !dateTo || createdDate <= dateTo;
    const matchesTerm = !term
      || complaint.trackingNumber.toLowerCase().includes(term)
      || (complaint.description || '').toLowerCase().includes(term)
      || (complaint.assignedOffice || '').toLowerCase().includes(term)
      || (complaint.citizenName || '').toLowerCase().includes(term);
    return matchesStatus
      && matchesCategory
      && matchesOffice
      && matchesPriority
      && matchesOverdue
      && matchesDateFrom
      && matchesDateTo
      && matchesTerm;
  });

  return (
    <div style={{ marginTop: 22 }}>
      <PageTitle title="All complaints" subtitle="Every case in the sector, whichever office holds it." />
      <div className="toolbar">
        <input
          className="input search"
          placeholder="Search a tracking number, office, citizen or word…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select className="input" style={{ maxWidth: 240 }} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="resolved">Resolved / Closed</option>
          {['Assigned', 'In Review', 'Waiting for Citizen', 'Escalated', 'Resolved', 'Closed'].map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select className="input" style={{ maxWidth: 260 }} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="all">All categories</option>
          {meta.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 260 }} value={officeId} onChange={(event) => setOfficeId(event.target.value)}>
          <option value="all">All offices</option>
          {meta.offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 160 }} value={priority} onChange={(event) => setPriority(event.target.value)}>
          <option value="all">All priorities</option>
          {['Low', 'Medium', 'High', 'Critical'].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input className="input" style={{ maxWidth: 170 }} type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Submitted from" />
        <input className="input" style={{ maxWidth: 170 }} type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Submitted to" />
        <button type="button" className={`tab ${overdueOnly ? 'active' : ''}`} onClick={() => setOverdueOnly((value) => !value)}>
          Past due only
        </button>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => {
            setQuery('');
            setStatus('all');
            setCategoryId('all');
            setOfficeId('all');
            setPriority('all');
            setOverdueOnly(false);
            setDateFrom('');
            setDateTo('');
            setSearchParams({});
          }}
        >
          Clear filters
        </button>
      </div>

      <div className="card table-wrap" style={{ marginTop: 16 }}>
        <table className="data">
          <thead>
            <tr>
              <th>Tracking number</th>
              <th>Category</th>
              <th>Office</th>
              <th>Due date</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((complaint) => (
              <tr key={complaint.id}>
                <td><Link className="scf" to={`/admin/complaints/${complaint.trackingNumber}`}>{complaint.trackingNumber}</Link></td>
                <td>{complaint.category}</td>
                <td style={{ fontSize: 12.5 }}>{complaint.assignedOffice}</td>
                <td>
                  {formatDate(complaint.dueDate)}
                  {isOverdue(complaint) && <span className="over" style={{ marginLeft: 6 }}>!</span>}
                </td>
                <td><Badge value={complaint.status} /></td>
                <td>
                  <div className="row-actions compact">
                    <Link className="btn ghost sm" to={`/admin/complaints/${complaint.trackingNumber}`}>View details</Link>
                    <button type="button" className="btn red sm" onClick={() => remove(complaint.trackingNumber)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>No complaint matched your search.</p>}
      </div>
    </div>
  );
};
