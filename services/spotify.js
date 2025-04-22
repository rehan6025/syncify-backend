const axios = require('axios')

exports.getPlaylists = async (accessToken) => {
    try {
        let playlists = []
        let url = 'https://api.spotify.com/v1/me/playlists?limit=50';
        console.log("📦 Access Token:", accessToken);

        while (url) {
            const res = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            if (!res.data?.items) {
                throw new Error('Invalid Spotify API response');
            }

            playlists.push(...res.data.items);

            url = res.data.next;
        }
        return playlists;
    } catch (error) {
        console.error('❌ Failed to fetch playlists');

        if (error.response) {
            console.error('📉 Status Code:', error.response.status);
            console.error('📦 Response Data:', error.response.data);
        } else if (error.request) {
            console.error('📡 No response received from Spotify');
            console.error(error.request);
        } else {
            console.error('⚠️ Error Message:', error.message);
        }

        throw error;
    }
}

exports.getTracks = async (playlistId, accessToken) => {
    const res = await axios.get(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return res.data.items.map(item => ({
        id: item.track.id,
        name: item.track.name,
        artists: item.track.artists,
        duration: item.track.duration_ms
    }))
}
