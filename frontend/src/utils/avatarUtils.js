// Avatar utilities for user profile pictures

export const getInitials = (firstName, lastName) => {
  const first = firstName?.[0]?.toUpperCase() || '';
  const last = lastName?.[0]?.toUpperCase() || '';
  return first + last;
};

export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return null;
  return `/images/${avatarPath}`;
};

export const getAvatarFallback = (firstName, lastName, size = 'md') => {
  const initials = getInitials(firstName, lastName);
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl'
  };
  
  return {
    initials,
    sizeClass: sizeClasses[size] || sizeClasses.md
  };
};

export const generateAvatarGradient = (userId) => {
  // Generate a consistent gradient based on user ID
  const colors = [
    'from-blue-500 to-purple-600',
    'from-green-500 to-blue-600',
    'from-pink-500 to-red-600',
    'from-yellow-500 to-orange-600',
    'from-purple-500 to-pink-600',
    'from-indigo-500 to-purple-600',
    'from-teal-500 to-green-600',
    'from-red-500 to-pink-600'
  ];
  
  // Simple hash function to get consistent color
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};
