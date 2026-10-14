# LARP demo guide (no coding needed)

LARP helps UCL students go from "I don't know anyone" to "I'm meeting my group on Thursday".
This page is for teammates who just need to run the demo or click around it.

## What you need on your computer (one time)

1. **Python 3.11**: https://www.python.org/downloads/ . During install, tick **"Add python.exe to PATH"**.
2. **Node.js (LTS)**: https://nodejs.org . Click Next through the installer.
3. **GitHub Desktop**: https://desktop.github.com , signed in with your GitHub account.

## Get the project (one time)

1. Open GitHub Desktop, then **File → Clone repository…**, then the **URL** tab, and paste `https://github.com/ielkhatib96/larp`.
2. (If you were added as a collaborator you can also pick **larp** from the **GitHub.com** tab.)
3. For the folder, choose something simple such as `C:\dev\larp`. Avoid OneDrive folders: syncing can lock files.
4. Click **Clone**.

## Set it up (one time)

1. In GitHub Desktop, click **Repository → Show in Explorer**.
2. Double-click **`setup-first-time.bat`**. A black window installs things for a minute or two and ends with "Done".
   If it says it can't find Python or npm, install them (above), close the window, and run it again.

## Run the demo (every time)

1. Double-click **`start-demo.bat`**.
2. Two black windows open (leave them open) and your browser opens http://localhost:5173 after a few seconds.
3. To stop: close the two black windows named **LARP back end** and **LARP front end**.

Each time you run it, the practice data is reset to a clean start, so the demo is repeatable.
Anything you registered by hand is wiped, which is what you want before presenting.

## The demo path (about 3 minutes)

1. **Landing page**: the three cards (Network, Connect, Learn and get help). Click **Start the questionnaire**.
2. **Questionnaire**: click the dashed **"Demo: fill in the answers for me"** button, then **Finish**.
3. **Create account**: any name, any email (for example `you@example.com`), and a password of 8+ characters.
4. **Pairing choice**: click **Both**.
5. **My group**: members, what they share, and the suggested first event.
6. **Browse** tab: ranked people, each with a reason.
7. **Events** tab: Career, Social and Venues, with the area filter.
8. **LinkedIn** tab: **Open LinkedIn**, **Copy link**, then **Next**, repeat. We never contact LinkedIn; you connect yourself.

Practice logins if you'd rather not register: `demo.main@ucl.ac.uk` or `demo.canary@ucl.ac.uk`. Every practice account uses the password `demo1234`.

**Heads-up:** the practice LinkedIn links are placeholders, so on LinkedIn they open a "profile not found" page. That is expected.
The Canary Wharf filter on the Career tab may look empty. Use "All areas" on stage.

## If something goes wrong

| What you see | What to do |
|---|---|
| Page says "backend: offline" or "Couldn't load" | The back end window closed. Close both black windows and double-click `start-demo.bat` again. |
| `start-demo.bat` says the reset failed | Old black windows are still open. Close them all and try again. |
| "Setup has not been run" | Double-click `setup-first-time.bat` first. |
| Browser shows nothing at localhost:5173 | Wait 10 seconds and refresh. If still nothing, check the "LARP front end" window for a red error and send it to the owner. |

## Looking behind the scenes (optional)

With `start-demo.bat` running, these open in your browser:

| Address | What it is |
|---|---|
| http://localhost:8000/docs | The LARP API: a list of every route. Click one, then **Try it out**, then **Execute**. For routes that need a login, first call **POST /api/login** with `{"ucl_email": "demo.main@ucl.ac.uk", "password": "demo1234"}`, copy the `token` from the answer, click the green **Authorize** button at the top and paste it in. |
| http://localhost:8000/dev/tables | Every database table with its row count. Click a table name to see its rows (first 200). Read-only, and password hashes are hidden. |

The tables page only works on the same computer as the back end, and the data resets each time you run `start-demo.bat`.

## Editing with Claude Code (optional)

1. Open **PowerShell** and run `npm install -g @anthropic-ai/claude-code` (Node.js from the steps above is already installed).
2. In GitHub Desktop click **Repository → Open in Command Prompt** (or Open in Visual Studio Code, then **Terminal → New Terminal**).
3. Type `claude` and press Enter. The first time, it opens a browser to sign in with your Claude account.
4. Ask for changes in plain words, for example "make the landing page title bigger". Claude Code reads `CLAUDE.md` automatically, so it already knows the project rules.
5. Keep `start-demo.bat` running in its own windows to see changes live, then commit and push as below.

## Sharing changes (only if you edit files)

In GitHub Desktop: **Fetch origin** and **Pull** before you start (this gets teammates' work). After editing, tick your files, write a short summary,
click **Commit to main**, then **Push origin**. If GitHub Desktop says there are conflicts, stop and ask the owner rather than guessing.

---

## For the owner: how to share the repository

The repo is public (`https://github.com/ielkhatib96/larp`), so anyone with the link can clone and run it. No invite needed.

- To run the demo only: friends can follow "Get the project" above, or use GitHub Desktop's **File → Clone repository → URL** tab and paste the link.
- To let a friend push changes: **Settings → Collaborators → Add people**, type their GitHub username, choose **Write**, and they accept the email invite.

Things that are **not** in the repo on purpose, and what that means for friends:

- `.env` (the settings file) is private. `setup-first-time.bat` makes a safe demo version for each person. Don't send anyone your real keys.
- The database (`larp.db`) is rebuilt by `start-demo.bat`, so everyone sees the same practice students.
- Only ever share an Anthropic API key with someone you trust, privately. The demo does not need one.
