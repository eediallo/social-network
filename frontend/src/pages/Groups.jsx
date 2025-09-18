import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatRelativeTime } from '../utils/dateUtils';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState([]);
  const [popularTags, setPopularTags] = useState([]);

  // Mock data for testing UI
  const mockGroups = [
    {
      id: '1',
      title: 'Tech Enthusiasts',
      description: 'A community for technology lovers and innovators. Share your latest projects, discuss emerging technologies, and connect with like-minded individuals.',
      created_at: new Date().toISOString(),
      member_count: 1250,
      is_member: true,
      is_admin: false
    },
    {
      id: '2',
      title: 'Photography Club',
      description: 'Capture the world through your lens. Share your best shots, get feedback, and learn from professional photographers.',
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      member_count: 890,
      is_member: true,
      is_admin: true
    },
    {
      id: '3',
      title: 'Fitness & Wellness',
      description: 'Stay healthy and motivated together. Share workout routines, healthy recipes, and support each other on your fitness journey.',
      created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      member_count: 2100,
      is_member: false,
      is_admin: false
    },
    {
      id: '4',
      title: 'Book Lovers',
      description: 'Discover new books, share reviews, and discuss your favorite authors. Join our monthly book club meetings!',
      created_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
      member_count: 650,
      is_member: true,
      is_admin: false
    }
  ];

  useEffect(() => {
    fetchGroups();
    fetchCategories();
    fetchPopularTags();
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [selectedCategory, searchTerm]);

  const fetchGroups = async () => {
    try {
      let url = '/api/groups';
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);
      if (params.toString()) url += '?' + params.toString();

      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        
        // Map backend data to frontend format
        const mappedGroups = data.map(group => ({
          id: group.ID,
          user_id: group.OwnerID,
          title: group.Title,
          description: group.Description,
          category: group.Category || 'general',
          tags: group.Tags || [],
          created_at: group.CreatedAt,
          member_count: group.member_count || 0,
          is_member: group.is_member === 1, // Convert 1/0 to boolean
          is_admin: group.user_role === 'owner' // Check if user is owner
        }));
        
        setGroups(mappedGroups);
      } else {
        // Use mock data for testing UI
        setGroups(mockGroups);
      }
    } catch (err) {
      // Use mock data for testing UI
      setGroups(mockGroups);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/groups/categories', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchPopularTags = async () => {
    try {
      const res = await fetch('/api/groups/tags/popular', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPopularTags(data);
      }
    } catch (err) {
      console.error('Failed to fetch popular tags:', err);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const tagsString = formData.get('tags');
    const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    const groupData = {
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category') || 'general',
      tags: tags
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
        
        // Map backend response to frontend format
        const mappedGroup = {
          id: newGroup.ID,
          user_id: newGroup.OwnerID,
          title: newGroup.Title,
          description: newGroup.Description,
          category: newGroup.Category || 'general',
          tags: newGroup.Tags || [],
          created_at: newGroup.CreatedAt,
          member_count: 1, // Creator is the first member
          is_member: true, // Creator is always a member
          is_admin: true   // Creator is always the admin/owner
        };
        
        // Update state with the new group
        setGroups(prevGroups => [mappedGroup, ...prevGroups]);
        
        setShowCreateForm(false);
        e.target.reset();
        setError(''); // Clear any previous errors
        setSuccess(`Group "${mappedGroup.title}" created successfully!`);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorText = await res.text();
        setError(`Failed to create group: ${errorText}`);
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
              <div className="form-group">
                <select
                  name="category"
                  className="form-input"
                  disabled={createLoading}
                >
                  <option value="general">General</option>
                  {categories && categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <input
                  type="text"
                  name="tags"
                  placeholder="Tags (comma-separated, e.g., tech, programming, coding)"
                  className="form-input"
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

      {success && (
        <div className="card mb-4">
          <div className="card-body text-center">
            <p className="text-success">{success}</p>
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

      {/* Filters and Search */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex gap-3 align-center flex-wrap">
            <div className="form-group mb-0">
              <input
                type="text"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group mb-0">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="form-input"
              >
                <option value="">All Categories</option>
                {categories && categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            {(searchTerm || selectedCategory) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('');
                }}
                className="btn btn-secondary btn-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
          
          {/* Popular Tags */}
          {popularTags && popularTags.length > 0 && (
            <div className="mt-3">
              <h4 className="mb-2">Popular Tags</h4>
              <div className="tags-container">
                {popularTags.slice(0, 10).map(tag => (
                  <span
                    key={tag.tag}
                    className="tag"
                    onClick={() => setSearchTerm(tag.tag)}
                    style={{ cursor: 'pointer' }}
                  >
                    {tag.tag} ({tag.count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {groups && groups.length === 0 && !error && (
        <div className="card">
          <div className="card-body text-center">
            <h3>No groups yet</h3>
            <p>Create your first group to get started!</p>
          </div>
        </div>
      )}

      <div className="groups-grid">
        {groups && groups.map((group) => (
          <div key={group.id} className="group-card">
            <div className="group-card-header">
              <div className="group-icon">
                {group.title.charAt(0).toUpperCase()}
              </div>
              <div className="group-info">
                <h3 className="group-title">{group.title}</h3>
                {group.description && (
                  <p className="group-description">{group.description}</p>
                )}
                <div className="group-category">
                  <span className="category-badge">{group.category}</span>
                </div>
                {group.tags && group.tags.length > 0 && (
                  <div className="group-tags">
                    {group.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                    {group.tags && group.tags.length > 3 && (
                      <span className="tag-more">+{group.tags.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="group-card-body">
              <div className="group-meta">
                <div className="group-meta-item">
                  <span className="meta-icon">📅</span>
                  <span>Created {formatRelativeTime(group.created_at)}</span>
                </div>
                <div className="group-members-count">
                  <span className="meta-icon">👥</span>
                  <span>{group.member_count?.toLocaleString() || '0'} members</span>
                </div>
                {group.is_admin && (
                  <div className="group-admin-badge">
                    <span className="meta-icon">👑</span>
                    <span>Admin</span>
                  </div>
                )}
              </div>
              <div className="group-actions">
                <Link
                  to={`/groups/${group.id}`}
                  className={`btn btn-sm w-full ${group.is_member ? 'btn-primary' : 'btn-outline'}`}
                >
                  {group.is_member ? 'View Group' : 'Join Group'}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
