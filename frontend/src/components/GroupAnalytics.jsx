import { useState, useEffect } from 'react';

export default function GroupAnalytics({ groupId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [groupId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/groups/${groupId}/analytics`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      } else {
        setError('Failed to load analytics');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body text-center">
          <div className="loading"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body text-center">
          <p className="text-error">{error}</p>
          <button onClick={fetchAnalytics} className="btn btn-primary btn-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Group Analytics</h3>
      </div>
      <div className="card-body">
        <div className="group-analytics">
          <div className="analytics-card">
            <span className="analytics-value">{analytics.member_count}</span>
            <div className="analytics-label">Total Members</div>
          </div>
          
          <div className="analytics-card">
            <span className="analytics-value">{analytics.posts_count}</span>
            <div className="analytics-label">Total Posts</div>
          </div>
          
          <div className="analytics-card">
            <span className="analytics-value">{analytics.events_count}</span>
            <div className="analytics-label">Total Events</div>
          </div>
          
          <div className="analytics-card">
            <span className="analytics-value">{analytics.recent_posts}</span>
            <div className="analytics-label">Posts (7 days)</div>
          </div>
          
          <div className="analytics-card">
            <span className="analytics-value">{analytics.recent_comments}</span>
            <div className="analytics-label">Comments (7 days)</div>
          </div>
          
          <div className="analytics-card">
            <span className="analytics-value">{analytics.activity_score}</span>
            <div className="analytics-label">Activity Score</div>
          </div>
        </div>
      </div>
    </div>
  );
}
