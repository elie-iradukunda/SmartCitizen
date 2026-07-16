import { useEffect, useState } from 'react';
import { endpoints } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.jsx';
import { Empty, PageTitle, Stat, formatDate } from '../../components/Ui.jsx';

const Stars = ({ score }) => (
  <span className="stars-static" aria-label={`${score} out of 5`}>
    {[1, 2, 3, 4, 5].map((step) => (
      <span key={step} aria-hidden="true" className={step <= score ? 'star-on' : 'star-off'}>★</span>
    ))}
  </span>
);

// The sector's public record: what citizens said about cases that finished. Only feedback
// the citizen chose to publish reaches this page, and the conversation never does.
export const PublicFeedback = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    endpoints.publicFeedback()
      .then(setData)
      .catch(() => setData({ entries: [], summary: { total: 0, averageScore: 0 } }));
  }, []);

  if (!data) return <LoadingState />;

  const { entries, summary } = data;

  return (
    <div style={{ marginTop: 22 }}>
      <PageTitle
        title="Citizen feedback"
        subtitle="What citizens said about complaints this sector has finished."
      />

      {summary.total > 0 && (
        <div className="stats">
          <Stat label="Published reviews" value={summary.total} />
          <Stat label="Average rating" value={`${summary.averageScore} / 5`} />
        </div>
      )}

      {entries.length === 0
        ? <Empty title="No published feedback yet" subtitle="Feedback appears here once citizens confirm their complaints are solved." />
        : (
          <div className="grid g2">
            {entries.map((entry) => (
              <div className="card" key={entry.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <span className="scf">{entry.trackingNumber}</span>
                  <Stars score={entry.score} />
                </div>
                <div className="meta">
                  <span><b>Category:</b> {entry.category}</span>
                  <span><b>Office:</b> {entry.office}</span>
                </div>
                {entry.comment && <p className="body-txt">“{entry.comment}”</p>}
                <div className="meta" style={{ marginTop: 8 }}>
                  <span><b>{entry.citizenName}</b></span>
                  {[entry.village, entry.cell].filter(Boolean).length > 0 && (
                    <span>{[entry.village, entry.cell].filter(Boolean).join(', ')}</span>
                  )}
                  <span>{formatDate(entry.closedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
};
