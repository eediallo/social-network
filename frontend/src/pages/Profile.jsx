import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useUser } from '../context/useUser';
import { getInitials, getAvatarUrl } from '../utils/avatarUtils';
import { formatRelativeTime } from '../utils/dateUtils';
import Post from '../components/Post';

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser } = useUser();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followRequestSent, setFollowRequestSent] = useState(false);
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // posts, followers, following
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    nickname: '',
    about: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const isOwnProfile = currentUser?.id === id;

  useEffect(() => {
    if (id) {
      fetchProfile();
    }
  }, [id]);

  useEffect(() => {
    if (profile && activeTab === 'posts') {
      fetchPosts();
    } else if (profile && activeTab === 'followers') {
      fetchFollowers();
    } else if (profile && activeTab === 'following') {
      fetchFollowing();
    }
  }, [profile, activeTab]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/users/${id}/profile`, { 
        credentials: 'include' 
      });
      
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setIsFollowing(data.is_following);
        setIsPrivateProfile(false);
      } else if (res.status === 403) {
        // Profile is private - fetch basic info for follow request
        await fetchPrivateProfileInfo();
      } else {
        setError('Profile not found');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrivateProfileInfo = async () => {
    try {
      // Fetch basic user info for private profiles
      const res = await fetch(`/api/users/${id}`, { 
        credentials: 'include' 
      });
      
      if (res.ok) {
        const data = await res.json();
        // Create a minimal profile object for private profiles
        setProfile({
          user_id: data.id,
          first_name: data.first_name,
          last_name: data.last_name,
          nickname: data.nickname || '',
          about: 'This profile is private',
          avatar_path: '',
          avatar_url: '',
          public: false,
          followers_count: 0,
          following_count: 0,
          is_following: false
        });
        setIsPrivateProfile(true);
        setIsFollowing(false);
      } else {
        setError('Profile not found');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const fetchPosts = async () => {
    setPostsLoading(true);
    try {
      const res = await fetch(`/api/posts/user?user_id=${id}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        // Map backend data to frontend format
        const mappedPosts = data.map(post => ({
          id: post.ID,
          user_id: post.UserID,
          text: post.Text,
          privacy: post.Privacy,
          created_at: post.CreatedAt,
          first_name: profile.first_name,
          last_name: profile.last_name,
          likes: 0,
          comments: 0
        }));
        setPosts(mappedPosts);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchFollowers = async () => {
    try {
      const res = await fetch('/api/follow/followers', {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        // Handle null response from backend
        setFollowers(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch followers:', err);
      setFollowers([]);
    }
  };

  const fetchFollowing = async () => {
    try {
      const res = await fetch('/api/follow/following', {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        // Handle null response from backend
        setFollowing(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch following:', err);
      setFollowing([]);
    }
  };

  const handleFollow = async () => {
    if (!profile || isOwnProfile) return;
    
    if (window.confirm(isFollowing ? 'Are you sure you want to unfollow this user?' : 'Are you sure you want to follow this user?')) {
      setFollowLoading(true);
      try {
        if (isFollowing) {
          // Unfollow
          const res = await fetch(`/api/follow/${id}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          
          if (res.ok) {
            setIsFollowing(false);
            setProfile(prev => ({
              ...prev,
              followers_count: prev.followers_count - 1
            }));
          }
        } else {
          // Send follow request
          const res = await fetch(`/api/follow/requests/${id}`, {
            method: 'POST',
            credentials: 'include'
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'followed') {
              // Auto-followed (public profile)
              setIsFollowing(true);
              setProfile(prev => ({
                ...prev,
                followers_count: prev.followers_count + 1
              }));
            } else if (data.status === 'pending') {
              // Follow request sent (private profile)
              setFollowRequestSent(true);
              alert('Follow request sent! You will be notified when they respond.');
            }
          } else {
            const errorText = await res.text();
            alert(`Failed to send follow request: ${errorText}`);
          }
        }
      } catch (err) {
        console.error('Follow action failed:', err);
      } finally {
        setFollowLoading(false);
      }
    }
  };

  const handlePrivacyToggle = async () => {
    if (!isOwnProfile) return;
    
    const newPrivacy = !profile.public;
    const message = newPrivacy 
      ? 'Are you sure you want to make your profile public? Everyone will be able to see your posts and information.'
      : 'Are you sure you want to make your profile private? Only your followers will be able to see your posts and information.';
    
    if (window.confirm(message)) {
      try {
        const res = await fetch('/api/me/profile/privacy', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public: newPrivacy }),
          credentials: 'include'
        });
        
        if (res.ok) {
          setProfile(prev => ({ ...prev, public: newPrivacy }));
        }
      } catch (err) {
        console.error('Failed to update privacy:', err);
      }
    }
  };

  const handleEditProfile = () => {
    if (!isOwnProfile) return;
    setEditForm({
      nickname: profile.nickname || '',
      about: profile.about || ''
    });
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!isOwnProfile) return;
    
    setEditLoading(true);
    try {
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
        credentials: 'include'
      });
      
      if (res.ok) {
        setProfile(prev => ({
          ...prev,
          nickname: editForm.nickname,
          about: editForm.about
        }));
        setShowEditModal(false);
      } else {
        alert('Failed to update profile');
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    if (!isOwnProfile) return;
    
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/images/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        // Update profile with new avatar
        setProfile(prev => ({
          ...prev,
          avatar_path: data.public_id,
          avatar_url: data.secure_url
        }));
        alert('Avatar updated successfully!');
      } else {
        const errorText = await res.text();
        alert(`Failed to upload avatar: ${errorText}`);
      }
    } catch (err) {
      console.error('Avatar upload failed:', err);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setAvatarLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="text-center mt-5">
          <div className="loading"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card">
          <div className="card-body text-center">
            <h3>Error</h3>
            <p className="text-error">{error}</p>
            <Link to="/" className="btn btn-primary">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container">
        <div className="card">
          <div className="card-body text-center">
            <h3>Profile not found</h3>
            <Link to="/" className="btn btn-primary">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-cover">
          <div className="profile-avatar-large">
            {profile.avatar_url && profile.avatar_url.trim() !== '' ? (
              <img 
                src={profile.avatar_url} 
                alt={`${profile.first_name} ${profile.last_name}`}
                className="w-full h-full"
                style={{ borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              getInitials(profile.first_name, profile.last_name) || '?'
            )}
            {isOwnProfile && (
              <div className="avatar-upload-overlay">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={avatarLoading}
                  style={{ display: 'none' }}
                  id="avatar-upload"
                />
                <label htmlFor="avatar-upload" className="avatar-upload-btn">
                  {avatarLoading ? (
                    <span className="loading"></span>
                  ) : (
                    '📷'
                  )}
                </label>
              </div>
            )}
          </div>
        </div>
        
        <div className="profile-info">
          <h1 className="profile-name">
            {profile.first_name} {profile.last_name}
          </h1>
          
          {profile.nickname && (
            <p className="text-secondary">@{profile.nickname}</p>
          )}
          
          {profile.about && (
            <p className="profile-bio">{profile.about}</p>
          )}
          
          {isPrivateProfile && (
            <div className="private-profile-notice">
              <p className="text-muted">This profile is private. Send a follow request to see their posts and full information.</p>
            </div>
          )}
          
          {isOwnProfile && profile.email && (
            <p className="text-muted">Email: {profile.email}</p>
          )}
          
          {isOwnProfile && profile.date_of_birth && (
            <p className="text-muted">Born: {new Date(profile.date_of_birth).toLocaleDateString()}</p>
          )}
          
          <div className="profile-stats">
            <div className="profile-stat" onClick={() => setActiveTab('followers')}>
              <div className="profile-stat-number">{profile.followers_count}</div>
              <div className="profile-stat-label">Followers</div>
            </div>
            <div className="profile-stat" onClick={() => setActiveTab('following')}>
              <div className="profile-stat-number">{profile.following_count}</div>
              <div className="profile-stat-label">Following</div>
            </div>
          </div>
          
          <div className="profile-actions">
            {!isOwnProfile && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`btn ${isFollowing ? 'btn-secondary' : 
                  followRequestSent ? 'btn-warning' : 'btn-primary'}`}
              >
                {followLoading ? (
                  <span className="loading"></span>
                ) : (
                  isFollowing ? 'Following' : 
                  followRequestSent ? 'Request Sent' : 'Follow'
                )}
              </button>
            )}
            
            {isOwnProfile && (
              <>
                <button
                  onClick={handlePrivacyToggle}
                  className={`btn ${profile.public ? 'btn-success' : 'btn-warning'}`}
                >
                  {profile.public ? 'Public' : 'Private'}
                </button>
                <button 
                  onClick={handleEditProfile}
                  className="btn btn-primary"
                >
                  Edit Profile
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Profile Tabs - Hide for private profiles */}
      {!isPrivateProfile && (
        <div className="profile-tabs">
          <button 
            className={`profile-tab ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            Posts
          </button>
          <button 
            className={`profile-tab ${activeTab === 'followers' ? 'active' : ''}`}
            onClick={() => setActiveTab('followers')}
          >
            Followers
          </button>
          <button 
            className={`profile-tab ${activeTab === 'following' ? 'active' : ''}`}
            onClick={() => setActiveTab('following')}
          >
            Following
          </button>
        </div>
      )}

      {/* Tab Content - Hide for private profiles */}
      {!isPrivateProfile && (
        <div className="profile-content">
        {activeTab === 'posts' && (
          <div className="posts-section">
            {postsLoading ? (
              <div className="text-center">
                <div className="loading"></div>
                <p>Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center">
                <p>No posts yet</p>
              </div>
            ) : (
              <div className="posts-list">
                {posts.map(post => (
                  <Post key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'followers' && (
          <div className="followers-section">
            <h3>Followers</h3>
            {followers.length === 0 ? (
              <p>No followers yet</p>
            ) : (
              <div className="users-list">
                {followers.map(follower => (
                  <div key={follower.id} className="user-card">
                    <div className="user-avatar">
                      {follower.avatar_url && follower.avatar_url.trim() !== '' ? (
                        <img 
                          src={follower.avatar_url} 
                          alt={`${follower.first_name} ${follower.last_name}`}
                          className="w-full h-full"
                          style={{ borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        getInitials(follower.first_name, follower.last_name)
                      )}
                    </div>
                    <div className="user-info">
                      <h4>{follower.first_name} {follower.last_name}</h4>
                      {follower.nickname && <p>@{follower.nickname}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'following' && (
          <div className="following-section">
            <h3>Following</h3>
            {following.length === 0 ? (
              <p>Not following anyone yet</p>
            ) : (
              <div className="users-list">
                {following.map(user => (
                  <div key={user.id} className="user-card">
                    <div className="user-avatar">
                      {user.avatar_url && user.avatar_url.trim() !== '' ? (
                        <img 
                          src={user.avatar_url} 
                          alt={`${user.first_name} ${user.last_name}`}
                          className="w-full h-full"
                          style={{ borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        getInitials(user.first_name, user.last_name)
                      )}
                    </div>
                    <div className="user-info">
                      <h4>{user.first_name} {user.last_name}</h4>
                      {user.nickname && <p>@{user.nickname}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Profile</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="btn-close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="nickname">Nickname</label>
                <input
                  type="text"
                  id="nickname"
                  value={editForm.nickname}
                  onChange={(e) => setEditForm(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder="Enter your nickname"
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label htmlFor="about">About Me</label>
                <textarea
                  id="about"
                  value={editForm.about}
                  onChange={(e) => setEditForm(prev => ({ ...prev, about: e.target.value }))}
                  placeholder="Tell us about yourself"
                  className="form-control"
                  rows="4"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowEditModal(false)}
                className="btn btn-secondary"
                disabled={editLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="btn btn-primary"
                disabled={editLoading}
              >
                {editLoading ? (
                  <>
                    <span className="loading"></span>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
