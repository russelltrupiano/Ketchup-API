Ketchup-API
=================

The Ketchup API makes heavy use of the [TVRage API](http://services.tvrage.com/info.php?page=main) when using show and episode ids.

Backend web server for the [Ketchup mobile application](https://www.github.com/russelltrupiano/Ketchup). The base url for all requests are http://www.ketchuptv.me/api/v1

### API Routes 

#####```POST /signup``` 
Create a new user. Parameters are ```email``` and ```password```

#####```POST /login``` 
Login the user. Parameters are ```email``` and ```password```

#####```POST /logout```
Logout the user

#####```GET /:user_id/shows```
Get all subscribed shows for a user

#####```GET /:user_id/shows/:show_id```
Get a particular subscribed show for a user

#####```GET /:user_id/shows/:show_id/episodes```
Get all episodes for a subscribed show for a user

#####```GET /:user_id/shows/:show_id/episodes/:episode_id```
Get a particular episode from a subscribed show for a user

#####```GET /:user_id/episodes```
Get all unwatched episodes for a user

#####```POST /:user_id/shows```
Add a show to a user's subscription list. Parameters are ```show_id```

#####```POST /:user_id/episodes```
Add an episode to the user's unwatched queue. Parameters are ```episode_id```
