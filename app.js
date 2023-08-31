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
                $regex: new RegExp(query, 'i') // 'i' делает поиск нечувствительным к регистру
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

        console.log(genre)

        console.log('Get Category', genre)

        const animeList = await Anime.find({
            genre: {$in: genre}
        }).select('-episodes').limit(10)

        res.json(animeList)
    } catch (e) {
        console.log(e.message)
        res.status(500).send('Server Error');
    }
})

// Get Catalog category
app.get('/anime/catalog/:item', async (req, res) => {
    try {
        const item = req.params.item

        console.log(item)

        if (item === 'all') {

            console.log('send all anime')
            const animeList = await Anime.find({}).select('-episodes')

            console.log(animeList)

            res.json(animeList)
        } else {
            const animeList = await Anime.find({
                categories: {$in: item}
            }).select('-episodes')

            res.json(animeList);
        }
    } catch (err) {
        console.log(err.message)
        res.status(500).send('Server Error');
    }
})


// app.use(bodyParser.urlencoded({extended: true}))


//routes
app.get('/', (req, res) => {
    res.send('Server is working')
})


//Add Anime
app.post('/add/anime', async (req, res) => {
    console.log(req.body)
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
            rating, categories
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

        // Создайте новый объект Episode
        const episode = new Episodes({ episode_number, title, date, description, video, intro, end, image_thumb });
        await episode.save();

        // Добавьте идентификатор нового эпизода в массив episodes объекта Anime
        anime.episodes.push(episode._id);

        await anime.save();

        res.status(200).send('Episode added successfully');

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get User Data
app.get(`/anime/:animeId/:userId`, async (req, res) => {
    const { animeId, userId } = req.params;

    console.log(animeId, userId)
    const anime = await Anime.findOne({'id': animeId});
    if (!anime) {
        return res.status(404).send({message: 'Anime with this id not found'})
    }

    const user =  await Users.findById(userId);

    console.log(user)


    const isInWatchlist = user.watchlist.includes(anime._id);
    const lastWatchedEpisode =
        user.watchedEpisodes.filter((value) => (value.animeId.toString() === anime._id.toString()))
            .sort((a, b) => b.watchedOn - a.watchedOn)[0]
    console.log(lastWatchedEpisode)



    res.status(200).send({isInWatchlist, lastWatchedEpisode: lastWatchedEpisode?.episodeNumber || 0})
})

// Get Anime
app.get('/anime/:animeId', async (req, res) => {
    try {
        console.log(req.params.animeId)  // Исправлено на animeId
        const anime = await Anime.findOne({'id': req.params.animeId}).populate('episodes')
        console.log(anime)
        if (!anime) {
            return res.status(404).send({message: 'Anime with this id not found'})
        }
        res.send(anime)  // Теперь anime - это один документ, а не массив
    } catch (e) {
        console.log(e.message)
        res.status(500).send({message: e.message});
    }
})

app.post('/get/anime', async (req, res) => {
    const {animeId, userId} = req.body;


    console.log('Get anime ',animeId, userId)

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
            console.log(lastWatchedEpisode)
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

//Get All Anime
app.get('/all_anime', (req, res) => {
    // console.log(req.body)
    Anime.find({}).select('-episodes').then(all_anime => {
        res.status(200).json(all_anime)
    }).catch(err => {
        console.log(err.message)
        res.status(500)
    })
})
// Auth
app.post('/auth/register', async (req, res) => {
    console.log('register')
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

            console.log('check auth c', req.body)
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

        console.log(req.body)


        if (currentTime === 0) {
            return res.status(400).json({ success: false, message: 'Current time is 0' });
        }



        // Поиск пользователя с указанным userId и проверка на наличие просмотренного эпизода с episodeId
        Users.findOne({ _id: userId, "watchedEpisodes.episodeId": episodeId }).then(user => {
            console.log(user)
            if (user) {
                // Обновление записи о просмотре
                Users.updateOne(
                    { _id: userId, "watchedEpisodes.episodeId": episodeId },
                    { $set: { "watchedEpisodes.$.currentTime": currentTime, "watchedEpisodes.$.watchedOn": new Date() } }
                ).then(result => {
                    console.log('Updated');
                    return res.status(200).json({ success: true, message: 'Watched episode updated successfully' });
                }).catch(err => {
                    return res.status(500).json({ success: false, message: err.message });
                });
            } else {
                // Добавление новой записи о просмотре
                Users.updateOne(
                    { _id: userId },
                    { $push: { watchedEpisodes: { animeId, episodeId, currentTime, watchedOn: new Date() , episodeNumber} } }
                ).then(result => {
                    console.log('Added');
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
//Get User Watched Episode
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