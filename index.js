const electron = require('electron')

// this app was made by creatable and relative, don't steal it you fucking retard

exports.startup = startup
exports.handleSingleInstance = alreadyExists
exports.setMainWindowVisible = () => {}
function startup() {
  const installWin = new electron.BrowserWindow({
    width: 560,
    height: 340,
    icon: `${__dirname}/logo.png`,
    transparent: true,
    resizable: false,
    backgroundColor: '#0000',
    frame: false,
    webPreferences: {
      nodeIntegration: true
    }
  })
  /*installWin.setAppDetails({
        appId: 'plugGUI',
        appIconPath: `${__dirname}/logo.ico`
    });*/
  //installWin.setMenuBarVisibility(false);
  //installWin.autoHideMenuBar = true;
  installWin.fullScreenable = false
  installWin.maximizable = false
  installWin.resizable = false
  installWin.loadFile(`${__dirname}/public/index.html`)
  setTimeout(() => {
    electron.BrowserWindow.getAllWindows().forEach(win => {
      // remove the Discord Updater window that appears
      // (or any other BrowserWindows)
      if (win.id !== installWin.id) {
        win.destroy()
      }
    })
  }, 500)
}

function alreadyExists() {
  electron.app.relaunch()
  electron.app.exit(0)
}
