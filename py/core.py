import MySQLdb
import spotipy
import spotipy.oauth2 as oauth2
import spotipy.util as util
from secrets import secrets

_conn = None
_cur = None
_token = None
_credentials = oauth2.SpotifyClientCredentials(
    client_id=secrets["SPOTIPY_CLIENT_ID"],
    client_secret=secrets["SPOTIPY_SECRET"]
)

def InitDB():
    _conn = MySQLdb.connect(host="localhost", user="root",
        passwd=secrets["HOST_PASSWORD"], db="billboard",
        use_unicode=True, charset="utf8")
    _cur = _conn.cursor()

# Defining Spotify.sp allows persistence
def Spotify():
    # Scopes here: https://developer.spotify.com/documentation/general/guides/scopes/
    if not _token or _credentials.is_token_expired(_token):
        token = util.prompt_for_user_token(secrets['SPOTIFY_USER'],
            'playlist-modify-public')
        Spotify.sp = spotipy.Spotify(auth=token,
            client_credentials_manager=_credentials)
    return Spotify.sp
Spotify.sp = None
