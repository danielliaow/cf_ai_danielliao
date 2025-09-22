# 🎤 Voice Assistant Features

Your MCP Assistant now supports full voice conversations! This document explains the voice features and provides examples of how to use them.

## 📋 Features Overview

### 🎙️ Speech-to-Text (STT)
- **On-device speech recognition** using `@react-native-voice/voice`
- **Real-time transcription** with visual feedback
- **Auto-send capability** - voice messages are automatically sent after transcription
- **Error handling** with user-friendly alerts

### 🔊 Text-to-Speech (TTS)
- **Native TTS** using `expo-speech`
- **Streaming playback** - starts speaking before full response is ready
- **Markdown cleaning** - removes formatting for natural speech
- **Manual control** - tap any message to hear it spoken

### 🎯 Voice Mode
- **Toggle voice mode** for hands-free operation
- **Visual indicators** showing recording, listening, and speaking states
- **Smart interruption** - stops TTS when new input is received

## 🚀 How to Use

### 1. Basic Voice Interaction

**Step 1:** Tap the 🎤 **microphone button** to start recording
```
UI State: Microphone button turns red, input shows "🎤 Listening..."
```

**Step 2:** Speak your question
```
User says: "What's on my calendar today?"
```

**Step 3:** Stop recording (tap microphone again)
```
UI State: Shows "🔄 Processing..." then transcribes to text
```

**Step 4:** Message is auto-sent through AI pipeline
```
Backend: Transcribed text → AI Service → MCP Tools → Response
```

**Step 5:** Response is displayed and spoken aloud
```
Text: "You have two meetings today. One at 11 AM and another at 4 PM."
Audio: AI speaks the response using TTS
```

### 2. Voice Mode (Hands-Free)

**Enable Voice Mode:**
1. Tap the 💬 **chat bubble button** (turns blue when active)
2. System announces: "Voice mode activated. I can now hear and speak with you."
3. All AI responses will be automatically spoken

**In Voice Mode:**
- 🎤 Microphone for voice input
- 🔊 Automatic TTS playback for responses
- ⏹️ Stop button appears when AI is speaking
- 📝 Text input still works normally

### 3. Manual TTS Control

**Play Any Message:**
- Tap the 🔊 **volume icon** next to any assistant message
- TTS will read the message aloud
- Multiple taps will restart playback

**Stop TTS:**
- Tap the ⏹️ **stop button** that appears during playback
- Or start a new voice recording (auto-stops current TTS)

## 🔄 Complete End-to-End Example

Here's a full conversation flow demonstrating all features:

### Example: Calendar Query

```
👤 User Action: Taps microphone button
🎤 STT State: Recording started, button animates, input shows "🎤 Listening..."

👤 User Speech: "What's on my calendar today?"
🔄 STT Processing: Transcribing speech...

📝 Transcription: Text appears in input field: "What's on my calendar today?"
📤 Auto-Send: Message automatically sent to AI pipeline

🤖 Backend Processing:
   1. Session Management: Adds user message to session
   2. AI Service: Processes query with conversation context
   3. Tool Selection: AI chooses "getTodaysEvents" tool
   4. Tool Execution: Fetches calendar data from Google Calendar
   5. Response Generation: Creates natural language response

📱 Frontend Response:
   1. Text Display: "You have two meetings today. Your first meeting is the team standup at 11 AM in Conference Room A. Your second meeting is the project review at 4 PM with John and Sarah."
   
🔊 TTS Playback (if voice mode enabled):
   1. Markdown Cleaning: Removes formatting for speech
   2. Streaming TTS: Speaks response in chunks
   3. Clean Text: "You have two meetings today. Your first meeting is the team standup at 11 AM in Conference Room A. Your second meeting is the project review at 4 PM with John and Sarah."
```

### Example: Email Query with Follow-up

```
👤 User: "Check my emails" (voice)
🤖 Response: "You have 5 new emails. The most recent is from John about the project deadline." (spoken)

👤 User: "Show me urgent emails only" (voice) 
🤖 AI Processing: Uses conversation context, calls getLastTenMails with {query: "subject:urgent"}
🤖 Response: "I found 2 urgent emails. One from your manager about tomorrow's meeting, and another from the client requesting immediate feedback." (spoken)

👤 User: Taps 🔊 volume icon on first message to replay it
🔊 TTS: Replays the first message about having 5 new emails
```

## 🎛️ UI Controls Reference

### Input Area Controls (Left to Right):
1. **💬 Voice Mode Toggle** - Blue when active, enables auto-TTS
2. **⏹️ Stop TTS** - Only visible when TTS is playing
3. **📝 Text Input** - Visual states show voice activity
4. **🎤 Microphone** - Records voice input, animated when active
5. **📤 Send Button** - Sends typed messages

### Message Controls:
- **🔊 Volume Icon** - Appears on assistant messages, tap to play TTS
- **🛠️ Tool Badge** - Shows which MCP tool was used

### Visual States:
- **🎤 Recording**: Red microphone, animated scaling, red input border
- **🔄 Listening**: Orange hourglass, "Processing..." placeholder
- **🔊 Speaking**: Stop button visible, volume icons show active state
- **💬 Voice Mode**: Blue chat bubble, enhanced input styling

## ⚙️ Technical Implementation

### STT Pipeline:
```
User Voice → @react-native-voice/voice → Transcription → Auto-send → AI Pipeline
```

### TTS Pipeline:
```
AI Response → Markdown Cleaning → expo-speech → Streaming Audio Output
```

### Permission Requirements:
- **iOS**: Microphone and Speech Recognition permissions
- **Android**: RECORD_AUDIO permission
- **Both**: Automatic permission requests on first use

## 🔧 Troubleshooting

### Common Issues:

**"Speech recognition not available"**
- Ensure device has speech recognition capability
- Check microphone permissions in device settings
- Try restarting the app

**"No audio output during TTS"**
- Check device volume settings
- Ensure device is not in silent mode
- Verify TTS is available (older devices may not support it)

**"Microphone permission denied"**
- Go to device Settings → Privacy → Microphone
- Enable permission for your app
- Restart the app

### Performance Tips:

- **Voice Mode** works best with stable internet connection
- **Background noise** may affect transcription accuracy
- **Longer responses** use streaming TTS for better UX
- **Manual TTS** allows replaying any message on demand

## 🎯 Use Cases

Perfect for:
- 🚗 **Hands-free operation** while driving or multitasking
- ♿ **Accessibility** for users who prefer voice interaction
- 🏃 **On-the-go** productivity when typing is inconvenient
- 👥 **Demonstrations** showing AI assistant capabilities
- 🎭 **Natural conversations** with your productivity assistant

Your voice-enabled MCP assistant is ready to help with calendar management, email checking, web searches, and more - all through natural conversation! 🚀