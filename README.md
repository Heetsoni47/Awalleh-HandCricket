# Awalleh Competition

Real-time multiplayer hand cricket for friends. 1v1 up to 5v5, limited overs or four-innings tests, best-of series, permanent career stats, live chat, background music and an opening animation. Runs on the free Firebase Spark plan and GitHub Pages, no paid services.

## Get it online in 15 minutes

### 1. Firebase (already done)

The app is connected to the free Firebase project **awalleh-competition** (Spark plan, $0/month):

- Authentication: Email/Password enabled
- Realtime Database: Singapore (asia-southeast1), rules from `database.rules.json` published
- Firestore: Mumbai (asia-south1), rules from `firestore.rules` published
- Web app config is already in `src/firebaseConfig.js`

If you ever change the rules files, paste them again in the console under each database's **Rules** tab.

### 2. Add your music (optional)

Put your MP3 at `public/music/bole-jo-koyal.mp3`. It loops quietly after players tap **Enter** on the opening screen, and anyone can switch it off with the music button in the top bar. Without the file the app works normally and the music button stays hidden.

A popular film song is copyrighted, and a GitHub repo hosting it can get a takedown notice. Pages from a private repo needs a paid GitHub plan, and the site itself is public either way, so keep that in mind when choosing what to upload.

### 3. Put it on GitHub

1. Create a new repository on [github.com/new](https://github.com/new), for example `awalleh-competition`
2. Upload the project: either drag the unzipped folder's contents into the repo's **Add file → Upload files** page, or from a terminal:
   ```bash
   cd awalleh-competition
   git init && git add . && git commit -m "Awalleh Competition"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/awalleh-competition.git
   git push -u origin main
   ```
   The hidden `.github` folder must be included. Drag-and-drop in some browsers skips hidden folders, so check it appears in the repo
3. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**
4. Open the **Actions** tab and wait for the green tick (about a minute). If it ran before you changed the Pages setting, click the workflow and **Re-run**
5. Your site is live at `https://YOUR-USERNAME.github.io/awalleh-competition/`

### 4. Let Firebase accept your site

Firebase → **Authentication → Settings → Authorized domains → Add domain** → `YOUR-USERNAME.github.io`

### 5. Play

Share the link. Everyone signs up with a username and password, the host taps **New room** and copies the invite link (it looks like `…/#/room/K7QM2X`), and friends join from that link or by typing the code.

Every push to `main` rebuilds and redeploys the site automatically.

## Run it on your computer (optional)

```bash
npm install
npm run dev
```

Picks are hashed with `crypto.subtle`, which only works on `https://` or `localhost`. Testing on a phone over Wi-Fi with your computer's IP won't work; use the GitHub Pages link instead.

## Features

- **Accounts and careers**: matches, wins, losses, ties, win %, player of the match and series; batting (innings, runs, not outs, average, strike rate, highest score, balls, 4s, 6s, 30s, 50s, 100s, ducks, golden ducks, diamond ducks, dots); bowling (innings, overs, balls, runs, wickets, average, economy, strike rate, best figures, maidens, 3W and 5W hauls, dots)
- **Rooms**: 6-character code, invite link, 1v1 to 5v5, teams with captains and custom names, auto-balance, spectators
- **Host settings**: 2 to 5 overs, limited overs or 4-innings test with lead/trail, single match or best of 3, 5 or 7
- **Gameplay**: hidden simultaneous picks with a 3-2-1 reveal, odd/even toss, batting order and bowler selection (no back-to-back overs), super over on a tie, 10-second shot clock with auto-pick, auto-reconnect into the live ball
- **Around the match**: ball-by-ball commentary, over tracker, chase equation bar, head-to-head banner, MVP podium, full scorecards and history, leaderboards (orange cap, purple cap, strike rate, hall of shame), achievement badges, emoji reactions and quick taunts
- **Chat**: All chat and private Team chat with unread counts, automatic match announcements; a sidebar on desktop and a slide-up drawer on mobile
- **Sound**: synthesised bat, stumps, crowd and duck sounds with a mute button, plus the background music track

## Folder structure

```
awalleh-competition/
├── .github/workflows/deploy.yml   Builds and publishes to GitHub Pages on every push
├── database.rules.json            Realtime Database rules
├── firestore.rules                Firestore rules
├── public/music/                  Put bole-jo-koyal.mp3 here
└── src/
    ├── firebaseConfig.js          Your Firebase keys go here
    ├── appInfo.js                 App name
    ├── lib/
    │   ├── engine.js              Match engine: toss, innings, overs, super over, 4 innings, series, MVP
    │   ├── stats.js               Career stats, match stat lines, badges
    │   ├── rooms.js               Rooms, teams, settings, game transactions, chat, reactions
    │   ├── matchSave.js           Scorecards, careers, head-to-head, leaderboards
    │   ├── commentary.js, sounds.js, music.js, crypto.js, time.js
    ├── context/                   Auth and live room state
    ├── hooks/useBallEngine.js     Hidden pick → reveal → resolve, shot clock
    └── components/
        ├── Intro.jsx              Opening animation
        ├── auth, home, lobby, arena, results, profile, leaderboard, history, chat, players
```

## How it works

| Store | Path | What lives there |
| --- | --- | --- |
| Realtime Database | `rooms/{code}/meta, settings, players, teams` | Lobby and presence |
| Realtime Database | `rooms/{code}/game` | The live match, changed only through transactions |
| Realtime Database | `rooms/{code}/ball/{seq}/commit` then `/reveal` | Hidden picks: a hash first, the number only after both lock in |
| Realtime Database | `rooms/{code}/chat/all`, `chat/A`, `chat/B` | Chat; team chats are readable only by that team |
| Firestore | `users/{uid}` | Profile, career stats, badges |
| Firestore | `matches/{id}` | Full scorecards |
| Firestore | `h2h/{batter}_{bowler}` | Career head-to-head |

A ball is applied exactly once inside a database transaction, even when several players' browsers try at the same moment. When a match ends, each player's browser adds their own line to their career; anyone offline at full time gets it the next time they sign in. Super overs don't count towards careers.

## Limits worth knowing

- Any player in a room can technically edit the match data. Fine among friends; making it tamper-proof needs Cloud Functions on the paid plan
- The free plan allows 100 people connected at once and 50,000 profile reads a day, which is plenty for a friend group

---

Interface design guided by unslop by Damir Sokolovsky ([@heydamir](https://x.com/heydamir)), CC BY 4.0.
