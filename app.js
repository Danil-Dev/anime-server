const express = require('express');
const dbConnect = require('./db/dbConnect');
const app = express();
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)
// Execute database connection
dbConnect();

// Models
const Anime = require('./db/AnimeModel');
const Users = require('./db/UserModel');
const Episodes = require('./db/EpisodeModel');
const Categories = require('./db/CategoryModel');
const Genres = require('./db/GenresModel');
const Audio = require('./db/AudioModel');
const Studio = require('./db/StudioModel')
const Comment = require('./db/CommentModel')



const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require("mongoose");

// Setup
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'public')));

// Set headers for CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    next();
});

// Routes
app.get('/', (req, res) => {
    res.send('Server is working');
});

// app.get('/test/send/mail', async (req, res) => {
//
//     try{
//         const msg = {
//             to: 'aniverse.ukraine@gmail.com', // Change to your recipient
//             from: 'help@aniverse.com.ua', // Change to your verified sender
//             subject: 'Sending with SendGrid is Fun',
//             text: 'and easy to do anywhere, even with Node.js',
//             html: '<strong>and easy to do anywhere, even with Node.js</strong>',
//         }
//
//         const send = await sgMail.send(msg)
//
//         console.log(send)
//         res.status(200).json(send)
//     }
//     catch (e){
//         console.log(e)
//         res.status(500).json({message: e.message})
//     }
//
// })
app.post('/auth/reset-password/request', async (req, res) => {
    const { email } = req.body

    try{

        // Проверяем, существует ли пользователь с таким email
        const user = await Users.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'Користувач з таким email не знайдений.' });
        }
        const resetPasswordToken = crypto.randomBytes(20).toString('hex')
        const resetPasswordExpires = Date.now() + 3600000

        await Users.findOneAndUpdate({ email }, {
            resetPasswordToken,
            resetPasswordExpires
        })

        const msg = {
            to: email, // Change to your recipient
            from: 'help@aniverse.com.ua', // Change to your verified sender
            subject: 'Скидання пароля на сайті | Aniverse',
            text: `Ви отримали цей лист, тому що ви (або хтось інший) запросили скидання пароля для вашого облікового запису.\n\n`+
            `Будь ласка, перейдіть за наступним посиланням, або скопіюйте його в адресний рядок браузера, щоб завершити процес:\n\n`+
            `https://aniverse.com.ua/auth/reset-password/reset/${resetPasswordToken}\n\n`+
            `Якщо ви не запитували скидання пароля, проігноруйте цей лист і ваш пароль залишиться колишнім.\n`,
            // html: '<strong>and easy to do anywhere, even with Node.js</strong>',
        }

        const send = await sgMail.send(msg)
        if (send[0]['statusCode'] === 202){
            res.status(202).json({message: 'Інструкції зі скидання пароля було надіслано на email.'})
        }
        else{
            res.status(500).json({ message: 'Помилка сервера під час запиту на скидання пароля.'})
        }
    }catch (e) {
        console.log(e)
        res.status(500).json({ message: e.message})
    }
})

app.post('/auth/reset-password/reset', async (req, res) => {
    const {resetPasswordToken, newPassword} = req.body

    try{
        const user = await Users.findOne({
            resetPasswordToken,
            resetPasswordExpires: { $gt: Date.now() }
        })


        if (!user) {
            return res.status(400).json({message : 'Токен скидання пароля недійсний або його термін дії закінчився.'})
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await Users.findByIdAndUpdate(user._id, {
            password: hashedPassword,
            resetPasswordToken: undefined,
            resetPasswordExpires: undefined
        })

        res.status(200).json({ message: 'Пароль успішно скинуто.'})

    }catch (e) {
        console.log(e)
        res.status(500).json({ message: e.message})
    }
})

app.get('/parse/anime', async (req, res) => {
    try{
        const animeList = await Anime.find({}).select('anilistId id -_id')


        const enhancedAnimeList = animeList.map((anime) => {
            return {
                ...anime.toObject(),
                link: `https://aniverse.com.ua/anime/${anime.id}`
            }
        })

        console.log(enhancedAnimeList)

        res.status(200).json(enhancedAnimeList)
    } catch (e) {
        console.log(e)
        res.status(500).json({ message: 'Server Error'})
    }
})

// Search anime
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
        }).populate('genres').select('-episodes');
        res.status(200).json(animeList);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Get Catalog
app.post('/anime/catalog', async (req, res) => {
    try {
        const { genres } = req.body;
        if (genres) {
            const animeList = await Anime.find({
                genre: { $in: genres }
            }).select('-episodes');
            res.json(animeList);
        } else {
            const animeList = await Anime.find({}).select('-episodes');
            res.json(animeList);
        }
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Get Genre
app.get('/anime/genre/:genreId', async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1;
        const perPage = 8;
        const skip = (page - 1) * perPage;


        const genreId = req.params.genreId;

        const genre = await Genres.findOne({name: genreId})
        console.log('Genre', genre)
        if (!genre){
            return res.status(404).send('Genre not found');
        }

        const animeList = await Anime.find({
            genres: { $in: genre._id }
        }).select('-episodes').skip(skip).limit(perPage);
        res.json(animeList);
    } catch (e) {

        console.log(e)
        res.status(500).send('Server Error');
    }
});

// Get Catalog category
app.get('/anime/catalog/:item', async (req, res) => {
    try {
        const item = req.params.item;

        const page = parseInt(req.query.page) || 1;
        const perPage = 8;
        const skip = (page - 1) * perPage;

        console.log(item)
        if (item === 'all') {
            const animeList = await Anime.find({}).select('-episodes').skip(skip).limit(perPage);
            res.json(animeList);
        } else {

            // Сначала находим ObjectId категории по ее имени
            const category = await Categories.findOne({ name: item });
            if (!category) {
                return res.status(404).send('Category not found');
            }
            const animeList = await Anime.find({
                categories: { $in: [category._id] }
            }).select('-episodes').skip(skip).limit(perPage);

            res.json(animeList);
        }
    } catch (err) {


        console.log(err)
        res.status(500).send('Server Error');
    }
});

app.get('/anime/audio/:audioId', async (req, res) => {
    try{
        const audioId = req.params.audioId

        const audio = await Audio.findOne({name: audioId})

        if (!audio) {
            return res.status(404).send('Audio not found');
        }

        const animeList = await Anime.find({
            audios: { $in: [audio._id] }
        }).select('-episodes');

        res.status(200).json(animeList)

        console.log(audioId)

        res.status(200)
    }catch (e){

    }
})

// Add Anime
app.post('/add/anime', async (req, res) => {
    try {
        const {
            title,
            id,
            description,
            image,
            genres,
            release_date,
            rating,
            categories,
            studio,
            audios,
            anilistId
        } = req.body;

        const studioObj = await Studio.findOne({id: studio})

        console.log(studioObj)
        let studioId = studioObj ? studioObj._id : null
        if (!studioObj){
            const newStudio = new Studio({
                title: studio.charAt(0).toUpperCase() + studio.slice(1),
                id: studio,
                link: '#'
            })

            const savedStudio = await newStudio.save()

            studioId = savedStudio._id

        }

        const newAnime = new Anime({
            title,
            id,
            description,
            image,
            genres,
            release_date,
            rating,
            categories,
            studio: studioId,
            audios,
            anilistId

        });
        if (req.body.episodes) {
            newAnime.episodes = req.body.episodes;
        }


        const savedAnime = await newAnime.save();
        res.json(savedAnime);
    } catch (err) {

        console.log(err)
        res.status(500).json({ error: err.message });
    }
});

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
        const episode = new Episodes({ episode_number, title, date, description, video, intro, end, image_thumb, anime: anime._id });
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
app.get('/anime/:animeId/:userId', async (req, res) => {

    const { animeId, userId } = req.params;

    // Join queries
    const [anime, user] = await Promise.all([
        Anime.findOne({ 'id': animeId }).lean(),
        Users.findById(userId).lean()
    ]);

    if (!anime) {
        return res.status(404).json({ message: 'Anime not found' });
    }

    const isInWatchlist = user.watchlist.includes(anime._id);

    const lastWatchedEpisode = user.watchedEpisodes
        .filter(ep => ep.animeId.toString() === anime._id.toString())
        .sort((a, b) => b.watchedOn - a.watchedOn)[0];

    res.json({ isInWatchlist, lastWatchedEpisode });

});

// Get Anime
app.get('/anime/:animeId', async (req, res) => {
    try {
        const anime = await Anime.findOne({ 'id': req.params.animeId })
        if (!anime) {
            return res.status(404).send({ message: 'Anime with this id not found' });
        }
        res.status(200).send(anime);
    } catch (e) {
        console.log(e.message);
        res.status(500).send({ message: e.message });
    }
});

// Get Anime Lists
app.post('/get/anime/lists', async (req, res) => {
    const { animeLists } = req.body;

    console.log(animeLists)
    try {
        const facetStages = animeLists.map(list => ({
            [list]: [
                {
                    $lookup: {
                        from: 'genres', // Замените 'genres' на имя вашей коллекции жанров
                        localField: 'genres',
                        foreignField: '_id',
                        as: 'genreDocs'
                    }
                },
                {
                    $lookup: {
                        from: 'categories', // Замените 'categories' на имя вашей коллекции категорий
                        localField: 'categories',
                        foreignField: '_id',
                        as: 'categoryDocs'
                    }
                },
                {
                    $match: {
                        $or: [
                            { 'genreDocs.name': { $in: [list] } },
                            { 'categoryDocs.name': { $in: [list] } }
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
        ];
        const lists = await Anime.aggregate(aggregationPipeline);
        res.status(200).json(lists[0]);
    } catch (e) {
        console.log(e.message);
        res.status(500).send({ message: e.message });
    }
});

// Get Episode
app.post('/get/episode', async (req, res) => {
    const { animeId, episodeNumber } = req.body;


    console.log(animeId, episodeNumber)
    try {
        const anime = await Anime.findOne({
            'id': animeId
        });

        console.log( anime)
        if (!anime) {
            return res.status(404).send({ message: 'Anime with this id not found' });
        }
        const episode = await Episodes.findOne({ 'anime': anime._id, 'episode_number': episodeNumber });
        console.log(episode)
        console.log(anime._id, episodeNumber)
        if (!episode) {
            return res.status(404).send({ message: 'Episode with this id not found' });
        }
        const prevEpisode = await Episodes
            .findOne({ 'anime': anime._id, 'episode_number': { $lt: episode.episode_number } })
            .sort('-episode_number')
            .select('episode_number title image_thumb')
            .exec();
        const nextEpisode = await Episodes
            .findOne({ 'anime': anime._id, 'episode_number': { $gt: episode.episode_number } })
            .sort('episode_number')
            .select('episode_number title image_thumb')
            .exec();
        res.status(200).json({ id: anime._id, currentEpisode: episode, prevEpisode, nextEpisode });
    } catch (e) {
        console.log(e.message);
        res.status(500).send({ message: e.message });
    }
});

//Get Anime
app.post('/get/anime', async (req, res) => {
    const {animeId, userId} = req.body;
    try{
        const anime = await Anime.findOne({'id': animeId}).populate(['studio', 'audios', 'genres']).select('-episodes')
        if (!anime) {
            return res.status(404).send({message: 'Anime with this id not found'})
        }

        if(userId){
            const user =  await Users.findById(userId).populate('watchedEpisodes.episodeId');
            const isInWatchlist = user.watchlist.includes(anime._id);



            const lastWatchedEpisode =
                user.watchedEpisodes.filter((value) => (value.animeId.toString() === anime._id.toString()))
                    .sort((a, b) => b.watchedOn - a.watchedOn)[0]


            console.log(lastWatchedEpisode)
            res.status(200).json({
                ...anime._doc,
                auth: true,
                isInWatchlist,
                lastWatchedEpisode: lastWatchedEpisode?.episodeId || null
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

//Get Episodes
app.get('/get/episodes/:animeId', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const perPage = 10;
    const skip = (page - 1) * perPage;
    const eps = await Anime.findOne({ 'id': req.params.animeId })
        .populate({
            path: 'episodes',
            options: {
                skip: skip,
                limit: perPage,
                sort: { episode_number: 1 }
            }
        });
    if (!eps) {
        return res.status(404).send({ message: 'Anime with this id not found' });
    }
    res.status(200).json(eps.episodes);
});

// Get All Anime
app.get('/all_anime', (req, res) => {
    Anime.find({}).select('-episodes').then(all_anime => {
        res.status(200).json(all_anime);
    }).catch(err => {
        console.log(err.message);
        res.status(500);
    });
});

// Auth
app.post('/auth/register', async (req, res) => {
    Users.findOne({email: req.body.email}).then(user => {
        if (user) {
            return res.status(400).json({message: 'Email already exists'})
        } else {
            const newUser = new Users({
                email: req.body.email,
                password: req.body.password,
                name: req.body.name,
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

// Login
app.post('/login', async (req, res) => {

    console.log('/login')
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


                console.log('Compare', isMatch)
                if (!isMatch) {

                    console.log('Password incorrect')
                    return res.status(400).json({password: 'Password incorrect'})
                }
                const token = jwt.sign({
                        userId: user._id,
                        userEmail: user.email
                    },
                    process.env.KEY,
                    {expiresIn: '2h'}
                )


                console.log('Token', token)

                console.log('USER', {
                    email: user.email,
                    id: user._id,
                    image: user.image,
                    name: user.name,
                    status: user.status,
                    token: `Bearer ${token}`
                })
                res.status(200).json({
                    email: user.email,
                    id: user._id,
                    image: user.image,
                    name: user.name,
                    status: user.status,
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

// Update User History
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

// Get User Watched Episode
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

        const page = parseInt(req.query.page) || 1;
        const perPage = 8;
        const skip = (page - 1) * perPage;

        // Users.findById(userId).populate({
        //     path: 'watchedEpisodes.episodeId',
        //     select: 'image_thumb _id title duration'
        // }).populate({
        //     path: 'watchedEpisodes.animeId',
        //     select: 'id title'
        // }).then(historyList => {
        //     console.log(historyList)
        //     if (!historyList) {
        //         return res.status(404).send({success: false, message: 'User not found'});
        //     }
        //
        //     const watchedEpisodesReverse = historyList.watchedEpisodes.reverse();
        //     res.status(200).json({success: true, list: watchedEpisodesReverse})
        // })

        const historyList = await Users.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(userId) } },
            { $unwind: "$watchedEpisodes" },
            { $sort: { "watchedEpisodes.watchedOn": -1 } },
            {
                $lookup: {
                    from: "episodes",
                    localField: "watchedEpisodes.episodeId",
                    foreignField: "_id",
                    as: "episodeDetails"
                }
            },
            { $unwind: "$episodeDetails" },
            // Добавляем lookup для animeId
            {
                $lookup: {
                    from: "animes", // Используйте правильное имя коллекции аниме
                    localField: "episodeDetails.anime",
                    foreignField: "_id",
                    as: "animeDetails"
                }
            },
            { $unwind: "$animeDetails" }, // Разворачиваем, если нужен объект, а не массив
            { $skip: skip },
            { $limit: perPage },
            // // Проектируем только нужные поля
            {
                $project: {
                    watchedEpisodes: {watchedOn: 1, currentTime: 1},
                    episodeDetails: { title: 1, image_thumb: 1, episode_number: 1},
                    animeDetails: { id: 1, title: 1 } // Пример проекции полей аниме
                }
            },
        ]);

        if (!historyList.length) {
            return res.status(200).send([]);
        }


        res.json( historyList );
    } catch (e) {
        console.log(e)
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

// remove User watchlist
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



// Add Category/Genre/Audio/Studio
app.post('/add/category', async (req, res) => {

    const {title, name} = req.body;

    try {
        const newCategory = new Categories({
            title,
            name
        });
        const savedCategory = await newCategory.save();
        res.json(savedCategory);
    } catch (e){
        res.status(500).send({message: e.message});
    }

});

app.post('/add/genre', async (req, res) => {

        const {title, name} = req.body;

        try {
            const newGenre = new Genres({
                title,
                name
            });
            const savedGenre = await newGenre.save();
            res.json(savedGenre);
        } catch (e){
            res.status(500).send({message: e.message});
        }

});

app.post('/add/audio', async (req, res) => {
    const {title, name, language} = req.body;

    try {
        const newAudio = new Audio({
            title,
            name,
            language
        });
        const savedAudio = await newAudio.save();
        res.json(savedAudio);
    } catch (e){
        res.status(500).send({message: e.message});
    }
});

app.post('/add/studio', async (req, res) => {
    const {title, id, link} = req.body

    try {
        const newStudio = new Studio({
            title,
            id,
            link
        })

        const savedStudio = await newStudio.save();
        res.json(savedStudio)
    } catch (e) {
        res.status(500).send({message: e.message})
    }
})

// Маршрут для получения всех жанров
app.get('/genres', async (req, res) => {
    try {
        const genres = await Genres.find(); // Используйте модель Genres для доступа к коллекции жанров

        console.log(genres)
        res.json(genres);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get('/categories', async (req, res) => {
    try {
        const categories = await Categories.find();

        console.log(categories)
        res.json(categories);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get('/audios', async (req, res) => {
    try {
        const audios = await Audio.find();

        console.log(audios)
        res.json(audios);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.post('/add/comment', async (req, res) => {
    try{
        const { user, commentType, forId, content } = req.body

        console.log(req)

        const comment = new Comment({
            user,
            commentType,
            forId,
            content
        })

        const savedComment = await comment.save()
        res.status(200).json(savedComment)
    }catch (e){
        console.log(e)
        res.status(500).send(e.message)
    }
})

// Get comments by Anime or Episode Id
app.get('/comments/:id', async (req, res) => {
    try {
        const forId = req.params.id;

        const page = parseInt(req.query.page) || 1;
        const perPage = 5;
        const skip = (page - 1) * perPage;

        const comments = await Comment.find({
            forId: forId,
        }).populate({
            path: 'user',
            select: '_id name image'
        }).sort({ date: -1 }).skip(skip).limit(perPage);

        res.status(200).json(comments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Change Password
app.post('/user/changePassword', async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;
    const accessToken = req.headers.authorization

    if(!accessToken){
        return res.status(403).json({message: 'Not allowed'});
    }
    let decodedToken;
    try{
        decodedToken = jwt.verify(accessToken.split(' ')[1], process.env.KEY);
    } catch(err) {
        return res.status(403).json({message: 'Token is invalid or expired'});
    }

    if(decodedToken.userId !== userId){
        return res.status(403).json({message: 'Token does not match the userId'});
    }



    try{
        // Transform plaintext pw into hash and compare it with stored password
        const userDB = await Users.findById(userId);

        if(!userDB) {
            return res.status(404).json({message: 'User not found'});
        }

        const isMatchingPassword = await bcrypt.compare(currentPassword, userDB.password);

        if (!isMatchingPassword) {
            return res.status(400).json({ message: 'Current password is wrong' });
        }

        // Transform new password into hash and save it
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        userDB.password = newPasswordHash;
        await userDB.save();
        return res.status(200).json('Password successfully changed');
    } catch (e) {
        res.status(500).json({ error: e.message });
    }

});


module.exports = app

