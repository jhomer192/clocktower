# Clocktower ST

Clocktower ST is a Storyteller tool for [Blood on the Clocktower](https://bloodontheclocktower.com/). It walks you through the night order, works out what each information role should be told, and tracks who is drunk, poisoned, protected or dead, so the grimoire bookkeeping stops living in your head.

[Open the app](https://jackhomer.com/clocktower/) — no account, nothing to install, sized for the phone in your hand while you run the game.

![The night panel on Night 3, listing the wake order with the Poisoner's target selection open](https://jackhomer.com/screenshots/clocktower.webp)

## Setting up a game

Choose a script, type the player names in seating order, then either assign roles from the dropdowns or press Randomize Roles. The app knows the standard team composition for 5 to 15 players and adjusts it for the roles that move the outsider count (Baron, Fang Gu, Vigormortis, Godfather). It won't let you start until the dealt roles match that composition, and if the Drunk or the Evil Twin is in play it asks for the cover role and the good twin first.

## Running the night

The night list is built from the roles you actually dealt, sorted by first-night or other-night order, with dead players dropped. Each step shows the role's ability text and whatever input it needs from you.

For information roles the app does the arithmetic against the live grimoire: the Chef's count of adjacent evil pairs, the Empath's evil neighbours, the Clockmaker's steps from Demon to nearest Minion, the Washerwoman / Librarian / Investigator candidate pair, the Undertaker's execution, the Fortune Teller ping. When the player being woken is drunk or poisoned, the number turns orange and the app shows you the false answer to give instead. A Drunk appears at their cover role's position in the night order, labelled so you don't forget.

Kills, protections and poisonings are staged as you work down the list and applied together when you end the night. Monk and Innkeeper protection resolves against the Demon's choice at that point, and is ignored if the protector is themselves poisoned.

## Running the day

Nominations record who nominated whom and who voted, and the votes needed to execute recalculate as the population drops. Dead players get one ghost vote, spent when you tick them onto a nomination and returned if you untick it. There's also a discussion timer, a storyteller notes field, and a summary of every status currently in play.

## The rest of it

- A players tab for alive/dead, ghost vote, poison and drunkenness with an expiry (dusk, a named night, or permanent), protection, reminder tokens drawn from the roles in play, and free-text effects.
- A timestamped log of kills, executions, nominations, votes and status changes. It survives across games, so you can settle an argument afterwards.
- Undo, which steps back through the last 20 snapshots.
- Custom scripts. Build a roleset out of the 72 official roles or write your own with ability text and night-order numbers. Rulesets save in the browser, export as JSON, and import back. The importer also reads scripts exported by `script.bloodontheclocktower.com` and the other tools that use that schema; travellers and fabled are skipped with a warning, since they don't fit the night order.
- Game state lives in `localStorage`, so closing the tab mid-game doesn't lose it.
- Four themes, and a symbol key for the status icons.

Scripts included: Trouble Brewing (22 roles), Sects & Violets (25), Bad Moon Rising (25).

## Running it locally

```bash
npm install
npm run dev
```

```bash
npm run build     # tsc -b && vite build
npm run lint
npm run preview   # serve dist/
```

## Stack

React 19, TypeScript, Vite, Tailwind. No backend and no API: the whole app is static files plus browser storage. `.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`.

Longer write-up: [jackhomer.com/projects/clocktower](https://jackhomer.com/projects/clocktower/).
