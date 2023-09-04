const express = require('express')
const dbConnect = require("./db/dbConnect");
const app = express()
//execute database connection
dbConnect()
//Models
const Anime = require('./db/AnimeModel')
const Users = require('./db/UserModel')
const Episodes = require('./db/EpisodeModel')
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// Setup
app.use(express.json())
app.use('/static', express.static(path.join(__dirname, 'public')))
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization'
    );
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    )
    next()
})
//Search anime
app.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).send('Query parameter q is required');
        }
        const animeList = await Anime.find({
            title: {
                $regex: new RegExp(query, 'i') // 'i' makes the search case-insensitive
            }
        }).select('-episodes')
        res.status(200).json(animeList)
    } catch (err) {
        res.status(500).send('Server error');
    }
})
// Get Catalog
app.post('/anime/catalog', async (req, res) => {
    try {
        const {genres} = req.body
        if (genres) {
            const animeList = await Anime.find({
                genre: {$in: genres}
            }).select('-episodes')
            res.json(animeList);
        } else {
            const animeList = await Anime.find({}).select('-episodes')
            res.json(animeList)
        }
    } catch (err) {
        res.status(500).send('Server Error');
    }
})
// Get Genre
app.get('/anime/genre/:genreId', async (req, res) => {
    try {
        const genre = req.params.genreId
        const animeList = await Anime.find({
            genre: {$in: genre}
        }).select('-episodes').limit(10)
        res.json(animeList)
    } catch (e) {
        res.status(500).send('Server Error');
    }
})
// Get Catalog category
app.get('/anime/catalog/:item', async (req, res) => {
    try {
        const item = req.params.item
        if (item === 'all') {
            const animeList = await Anime.find({}).select('-episodes')
            res.json(animeList)
        } else {
            const animeList = await Anime.find({
                categories: {$in: item}
            }).select('-episodes')
            res.json(animeList);
        }
    } catch (err) {
        res.status(500).send('Server Error');
    }
})
//routes
app.get('/', (req, res) => {
    res.send('Server is working')
})
//Add Anime
app.post('/add/anime', async (req, res) => {
    try {
        const {
            title,
            id,
            description,
            image,
            genre,
            release_date,
            rating,
            categories
        } = req.body;
        const newAnime = new Anime({
            title,
            id,
            description,
            image,
            genre,
            release_date,
            rating,
            categories
        })
        if (req.body.episodes) {
            newAnime.episodes = req.body.episodes;
        }
        const savedAnime = await newAnime.save();
        res.json(savedAnime);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
})
// Add Episode
app.post('/add/:animeId/episode', async (req, res) => {
    try {
        const animeId = req.params.animeId;
        const {
            episode_number,
            title,
            date,
            description,
            video,
            intro,
            end,
            image_thumb
        } = req.body;
        const anime = await Anime.findOne({ id: animeId });
        if (!anime) {
            return res.status(404).send('Anime not found');
        }
        const episode = new Episodes({ episode_number, title, date, description, video, intro, end, image_thumb });
        await episode.save();
        anime.episodes.push(episode._id);
        await anime.save();
        res.status(200).send('Episode added successfully');
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});
// Get Anime Data
app.get(`/anime/:animeId/:userId`, async (req, res) => {
    const { animeId, userId } = req.params;
    const anime = await Anime.findOne({'id': animeId});
    if (!anime) {
        return res.status(404).send({message: 'Anime with this id not found'})
    }
    const user =  await Users.findById(userId);
    const isInWatchlist = user.watchlist.includes(anime._id);
    const lastWatchedEpisode =
        user.watchedEpisodes.filter((value) => (value.animeId.toString() === anime._id.toString()))
            .sort((a, b) => b.watchedOn - a.watchedOn)[0]
    res.status(200).send({isInWatchlist, lastWatchedEpisode: lastWatchedEpisode?.episodeNumber || 0})
})
// Get Anime
app.get('/anime/:animeId', async (req, res) => {
    try {
        const anime = await Anime.findOne({'id': req.params.animeId}).populate('episodes')
        if (!anime) {
            return res.status(404).send({message: 'Anime with this id not found'})
        }
        res.send(anime)
    } catch (e) {
        console.log(e.message)
        res.status(500).send({message: e.message});
    }
})

// Get Anime Lists

app.post('/get/anime/lists', async (req, res) => {
    const {animeLists} = req.body;

    try{
        const facetStages = animeLists.map((list) => ({
            [list]: [
                {
                    $match: {
                        $or: [
                            { genre: { $in: [list] } },
                            { categories: { $in: [list] } }
                        ]
                    },

                },
                {
                    $limit: 10
                }
            ]
        }));
        const aggregationPipeline = [
            {
                $facet: Object.assign({}, ...facetStages)
            }
        ]
       const lists = await Anime.aggregate(aggregationPipeline)
        console.log(lists)
        res.status(200).json(lists[0])

    }catch(e){
        console.log(e.message)
        res.status(500).send({message: e.message});
    }
})

app.post('/get/episode', async (req, res) => {
    const {animeId, episodeNumber} = req.body;
    try{

        const anime = await Anime.findOne({
            'id': animeId
        })
        if (!anime) {
            return res.status(404).send({message: 'Anime with this id not found'})
        }
        const episode = await Episodes.findOne({'anime': anime._id, 'episode_number': episodeNumber})


            if (!episode) {
                return res.status(404).send({message: 'Episode with this id not found'})
            }
            const prevEpisode = await Episodes
                .findOne({'anime': anime._id, 'episode_number': {$lt: episode.episode_number}})
                .sort('-episode_number')
                .select('episode_number title image_thumb')
                .exec()

            const nextEpisode = await Episodes
                .findOne({'anime': anime._id, 'episode_number': {$gt: episode.episode_number}})
                .sort('episode_number')
                .select('episode_number title image_thumb')
                .exec()
            // console.log(episode, prevEpisode, nextEpisode)

            res.status(200).json({id: anime._id, currentEpisode: episode, prevEpisode, nextEpisode})

    }catch(e){
        console.log(e.message)
        res.status(500).send({message: e.message});
    }
})


app.post('/get/anime', async (req, res) => {
    const {animeId, userId} = req.body;
    try{
        const anime = await Anime.findOne({'id': animeId}).populate('episodes')
        if (!anime) {
            return res.status(404).send({message: 'Anime with this id not found'})
        }
        if(userId){
            const user =  await Users.findById(userId);
            const isInWatchlist = user.watchlist.includes(anime._id);
            const lastWatchedEpisode =
                user.watchedEpisodes.filter((value) => (value.animeId.toString() === anime._id.toString()))
                    .sort((a, b) => b.watchedOn - a.watchedOn)[0]
            res.status(200).json({
                ...anime._doc,
                auth: true,
                isInWatchlist,
                lastWatchedEpisode: lastWatchedEpisode?.episodeNumber || 0
            })
        }
        else{
            res.status(200).json({
                ...anime._doc,
                userId: userId,
            })
        }
    }catch(e){
        console.log(e.message)
        res.status(500).send({message: e.message});
    }
})
app.get('/get/episodes/:animeId', async (req, res) => {
    const {animeId} = req.params
    const page = parseInt(req.query.page) || 1
    const perPage = 10;
    const skip = (page - 1) * perPage;
    const eps = await Anime.findOne({'id': req.params.animeId})
        .populate({
            path: 'episodes',
            options: {
                skip: skip,
                limit: perPage,
                sort: {episode_number: 1}
            }
        })
    if (!eps) {
        return res.status(404).send({message: 'Anime with this id not found'})
    }
    res.status(200).json(eps.episodes)
})
//Get All Anime
app.get('/all_anime', (req, res) => {
    Anime.find({}).select('-episodes').then(all_anime => {
        res.status(200).json(all_anime)
    }).catch(err => {
        console.log(err.message)
        res.status(500)
    })
})
// Auth
app.post('/auth/register', async (req, res) => {
    Users.findOne({email: req.body.email}).then(user => {
        if (user) {
            return res.status(400).json({message: 'Email already exists'})
        } else {
            const newUser = new Users({
                email: req.body.email,
                password: req.body.password,
                isGoogleAuth: false
            })
            bcrypt.genSalt(10, (err, salt) => {
                bcrypt.hash(newUser.password, salt, (err, hash) => {
                    if (err) throw err;
                    newUser.password = hash;
                    newUser.save().then(user => res.status(200).json(user)).catch(err => {
                        console.log(err.message)
                        res.status(500).json({message: 'Server error'})
                    })
                })
            })
        }
    })
})
app.post('/login', async (req, res) => {
    Users.findOne({email: req.body.email}).then(user => {
        if (req.body.isGoogleAuth) {
            if (user){
                const token = jwt.sign({
                        userId: user._id,
                        userEmail: user.email
                    },
                    process.env.KEY,
                    {expiresIn: '2h'}
                )
                res.status(200).json({
                    email: user.email,
                    id: user._id,
                    token: `Bearer ${token}`
                })
            }
            else{
                const newUser = new Users({
                    email: req.body.email,
                    isGoogleAuth: true
                })
                newUser.save().then(savedUser => {
                    const token = jwt.sign({
                            userId: savedUser._id,
                            userEmail: savedUser.email
                        },
                        process.env.KEY,
                        {expiresIn: '2h'}
                    )
                    res.status(200).json({
                        email: savedUser.email,
                        id: savedUser._id,
                        token: `Bearer ${token}`
                    });
                })
            }
        }
        else{
            bcrypt.compare(req.body.password, user.password).then(isMatch => {
                if (!isMatch) {
                    return res.status(400).json({password: 'Password incorrect'})
                }
                const token = jwt.sign({
                        userId: user._id,
                        userEmail: user.email
                    },
                    process.env.KEY,
                    {expiresIn: '2h'}
                )
                res.status(200).json({
                    email: user.email,
                    id: user._id,
                    token: `Bearer ${token}`
                })
            }).catch(err => {
                res.status(400).json({
                    message: 'Password incorrect',
                    error: err.message
                })
            })
        }
    }).catch(err => {
        res.status(400).json({
            message: 'Email incorrect',
            error: err.message
        })
    })
})
app.post('/update/user/history', async (req, res) => {
    try {
        const { animeId, episodeId, userId, currentTime, episodeNumber } = req.body;
        if (currentTime === 0) {
            return res.status(400).json({ success: false, message: 'Current time is 0' });
        }
        Users.findOne({ _id: userId, "watchedEpisodes.episodeId": episodeId }).then(user => {
            if (user) {
                Users.updateOne(
                    { _id: userId, "watchedEpisodes.episodeId": episodeId },
                    { $set: { "watchedEpisodes.$.currentTime": currentTime, "watchedEpisodes.$.watchedOn": new Date() } }
                ).then(result => {
                    return res.status(200).json({ success: true, message: 'Watched episode updated successfully' });
                }).catch(err => {
                    return res.status(500).json({ success: false, message: err.message });
                });
            } else {
                Users.updateOne(
                    { _id: userId },
                    { $push: { watchedEpisodes: { animeId, episodeId, currentTime, watchedOn: new Date() , episodeNumber} } }
                ).then(result => {
                    return res.status(200).json({ success: true, message: 'Watched episode added successfully' });
                }).catch(err => {
                    return res.status(500).json({ success: false, message: err.message });
                });
            }
        });
    } catch (e) {
        console.log(e.message);
        res.status(500).send({ success: false, message: e.message });
    }
});

app.get('/user/:userId/episode/:episodeId', async (req, res) => {
    try {
        const {userId, episodeId} = req.params
        console.log('Get User Watched Episode', episodeId, userId)
        const user = await Users.findById(userId);
        if (!user) {
            return res.status(404).send({success: false, message: 'User not found'});
        }
        const episode = user.watchedEpisodes.find(episode => {
            console.log(episode.episodeId, episodeId)
            return episode.episodeId.toString() === episodeId
        })

        if (!episode) {
            return res.status(404).send({success: false, message: 'Episode not found'});
        }
        res.status(200).json({success: true, episode})
    } catch (e) {
        console.log(e.message)
        res.status(500).send({success: false, message: e.message});
    }
})
// Get User History
app.get('/user/:userId/history', async (req, res) => {
    try {
        const {userId} = req.params

        Users.findById(userId).populate({
            path: 'watchedEpisodes.episodeId',
            select: 'image_thumb _id title duration'
        }).populate({
            path: 'watchedEpisodes.animeId',
            select: 'id title'
        }).then(historyList => {
            console.log(historyList)
            if (!historyList) {
                return res.status(404).send({success: false, message: 'User not found'});
            }
            res.status(200).json({success: true, list: historyList.watchedEpisodes})
        })
    } catch (e) {
        console.log(e.message)
        res.status(500).send({success: false, message: e.message});
    }
})
// Get Random anime
app.get('/randomAnime', async (req, res) => {
    try {
        const randomAnime = await Anime.aggregate([{$sample: {size: 1}}]);
        if (randomAnime && randomAnime.length) {
            res.json(randomAnime[0])
        } else {
            res.status(404).json({message: 'Anime not found'})
        }
    } catch (e) {
        console.error('Error fetching random anime', e)
        res.status(500).send({'Internal server error': e.message});
    }
})
// Get User Watchlist
app.get('/user/:userId/watchlist', async (req, res) => {

    try {
        const {userId} = req.params

        Users.findById(userId).populate({
                path: 'watchlist',
                select: '-episodes'
            }
        ).then(user => {

            res.status(200).json(user.watchlist)
        }).catch(err => {
            console.log(err.message)
            res.status(500)
        })
    } catch (e) {
        console.log(e.message)
        res.status(500).send({success: false, message: e.message});
    }
})
// update User watchlist
app.post('/update/user/watchlist', async (req, res) => {
    try {
        const {animeId, userId} = req.body;

        console.log('here',req)

        Anime.findById(animeId).then(anime => {
            if (!anime) {
                return res.status(400).json({message: 'Anime not found'})
            }else{
                console.log('anime', anime)
                Users.findByIdAndUpdate(userId, {$push: {watchlist: anime._id}}).then(result => {


                    return res.status(200).json({ success: true, message: 'Watchlist updated successfully' });
                }).catch(err => {
                    console.log(err)
                    return res.status(500).json({ success: false, message: err.message });
                })
            }

        })

    } catch (e) {
        console.log(e.message)
        res.status(500).send({success: false, message: e.message});
    }
})
app.post('/remove/user/watchlist', async (req, res) => {
    const {animeId, userId} = req.body;

    console.log(userId, animeId)
    try{
        const user = await Users.findById(userId)
        if(!user){
            return res.status(400).json({message: 'User not found'})
        }

        console.log(user.watchlist, animeId, userId)

        const index = user.watchlist.indexOf(animeId)
        if(index > -1){
            user.watchlist.splice(index, 1)
        }

        await user.save()
        res.status(200).json({success: true, message: 'Watchlist updated successfully'})
    }
    catch(e){
        console.log(e.message)
        res.status(500).send({success: false, message: e.message});
    }
})

module.exports = app