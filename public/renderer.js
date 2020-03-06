const POWERCORD_GIT_URL = 'https://github.com/powercord-org/powercord.git'
const commandExists = require('command-exists-promise'),
  installPackages = require('install-packages'),
  { execSync } = require('child_process'),
  { shell, remote } = require('electron'),
  { join } = require('path'),
  fs = require('fs'),
  os = require('os')

const $console = document.getElementById('console'),
  { writeFile, readFile, unlink } = fs.promises,
  access = fs.promises.access,
  rm = require('fs-extra').remove
  platform = process.platform
  const POWERCORD_PATH = join(os.homedir(), (platform == "darwin" | platform == "linux" ? join('.config', '.powercord') : 'powercord'))
//#region DOM manip/console
async function log(level, line) {
  const el = document.createElement('div')
  const levelEl = document.createElement('span')
  const text = document.createElement('span')
  el.className = 'console-line'
  levelEl.className = 'console-level-ct'

  levelEl.innerHTML = `[ <span class="console-level console-level-${level}">${level.toUpperCase()}</span> ]`
  text.innerHTML = line
  el.append(levelEl, text)

  $console.append(el)
  $console.scrollTop = $console.scrollHeight
}
async function write(line) {
  const el = document.createElement('div')
  el.className = 'console-line'
  el.innerText = line
  $console.append(el)
  $console.scrollTop = $console.scrollHeight
}
function disableButtons() {
  document.querySelectorAll('.btn').forEach(btn => {
    btn.classList.add('disabled')
    btn.disabled = true
  })
}
//#endregion

//#region shared
async function restore() {
  // restores discord to a usable state
  let isInDDC = __dirname.includes('discord_desktop_core')
  let dir = join(__dirname, '..', '..') // change this to join(__dirname, '..', '..') if the installer folder is in modules (recommended for testing)
  if (isInDDC) dir = join(dir, '..')
  let installedJson = join(dir, 'installed.json')
  let info = JSON.parse(await readFile(installedJson, 'utf8'))
  info.discord_desktop_core.installedVersion = 0 // forces Discord to restream that module
  await writeFile(installedJson, JSON.stringify(info, null, 2))
  try {
    await rm(join(dir, '..', '..', 'settings.json'))
  } catch {
    log('err', "settings.json was unable to be removed, so it probably doesn't exist")
  }
  let discordDesktopCoreDir = join(dir, 'discord_desktop_core')
  try {
    await rm(discordDesktopCoreDir)
  } catch {
    log('err', "discord_desktop_core was unable to be removed, but a module update should fix that")
  }
}
//#endregion

//#region plug
function clone(gitUrl) {
  const res = execSync(
    ['git', 'clone', gitUrl, '-b', 'v2', POWERCORD_PATH].join(' ')
  ).toString()
  return res
}
async function fileExists(path) {
  try {
    await access(POWERCORD_PATH)
    return true
  } catch (err) {
    return false
  }
}
async function inject() {
  let injectorsPath = join(POWERCORD_PATH, 'injectors')
  let platformModule
  try {
    platformModule = require(join(injectorsPath, `${process.platform}.js`))
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      alert(`Unsupported platform "${process.platform}"`)
      remote.app.exit(1)
    }
  }

  // adapted from
  const main = require(join(injectorsPath, 'main.js'))
  if (await main.inject(platformModule)) {
    // To show up popup message
    await writeFile(join(POWERCORD_PATH, 'src', '__injected.txt'), 'hey cutie')
    return true
  } else {
    return false
  }
}

async function plug() {
  if (!await fileExists(POWERCORD_PATH)) {
    log('info', 'Cloning powercord')
    const res = clone(POWERCORD_GIT_URL)
    write(res)
    log('ok', 'Cloned powercord successfully')
  } else {
    log(
      'info',
      `You already have a file/directory at "${POWERCORD_PATH}", so nothing new was downloaded`
    )
  }


  log('info', 'Installing node modules for powercord, this may take a while...')
  await installPackages({
    cwd: POWERCORD_PATH
  })
  log('ok', 'Installed node modules successfully')

  log('info', 'Injecting powercord into Discord Canary')
  await inject()
  log('ok', 'Injected successfully')

  log('info', 'Restoring Discord to a usable state')
  await restore()
  log('ok', 'Restored successfully')

  alert(`Successfully plugged Powercord!
Press ok to restart Discord.`)
  remote.app.relaunch()
  remote.app.exit(0)
}

//#endregion

//#region unplug
async function uninject() {
  let injectorsPath = join(POWERCORD_PATH, 'injectors')
  let platformModule
  try {
    platformModule = require(join(injectorsPath, `${process.platform}.js`))
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      alert(`Unsupported platform "${process.platform}"`)
      remote.app.exit(1)
    }
  }

  if (!(await fileExists(platformModule.getAppDir()))) {
    log('err', `There is nothing to uninject`)
    return
  }

  // adapted from https://github.com/powercord-org/powercord/blob/v2/injectors/index.js
  const main = require(join(injectorsPath, 'main.js'))
  if (await main.uninject(platformModule)) {
    return true
  } else {
    return false
  }
}
async function unplug() {
  log('info', 'Starting unplug')
  log('info', 'Uninjecting')
  const res = await uninject()
  if (!res) {
    log('err', 'Failed to uninject')
    return
  }
  log('ok', 'Uninjected successfully')

  log('info', 'Restoring Discord to a usable state')
  await restore()
  log('ok', 'Restored successfully')
  alert(`Successfully unplugged Powercord!
  Press ok to restart Discord.`)
    remote.app.relaunch()
    remote.app.exit(0)
}
//#endregion

//#region load
function getDiscordCanaryPath() {
  /**
   * Powercord, a lightweight @discordapp client mod focused on simplicity and performance
   * Copyright (C) 2018-2020  aetheryx & Bowser65
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   * GNU General Public License for more details.
   *
   * You should have received a copy of the GNU General Public License
   * along with this program.  If not, see <https://www.gnu.org/licenses/>.
   */
  // from https://github.com/powercord-org/powercord/blob/v2/injectors/linux.js
  const discordProcess = execSync('ps x')
    .toString()
    .split('\n')
    .map(s => s.split(' ').filter(Boolean))
    .find(
      p =>
        p[4] && /discord-?canary$/i.test(p[4]) && p.includes('--type=renderer')
    )

  if (!discordProcess) {
    return
  }

  const discordPath = discordProcess[4].split('/')
  discordPath.splice(discordPath.length - 1, 1)
  return join('/', ...discordPath, 'resources')
}

async function load() {
  if (!['win32', 'darwin', 'linux'].includes(platform)) {
    disableButtons()
    log('err', `"${platform}" is not supported`)
    return
  }
  log('info', `Detected platform "${platform}"`)
  log('info', `Install path: "${POWERCORD_PATH}"`)

  const gitExists = await commandExists('git')
  const yarnExists = await commandExists('yarn')
  const npmExists = await commandExists('npm')

  const packageManagerExists = yarnExists || npmExists
  if (!gitExists) {
    log('err', 'You do not have git installed on your system')
    if (platform === 'win32') {
      log(
        'err',
        `Download and install <a href="#" onclick="shell.openExternal('https://github.com/git-for-windows/git/releases/latest')">git-for-windows/git</a>, then use the installer.`
      )
    } else if (platform === 'darwin') {
      log(
        'err',
        `Install git using <a href="#" onclick="shell.openExternal('https://brew.sh')">homebrew</a>, then use the installer.`
      )
    } else {
      // assuming linux
      log(
        'err',
        `Install git using your distro's package manager, then use the installer.`
      )
    }
  }
  if (!packageManagerExists) {
    log('err', 'You do not have Node.js/npm installed on your system')
    if (platform === 'win32' || platform === 'darwin') {
      log(
        'err',
        `Download and install <a href="#" onclick="shell.openExternal('https://nodejs.org/en/')">Node.js</a>, then use the installer.`
      )
    } else {
      // assuming linux
      log(
        'err',
        `Install node.js using your distro's package manager, then use the installer.`
      )
    }
  }
  if (!gitExists || !packageManagerExists) {
    disableButtons()
    return
  }

  if (platform === 'linux') {
    // linux specific check
    const discordPath = getDiscordCanaryPath()
    try {
      await writeFile(join(discordPath, '.tmp'), 'test')
      await unlink(join(discordPath, '.tmp'))
    } catch (err) {
      log(
        'err',
        `Error writing to "${discordPath}", you may need to chown -R the directory`
      )
      log(
        'err',
        `If you do the above, don't forget to undo the change after plugging.`
      )
      log('err', `Node error message: ${err.message}`)
      disableButtons()
      return
    }
  }
  log('ok', 'Ready to plug/unplug Powercord.')
}
load()
//#endregion
