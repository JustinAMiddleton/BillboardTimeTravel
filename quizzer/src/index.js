import $ from "jquery";
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import secrets from './secrets.js';

// https://levelup.gitconnected.com/how-to-build-a-spotify-player-with-react-in-15-minutes-7e01991bc4b6
// Get the hash of the url
const hash = window.location.hash
  .substring(1)
  .split("&")
  .reduce(function(initial, item) {
    if (item) {
      var parts = item.split("=");
      initial[parts[0]] = decodeURIComponent(parts[1]);
    }
    return initial;
  }, {});
const auth = {
  'Authorization': 'Bearer ' + hash.access_token
}
window.location.hash = "";

class Login extends React.Component {
  render() {
    let auth_url = 'https://accounts.spotify.com/authorize?client_id=' + secrets.client_id +
      '&redirect_uri=' + encodeURIComponent(secrets.redirect_uri) +
      '&scope=' + encodeURIComponent(
                    "streaming,user-read-playback-state," +
                    "user-read-email,user-read-private," +
                    "playlist-read-collaborative") +
      '&response_type=token&show_dialog=true'
    return (
    <a 
      className="btn btn--loginApp-link"
      href={auth_url}
    >
      Login to Spotify
    </a>)
  }
}


window.onSpotifyWebPlaybackSDKReady = () => {
  if (hash.access_token) {   
    setupPlayer().then(player => {
      if (player) {
        ReactDOM.render(
          <Quiz player={player} />,
          document.getElementById('root')
        );    
      } else {
        // When failure...
      }
    });
  }
};

function setupPlayer() {
  const player = new window.Spotify.Player({
    name: 'Web Playback SDK Quick Start Player',
    getOAuthToken: cb => { cb(hash.access_token); },
    volume: .33
  });

  // Error handling
  player.addListener('initialization_error', ({ message }) => { console.error(message); });
  player.addListener('authentication_error', ({ message }) => { console.error(message); });
  player.addListener('account_error', ({ message }) => { console.error(message); });
  player.addListener('playback_error', ({ message }) => { console.error(message); });
  player.addListener('player_state_changed', state => { console.log(state); });
  player.addListener('ready', ({ device_id }) => {
    console.log('Ready with Device ID', device_id);
  });
  player.addListener('not_ready', ({ device_id }) => {
    console.log('Device ID has gone offline', device_id);
  });

  // Connect to the player!
  return player.connect().then(success => {
    return success ? player : null;
  })
}

class Quiz extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      index: -1,
      song: "",
      artist: "",
    }

    this.onSubmit = this.onSubmit.bind(this)
    this.onChange = this.onChange.bind(this)
    this.renderMenu = this.renderMenu.bind(this)
  }

  onChange(event) {
    let newstate = Object.assign({}, this.state)
    newstate[event.target.name] = event.target.value 
    this.setState(newstate)
  }

  onSubmit(event) {
    event.preventDefault()
    this.props.player.togglePlay()

    console.log(this.state.song)
    console.log(this.state.playlist[this.state.index].track.name.toLowerCase())
    console.log(this.state.playlist.slice(0, 5).map(x => x.track.name)) 
    console.log(this.state.index)


    let reaction = "";
    if (this.state.song.toLowerCase() === 
        this.state.playlist[this.state.index].track.name.toLowerCase()) {
      reaction += "Song correct! "
    } else {
      reaction += "Song incorrect! "
    }

    ReactDOM.render(
      <span>{reaction}</span>,
      document.getElementById("answer")
    )
  }

  async getplaylist(playlist_name, url) {
    url = url || `https://api.spotify.com/v1/me/playlists`
    const response = await $.ajax({
      url: url,
      headers: auth
    });
    let playlist = response.items.find(playlist_1 => playlist_1.name === playlist_name);
    
    if (playlist)
      return playlist;
    else if (response.next)
      return this.getplaylist(playlist_name, response.next);
    else
      return null;
  }

  shufflePlaylist(playlist) {
    // I don't want to queue things up, just shuffle.
    let shuffled = []
    let unshuffled = playlist.items.slice()
    while (unshuffled.length > 0) {
      let rand = Math.floor(Math.random() * unshuffled.length)
      shuffled.push(unshuffled[rand])
      unshuffled.splice(rand, 1)
    }

    return shuffled
  }

  async play({
    spotify_uri,
    playerInstance: {
      _options: {
        // getOAuthToken,
        id
      }
    }
  }) {
    try {
      await $.ajax({
        url: `https://api.spotify.com/v1/me/player/play?device_id=${id}`,
        type: 'PUT',
        data: JSON.stringify({ uris: [spotify_uri] }),
        headers: { 
          ...auth,
          'Content-Type': 'application/json'
        }
      });
    }
    catch (error) {
      console.log(error);
    }
  }

  async playnext() {
    let newstate = { ...this.state };
    newstate.index += 1;
    await this.play({
      playerInstance: this.props.player,
      spotify_uri: this.state.playlist[newstate.index].track.uri,
    });
    this.setState(newstate);
  }

  renderMenu() {    
    this.getplaylist("Quizzable").then(result => {
      return $.ajax({
        url: `https://api.spotify.com/v1/playlists/${result.id}/tracks`,
        headers: auth
      })
    }).then(result => {
      return this.setState({
        playlist: this.shufflePlaylist(result),
        index: -1,
        song: "",
        artist: "",
      }, this.playnext)
    }).catch(err => {
      console.log(err)
    })
  }

  render() {
    if (this.state.index === -1)
      return (
        <button id="start" onClick={this.renderMenu}>
          Start the Quiz!
        </button>
      )
    else 
      return (
        <Song onChange={this.onChange} onSubmit={this.onSubmit} />
      )
  }
}

function Song(props) {
  return (<div><form onSubmit={props.onSubmit}>
    <label>
      Song Artist:
      <input type="text" name="artist" onChange={props.onChange} />
    </label>
    <label>
      Song Title:
      <input type="text" name="song" onChange={props.onChange} />
    </label>
    <input type="submit" value="Submit" />
    </form><div id="answer"></div></div>)
}

if (!hash.access_token) 
  ReactDOM.render(<Login />, document.getElementById("root"))