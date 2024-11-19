const express = require('express');
const multer = require('multer');
const path = require('path');
const { ObjectId } = require('mongodb');
const fs = require('fs');
const { GridFSBucket } = require('mongodb');
const dbUtil = require("../database/database-util");
const { MongoClient } = require("mongodb");

require("dotenv").config({ path: path.resolve(__dirname, '../.env') });

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: function(req, file, cb) {
        const allowedMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(null, false);
            return cb(new Error('Only audio files are allowed'));
        }
    }
});

const DB_URI = process.env.DB_URI;

module.exports = {
    initialize : (app) => {

        /*
        Endpoint: POST /api/songs/create
        Description: Creates a new song for a user and responds with the song ID if successful
        */
        app.post("/api/songs/create", upload.single('selectedFile'), async (req, res) => {
            console.log('Received request to upload song');
            console.log('Body:', req.body);
            console.log('File:', req.file);

            if (!req.body.id || !req.body.songTitle || !req.body.songDescription) {
                console.log("Not all values provided in body: " + req.body);
                return res.status(401).send({ message: "Missing required value(s)" });
            }

            const filePath = req.file.path;
            const songId = new ObjectId().toString();

            const songDocument = {
                songId: songId,
                userId: req.body.id,
                title: req.body.songTitle,
                description: req.body.songDescription,
            };

            try {
                const insertedId = await dbUtil.createMp3Document('songs', songDocument, filePath);
                console.log(`Song inserted with ID: ${insertedId}`);
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Error deleting temporary file:', err);
                    else console.log('Temporary file deleted successfully');
                });
            } catch (error) {
                console.error("Error uploading song:", error);
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Error deleting temporary file:', err);
                    else console.log('Temporary file deleted successfully');
                });
            }

            return res.status(201).send({ message: "Song successfully created!" });
        });

        /*
        Endpoint: GET /api/songs/random
        Description: Retrieves a random song from all songs and streams it to the client
        */
        app.get("/api/songs/random", async (req, res) => {
            try {
                const client = await MongoClient.connect(DB_URI);
                const db = client.db('yousound');
                const songIds = await dbUtil.getAllSongIds(); 
                const bucket = new GridFSBucket(db, { bucketName: 'songs' });

                if (!songIds || songIds.length === 0) {
                    return res.status(404).send({ message: "No song IDs found" });
                }

                const randomIndex = Math.floor(Math.random() * songIds.length);
                const randomSong = songIds[randomIndex];
                const songMetadata = await dbUtil.getSongMetadataById(randomSong);

                res.set({
                    'Content-Type': 'audio/mpeg',
                    'Content-Disposition': `attachment; filename="song-${randomSong}.mp3"`,
                    'X-Song-Title': songMetadata.metadata.title,
                    'X-Song-Description': songMetadata.metadata.description,
                    'Access-Control-Expose-Headers': 'X-Song-Title, X-Song-Description',
                });

                const stream = bucket.openDownloadStream(randomSong);
                stream.pipe(res);
            } catch (error) {
                console.error(error);
                return res.status(500).send({ message: "Server Error" });
            }
        });

        /*
        Endpoint: GET /api/songs/streamSongById
        Description: Will stream a song requested from the client        
        */
        app.get("/api/songs/streamSongById", async (req, res) => {
            try {
                const { songId } = req.query;
        
                // Validate that songId is provided
                if (!songId) {
                    return res.status(400).send({ message: "Song ID is required" });
                }
        
                // Connect to MongoDB
                const client = await dbUtil.connectToMongo();
                const db = client.db(process.env.DB_NAME);
                const bucket = new GridFSBucket(db, { bucketName: 'songs' });
        
                // Check if the song exists in the database
                const songExists = await db.collection('songs.files').findOne({ _id: new ObjectId(songId) });
                if (!songExists) {
                    return res.status(404).send({ message: "Song not found" });
                }
        
                // Set appropriate headers for audio streaming
                res.set({
                    'Content-Type': 'audio/mpeg',
                    'Content-Disposition': `inline; filename="song-${songId}.mp3"`,
                });
        
                // Stream the song to the client
                const stream = bucket.openDownloadStream(new ObjectId(songId));
                stream.pipe(res);
        
                // Handle stream errors
                stream.on('error', (err) => {
                    console.error('Error streaming song:', err);
                    res.status(500).send({ message: "Error streaming song" });
                });
        
            } catch (error) {
                console.error("Error retrieving song:", error);
                res.status(500).send({ message: "Server Error" });
            }
        });

        /*
        Endpoint: GET /api/songs/homepagesongs
        Description: Will get 10 songs for the user to be able to 
        select for the homepage
        */
        app.post("/api/songs/homepagesongs", async (req, res) => {
            try {

                const userSongs = await dbUtil.getDocuments('songs', {}, { _id: 1, songId: 1,title: 1, description: 1 });

                if (!userSongs || userSongs.length === 0) {
                    return res.status(404).send({ message: "No songs found" });
                }
        
                // Send back song data to the client
                return res.status(200).json({
                    message: "Success",
                    songs: userSongs.map(song => ({
                        songId: song._id,
                        streamId: song.songId,
                        title: song.title,
                        description: song.description,
                    }))
                });
                
            } catch (error) {
                console.error(error);
                return res.status(500).send({ message: "Server Error" });
            }
        });

        /*
        Endpoint: GET /api/songs/usersongs
        Description: Will retreave song data in a list of 10 based on the user 
        id
        */
        app.post("/api/songs/usersongs", async (req, res) => {
            try {
                const userId = req.body.id;

                if (!userId) {
                    return res.status(400).send({ message: "User ID is required" });
                }

                const userSongs = await dbUtil.getDocuments('songs', { userId: userId }, { _id: 1, songId: 1, title: 1, description: 1 });

                if (!userSongs || userSongs.length === 0) {
                    return res.status(404).send({ message: "No songs found for this user" });
                }
        
                // Send back song data to the client
                return res.status(200).json({
                    message: "Success",
                    songs: userSongs.map(song => ({
                        songId: song._id,
                        streamId: song.songId,
                        title: song.title,
                        description: song.description,
                    }))
                });
                
            } catch (error) {
                console.error(error);
                return res.status(500).send({ message: "Server Error" });
            }
        });



        console.log("Songs API routes initialized");
    }
}