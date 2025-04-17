

## For start
- install nodejs --lts version
  ```
    # Download and install nvm:
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
    # in lieu of restarting the shell
    \. "$HOME/.nvm/nvm.sh"
    # Download and install Node.js:
    nvm install --lts
    # Verify the Node.js version:
    node -v # Should print "v22.14.0".
    nvm current # Should print "v22.14.0".
    # Verify npm version:
    npm -v # Should print "10.9.2". 
  ```
- `https://github.com/axbuglak/steam-view.git`
- `cd steam-view`
- `npm i`
- Fill in the .env file as in .env.example
- `node main.js`
