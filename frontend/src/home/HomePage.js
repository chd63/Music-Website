import React, { useEffect, useState } from 'react';
import axios from 'axios';
import MusicPlayer from '../MusicPlayer/MusicPlayer'; // Import the MusicPlayer component
import "./HomePage.css";

function HomePage() {
    const ENDPOINT = process.env.REACT_APP_API_ENDPOINT;
    const [songs, setSongs] = useState([]);
    const [currentSongId, setCurrentSongId] = useState(null);
    const [query, setQuery] = useState("");
    const [error, setError] = useState(null);

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

    const handleInputChange = (e) => {
        setQuery(e.target.value);
    };

    const handleSearch = async () => {
        if (!query.trim()) {
            setError('Please enter a search term.');
            return;
        }

        try {
            const response = await axios.get(ENDPOINT + '/api/search', {
                params: { q: query } 
            });
            setSongs(response.data.songs || []); 
            setError(null);
        } catch (error) {
            console.error('Error searching songs:', error);
            setError('Failed to fetch search results.');
        }
    };

    return (
        <div className="home-page">
            <div className="searchbar">
                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    placeholder="Search..."
                />
                <button onClick={handleSearch}>Search</button>
            </div>
            {error && <div className="error-message">{error}</div>}
            <h1>{query ? 'Search Results' : 'Recent Uploads'}</h1>
            <div className="song-list">
                {songs.length > 0 ? (
                    songs.map((song) => (
                        <div 
                            key={song.songId} 
                            className="song-block" 
                            onClick={() => setCurrentSongId(song.streamId)} 
                        >
                            <h2>{song.title}</h2>
                            <p>{song.description}</p>
                        </div>
                    ))
                ) : (
                    <p>No songs found.</p>
                )}
            </div>
            {currentSongId && <MusicPlayer songId={currentSongId} />}
        </div>
    );
}

export default HomePage;