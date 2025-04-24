# 🔧 Syncify Backend

Node.js/Express server for playlist transfers between Spotify and YouTube.  
*(Frontend: [syncify.vercel.app](https://syncify.vercel.app))*

## 🌟 Key Features  
- OAuth2 flows for Spotify/YouTube  
- REST API for playlist processing  
- 95%+ track-matching algorithm  

## 🛠️ Tech Stack  
- **Runtime**: Node.js  
- **Framework**: Express  
- **APIs**: Spotify Web API, YouTube Data API v3  
- **Auth**: JWT, OAuth2  

## 📡 API Endpoints  
```plaintext
POST /api/youtube/batch-match   - Start playlist transfer  
GET  /api/spotify/playlists - Fetch user's playlists  
