import React, { useState, useEffect } from 'react';
import { useAuth } from "../AuthContext";
import axios from "axios";
import { useNavigate } from 'react-router-dom';
import MusicPlayer from "../MusicPlayer/MusicPlayer"; // Import the MusicPlayer component
import "./User.css";

function User() {
    const ENDPOINT = process.env.REACT_APP_API_ENDPOINT;
    const { authToken, id } = useAuth();
    const navigate = useNavigate();
    const [userInfo, setUserInfo] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [songs, setSongs] = useState([]);
    const [currentSongId, setCurrentSongId] = useState(null);

    const requestData = {
        id: id
    };

    // Fetch user profile and songs
    useEffect(() => {
        if (authToken === null) {
            setErrorMessage("You are not signed in. Please log in to get song list.");
        } else {
            setErrorMessage('');
            handleSongCall();
            UserProfile();
        }
    }, [authToken]);

    // Fetch user's song list
    const handleSongCall = async () => {
        try {
            const response = await axios.post(ENDPOINT + "/api/songs/usersongs", requestData);
            if (response.data.message === "Success") {
                setSongs(response.data.songs);
            } else {
                console.log("No songs found for this user");
            }
        } catch (error) {
            console.error("Error retrieving songs:", error);
        }
    };

    // Fetch user profile data (username)
    const UserProfile = async () => {
        try {
            const response = await axios.get(ENDPOINT + `/api/users/read/${id}`);
            if (response.status === 200) {
                const username = response.data.userInfo.username;
                setUserInfo(response.data);  // Store the user profile data
            }
        } catch (error) {
            if (error.response) {
                setErrorMessage(error.response.data.message);
            } else {
                setErrorMessage("Error fetching user profile");
            }
        }
    };

    return (
        <div>
            {!authToken && <p className="errorMessage" style={{ color: 'red' }}>{errorMessage}</p>}

            {userInfo ? (
                <h1>{userInfo.userInfo.username}'s Song List</h1>
            ) : (
                <p>Loading user profile...</p>
            )}

            <div className="song-list">
                {songs.length > 0 ? (
                    songs.map((song) => (
                        <div 
                            key={song.songId} 
                            className="song-block" 
                            onClick={() => setCurrentSongId(song.streamId)} // Play song when the box is clicked
                        >
                            <h2>{song.title}</h2>
                            <p>{song.description}</p>
                        </div>
                    ))
                ) : (
                    <p>No songs to display</p>
                )}
            </div>

            {/* MusicPlayer Component */}
            {currentSongId && <MusicPlayer songId={currentSongId} />}
        </div>
    );

}

export default User;