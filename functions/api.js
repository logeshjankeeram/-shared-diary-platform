// Netlify Functions API for secure operations

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for server-side operations

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Utility function to hash password
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// Main handler
exports.handler = async (event, context) => {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        const { action, ...data } = JSON.parse(event.body || '{}');

        switch (action) {
            case 'createDiary':
                return await handleCreateDiary(data);
            case 'joinDiary':
                return await handleJoinDiary(data);
            case 'verifyPasswords':
                return await handleVerifyPasswords(data);
            case 'unlockEntries':
                return await handleUnlockEntries(data);
            case 'getDiaryInfo':
                return await handleGetDiaryInfo(data);
            case 'checkEntryStatus':
                return await handleCheckEntryStatus(data);
            default:
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Invalid action' })
                };
        }
    } catch (error) {
        console.error('API Error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};

// Verify passwords for a specific date
async function handleVerifyPasswords(data) {
    const { diaryId, date, passwords } = data;

    if (!diaryId || !date || !passwords || !Array.isArray(passwords)) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Missing required parameters' })
        };
    }

    try {
        // Get diary information
        const { data: diary, error: diaryError } = await supabase
            .from('diaries')
            .select('*')
            .eq('diary_id', diaryId)
            .single();

        if (diaryError) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Diary not found' })
            };
        }

        // Get entries for the date
        const { data: entries, error: entriesError } = await supabase
            .from('entries')
            .select('*')
            .eq('diary_id', diaryId)
            .eq('date', date);

        if (entriesError) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Failed to fetch entries' })
            };
        }

        // Verify we have the right number of passwords
        if (passwords.length !== diary.users.length) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: `Need passwords for all ${diary.users.length} users`,
                    expected: diary.users.length,
                    provided: passwords.length
                })
            };
        }

        // Verify each password
        const verificationResults = [];
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const userIndex = diary.users.indexOf(entry.user_name);

            if (userIndex === -1) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: `Unknown user: ${entry.user_name}` })
                };
            }

            const password = passwords[userIndex];
            const hashedPassword = await hashPassword(password);
            const isValid = hashedPassword === entry.password_hash;

            verificationResults.push({
                user: entry.user_name,
                valid: isValid
            });

            if (!isValid) {
                return {
                    statusCode: 401,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: `Invalid password for ${entry.user_name}`,
                        results: verificationResults
                    })
                };
            }
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'All passwords verified successfully',
                results: verificationResults,
                entries: entries
            })
        };

    } catch (error) {
        console.error('Password verification error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Password verification failed' })
        };
    }
}

// Unlock entries for a specific date
async function handleUnlockEntries(data) {
    const { diaryId, date, passwords } = data;

    if (!diaryId || !date || !passwords || !Array.isArray(passwords)) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Missing required parameters' })
        };
    }

    try {
        // First verify passwords
        const verifyResult = await handleVerifyPasswords(data);
        if (verifyResult.statusCode !== 200) {
            return verifyResult;
        }

        const verifyData = JSON.parse(verifyResult.body);
        const entries = verifyData.entries;

        // Unlock all entries by removing password hashes
        const unlockPromises = entries.map(entry =>
            supabase
                .from('entries')
                .update({ password_hash: null })
                .eq('id', entry.id)
        );

        await Promise.all(unlockPromises);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'Entries unlocked successfully',
                unlockedCount: entries.length
            })
        };

    } catch (error) {
        console.error('Entry unlocking error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to unlock entries' })
        };
    }
}

// Get diary information
async function handleGetDiaryInfo(data) {
    const { diaryId } = data;

    if (!diaryId) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Missing diary ID' })
        };
    }

    try {
        const { data: diary, error } = await supabase
            .from('diaries')
            .select('*')
            .eq('diary_id', diaryId)
            .single();

        if (error) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Diary not found' })
            };
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                diary: diary
            })
        };

    } catch (error) {
        console.error('Get diary info error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to get diary information' })
        };
    }
}

// Create a new diary
async function handleCreateDiary(data) {
    const { diaryId, userName, type, userPassword } = data;

    if (!diaryId || !userName || !type || !userPassword) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Missing required parameters' })
        };
    }

    try {
        // Check if diary already exists
        const { data: existingDiary, error: checkError } = await supabase
            .from('diaries')
            .select('diary_id')
            .eq('diary_id', diaryId)
            .single();

        if (existingDiary) {
            return {
                statusCode: 409,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Diary ID already exists' })
            };
        }

        // Create the diary
        const { data: newDiary, error: createError } = await supabase
            .from('diaries')
            .insert([
                {
                    diary_id: diaryId,
                    name: userName,
                    type: type,
                    users: [userName],
                    user_passwords: { [userName]: userPassword },
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (createError) {
            console.error('Create diary error:', createError);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Failed to create diary' })
            };
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                data: newDiary
            })
        };

    } catch (error) {
        console.error('Create diary error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to create diary' })
        };
    }
}

// Join an existing diary
async function handleJoinDiary(data) {
    const { diaryId, userName, userPassword } = data;

    if (!diaryId || !userName || !userPassword) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Missing required parameters' })
        };
    }

    try {
        // Get the existing diary
        const { data: existingDiary, error: fetchError } = await supabase
            .from('diaries')
            .select('*')
            .eq('diary_id', diaryId)
            .single();

        if (fetchError) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Diary not found' })
            };
        }

        // Check if user is already in the diary
        if (existingDiary.users.includes(userName)) {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    data: existingDiary,
                    message: 'Already a member'
                })
            };
        }

        // Check if the password matches any existing user's password
        const existingPasswords = existingDiary.user_passwords || {};
        const passwordMatch = Object.values(existingPasswords).includes(userPassword);
        if (!passwordMatch) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Incorrect secret password for this diary' })
            };
        }

        // Add user to the diary
        const updatedUsers = [...existingDiary.users, userName];
        const updatedPasswords = {
            ...existingDiary.user_passwords,
            [userName]: userPassword
        };

        const { data: updatedDiary, error: updateError } = await supabase
            .from('diaries')
            .update({
                users: updatedUsers,
                user_passwords: updatedPasswords
            })
            .eq('diary_id', diaryId)
            .select()
            .single();

        if (updateError) {
            console.error('Join diary error:', updateError);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Failed to join diary' })
            };
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                data: updatedDiary
            })
        };

    } catch (error) {
        console.error('Join diary error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to join diary' })
        };
    }
}

// Check entry status for a specific date
async function handleCheckEntryStatus(data) {
    const { diaryId, date } = data;

    if (!diaryId || !date) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Missing required parameters' })
        };
    }

    try {
        // Get diary to know expected user count
        const { data: diary, error: diaryError } = await supabase
            .from('diaries')
            .select('*')
            .eq('diary_id', diaryId)
            .single();

        if (diaryError) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Diary not found' })
            };
        }

        // Get entries for the date
        const { data: entries, error: entriesError } = await supabase
            .from('entries')
            .select('*')
            .eq('diary_id', diaryId)
            .eq('date', date);

        if (entriesError) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Failed to fetch entries' })
            };
        }

        const expectedUserCount = diary.users.length;
        const actualUserCount = entries.length;
        const allSubmitted = actualUserCount >= expectedUserCount;

        // Check which users have submitted entries
        const submittedUsers = entries.map(entry => entry.user_name);
        const missingUsers = diary.users.filter(user => !submittedUsers.includes(user));

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                allSubmitted: allSubmitted,
                expected: expectedUserCount,
                actual: actualUserCount,
                submittedUsers: submittedUsers,
                missingUsers: missingUsers,
                entries: entries
            })
        };

    } catch (error) {
        console.error('Check entry status error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to check entry status' })
        };
    }
} 