const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser');

const app = express();
app.use(cookieParser());
const spotifyRouter = require('./auth/spotify')
const youtubeRouter = require('./auth/youtube')
const logoutRouter = require('./auth/logout')


const allowedOrigins = [
    'http://localhost:5173'
]

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use('/auth/spotify', spotifyRouter)
app.use('/auth/youtube', youtubeRouter)
app.use('/auth/logout' , logoutRouter)
app.use('/auth/status' , (req,res)=>{
    const spotifyConnected = !!req.cookies.spotify_access_token
    const youtubeConnected = !!req.cookies.yt_access_token

    res.json({spotifyConnected , youtubeConnected});
})


app.listen(3000, () => {
    console.log('Server listening on port 3000');
})