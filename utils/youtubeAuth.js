const {google} = require('googleapis')
const oauth2Client = new google.auth.OAuth2(
    process.env.YT_CLIENT_ID,
    process.env.YT_CLIENT_SECRET,
    process.env.YT_REDIRECT_URI
)


const refreshYoutubeToken = async (refreshToken) => {
    try {
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        const {credentials} = await oauth2Client.refreshAccessToken();
        return credentials.access_token;
    } catch (error) {
        throw new Error('Youtube token refresh failed')
    }
}


const youtubeAuthMiddleware = async (req, res, next) => {
    try {
        let access_token = req.cookies.yt_access_token;
        const refresh_token = req.cookies.yt_refresh_token;

        if (!access_token && refresh_token) {
            access_token = await refreshYoutubeToken(refresh_token);
            req.cookie('yt_access_token', access_token, {
                httpOnly: true,
                secure: true,   
                maxAge: tokens.expiry_date - Date.now()
            })
        }

        oauth2Client.setCredentials({access_token: access_token})
        req.youtubeClient = oauth2Client;
        next();

    } catch (error) {
        res.status(401).json({error:'Youtube authentication required'});
    }
}

module.exports = {youtubeAuthMiddleware, refreshYoutubeToken}