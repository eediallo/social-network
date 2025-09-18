import { useState, useEffect } from 'react';
import { getInitials } from '../utils/avatarUtils';

export default function MemberManagement({ groupId, isOwner }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMembers();
  }, [groupId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/groups/${groupId}/members`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      } else {
        setError('Failed to load members');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRole = async (userId, newRole) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
        credentials: 'include'
      });

      if (res.ok) {
        // Update local state
        setMembers(prev => prev.map(member => 
          member.user_id === userId 
            ? { ...member, role: newRole }
            : member
        ));
      } else {
        alert('Failed to update member role');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const removeMember = async (userId, memberName) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this group?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        // Remove from local state
        setMembers(prev => prev.filter(member => member.user_id !== userId));
      } else {
        alert('Failed to remove member');
      }
    } catch (err) {
      alert('Network error');
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
          <button onClick={fetchMembers} className="btn btn-primary btn-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Member Management</h3>
        <p className="text-muted">Manage group members and their roles</p>
      </div>
      <div className="card-body">
        {members.length === 0 ? (
          <div className="text-center">
            <p>No members found.</p>
          </div>
        ) : (
          <div className="member-management">
            {members.map(member => (
              <div key={member.user_id} className="member-card">
                <div className="member-info">
                  <div className="member-avatar">
                    {getInitials(member.first_name, member.last_name)}
                  </div>
                  <div className="member-details">
                    <h4>{member.first_name} {member.last_name}</h4>
                    <div className="member-role">
                      {member.role === 'owner' ? '👑 Owner' : 
                       member.role === 'admin' ? '🛡️ Admin' : 
                       '👤 Member'}
                    </div>
                  </div>
                </div>
                
                {isOwner && member.role !== 'owner' && (
                  <div className="member-actions">
                    <select
                      value={member.role}
                      onChange={(e) => updateMemberRole(member.user_id, e.target.value)}
                      className="form-input"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => removeMember(member.user_id, `${member.first_name} ${member.last_name}`)}
                      className="btn btn-danger btn-sm"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
