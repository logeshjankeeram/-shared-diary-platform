# Shared Diary Platform

A private diary platform for couples, friends, and groups to write and share daily entries with password-protected unlocking. Entries are inaccessible until all users share their passwords, fostering mutual trust and shared storytelling.

## Features

- **Private Entry Creation**: Write daily entries with user-defined passwords
- **Password-Protected Unlocking**: Entries remain locked until all users share passwords
- **Synchronized Timeline View**: Side-by-side scrolling for couples, stacked view for groups
- **Theme Highlighting**: Automatic highlighting of similar and contrasting themes
- **PDF Export**: Download shared entries as a permanent record
- **Browser Notifications**: Daily reminders to write entries
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **No Login Required**: Simple diary ID and name-based access

## Tech Stack

- **Frontend**: HTML, JavaScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL database)
- **API**: Netlify Functions for secure operations
- **Deployment**: Netlify
- **Libraries**: jsPDF (PDF export), jsSHA (password hashing)

## Project Structure

```
diary/
├── index.html              # Main entry point
├── css/
│   └── style.css           # Custom styles
├── js/
│   ├── main.js             # UI event handlers
│   ├── diary.js            # Core diary functionality
│   └── supabase.js         # Supabase client and operations
├── functions/
│   └── api.js              # Netlify Functions for secure operations
├── assets/                 # Static files (icons, images)
├── netlify.toml            # Netlify configuration
└── README.md               # This file
```

## Setup Instructions

### 1. Supabase Setup

#### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new account
2. Create a new project
3. Note down your project URL and API keys

#### Database Schema

Run the following SQL in your Supabase SQL editor:

```sql
-- Create diaries table
CREATE TABLE diaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    diary_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('couple', 'group')),
    users TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create entries table
CREATE TABLE entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    diary_id TEXT NOT NULL REFERENCES diaries(diary_id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    date DATE NOT NULL,
    content TEXT NOT NULL,
    password_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(diary_id, user_name, date)
);

-- Create indexes for better performance
CREATE INDEX idx_entries_diary_date ON entries(diary_id, date);
CREATE INDEX idx_entries_user_date ON entries(user_name, date);
CREATE INDEX idx_diaries_diary_id ON diaries(diary_id);

-- Enable Row Level Security (RLS)
ALTER TABLE diaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since we're not using authentication)
CREATE POLICY "Allow public read access to diaries" ON diaries
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to diaries" ON diaries
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to diaries" ON diaries
    FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to entries" ON entries
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to entries" ON entries
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to entries" ON entries
    FOR UPDATE USING (true);
```

#### Get API Keys

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the following:
   - Project URL
   - Anon (public) key
   - Service role key (for Netlify Functions)

### 2. Update Configuration

#### Update Supabase Client

Edit `js/supabase.js` and replace the placeholder values:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

#### Add Supabase JavaScript Client

Add the Supabase JavaScript client to your `index.html` before the other scripts:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### 3. Netlify Deployment

#### Option 1: Deploy via GitHub

1. Push your code to a GitHub repository
2. Go to [netlify.com](https://netlify.com) and create an account
3. Click "New site from Git"
4. Connect your GitHub account and select your repository
5. Configure build settings:
   - Build command: (leave empty)
   - Publish directory: `.`
6. Click "Deploy site"

#### Option 2: Manual Upload

1. Go to [netlify.com](https://netlify.com) and create an account
2. Click "New site from Git" > "Deploy manually"
3. Drag and drop your project folder
4. Your site will be deployed automatically

### 4. Configure Environment Variables

In your Netlify dashboard:

1. Go to Site settings > Environment variables
2. Add the following variables:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SUPABASE_SERVICE_KEY`: Your Supabase service role key

### 5. Enable Netlify Functions

1. In your Netlify dashboard, go to Functions
2. Ensure functions are enabled (they should be automatically)
3. The `functions/api.js` file will be deployed as a serverless function

### 6. Enable Netlify Forms

The feedback form in `index.html` is already configured with `data-netlify="true"`. Netlify will automatically detect and handle form submissions.

## Usage Guide

### Creating a Diary

1. Enter a unique Diary ID (e.g., "AliceAndBob2025")
2. Enter your name
3. Select diary type (couple or group)
4. Click "Create New Diary"

### Joining a Diary

1. Enter the existing Diary ID
2. Enter your name
3. Click "Join Diary"

### Writing Entries

1. Select a date
2. Write your daily entry (minimum 10 characters)
3. Set a password for the entry
4. Click "Submit Entry"

### Unlocking Shared Entries

1. Select the date you want to unlock
2. Enter passwords for all users
3. Click "Unlock Entries"
4. View the synchronized timeline

### Timeline Navigation

- Use arrow buttons or keyboard arrows to navigate between dates
- For couples: Side-by-side synchronized scrolling
- For groups: Stacked timeline view
- Click "Export as PDF" to download entries

## Security Features

- **Password Hashing**: All passwords are hashed using SHA-256
- **Secure API**: Sensitive operations handled by Netlify Functions
- **Row Level Security**: Database-level security policies
- **CORS Protection**: Proper CORS headers for API access
- **Content Security Policy**: XSS protection headers

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Mobile Support

- Responsive design for all screen sizes
- Touch-friendly interface
- Optimized for mobile browsers
- PWA-ready (service worker included)

## Testing

### Cross-Device Testing

1. Deploy the site to Netlify
2. Test on two different phones:
   - Create a diary on one phone
   - Join the diary on the second phone
   - Write entries on both devices
   - Test password sharing and unlocking
   - Verify timeline synchronization

### Local Testing

1. Install a local server (e.g., `python -m http.server 8000`)
2. Open `http://localhost:8000` in your browser
3. Test all functionality locally before deployment

## Troubleshooting

### Common Issues

1. **Supabase Connection Error**
   - Verify your API keys are correct
   - Check that your Supabase project is active
   - Ensure RLS policies are properly configured

2. **Netlify Functions Not Working**
   - Check environment variables are set correctly
   - Verify the function is deployed (check Functions tab)
   - Check browser console for CORS errors

3. **Password Verification Failing**
   - Ensure all users have submitted entries for the date
   - Verify passwords match exactly (case-sensitive)
   - Check that the correct number of passwords are provided

4. **PDF Export Not Working**
   - Ensure jsPDF library is loaded correctly
   - Check browser console for JavaScript errors
   - Verify there are unlocked entries to export

### Debug Mode

Add `?debug=true` to the URL to enable debug logging in the browser console.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For support or questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section above
- Review the Supabase and Netlify documentation

## Changelog

### v1.0.0
- Initial release
- Basic diary creation and entry system
- Password-protected unlocking
- Timeline view with theme highlighting
- PDF export functionality
- Mobile-responsive design
- Browser notifications
- Netlify deployment ready # -shared-diary-platform
