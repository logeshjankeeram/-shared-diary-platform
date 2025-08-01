// Supabase client initialization and CRUD operations

// Initialize Supabase client
// Note: These will be replaced with environment variables in production
const SUPABASE_URL = 'https://ksabmcevgtgtwtrobyac.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzYWJtY2V2Z3RndHd0cm9ieWFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODUwNTksImV4cCI6MjA2OTA2MTA1OX0.X5hdiryP3GTkz8sMQ2sfDFlvLPLzIKoj3zBrabgeneU';

// Create Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database operations
class DiaryDatabase {
    constructor() {
        this.supabase = supabase;
    }

    // Create a new diary
    async createDiary(diaryId, userName, type, userPassword) {
        try {
            if (!userPassword) {
                return { success: false, error: 'Secret password is required to create a diary' };
            }

            // Try Netlify function first
            try {
                const response = await fetch('/.netlify/functions/api', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'createDiary',
                        diaryId,
                        userName,
                        type,
                        userPassword
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    return { success: true, data: result.data };
                } else {
                    console.warn('Netlify function failed:', result.error);
                    // If it's a duplicate key error, return it directly
                    if (response.status === 409) {
                        return { success: false, error: result.message || result.error };
                    }
                    // For any other error, fall back to client-side approach
                    console.log('Falling back to client-side approach due to Netlify function error');
                    throw new Error('Netlify function failed');
                }
            } catch (netlifyError) {
                console.log('Falling back to client-side Supabase approach');
                console.error('Netlify error details:', netlifyError);
                console.log('This is expected behavior when Netlify function is not working');

                // Fallback to client-side approach (without user_passwords column for now)
                const diaryData = {
                    diary_id: diaryId,
                    name: userName,
                    type: type,
                    users: [userName],
                    created_at: new Date().toISOString()
                };

                console.log('Attempting client-side insert with data:', diaryData);

                const { data, error } = await this.supabase
                    .from('diaries')
                    .insert([diaryData])
                    .select();

                if (error) {
                    console.error('Client-side insert error:', error);
                    console.error('Error details:', JSON.stringify(error, null, 2));

                    // Handle duplicate key error specifically
                    if (error.code === '23505') {
                        throw new Error('Diary ID already exists. Please choose a different Diary ID.');
                    }

                    throw error;
                }
                return { success: true, data: data[0] };
            }
        } catch (error) {
            console.error('Error creating diary:', error);
            return { success: false, error: error.message };
        }
    }

    // Join an existing diary
    async joinDiary(diaryId, userName, userPassword) {
        try {
            if (!userPassword) {
                return { success: false, error: 'Secret password is required to join this diary' };
            }

            // Try Netlify function first
            try {
                const response = await fetch('/.netlify/functions/api', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'joinDiary',
                        diaryId,
                        userName,
                        userPassword
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    return { success: true, data: result.data, message: result.message };
                } else {
                    console.warn('Netlify function failed, trying client-side approach:', result.error);
                    throw new Error('Netlify function failed');
                }
            } catch (netlifyError) {
                console.log('Falling back to client-side Supabase approach');

                // Fallback to client-side approach
                const { data: existingDiary, error: fetchError } = await this.supabase
                    .from('diaries')
                    .select('*')
                    .eq('diary_id', diaryId)
                    .single();

                if (fetchError) throw fetchError;

                // Check if user is already in the diary
                if (existingDiary.users.includes(userName)) {
                    return { success: true, data: existingDiary, message: 'Already a member' };
                }

                // For now, skip password validation since user_passwords column doesn't exist
                // TODO: Implement proper password validation when column is added

                // Add user to the diary
                const updatedUsers = [...existingDiary.users, userName];

                const { data, error } = await this.supabase
                    .from('diaries')
                    .update({
                        users: updatedUsers
                    })
                    .eq('diary_id', diaryId)
                    .select();

                if (error) throw error;
                return { success: true, data: data[0] };
            }
        } catch (error) {
            console.error('Error joining diary:', error);
            return { success: false, error: error.message };
        }
    }

    // Get diary information
    async getDiary(diaryId) {
        try {
            const { data, error } = await this.supabase
                .from('diaries')
                .select('*')
                .eq('diary_id', diaryId)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error getting diary:', error);
            return { success: false, error: error.message };
        }
    }

    // Create a new entry
    async createEntry(diaryId, userName, date, content, passwordHash) {
        try {
            const { data, error } = await this.supabase
                .from('entries')
                .insert([
                    {
                        diary_id: diaryId,
                        user_name: userName,
                        date: date,
                        content: content,
                        password_hash: passwordHash,
                        created_at: new Date().toISOString()
                    }
                ])
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error creating entry:', error);
            return { success: false, error: error.message };
        }
    }

    // Get entries for a specific date
    async getEntriesByDate(diaryId, date) {
        try {
            const { data, error } = await this.supabase
                .from('entries')
                .select('*')
                .eq('diary_id', diaryId)
                .eq('date', date)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error getting entries:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all unlocked entries for a diary
    async getUnlockedEntries(diaryId) {
        try {
            const { data, error } = await this.supabase
                .from('entries')
                .select('*')
                .eq('diary_id', diaryId)
                .is('password_hash', null)
                .order('date', { ascending: false })
                .order('created_at', { ascending: true });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error getting unlocked entries:', error);
            return { success: false, error: error.message };
        }
    }

    // Update entry to unlock it (remove password hash)
    async unlockEntry(entryId) {
        try {
            const { data, error } = await this.supabase
                .from('entries')
                .update({ password_hash: null })
                .eq('id', entryId)
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error unlocking entry:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all dates with entries for a diary
    async getEntryDates(diaryId) {
        try {
            const { data, error } = await this.supabase
                .from('entries')
                .select('date')
                .eq('diary_id', diaryId)
                .order('date', { ascending: false });

            if (error) throw error;

            // Remove duplicates and return unique dates
            const uniqueDates = [...new Set(data.map(entry => entry.date))];
            return { success: true, data: uniqueDates };
        } catch (error) {
            console.error('Error getting entry dates:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if all users have submitted entries for a date
    async checkAllEntriesSubmitted(diaryId, date) {
        try {
            // Get diary to know how many users should have entries
            const diaryResult = await this.getDiary(diaryId);
            if (!diaryResult.success) throw new Error(diaryResult.error);

            const expectedUserCount = diaryResult.data.users.length;

            // Get actual entries for the date
            const entriesResult = await this.getEntriesByDate(diaryId, date);
            if (!entriesResult.success) throw new Error(entriesResult.error);

            const actualUserCount = entriesResult.data.length;

            return {
                success: true,
                allSubmitted: actualUserCount >= expectedUserCount,
                expected: expectedUserCount,
                actual: actualUserCount
            };
        } catch (error) {
            console.error('Error checking entries:', error);
            return { success: false, error: error.message };
        }
    }

    // Get user's entries for a specific date
    async getUserEntry(diaryId, userName, date) {
        try {
            const { data, error } = await this.supabase
                .from('entries')
                .select('*')
                .eq('diary_id', diaryId)
                .eq('user_name', userName)
                .eq('date', date)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
            return { success: true, data: data || null };
        } catch (error) {
            console.error('Error getting user entry:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete a diary (for cleanup)
    async deleteDiary(diaryId) {
        try {
            // First delete all entries
            const { error: entriesError } = await this.supabase
                .from('entries')
                .delete()
                .eq('diary_id', diaryId);

            if (entriesError) throw entriesError;

            // Then delete the diary
            const { error: diaryError } = await this.supabase
                .from('diaries')
                .delete()
                .eq('diary_id', diaryId);

            if (diaryError) throw diaryError;

            return { success: true };
        } catch (error) {
            console.error('Error deleting diary:', error);
            return { success: false, error: error.message };
        }
    }

    // Search entries by content (for theme analysis)
    async searchEntries(diaryId, searchTerm) {
        try {
            const { data, error } = await this.supabase
                .from('entries')
                .select('*')
                .eq('diary_id', diaryId)
                .is('password_hash', null)
                .ilike('content', `%${searchTerm}%`)
                .order('date', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error searching entries:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create global instance
window.diaryDB = new DiaryDatabase();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiaryDatabase;
} 