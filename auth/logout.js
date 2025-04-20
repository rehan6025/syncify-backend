const express = require('express')
const router = new express.Router()
const cookieParser = require('cookie-parser')

router.get('/', (req,res) => {
    res.clearCookie('yt_access_token');
    res.clearCookie('yt_refresh_token');
    res.clearCookie('spotify_access_token');
    res.clearCookie('spotify_refresh_token');
    res.clearCookie('spotify_token_expiry');

    res.redirect('http://localhost:5173/login');
})


module.exports = router;