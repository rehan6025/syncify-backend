const express = require('express')
const axios = require('axios')
const router = new express.Router()
const querystring = require('querystring')
const { google } = require('googleapis')
const cookieParser = require('cookie-parser')
const { youtubeAuthMiddleware, refreshYoutubeToken } = require('../utils/youtubeAuth')
const YouTubeMatcher = require('../services/youtubeMatcher');

const oauth2Client = new google.auth.OAuth2(
    process.env.YT_CLIENT_ID,
    process.env.YT_CLIENT_SECRET,
    process.env.YT_REDIRECT_URI
)

router.use(cookieParser())

router.get('/', (req, res) => {
    const scopes = [
        "https://www.googleapis.com/auth/youtube",
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/userinfo.profile"
    ]

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
    });

    res.redirect(authUrl);
});

//callback handler
router.get('/callback', async (req, res) => {
    try {
        const { code } = req.query;

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        //set tokens securely
        res.cookie('yt_access_token', tokens.access_token, {
            httpOnly: true,
            secure: true,
            maxAge: tokens.expiry_date - Date.now()
        });

        res.cookie('yt_refresh_token', tokens.refresh_token, {
            httpOnly: true,
            secure: true,
        });

        res.redirect(`${process.env.FRONTEND_URL}/profile`);

    } catch (error) {
        console.error('YouTube auth error:', error);
        res.redirect('/login?error=youtube_auth')
    }
})



router.get('/user', youtubeAuthMiddleware, async (req, res) => {
    try {
        const youtube = google.youtube('v3');
        const people = google.people('v1');

        //get youtube channel info 
        const channelResponse = await youtube.channels.list({
            auth: req.youtubeClient,
            part: 'snippet',
            mine: true
        })

        const profileResponse = await people.people.get({
            auth: req.youtubeClient,
            resourceName: 'people/me',
            personFields: 'names,emailAddresses,photos'
        });

        res.json({
            channel: channelResponse.data.items[0],
            profile: profileResponse.data
        })



    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
})

router.post('/playlists', youtubeAuthMiddleware, async (req, res) => {
    try {
        
        if (!oauth2Client.credentials) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { title, description } = req.body;
        const youtube = google.youtube('v3')

        const response = await youtube.playlists.insert({
            auth: req.youtubeClient,
            part: 'snippet,status',
            requestBody: {
                snippet: {
                    title: title,
                    description: description || 'Created via Syncify'
                },
                status: {
                    privacyStatus: 'private'
                }
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error creating playlist:', error);
        res.status(500).json({ error: 'Failed to create playlist' });
    }
})

router.post('/playlists/:playlistId/items', youtubeAuthMiddleware, async (req, res) => {
    try {
        const { playlistId } = req.params;
        const { videoId } = req.body;
        const youtube = google.youtube('v3')

        const response = await youtube.playlistItems.insert({
            auth: req.youtubeClient,
            part: 'snippet',
            requestBody: {
                snippet: {
                    playlistId: playlistId,
                    resourceId: {
                        kind: 'youtube#video',
                        videoId: videoId
                    }
                }
            }
        })

        res.json(response.data)


    } catch (error) {

        console.error('Error adding video:', error);
        res.status(500).json({ error: 'Failed to add video' })

    }
})


//test route 
router.get('/search', youtubeAuthMiddleware, async (req, res) => {
    try {
        const { q } = req.query;
        const youtube = google.youtube('v3');

        const response = await youtube.search.list({
            auth: req.youtubeClient,
            part: 'snippet',
            q: `${q} official music video`,
            type: 'video',
            maxResults: 1
        });

        if (response.data.items.length > 0) {
            const video = response.data.items[0];
            res.json({
                videoId: video.id.videoId,
                title: video.snippet.title,
                thumbnail: video.snippet.thumbnails.default.url
            });
        } else {
            res.status(404).json({ error: "No video found" })
        }
    } catch (error) {
        console.error('search error:', error)
        res.status(500).json({ error: 'search failed' });
    }
});


router.post('/match', youtubeAuthMiddleware, async (req, res) => {
    try {
        const spotifyTrack = req.body;
        
        if (!spotifyTrack || !spotifyTrack.name || !spotifyTrack.artists) {
            return res.status(404).json({ error: 'Invalid spotify track data in /match' })
        }

        const matcher = new YouTubeMatcher(req.youtubeClient);
        const match = await matcher.matchSpotifyTrack(spotifyTrack);

        if (!match) {
            return res.status(404).json({ error: 'No matching YouTube video found' });
        }

        res.json({
            videoId: match.id.videoId,
            title: match.snippet.title,
            thumbnail: match.snippet.thumbnails?.high?.url,
            duration: match.duration
        })
    } catch (error) {
        console.error('Match error:: youtube auth ::', error);
        res.status(500).json({ error: 'Failed to match track' });
    }
})


router.post('/batch-match' , youtubeAuthMiddleware, async (req,res) => {
    try {
        const {spotifyTracks} = req.body;

        if(!Array.isArray(spotifyTracks)) {
            return res.status(400).json({error: 'invalid tracks array:: youtube auth'});
        }

        const matcher = new YouTubeMatcher(req.youtubeClient);
        const results = [];
        const errors = [];

        //processing each track 
        for(const track of spotifyTracks){
            try {
                const match = await matcher.matchSpotifyTrack(track)
                if(match) {
                    results.push({
                        spotifyId:track.id,
                        youtubeId: match.id.videoId,
                        title: track.name,
                        artist: track.artists[0].name
                    })
                }
            } catch (error) {
                errors.push({
                    track: track.name,
                    error: error.message
                });
            }
        }

        res.json({
            matched:results.length,
            failed:errors.length,
            results,
            errors
        });

    } catch (error) {
        console.error('Batch match error:: youtube auth:: ',error);
        res.status(500).json({error:'Batch matching failed'});
    }

})


module.exports = router