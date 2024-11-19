import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './MusicPlayer.css';  // Import the CSS for styling

const MusicPlayer = ({ songId }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const [volume, setVolume] = useState(1); // Default volume is 100%
    const audioRef = useRef(null);
    const ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

    // Fetch the song's streaming URL when the songId changes
    useEffect(() => {
        const fetchSongStream = async () => {
            try {
                const response = await axios.get(ENDPOINT + `/api/songs/streamSongById`, {
                    params: { songId },
                    responseType: 'blob'  // Expect binary data from the backend
                });

                // Create a new audio URL for the new song stream
                const audioBlob = response.data;
                const audioUrl = URL.createObjectURL(audioBlob);
                setAudioUrl(audioUrl); // Set the audio URL to play the song
            } catch (error) {
                console.error('Error fetching song stream:', error);
            }
        };

        if (songId) {
            fetchSongStream();
        }
    }, [songId]);  // Re-fetch when songId changes

    // Play/Pause toggle
    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch((error) => {
                console.error('Error trying to play audio:', error);
            });
        }
        setIsPlaying(!isPlaying);
    };

    // Change the volume of the audio element
    const handleVolumeChange = (event) => {
        const newVolume = event.target.value;
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume; // Adjust the volume of the audio element
        }
    };

    return (
        <div className="music-player">
            {audioUrl && (
                <>
                    <audio ref={audioRef} src={audioUrl} />
                    <div className="controls-container">
                        {/* Play Button */}
                        <div
                            className={isPlaying ? 'square' : 'triangle'}
                            onClick={togglePlayPause}
                        ></div>

                        {/* Volume Control */}
                        <div className="volume-control">
                            <label htmlFor="volume-slider">Volume</label>
                            <input
                                id="volume-slider"
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={handleVolumeChange}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default MusicPlayer;