### Prompt: Enhance Posts and Comments with Image Support

**Priority: HIGH** - Core functionality required for audit

**Current Status:**
- Basic post creation and display implemented
- Comments functionality working
- Missing image upload support
- Need privacy options for posts

**Tasks:**
1. **Image Upload Support:**
   - Add image upload to post creation (JPG, PNG, GIF)
   - Add image upload to comments (JPG, PNG, GIF)
   - Implement drag-and-drop file upload
   - Add image preview before posting
   - Handle file size validation and type checking
   - Store images in backend and serve them properly

2. **Post Privacy Options:**
   - Public posts (visible to everyone)
   - Followers-only posts (visible to followers)
   - Selected followers posts (custom selection)
   - UI for selecting allowed followers
   - Clear privacy indicators on posts

3. **Enhanced Post Display:**
   - Show images in posts with proper sizing
   - Image gallery for multiple images
   - Proper image loading and error handling
   - Responsive image display

4. **Post Interactions:**
   - Like/unlike functionality
   - Share functionality
   - Post reporting (if needed)
   - Edit/delete own posts

**Backend Integration:**
- Use existing image upload endpoints
- Implement post privacy logic
- Add image metadata to posts
- Handle file storage and serving

**UI/UX Requirements:**
- Modern file upload interface
- Image preview functionality
- Privacy selection UI
- Loading states for uploads
- Error handling for failed uploads

**Success Criteria:**
- Users can upload images to posts and comments
- Privacy options work correctly
- Images display properly in feed
- File validation prevents invalid uploads
- Responsive design works on all devices
