import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useUser } from '../context/useUser';

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser } = useUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = currentUser?.id === id;

  useEffect(() => {
    if (id) {
      fetchProfile();
    }
  }, [id]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/users/${id}/profile`, { 
        credentials: 'include' 
      });
      
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setIsFollowing(data.is_following);
      } else if (res.status === 403) {
        setError('This profile is private. You need to follow this user to view their profile.');
      } else {
        setError('Profile not found');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile || isOwnProfile) return;
    
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
          // For now, assume it's accepted immediately
          setIsFollowing(true);
          setProfile(prev => ({
            ...prev,
            followers_count: prev.followers_count + 1
          }));
        }
      }
    } catch (err) {
      console.error('Follow action failed:', err);
    } finally {
      setFollowLoading(false);
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
      <div className="profile-header">
        <div className="profile-avatar">
          {profile.avatar_path ? (
            <img 
              src={`/images/${profile.avatar_path}`} 
              alt={profile.first_name}
              className="w-full h-full"
              style={{ borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            profile.first_name?.[0]?.toUpperCase() || '?'
          )}
        </div>
        
        <h1 className="profile-name">
          {profile.first_name} {profile.last_name}
        </h1>
        
        {profile.nickname && (
          <p className="text-secondary">@{profile.nickname}</p>
        )}
        
        {profile.about && (
          <p className="profile-bio">{profile.about}</p>
        )}
        
        <div className="profile-stats">
          <div className="profile-stat">
            <div className="profile-stat-number">{profile.followers_count}</div>
            <div className="profile-stat-label">Followers</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-number">{profile.following_count}</div>
            <div className="profile-stat-label">Following</div>
          </div>
        </div>
        
        {!isOwnProfile && (
          <div className="mt-3">
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
            >
              {followLoading ? (
                <span className="loading"></span>
              ) : (
                isFollowing ? 'Following' : 'Follow'
              )}
            </button>
          </div>
        )}
        
        {isOwnProfile && (
          <div className="mt-3">
            <Link to="/me/edit" className="btn btn-primary">
              Edit Profile
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
