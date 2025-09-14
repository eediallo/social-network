### Prompt: Complete Profile Page Implementation

**Priority: HIGH** - Core functionality required for audit

**Current Status:**
- Basic Profile page exists but needs complete implementation
- Backend profile endpoints are implemented
- Need to display all user information and interactions

**Tasks:**
1. **Profile Information Display:**
   - Show all registration form fields (except password): Email, First Name, Last Name, Date of Birth, Avatar, Nickname, About Me
   - Display user's posts with proper formatting
   - Show followers and following lists with user avatars
   - Add privacy toggle (public/private) with confirmation popup
   - Display profile creation date and last activity

2. **Profile Actions:**
   - Edit profile functionality (nickname, about, avatar)
   - Follow/Unfollow buttons with confirmation popups
   - Privacy toggle with confirmation dialog
   - View other users' profiles (with privacy restrictions)

3. **Privacy Implementation:**
   - Public profiles: visible to everyone
   - Private profiles: only visible to followers
   - Proper error handling for unauthorized access
   - Clear messaging for privacy restrictions

4. **UI/UX Requirements:**
   - Modern profile layout with cover photo area
   - Responsive design for mobile/desktop
   - Loading states and error handling
   - Confirmation dialogs for sensitive actions
   - Proper avatar display with fallbacks

**Backend Integration:**
- Use existing `/api/users/{id}/profile` endpoint
- Implement profile update functionality
- Handle privacy restrictions properly
- Add proper error handling and validation

**Success Criteria:**
- Profile displays all required information
- Privacy toggle works with confirmation
- Follow/unfollow functionality works
- Other users' profiles respect privacy settings
- Responsive and accessible design
