const express = require('express')
const axios = require('axios')
const queryString = require('querystring');
const { emitWarning } = require('process');


const refreshSpotifyToken = async (refreshToken) => {
    try {
        const response = await axios.post('https://accounts.spotify.com/api/token',
            queryString.stringify({
                grant_type:'refresh_token',
                refresh_token:refreshToken
            }),{
                headers:{
                    'Content-Type':'application/x-www-form-urlencoded',
                    'Authorization':'Basic '+ Buffer.from(
                        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
                    ).toString('base64')
                }
            }
        );

        return {
            access_token:response.data.access_token,
            expires_in:response.data.expires_in
        };
    } catch (error) {
        throw new Error('Spotify token refresh failed ')
    }
};

//middleware for checking/refreshing token 

const spotifyAuthMiddleware = async (req,res,next) => {
    try {
        let access_token = req.cookies.spotify_access_token;
        const refresh_token = req.cookies.spotify_refresh_token;
        const expiry = req.cookies.spotify_token_expiry;

        if(Date.now() > expiry){
            const newTokens = await refreshSpotifyToken(refresh_token);

            access_token= newTokens.access_token;
            res.cookie('spotify_access_token',access_token,{httpOnly:true , secure: true});
            res.cookie('spotify_token_expiry', Date.now() + (newTokens.expires_in * 1000), { httpOnly: false, secure: true })
        }
        req.accessToken = access_token
        next();

    } catch (error) {
        res.status(401).json({error:'Authentication required'})
        console.log(error);
        
    }
}

module.exports = {
    refreshSpotifyToken , spotifyAuthMiddleware
}