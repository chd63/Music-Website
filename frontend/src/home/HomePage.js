import React, { useEffect, useState } from 'react';
import axios from 'axios';
import MusicPlayer from '../MusicPlayer/MusicPlayer'; // Import the MusicPlayer component
import "./HomePage.css";

function HomePage() {
    const ENDPOINT = process.env.REACT_APP_API_ENDPOINT;
    const [songs, setSongs] = useState([]);
    const [currentSongId, setCurrentSongId] = useState(null);

    useEffect(() => {
        const fetchSongs = async () => {
            try {
                const response = await axios.post(ENDPOINT + '/api/songs/homepagesongs');
                setSongs(response.data.songs || []);
            } catch (error) {
                console.error('Error fetching songs:', error);
            }
        };

        fetchSongs();
    }, [ENDPOINT]);

    return (
        <div className="home-page">
            <h1>Song List</h1>
            <div className="song-list">
                {songs.map((song) => (
                    <div 
                        key={song.songId} 
                        className="song-block" 
                        onClick={() => setCurrentSongId(song.streamId)} // Play song when the box is clicked
                    >
                        <h2>{song.title}</h2>
                        <p>{song.description}</p>
                    </div>
                ))}
            </div>
            {currentSongId && <MusicPlayer songId={currentSongId} />}
        </div>
    );
}

export default HomePage;