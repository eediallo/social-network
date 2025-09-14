import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      } else {
        setError('Failed to load groups');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const groupData = {
      title: formData.get('title'),
      description: formData.get('description')
    };

    setCreateLoading(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData),
        credentials: 'include'
      });

      if (res.ok) {
        const newGroup = await res.json();
        setGroups([newGroup, ...groups]);
        setShowCreateForm(false);
        e.target.reset();
      } else {
        setError('Failed to create group');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="text-center mt-5">
          <div className="loading"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="d-flex justify-between align-center mb-4">
        <h1>Groups</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary"
        >
          {showCreateForm ? 'Cancel' : 'Create Group'}
        </button>
      </div>

      {showCreateForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h3>Create New Group</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreateGroup}>
              <div className="form-group">
                <input
                  type="text"
                  name="title"
                  placeholder="Group Name"
                  className="form-input"
                  required
                  disabled={createLoading}
                />
              </div>
              <div className="form-group">
                <textarea
                  name="description"
                  placeholder="Group Description"
                  className="form-input form-textarea"
                  disabled={createLoading}
                />
              </div>
              <div className="d-flex gap-2">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createLoading}
                >
                  {createLoading ? <span className="loading"></span> : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-secondary"
                  disabled={createLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && (
        <div className="card mb-4">
          <div className="card-body text-center">
            <p className="text-error">{error}</p>
            <button 
              onClick={fetchGroups}
              className="btn btn-primary btn-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {groups.length === 0 && !error && (
        <div className="card">
          <div className="card-body text-center">
            <h3>No groups yet</h3>
            <p>Create your first group to get started!</p>
          </div>
        </div>
      )}

      <div className="groups-grid">
        {groups.map((group) => (
          <div key={group.id} className="group-card">
            <div className="group-card-header">
              <h3 className="group-title">{group.title}</h3>
              {group.description && (
                <p className="group-description">{group.description}</p>
              )}
            </div>
            <div className="group-card-body">
              <div className="group-meta">
                <span>Created {new Date(group.created_at).toLocaleDateString()}</span>
                <div className="group-members-count">
                  <span>👥</span>
                  <span>0 members</span>
                </div>
              </div>
              <div className="mt-3">
                <Link
                  to={`/groups/${group.id}`}
                  className="btn btn-primary btn-sm w-full"
                >
                  View Group
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
