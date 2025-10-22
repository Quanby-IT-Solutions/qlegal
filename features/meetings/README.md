# 🎥 Discord-Style Video Meetings

A simple, Discord-style video conferencing system with real-time video, audio, and screen sharing.

## ✨ Features

- **Create Meetings** - Instant meeting creation with shareable links
- **Real-time Video Grid** - See all participants in a responsive grid layout
- **Full Controls** - Mic, camera, screen share, and leave buttons
- **Discord-like UI** - Clean, modern interface similar to Discord calls
- **Automatic Grid Layout** - Adjusts based on number of participants

## 🚀 Setup

### 1. Environment Variables

Add to your `.env`:

```env
# VideoSDK (get from https://app.videosdk.live)
NEXT_PUBLIC_VIDEO_SDK_API_KEY=your_api_key
VIDEO_SDK_API_KEY=your_api_key
VIDEO_SDK_SECRET=your_secret_key
```

### 2. Database Migration

```bash
pnpm db:generate
pnpm db:push
```

### 3. Start Development

```bash
pnpm dev
```

## 📖 Usage

### Creating a Meeting

1. Go to `/meetings`
2. Click "New Meeting"
3. Enter a title
4. Click "Create Meeting"
5. Share the meeting link with participants

### Joining a Meeting

1. Click on any meeting card
2. Click "Join Meeting"
3. Your camera and microphone will be enabled
4. Start collaborating!

### Controls

- **Mic Button** - Toggle microphone on/off (turns red when muted)
- **Camera Button** - Toggle camera on/off (turns red when off)
- **Screen Share** - Share your screen with participants
- **Leave Button** - Exit the meeting

## 🏗️ Architecture

```
features/meetings/
├── api/
│   ├── meetings.router.ts    # tRPC router
│   └── meetings.hooks.ts      # React hooks
│
app/(site)/meetings/
├── page.tsx                   # Meeting list & creation
└── [id]/
    └── page.tsx              # Video meeting room
```

## 🔧 How It Works

1. **Create Meeting** → Creates VideoSDK room + database record
2. **Join Meeting** → Fetches meeting data + generates access token
3. **Video Call** → VideoSDK handles all real-time communication
4. **Participant Grid** → Auto-adjusts layout based on participant count

## 🎨 UI Components

- **Meeting List** - Grid of all your meetings
- **Video Grid** - Responsive participant grid (1-9+ participants)
- **Control Bar** - Fixed bottom controls
- **Participant Card** - Shows video/avatar + name + mic status

## 📝 Database Schema

```typescript
meetings {
  id: string
  title: string
  roomId: string        // VideoSDK room ID
  createdById: string
  createdAt: timestamp
}

meeting_participants {
  id: string
  meetingId: string
  userId: string
  createdAt: timestamp
}
```

## 🔐 Security

- All endpoints require authentication
- Participants must be added to access meetings
- VideoSDK tokens expire after 24 hours
- Room IDs are securely generated

## 📱 Routes

- `/meetings` - List all meetings
- `/meetings/[id]` - Join specific meeting

## 🎯 Tips

- Keep meeting titles short and descriptive
- Share the meeting URL with team members
- Test your camera/mic before joining
- Use screen share for presentations

## 🐛 Troubleshooting

**Camera not working?**
- Check browser permissions
- Try refreshing the page
- Ensure no other app is using your camera

**Can't join meeting?**
- Verify you're a participant
- Check your internet connection
- Ensure VideoSDK credentials are correct

**No video showing?**
- Camera might be disabled
- Click the camera button to enable
- Check browser console for errors

## 📦 What's Included

✅ Database schema (Drizzle ORM)
✅ tRPC API router with 5 endpoints
✅ React hooks for API calls
✅ Meeting creation page
✅ Video meeting room with VideoSDK
✅ Responsive participant grid
✅ Full video controls
✅ Clean, modern UI

---

**Built with VideoSDK, Next.js, tRPC, and Drizzle ORM** 🚀

