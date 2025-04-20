const { google } = require('googleapis')
const  stringSimilarity  = require('string-similarity')

class YoutubeMatcher {
    constructor(youtubeClient) {
        this.youtube = google.youtube('v3')
        this.client = youtubeClient
    }

    async matchSpotifyTrack(spotifyTrack) {
        try {
            if (!spotifyTrack.name || !Array.isArray(spotifyTrack.artists) || spotifyTrack.artists.length === 0) {
                throw new Error('Invalid spotifyTrack input: Missing name or artists');
            }


            const query = this.buildSearchQuery(spotifyTrack);
            console.log('query ::' , query);
            

            const results = await this.searchYoutube(query, 5)
            if (!results.length) return null;

            return this.findBestMatch(spotifyTrack, results);
        } catch (error) {
            console.error('Matching error:: youtubeMatcher :: ', error);
            return null;
        }

    }

    buildSearchQuery(track) {
        const artists = track.artists.map(a => a.name).join(' ');
        return `${track.name} ${artists} official`;
    }


    async searchYoutube(query, maxResults = 5) {
        const searchResponse = await this.youtube.search.list({
            auth: this.client,
            part: 'snippet',
            q: query,
            type: 'video',
            maxResults,
            videoCategoryId: '10' //music category
        })

        const videoIds = searchResponse.data.items.map(i => i.id.videoId);
        const detailsResponse = await this.youtube.videos.list({
            auth: this.client,
            part: 'contentDetails',
            id: videoIds.join(',')
        });

        return searchResponse.data.items.map((item, index) => ({
            ...item,
            duration: this.parseDuration(detailsResponse.data.items[index].contentDetails.duration)
        }));
    }

    findBestMatch(spotifyTrack, youtubeResults) {
        console.log('hit findBestMatch');
        
        //1.exact match (title + artist + duration)
        const exactMatch = youtubeResults.find(video =>
            this.isExactMatch(spotifyTrack, video)
        );
        if (exactMatch){ 
            console.log(' Found exact match:', exactMatch.snippet.title);
            return exactMatch;}

        //2.fuzzy match (title similarity + duration)
        const fuzzyMatch = this.findFuzzyMatch(spotifyTrack, youtubeResults);
        if (fuzzyMatch) {
            console.log(' Fuzzy match selected:', fuzzyMatch.snippet.title);
            return fuzzyMatch;
        }
        //fallback: first result 
        return youtubeResults[0];
    }

    isExactMatch(spotifyTrack, youtubeVideo) {
        console.log('Checking isExactMatch for:', youtubeVideo.snippet.title);

        const videoTitle = youtubeVideo.snippet.title.toLowerCase();
        const trackName = spotifyTrack.name.toLowerCase();
        const artistNames = spotifyTrack.artists.map(a => a.name.toLowerCase());

        //Duration check (within 5 seconds)
        const durationDiff = Math.abs(youtubeVideo.duration - (spotifyTrack.duration / 1000));
        if (durationDiff > 5) return false;


        //Title must contain track name and at least one artist 
        const hasTrackName = videoTitle.includes(trackName);
        const hasArtist = artistNames.some(artist => videoTitle.includes(artist));

        return hasTrackName && hasArtist;
    }

    findFuzzyMatch(spotifyTrack, youtubeResults) {
        console.log('hit fuzzy');
        const primaryArtist = spotifyTrack.artists?.[0]?.name || '';
        const searchString = `${spotifyTrack.name} ${primaryArtist}`.toLowerCase();

        //calculating a score for every yt results video 
        const scoredResults = youtubeResults.map(video => {
            //title score : calc score for search string and yt video title similarity  
            const titleScore = stringSimilarity.compareTwoStrings(
                searchString,
                video.snippet.title.toLowerCase()
            )
            //this score is bw 0 and 1 where 1 is perfect match

            //duration difference 
            const durationDiff = Math.abs(video.duration - (spotifyTrack.duration / 1000));

            //duration score , if duration same then 1 , if >30s then zero 
            const durationScore = Math.max(0, 1 - (durationDiff / 30));

            return {
                video,
                score: (titleScore * 0.7) + (durationScore * 0.3)
            }
        })
        scoredResults.sort((a, b) => b.score - a.score);
        return scoredResults[0]?.score > 0.65 ? scoredResults[0].video : null;
    }

    parseDuration(duration) {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

        return (
            (parseInt(match[1] || 0) * 3600) +
            (parseInt(match[2] || 0) * 60) +
            (parseInt(match[3] || 0))
        )
    }
}

module.exports = YoutubeMatcher;