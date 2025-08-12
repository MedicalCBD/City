# deployment guide for render

this guide will help you deploy the pengstrike multiplayer game to render.

## step 1: prepare your repository

make sure all files are committed to your git repository:

```bash
git add .
git commit -m "prepare for render deployment"
git push origin main
```

## step 2: deploy to render

1. go to [render.com](https://render.com) and sign up/login
2. click "new" and select "web service"
3. connect your github repository
4. configure the service:
   - **name**: pengstrike-multiplayer
   - **environment**: node
   - **build command**: `npm install`
   - **start command**: `npm start`
   - **plan**: free

5. click "create web service"

## step 3: wait for deployment

render will automatically:
- install dependencies
- build your application
- start the server
- provide you with a public url

## step 4: test the deployment

once deployed, you can:
- visit the main url to see the welcome page
- click "enter the city" to go to the city
- click "go to pengstrike multiplayer" to start the game
- share the url with friends so they can join

## step 5: share with friends

your friends can now join by:
1. opening the render url you received
2. clicking "enter the city"
3. clicking "go to pengstrike multiplayer"
4. they'll automatically connect to the multiplayer server

## troubleshooting

if you encounter issues:

1. **websocket connection fails**: make sure render supports websockets (it should)
2. **static files not loading**: check that all three.js files are in the repository
3. **port issues**: the server automatically uses the port provided by render

## notes

- the free plan has limitations but should work fine for testing
- the server will automatically restart if it crashes
- you can view logs in the render dashboard
- the game supports multiple players simultaneously
