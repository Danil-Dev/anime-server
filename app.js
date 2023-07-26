
const express = require('express')
const dbConnect = require("./db/dbConnect");

const app = express()

//execute database connection
dbConnect()

//Models
const Anime = require('./db/AnimeModel')

// Setup
app.use(express.json())
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


// app.use(bodyParser.urlencoded({extended: true}))


//routes
app.get('/',(req, res) => {
    res.send('Server is working')
})

app.post('/test/add/anime', async (req, res)=> {
    console.log(req.body)
    try{
        const animes = new Anime(req.body);
        await animes.save();
        res.send(animes);
    }catch (e) {
        console.log(e)
    }
})

//get anime
app.get('/anime/:animeId', async (req, res) => {
    try{
        console.log(req.params.id)
        const anime = await Anime.find({'id': req.params.animeId})
        console.log(anime)
        if (!anime){
            return res.status(404).send({message: 'Anime with this id not found'})
        }
        console.log(anime[0])
        res.send(anime[0])
    }
    catch (e) {
        console.log(e)
        res.status(500).send({ message: e.message });
    }
})

// get episode
app.get('/anime/:animeId/season/:seasonNumber/episode/:episodeNumber', async (req, res) => {
    try {
        const anime = await Anime.findById(req.params.animeId);
        if (!anime) {
            return res.status(404).send({ message: 'Anime not found' });
        }
        const season = anime.seasons.find(season => {
            console.log(season.season_number, req.params)
            return season.season_number == req.params.seasonNumber
        });
        if (!season) {
            return res.status(404).send({ message: 'Season not found' });
        }
        const episode = season.episodes.find(episode => episode.episode_number == req.params.episodeNumber);
        if (!episode) {
            return res.status(404).send({ message: 'Episode not found' });
        }
        res.send(episode);
    }
    catch (e){
        console.log(e)
        res.status(500).send({ message: e.message });
    }
})

app.post('/add/anime', (req, res) => {
    // console.log(req)
    try{
        const newAnime = new Anime({
            title: req.body.title,
            description: req.body.description,
            image: req.body.image,
            categories: req.body.categories
        })
        newAnime.save().then(result => {
            res.status(201).send({
                message: "Anime Created Successfully.",
                success: true,
                result,
            })
        }).catch( error => {
            console.log(error)
            res.status(500).send({
                message: 'Error creating Anime.',
                success: false,
                error
            })
        })
    }
    catch (e){
        console.log(e)
    }
})

app.get('/all_anime', (req, res) => {
    // console.log(req.body)
    Anime.find({}).select('-seasons').then( all_anime => {
        res.status(200).json(all_anime)
    }).catch(err => {
        console.log(err)
        res.status(500)
    })
})

// fetch('http://localhost:3301/add/anime',{
//     method: 'POST',
//     headers: {
//         'Content-type': 'application/json'
//     },
//     body: JSON.stringify({
//         title: "Women's Day",
//         description: "content",
//         image: "img/poster/ucm_poster01.jpg",
//         categories: "Cat1"
//     }),
// })

module.exports = app